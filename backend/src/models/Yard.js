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
    // Unique code for the yard (e.g. "MAIN", "PROJECT_A_SITE")
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 30,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Normalized name (for MAIN uniqueness, case-insensitive)
    nameLower: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    type: {
      type: String,
      enum: YARD_TYPES,
      required: true,
    },

    // For SITE yards, this links to the project they belong to (e.g. "PROJECT_A")
    projectCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

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

// Ensure each yard always has at least 1 location (default)
// Validate rules
yardSchema.pre("validate", function () {
  // Normalize important fields
  if (this.code) this.code = this.code.trim().toUpperCase();
  if (this.projectCode) this.projectCode = this.projectCode.trim().toUpperCase();

  // Normalize name for MAIN uniqueness
  if (this.name) this.nameLower = this.name.trim().toLowerCase();

  // SITE yard must have projectCode (recommended business rule)
  if (this.type === "SITE" && !this.projectCode) {
    throw new Error("SITE yards must include projectCode");
  }

  // Default locations if none provided
  if (!this.locations || this.locations.length === 0) {
    if (this.type === "MAIN") {
      this.locations = [{ name: "Main Store", code: "MAIN_STORE" }];
    } else if (this.type === "SITE") {
      this.locations = [{ name: "Site Store", code: "SITE_STORE" }];
    }
  }

  // Ensure unique location codes inside the same yard
  const codes = this.locations.map((l) => l.code);
  if (codes.length !== new Set(codes).size) {
    throw new Error("Duplicate location codes in the same yard");
  }
});

// Indexes
yardSchema.index({ type: 1 });
yardSchema.index({ name: 1 });

// Hard-stop duplicates by code
yardSchema.index({ code: 1 }, { unique: true });

//  MAIN yard: unique by nameLower (case-insensitive)
yardSchema.index(
  { type: 1, nameLower: 1 },
  { unique: true, partialFilterExpression: { type: "MAIN" } }
);

// SITE yard: one SITE yard per project
yardSchema.index(
  { projectCode: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "SITE" } }
);

module.exports = mongoose.models.Yard || mongoose.model("Yard", yardSchema);