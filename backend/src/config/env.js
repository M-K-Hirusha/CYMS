const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT || 5000);

// REQUIRED
const MONGO_URI = requireEnv("MONGO_URI");
const JWT_SECRET = requireEnv("JWT_SECRET");

// OPTIONAL / SECURITY TUNING
const CORS_ORIGINS = process.env.CORS_ORIGINS || "";
const BODY_LIMIT = process.env.BODY_LIMIT || "100kb";

const RATE_LIMIT_WINDOW_MIN = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);

module.exports = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET,

  CORS_ORIGINS,
  BODY_LIMIT,

  RATE_LIMIT_WINDOW_MIN,
  RATE_LIMIT_MAX,
};