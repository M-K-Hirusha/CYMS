const mongoose = require("mongoose");

const YARD_TYPES = ["MAIN", "SITE"];

const yardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: YARD_TYPES,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

yardSchema.index({ type: 1 });
yardSchema.index({ name: 1 });

module.exports = mongoose.models.Yard || mongoose.model("Yard", yardSchema);