const express = require("express");
const {
  uploadMedia,
  bulkUploadMedia,
  listMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  restoreMedia,
  forceDeleteMedia,
} = require("../controllers/media.controller");


const uploadMiddleware = require("../middlewares/upload.middleware");

const router = express.Router();

router.post(
  "/upload",
  uploadMiddleware.single("file"),
  uploadMedia
);

router.post(
  "/bulk-upload",
  uploadMiddleware.array("files", 20),
  bulkUploadMedia
);

router.get("/", listMedia);

router.get("/:id", getMediaById);

router.patch("/:id", updateMedia);

router.delete("/:id", deleteMedia);

router.post("/:id/restore", restoreMedia);

router.delete("/:id/force", forceDeleteMedia);

module.exports = router;