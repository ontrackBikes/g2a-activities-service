const router = require("express").Router();

const {
  createProductThingToKnow,
  getProductThingsToKnow,
  getProductThingToKnowById,
  updateProductThingToKnow,
  deleteProductThingToKnow,
} = require("../controllers/productThingToKnow.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:productId/things-to-know",
  validateUser,
  createProductThingToKnow,
);

router.get(
  "/:productId/things-to-know",
  validateUser,
  getProductThingsToKnow,
);

router.get(
  "/:productId/things-to-know/:thingToKnowId",
  validateUser,
  getProductThingToKnowById,
);

router.patch(
  "/:productId/things-to-know/:thingToKnowId",
  validateUser,
  updateProductThingToKnow,
);

router.delete(
  "/:productId/things-to-know/:thingToKnowId",
  validateUser,
  deleteProductThingToKnow,
);

module.exports = router;