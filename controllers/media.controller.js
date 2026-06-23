const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { MediaLibrary } = require("../models");
const { createMediaSchema, updateMediaSchema } = require("../schemas/media.schema");
const {
  getPublicUrl,
  getDiskPath,
  normalizeRelativePath,
} = require("../services/storage.service");
const { generateVariants } = require("../services/image.service");

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

const getVariantFileName = (fileName) => {
  return `${path.basename(fileName, path.extname(fileName))}.webp`;
};

const getDisplayName = (file, value) => {
  if (value.name) {
    return value.name;
  }

  return path.parse(file.originalname).name;
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

const getVariantUrls = (folder, variantFileName) => ({
  large_url: getPublicUrl(`${folder}/large/${variantFileName}`),
  medium_url: getPublicUrl(`${folder}/medium/${variantFileName}`),
  thumb_url: getPublicUrl(`${folder}/thumb/${variantFileName}`),
});

const getBinUrl = (url) => {
  const relativePath = getUrlRelativePath(url);

  if (!relativePath) {
    return null;
  }

  return getPublicUrl(getBinRelativePath(relativePath));
};

const getOriginalUrl = (url) => {
  const relativePath = getUrlRelativePath(url);

  if (!relativePath) {
    return null;
  }

  return getPublicUrl(getOriginalRelativePath(relativePath));
};

const deleteFiles = async (relativePath) => {
  const files = getVariantRelativePaths(relativePath);

  await Promise.all(
    files.map(async (fileRelative) => {
      const filePath = getDiskPath(fileRelative);
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return;
        }
        throw error;
      }
    })
  );
};

const moveMediaFiles = async (sourceRelativePath, targetRelativePath) => {
  const sources = getVariantRelativePaths(sourceRelativePath);
  const targets = getVariantRelativePaths(targetRelativePath);

  await Promise.all(
    sources.map(async (sourceRelative, index) => {
      const sourcePath = getDiskPath(sourceRelative);
      const targetPath = getDiskPath(targets[index]);
      const targetDir = path.dirname(targetPath);

      try {
        await fs.promises.mkdir(targetDir, { recursive: true });
        await fs.promises.rename(sourcePath, targetPath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return;
        }
        throw error;
      }
    })
  );
};

const getBinRelativePath = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  const parts = normalized.split("/");
  return ["bin", ...parts].join("/");
};

const getOriginalRelativePath = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  const parts = normalized.split("/");

  if (parts[0] !== "bin") {
    return normalized;
  }

  return parts.slice(1).join("/");
};

const serializeMedia = (media) => {
  return {
    id: media.id,
    uuid: media.uuid,
    name: media.name,
    folder: media.folder,
    entity_type: media.entity_type,
    original_file_name: media.original_file_name,
    original_url: media.original_url,
    large_url: media.large_url,
    medium_url: media.medium_url,
    thumb_url: media.thumb_url,
    mime_type: media.mime_type,
    extension: media.extension,
    size: media.size,
    width: media.width,
    height: media.height,
    active: media.active,
    created_at: media.created_at,
  };
};

const uploadMedia = async (req, res) => {
  let relativePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    const { error, value } = createMediaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const file = req.file;
    relativePath = normalizeRelativePath(file.path);
    const variantFileName = getVariantFileName(file.filename);
    const variantUrls = getVariantUrls(value.folder, variantFileName);
    const destinationPaths = {
      large: getDiskPath(`${value.folder}/large/${variantFileName}`),
      medium: getDiskPath(`${value.folder}/medium/${variantFileName}`),
      thumb: getDiskPath(`${value.folder}/thumb/${variantFileName}`),
    };

    await generateVariants(file.path, destinationPaths);

    const media = await MediaLibrary.create({
      uuid: randomUUID(),
      name: getDisplayName(file, value),
      folder: value.folder,
      entity_type: value.entity_type || null,
      original_file_name: file.originalname,
      original_url: getPublicUrl(relativePath),
      ...variantUrls,
      mime_type: file.mimetype,
      size: file.size,
      extension: path.extname(file.filename).replace(".", "").toLowerCase(),
      width: file.width || null,
      height: file.height || null,
      created_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      data: serializeMedia(media),
    });
  } catch (error) {
    if (relativePath) {
      await deleteFiles(relativePath).catch((cleanupError) => {
        console.error("[MediaController] Failed to clean upload", cleanupError);
      });
    }

    console.error("[MediaController] uploadMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const bulkUploadMedia = async (req, res) => {
  const uploadedPaths = [];
  let transaction;

  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one file is required.",
      });
    }

    uploadedPaths.push(
      ...req.files.map((file) => normalizeRelativePath(file.path))
    );

    const { error, value } = createMediaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    transaction = await MediaLibrary.sequelize.transaction();
    const records = [];

    for (const file of req.files) {
      const relativePath = normalizeRelativePath(file.path);
      const variantFileName = getVariantFileName(file.filename);
      const variantUrls = getVariantUrls(value.folder, variantFileName);
      const destinationPaths = {
        large: getDiskPath(`${value.folder}/large/${variantFileName}`),
        medium: getDiskPath(`${value.folder}/medium/${variantFileName}`),
        thumb: getDiskPath(`${value.folder}/thumb/${variantFileName}`),
      };

      await generateVariants(file.path, destinationPaths);

      const media = await MediaLibrary.create(
        {
          uuid: randomUUID(),
          name: getDisplayName(file, value),
          folder: value.folder,
          entity_type: value.entity_type || null,
          original_file_name: file.originalname,
          original_url: getPublicUrl(relativePath),
          ...variantUrls,
          mime_type: file.mimetype,
          size: file.size,
          extension: path.extname(file.filename).replace(".", "").toLowerCase(),
          width: file.width || null,
          height: file.height || null,
          created_at: new Date(),
        },
        { transaction },
      );

      records.push(media);
    }

    await transaction.commit();
    transaction = null;

    return res.status(201).json({
      success: true,
      message: "Media files uploaded successfully",
      count: records.length,
      data: records.map(serializeMedia),
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch((rollbackError) => {
        console.error("[MediaController] Bulk rollback failed", rollbackError);
      });
    }

    await Promise.all(
      uploadedPaths.map((relativePath) =>
        deleteFiles(relativePath).catch((cleanupError) => {
          console.error("[MediaController] Failed to clean bulk upload", cleanupError);
        })
      )
    );

    console.error("[MediaController] bulkUploadMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const listMedia = async (req, res) => {
  try {
    const filters = {
      active: req.query.active === "false" ? false : true,
    };

    if (req.query.folder) {
      filters.folder = req.query.folder;
    }

    if (req.query.entity_type) {
      filters.entity_type = req.query.entity_type;
    }

    const mediaList = await MediaLibrary.findAll({
      where: filters,
      order: [["created_at", "ASC"]],
    });

    return res.json({
      success: true,
      count: mediaList.length,
      data: mediaList.map(serializeMedia),
    });
  } catch (error) {
    console.error("[MediaController] listMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMediaById = async (req, res) => {
  try {
    const media = await MediaLibrary.findByPk(req.params.id);

    if (!media || !media.active) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    return res.json({
      success: true,
      data: serializeMedia(media),
    });
  } catch (error) {
    console.error("[MediaController] getMediaById", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const media = await MediaLibrary.findByPk(req.params.id);

    if (!media || !media.active) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const relativePath = getUrlRelativePath(media.original_url);
    const binRelativePath = getBinRelativePath(relativePath);
    await moveMediaFiles(relativePath, binRelativePath);

    await media.update({
      active: false,
      deleted_at: new Date(),
      original_url: getBinUrl(media.original_url),
      large_url: getBinUrl(media.large_url),
      medium_url: getBinUrl(media.medium_url),
      thumb_url: getBinUrl(media.thumb_url),
    });

    return res.json({
      success: true,
      message: "Media moved to bin successfully",
    });
  } catch (error) {
    console.error("[MediaController] deleteMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const restoreMedia = async (req, res) => {
  try {
    const media = await MediaLibrary.findByPk(req.params.id);

    if (!media || media.active) {
      return res.status(404).json({
        success: false,
        message: "Media not found in bin",
      });
    }

    const relativePath = getUrlRelativePath(media.original_url);
    const originalRelativePath = getOriginalRelativePath(relativePath);
    await moveMediaFiles(relativePath, originalRelativePath);

    await media.update({
      active: true,
      deleted_at: null,
      original_url: getOriginalUrl(media.original_url),
      large_url: getOriginalUrl(media.large_url),
      medium_url: getOriginalUrl(media.medium_url),
      thumb_url: getOriginalUrl(media.thumb_url),
    });

    return res.json({
      success: true,
      message: "Media restored successfully",
      data: serializeMedia(media),
    });
  } catch (error) {
    console.error("[MediaController] restoreMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forceDeleteMedia = async (req, res) => {
  try {
    const media = await MediaLibrary.findByPk(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const relativePath = getUrlRelativePath(media.original_url);

    if (media.active || !relativePath.startsWith("bin/")) {
      return res.status(400).json({
        success: false,
        message: "Media must be moved to bin before permanent deletion.",
      });
    }

    await deleteFiles(relativePath);
    await media.destroy();

    return res.json({
      success: true,
      message: "Media permanently deleted successfully",
    });
  } catch (error) {
    console.error("[MediaController] forceDeleteMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateMedia = async (req, res) => {
  try {
    const { error, value } = updateMediaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const media = await MediaLibrary.findByPk(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    await media.update(value);

    return res.json({
      success: true,
      message: "Media updated successfully",
      data: serializeMedia(media),
    });
  } catch (error) {
    console.error("[MediaController] updateMedia", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadMedia,
  bulkUploadMedia,
  listMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  restoreMedia,
  forceDeleteMedia,
};
