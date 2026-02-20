const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");
const userRoutes = require("./routes/user.routes");
const yardRoutes = require("./routes/yard.routes");


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
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/yards", yardRoutes);


app.get("/", (req, res) => {
  res.send("CYMS API is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CYMS API healthy" });
});

// Global error handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

module.exports = app;
