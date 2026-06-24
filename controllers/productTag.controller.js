
const {
  createProductTagMappingSchema,
} = require("../schemas/productTagMapping.schema");

const {
  createProductTagSchema,
} = require("../schemas/productTag.schema");
const ProductTag = require("../models/productTag.model");
const { Product } = require("../models");
const ProductTagMapping = require("../models/productTagMapping.model");

const createProductTag = async (req, res) => {
  try {
    const { error, value } =
      createProductTagSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const tag = await ProductTag.create(value);

    return res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (err) {
    console.error("[createProductTag]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create tag",
    });
  }
};
const getProductTags = async (req, res) => {
  try {
    const tags = await ProductTag.findAll({
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (err) {
    console.error("[getProductTags]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tags",
    });
  }
};
const getProductTagById = async (req, res) => {
  try {
    const tag = await ProductTag.findByPk(
      req.params.id
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (err) {
    console.error("[getProductTagById]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tag",
    });
  }
};
const updateProductTag = async (req, res) => {
  try {
    const { error, value } =
      updateProductTagSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const tag = await ProductTag.findByPk(
      req.params.id
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    await tag.update(value);

    return res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (err) {
    console.error("[updateProductTag]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update tag",
    });
  }
};
const deleteProductTag = async (req, res) => {
  try {
    const tag = await ProductTag.findByPk(
      req.params.id
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    await ProductTagMapping.destroy({
      where: {
        tag_id: tag.id,
      },
    });

    await tag.destroy();

    return res.status(200).json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (err) {
    console.error("[deleteProductTag]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete tag",
    });
  }
};

module.exports = {
  createProductTag,
  getProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag
}

