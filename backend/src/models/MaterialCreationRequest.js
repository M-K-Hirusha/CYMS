const mongoose = require("mongoose");

const MCR_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // CREATE, APPROVE, REJECT
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    fromStatus: { type: String, default: "" },
    toStatus: { type: String, default: "" },
  },
  { _id: false }
);

// MCR = Material Creation Request
const materialCreationRequestSchema = new mongoose.Schema(
  {
    mcrNo: { type: String, unique: true, index: true },

    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true }, // "kg", "pcs", etc.
    description: { type: String, default: "", trim: true },

    requestYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: MCR_STATUSES,
      default: "PENDING",
      index: true,
    },

    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: "", trim: true },

    createdMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      default: null,
    },

    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaterialCreationRequest", materialCreationRequestSchema);