const ApiError = require("./apiError");
const { ValidationError: SequelizeValidationError, UniqueConstraintError } = require("sequelize");

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  // Safety: make sure res exists
  if (!res) {
    console.error("🔥 Error: res object is undefined", err);
    return;
  }

  console.error("🔥 Error caught:", err);

  // Handle custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }

  // Handle Sequelize validation errors
  if (err instanceof SequelizeValidationError) {
    const messages = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({
      success: false,
      message: messages,
    });
  }

  // Handle Sequelize unique constraint error
  if (err instanceof UniqueConstraintError) {
    const fields = Object.keys(err.fields || {});
    return res.status(400).json({
      success: false,
      message: `${fields} already exists`,
    });
  }

  // Default handler
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = globalErrorHandler;