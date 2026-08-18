const { createDocumentSchema } = require("../schemas/document.schema");
const documentService = require("../services/document.service");

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    const { error, value } = createDocumentSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const document = await documentService.uploadDocument({
      file: req.file,
      name: value.name,
      entity_type: value.entity_type || null,
      entity_id: value.entity_id || null,
      expires_at: value.expires_at || null,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    console.error("[DocumentController] uploadDocument", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const listDocuments = async (req, res) => {
  try {
    const documents = await documentService.listDocuments({
      entity_type: req.query.entity_type,
      entity_id: req.query.entity_id,
      status: req.query.status || "active",
    });

    return res.json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("[DocumentController] listDocuments", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("[DocumentController] getDocumentById", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await documentService.deleteDocument(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.json({
      success: true,
      message: "Document deleted successfully",
      data: document,
    });
  } catch (error) {
    console.error("[DocumentController] deleteDocument", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
};
