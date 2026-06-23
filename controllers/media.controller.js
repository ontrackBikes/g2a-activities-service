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
const { mediaQueue } = require("../queues/media.queue");

const MEDIA_URL_FIELDS = [
  "original_url",
  "optimized_url",
  "large_url",
  "medium_url",
  "thumb_url",
];

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

const deleteFile = async (relativePath) => {
  const filePath = getDiskPath(relativePath);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }
};

const deleteUploadedFile = async (relativePath) => {
  if (!relativePath) {
    return;
  }

  await deleteFile(relativePath);
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
  await Promise.all(getMediaRelativePaths(media).map(deleteFile));
};

const moveFile = async (sourceRelativePath, targetRelativePath) => {
  const sourcePath = getDiskPath(sourceRelativePath);
  const targetPath = getDiskPath(targetRelativePath);
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
};

const moveMediaUrlFiles = async (media, getTargetRelativePath) => {
  const updates = {};

  for (const field of MEDIA_URL_FIELDS) {
    const relativePath = getUrlRelativePath(media[field]);

    if (!relativePath) {
      updates[field] = null;
      continue;
    }

    const targetRelativePath = getTargetRelativePath(relativePath);
    await moveFile(relativePath, targetRelativePath);
    updates[field] = getPublicUrl(targetRelativePath);
  }

  return updates;
};

const serializeMedia = (media) => {
  return {
    id: media.id,
    uuid: media.uuid,
    name: media.name,
    folder: media.folder,
    entity_type: media.entity_type,
    original_file_name: media.original_file_name,
    media_type: media.media_type,
    original_url: media.original_url,
    optimized_url: media.optimized_url,
    large_url: media.large_url,
    medium_url: media.medium_url,
    thumb_url: media.thumb_url,
    mime_type: media.mime_type,
    extension: media.extension,
    size: media.size,
    width: media.width,
    height: media.height,
    duration_seconds: media.duration_seconds,
    video_codec: media.video_codec,
    audio_codec: media.audio_codec,
    bitrate: media.bitrate,
    frame_rate: media.frame_rate,
    active: media.active,
    processing_status: media.processing_status,
    processing_error: media.processing_error,
    created_at: media.created_at,
  };
};

const enqueueMediaProcessing = async (media) => {
  await mediaQueue.add("process-media", {
    mediaId: media.id,
  });
};

const uploadMedia = async (req, res) => {
  let relativePath = null;
  let media = null;

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

    media = await MediaLibrary.create({
      uuid: randomUUID(),
      name: getDisplayName(file, value),
      folder: value.folder,
      entity_type: value.entity_type || null,
      original_file_name: file.originalname,
      original_url: getPublicUrl(relativePath),
      optimized_url: null,
      large_url: null,
      medium_url: null,
      thumb_url: null,
      mime_type: file.mimetype,
      media_type: file.media_type,
      size: file.size,
      extension: path.extname(file.filename).replace(".", "").toLowerCase(),
      width: null,
      height: null,
      duration_seconds: null,
      video_codec: null,
      audio_codec: null,
      bitrate: null,
      frame_rate: null,
      processing_status: "queued",
      processing_error: null,
      created_at: new Date(),
    });

    await enqueueMediaProcessing(media);

    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully. Processing started.",
      data: serializeMedia(media),
    });
  } catch (error) {
    if (media) {
      await media.destroy().catch((destroyError) => {
        console.error("[MediaController] Failed to remove media record", destroyError);
      });
    }

    if (relativePath) {
      await deleteUploadedFile(relativePath).catch((cleanupError) => {
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
  const records = [];
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

    for (const file of req.files) {
      const relativePath = normalizeRelativePath(file.path);

      const media = await MediaLibrary.create(
        {
          uuid: randomUUID(),
          name: getDisplayName(file, value),
          folder: value.folder,
          entity_type: value.entity_type || null,
          original_file_name: file.originalname,
          original_url: getPublicUrl(relativePath),
          optimized_url: null,
          large_url: null,
          medium_url: null,
          thumb_url: null,
          mime_type: file.mimetype,
          media_type: file.media_type,
          size: file.size,
          extension: path.extname(file.filename).replace(".", "").toLowerCase(),
          width: null,
          height: null,
          duration_seconds: null,
          video_codec: null,
          audio_codec: null,
          bitrate: null,
          frame_rate: null,
          processing_status: "queued",
          processing_error: null,
          created_at: new Date(),
        },
        { transaction },
      );

      records.push(media);
    }

    await transaction.commit();
    transaction = null;

    await Promise.all(records.map(enqueueMediaProcessing));

    return res.status(201).json({
      success: true,
      message: "Media files uploaded successfully. Processing started.",
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
        deleteUploadedFile(relativePath).catch((cleanupError) => {
          console.error("[MediaController] Failed to clean bulk upload", cleanupError);
        })
      )
    );

    if (!transaction && records.length > 0) {
      await MediaLibrary.destroy({
        where: {
          id: records.map((record) => record.id),
        },
      }).catch((destroyError) => {
        console.error("[MediaController] Failed to remove bulk media records", destroyError);
      });
    }

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

    const urlUpdates = await moveMediaUrlFiles(media, getBinRelativePath);

    await media.update({
      active: false,
      deleted_at: new Date(),
      ...urlUpdates,
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

    const urlUpdates = await moveMediaUrlFiles(media, getOriginalRelativePath);

    await media.update({
      active: true,
      deleted_at: null,
      ...urlUpdates,
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

    await deleteMediaFiles(media);
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
