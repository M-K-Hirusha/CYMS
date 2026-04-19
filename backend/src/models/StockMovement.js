const mongoose = require("mongoose");

const MOVEMENT_TYPES = ["RECEIVE", "ISSUE", "TRANSFER", "ADJUST", "MR_DISPATCH"];

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
  // RECEIVE
  if (this.type === "RECEIVE") {
    if (!this.toYard || !this.toLocationCode) {
      throw new Error("RECEIVE requires toYard and toLocationCode");
    }
  }

  // ISSUE
  if (this.type === "ISSUE") {
    if (!this.fromYard || !this.fromLocationCode) {
      throw new Error("ISSUE requires fromYard and fromLocationCode");
    }
  }

  // TRANSFER
  if (this.type === "TRANSFER") {
    if (!this.fromYard || !this.fromLocationCode || !this.toYard || !this.toLocationCode) {
      throw new Error(
        "TRANSFER requires fromYard/fromLocationCode and toYard/toLocationCode"
      );
    }
  }

  // ADJUST
  if (this.type === "ADJUST") {
    if (!this.toYard || !this.toLocationCode) {
      throw new Error("ADJUST requires toYard and toLocationCode");
    }
  }

  // MR_DISPATCH
  if (this.type === "MR_DISPATCH") {
    if (!this.fromYard || !this.fromLocationCode || !this.toYard || !this.toLocationCode) {
      throw new Error(
        "MR_DISPATCH requires fromYard/fromLocationCode and toYard/toLocationCode"
      );
    }
    if (!this.refId) {
      throw new Error("MR_DISPATCH requires refId (MR document reference)");
    }
  }
});

const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema);

module.exports = StockMovement;
// Export movement types for reuse in controllers/services
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;