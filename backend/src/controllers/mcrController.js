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
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { name, unit, description } = req.body;

    if (!name || !unit) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Name and unit are required." });
    }

    const normalizedName = String(name).trim();
    const normalizedUnit = String(unit).trim().toUpperCase();

    const userId = req.user.id;

    //  Prefer JWT yard (fast), fallback to DB if missing
    let assignedYard = req.user.assignedYard;

    if (!assignedYard) {
      const user = await mongoose.model("User").findById(userId).session(session);
      assignedYard = user?.assignedYard ? user.assignedYard.toString() : null;
    }

    if (!assignedYard) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "User must have assigned SITE yard." });
    }

    const yard = await Yard.findById(assignedYard).session(session);

    if (!yard || yard.type !== "SITE") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "MCR can only be created for SITE yard." });
    }

    //  ReDoS-safe exact match (case-insensitive)
    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const existingMaterial = await Material.findOne({
      name: new RegExp(`^${escapedName}$`, "i"),
      isActive: true,
    }).session(session);

    if (existingMaterial) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Material already exists." });
    }

    //  Counter increment inside transaction
    const mcrNo = await getNextNumber("MCR", session);

    const [mcr] = await MaterialCreationRequest.create(
      [
        {
          mcrNo,
          name: normalizedName,
          unit: normalizedUnit,
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
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(mcr);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/* --------------------------------
   List MCRs
----------------------------------*/
exports.listMCRs = async (req, res, next) => {
  try {
    const role = req.user.role;
    const filter = {};

    if (role === "SITE_ADMIN") {
      // Prefer JWT yard (fast), fallback to DB if missing
      let yardId = req.user.assignedYard;

      if (!yardId) {
        const user = await mongoose.model("User").findById(req.user.id);
        yardId = user?.assignedYard ? user.assignedYard.toString() : null;
      }

      if (!yardId) return res.status(400).json({ message: "User has no assigned yard." });

      filter.requestYard = yardId;
    }

    const mcrs = await MaterialCreationRequest.find(filter)
      .populate("requestYard", "name type")
      .populate("requestedBy", "fullName email")
      .populate("decidedBy", "fullName email")
      .sort({ createdAt: -1 });

    return res.json(mcrs);
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

    if (!mcr) return res.status(404).json({ message: "MCR not found." });

    // ✅ Hardened scope enforcement (no fragile equals + no extra DB call)
    if (req.user.role === "SITE_ADMIN") {
      const yardId = mcr.requestYard?._id
        ? mcr.requestYard._id.toString()
        : mcr.requestYard.toString();

      const myYardId = req.user.assignedYard ? req.user.assignedYard.toString() : null;

      if (!myYardId || yardId !== myYardId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    return res.json(mcr);
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
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "MCR not found or already processed." });
    }
    
    // Validate unit against allowed list (defense in depth)
    const normalizedUnit = String(mcr.unit || "").trim().toUpperCase();
    const allowedUnits = Material.UNITS || [];

    if (!allowedUnits.includes(normalizedUnit)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Invalid unit for Material creation.",
        errors: [`Unit must be one of: ${allowedUnits.join(", ")}`],
      });
    }

    // MAT counter in transaction
    const materialCode = await getNextNumber("MAT", session);

    const [material] = await Material.create(
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

    // Update MCR with decision
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

    if (!reason) return res.status(400).json({ message: "Rejection reason required." });

    const mcr = await MaterialCreationRequest.findOne({
      _id: req.params.id,
      status: "PENDING",
    });

    if (!mcr) return res.status(400).json({ message: "MCR not found or already processed." });

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

    return res.json({ message: "MCR rejected.", mcr });
  } catch (err) {
    next(err);
  }
};