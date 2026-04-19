const mongoose = require("mongoose");

const TOOL_STATUS = ["AVAILABLE", "ISSUED", "MAINTENANCE", "RETIRED"];

const toolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Tool name cannot exceed 100 characters"],
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
    },

    currentYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      required: true,
    },

    currentLocationCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: TOOL_STATUS,
      default: "AVAILABLE",
    },

    currentHolder: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, "Holder name cannot exceed 100 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index for common query: tools in a yard by status
toolSchema.index({ currentYard: 1, status: 1 });

module.exports = mongoose.models.Tool || mongoose.model("Tool", toolSchema);
module.exports.TOOL_STATUS = TOOL_STATUS;