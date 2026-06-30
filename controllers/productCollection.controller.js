const {
  ProductCollectionProduct,
  Product,
  ProductType,
  ProductImage,
  Category,
  VendorProduct,
  Location,
} = require("../models");
const ProductCollection = require("../models/productCollection.model");
const {
  getAvailableVendorsForProducts,
} = require(
  "../services/availableVendor.service"
);
const {
  getNextAvailableSlotsForProducts,
} = require(
  "../services/nextAvailableSlot.service"
);

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
    const {
      entity_type,
      entity_id,
      entity_slug,
      location_slug,
      date,
      guests = 1,
    } = req.query;

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
                  include: [
                    {
                      model: Category,
                      as: "category",
                      attributes: {
                        exclude: ["id"]
                      }
                    },
                  ]
                },
                {
                  model: ProductImage,
                  as: "images",
                  required: false,
                  where: {
                    active: true,
                  },
                },
                {
                  model: VendorProduct,
                  as: "vendorProducts",
                  attributes: [],
                  required: true,
                  where: {
                    active: true,
                  },
                  include: [
                    {
                      model: Location,
                      as: "location",
                      attributes: [],
                      required: true,
                      where: {
                        active: true,
                        ...(location_slug
                          ? {
                              slug:
                                location_slug,
                            }
                          : {}),
                      },
                    },
                  ],
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

    const requestedGuests = Math.max(
      Number.parseInt(guests, 10) || 1,
      1,
    );
    const selectedLocationSlugs = location_slug
      ? [location_slug]
      : [];

    const [
      availabilityMap,
      nextAvailableSlotMap,
      vendorProductLocations,
    ] = await Promise.all([
      getAvailableVendorsForProducts({
        productIds,
        locationSlugs: selectedLocationSlugs,
        date,
        guests: requestedGuests,
      }),
      getNextAvailableSlotsForProducts({
        productIds,
        locationSlugs: selectedLocationSlugs,
        guests: requestedGuests,
      }),
      productIds.length
        ? VendorProduct.findAll({
            attributes: ["product_id", "location_id"],
            where: {
              product_id: productIds,
              active: true,
            },
            include: [
              {
                model: Location,
                as: "location",
                attributes: ["id", "name", "slug"],
                required: true,
                where: {
                  active: true,
                  ...(location_slug
                    ? {
                        slug: location_slug,
                      }
                    : {}),
                },
              },
            ],
          })
        : Promise.resolve([]),
    ]);

    const locationMap = vendorProductLocations.reduce(
      (acc, vendorProduct) => {
        const productId = Number(
          vendorProduct.product_id,
        );
        const location = vendorProduct.location;

        if (!acc.has(productId)) {
          acc.set(productId, new Map());
        }

        acc.get(productId).set(location.id, {
          id: location.id,
          name: location.name,
          slug: location.slug,
        });

        return acc;
      },
      new Map(),
    );

    const data = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      banner_url: collection.banner_url,
      entity_type: collection.entity_type,
      entity_id: collection.entity_id,
      sort_order: collection.sort_order,

      products: collection.productMappings.map((mapping) => {
        const availability =
          availabilityMap.get(mapping.product.id);
        const productId = Number(mapping.product.id);
        const nextAvailableSlot =
          nextAvailableSlotMap.get(productId) || null;
        const locations = locationMap.has(productId)
          ? Array.from(
              locationMap.get(productId).values(),
            )
          : [];

        return {
          ...mapping.product.toJSON(),
          available: Boolean(availability),
          out_of_stock: !availability,
          starting_price: availability
            ? availability.pricing.display_price
            : null,
          base_price: availability
            ? availability.pricing.base_price
            : null,
          price_type: availability
            ? availability.pricing.price_type
            : null,
          next_available_slot: nextAvailableSlot,
          locations,
          collection_sort_order:
            mapping.sort_order,
        };
      }),
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
