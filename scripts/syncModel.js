require("dotenv").config();

const sequelize = require("../config/sequelize");

require("../models");

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

const findModel = (target) => {
  const normalizedTarget = normalize(target);

  return Object.values(sequelize.models).find((model) => {
    const tableName = normalize(model.getTableName());
    const modelName = normalize(model.name);

    return (
      tableName === normalizedTarget || modelName === normalizedTarget
    );
  });
};

const listAvailableTargets = () =>
  Object.values(sequelize.models)
    .map((model) => model.getTableName())
    .sort()
    .join(", ");

const syncModel = async () => {
  const target = process.argv[2];

  if (!target) {
    throw new Error(
      `Usage: npm run syncmodel -- <table_name|model_name|all>\nAvailable tables: ${listAvailableTargets()}`,
    );
  }

  await sequelize.authenticate();

  if (normalize(target) === "all") {
    console.log("Syncing all models (alter: true)...");
    await sequelize.sync({ alter: true });
    console.log("All models synced successfully.");
    return;
  }

  const model = findModel(target);

  if (!model) {
    throw new Error(
      `No model found matching '${target}'.\nAvailable tables: ${listAvailableTargets()}`,
    );
  }

  console.log(
    `Syncing ${model.name} (table: ${model.getTableName()}) with alter: true...`,
  );

  await model.sync({ alter: true });

  console.log(`${model.name} synced successfully.`);
};

syncModel()
  .catch((error) => {
    console.error("Sync failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
