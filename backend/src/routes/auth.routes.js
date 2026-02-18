const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Register
router.post("/register", register);

// Login (with debug)
router.post(
  "/login",
  (req, res, next) => {
    console.log("✅ LOGIN HIT:", req.body);
    next();
  },
  login
);

module.exports = router;
