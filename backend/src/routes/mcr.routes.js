const express = require("express");
const router = express.Router();

const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const mcrController = require("../controllers/mcrController");

// Create MCR (SITE_ADMIN)
router.post(
  "/",
  protect,
  authorizeRoles("SITE_ADMIN"),
  mcrController.createMCR
);

// List MCRs (SITE_ADMIN sees own yard, HO/SYSTEM sees all)
router.get(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"),
  mcrController.listMCRs
);

// Get single MCR
router.get(
  "/:id",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"),
  mcrController.getMCRById
);

// Approve (HO)
router.post(
  "/:id/approve",
  protect,
  authorizeRoles("HEAD_OFFICE_ADMIN", "SYSTEM_ADMIN"),
  mcrController.approveMCR
);

// Reject (HO)
router.post(
  "/:id/reject",
  protect,
  authorizeRoles("HEAD_OFFICE_ADMIN", "SYSTEM_ADMIN"),
  mcrController.rejectMCR
);

module.exports = router;