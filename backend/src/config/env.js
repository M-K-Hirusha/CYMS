const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me",
  NODE_ENV: process.env.NODE_ENV || "development",
};
