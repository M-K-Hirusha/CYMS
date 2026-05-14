const User = require("../models/User");
const Yard = require("../models/Yard");
const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = [
  "SYSTEM_ADMIN",
  "HEAD_OFFICE_ADMIN",
  "SITE_ADMIN",
  "SITE_STAFF",
];

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { fullName, email, password, role, assignedYard, managedMainYardIds } =
      req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        message: "fullName, email, password, and role are required",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    if (req.user.role === "HEAD_OFFICE_ADMIN" && role !== "SITE_STAFF") {
      return res.status(403).json({
        message: "HEAD_OFFICE_ADMIN can only create SITE_STAFF users.",
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const needsYard = role === "SITE_ADMIN" || role === "SITE_STAFF";

    if (needsYard && !assignedYard) {
      return res.status(400).json({
        message: "assignedYard is required for SITE_ADMIN and SITE_STAFF",
      });
    }

    if (assignedYard) {
      const yard = await Yard.findById(assignedYard);

      if (!yard) return res.status(404).json({ message: "Yard not found" });

      if (yard.type !== "SITE") {
        return res.status(400).json({
          message: "Users can only be assigned to SITE yards",
        });
      }

      if (yard.isActive === false) {
        return res.status(400).json({
          message: "Cannot assign inactive SITE yard",
        });
      }

      if (role === "SITE_ADMIN") {
        const existingAdmin = await User.findOne({
          role: "SITE_ADMIN",
          assignedYard,
          isActive: true,
        });

        if (existingAdmin) {
          return res.status(409).json({
            message: "This SITE yard already has a SITE_ADMIN",
          });
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      assignedYard: needsYard ? assignedYard : null,
      managedMainYards:
        role === "HEAD_OFFICE_ADMIN" ? managedMainYardIds || [] : [],
    });

    return res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select(
        "_id fullName email role assignedYard managedMainYards isActive createdAt"
      )
      .populate("assignedYard", "name type projectCode isActive")
      .populate("managedMainYards", "name type projectCode isActive")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (req.user?.id === user._id.toString() && role !== user.role) {
      return res.status(400).json({
        message: "You cannot change your own role.",
      });
    }

    user.role = role;
    await user.save();

    return res.json({
      message: "Role updated successfully.",
      user,
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/users/:userId/assign-yard
exports.assignUserToYard = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { yardId, managedMainYardIds } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // HEAD_OFFICE_ADMIN restriction
    if (req.user.role === "HEAD_OFFICE_ADMIN") {
      if (user.role !== "SITE_STAFF") {
        return res.status(403).json({
          message: "HEAD_OFFICE_ADMIN can only assign yards to SITE_STAFF users.",
        });
      }
    }

    // SITE USERS
    if (user.role === "SITE_ADMIN" || user.role === "SITE_STAFF") {
      // Remove SITE user yard assignment
      if (!yardId) {
        if (
          req.user.role !== "SYSTEM_ADMIN" &&
          !(req.user.role === "HEAD_OFFICE_ADMIN" && user.role === "SITE_STAFF")
        ) {
          return res.status(403).json({
            message: "You do not have permission to remove this yard assignment",
          });
        }

        user.assignedYard = null;
        user.managedMainYards = [];
        await user.save();

        return res.json({
          message: "SITE user yard assignment removed successfully",
          user,
        });
      }

      const yard = await Yard.findById(yardId);

      if (!yard) return res.status(404).json({ message: "Yard not found" });

      if (yard.type !== "SITE") {
        return res.status(400).json({
          message: "SITE users can only be assigned to SITE yards",
        });
      }

      if (yard.isActive === false) {
        return res.status(400).json({
          message: "Cannot assign inactive SITE yard",
        });
      }

      if (user.role === "SITE_ADMIN") {
        const existingAdmin = await User.findOne({
          _id: { $ne: user._id },
          role: "SITE_ADMIN",
          assignedYard: yardId,
          isActive: true,
        });

        if (existingAdmin) {
          return res.status(409).json({
            message: "This SITE yard already has a SITE_ADMIN",
          });
        }
      }

      user.assignedYard = yardId;
      user.managedMainYards = [];
      await user.save();

      return res.json({
        message: "User assigned successfully",
        user,
      });
    }

    // HEAD_OFFICE_ADMIN MAIN yard assignment
    if (user.role === "HEAD_OFFICE_ADMIN") {
      if (req.user.role !== "SYSTEM_ADMIN") {
        return res.status(403).json({
          message: "Only SYSTEM_ADMIN can assign MAIN yards",
        });
      }

      if (!Array.isArray(managedMainYardIds) || managedMainYardIds.length === 0) {
        return res.status(400).json({
          message: "managedMainYardIds is required",
        });
      }

      const yards = await Yard.find({
        _id: { $in: managedMainYardIds },
      }).select("type isActive");

      if (yards.length !== managedMainYardIds.length) {
        return res.status(400).json({
          message: "One or more MAIN yards not found",
        });
      }

      const invalid = yards.find(
        (y) => y.type !== "MAIN" || y.isActive === false
      );

      if (invalid) {
        return res.status(400).json({
          message: "All assigned yards must be ACTIVE MAIN yards",
        });
      }

      user.assignedYard = null;
      user.managedMainYards = managedMainYardIds;

      await user.save();

      return res.json({
        message: "HEAD_OFFICE_ADMIN MAIN yards updated successfully",
        user,
      });
    }

    return res.status(400).json({
      message: "Invalid role for yard assignment",
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/users/:id/status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (req.user?.id === user._id.toString()) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.json({
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user,
    });
  } catch (err) {
    return next(err);
  }
};