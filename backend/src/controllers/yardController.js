const yardService = require("../services/yard.service");

// Controller functions for Yard routes
exports.createYard = async (req, res, next) => {
  try {
    const yard = await yardService.createYard(req.body);
    return res.status(201).json({
      message: "Yard created successfully",
      yard,
    });
  } catch (err) {
    next(err);
  }
};

// Get all yards (with optional type filter)
exports.getYards = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (typeof isActive !== "undefined") filter.isActive = isActive;

    const yards = await yardService.getYards(filter);

    return res.json({ yards });
  } catch (err) {
    next(err);
  }
};

// Get yard by id
exports.getYardById = async (req, res, next) => {
  try {
    const yard = await yardService.getYardById(req.params.id);
    return res.json({ yard });
  } catch (err) {
    next(err);
  }
};