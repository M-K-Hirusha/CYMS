const mongoose = require("mongoose");

// Keep enums small + strict for Week 3.
// We can add more later without changing the DB structure.
const UNITS = [
  "PCS",   // pieces
  "KG",
  "G",
  "L",
  "ML",
  "M",
  "M2",
  "M3",
  "BAG",
  "BOX",
];

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Material name is required"],
      trim: true,
      minlength: [2, "Material name must be at least 2 characters"],
      maxlength: [80, "Material name must be at most 80 characters"],
    },

    code: {
      type: String,
      required: [true, "Material code is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Material code must be at least 2 characters"],
      maxlength: [30, "Material code must be at most 30 characters"],
    },

    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: {
        values: UNITS,
        message: "Invalid unit",
      },
    },

    category: {
      type: String,
      trim: true,
      default: null,
      maxlength: [40, "Category must be at most 40 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure code is unique (case-insensitive due to uppercase transform)
materialSchema.index({ code: 1 }, { unique: true });

// Optional: nicer API output (hide __v)
materialSchema.set("toJSON", {
  transform: function (_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Material", materialSchema);
module.exports.UNITS = UNITS;