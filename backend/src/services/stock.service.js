const Stock = require("../models/Stock");
const AppError = require("../utils/AppError");

/**
 * Get stock record for yard + location + material.
 * If not exists and createIfMissing = true → create it.
 */
async function getOrCreateStock({
  yard,
  locationCode,
  material,
  session,
  createIfMissing = false,
}) {
  const normalizedLocation = locationCode.trim().toUpperCase();

  let stock = await Stock.findOne({
    yard,
    locationCode: normalizedLocation,
    material,
  }).session(session);

  if (!stock && createIfMissing) {
    stock = await Stock.create(
      [
        {
          yard,
          locationCode: normalizedLocation,
          material,
          qtyOnHand: 0,
        },
      ],
      { session }
    );
    stock = stock[0];
  }

  return stock;
}

/**
 * Increase stock
 */
async function increaseStock({
  yard,
  locationCode,
  material,
  qty,
  session,
}) {
  const stock = await getOrCreateStock({
    yard,
    locationCode,
    material,
    session,
    createIfMissing: true,
  });

  stock.qtyOnHand += qty;
  await stock.save({ session });

  return stock;
}

/**
 * Decrease stock (with insufficient check)
 */
async function decreaseStock({
  yard,
  locationCode,
  material,
  qty,
  session,
}) {
  const stock = await getOrCreateStock({
    yard,
    locationCode,
    material,
    session,
  });

  if (!stock) {
    throw new AppError(
      400,
      "Stock record not found in source location",
      "STOCK_NOT_FOUND"
    );
  }

  if (stock.qtyOnHand < qty) {
    throw new AppError(
      400,
      "Insufficient stock in source location",
      "INSUFFICIENT_STOCK",
      { available: stock.qtyOnHand }
    );
  }

  stock.qtyOnHand -= qty;
  await stock.save({ session });

  return stock;
}

module.exports = {
  getOrCreateStock,
  increaseStock,
  decreaseStock,
};