const express = require("express");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const yardController = require("../controllers/yardController");

const router = express.Router();

// Create yard
router.post(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  yardController.createYard
);

// List yards
router.get(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  yardController.getYards
);

// Get single yard by ID
router.get(
  "/:id",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  yardController.getYardById
);

module.exports = router;