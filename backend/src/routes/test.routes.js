const express = require("express");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Any logged-in user
router.get("/staff", protect, (req, res) => {
  res.json({
    message: "Staff route - any authenticated user",
    user: req.user,
  });
});

// ADMIN or MANAGER
router.get(
  "/manager",
  protect,
  authorizeRoles("ADMIN", "MANAGER"),
  (req, res) => {
    res.json({
      message: "Manager route - ADMIN or MANAGER only",
      user: req.user,
    });
  }
);

// ADMIN only
router.get(
  "/admin",
  protect,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      message: "Admin route - ADMIN only",
      user: req.user,
    });
  }
);

module.exports = router;
