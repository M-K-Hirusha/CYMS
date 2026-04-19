const app = require("./src/app");
const connectDB = require("./src/config/db");
const { PORT, NODE_ENV } = require("./src/config/env");

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (${NODE_ENV})`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message || err);
    process.exit(1);
  }
}

start();

// --- Graceful shutdown ---
function shutdown(signal) {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed.");
      process.exit(0);
    });

    // Force close if hanging after 10 seconds
    setTimeout(() => {
      console.error("Force shutdown (timeout).");
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Catch unhandled errors to prevent silent crashes
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});