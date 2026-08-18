const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { Op } = require("sequelize");
const { Document } = require("../models");
const {
  DOCUMENT_FOLDER,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_MB,
} = require("../config/document.config");
const {
  getPublicUrl,
  getDiskPath,
  normalizeRelativePath,
} = require("./storage.service");

const DOCUMENT_MAX_FILE_SIZE = DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024;

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
 * Uploads a document as-is (single quality, no variants/processing).
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
    throw new Error("A file buffer is required.");
  }

  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Unsupported file type: ${file.mimetype}. Allowed types: ${DOCUMENT_MIME_TYPES.join(", ")}`
    );
  }

  if (file.buffer.length > DOCUMENT_MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds the maximum allowed size of ${DOCUMENT_MAX_FILE_SIZE_MB}MB.`
    );
  }

  const extension = getExtension(file.mimetype, file.originalname);
  const filename = buildFileName(file.originalname, extension);
  const relativePath = normalizeRelativePath(
    path.posix.join(DOCUMENT_FOLDER, filename)
  );
  const diskPath = getDiskPath(relativePath);

  await fs.promises.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.promises.writeFile(diskPath, file.buffer);

  try {
    const document = await Document.create({
      uuid: randomUUID(),
      name: name || path.parse(file.originalname).name,
      original_file_name: file.originalname,
      mime_type: file.mimetype,
      extension: extension.replace(".", ""),
      size: file.buffer.length,
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
