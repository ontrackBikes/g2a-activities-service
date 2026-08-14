require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const sequelize = require("./config/sequelize");
const routes = require("./routes");
const healthRoutes = require("./routes/health.routes");

const app = express();
const PORT = process.env.PORT || 3000;
const registerCrons = require("./crons");

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

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api", require("./routes/bikeRentals.routes"));
app.use("/api/v1", routes);

// Health check - polled by the frontend to detect if the API or its
// dependencies (db, redis) are down.
app.use("/health", healthRoutes);



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

    registerCrons();
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Activities Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Bootstrap failed");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
