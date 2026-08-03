const router = require("express").Router();

const {
  createProductFaq,
  getProductFaqs,
  getProductFaqById,
  updateProductFaq,
  deleteProductFaq,
} = require("../controllers/productFaq.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:productId/faqs",
  validateUser,
  createProductFaq,
);

router.get(
  "/:productId/faqs",
  validateUser,
  getProductFaqs,
);

router.get(
  "/:productId/faqs/:faqId",
  validateUser,
  getProductFaqById,
);

router.patch(
  "/:productId/faqs/:faqId",
  validateUser,
  updateProductFaq,
);

router.delete(
  "/:productId/faqs/:faqId",
  validateUser,
  deleteProductFaq,
);

module.exports = router;