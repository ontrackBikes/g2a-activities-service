require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/sequelize");
const routes = require("./routes");

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
app.use("/api", require("./routes/bikeRentals.routes"));
app.use("/api/v1", routes);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

/*
|--------------------------------------------------------------------------
| Bootstrap
|--------------------------------------------------------------------------
*/

async function bootstrap() {
  try {
    await sequelize.authenticate();

    console.log("✅ Database connected");

    // await sequelize.sync({
    //   alter: true,
    // });
    // console.log("✅ Models synced");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Activities Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Bootstrap failed");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
