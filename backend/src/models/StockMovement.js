const mongoose = require("mongoose");

const MOVEMENT_TYPES = ["RECEIVE", "ISSUE", "TRANSFER", "ADJUST"];

const stockMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: MOVEMENT_TYPES,
      required: true,
      index: true,
    },

    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    qty: {
      type: Number,
      required: true,
      min: [0.000001, "qty must be greater than 0"],
    },

    // From (optional depending on type)
    fromYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      default: null,
      index: true,
    },
    fromLocationCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    // To (optional depending on type)
    toYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      default: null,
      index: true,
    },
    toLocationCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    // Who performed it
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link later to MR / Transfer doc etc.
    refType: {
      type: String,
      trim: true,
      default: null,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

// Validation rules per movement type
stockMovementSchema.pre("validate", function () {
  if (this.type === "RECEIVE") {
    if (!this.toYard || !this.toLocationCode) {
      throw new Error("RECEIVE requires toYard and toLocationCode");
    }
  }

  if (this.type === "ISSUE") {
    if (!this.fromYard || !this.fromLocationCode) {
      throw new Error("ISSUE requires fromYard and fromLocationCode");
    }
  }

  if (this.type === "TRANSFER") {
    if (!this.fromYard || !this.fromLocationCode || !this.toYard || !this.toLocationCode) {
      throw new Error("TRANSFER requires fromYard/fromLocationCode and toYard/toLocationCode");
    }
  }

  if (this.type === "ADJUST") {
    // adjustment can be + or - but we store qty positive and decide direction via note/refType later
    if (!this.toYard || !this.toLocationCode) {
      throw new Error("ADJUST requires toYard and toLocationCode");
    }
  }
});

module.exports =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema);

module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;