const router = require("express").Router();

const {
  createVendorProductFaq,
  getVendorProductFaqs,
  getVendorProductFaqById,
  updateVendorProductFaq,
  deleteVendorProductFaq,
} = require("../controllers/vendorProductFaq.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/faqs",
  validateUser,
  createVendorProductFaq,
);

router.get(
  "/:vendorProductId/faqs",
  validateUser,
  getVendorProductFaqs,
);

router.get(
  "/:vendorProductId/faqs/:faqId",
  validateUser,
  getVendorProductFaqById,
);

router.patch(
  "/:vendorProductId/faqs/:faqId",
  validateUser,
  updateVendorProductFaq,
);

router.delete(
  "/:vendorProductId/faqs/:faqId",
  validateUser,
  deleteVendorProductFaq,
);

module.exports = router;