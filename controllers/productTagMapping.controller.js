
const ProductTag = require("../models/productTag.model");
const { Product } = require("../models");
const ProductTagMapping = require("../models/productTagMapping.model");
const { createProductTagMappingSchema } = require("../schemas/productTagMapping.schema");

const assignTagToProduct = async (req, res) => {
  try {
    const { error, value } =
      createProductTagMappingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product = await Product.findByPk(
      value.product_id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const tag = await ProductTag.findByPk(
      value.tag_id
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    const existing =
      await ProductTagMapping.findOne({
        where: {
          product_id: value.product_id,
          tag_id: value.tag_id,
        },
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Tag already assigned",
      });
    }

    const mapping =
      await ProductTagMapping.create(value);

    return res.status(201).json({
      success: true,
      data: mapping,
    });
  } catch (err) {
    console.error("[assignTagToProduct]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to assign tag",
    });
  }
};


const getProductsByTag = async (req, res) => {
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

    const mappings =
      await ProductTagMapping.findAll({
        where: {
          tag_id: tag.id,
        },
        include: [
          {
            model: Product,
          },
        ],
        order: [["sort_order", "ASC"]],
      });

    return res.status(200).json({
      success: true,
      count: mappings.length,
      data: mappings,
    });
  } catch (err) {
    console.error("[getProductsByTag]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

const getTagsByProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      attributes: ["id", "name", "slug"],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const mappings = await ProductTagMapping.findAll({
      where: {
        product_id: product.id,
      },
      attributes: ["id", "sort_order"],
      include: [
        {
          model: ProductTag,
          as: "tag",
          attributes: ["id", "name", "slug", "icon", "color", "active"],
          required: true,
        },
      ],
      order: [
        ["sort_order", "ASC"],
        [{ model: ProductTag, as: "tag" }, "name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        product: product.toJSON(),
        tags: mappings.map((mapping) => ({
          mapping_id: mapping.id,
          sort_order: mapping.sort_order,
          ...mapping.tag.toJSON(),
        })),
      },
    });
  } catch (err) {
    console.error("[getTagsByProduct]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product tags",
    });
  }
};

const removeTagFromProduct = async (
  req,
  res
) => {
  try {
    const { product_id, tag_id } = req.body;

    const deleted =
      await ProductTagMapping.destroy({
        where: {
          product_id,
          tag_id,
        },
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Tag removed from product successfully",
    });
  } catch (err) {
    console.error("[removeTagFromProduct]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to remove tag",
    });
  }
};

module.exports = {
  assignTagToProduct,
  getProductsByTag,
  getTagsByProduct,
  removeTagFromProduct
}
