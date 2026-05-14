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
      select: false,
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

userSchema.pre("validate", async function () {
  const Yard = require("./Yard");
  const role = this.role;

  const managed = Array.isArray(this.managedMainYards)
    ? this.managedMainYards
    : [];

  if (role === "SYSTEM_ADMIN") {
    if (this.assignedYard) {
      throw new Error("SYSTEM_ADMIN must NOT have assignedYard");
    }

    if (managed.length > 0) {
      throw new Error("SYSTEM_ADMIN must NOT have managedMainYards");
    }

    return;
  }

  if (role === "SITE_ADMIN" || role === "SITE_STAFF") {
    if (!this.assignedYard) {
      if (managed.length > 0) {
        throw new Error(`${role} cannot have managedMainYards`);
      }

      return;
    }

    const yard = await Yard.findById(this.assignedYard).select("type isActive");

    if (!yard) {
      throw new Error("assignedYard not found");
    }

    if (yard.type !== "SITE") {
      throw new Error("assignedYard must be a SITE yard");
    }

    if (yard.isActive === false) {
      throw new Error("Cannot assign user to inactive SITE yard");
    }

    if (managed.length > 0) {
      throw new Error(`${role} cannot have managedMainYards`);
    }

    return;
  }

  if (role === "HEAD_OFFICE_ADMIN") {
    if (this.assignedYard) {
      throw new Error("HEAD_OFFICE_ADMIN must NOT have assignedYard");
    }

    if (managed.length > 0) {
      const yards = await Yard.find({ _id: { $in: managed } }).select(
        "type isActive"
      );

      if (yards.length !== managed.length) {
        throw new Error("One or more managedMainYards not found");
      }

      for (const yard of yards) {
        if (yard.type !== "MAIN") {
          throw new Error("managedMainYards must only contain MAIN yards");
        }

        if (yard.isActive === false) {
          throw new Error("managedMainYards must only contain active MAIN yards");
        }
      }
    }

    return;
  }
});

userSchema.index(
  { assignedYard: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "SITE_ADMIN",
      isActive: true,
    },
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);