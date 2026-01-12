require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api", require("./routes/product.routes"));
app.use("/api/order", require("./routes/order.routes"));
app.use(
  "/api",
  express.raw({ type: "*/*" }),
  require("./routes/razorpay.routes")
);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
