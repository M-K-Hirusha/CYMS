const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/User");

const signToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      assignedYard: user.assignedYard ? user.assignedYard.toString() : null,
      managedMainYards: Array.isArray(user.managedMainYards)
        ? user.managedMainYards.map((id) => id.toString())
        : [],
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, role, assignedYard } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "fullName, email, password are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // Bootstrap rule:
    // If this is the first user in the system, allow SYSTEM_ADMIN creation.
   const userCount = await User.countDocuments();

    if (userCount > 0) {
    return res.status(403).json({
      message: "Public registration is disabled. Contact system administrator.",
    });
    }

    // Only first user allowed
    const finalRole = "SYSTEM_ADMIN";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
    fullName: fullName.trim(),
    email: cleanEmail,
    passwordHash,
    role: finalRole,
    assignedYard: null,
  });

    const token = signToken(user);

    return res.status(201).json({
      message: "Registered successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedYard: user.assignedYard ?? null,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Email already registered." });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail, isActive: true })
    .select("+passwordHash");
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    const token = signToken(user);

    return res.json({
    message: "Login successful.",
    token,
    user: {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    assignedYard: user.assignedYard ?? null,
  },
});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.getMe = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-passwordHash");
    if (!me) return res.status(404).json({ message: "User not found." });

    return res.json({
      user: {
        id: me._id,
        fullName: me.fullName,
        email: me.email,
        role: me.role,
        assignedYard: me.assignedYard ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

