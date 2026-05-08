const Yard = require("../models/Yard");
const AppError = require("../utils/AppError");

const VALID_TYPES = ["MAIN", "SITE"];

/* ================================
   CREATE YARD
================================ */

async function createYard(payload) {
  let { name, type, projectCode } = payload;

  if (!name || !type) {
    throw new AppError(400, "name and type are required");
  }

  name = String(name).trim();
  type = String(type).trim().toUpperCase();

  if (!VALID_TYPES.includes(type)) {
    throw new AppError(400, "type must be MAIN or SITE");
  }

  if (type === "SITE") {
    if (!projectCode) {
      throw new AppError(400, "projectCode is required for SITE yards");
    }

    projectCode = String(projectCode).trim().toUpperCase();
  } else {
    projectCode = null;
  }

  const existing = await Yard.findOne(
    type === "SITE"
      ? { type, projectCode }
      : { type, nameLower: name.toLowerCase() }
  );

  if (existing) {
    throw new AppError(
      400,
      type === "SITE"
        ? "A SITE yard with this project code already exists"
        : "A MAIN yard with this name already exists"
    );
  }

  const code =
    type === "SITE"
      ? `${projectCode}_SITE`
      : name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");

  const yard = await Yard.create({
    name,
    code,
    type,
    projectCode,
  });

  return yard;
}

/* ================================
   GET YARDS
================================ */

async function getYards(filter = {}) {
  const query = {};

  if (filter._id) {
    query._id = filter._id;
  }

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

async function getYardById(yardId) {
  const yard = await Yard.findById(yardId);

  if (!yard) {
    throw new AppError(404, "Yard not found");
  }

  return yard;
}

/* ================================
   UPDATE YARD STATUS
================================ */

async function updateYardStatus(yardId, isActive) {
  if (typeof isActive !== "boolean") {
    throw new AppError(400, "isActive must be true or false");
  }

  const yard = await Yard.findById(yardId);

  if (!yard) {
    throw new AppError(404, "Yard not found");
  }

  yard.isActive = isActive;
  await yard.save();

  return yard;
}

/* ================================
   ADD YARD LOCATION
================================ */

async function addYardLocation(yardId, payload) {
  let { name, code } = payload;

  if (!name || !code) {
    throw new AppError(400, "Location name and code are required");
  }

  name = String(name).trim();

  code = String(code)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const yard = await Yard.findById(yardId);

  if (!yard) {
    throw new AppError(404, "Yard not found");
  }

  const exists = yard.locations.some(
    (location) => location.code.toUpperCase() === code
  );

  if (exists) {
    throw new AppError(400, "Location code already exists in this yard");
  }

  yard.locations.push({
    name,
    code,
    isActive: true,
  });

  await yard.save();

  return yard;
}

module.exports = {
  createYard,
  getYards,
  getYardById,
  updateYardStatus,
  addYardLocation,
};