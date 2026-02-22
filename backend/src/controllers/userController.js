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
    const { yardId } = req.body;

    if (!yardId) {
      return res.status(400).json({ message: "yardId is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const yard = await Yard.findById(yardId);
    if (!yard) return res.status(404).json({ message: "Yard not found" });

    if (yard.type !== "SITE") {
      return res.status(400).json({
        message: "Users can only be assigned to SITE yards",
      });
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
        return res.status(409).json({
          message: "This SITE yard already has a SITE_ADMIN",
        });
      }
    }

    user.assignedYard = yardId;
    await user.save();

    return res.json({
      message: "User assigned successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};