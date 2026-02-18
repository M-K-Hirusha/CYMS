const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");

const app = express();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("CYMS API is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CYMS API healthy" });
});

module.exports = app;
