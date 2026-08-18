const express = require("express");
const {
  uploadDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
} = require("../controllers/document.controller");

const uploadMiddleware = require("../middlewares/documentUpload.middleware");

const router = express.Router();

router.post("/upload", uploadMiddleware.single("file"), uploadDocument);

router.get("/", listDocuments);

router.get("/:id", getDocumentById);

router.delete("/:id", deleteDocument);

module.exports = router;
