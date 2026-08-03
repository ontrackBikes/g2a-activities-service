const {
  Product,
  ProductCancellationPolicy,
} = require("../models");
const {
  createProductCancellationPolicySchema,
  updateProductCancellationPolicySchema,
} = require("../schemas/productCancellationPolicy.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const getProduct = async (productId) => Product.findByPk(productId);

const createProductCancellationPolicy = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const { error, value } = createProductCancellationPolicySchema.validate(
      { ...req.body, product_id: Number(productId) },
      { abortEarly: false, stripUnknown: true },
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    if (!(await getProduct(value.product_id))) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const policy = await ProductCancellationPolicy.create(value);

    return res.status(201).json({
      success: true,
      message: "Product cancellation policy created successfully",
      data: policy,
    });
  } catch (error) {
    console.error("[ProductCancellationPolicy] create:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create product cancellation policy",
    });
  }
};

const getProductCancellationPolicies = async (req, res) => {
  try {
    const { productId } = req.params;
    const { active } = req.query;

    if (!isValidId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (active !== undefined && !["true", "false"].includes(active)) {
      return res.status(400).json({
        success: false,
        message: "active must be true or false",
      });
    }

    if (!(await getProduct(productId))) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const where = { product_id: productId };

    if (active !== undefined) {
      where.active = active === "true";
    }

    const policies = await ProductCancellationPolicy.findAll({
      where,
      order: [["sort_order", "ASC"], ["id", "ASC"]],
    });

    return res.json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    console.error("[ProductCancellationPolicy] list:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch product cancellation policies",
    });
  }
};

const getProductCancellationPolicyById = async (req, res) => {
  try {
    const { productId, policyId } = req.params;

    if (!isValidId(productId) || !isValidId(policyId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const policy = await ProductCancellationPolicy.findOne({
      where: { id: policyId, product_id: productId },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Product cancellation policy not found",
      });
    }

    return res.json({ success: true, data: policy });
  } catch (error) {
    console.error("[ProductCancellationPolicy] get:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch product cancellation policy",
    });
  }
};

const updateProductCancellationPolicy = async (req, res) => {
  try {
    const { productId, policyId } = req.params;

    if (!isValidId(productId) || !isValidId(policyId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const { error, value } = updateProductCancellationPolicySchema.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const policy = await ProductCancellationPolicy.findOne({
      where: { id: policyId, product_id: productId },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Product cancellation policy not found",
      });
    }

    await policy.update(value);

    return res.json({
      success: true,
      message: "Product cancellation policy updated successfully",
      data: policy,
    });
  } catch (error) {
    console.error("[ProductCancellationPolicy] update:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update product cancellation policy",
    });
  }
};

const deleteProductCancellationPolicy = async (req, res) => {
  try {
    const { productId, policyId } = req.params;

    if (!isValidId(productId) || !isValidId(policyId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const policy = await ProductCancellationPolicy.findOne({
      where: { id: policyId, product_id: productId },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Product cancellation policy not found",
      });
    }

    await policy.destroy();

    return res.json({
      success: true,
      message: "Product cancellation policy deleted successfully",
    });
  } catch (error) {
    console.error("[ProductCancellationPolicy] delete:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete product cancellation policy",
    });
  }
};

module.exports = {
  createProductCancellationPolicy,
  getProductCancellationPolicies,
  getProductCancellationPolicyById,
  updateProductCancellationPolicy,
  deleteProductCancellationPolicy,
};
