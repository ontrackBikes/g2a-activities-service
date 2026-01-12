const {
  products,
  bikeRentalLocations,
  hotelTransferLocations,
} = require("../data/productConfig");

const ProductService = {
  // Get all products
  getAllProducts: () => {
    return products.filter((p) => p.active);
  },

  // Get product by type
  getProductByType: (type) => {
    return products.find((p) => p.product_type === type && p.active);
  },

  // Get bike rental locations
  getBikeRentalLocations: () => {
    return bikeRentalLocations;
  },

  // Get hotel transfer locations
  getHotelTransferLocations: () => {
    return hotelTransferLocations;
  },

  // Aggregate bike rental info: number of pickup/drop locations, total stock etc.
  getRentalLocationsSummary: () => {
    const totalLocations = bikeRentalLocations.length;
    const pickupLocations = bikeRentalLocations.filter((l) => l.pickup).length;
    const dropLocations = bikeRentalLocations.filter((l) => l.drop).length;
    const totalStock = bikeRentalLocations.reduce(
      (sum, l) => sum + l.total_stock,
      0
    );

    return {
      totalLocations,
      pickupLocations,
      dropLocations,
      totalStock,
    };
  },

  // You can add more helper methods as needed
  // Example: get all non-serviceable dates across locations
  getBikeNonServiceableDates: () => {
    return bikeRentalLocations.flatMap((l) => l.non_serviceable_dates);
  },
};

module.exports = ProductService;
