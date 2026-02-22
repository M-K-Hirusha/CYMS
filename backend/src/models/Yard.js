const mongoose = require("mongoose");

const YARD_TYPES = ["MAIN", "SITE"];

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

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

    //NEW: embedded locations
    locations: {
      type: [locationSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//Ensure each yard always has at least 1 location (default)
yardSchema.pre("validate", async function () {
  // Default locations if none provided
  if (!this.locations || this.locations.length === 0) {
    if (this.type === "MAIN") {
      this.locations = [{ name: "Main Store", code: "MAIN_STORE" }];
    } else if (this.type === "SITE") {
      this.locations = [{ name: "Site Store", code: "SITE_STORE" }];
    }
  }

  // Ensure unique codes inside the same yard
  const codes = this.locations.map((l) => l.code);
  if (codes.length !== new Set(codes).size) {
    throw new Error("Duplicate location codes in the same yard");
  }
});

yardSchema.index({ type: 1 });
yardSchema.index({ name: 1 });

module.exports = mongoose.models.Yard || mongoose.model("Yard", yardSchema);