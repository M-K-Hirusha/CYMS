const express = require("express");
const router = express.Router();

const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const mrController = require("../controllers/mrcontroller");

// Create MR (SITE_ADMIN only for now)
router.post(
  "/",
  protect,
  authorizeRoles("SITE_ADMIN", "SITE_STAFF"),
  mrController.createMR
);

// List MRs
router.get(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  mrController.listMRs
);

// Get single MR
router.get(
  "/:id",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  mrController.getMRById
);

// Approve MR (HO / SYSTEM)
router.post(
  "/:id/approve",
  protect,
  authorizeRoles("HEAD_OFFICE_ADMIN", "SYSTEM_ADMIN"),
  mrController.approveMR
);

// Reject MR (HO / SYSTEM)
router.post(
  "/:id/reject",
  protect,
  authorizeRoles("HEAD_OFFICE_ADMIN", "SYSTEM_ADMIN"),
  mrController.rejectMR
);

module.exports = router;