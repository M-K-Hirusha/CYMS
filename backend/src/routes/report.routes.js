// src/routes/report.routes.js

const express = require("express");
const router = express.Router();

const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const reportController = require("../controllers/reportController");

// All reports require auth
router.use(protect);

// Access rule (initial): allow all roles, but later we will SCOPE results in service layer.
// If you want stricter route-level access, we can change later.
router.get(
  "/stock/summary",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  reportController.getStockSummary
);

router.get(
  "/tools/summary",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  reportController.getToolsSummary
);

router.get(
  "/mr/summary",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  reportController.getMRSummary
);

router.get(
  "/tools/movements",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  reportController.getToolMovements
);

module.exports = router;