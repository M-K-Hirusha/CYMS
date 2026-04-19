const mongoose = require("mongoose");

const MR = require("../models/MR");
const Yard = require("../models/Yard");
const Counter = require("../models/Counter");
const StockMovement = require("../models/StockMovement");

const AppError = require("../utils/AppError");
const { increaseStock, decreaseStock } = require("./stock.service");

// For simplicity, using a single Counter collection for all sequences.
async function getNextCounter(name, session) {
  const doc = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc.seq;
}
// Helper to generate MR number like "MR-2024-0001"
function makeNumber(prefix, seq) {
  const year = new Date().getFullYear();
  const padded = String(seq).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
}
// Helper to normalize location codes
function normalizeLocation(code) {
  return String(code || "").trim().toUpperCase();
}
// Helper to ensure no duplicate materials in MR items
function ensureUniqueMaterials(items) {
  const set = new Set();
  for (const it of items) {
    const key = String(it.material);
    if (set.has(key)) {
      throw new AppError(400, "Duplicate material in MR items", "DUPLICATE_MR_ITEM");
    }
    set.add(key);
  }
}

// Core MR functions
async function createMR({ user, toLocationCode, items }) {
  if (!user?.assignedYard) {
    throw new AppError(400, "User has no assigned yard", "YARD_NOT_ASSIGNED");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, "MR must contain at least one item", "INVALID_ITEMS");
  }

  ensureUniqueMaterials(items);

  for (const it of items) {
    const qty = Number(it.requestedQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError(400, "requestedQty must be > 0", "INVALID_REQUESTED_QTY", {
        material: it.material,
      });
    }
  }
  // Normalize and validate toLocationCode
  const normalizedToLoc = normalizeLocation(toLocationCode);
  if (!normalizedToLoc) {
    throw new AppError(400, "toLocationCode is required", "MISSING_TO_LOCATION");
  }
  // Transactional creation to ensure data integrity
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    // Validate assigned yard and location
    const siteYard = await Yard.findById(user.assignedYard).session(session);
    if (!siteYard) {
      throw new AppError(400, "Assigned yard not found", "ASSIGNED_YARD_NOT_FOUND");
    }
    // Ensure the yard is a SITE yard and has the specified location active
    const locOk = siteYard.locations?.some(
      (l) => l.code === normalizedToLoc && l.isActive !== false
    );
    if (!locOk) {
      throw new AppError(
        400,
        "Invalid or inactive toLocationCode for this yard",
        "INVALID_TO_LOCATION"
      );
    }
    // Create MR
    const seq = await getNextCounter("MR", session);
    const mrNo = makeNumber("MR", seq);
    // Create MR document
    const mr = await MR.create(
      [
        {
          mrNo,
          siteYard: user.assignedYard,
          toLocationCode: normalizedToLoc,
          items: items.map((it) => ({
            material: it.material,
            requestedQty: Number(it.requestedQty),
            approvedQty: null,
          })),
          status: "PENDING",
          requestedBy: user.id,
          history: [{ action: "CREATED", by: user.id, note: null }],
        },
      ],
      { session }
    );
    // mr is an array due to create() with array input
    await session.commitTransaction();
    return mr[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
// Helper to get or create stock record
async function approveMR({ user, mrId, approvalLines, note, dispatchMainYardId }) {
  if (!Array.isArray(approvalLines) || approvalLines.length === 0) {
    throw new AppError(400, "approvalLines is required", "MISSING_APPROVAL_LINES");
  }
  // Transactional approval to ensure atomic stock updates
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    // Validate MR existence and status
    const mr = await MR.findById(mrId).session(session);
    if (!mr) throw new AppError(404, "MR not found", "MR_NOT_FOUND");

    if (mr.status !== "PENDING") {
      throw new AppError(400, "Only PENDING MR can be approved", "MR_NOT_PENDING");
    }

    if (!dispatchMainYardId) {
      throw new AppError(400, "dispatchMainYardId is required", "MISSING_DISPATCH_MAIN_YARD");
    }
    // Validate dispatch MAIN yard
    const mainYard = await Yard.findById(dispatchMainYardId).session(session);
    if (!mainYard) {
      throw new AppError(404, "Dispatch MAIN yard not found", "DISPATCH_MAIN_YARD_NOT_FOUND");
    }

    if (mainYard.type !== "MAIN") {
      throw new AppError(400, "dispatchMainYardId must be a MAIN yard", "INVALID_DISPATCH_MAIN_YARD");
    }
    // Validate that the MAIN yard has the necessary locations for the approval lines
    const mainLocCodes = new Set(
      (mainYard.locations || [])
        .filter((l) => l.isActive !== false)
        .map((l) => String(l.code).toUpperCase())
    );

    // HO admin scoping — managedMainYards is optional on User model.
    // Add managedMainYards: [ObjectId] to User schema and JWT payload
    // to enable multi-MAIN-yard support. Defaults safely to empty array.
    if (user.role === "HEAD_OFFICE_ADMIN") {
      const primary = String(user.assignedYard || "");
      const managed = Array.isArray(user.managedMainYards)
        ? user.managedMainYards.map((id) => String(id))
        : [];
      const allowed = new Set([primary, ...managed].filter(Boolean));// Ensure the dispatch MAIN yard is within the admin's allowed yards

      if (!allowed.has(String(mainYard._id))) {
        throw new AppError(
          403,
          "You are not allowed to dispatch from this MAIN yard",
          "MAIN_YARD_NOT_ALLOWED"
        );
      }
    }
    // Validate approval lines against MR items
    const lineMap = new Map();
    for (const l of approvalLines) {
      const matId = String(l.material);
      if (!matId) throw new AppError(400, "approvalLines.material required", "INVALID_APPROVAL_LINE");
      if (lineMap.has(matId)) throw new AppError(400, "Duplicate approval line material", "DUPLICATE_APPROVAL_LINE");
      lineMap.set(matId, l);
    }

    for (const item of mr.items) {
      const matId = String(item.material);
      if (!lineMap.has(matId)) {
        throw new AppError(
          400,
          "Missing approval line for one or more MR items",
          "MISSING_APPROVAL_FOR_ITEM",
          { material: matId }
        );
      }
    }
    // Validate each approval line and perform stock movements
    for (const item of mr.items) {
      const matId = String(item.material);
      const line = lineMap.get(matId);
      // Validate fromLocationCode
      const fromLoc = normalizeLocation(line.fromLocationCode);
      if (!fromLoc) {
        throw new AppError(
          400,
          "fromLocationCode is required for each item",
          "MISSING_FROM_LOCATION",
          { material: matId }
        );
      }

      if (!mainLocCodes.has(fromLoc)) {
        throw new AppError(
          400,
          "Invalid or inactive fromLocationCode for dispatch MAIN yard",
          "INVALID_FROM_LOCATION",
          { fromLocationCode: fromLoc }
        );
      }
      // Validate approvedQty
      const approvedQty = Number(line.approvedQty);
      if (!Number.isFinite(approvedQty) || approvedQty <= 0) {
        throw new AppError(400, "approvedQty must be > 0", "INVALID_APPROVED_QTY", {
          material: matId,
        });
      }

      if (approvedQty > item.requestedQty) {
        throw new AppError(
          400,
          "approvedQty cannot exceed requestedQty",
          "APPROVED_EXCEEDS_REQUESTED",
          { material: matId, requestedQty: item.requestedQty }
        );
      }
      // Perform stock movements
      await decreaseStock({
        yard: mainYard._id,
        locationCode: fromLoc,
        material: item.material,
        qty: approvedQty,
        session,
      });
      // For simplicity, we assume the toLocationCode in MR is the same for all items and valid as checked during MR creation.
      await increaseStock({
        yard: mr.siteYard,
        locationCode: mr.toLocationCode,
        material: item.material,
        qty: approvedQty,
        session,
      });
      // Record stock movement with reference to MR
      await StockMovement.create(
        [
          {
            type: "MR_DISPATCH",
            material: item.material,
            qty: approvedQty,
            fromYard: mainYard._id,
            fromLocationCode: fromLoc,
            toYard: mr.siteYard,
            toLocationCode: mr.toLocationCode,
            performedBy: user.id,
            refType: "MR",
            refId: mr._id,
            note: note || null,
          },
        ],
        { session }
      );

      item.approvedQty = approvedQty;// Update approvedQty in MR item
    }
    // Update MR status and approval info
    mr.status = "APPROVED";
    mr.approvedBy = user.id;
    mr.approvedAt = new Date();
    mr.rejectedReason = null;

    mr.history.push({
      action: "APPROVED",
      by: user.id,
      note: note || null,
      at: new Date(),
    });
    // Save all changes in transaction
    await mr.save({ session });
    await session.commitTransaction();
    return mr;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
// Helper to get or create stock record
async function rejectMR({ user, mrId, reason }) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    throw new AppError(400, "Reject reason is required", "REJECT_REASON_REQUIRED");
  }

  const mr = await MR.findById(mrId);
  if (!mr) throw new AppError(404, "MR not found", "MR_NOT_FOUND");

  if (mr.status !== "PENDING") {
    throw new AppError(400, "Only PENDING MR can be rejected", "MR_NOT_PENDING");
  }
  // Update MR status and rejection info
  mr.status = "REJECTED";
  mr.rejectedReason = cleanReason;
  mr.approvedBy = null;
  mr.approvedAt = null;

  mr.history.push({
    action: "REJECTED",
    by: user.id,
    note: cleanReason,
    at: new Date(),
  });

  await mr.save();
  return mr;
}
// List MRs with optional filtering based on user role and assigned yard
async function listMRs({ user }) {
  const role = user?.role;
  const yard = user?.assignedYard || null;

  let filter = {};

  if (role === "SITE_ADMIN" || role === "SITE_STAFF") {
    if (!yard) throw new AppError(400, "User has no assigned yard", "YARD_NOT_ASSIGNED");
    filter.siteYard = yard;
  }
  // For HEAD_OFFICE_ADMIN and others, we could implement additional filters if needed (e.g., by MAIN yard), but for now they see all MRs.
  const mrs = await MR.find(filter)
    .sort({ createdAt: -1 })
    .populate("siteYard", "name type")
    .populate("requestedBy", "fullName email role")
    .populate("approvedBy", "fullName email role")
    .populate("items.material", "code name unit");

  return mrs;
}
// Get MR by ID with access control
async function getMRById({ user, mrId }) {
  const role = user?.role;
  // For SITE_ADMIN and SITE_STAFF, ensure the MR belongs to their assigned yard
  const mr = await MR.findById(mrId)
    .populate("siteYard", "name type")
    .populate("requestedBy", "fullName email role")
    .populate("approvedBy", "fullName email role")
    .populate("items.material", "code name unit");

  if (!mr) throw new AppError(404, "MR not found", "MR_NOT_FOUND");// Access control: SITE_ADMIN and SITE_STAFF can only access MRs for their assigned yard

  if (role === "SITE_ADMIN" || role === "SITE_STAFF") {
    const myYard = user?.assignedYard?.toString();
    if (!myYard) throw new AppError(400, "User has no assigned yard", "YARD_NOT_ASSIGNED");
    // mr.siteYard can be populated (object) or just an ID (string), handle both cases
    const mrYardId = mr.siteYard?._id
      ? String(mr.siteYard._id)
      : String(mr.siteYard);

    if (mrYardId !== myYard) {
      throw new AppError(403, "Forbidden: MR not in your yard scope", "FORBIDDEN_SCOPE");
    }
  }

  return mr;
}

// Controller functions that call the service functions
module.exports = {
  createMR,
  approveMR,
  rejectMR,
  listMRs,
  getMRById,
};