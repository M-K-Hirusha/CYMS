const mongoose = require("mongoose");

const ROLES = [
  "SYSTEM_ADMIN",
  "HEAD_OFFICE_ADMIN",
  "SITE_ADMIN",
  "SITE_STAFF",
];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, // ✅ hidden by default
    },

    role: {
      type: String,
      enum: ROLES,
      required: true,
    },

    assignedYard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Yard",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/*
  STRICT ROLE-BASED VALIDATION
  Modern async style — NO next()
*/
userSchema.pre("validate", async function () {
  const role = this.role;

  const needsYard = role === "SITE_ADMIN" || role === "SITE_STAFF";
  const mustBeNull = role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";

  // SITE roles must have yard
  if (needsYard && !this.assignedYard) {
    throw new Error(`${role} must have assignedYard`);
  }

  // Admin roles must NOT have yard
  if (mustBeNull && this.assignedYard) {
    throw new Error(`${role} must NOT have assignedYard`);
  }

  // If yard exists, ensure it is SITE type
  if (needsYard && this.assignedYard) {
    const Yard = require("./Yard");

    const yard = await Yard.findById(this.assignedYard).select("type");

    if (!yard) {
      throw new Error("assignedYard not found");
    }

    if (yard.type !== "SITE") {
      throw new Error("assignedYard must be a SITE yard");
    }
  }
});

/*
  ✅ BUSINESS RULE (DB LEVEL)
  Only ONE SITE_ADMIN per SITE yard
*/
userSchema.index(
  { assignedYard: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "SITE_ADMIN" },
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);