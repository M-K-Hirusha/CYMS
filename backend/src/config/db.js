const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing. Check your .env file");
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
