const express = require("express");
const router = express.Router();

const {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} = require("../controllers/materialController");

const protect = require("../middleware/protect");
const authorizeRoles = require("../middleware/authorizeRoles");

// All routes are protected
router.use(protect);

// Create
router.post(
  "/",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  createMaterial
);

// Get all
router.get("/", getAllMaterials);

// Get single
router.get("/:id", getMaterialById);

// Update
router.put(
  "/:id",
  authorizeRoles("SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"),
  updateMaterial
);

// Delete
router.delete(
  "/:id",
  authorizeRoles("SYSTEM_ADMIN"),
  deleteMaterial
);

module.exports = router;