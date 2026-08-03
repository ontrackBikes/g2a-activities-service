const ProductCollection =
  require("../models/productCollection.model");

const ProductCollectionProduct =
  require("../models/productCollectionProduct.model");

const { Product } =
  require("../models");

const {
  createProductCollectionProductSchema,
} = require(
  "../schemas/productCollectionProduct.schema"
);

const assignProductToCollection =
  async (req, res) => {
    try {
      const { error, value } =
        createProductCollectionProductSchema.validate(
          req.body
        );

      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.details[0].message,
        });
      }

      const collection =
        await ProductCollection.findByPk(
          value.collection_id
        );

      if (!collection) {
        return res.status(404).json({
          success: false,
          message:
            "Collection not found",
        });
      }

      const product =
        await Product.findByPk(
          value.product_id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const existing =
        await ProductCollectionProduct.findOne(
          {
            where: {
              collection_id:
                value.collection_id,
              product_id:
                value.product_id,
            },
          }
        );

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "Product already assigned",
        });
      }

      const mapping =
        await ProductCollectionProduct.create(
          value
        );

      return res.status(201).json({
        success: true,
        data: mapping,
      });
    } catch (err) {
      console.error(
        "[assignProductToCollection]",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to assign product",
      });
    }
  };

const deleteCollectionProduct =
  async (req, res) => {
    try {
      const mapping =
        await ProductCollectionProduct.findByPk(
          req.params.id
        );

      if (!mapping) {
        return res.status(404).json({
          success: false,
          message:
            "Mapping not found",
        });
      }

      await mapping.destroy();

      return res.status(200).json({
        success: true,
        message:
          "Product removed from collection",
      });
    } catch (err) {
      console.error(
        "[deleteCollectionProduct]",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove product",
      });
    }
  };

module.exports = {
  assignProductToCollection,
  deleteCollectionProduct,
};