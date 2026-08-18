module.exports = {
  DOCUMENT_FOLDER: "documents",

  DOCUMENT_FILE_BASE_URL: process.env.MEDIA_FILE_BASE_URL,

  DOCUMENT_MIME_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ],

  DOCUMENT_MAX_FILE_SIZE_MB: Number(
    process.env.DOCUMENT_MAX_FILE_SIZE_MB || 20
  ),
};
