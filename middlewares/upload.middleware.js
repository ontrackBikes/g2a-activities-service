const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  IMAGE_MIME_TYPES,
  MEDIA_FOLDERS,
  VIDEO_MIME_TYPES,
} = require("../config/media.config");
const { createMediaSchema } = require("../schemas/media.schema");

const MAX_FILE_SIZE_MB = Number(process.env.MEDIA_MAX_FILE_SIZE_MB || 200);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Only image and video files are allowed.`
        )
      );
    }

    cb(null, true);
  },
});

const ensureDirectory = async (dir) => {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") {
      throw err;
    }
  }
};

const normalizeFolder = (value) => {
  if (!value || typeof value !== "string") {
    throw new Error("folder field is required and must be a string.");
  }

  const folder = value.trim();
  if (!MEDIA_FOLDERS.includes(folder)) {
    throw new Error(`Invalid folder. Allowed values: ${MEDIA_FOLDERS.join(", ")}`);
  }

  return folder;
};

const normalizeFileName = (originalName, extension) => {
  const originalExtension = path.extname(originalName).toLowerCase();
  const ext = extension || originalExtension;
  const baseName = path.basename(originalName, originalExtension).replace(/[^a-zA-Z0-9-_]/g, "_");
  const uniqueKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${baseName}-${uniqueKey}${ext}`;
};

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const getMediaType = (mimeType) => {
  if (IMAGE_MIME_TYPES.includes(mimeType)) {
    return "image";
  }

  if (VIDEO_MIME_TYPES.includes(mimeType)) {
    return "video";
  }

  throw new Error(`Unsupported file type: ${mimeType}.`);
};

const prepareMediaFile = (file) => {
  file.media_type = getMediaType(file.mimetype);
  file.detectedExtension = MIME_EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
  file.width = null;
  file.height = null;
};

const validateMediaBody = (body) => {
  const { error, value } = createMediaSchema.validate(body);

  if (error) {
    throw new Error(error.details[0].message);
  }

  return value;
};

const saveBufferFile = async (buffer, destinationPath) => {
  await ensureDirectory(path.dirname(destinationPath));
  await fs.promises.writeFile(destinationPath, buffer);
};

const buildDestination = (folder) => {
  return path.join(UPLOAD_ROOT, folder, "original");
};

const saveSingleFile = async (req) => {
  if (!req.file) {
    return;
  }

  const value = validateMediaBody(req.body);
  const folder = normalizeFolder(value.folder);
  prepareMediaFile(req.file);
  const destDir = buildDestination(folder);
  const filename = normalizeFileName(req.file.originalname, req.file.detectedExtension);
  const filePath = path.join(destDir, filename);

  await saveBufferFile(req.file.buffer, filePath);

  req.file.filename = filename;
  req.file.path = filePath;
  req.file.relative_path = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join("/");
  req.body = value;
};

const saveMultipleFiles = async (req) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return;
  }

  const value = validateMediaBody(req.body);
  const folder = normalizeFolder(value.folder);
  const destDir = buildDestination(folder);

  req.files.forEach(prepareMediaFile);

  const savedPaths = [];

  try {
    for (const file of req.files) {
      const filename = normalizeFileName(file.originalname, file.detectedExtension);
      const filePath = path.join(destDir, filename);

      await saveBufferFile(file.buffer, filePath);
      savedPaths.push(filePath);

      file.filename = filename;
      file.path = filePath;
      file.relative_path = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join("/");
    }
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => fs.promises.unlink(filePath).catch(() => {})));
    throw error;
  }

  req.body = value;
};

const wrapUpload = (middleware, saveFn) => {
  return (fieldName) => {
    const handler = middleware(fieldName);

    return (req, res, next) => {
      handler(req, res, async (err) => {
        if (err) {
          return next(err);
        }

        try {
          await saveFn(req);
          next();
        } catch (saveError) {
          next(saveError);
        }
      });
    };
  };
};

const single = wrapUpload(upload.single.bind(upload), saveSingleFile);
const array = wrapUpload(upload.array.bind(upload), saveMultipleFiles);

module.exports = {
  single,
  array,
};
