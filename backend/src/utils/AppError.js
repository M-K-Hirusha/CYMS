class AppError extends Error {
  constructor(statusCode, message, errorCode = "REQUEST_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

module.exports = AppError;