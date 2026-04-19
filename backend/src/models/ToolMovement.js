const mongoose = require("mongoose");

const MOVEMENT_TYPES = [
  "CREATE",
  "ISSUE",
  "RETURN",
  "TRANSFER",
  "STATUS_CHANGE",
];

const toolMovementSchema = new mongoose.Schema(
  {
    tool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tool",
      required: true,
    },

    type: {
      type: String,
      enum: MOVEMENT_TYPES,
      required: true,
    },

    fromYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      default: null,
    },

    toYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      default: null,
    },

    fromLocationCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },

    toLocationCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },

    // Who received the tool (free text — not required to be a system User)
    issuedTo: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, "Issued to cannot exceed 100 characters"],
    },

    // Who performed the action (must be a system User)
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
      default: null,
    },
  },
  { timestamps: true }
);

toolMovementSchema.index({ tool: 1, createdAt: -1 });
toolMovementSchema.index({ type: 1 });

module.exports =
  mongoose.models.ToolMovement ||
  mongoose.model("ToolMovement", toolMovementSchema);

module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;