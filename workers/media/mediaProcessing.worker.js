require("dotenv").config();

const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
let ffprobeStatic = null;
const sharp = require("sharp");
const { Worker } = require("bullmq");

const sequelize = require("../../config/sequelize");
const { MediaLibrary } = require("../../models");
const { connection, MEDIA_QUEUE_NAME } = require("../../queues/media/media.queue");
const {
  getDiskPath,
  getPublicUrl,
  normalizeRelativePath,
} = require("../../services/storage.service");
const { generateVariants } = require("../../services/image.service");

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

try {
  ffprobeStatic = require("ffprobe-static");

  if (ffprobeStatic?.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  }
} catch (error) {
  console.warn(
    "[MediaWorker] ffprobe-static is not installed. Video metadata extraction requires ffprobe."
  );
}

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

const getWebpFileName = (fileName) => {
  return `${path.basename(fileName, path.extname(fileName))}.webp`;
};

const getOptimizedVideoFileName = (fileName) => {
  return `${path.basename(fileName, path.extname(fileName))}-optimized.mp4`;
};

const ensureDir = async (filePath) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
};

const parseFrameRate = (rawFrameRate) => {
  if (!rawFrameRate || typeof rawFrameRate !== "string") {
    return null;
  }

  const [numerator, denominator] = rawFrameRate.split("/").map(Number);

  if (!numerator || !denominator) {
    return Number(rawFrameRate) || null;
  }

  return Number((numerator / denominator).toFixed(2));
};

const probeVideo = (sourcePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(sourcePath, (error, metadata) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(metadata);
    });
  });
};

const runFfmpeg = (command) => {
  return new Promise((resolve, reject) => {
    command.on("end", resolve).on("error", reject).run();
  });
};

const getVideoMetadata = (metadata) => {
  const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
  const audioStream = metadata.streams.find((stream) => stream.codec_type === "audio");
  const duration = metadata.format?.duration || videoStream?.duration || null;
  const bitrate = metadata.format?.bit_rate || videoStream?.bit_rate || null;

  return {
    width: videoStream?.width || null,
    height: videoStream?.height || null,
    duration_seconds: duration ? Number(Number(duration).toFixed(2)) : null,
    video_codec: videoStream?.codec_name || null,
    audio_codec: audioStream?.codec_name || null,
    bitrate: bitrate ? Number(bitrate) : null,
    frame_rate: parseFrameRate(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
  };
};

const processImage = async (media, sourceRelativePath, sourcePath) => {
  const fileName = path.basename(sourceRelativePath);
  const variantFileName = getWebpFileName(fileName);
  const folder = media.folder;
  const metadata = await sharp(sourcePath, { animated: true }).metadata();

  const destinationPaths = {
    large: getDiskPath(`${folder}/large/${variantFileName}`),
    medium: getDiskPath(`${folder}/medium/${variantFileName}`),
    thumb: getDiskPath(`${folder}/thumb/${variantFileName}`),
  };

  await generateVariants(sourcePath, destinationPaths);

  await media.update({
    large_url: getPublicUrl(`${folder}/large/${variantFileName}`),
    medium_url: getPublicUrl(`${folder}/medium/${variantFileName}`),
    thumb_url: getPublicUrl(`${folder}/thumb/${variantFileName}`),
    width: metadata.width || null,
    height: metadata.height || null,
    processing_status: "completed",
    processing_error: null,
  });
};

const processVideo = async (media, sourceRelativePath, sourcePath) => {
  const fileName = path.basename(sourceRelativePath);
  const folder = media.folder;
  const optimizedFileName = getOptimizedVideoFileName(fileName);
  const thumbFileName = getWebpFileName(fileName);
  const optimizedRelativePath = `${folder}/optimized/${optimizedFileName}`;
  const thumbRelativePath = `${folder}/thumb/${thumbFileName}`;
  const optimizedPath = getDiskPath(optimizedRelativePath);
  const thumbPath = getDiskPath(thumbRelativePath);

  await Promise.all([ensureDir(optimizedPath), ensureDir(thumbPath)]);

  await runFfmpeg(
    ffmpeg(sourcePath)
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
        "-c:a aac",
        "-movflags +faststart",
      ])
      .output(optimizedPath)
  );

  await runFfmpeg(
    ffmpeg(sourcePath)
      .frames(1)
      .outputOptions(["-vf scale=600:-1"])
      .output(thumbPath)
  );

  const metadata = await probeVideo(optimizedPath);
  const videoMetadata = getVideoMetadata(metadata);

  await media.update({
    optimized_url: getPublicUrl(optimizedRelativePath),
    thumb_url: getPublicUrl(thumbRelativePath),
    ...videoMetadata,
    processing_status: "completed",
    processing_error: null,
  });
};

const processMediaJob = async (job) => {
  const { mediaId } = job.data;
  const media = await MediaLibrary.findByPk(mediaId);

  if (!media) {
    throw new Error(`Media not found: ${mediaId}`);
  }

  await media.update({
    processing_status: "processing",
    processing_error: null,
  });

  const sourceRelativePath = getUrlRelativePath(media.original_url);
  const sourcePath = getDiskPath(sourceRelativePath);

  if (media.media_type === "image") {
    await processImage(media, sourceRelativePath, sourcePath);
    return;
  }

  if (media.media_type === "video") {
    await processVideo(media, sourceRelativePath, sourcePath);
    return;
  }

  throw new Error(`Unsupported media type: ${media.media_type}`);
};

const worker = new Worker(MEDIA_QUEUE_NAME, processMediaJob, {
  connection,
  concurrency: Number(process.env.MEDIA_WORKER_CONCURRENCY || 2),
});

worker.on("completed", (job) => {
  console.log(`[MediaWorker] Job completed: ${job.id}`);
});

worker.on("failed", async (job, error) => {
  console.error(`[MediaWorker] Job failed: ${job?.id}`, error);

  const mediaId = job?.data?.mediaId;

  if (!mediaId) {
    return;
  }

  await MediaLibrary.update(
    {
      processing_status: "failed",
      processing_error: error.message,
    },
    {
      where: {
        id: mediaId,
      },
    }
  ).catch((updateError) => {
    console.error("[MediaWorker] Failed to update media failure status", updateError);
  });
});

const shutdown = async () => {
  await worker.close();
  await connection.quit();
  await sequelize.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[MediaWorker] Listening on queue: ${MEDIA_QUEUE_NAME}`);
