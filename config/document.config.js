module.exports = {
  DOCUMENT_FOLDER: "documents",

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

  // Images are re-encoded to JPEG at this quality/max-dimension before
  // being stored ("low quality yet xeroxable"). PDFs are left untouched.
  DOCUMENT_IMAGE_MIME_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ],

  DOCUMENT_IMAGE_MAX_DIMENSION: Number(
    process.env.DOCUMENT_IMAGE_MAX_DIMENSION || 1600
  ),

  DOCUMENT_IMAGE_QUALITY: Number(
    process.env.DOCUMENT_IMAGE_QUALITY || 70
  ),
};
