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
    
    managedMainYards: {
      type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Yard",
      },
      ],
      default: [],
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
  const Yard = require("./Yard");

  // Helper: normalize managedMainYards to array
  const managed = Array.isArray(this.managedMainYards) ? this.managedMainYards : [];

  // SYSTEM_ADMIN: no yard assignments
  if (role === "SYSTEM_ADMIN") {
    if (this.assignedYard) throw new Error("SYSTEM_ADMIN must NOT have assignedYard");
    if (managed.length > 0) throw new Error("SYSTEM_ADMIN must NOT have managedMainYards");
    return;
  }

  // SITE roles: must be assigned to SITE, cannot manage MAIN yards
  if (role === "SITE_ADMIN" || role === "SITE_STAFF") {
    if (!this.assignedYard) throw new Error(`${role} must have assignedYard`);

    const yard = await Yard.findById(this.assignedYard).select("type");
    if (!yard) throw new Error("assignedYard not found");
    if (yard.type !== "SITE") throw new Error("assignedYard must be a SITE yard");

    if (managed.length > 0) throw new Error(`${role} cannot have managedMainYards`);
    return;
  }

  // HEAD_OFFICE_ADMIN: must be assigned to MAIN, may manage multiple MAIN yards
  if (role === "HEAD_OFFICE_ADMIN") {
    if (!this.assignedYard) {
      throw new Error("HEAD_OFFICE_ADMIN must have assignedYard (MAIN yard)");
    }

    const primary = await Yard.findById(this.assignedYard).select("type");
    if (!primary) throw new Error("assignedYard not found");
    if (primary.type !== "MAIN") throw new Error("HEAD_OFFICE_ADMIN assignedYard must be a MAIN yard");

    // Validate managed MAIN yards (all must exist + be MAIN)
    if (managed.length > 0) {
      const yards = await Yard.find({ _id: { $in: managed } }).select("type");

      if (yards.length !== managed.length) {
        throw new Error("One or more managedMainYards not found");
      }

      for (const y of yards) {
        if (y.type !== "MAIN") throw new Error("managedMainYards must only contain MAIN yards");
      }
    }

    return;
  }
});

/*
  STRICT ROLE-BASED VALIDATION
  Modern async style — NO next()
*/
userSchema.index(
  { assignedYard: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "SITE_ADMIN" },
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);