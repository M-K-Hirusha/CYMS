const {
  NODE_ENV,
  CORS_ORIGINS,
  BODY_LIMIT,
  RATE_LIMIT_WINDOW_MIN,
  RATE_LIMIT_MAX,
} = require("./config/env");

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
const errorHandler = require("./middleware/errorHandler");
const mrRoutes = require("./routes/mr.routes");
const toolRoutes = require("./routes/tool.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();

/**
 * -------------------------
 * Security + Middleware
 * -------------------------
 */

// Secure headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  })
);

// Body limit
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// CORS allowlist
const allowedOrigins = (CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) {
        const isLocal = origin.startsWith("http://localhost:");
        return isLocal ? callback(null, true) : callback(new Error("CORS_NOT_CONFIGURED"));
      }

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("CORS_BLOCKED"));
    },
    credentials: true,
  })
);

// CORS error -> clean JSON response
app.use((err, req, res, next) => {
  if (err && (err.message === "CORS_BLOCKED" || err.message === "CORS_NOT_CONFIGURED")) {
    return res.status(403).json({ message: "CORS blocked: origin not allowed" });
  }
  next(err);
});

// Logging (disable in test)
if (NODE_ENV !== "test") {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
}

/**
 * -------------------------
 * Routes
 * -------------------------
 */

app.use("/api/auth", authRoutes);

// Disable test routes in production
if ((process.env.NODE_ENV || "development") !== "production") {
  app.use("/api/test", testRoutes);
}

app.use("/api/users", userRoutes);
app.use("/api/yards", yardRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/mcrs", mcrRoutes);
app.use("/api/mrs", mrRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/reports", reportRoutes);

// Root
app.get("/", (req, res) => {
  res.send("CYMS API is running");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// global error handler
app.use(errorHandler);

module.exports = app;