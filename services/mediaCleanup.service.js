const fs = require("fs");
const cron = require("node-cron");
const { Op } = require("sequelize");
const { MediaLibrary } = require("../models");
const { getDiskPath, normalizeRelativePath } = require("./storage.service");

const MEDIA_URL_FIELDS = ["original_url", "large_url", "medium_url", "thumb_url"];

const deleteFileIfExists = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getUrlRelativePath = (url) => {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url, "http://localhost");
    const pathname = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, "");

    if (pathname.startsWith("uploads/")) {
      return normalizeRelativePath(pathname.replace(/^uploads\//, ""));
    }

    return normalizeRelativePath(pathname);
  } catch (error) {
    return normalizeRelativePath(url.replace(/^\/?uploads\//, ""));
  }
};

const getMediaRelativePaths = (media) => {
  return [
    ...new Set(
      MEDIA_URL_FIELDS
        .map((field) => getUrlRelativePath(media[field]))
        .filter(Boolean)
    ),
  ];
};

const deleteMediaFiles = async (media) => {
  await Promise.all(
    getMediaRelativePaths(media).map(async (relativeFile) => {
      const diskPath = getDiskPath(relativeFile);
      await deleteFileIfExists(diskPath);
    })
  );
};

const cleanTempMedia = async () => {
  const expirationDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const tempItems = await MediaLibrary.findAll({
    where: {
      folder: "temp",
      created_at: {
        [Op.lt]: expirationDate,
      },
    },
  });

  for (const media of tempItems) {
    await deleteMediaFiles(media);
    await media.destroy();
  }

  return tempItems.length;
};

const cleanBinMedia = async () => {
  const expirationDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const binItems = await MediaLibrary.findAll({
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

  for (const media of binItems) {
    await deleteMediaFiles(media);
    await media.destroy();
  }

  return binItems.length;
};

const runMediaCleanup = async () => {
  try {
    const tempCount = await cleanTempMedia();
    const binCount = await cleanBinMedia();

    console.log(
      `[MediaCleanup] Temp expired: ${tempCount}, Bin expired: ${binCount}`
    );
  } catch (error) {
    console.error("[MediaCleanup] Cleanup failed", error);
  }
};

const startMediaCleanup = () => {
  runMediaCleanup();
  cron.schedule("0 */6 * * *", runMediaCleanup, {
    scheduled: true,
    timezone: "UTC",
  });
};

module.exports = {
  startMediaCleanup,
  runMediaCleanup,
};
