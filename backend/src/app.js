const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");
const userRoutes = require("./routes/user.routes");
const yardRoutes = require("./routes/yard.routes");
const materialRoutes = require("./routes/material.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const mcrRoutes = require("./routes/mcr.routes");
const errorHandler = require("./middleware/errorHandler"); // moved to top

const app = express();

/**
 * -------------------------
 * Security + Middleware
 * -------------------------
 */

// Secure headers
app.use(helmet());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body limit
app.use(express.json({ limit: "100kb" }));

// CORS allowlist
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) {
        return callback(new Error("CORS not configured"), false);
      }

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  })
);

// Logging (disable in test)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/**
 * -------------------------
 * Routes
 * -------------------------
 */

app.use("/api/auth", authRoutes);

// Disable test routes in production
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

app.use("/api/users", userRoutes);
app.use("/api/yards", yardRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/mcrs", mcrRoutes);

// Root
app.get("/", (req, res) => {
  res.send("CYMS API is running");
});

// Improved health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  });
});

/**
 * -------------------------
 * Global Error Handler
 * -------------------------
 */

app.use(errorHandler);

module.exports = app;