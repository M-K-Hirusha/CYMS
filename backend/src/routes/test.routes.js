const express = require("express");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Any authenticated user
router.get("/auth", protect, (req, res) => {
  res.json({
    message: "Authenticated route",
    user: req.user,
  });
});

// SYSTEM_ADMIN only
router.get(
  "/system",
  protect,
  authorizeRoles("SYSTEM_ADMIN"),
  (req, res) => {
    res.json({
      message: "SYSTEM_ADMIN only route",
      user: req.user,
    });
  }
);

// HEAD_OFFICE_ADMIN only
router.get(
  "/ho",
  protect,
  authorizeRoles("HEAD_OFFICE_ADMIN"),
  (req, res) => {
    res.json({
      message: "HEAD_OFFICE_ADMIN only route",
      user: req.user,
    });
  }
);

// SITE roles
router.get(
  "/site",
  protect,
  authorizeRoles("SITE_ADMIN", "SITE_STAFF"),
  (req, res) => {
    res.json({
      message: "SITE role route",
      user: req.user,
    });
  }
);

module.exports = router;