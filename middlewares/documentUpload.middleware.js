const multer = require("multer");
const {
  DOCUMENT_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_MB,
} = require("../config/document.config");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed types: ${DOCUMENT_MIME_TYPES.join(", ")}`
        )
      );
    }

    cb(null, true);
  },
});

const single = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (error) => {
    if (!error) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: "Unable to upload the document. Please upload a valid file.",
    });
  });
};

module.exports = { single };
