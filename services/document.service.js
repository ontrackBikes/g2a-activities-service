const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { Op } = require("sequelize");
const sharp = require("sharp");
const { Document } = require("../models");
const {
  DOCUMENT_FOLDER,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_MB,
  DOCUMENT_IMAGE_MIME_TYPES,
  DOCUMENT_IMAGE_MAX_DIMENSION,
  DOCUMENT_IMAGE_QUALITY,
} = require("../config/document.config");
const {
  getPublicUrl,
  getDiskPath,
  normalizeRelativePath,
} = require("./storage.service");

const DOCUMENT_MAX_FILE_SIZE = DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024;
const INVALID_DOCUMENT_MESSAGE =
  "Unable to upload the document. Upload a PDF, JPG, PNG, or WEBP file.";

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const getExtension = (mimetype, originalname) => {
  return (
    MIME_EXTENSIONS[mimetype] ||
    path.extname(originalname).toLowerCase() ||
    ""
  );
};

const compressImageBuffer = (buffer) =>
  sharp(buffer)
    .rotate()
    .resize({
      width: DOCUMENT_IMAGE_MAX_DIMENSION,
      height: DOCUMENT_IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: DOCUMENT_IMAGE_QUALITY })
    .toBuffer();

const buildFileName = (originalname, extension) => {
  const baseName = path
    .basename(originalname, path.extname(originalname))
    .replace(/[^a-zA-Z0-9-_]/g, "_");
  const uniqueKey = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return `${baseName}-${uniqueKey}${extension}`;
};

const serializeDocument = (document) => {
  return {
    id: document.id,
    uuid: document.uuid,
    name: document.name,
    original_file_name: document.original_file_name,
    mime_type: document.mime_type,
    extension: document.extension,
    size: document.size,
    entity_type: document.entity_type,
    entity_id: document.entity_id,
    folder: document.folder,
    file_url: document.file_url,
    status: document.status,
    expires_at: document.expires_at,
    created_at: document.created_at,
    deleted_at: document.deleted_at,
  };
};

const deleteDocumentFile = async (document) => {
  const relativePath = normalizeRelativePath(
    new URL(document.file_url, "http://localhost").pathname.replace(
      /^\/?uploads\//,
      ""
    )
  );

  try {
    await fs.promises.unlink(getDiskPath(relativePath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

/**
 * Uploads a document at a single quality (no variants). Images are
 * re-encoded to JPEG (compressed + capped dimensions); PDFs are stored as-is.
 * `file` matches multer's in-memory file shape: { buffer, originalname, mimetype, size }.
 */
const uploadDocument = async ({
  file,
  name,
  entity_type = null,
  entity_id = null,
  expires_at = null,
}) => {
  if (!file || !file.buffer) {
    throw createValidationError(INVALID_DOCUMENT_MESSAGE);
  }

  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    throw createValidationError(INVALID_DOCUMENT_MESSAGE);
  }

  if (file.buffer.length > DOCUMENT_MAX_FILE_SIZE) {
    throw createValidationError(INVALID_DOCUMENT_MESSAGE);
  }

  let fileBuffer = file.buffer;
  let mimeType = file.mimetype;
  let extension = getExtension(file.mimetype, file.originalname);

  if (DOCUMENT_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    try {
      fileBuffer = await compressImageBuffer(file.buffer);
    } catch (error) {
      throw createValidationError(INVALID_DOCUMENT_MESSAGE);
    }
    mimeType = "image/jpeg";
    extension = ".jpg";
  }

  const filename = buildFileName(file.originalname, extension);
  const relativePath = normalizeRelativePath(
    path.posix.join(DOCUMENT_FOLDER, filename)
  );
  const diskPath = getDiskPath(relativePath);

  await fs.promises.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.promises.writeFile(diskPath, fileBuffer);

  try {
    const document = await Document.create({
      uuid: randomUUID(),
      name: name || path.parse(file.originalname).name,
      original_file_name: file.originalname,
      mime_type: mimeType,
      extension: extension.replace(".", ""),
      size: fileBuffer.length,
      entity_type,
      entity_id,
      folder: DOCUMENT_FOLDER,
      file_url: getPublicUrl(relativePath),
      status: "active",
      expires_at,
      created_at: new Date(),
      deleted_at: null,
    });

    return serializeDocument(document);
  } catch (error) {
    await fs.promises.unlink(diskPath).catch(() => {});
    throw error;
  }
};

const getDocumentById = async (id) => {
  const document = await Document.findByPk(id);
  return document ? serializeDocument(document) : null;
};

const listDocuments = async ({ entity_type, entity_id, status } = {}) => {
  const where = {};

  if (entity_type) where.entity_type = entity_type;
  if (entity_id) where.entity_id = entity_id;
  if (status) where.status = status;

  const documents = await Document.findAll({
    where,
    order: [["created_at", "DESC"]],
  });

  return documents.map(serializeDocument);
};

/**
 * Marks an active document as deleted and removes its file from disk.
 * The DB row is kept (status: "deleted") as an audit trail, unlike media
 * cleanup which hard-deletes rows.
 */
const expireDocument = async (document) => {
  await deleteDocumentFile(document).catch((error) => {
    console.error(
      `[DocumentService] Failed to delete file for document ${document.id}`,
      error
    );
  });

  await document.update({
    status: "deleted",
    deleted_at: new Date(),
  });
};

/**
 * Manually deletes an active document (admin-triggered), same effect as
 * cron-driven expiry: file removed from disk, row kept with status "deleted".
 */
const deleteDocument = async (id) => {
  const document = await Document.findByPk(id);

  if (!document || document.status !== "active") {
    return null;
  }

  await expireDocument(document);
  return serializeDocument(document);
};

/**
 * Finds active documents whose expires_at has passed, deletes their files
 * from disk, and flips status to "deleted". Intended to be called from the
 * media cleanup cron alongside its existing media cleanup work.
 */
const cleanupExpiredDocuments = async () => {
  const documents = await Document.findAll({
    where: {
      status: "active",
      expires_at: {
        [Op.ne]: null,
        [Op.lt]: new Date(),
      },
    },
  });

  for (const document of documents) {
    await expireDocument(document);
  }

  return documents.length;
};

module.exports = {
  uploadDocument,
  getDocumentById,
  listDocuments,
  expireDocument,
  deleteDocument,
  cleanupExpiredDocuments,
  serializeDocument,
};
