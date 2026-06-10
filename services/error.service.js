const parseError = (error) => {
  let statusCode = 500;

  const response = {
    message: "Something went wrong. Please try again.",
    tech_message: error.message || "Unknown error",
  };

  // Sequelize Unique
  if (error.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;

    const fields = error.errors?.map((e) => e.path);

    response.message =
      fields?.includes("slug")
        ? "A product with this slug already exists."
        : fields?.includes("code")
          ? "A product with this code already exists."
          : "Duplicate record found.";

    response.tech_message = error.errors
      ?.map((e) => e.message)
      .join(", ");

    return { statusCode, ...response };
  }

  // Sequelize Validation
  if (error.name === "SequelizeValidationError") {
    statusCode = 400;

    response.message = "Validation failed.";

    response.tech_message = error.errors
      ?.map((e) => e.message)
      .join(", ");

    return { statusCode, ...response };
  }

  // Foreign Key
  if (error.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;

    response.message =
      "One or more referenced records do not exist.";

    response.tech_message =
      error.parent?.sqlMessage ||
      error.message;

    return { statusCode, ...response };
  }

  // MySQL
  if (error.parent?.sqlMessage) {
    response.tech_message = error.parent.sqlMessage;
  }

  return { statusCode, ...response };
};

module.exports = {
  parseError,
};