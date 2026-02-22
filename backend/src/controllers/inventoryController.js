const mongoose = require("mongoose");
const Yard = require("../models/Yard");
const Material = require("../models/Material");
const Stock = require("../models/Stock");
const StockMovement = require("../models/StockMovement");

// POST /api/inventory/receive
exports.receiveStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { yardId, locationCode, materialId, qty, note } = req.body;

    if (!yardId || !locationCode || !materialId || qty === undefined) {
      return res.status(400).json({
        message: "yardId, locationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    // Load yard + validate
    const yard = await Yard.findById(yardId).session(session);
    if (!yard) return res.status(404).json({ message: "Yard not found" });

    const loc = yard.locations?.find(
      (l) => l.code === String(locationCode).toUpperCase() && l.isActive !== false
    );
    if (!loc) {
      return res.status(400).json({ message: "Invalid or inactive locationCode for this yard" });
    }

    // Scope enforcement for SITE_ADMIN
    if (req.user.role === "SITE_ADMIN") {
      if (!req.user.assignedYard || req.user.assignedYard.toString() !== yardId) {
        return res.status(403).json({ message: "Forbidden: you can receive stock only to your assigned SITE yard" });
      }
    }

    // Load material
    const material = await Material.findById(materialId).session(session);
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (material.isActive === false) {
      return res.status(400).json({ message: "Material is inactive" });
    }

    const locationCodeNorm = String(locationCode).toUpperCase().trim();

    // Upsert stock balance
    const stock = await Stock.findOneAndUpdate(
      { yard: yardId, locationCode: locationCodeNorm, material: materialId },
      { $inc: { qtyOnHand: qtyNum } },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );

    // Record movement
    const movement = await StockMovement.create(
      [
        {
          type: "RECEIVE",
          material: materialId,
          qty: qtyNum,
          toYard: yardId,
          toLocationCode: locationCodeNorm,
          note: note || null,
          performedBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Stock received successfully",
      stock,
      movement: movement[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
};

// POST /api/inventory/issue
exports.issueStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { yardId, locationCode, materialId, qty, note } = req.body;

    if (!yardId || !locationCode || !materialId || qty === undefined) {
      return res.status(400).json({
        message: "yardId, locationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    // Validate yard + location
    const yard = await Yard.findById(yardId).session(session);
    if (!yard) return res.status(404).json({ message: "Yard not found" });

    const locationCodeNorm = String(locationCode).toUpperCase().trim();
    const loc = yard.locations?.find(
      (l) => l.code === locationCodeNorm && l.isActive !== false
    );
    if (!loc) {
      return res
        .status(400)
        .json({ message: "Invalid or inactive locationCode for this yard" });
    }

    // Scope enforcement for SITE_ADMIN
    if (req.user.role === "SITE_ADMIN") {
      if (!req.user.assignedYard || req.user.assignedYard.toString() !== yardId) {
        return res.status(403).json({
          message: "Forbidden: you can issue stock only from your assigned SITE yard",
        });
      }
    }

    // Validate material
    const material = await Material.findById(materialId).session(session);
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (material.isActive === false) {
      return res.status(400).json({ message: "Material is inactive" });
    }

    // Find current stock (must exist and be enough)
    const stock = await Stock.findOne({
      yard: yardId,
      locationCode: locationCodeNorm,
      material: materialId,
    }).session(session);

    if (!stock) {
      return res.status(400).json({ message: "No stock available for this material at this location" });
    }

    if (stock.qtyOnHand < qtyNum) {
      return res.status(400).json({
        message: "Insufficient stock",
        available: stock.qtyOnHand,
        requested: qtyNum,
      });
    }

    // Decrease stock
    stock.qtyOnHand = stock.qtyOnHand - qtyNum;
    await stock.save({ session });

    // Record movement
    const movement = await StockMovement.create(
      [
        {
          type: "ISSUE",
          material: materialId,
          qty: qtyNum,
          fromYard: yardId,
          fromLocationCode: locationCodeNorm,
          note: note || null,
          performedBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Stock issued successfully",
      stock,
      movement: movement[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
};

// POST /api/inventory/transfer
exports.transferStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fromYardId,
      fromLocationCode,
      toYardId,
      toLocationCode,
      materialId,
      qty,
      note,
    } = req.body;

    // Basic validation
    if (
      !fromYardId ||
      !fromLocationCode ||
      !toYardId ||
      !toLocationCode ||
      !materialId ||
      qty === undefined
    ) {
      return res.status(400).json({
        message:
          "fromYardId, fromLocationCode, toYardId, toLocationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    if (fromYardId === toYardId && String(fromLocationCode).toUpperCase().trim() === String(toLocationCode).toUpperCase().trim()) {
      return res.status(400).json({ message: "From and To locations cannot be the same" });
    }

    // Load yards
    const fromYard = await Yard.findById(fromYardId).session(session);
    if (!fromYard) return res.status(404).json({ message: "fromYard not found" });

    const toYard = await Yard.findById(toYardId).session(session);
    if (!toYard) return res.status(404).json({ message: "toYard not found" });

    // Validate locations
    const fromLocCodeNorm = String(fromLocationCode).toUpperCase().trim();
    const toLocCodeNorm = String(toLocationCode).toUpperCase().trim();

    const fromLoc = fromYard.locations?.find(
      (l) => l.code === fromLocCodeNorm && l.isActive !== false
    );
    if (!fromLoc) {
      return res.status(400).json({
        message: "Invalid or inactive fromLocationCode for fromYard",
      });
    }

    const toLoc = toYard.locations?.find(
      (l) => l.code === toLocCodeNorm && l.isActive !== false
    );
    if (!toLoc) {
      return res.status(400).json({
        message: "Invalid or inactive toLocationCode for toYard",
      });
    }

    // Scope enforcement for SITE_ADMIN:
    // Allow transfers ONLY if fromYard is their assigned yard
    if (req.user.role === "SITE_ADMIN") {
      if (!req.user.assignedYard || req.user.assignedYard.toString() !== fromYardId) {
        return res.status(403).json({
          message:
            "Forbidden: SITE_ADMIN can transfer stock only FROM their assigned SITE yard",
        });
      }
    }

    // Validate material
    const material = await Material.findById(materialId).session(session);
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (material.isActive === false) {
      return res.status(400).json({ message: "Material is inactive" });
    }

    // Check source stock
    const fromStock = await Stock.findOne({
      yard: fromYardId,
      locationCode: fromLocCodeNorm,
      material: materialId,
    }).session(session);

    if (!fromStock || fromStock.qtyOnHand < qtyNum) {
      return res.status(400).json({
        message: "Insufficient stock at source",
        available: fromStock ? fromStock.qtyOnHand : 0,
        requested: qtyNum,
      });
    }

    // Decrease source
    fromStock.qtyOnHand -= qtyNum;
    await fromStock.save({ session });

    // Increase destination (upsert)
    const toStock = await Stock.findOneAndUpdate(
      { yard: toYardId, locationCode: toLocCodeNorm, material: materialId },
      { $inc: { qtyOnHand: qtyNum } },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );

    // Record movement (single)
    const movement = await StockMovement.create(
      [
        {
          type: "TRANSFER",
          material: materialId,
          qty: qtyNum,
          fromYard: fromYardId,
          fromLocationCode: fromLocCodeNorm,
          toYard: toYardId,
          toLocationCode: toLocCodeNorm,
          note: note || null,
          performedBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Stock transferred successfully",
      fromStock,
      toStock,
      movement: movement[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
};

// GET /api/inventory/stock?yardId=...&locationCode=...&materialId=...
exports.getStock = async (req, res, next) => {
  try {
    const { yardId, locationCode, materialId } = req.query;

    if (!yardId) {
      return res.status(400).json({ message: "yardId is required" });
    }

    // Scope enforcement for SITE roles
    if (req.user.role === "SITE_ADMIN" || req.user.role === "SITE_STAFF") {
      if (!req.user.assignedYard || req.user.assignedYard.toString() !== yardId) {
        return res.status(403).json({
          message: "Forbidden: you can view stock only for your assigned SITE yard",
        });
      }
    }

    const filter = { yard: yardId };

    if (locationCode) {
      filter.locationCode = String(locationCode).toUpperCase().trim();
    }

    if (materialId) {
      filter.material = materialId;
    }

    const stock = await Stock.find(filter)
      .populate("material", "name code unit category")
      .populate("yard", "name type")
      .sort({ updatedAt: -1 });

    return res.json({ stock });
  } catch (err) {
    return next(err);
  }
};