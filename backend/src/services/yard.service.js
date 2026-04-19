const Yard = require("../models/Yard");
const AppError = require("../utils/AppError");

const VALID_TYPES = ["MAIN", "SITE"];

/**
 * Create Yard
 */
async function createYard(payload) {
  let { name, type, projectCode } = payload;

  if (!name || !type) {
    throw new AppError("name and type are required", 400);
  }

  type = String(type).trim().toUpperCase();

  if (!VALID_TYPES.includes(type)) {
    throw new AppError("type must be MAIN or SITE", 400);
  }

  if (type === "SITE" && !projectCode) {
    throw new AppError("projectCode is required for SITE yards", 400);
  }

  const yard = await Yard.create({
    ...payload,
    type,
  });

  return yard;
}

/**
 * Get Yards (with optional filters)
 */
async function getYards(filter = {}) {
  const query = {};

  if (filter.type) {
    const type = String(filter.type).toUpperCase();
    if (VALID_TYPES.includes(type)) {
      query.type = type;
    }
  }

  if (typeof filter.isActive !== "undefined") {
    query.isActive = filter.isActive === "true" || filter.isActive === true;
  }

  return Yard.find(query).sort({ createdAt: -1 });
}
/**
 * Get Yard by ID
 */
async function getYardById(yardId) {
  const yard = await Yard.findById(yardId);
  if (!yard) {
    throw new AppError(404, "Yard not found", "YARD_NOT_FOUND");
  }
  return yard;
}

module.exports = {
  createYard,
  getYards,
  getYardById,
};