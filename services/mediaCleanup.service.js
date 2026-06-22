const fs = require("fs");
const cron = require("node-cron");
const { Op } = require("sequelize");
const { MediaLibrary } = require("../models");
const { getDiskPath, normalizeRelativePath } = require("./storage.service");

const deleteFileIfExists = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getVariantRelativePaths = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  const extensionPattern = /\.[^.]+$/;
  const webpPaths = ["large", "medium", "thumb"].map((size) =>
    normalized.replace(/\/original\//, `/${size}/`).replace(extensionPattern, ".webp")
  );
  const legacyPaths = ["large", "medium", "thumb"].map((size) =>
    normalized.replace(/\/original\//, `/${size}/`)
  );

  return [...new Set([normalized, ...webpPaths, ...legacyPaths])];
};

const deleteMediaFiles = async (relativePath) => {
  const variantPaths = getVariantRelativePaths(relativePath);

  await Promise.all(
    variantPaths.map(async (relativeFile) => {
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
    await deleteMediaFiles(media.relative_path);
    await media.destroy();
  }

  return tempItems.length;
};

const cleanBinMedia = async () => {
  const expirationDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const binItems = await MediaLibrary.findAll({
    where: {
      active: false,
      deleted_at: {
        [Op.lt]: expirationDate,
      },
    },
  });

  for (const media of binItems) {
    await deleteMediaFiles(media.relative_path);
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
