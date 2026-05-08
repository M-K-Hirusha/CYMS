const mongoose = require("mongoose");

const MR_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

const mrItemSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    requestedQty: {
      type: Number,
      required: true,
      min: [0.000001, "requestedQty must be greater than 0"],
    },

    // HO can edit during approval (<= requestedQty recommended)
    approvedQty: {
      type: Number,
      default: null,
      min: [0, "approvedQty cannot be negative"],
    },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // CREATED, APPROVED, REJECTED
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true, maxlength: 300, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const mrSchema = new mongoose.Schema(
  {
    mrNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    siteYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      required: true,
      index: true,
    },

    // SITE chooses receiving location at request creation
    toLocationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    items: {
      type: [mrItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "MR must contain at least one item",
      },
      required: true,
    },

    status: {
      type: String,
      enum: MR_STATUSES,
      default: "PENDING",
      index: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    history: {
      type: [historySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Basic sanity: approved quantities only allowed after approval
  mrSchema.pre("validate", function () {
  if (this.status === "PENDING") {
    // while pending, approvedQty should not be set
    const hasApproved = Array.isArray(this.items) && this.items.some((i) => i.approvedQty != null);
    if (hasApproved) {
      throw new Error("approvedQty cannot be set while MR is PENDING");
    }
  }
});

const MR = mongoose.models.MR || mongoose.model("MR", mrSchema);
module.exports = MR;
module.exports.MR_STATUSES = MR_STATUSES;