const express = require("express");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const yardController = require("../controllers/yardController");

const router = express.Router();

// Only SYSTEM_ADMIN + HEAD_OFFICE_ADMIN can manage yards
router.post(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  yardController.createYard
);

router.get(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  yardController.getYards
);

module.exports = router;