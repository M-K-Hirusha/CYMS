const express = require("express");
const router = express.Router();

const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");
const toolController = require("../controllers/toolController");

// all tool routes require auth
router.use(protect);

// create tool (HO / SYSTEM)
router.post(
  "/",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  toolController.createTool
);

// list tools (scoped in controller/service)
router.get(
  "/",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.listTools
);

// tool detail
router.get(
  "/:id",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.getToolById
);

// movements
router.get(
  "/:id/movements",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.getMovements
);

// issue / return / transfer
router.post(
  "/:id/issue",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.issueTool
);

router.post(
  "/:id/return",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.returnTool
);

router.post(
  "/:id/transfer",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  toolController.transferTool
);

module.exports = router;