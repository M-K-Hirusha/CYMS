const User = require("../models/User");
const Yard = require("../models/Yard");

const ALLOWED_ROLES = [
  "SYSTEM_ADMIN",
  "HEAD_OFFICE_ADMIN",
  "SITE_ADMIN",
  "SITE_STAFF",
];

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