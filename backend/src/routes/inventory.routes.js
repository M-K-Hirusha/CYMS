const express = require("express");
const router = express.Router();

const { receiveStock, issueStock, transferStock, getStock } = require("../controllers/inventoryController");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");

// all inventory routes require auth
router.use(protect);

// receive stock
router.post(
  "/receive",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"),
  receiveStock
);
// issue stock
router.post(
  "/issue",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"),
  issueStock
);
// transfer stock
router.post(
  "/transfer",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"),
  transferStock
);
// get stock levels
router.get(
  "/stock",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN", "SITE_STAFF"),
  getStock
);

module.exports = router;