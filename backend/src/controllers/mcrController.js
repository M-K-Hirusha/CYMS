const mongoose = require("mongoose");
const MaterialCreationRequest = require("../models/MaterialCreationRequest");
const Material = require("../models/Material");
const Yard = require("../models/Yard");
const Counter = require("../models/Counter");

/* -------------------------------
   Helper: Auto Number Generator
--------------------------------*/
async function getNextNumber(name, session) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const year = new Date().getFullYear();
  const padded = String(counter.seq).padStart(4, "0");
  return `${name}-${year}-${padded}`;
}

/* --------------------------------
   Create MCR (SITE_ADMIN)
----------------------------------*/
exports.createMCR = async (req, res, next) => {
  try {
    const { name, unit, description } = req.body;

    if (!name || !unit) {
    return res.status(400).json({ message: "Name and unit are required." });
    }

    // ✅ Normalize unit to uppercase early
    const normalizedUnit = String(unit).trim().toUpperCase();

    // Get SITE_ADMIN yard
    const userId = req.user.id;

    const user = await mongoose.model("User").findById(userId);

    if (!user || !user.assignedYard) {
      return res.status(400).json({ message: "User must have assigned SITE yard." });
    }

    const yard = await Yard.findById(user.assignedYard);

    if (!yard || yard.type !== "SITE") {
      return res.status(400).json({ message: "MCR can only be created for SITE yard." });
    }

    // Prevent duplicate active material
    const existingMaterial = await Material.findOne({
      name: new RegExp(`^${name}$`, "i"),
      isActive: true,
    });

    if (existingMaterial) {
      return res.status(400).json({ message: "Material already exists." });
    }

    const mcrNo = await getNextNumber("MCR");

    const mcr = await MaterialCreationRequest.create({
      mcrNo,
      name,
      unit, normalizedUnit,
      description,
      requestYard: yard._id,
      requestedBy: userId,
      history: [
        {
          action: "CREATE",
          by: userId,
          fromStatus: "",
          toStatus: "PENDING",
        },
      ],
    });

    res.status(201).json(mcr);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------
   List MCRs
----------------------------------*/
exports.listMCRs = async (req, res, next) => {
  try {
    const role = req.user.role;

    let filter = {};

    if (role === "SITE_ADMIN") {
      const user = await mongoose.model("User").findById(req.user.id);
      filter.requestYard = user.assignedYard;
    }

    const mcrs = await MaterialCreationRequest.find(filter)
      .populate("requestYard", "name type")
      .populate("requestedBy", "fullName email")
      .populate("decidedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.json(mcrs);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------
   Get MCR by ID
----------------------------------*/
exports.getMCRById = async (req, res, next) => {
  try {
    const mcr = await MaterialCreationRequest.findById(req.params.id)
      .populate("requestYard")
      .populate("requestedBy", "fullName email")
      .populate("decidedBy", "fullName email")
      .populate("createdMaterialId");

    if (!mcr) {
      return res.status(404).json({ message: "MCR not found." });
    }

    // Scope enforcement
    if (req.user.role === "SITE_ADMIN") {
      const user = await mongoose.model("User").findById(req.user.id);
      if (!mcr.requestYard.equals(user.assignedYard)) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    res.json(mcr);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------
   Approve MCR (HO)
----------------------------------*/
exports.approveMCR = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const mcr = await MaterialCreationRequest.findOne({
      _id: req.params.id,
      status: "PENDING",
    }).session(session);

    if (!mcr) {
      return res.status(400).json({ message: "MCR not found or already processed." });
    }

    // ✅ Normalize + validate unit against Material schema enum
    const normalizedUnit = String(mcr.unit || "").trim().toUpperCase();
    const allowedUnits = Material.UNITS || [];

    if (!allowedUnits.includes(normalizedUnit)) {
      return res.status(400).json({
        message: "Invalid unit for Material creation.",
        errors: [`Unit must be one of: ${allowedUnits.join(", ")}`],
      });
    }

    // ✅ Generate material code using Counter (MAT-2026-0001)
    const materialCode = await getNextNumber("MAT", session);

    // ✅ Create Material inside transaction
    const created = await Material.create(
      [
        {
          name: mcr.name,
          code: materialCode,
          unit: normalizedUnit,
          category: null,
          isActive: true,
        },
      ],
      { session }
    );

    const material = created[0];

    // ✅ Update MCR
    mcr.status = "APPROVED";
    mcr.decidedBy = req.user.id;
    mcr.decidedAt = new Date();
    mcr.createdMaterialId = material._id;

    mcr.history.push({
      action: "APPROVE",
      by: req.user.id,
      fromStatus: "PENDING",
      toStatus: "APPROVED",
      note: `Created Material ${material.code}`,
    });

    await mcr.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: "MCR approved and material created.",
      material,
      mcr,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
/* --------------------------------
   Reject MCR (HO)
----------------------------------*/
exports.rejectMCR = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Rejection reason required." });
    }

    const mcr = await MaterialCreationRequest.findOne({
      _id: req.params.id,
      status: "PENDING",
    });

    if (!mcr) {
      return res.status(400).json({ message: "MCR not found or already processed." });
    }

    mcr.status = "REJECTED";
    mcr.decidedBy = req.user.id;
    mcr.decidedAt = new Date();
    mcr.decisionNote = reason;

    mcr.history.push({
      action: "REJECT",
      by: req.user.id,
      fromStatus: "PENDING",
      toStatus: "REJECTED",
      note: reason,
    });

    await mcr.save();

    res.json({ message: "MCR rejected.", mcr });
  } catch (err) {
    next(err);
  }
};