const path = require("path");

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const CDN_URL = (process.env.CDN_URL || "/uploads").replace(/\/$/, "");

const normalizeRelativePath = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("A valid media path is required.");
  }

  let relativePath;

  if (path.isAbsolute(filePath)) {
    relativePath = path.relative(UPLOAD_ROOT, path.resolve(filePath));
  } else {
    relativePath = filePath;
  }

  const normalized = path.posix
    .normalize(relativePath.replace(/\\/g, "/"))
    .replace(/^\/+/, "");

  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error("Media path must stay inside the uploads directory.");
  }

  return normalized;
};

const getPublicUrl = (filePath) => {
  return `${CDN_URL}/${normalizeRelativePath(filePath)}`;
};

const getDiskPath = (filePath) => {
  return path.join(UPLOAD_ROOT, normalizeRelativePath(filePath));
};

module.exports = {
  getPublicUrl,
  getDiskPath,
  normalizeRelativePath,
};
