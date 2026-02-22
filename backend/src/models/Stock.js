const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    yard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      required: true,
      index: true,
    },

    locationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    qtyOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "qtyOnHand cannot be negative"],
    },
  },
  { timestamps: true }
);

// One stock record per yard + location + material
stockSchema.index(
  { yard: 1, locationCode: 1, material: 1 },
  { unique: true }
);

module.exports = mongoose.models.Stock || mongoose.model("Stock", stockSchema);