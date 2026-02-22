const Material = require("../models/Material");

// @desc    Create new material
// @route   POST /api/materials
// @access  SYSTEM_ADMIN, HEAD_OFFICE_ADMIN
exports.createMaterial = async (req, res, next) => {
  try {
    const { name, code, unit, category } = req.body;

    const material = await Material.create({
      name,
      code,
      unit,
      category,
    });

    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all materials
// @route   GET /api/materials
// @access  Protected (All roles)
exports.getAllMaterials = async (req, res, next) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });

    res.json(materials);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Protected
exports.getMaterialById = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  SYSTEM_ADMIN, HEAD_OFFICE_ADMIN
exports.updateMaterial = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    material.name = req.body.name ?? material.name;
    material.code = req.body.code ?? material.code;
    material.unit = req.body.unit ?? material.unit;
    material.category = req.body.category ?? material.category;
    material.isActive = req.body.isActive ?? material.isActive;

    await material.save();

    res.json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  SYSTEM_ADMIN
exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    await material.deleteOne();

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    next(error);
  }
};