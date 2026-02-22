const Yard = require("../models/Yard");

// POST /api/yards
exports.createYard = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "name and type are required" });
    }

    if (!["MAIN", "SITE"].includes(type)) {
      return res.status(400).json({ message: "type must be MAIN or SITE" });
    }

    // Default locations (consistent across system)
    const defaultLocations =
      type === "MAIN"
        ? [{ name: "Main Store", code: "MAIN_STORE", isActive: true }]
        : [{ name: "Site Store", code: "SITE_STORE", isActive: true }];

    const yard = await Yard.create({
      name,
      type,
      locations: defaultLocations,
    });

    return res.status(201).json({
      message: "Yard created successfully",
      yard,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/yards
exports.getYards = async (req, res) => {
  try {
    const yards = await Yard.find().sort({ createdAt: -1 });
    return res.json({ yards });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};