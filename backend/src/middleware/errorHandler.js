const { NODE_ENV } = require("../config/env");

module.exports = (err, req, res, next) => {
  const isProduction = NODE_ENV === "production";

  // Structured logging (no stack trace in prod logs)
  console.error({
    message: err.message,
    name: err.name,
    code: err.code,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
    // include requestId if you added it in app.js (safe even if undefined)
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });

  // Mongo / Mongoose duplicate key
if (err && err.code === 11000) {
  // Prefer keyPattern (tells which index fields failed)
  const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
  const keyValue = err.keyValue || {};

  // Prefer meaningful fields over generic "type"
  const preferredOrder = ["code", "nameLower", "projectCode", "email", "mcrNo", "mrNo"];

  const field =
    preferredOrder.find((k) => keys.includes(k)) ||
    keys.find((k) => k !== "type") || // skip "type" if it's a compound index
    Object.keys(keyValue)[0] ||
    keys[0] ||
    "field";

  // Friendly messages for common CYMS uniqueness rules
  let message = `Duplicate ${field}. A record with this ${field} already exists.`;

  if (field === "nameLower") {
    message = "Duplicate MAIN yard name. A MAIN yard with this name already exists.";
  } else if (field === "projectCode") {
    message = "Duplicate SITE projectCode. A SITE yard with this projectCode already exists.";
  } else if (field === "code") {
    message = "Duplicate yard code. A yard with this code already exists.";
  }

  return res.status(409).json({
    errorCode: "DUPLICATE_KEY",
    message,
    field,
    value: keyValue[field],
  });
}

  // Mongoose validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      errorCode: "VALIDATION_ERROR",
      message: messages[0] || "Validation error.",
      errors: messages,
    });
  }

  // Invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      errorCode: "INVALID_ID",
      message: "Invalid ID format.",
    });
  }

  // JWT errors (if ever thrown to global handler)
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      errorCode: "TOKEN_EXPIRED",
      message: "Token expired.",
    });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      errorCode: "INVALID_TOKEN",
      message: "Invalid token.",
    });
  }

  // Default safe response
  const status = err.statusCode || 500;

  return res.status(status).json({
    errorCode: 
              err.errorCode || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
    message:
      isProduction && status === 500
        ? "An unexpected error occurred."
        : err.message || "Server error.",
    // optional: attach requestId to help debugging
    details: err.details || undefined,
    requestId: req.id,
  });
};