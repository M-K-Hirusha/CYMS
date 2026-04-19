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
    const { fullName, email, password, role, assignedYard } = req.body;

    // basic validation
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

    // Restrict HEAD_OFFICE_ADMIN privileges
    if (req.user.role === "HEAD_OFFICE_ADMIN") {
    // HO can only create SITE_STAFF
    if (role !== "SITE_STAFF") {
    return res.status(403).json({
      message: "HEAD_OFFICE_ADMIN can only create SITE_STAFF users.",
    });
    }
    }

    // prevent duplicates
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // If role needs yard, enforce it now (your User schema also enforces, but we give a clean message)
    const needsYard = role === "SITE_ADMIN" || role === "SITE_STAFF";
    if (needsYard && !assignedYard) {
      return res.status(400).json({
        message: "assignedYard is required for SITE_ADMIN and SITE_STAFF",
      });
    }

    // If assignedYard given, validate it is SITE
    if (assignedYard) {
      const yard = await Yard.findById(assignedYard);
      if (!yard) return res.status(404).json({ message: "Yard not found" });

      if (yard.type !== "SITE") {
        return res
          .status(400)
          .json({ message: "Users can only be assigned to SITE yards" });
      }

      // Only one SITE_ADMIN per SITE yard
      if (role === "SITE_ADMIN") {
        const existingAdmin = await User.findOne({
          role: "SITE_ADMIN",
          assignedYard,
          isActive: true,
        });

        if (existingAdmin) {
          return res
            .status(409)
            .json({ message: "This SITE yard already has a SITE_ADMIN" });
        }
      }
    }

    // hash password -> passwordHash (matches your User model field)
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      assignedYard: assignedYard || null,
    });

    return res.status(201).json({
      message: "User created successfully.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedYard: user.assignedYard,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

// GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("_id fullName email role assignedYard isActive createdAt")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (err) {
    console.error(err);
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
    if (!user) return res.status(404).json({ message: "User not found." });

    if (req.user?.id === user._id.toString() && role !== user.role) {
      return res.status(400).json({
        message: "You cannot change your own role.",
      });
    }

    user.role = role;
    await user.save(); // schema validation will enforce yard rules

    return res.json({
      message: "Role updated successfully.",
      user,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

// PATCH /api/users/:userId/assign-yard
exports.assignUserToYard = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // For SITE users (existing)
    const { yardId } = req.body;

    // For HO admin (new - Option 2A)
    const { assignedYardId, managedMainYardIds } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // -----------------------------
    // RBAC: Restrict HO powers
    // -----------------------------
    if (req.user.role === "HEAD_OFFICE_ADMIN") {
      // HO can only assign yards to SITE roles (same as your current rule)
      if (!["SITE_ADMIN", "SITE_STAFF"].includes(user.role)) {
        return res.status(403).json({
          message: "HEAD_OFFICE_ADMIN can only assign yards to SITE_ADMIN or SITE_STAFF.",
        });
      }
    }

    // -----------------------------
    // CASE A: Assign SITE roles to SITE yard (existing behavior)
    // -----------------------------
    if (user.role === "SITE_ADMIN" || user.role === "SITE_STAFF") {
      if (!yardId) {
        return res.status(400).json({ message: "yardId is required" });
      }

      const yard = await Yard.findById(yardId);
      if (!yard) return res.status(404).json({ message: "Yard not found" });

      if (yard.type !== "SITE") {
        return res.status(400).json({ message: "SITE_ADMIN/SITE_STAFF can only be assigned to SITE yards" });
      }

      // Only one SITE_ADMIN per SITE yard
      if (user.role === "SITE_ADMIN") {
        const existingAdmin = await User.findOne({
          _id: { $ne: user._id },
          role: "SITE_ADMIN",
          assignedYard: yardId,
          isActive: true,
        });

        if (existingAdmin) {
          return res.status(409).json({ message: "This SITE yard already has a SITE_ADMIN" });
        }
      }

      user.assignedYard = yardId;
      user.managedMainYards = []; // keep clean for SITE users
      await user.save();

      return res.json({ message: "User assigned successfully", user });
    }

    // -----------------------------
    // CASE B: Assign HO admin to MAIN yard(s) (Option 2A)
    // Only SYSTEM_ADMIN should do this
    // -----------------------------
    if (user.role === "HEAD_OFFICE_ADMIN") {
      if (req.user.role !== "SYSTEM_ADMIN") {
        return res.status(403).json({ message: "Only SYSTEM_ADMIN can assign MAIN yards to HEAD_OFFICE_ADMIN" });
      }

      if (!assignedYardId) {
        return res.status(400).json({ message: "assignedYardId is required for HEAD_OFFICE_ADMIN" });
      }

      const primary = await Yard.findById(assignedYardId);
      if (!primary) return res.status(404).json({ message: "Primary MAIN yard not found" });
      if (primary.type !== "MAIN") {
        return res.status(400).json({ message: "assignedYardId must be a MAIN yard" });
      }

      // Validate managedMainYardIds (optional)
      let managedIds = [];
      if (Array.isArray(managedMainYardIds) && managedMainYardIds.length > 0) {
        const yards = await Yard.find({ _id: { $in: managedMainYardIds } }).select("type");
        if (yards.length !== managedMainYardIds.length) {
          return res.status(400).json({ message: "One or more managedMainYardIds not found" });
        }
        const bad = yards.find((y) => y.type !== "MAIN");
        if (bad) {
          return res.status(400).json({ message: "managedMainYardIds must contain only MAIN yards" });
        }
        managedIds = managedMainYardIds;
      }

      user.assignedYard = assignedYardId;
      user.managedMainYards = managedIds;
      await user.save();

      return res.json({ message: "HEAD_OFFICE_ADMIN MAIN yards updated successfully", user });
    }

    // -----------------------------
    // Other roles not supported here
    // -----------------------------
    return res.status(400).json({ message: "This endpoint does not support yard assignment for this role" });
  } catch (err) {
    return next(err);
  }
};