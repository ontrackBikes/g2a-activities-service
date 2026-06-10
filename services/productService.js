const {
  sequelize,
  productModel,
  productConfigModel,
  productContentModel,
  productLocationModel,
} = require("../models");

class ProductService {
  async createProduct(payload) {
    const transaction = await sequelize.transaction();

    try {
      const product = await productModel.create(
        {
          name: payload.name,
          slug: payload.slug,
          code: payload.code,

          product_type: payload.product_type,

          category: payload.category,

          short_description: payload.short_description,

          thumbnail_url: payload.thumbnail_url,

          active: payload.active,
        },
        { transaction },
      );

      await productConfigModel.create(
        {
          product_id: product.id,

          pricing: payload.config.pricing,

          availability: payload.config.availability,

          booking_schema: payload.config.booking_schema,

          recommendation_rules: payload.config.recommendation_rules,

          addons_rules: payload.config.addons_rules,

          source_rules: payload.config.source_rules,
        },
        { transaction },
      );

      await productContentModel.create(
        {
          product_id: product.id,

          sections: payload.content.sections,
        },
        { transaction },
      );

      if (payload.locationIds && payload.locationIds.length) {
        const rows = payload.locationIds.map((locationId) => ({
          product_id: product.id,

          location_id: locationId,
        }));

        await productLocationModel.bulkCreate(rows, { transaction });
      }

      await transaction.commit();

      return product;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }
}

module.exports = new ProductService();
