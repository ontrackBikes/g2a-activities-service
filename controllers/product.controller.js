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
} = require("../models");

const {
  createProductSchema,
  updateProductSchema,
} = require("../schemas/product.schema");

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

const getProductsListForApp = async (req, res) => {
  try {
    const {
      search,
      featured,
      category_slug,
      product_type_slug,
      location_slug,
      location_id,
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

    const vendorProductWhere = {
      active: true,
    };

    const locationWhere = {};

    if (location_id) {
      vendorProductWhere.location_id =
        location_id;
    }

    if (location_slug) {
      locationWhere.slug = location_slug;
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

          required:
            Boolean(location_id) ||
            Boolean(location_slug),

          include: [
            {
              model: Location,
              as: "location",

              attributes: ["id", "name", "slug"],
              where: Object.keys(locationWhere)
                .length
                ? locationWhere
                : undefined,
              required: Boolean(location_slug),
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

    const productIds = products.map(
      (product) => product.id
    );

    let locationMap = {};

    if (productIds.length) {
      const vendorProductLocations =
        await VendorProduct.findAll({
          attributes: [
            "product_id",
            "location_id",
          ],
          where: {
            product_id: productIds,
            active: true,
            ...(location_id
              ? { location_id }
              : {}),
          },
          include: [
            {
              model: Location,
              as: "location",
              attributes: [
                "id",
                "name",
                "slug",
              ],
              where: Object.keys(locationWhere)
                .length
                ? locationWhere
                : undefined,
              required: Boolean(location_slug),
            },
          ],
        });

      locationMap =
        vendorProductLocations.reduce(
          (acc, vendorProduct) => {
            if (!vendorProduct.location) {
              return acc;
            }

            if (!acc[vendorProduct.product_id]) {
              acc[vendorProduct.product_id] =
                new Map();
            }

            acc[vendorProduct.product_id].set(
              vendorProduct.location.id,
              {
                id: vendorProduct.location.id,
                name: vendorProduct.location.name,
                slug: vendorProduct.location.slug,
              }
            );

            return acc;
          },
          {}
        );
    }

    const data = products.map((product) => {
      const json = product.toJSON();

      const locations = locationMap[
        product.id
      ]
        ? Array.from(
            locationMap[product.id].values()
          )
        : [];

      return {
        slug: json.slug,

        name: json.name,

        short_description: json.short_description,

        thumbnail_url: json.thumbnail_url,

        thumbnail_url_sm: json.thumbnail_url_sm,

        featured: json.featured,

        starting_price: Number(json.starting_price || 0),

        category: json.productType?.category || null,

        product_type: json.productType
          ? {
              name: json.productType.name,
              slug: json.productType.slug,
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


const getProductDetailsForApp = async (
  req,
  res
) => {
  try {
    const { slug } = req.params;

    const product =
      await Product.findOne({
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
          },

          {
            model: ProductFaq,
            as: "faqs",
            required: false,
            separate: true,
          },

          {
            model: ProductTerm,
            as: "terms",
            required: false,
            separate: true,
          },

          {
            model: ProductHighlight,
            as: "highlights",
            required: false,
            separate: true,
          },

          {
            model: ProductInclusion,
            as: "inclusions",
            required: false,
            separate: true,
          },

          {
            model: ProductExclusion,
            as: "exclusions",
            required: false,
            separate: true,
          },

          {
            model: ProductThingToKnow,
            as: "thingsToKnow",
            required: false,
            separate: true,
          },

          {
            model: ProductTag,
            as: "tags",
            through: {
              attributes: [],
            },
            required: false,
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
                required: false,
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

    const locationsMap =
      new Map();

    let startingPrice = null;

    for (const vp of product.vendorProducts ||
      []) {
      if (
        vp.location &&
        !locationsMap.has(
          vp.location.id
        )
      ) {
        locationsMap.set(
          vp.location.id,
          {
            id: vp.location.id,
            name:
              vp.location.name,
            slug:
              vp.location.slug,
          }
        );
      }

      const price =
        Number(
          vp.base_price
        );

      if (
        !Number.isNaN(price)
      ) {
        if (
          startingPrice ===
          null
        ) {
          startingPrice =
            price;
        } else {
          startingPrice =
            Math.min(
              startingPrice,
              price
            );
        }
      }
    }

    const relatedProducts =
      await Product.findAll({
        where: {
          active: true,

          product_type_id:
            product.product_type_id,

          id: {
            [Op.ne]:
              product.id,
          },
        },

        limit: 8,

        order: [
          [
            "featured",
            "DESC",
          ],
          [
            "sort_order",
            "ASC",
          ],
        ],

        attributes: [
          "id",
          "slug",
          "name",
          "thumbnail_url",
        ],
      });

    return res.json({
      success: true,

      data: {
        id: product.id,

        slug: product.slug,

        name: product.name,

        short_description:
          product.short_description,

        thumbnail_url:
          product.thumbnail_url,

        thumbnail_url_sm:
          product.thumbnail_url_sm,

        featured:
          product.featured,

        starting_price:
          startingPrice,

        images:
          product.images || [],

        highlights:
          product.highlights ||
          [],

        thingsToKnow:
          product.thingsToKnow ||
          [],

        inclusions:
          product.inclusions ||
          [],

        exclusions:
          product.exclusions ||
          [],

        faqs:
          product.faqs || [],

        terms:
          product.terms || [],

        tags:
          product.tags || [],

        locations:
          Array.from(
            locationsMap.values()
          ),

        related_products:
          relatedProducts,
      },
    });
  } catch (error) {
    console.error(
      "[getProductDetailsForApp]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch product",
    });
  }
};


module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsListForApp,
  getProductDetailsForApp
};
