const fs = require("fs");
const { Op } = require("sequelize");
const { MediaLibrary } = require("../models");
const {
  getDiskPath,
  normalizeRelativePath,
} = require("./storage.service");

const MEDIA_URL_FIELDS = [
  "original_url",
  "optimized_url",
  "large_url",
  "medium_url",
  "thumb_url",
];

async function deleteFileIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function getUrlRelativePath(url) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url, "http://localhost");

    const pathname = decodeURIComponent(
      parsedUrl.pathname
    ).replace(/^\/+/, "");

    if (pathname.startsWith("uploads/")) {
      return normalizeRelativePath(
        pathname.replace(/^uploads\//, "")
      );
    }

    return normalizeRelativePath(pathname);
  } catch {
    return normalizeRelativePath(
      url.replace(/^\/?uploads\//, "")
    );
  }
}

function getMediaRelativePaths(media) {
  return [
    ...new Set(
      MEDIA_URL_FIELDS
        .map((field) =>
          getUrlRelativePath(media[field])
        )
        .filter(Boolean)
    ),
  ];
}

async function deleteMediaFiles(media) {
  await Promise.all(
    getMediaRelativePaths(media).map(
      async (relativeFile) => {
        await deleteFileIfExists(
          getDiskPath(relativeFile)
        );
      }
    )
  );
}

async function cleanTempMedia() {
  const expirationDate = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  );

  const items = await MediaLibrary.findAll({
    where: {
      folder: "temp",
      created_at: {
        [Op.lt]: expirationDate,
      },
    },
  });

  for (const media of items) {
    await deleteMediaFiles(media);
    await media.destroy();
  }

  return items.length;
}

async function cleanBinMedia() {
  const expirationDate = new Date(
    Date.now() - 15 * 24 * 60 * 60 * 1000
  );

  const items = await MediaLibrary.findAll({
    where: {
      active: false,
      original_url: {
        [Op.like]: "%/bin/%",
      },
      deleted_at: {
        [Op.lt]: expirationDate,
      },
    },
  });

  for (const media of items) {
    await deleteMediaFiles(media);
    await media.destroy();
  }

  return items.length;
}

async function runMediaCleanup() {
  const tempCount = await cleanTempMedia();
  const binCount = await cleanBinMedia();

  return {
    tempCount,
    binCount,
  };
}

module.exports = {
  runMediaCleanup,
};