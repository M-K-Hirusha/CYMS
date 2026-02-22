const express = require("express");
const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");

const {
  createUser,
  getUsers,
  updateUserRole,
  assignUserToYard,
} = require("../controllers/userController");

const router = express.Router();
// Only SYSTEM_ADMIN can create users
router.post(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  createUser
);

// Only SYSTEM_ADMIN and HEAD_OFFICE_ADMIN can view users
router.get(
  "/",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  getUsers
);

// Update role
router.patch(
  "/:id/role",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  updateUserRole
);

// Assign user to SITE yard
router.patch(
  "/:userId/assign-yard",
  protect,
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  assignUserToYard
);

module.exports = router;