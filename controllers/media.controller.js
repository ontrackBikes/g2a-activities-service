const fs = require("fs");
const path = require("path");
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
  const relativePath = media.relative_path;
  const largeVariant = relativePath.replace(/\/original\//, "/large/").replace(/\.\w+$/, ".webp");
  const mediumVariant = relativePath.replace(/\/original\//, "/medium/").replace(/\.\w+$/, ".webp");
  const thumbVariant = relativePath.replace(/\/original\//, "/thumb/").replace(/\.\w+$/, ".webp");

  return {
    id: media.id,
    folder: media.folder,
    entity_type: media.entity_type,
    file_name: media.file_name,
    original_name: media.original_name,
    relative_path: media.relative_path,
    public_url: getPublicUrl(media.relative_path),
    public_url_original: getPublicUrl(media.relative_path),
    public_url_large: getPublicUrl(largeVariant),
    public_url_medium: getPublicUrl(mediumVariant),
    public_url_thumb: getPublicUrl(thumbVariant),
    mime_type: media.mime_type,
    extension: media.extension,
    size: media.size,
    width: media.width,
    height: media.height,
    active: media.active,
    created_at: media.created_at,
    updated_at: media.updated_at,
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
    const destinationPaths = {
      large: getDiskPath(`${value.folder}/large/${variantFileName}`),
      medium: getDiskPath(`${value.folder}/medium/${variantFileName}`),
      thumb: getDiskPath(`${value.folder}/thumb/${variantFileName}`),
    };

    await generateVariants(file.path, destinationPaths);

    const media = await MediaLibrary.create({
      folder: value.folder,
      entity_type: value.entity_type || null,
      file_name: file.filename,
      original_name: file.originalname,
      relative_path: relativePath,
      mime_type: file.mimetype,
      size: file.size,
      extension: path.extname(file.filename).replace(".", "").toLowerCase(),
      width: file.width || null,
      height: file.height || null,
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
      const destinationPaths = {
        large: getDiskPath(`${value.folder}/large/${variantFileName}`),
        medium: getDiskPath(`${value.folder}/medium/${variantFileName}`),
        thumb: getDiskPath(`${value.folder}/thumb/${variantFileName}`),
      };

      await generateVariants(file.path, destinationPaths);

      const media = await MediaLibrary.create({
          folder: value.folder,
          entity_type: value.entity_type || null,
          file_name: file.filename,
          original_name: file.originalname,
          relative_path: relativePath,
          mime_type: file.mimetype,
          size: file.size,
          extension: path.extname(file.filename).replace(".", "").toLowerCase(),
          width: file.width || null,
          height: file.height || null,
        }, { transaction });

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
      active: true,
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

    const binRelativePath = getBinRelativePath(media.relative_path);
    await moveMediaFiles(media.relative_path, binRelativePath);

    await media.update({
      active: false,
      deleted_at: new Date(),
      relative_path: binRelativePath,
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

    const originalRelativePath = getOriginalRelativePath(media.relative_path);
    await moveMediaFiles(media.relative_path, originalRelativePath);

    await media.update({
      active: true,
      deleted_at: null,
      relative_path: originalRelativePath,
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

    const relativePath = normalizeRelativePath(media.relative_path);

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
