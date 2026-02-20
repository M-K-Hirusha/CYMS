// backend/src/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err);

  // Mongoose duplicate key error (unique index)
  if (err.code === 11000) {
    return res.status(409).json({
      message: "Duplicate value error. A record with this value already exists.",
    });
  }

  // Mongoose validation errors (schema validation)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: messages[0] || "Validation error.",
      errors: messages,
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format.",
    });
  }

  // Default
  return res.status(err.statusCode || 500).json({
    message: err.message || "Server error.",
  });
};