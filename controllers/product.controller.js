const { Op, fn, col, literal } = require("sequelize");

const {
  Product,
  ProductGroup,
  ProductImage,
  ProductType,
  VendorProduct,
  Category,
  ProductTag,
  Location,
  ProductFaq,
  ProductTerm,
  ProductHighlight,
  ProductInclusion,
  ProductExclusion,
  ProductThingToKnow,
  BookingTemplate,
} = require("../models");

const {
  createProductSchema,
  updateProductSchema,
} = require("../schemas/product.schema");
const {
  getAvailableVendorForProduct,
  getAvailableVendorsForProducts,
} = require(
  "../services/availableVendor.service"
);
const {
  getNextAvailableSlotForProduct,
  getNextAvailableSlotsForProducts,
} = require(
  "../services/nextAvailableSlot.service"
);

const createProduct = async (req, res) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    /**
     * Validate Product Group
     */
    if (value.group_id) {
      const group = await ProductGroup.findByPk(value.group_id);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Product group not found",
        });
      }
    }

    /**
     * Validate Product Type
     */
    const productType = await ProductType.findByPk(value.product_type_id);

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    /**
     * Duplicate Slug Check
     */
    const existingSlug = await Product.findOne({
      where: {
        slug: value.slug,
      },
    });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists",
      });
    }

    /**
     * Duplicate Code Check
     */
    if (value.code) {
      const existingCode = await Product.findOne({
        where: {
          code: value.code,
        },
      });

      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: "Code already exists",
        });
      }
    }

    const product = await Product.create(value);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("[ProductController] createProduct", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { active, group_id, product_type_id, search } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (group_id) {
      where.group_id = group_id;
    }

    if (product_type_id) {
      where.product_type_id = product_type_id;
    }

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          slug: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const products = await Product.findAll({
      where,
      include: [
        {
          model: ProductGroup,
          as: "group",
        },
        {
          model: VendorProduct,
          as: "vendorProducts",
        },
      ],
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("[ProductController] getProducts", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: ProductGroup,
          as: "group",
        },
        {
          model: ProductImage,
          as: "images",
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("[ProductController] getProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.update(value);

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("[ProductController] updateProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("[ProductController] deleteProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 2 || query.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search query must be between 2 and 100 characters",
      });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 10;
    const searchPattern = `%${query}%`;

    const products = await Product.findAll({
      attributes: [
        "name",
        "slug",
        "thumbnail_url",
        "thumbnail_url_sm",
      ],
      where: {
        active: true,
        [Op.or]: [
          {
            name: {
              [Op.like]: searchPattern,
            },
          },
          {
            slug: {
              [Op.like]: searchPattern,
            },
          },
          {
            "$productType.name$": {
              [Op.like]: searchPattern,
            },
          },
          {
            "$productType.slug$": {
              [Op.like]: searchPattern,
            },
          },
          {
            "$productType.category.name$": {
              [Op.like]: searchPattern,
            },
          },
          {
            "$productType.category.slug$": {
              [Op.like]: searchPattern,
            },
          },
        ],
      },
      include: [
        {
          model: ProductType,
          as: "productType",
          attributes: ["name", "slug"],
          required: true,
          where: {
            active: true,
          },
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["name", "slug"],
              required: true,
              where: {
                active: true,
              },
            },
          ],
        },
        {
          model: VendorProduct,
          as: "vendorProducts",
          attributes: [],
          where: {
            active: true,
          },
          required: true,
        },
      ],
      order: [["name", "ASC"]],
      limit,
      subQuery: false,
    });

    const data = products.map((product) => ({
      name: product.name,
      slug: product.slug,
      image: product.thumbnail_url_sm || product.thumbnail_url,
      product_type: {
        name: product.productType.name,
        slug: product.productType.slug,
      },
      category: {
        name: product.productType.category.name,
        slug: product.productType.category.slug,
      },
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("[ProductController] searchProducts", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search products",
    });
  }
};

const getProductsListForApp = async (req, res) => {
  try {
    const {
      search,
      featured,
      category_slug,
      product_type_slug,
      location_slug,
      location_id,
      location_slugs,
      location_ids,
      date,
      guests = 1,
      min_price,
      max_price,
      sort = "recommended",
      page = 1,
      limit = 20,
    } = req.query;

    const where = {
      active: true,
    };

    if (featured !== undefined) {
      where.featured = featured === "true";
    }

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          short_description: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const productTypeWhere = {
      active: true,
    };

    const categoryWhere = {
      active: true,
    };

    if (product_type_slug) {
      productTypeWhere.slug = product_type_slug;
    }

    if (category_slug) {
      categoryWhere.slug = category_slug;
    }

    const parseQueryList = (value) => {
      if (!value) {
        return [];
      }

      return (Array.isArray(value) ? value : [value])
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const selectedLocationIds = [
      ...new Set([
        ...parseQueryList(location_id),
        ...parseQueryList(location_ids),
      ]),
    ];

    const selectedLocationSlugs = [
      ...new Set([
        ...parseQueryList(location_slug),
        ...parseQueryList(location_slugs),
      ]),
    ];

    const vendorProductWhere = {
      active: true,
    };

    const locationWhere = {};

    if (selectedLocationIds.length) {
      vendorProductWhere.location_id = {
        [Op.in]: selectedLocationIds,
      };
    }

    if (selectedLocationSlugs.length) {
      locationWhere.slug = {
        [Op.in]: selectedLocationSlugs,
      };
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const pageSize = Math.min(parseInt(limit, 10) || 20, 100);

    const offset = (pageNumber - 1) * pageSize;

    let order = [];

    switch (sort) {
      case "price_low":
        order.push([literal("starting_price"), "ASC"]);
        break;

      case "price_high":
        order.push([literal("starting_price"), "DESC"]);
        break;

      case "newest":
        order.push(["createdAt", "DESC"]);
        break;

      default:
        order.push(["featured", "DESC"], ["sort_order", "ASC"]);
        break;
    }

    const products = await Product.findAll({
      subQuery: false,

      attributes: [
        "id",
        "slug",
        "name",
        "short_description",
        "thumbnail_url",
        "thumbnail_url_sm",
        "featured",

        [fn("MIN", col("vendorProducts.base_price")), "starting_price"],
      ],

      where,

      include: [
        {
          model: ProductType,
          as: "productType",

          attributes: ["id", "name", "slug"],

          where: productTypeWhere,

          include: [
            {
              model: Category,
              as: "category",

              attributes: ["id", "name", "slug"],

              where: categoryWhere,
            },
          ],
        },

        {
          model: VendorProduct,
          as: "vendorProducts",

          attributes: [],

          where: vendorProductWhere,

          required: true,

          include: [
            {
              model: Location,
              as: "location",

              attributes: ["id", "name", "slug"],
              where: Object.keys(locationWhere).length
                ? locationWhere
                : undefined,
              required: selectedLocationSlugs.length > 0,
            },
          ],
        },

        {
          model: ProductTag,
          as: "tags",

          attributes: ["id", "name", "slug"],

          through: {
            attributes: [],
          },

          required: false,
        },
      ],

      group: [
        "Product.id",

        "productType.id",

        "productType->category.id",

        "tags.id",
      ],

      order,

      limit: pageSize,
      offset,
    });

    const productIds = products.map((product) => product.id);
    const requestedGuests = Math.max(
      Number.parseInt(guests, 10) || 1,
      1,
    );
    const [
      availabilityMap,
      nextAvailableSlotMap,
    ] = await Promise.all([
      getAvailableVendorsForProducts({
        productIds,
        locationIds: selectedLocationIds,
        locationSlugs: selectedLocationSlugs,
        date,
        guests: requestedGuests,
      }),
      getNextAvailableSlotsForProducts({
        productIds,
        locationIds: selectedLocationIds,
        locationSlugs: selectedLocationSlugs,
        guests: requestedGuests,
      }),
    ]);

    let locationMap = {};

    if (productIds.length) {
      const vendorProductLocations = await VendorProduct.findAll({
        attributes: ["product_id", "location_id"],
        where: {
          product_id: productIds,
          active: true,
          ...(selectedLocationIds.length
            ? {
                location_id: {
                  [Op.in]: selectedLocationIds,
                },
              }
            : {}),
        },
        include: [
          {
            model: Location,
            as: "location",
            attributes: ["id", "name", "slug"],
            where: Object.keys(locationWhere).length
              ? locationWhere
              : undefined,
            required: selectedLocationSlugs.length > 0,
          },
        ],
      });

      locationMap = vendorProductLocations.reduce((acc, vendorProduct) => {
        if (!vendorProduct.location) {
          return acc;
        }

        if (!acc[vendorProduct.product_id]) {
          acc[vendorProduct.product_id] = new Map();
        }

        acc[vendorProduct.product_id].set(vendorProduct.location.id, {
          id: vendorProduct.location.id,
          name: vendorProduct.location.name,
          slug: vendorProduct.location.slug,
        });

        return acc;
      }, {});
    }

    const data = products.map((product) => {
      const json = product.toJSON();

      const locations = locationMap[product.id]
        ? Array.from(locationMap[product.id].values())
        : [];
      const availability =
        availabilityMap.get(product.id);
      const nextAvailableSlot =
        nextAvailableSlotMap.get(Number(product.id)) || null;

      return {
        slug: json.slug,

        name: json.name,

        short_description: json.short_description,

        thumbnail_url: json.thumbnail_url,

        thumbnail_url_sm: json.thumbnail_url_sm,

        featured: json.featured,

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

        category: json.productType?.category || null,

        product_type: json.productType
          ? {
              name: json.productType.name,
              slug: json.productType.slug,
              category: json.productType.category
            }
          : null,

        locations,

        tags:
          json.tags?.map((tag) => ({
            name: tag.name,
            slug: tag.slug,
          })) || [],
      };
    });

    return res.status(200).json({
      success: true,

      page: pageNumber,

      limit: pageSize,

      count: data.length,

      data,
    });
  } catch (error) {
    console.error("[ProductController] getProductsListForApp", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

const getProductDetailsForApp = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      location_slug,
      date,
      guests = 1,
    } = req.query;

    const product = await Product.findOne({
      where: {
        slug,
        active: true,
      },

      include: [
        {
          model: ProductImage,
          as: "images",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id", "product_id"]
          }
        },

        {
          model: ProductFaq,
          as: "faqs",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },
        {
          model: BookingTemplate,
          as: "bookingTemplate",
        },

        {
          model: ProductTerm,
          as: "terms",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },

        {
          model: ProductHighlight,
          as: "highlights",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },

        {
          model: ProductInclusion,
          as: "inclusions",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },

        {
          model: ProductExclusion,
          as: "exclusions",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },

        {
          model: ProductThingToKnow,
          as: "thingsToKnow",
          required: false,
          separate: true,
          attributes: {
            exclude: ["id"]
          }
        },

        {
          model: ProductTag,
          as: "tags",
          through: {
            attributes: [],
          },
          required: false,
          attributes: {
            exclude: ["id"]
          }
        },

        

        {
          model: VendorProduct,
          as: "vendorProducts",

          required: false,
          separate: true,

          where: {
            active: true,
          },

          include: [
            {
              model: Location,
              as: "location",
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
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.vendorProducts?.length) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not available from any vendor",
      });
    }

    const locationsMap = new Map();

    for (const vp of product.vendorProducts || []) {
      if (vp.location && !locationsMap.has(vp.location.id)) {
        locationsMap.set(vp.location.id, {
          id: vp.location.id,
          name: vp.location.name,
          slug: vp.location.slug,
        });
      }
    }

    const requestedGuests = Math.max(
      Number.parseInt(guests, 10) || 1,
      1,
    );

    const [
      availability,
      nextAvailableSlot,
      relatedProducts,
    ] = await Promise.all([
      getAvailableVendorForProduct({
        productId: product.id,
        locationSlug: location_slug,
        date,
        guests: requestedGuests,
      }),
      getNextAvailableSlotForProduct({
        productId: product.id,
        locationSlug: location_slug,
        guests: requestedGuests,
      }),
      Product.findAll({
        where: {
          active: true,

          product_type_id: product.product_type_id,

          id: {
            [Op.ne]: product.id,
          },
        },

        limit: 8,

        order: [
          ["featured", "DESC"],
          ["sort_order", "ASC"],
        ],

        attributes: [
          "id",
          "slug",
          "name",
          "thumbnail_url",
        ],
      }),
    ]);

    return res.json({
      success: true,

      data: {
        bookingTemplate: product.bookingTemplate,

        slug: product.slug,

        name: product.name,

        short_description: product.short_description,

        thumbnail_url: product.thumbnail_url,

        thumbnail_url_sm: product.thumbnail_url_sm,

        featured: product.featured,

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

        images: product.images || [],

        highlights: product.highlights || [],

        thingsToKnow: product.thingsToKnow || [],

        inclusions: product.inclusions || [],

        exclusions: product.exclusions || [],

        faqs: product.faqs || [],

        terms: product.terms || [],

        tags: product.tags || [],

        locations: Array.from(locationsMap.values()),

        related_products: relatedProducts,
      },
    });
  } catch (error) {
    console.error("[getProductDetailsForApp]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsListForApp,
  getProductDetailsForApp,
};
