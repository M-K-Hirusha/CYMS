/**
 * Status: STABLE
 *
 * Endpoints:
 *  - GET /api/reports/stock/summary
 *  - GET /api/reports/tools/summary
 *  - GET /api/reports/mr/summary
 *  - GET /api/reports/tools/movements
 *
 * All endpoints:
 *  - Enforce RBAC
 *  - Enforce yard scoping
 *  - Production-safe
 */

const Tool = require("../models/Tool");
const MR = require("../models/MR");
const Stock = require("../models/Stock");
const ToolMovement = require("../models/ToolMovement");

const AppError = require("../utils/AppError");

/**
 * Returns a Mongo filter object to scope results based on role.
 * - SYSTEM_ADMIN + HEAD_OFFICE_ADMIN => no restriction (full)
 * - SITE_ADMIN + SITE_STAFF => restricted to assignedYard
 *
 * fieldName is the field used in the model/aggregation for yard reference:
 *   e.g. "yard" (Stock), "currentYard" (Tool), "toYard" (ToolMovement), etc.
 */
function buildYardScopeMatch(user, fieldName = "yard") {
  if (!user || !user.role) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }

  if (user.role === "SYSTEM_ADMIN" || user.role === "HEAD_OFFICE_ADMIN") {
    return {};
  }

  if (!user.assignedYard) {
    throw new AppError(400, "User has no assigned yard", "NO_ASSIGNED_YARD");
  }

  return { [fieldName]: user.assignedYard };
}

exports.stockSummary = async (user, query) => {
  const match = buildYardScopeMatch(user, "yard");

  if (query.locationCode) {
    match.locationCode = String(query.locationCode).trim().toUpperCase();
  }

  if (query.material) {
    match.material = query.material;
  }

  if (
    query.yardId &&
    (user.role === "SYSTEM_ADMIN" || user.role === "HEAD_OFFICE_ADMIN")
  ) {
    match.yard = query.yardId;
  }

  const rows = await Stock.aggregate([
    { $match: match },

    {
      $group: {
        _id: {
          yard: "$yard",
          locationCode: "$locationCode",
          material: "$material",
        },
        qtyOnHand: { $sum: "$qtyOnHand" },
      },
    },

    {
      $lookup: {
        from: "yards",
        localField: "_id.yard",
        foreignField: "_id",
        as: "yardDoc",
      },
    },
    {
      $unwind: {
        path: "$yardDoc",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "materials",
        localField: "_id.material",
        foreignField: "_id",
        as: "materialDoc",
      },
    },
    {
      $unwind: {
        path: "$materialDoc",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: {
          yard: {
            _id: "$yardDoc._id",
            name: "$yardDoc.name",
            code: "$yardDoc.code",
          },
          locationCode: "$_id.locationCode",
          material: {
            _id: "$materialDoc._id",
            name: "$materialDoc.name",
            code: "$materialDoc.code",
          },
        },
        qtyOnHand: 1,
      },
    },

    { $sort: { "_id.locationCode": 1 } },
  ]);

  const total = rows.reduce((sum, r) => sum + (r.qtyOnHand || 0), 0);

  return {
    total,
    count: rows.length,
    rows,
  };
};

exports.toolsSummary = async (user, query) => {
  const match = buildYardScopeMatch(user, "currentYard");

  match.isActive = { $ne: false };

  const rows = await Tool.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byStatus = {};
  let total = 0;

  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
  }

  return {
    total,
    byStatus,
    rows,
  };
};

exports.mrSummary = async (user, query) => {
  const match = buildYardScopeMatch(user, "siteYard");

  const rows = await MR.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  let total = 0;

  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
  }

  return {
    total,
    byStatus,
    rows,
  };
};

exports.toolMovements = async (user, query) => {
  if (!user || !user.role) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }

  const match = {};

  if (query.from) {
    const d = new Date(query.from);
    if (isNaN(d.getTime())) {
      throw new AppError(400, "Invalid 'from' date", "INVALID_FROM_DATE");
    }
    match.createdAt = match.createdAt || {};
    match.createdAt.$gte = d;
  }

  if (query.to) {
    const d = new Date(query.to);
    if (isNaN(d.getTime())) {
      throw new AppError(400, "Invalid 'to' date", "INVALID_TO_DATE");
    }
    d.setHours(23, 59, 59, 999);
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = d;
  }

  if (query.type) {
    match.type = String(query.type).trim().toUpperCase();
  }

  if (query.toolId) {
    match.tool = query.toolId;
  }

  const isFull =
    user.role === "SYSTEM_ADMIN" || user.role === "HEAD_OFFICE_ADMIN";

  if (isFull) {
    if (query.yardId) {
      match.$or = [{ fromYard: query.yardId }, { toYard: query.yardId }];
    }
  } else {
    if (!user.assignedYard) {
      throw new AppError(400, "User has no assigned yard", "NO_ASSIGNED_YARD");
    }

    match.$or = [
      { fromYard: user.assignedYard },
      { toYard: user.assignedYard },
    ];
  }

  const limit = Math.min(parseInt(query.limit || "50", 10), 200);
  const skip = Math.max(parseInt(query.skip || "0", 10), 0);

  const total = await ToolMovement.countDocuments(match);

  const rows = await ToolMovement.find(match)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "tool",
      select: "name code status currentYard currentLocationCode currentHolder",
      populate: {
        path: "currentYard",
        select: "name code",
      },
    })
    .populate("fromYard", "name code type")
    .populate("toYard", "name code type")
    .populate("performedBy", "fullName role")
    .lean();

  const cleanedRows = rows.map(({ __v, ...rest }) => rest);

  return {
    total,
    count: cleanedRows.length,
    limit,
    skip,
    hasMore: skip + cleanedRows.length < total,
    rows: cleanedRows,
  };
};

exports._buildYardScopeMatch = buildYardScopeMatch;