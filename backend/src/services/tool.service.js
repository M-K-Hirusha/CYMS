const mongoose = require("mongoose");

const Tool = require("../models/Tool");
const ToolMovement = require("../models/ToolMovement");
const Yard = require("../models/Yard");
const AppError = require("../utils/AppError");

/**
 * Normalize location codes to match Yard.locations.code convention.
 */
function normalizeLocation(code) {
  return String(code || "").trim().toUpperCase();
}

/**
 * Ensure a yard exists and that a locationCode exists and isActive !== false inside it.
 * Returns the yard doc + normalized code for reuse.
 */
async function ensureActiveLocation(yardId, locationCode, session) {
  const code = normalizeLocation(locationCode);

  const yard = await Yard.findById(yardId)
    .select("_id type name locations isActive")
    .session(session);

  if (!yard) throw new AppError(404, "Yard not found", "YARD_NOT_FOUND");
  if (yard.isActive === false)
    throw new AppError(400, "Yard is inactive", "YARD_INACTIVE");

  const loc = (yard.locations || []).find(
    (l) => l.code === code && l.isActive !== false
  );

  if (!loc) {
    throw new AppError(
      400,
      `Location code '${code}' not found or inactive in this yard`,
      "INVALID_LOCATION"
    );
  }

  return { yard, code };
}

/**
 * Scope enforcement rules (LOCKED):
 * - SYSTEM_ADMIN: all yards allowed
 * - HEAD_OFFICE_ADMIN: all yards allowed (per locked tool rules)
 * - SITE_ADMIN / SITE_STAFF:
 *    - can only operate when their assignedYard is involved (from or to)
 */
function assertScope(user, fromYardId, toYardId) {
  const role = user?.role;
  if (!role) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");

  if (role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN") return;

  const assigned = user.assignedYard ? String(user.assignedYard) : null;
  if (!assigned)
    throw new AppError(403, "User is not assigned to a yard", "YARD_NOT_ASSIGNED");

  const fromOk = fromYardId ? String(fromYardId) === assigned : false;
  const toOk = toYardId ? String(toYardId) === assigned : false;

  if (!fromOk && !toOk) {
    throw new AppError(403, "Forbidden: yard scope violation", "FORBIDDEN_SCOPE");
  }
}

/**
 * Build Mongo filter for listing tools based on role.
 * - SITE roles: only tools in assignedYard
 * - HO/SYSTEM: all tools
 */
function buildListScopeFilter(user) {
  const role = user?.role;

  if (role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN") return {};

  const assigned = user.assignedYard ? String(user.assignedYard) : null;
  if (!assigned)
    throw new AppError(403, "User is not assigned to a yard", "YARD_NOT_ASSIGNED");

  return { currentYard: assigned };
}

async function createTool(data, user) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const {
      name,
      code,
      description,
      currentYard,
      currentLocationCode,
      note,
    } = data;

    if (!name || !code || !currentYard || !currentLocationCode) {
      throw new AppError(
        400,
        "name, code, currentYard and currentLocationCode are required",
        "VALIDATION_ERROR"
      );
    }

    const { yard, code: normalizedLocation } =
      await ensureActiveLocation(currentYard, currentLocationCode, session);

    const existing = await Tool.findOne({
      code: code.toUpperCase(),
    }).session(session);

    if (existing) {
      throw new AppError(409, "Tool code already exists", "DUPLICATE_CODE");
    }

    const tool = await Tool.create(
      [
        {
          name,
          code,
          description: description || null,
          currentYard: yard._id,
          currentLocationCode: normalizedLocation,
          status: "AVAILABLE",
          currentHolder: null,
        },
      ],
      { session }
    );

    await ToolMovement.create(
      [
        {
          tool: tool[0]._id,
          type: "CREATE",
          toYard: yard._id,
          toLocationCode: normalizedLocation,
          performedBy: user.id, 
          note: note || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return tool[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// List tools with optional filters + pagination, scoped by user role
async function listTools(user, query = {}) {
  const scope = buildListScopeFilter(user);

  const filter = { ...scope };

  // optional filters
  if (query.status) filter.status = String(query.status).trim().toUpperCase();
  if (query.currentLocationCode)
    filter.currentLocationCode = normalizeLocation(query.currentLocationCode);
  if (query.currentYard) filter.currentYard = query.currentYard; // HO/SYSTEM only typically

  // simple search
  if (query.search) {
    const s = String(query.search).trim();
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { code: { $regex: s, $options: "i" } },
    ];
  }

  const limit = Math.min(Number(query.limit) || 50, 200);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Tool.find(filter)
    .populate("currentYard", "name code")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit),
    Tool.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getToolById(id, user) {
  const tool = await Tool.findById(id);
  if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");

  // enforce scope for site roles
  assertScope(user, tool.currentYard, tool.currentYard);

  return tool;
}

// Get movement history for a tool, with pagination
async function getMovements(toolId, user, query = {}) {
  const tool = await Tool.findById(toolId).select("_id currentYard");
  if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");

  assertScope(user, tool.currentYard, tool.currentYard);

  const limit = Math.min(Number(query.limit) || 50, 200);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = { tool: tool._id };

  const [items, total] = await Promise.all([
    ToolMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("tool", "name code status currentYard currentLocationCode currentHolder")
      .populate("fromYard", "name code type")
      .populate("toYard", "name code type")
      .populate("performedBy", "fullName role"),
    ToolMovement.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// Issue tool to a user (currentHolder = issuedTo, status = ISSUED)
async function issueTool(toolId, data, user) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { issuedTo, note } = data || {};
    if (!issuedTo || !String(issuedTo).trim()) {
      throw new AppError(400, "issuedTo is required", "VALIDATION_ERROR");
    }

    const tool = await Tool.findById(toolId).session(session);
    if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");
    if (tool.isActive === false)
      throw new AppError(400, "Tool is inactive", "TOOL_INACTIVE");

    // Scope: site roles can only act if their yard is involved
    assertScope(user, tool.currentYard, tool.currentYard);

    if (tool.status !== "AVAILABLE") {
      throw new AppError(
        400,
        "Tool must be AVAILABLE to issue",
        "TOOL_NOT_AVAILABLE"
      );
    }

    // Validate current location exists + active (defensive)
    const { yard, code: normalizedLocation } = await ensureActiveLocation(
      tool.currentYard,
      tool.currentLocationCode,
      session
    );

    tool.status = "ISSUED";
    tool.currentHolder = String(issuedTo).trim();
    await tool.save({ session });

    await ToolMovement.create(
      [
        {
          tool: tool._id,
          type: "ISSUE",
          fromYard: yard._id,
          fromLocationCode: normalizedLocation,
          issuedTo: tool.currentHolder,
          performedBy: user.id,
          note: note || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return tool;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Return tool to a location (can be same or different location, but must be in current yard)
async function returnTool(toolId, data, user) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { toLocationCode, note } = data || {};
    if (!toLocationCode) {
      throw new AppError(
        400,
        "toLocationCode is required",
        "VALIDATION_ERROR"
      );
    }

    const tool = await Tool.findById(toolId).session(session);
    if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");
    if (tool.isActive === false)
      throw new AppError(400, "Tool is inactive", "TOOL_INACTIVE");

    assertScope(user, tool.currentYard, tool.currentYard);

    if (tool.status !== "ISSUED") {
      throw new AppError(400, "Tool must be ISSUED to return", "TOOL_NOT_ISSUED");
    }

    const fromHolder = tool.currentHolder;

    // Validate return location exists + active
    const { yard, code: normalizedTo } = await ensureActiveLocation(
      tool.currentYard,
      toLocationCode,
      session
    );

    tool.status = "AVAILABLE";
    tool.currentHolder = null;
    tool.currentLocationCode = normalizedTo;
    await tool.save({ session });

    await ToolMovement.create(
      [
        {
          tool: tool._id,
          type: "RETURN",
          toYard: yard._id,
          toLocationCode: normalizedTo,
          issuedTo: fromHolder || null,
          performedBy: user.id,
          note: note || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return tool;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Transfer tool to another location (with same yard or different yard)
async function transferTool(toolId, data, user) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { toYard, toLocationCode, note } = data || {};

    if (!toYard || !toLocationCode) {
      throw new AppError(
        400,
        "toYard and toLocationCode are required",
        "VALIDATION_ERROR"
      );
    }

    const tool = await Tool.findById(toolId).session(session);
    if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");
    if (tool.isActive === false)
      throw new AppError(400, "Tool is inactive", "TOOL_INACTIVE");

    // Scope: site roles can only operate if their yard is involved (from or to)
    assertScope(user, tool.currentYard, toYard);

    // Only allow transfer when tool is not currently issued
    if (tool.status !== "AVAILABLE") {
      throw new AppError(
        400,
        "Tool must be AVAILABLE to transfer",
        "TOOL_NOT_AVAILABLE"
      );
    }

    // Validate FROM location exists and active (current yard)
    const { yard: fromYardDoc, code: fromLoc } = await ensureActiveLocation(
      tool.currentYard,
      tool.currentLocationCode,
      session
    );

    // Validate TO location exists and active (target yard)
    const { yard: toYardDoc, code: toLoc } = await ensureActiveLocation(
      toYard,
      toLocationCode,
      session
    );

    // If same yard+location, block no-op transfer
    if (
      String(fromYardDoc._id) === String(toYardDoc._id) &&
      fromLoc === toLoc
    ) {
      throw new AppError(400, "Transfer target is same as current", "NO_OP");
    }

    // Update tool location
    tool.currentYard = toYardDoc._id;
    tool.currentLocationCode = toLoc;
    tool.status = "AVAILABLE";
    tool.currentHolder = null;
    await tool.save({ session });

    // Audit movement
    await ToolMovement.create(
      [
        {
          tool: tool._id,
          type: "TRANSFER",
          fromYard: fromYardDoc._id,
          toYard: toYardDoc._id,
          fromLocationCode: fromLoc,
          toLocationCode: toLoc,
          performedBy: user.id, // who performed transfer
          note: note || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return tool;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Update tool status (MAINTENANCE / RETIRED)
async function updateToolStatus(toolId, data, user) {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { status, note } = data || {};

    if (!status) {
      throw new AppError(400, "status is required", "VALIDATION_ERROR");
    }

    const allowed = ["AVAILABLE", "MAINTENANCE", "RETIRED"];
    if (!allowed.includes(status)) {
      throw new AppError(400, "Invalid status", "INVALID_STATUS");
    }

    const tool = await Tool.findById(toolId).session(session);
    if (!tool) throw new AppError(404, "Tool not found", "TOOL_NOT_FOUND");

    if (tool.isActive === false) {
      throw new AppError(400, "Tool is inactive", "TOOL_INACTIVE");
    }

    // Scope check
    assertScope(user, tool.currentYard, tool.currentYard);

    // IMPORTANT RULE
    if (tool.status === "ISSUED") {
      throw new AppError(
        400,
        "Cannot change status while tool is issued",
        "INVALID_STATE"
      );
    }

    const previousStatus = tool.status;

    tool.status = status;
    await tool.save({ session });

    await ToolMovement.create(
      [
        {
          tool: tool._id,
          type: "STATUS_CHANGE",
          fromYard: tool.currentYard,
          toYard: tool.currentYard,
          fromLocationCode: tool.currentLocationCode,
          toLocationCode: tool.currentLocationCode,
          performedBy: user.id,
          note:
            note || `Status changed from ${previousStatus} → ${status}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return tool;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  normalizeLocation,
  ensureActiveLocation,
  assertScope,
  buildListScopeFilter,
  createTool,
  listTools,
  getToolById,
  getMovements,
  issueTool,
  returnTool,
  transferTool,
  updateToolStatus,
};