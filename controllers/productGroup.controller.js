const {
  ProductGroup,
  Product,
} = require("../models");

const {
  createProductGroupSchema,
  updateProductGroupSchema,
} = require("../schemas/productGroup.schema");

const createProductGroup = async (req, res) => {
  try {
    const { error, value } =
      createProductGroupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const group = await ProductGroup.create(value);

    return res.status(201).json({
      success: true,
      message: "Product group created successfully",
      data: group,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getProductGroups = async (req, res) => {
  try {
    const groups = await ProductGroup.findAll({
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProductGroup = async (req, res) => {
  try {
    const group = await ProductGroup.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Product,
            as: "products",
          },
        ],
      }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    return res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const updateProductGroup = async (req, res) => {
  try {
    const { error, value } =
      updateProductGroupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const group = await ProductGroup.findByPk(
      req.params.id
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    await group.update(value);

    return res.json({
      success: true,
      message: "Product group updated successfully",
      data: group,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProductGroup = async (req, res) => {
  try {
    const group = await ProductGroup.findByPk(
      req.params.id
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    await group.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Product group deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createProductGroup,
  getProductGroups,
  getProductGroup,
  updateProductGroup,
  deleteProductGroup,
};