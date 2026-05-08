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

    let yards;

    if (req.user.role === "SITE_ADMIN") {
      // Only return assigned yard
      yards = await yardService.getYards({
        ...filter,
        _id: req.user.assignedYard,
      });
    } else {
      yards = await yardService.getYards(filter);
    }

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

// Update yard active status
exports.updateYardStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const yard = await yardService.updateYardStatus(
      req.params.id,
      isActive
    );

    return res.json({
      message: yard.isActive
        ? "Yard activated successfully"
        : "Yard disabled successfully",
      yard,
    });
  } catch (err) {
    next(err);
  }
};

// Add location to yard
exports.addYardLocation = async (req, res, next) => {
  try {
    const yard = await yardService.addYardLocation(req.params.id, req.body);

    return res.status(201).json({
      message: "Location added successfully",
      yard,
    });
  } catch (err) {
    next(err);
  }
};