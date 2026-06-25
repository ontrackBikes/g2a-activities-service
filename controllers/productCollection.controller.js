const {
  ProductCollectionProduct,
  Product,
  ProductType,
  ProductImage,
  Category,
  VendorProduct,
} = require("../models");
const { Sequelize } = require("sequelize");
const ProductCollection = require("../models/productCollection.model");

const {
  createProductCollectionSchema,
  updateProductCollectionSchema,
} = require("../schemas/productCollection.schema");

/**
 * Create Collection
 */
const createProductCollection = async (req, res) => {
  try {
    const { error, value } = createProductCollectionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const collection = await ProductCollection.create(value);

    return res.status(201).json({
      success: true,
      data: collection,
    });
  } catch (err) {
    console.error("[createProductCollection]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create collection",
    });
  }
};

/**
 * Get Collections
 */
const getProductCollections = async (req, res) => {
  try {
    const where = {};

    if (req.query.entity_type) {
      where.entity_type = req.query.entity_type;
    }

    if (req.query.entity_id) {
      where.entity_id = req.query.entity_id;
    }

    const collections = await ProductCollection.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (err) {
    console.error("[getProductCollections]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch collections",
    });
  }
};

/**
 * Get Collection By Id
 */
const getProductCollectionById = async (req, res) => {
  try {
    const collection = await ProductCollection.findByPk(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (err) {
    console.error("[getProductCollectionById]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch collection",
    });
  }
};

/**
 * Update Collection
 */
const updateProductCollection = async (req, res) => {
  try {
    const { error, value } = updateProductCollectionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const collection = await ProductCollection.findByPk(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    await collection.update(value);

    return res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (err) {
    console.error("[updateProductCollection]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update collection",
    });
  }
};

/**
 * Soft Delete
 */
const deleteProductCollection = async (req, res) => {
  try {
    const collection = await ProductCollection.findByPk(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    await collection.update({
      active: false,
    });

    return res.status(200).json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (err) {
    console.error("[deleteProductCollection]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete collection",
    });
  }
};

const ALLOWED_ENTITY_TYPES = ["global", "category", "product_type", "location"];

const getCollectionsWithProducts = async (req, res) => {
  try {
    const { entity_type, entity_id, entity_slug } = req.query;

    const where = {
      active: true,
    };

    if (entity_type) {
      if (!ALLOWED_ENTITY_TYPES.includes(entity_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid entity_type",
        });
      }

      where.entity_type = entity_type;
    }

    /**
     * Direct entity id
     */
    if (entity_id) {
      where.entity_id = entity_id;
    }

    /**
     * Resolve slug to entity id
     */
    if (entity_slug && !entity_id && entity_type) {
      let entity = null;

      switch (entity_type) {
        case "category":
          entity = await Category.findOne({
            where: {
              slug: entity_slug,
            },
          });
          break;

        case "product_type":
          entity = await ProductType.findOne({
            where: {
              slug: entity_slug,
            },
          });
          break;

        default:
          break;
      }

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: `${entity_type} not found`,
        });
      }

      where.entity_id = entity.id;
    }

    const collections = await ProductCollection.findAll({
      where,

      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],

      include: [
        {
          model: ProductCollectionProduct,
          as: "productMappings",

          separate: true,

          order: [
            ["sort_order", "ASC"],
            ["id", "ASC"],
          ],

          include: [
            {
              model: Product,
              as: "product",

              required: true,

              where: {
                active: true,
              },

              include: [
                {
                  model: ProductType,
                  as: "productType",
                },
                {
                  model: ProductImage,
                  as: "images",
                  required: false,
                  where: {
                    active: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const productIds = [
      ...new Set(
        collections.flatMap((collection) =>
          collection.productMappings.map(
            (mapping) => mapping.product_id
          )
        )
      ),
    ];

    let priceMap = {};

    if (productIds.length) {
      const productPrices =
        await VendorProduct.findAll({
          attributes: [
            "product_id",
            [
              Sequelize.fn(
                "MIN",
                Sequelize.col("base_price")
              ),
              "base_price",
            ],
          ],
          where: {
            product_id: productIds,
            active: true,
          },
          group: ["product_id"],
          raw: true,
        });

      priceMap = productPrices.reduce(
        (acc, item) => {
          acc[item.product_id] = Number(
            item.base_price
          );
          return acc;
        },
        {}
      );
    }

    const data = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      banner_url: collection.banner_url,
      entity_type: collection.entity_type,
      entity_id: collection.entity_id,
      sort_order: collection.sort_order,

      products: collection.productMappings.map((mapping) => ({
        ...mapping.product.toJSON(),
        starting_price:
          priceMap[mapping.product.id] || null,
        collection_sort_order: mapping.sort_order,
      })),
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(
      "[ProductCollectionController] getCollectionsWithProducts",
      err,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch collections",
    });
  }
};

module.exports = {
  createProductCollection,
  getProductCollections,
  getProductCollectionById,
  updateProductCollection,
  deleteProductCollection,
  getCollectionsWithProducts,
};
