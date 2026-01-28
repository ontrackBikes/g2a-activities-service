require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// JSON parser (for normal APIs)
app.use(express.json());

// Routes
app.use("/api", require("./routes/product.routes"));
app.use("/api/order", require("./routes/order.routes"));
app.use(
  "/api",
  express.raw({ type: "*/*" }),
  require("./routes/razorpay.routes"),
);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
