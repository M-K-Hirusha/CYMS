const mongoose = require("mongoose");
const Yard = require("../models/Yard");
const Material = require("../models/Material");
const Stock = require("../models/Stock");
const StockMovement = require("../models/StockMovement");

function isHeadOfficeOrSystem(user) {
  return (
    user.role === "SYSTEM_ADMIN" || user.role === "HEAD_OFFICE_ADMIN"
  );
}

// POST /api/inventory/receive
exports.receiveStock = async (req, res, next) => {
  if (!isHeadOfficeOrSystem(req.user)) {
    return res.status(403).json({
      message: "Forbidden: only SYSTEM_ADMIN or HEAD_OFFICE_ADMIN can receive stock",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { yardId, locationCode, materialId, qty, note } = req.body;

    if (!yardId || !locationCode || !materialId || qty === undefined) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "yardId, locationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    const yard = await Yard.findById(yardId).session(session);
    if (!yard) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Yard not found" });
    }

    const locationCodeNorm = String(locationCode).toUpperCase().trim();

    const loc = yard.locations?.find(
      (l) => l.code === locationCodeNorm && l.isActive !== false
    );

    if (!loc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Invalid or inactive locationCode for this yard",
      });
    }

    const material = await Material.findById(materialId).session(session);
    if (!material) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Material not found" });
    }

    if (material.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Material is inactive" });
    }

    const stock = await Stock.findOneAndUpdate(
      { yard: yardId, locationCode: locationCodeNorm, material: materialId },
      { $inc: { qtyOnHand: qtyNum } },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );

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

  try {
    await session.startTransaction();

    const { yardId, locationCode, materialId, qty, note } = req.body;

    if (!yardId || !locationCode || !materialId || qty === undefined) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "yardId, locationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    const yard = await Yard.findById(yardId).session(session);
    if (!yard) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Yard not found" });
    }

    const locationCodeNorm = String(locationCode).toUpperCase().trim();

    const loc = yard.locations?.find(
      (l) => l.code === locationCodeNorm && l.isActive !== false
    );

    if (!loc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Invalid or inactive locationCode for this yard",
      });
    }

    if (req.user.role === "SITE_ADMIN") {
      if (
        !req.user.assignedYard ||
        req.user.assignedYard.toString() !== yardId
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          message:
            "Forbidden: you can issue stock only from your assigned SITE yard",
        });
      }
    }

    const material = await Material.findById(materialId).session(session);
    if (!material) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Material not found" });
    }

    if (material.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Material is inactive" });
    }

    const stock = await Stock.findOne({
      yard: yardId,
      locationCode: locationCodeNorm,
      material: materialId,
    }).session(session);

    if (!stock) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "No stock available for this material at this location",
      });
    }

    if (stock.qtyOnHand < qtyNum) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Insufficient stock",
        available: stock.qtyOnHand,
        requested: qtyNum,
      });
    }

    stock.qtyOnHand -= qtyNum;
    await stock.save({ session });

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
  if (!isHeadOfficeOrSystem(req.user)) {
    return res.status(403).json({
      message:
        "Forbidden: only SYSTEM_ADMIN or HEAD_OFFICE_ADMIN can transfer stock",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const {
      fromYardId,
      fromLocationCode,
      toYardId,
      toLocationCode,
      materialId,
      qty,
      note,
    } = req.body;

    if (
      !fromYardId ||
      !fromLocationCode ||
      !toYardId ||
      !toLocationCode ||
      !materialId ||
      qty === undefined
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          "fromYardId, fromLocationCode, toYardId, toLocationCode, materialId, qty are required",
      });
    }

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "qty must be a number > 0" });
    }

    const fromLocCodeNorm = String(fromLocationCode).toUpperCase().trim();
    const toLocCodeNorm = String(toLocationCode).toUpperCase().trim();

    if (fromYardId === toYardId && fromLocCodeNorm === toLocCodeNorm) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "From and To locations cannot be the same",
      });
    }

    const fromYard = await Yard.findById(fromYardId).session(session);
    if (!fromYard) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "fromYard not found" });
    }

    const toYard = await Yard.findById(toYardId).session(session);
    if (!toYard) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "toYard not found" });
    }

    const fromLoc = fromYard.locations?.find(
      (l) => l.code === fromLocCodeNorm && l.isActive !== false
    );

    if (!fromLoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Invalid or inactive fromLocationCode for fromYard",
      });
    }

    const toLoc = toYard.locations?.find(
      (l) => l.code === toLocCodeNorm && l.isActive !== false
    );

    if (!toLoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Invalid or inactive toLocationCode for toYard",
      });
    }

    const material = await Material.findById(materialId).session(session);
    if (!material) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Material not found" });
    }

    if (material.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Material is inactive" });
    }

    const fromStock = await Stock.findOne({
      yard: fromYardId,
      locationCode: fromLocCodeNorm,
      material: materialId,
    }).session(session);

    if (!fromStock || fromStock.qtyOnHand < qtyNum) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Insufficient stock at source",
        available: fromStock ? fromStock.qtyOnHand : 0,
        requested: qtyNum,
      });
    }

    fromStock.qtyOnHand -= qtyNum;
    await fromStock.save({ session });

    const toStock = await Stock.findOneAndUpdate(
      { yard: toYardId, locationCode: toLocCodeNorm, material: materialId },
      { $inc: { qtyOnHand: qtyNum } },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );

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

    if (req.user.role === "SITE_ADMIN" || req.user.role === "SITE_STAFF") {
      if (
        !req.user.assignedYard ||
        req.user.assignedYard.toString() !== yardId
      ) {
        return res.status(403).json({
          message:
            "Forbidden: you can view stock only for your assigned SITE yard",
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