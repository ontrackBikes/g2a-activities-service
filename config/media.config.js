module.exports = {
  MEDIA_FILE_BASE_URL:
    process.env.MEDIA_FILE_BASE_URL,

  MEDIA_FOLDERS: [
    "products",
    "vendors",
    "product-groups",
    "locations",
    "banners",
    "pages",
    "blogs",
    "temp",
  ],

  IMAGE_MIME_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ],

  VIDEO_MIME_TYPES: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],

  IMAGE_SIZES: {
    thumb: 200,
    medium: 600,
    large: 1200,
  },
};
