const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided." });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user from DB
    const user = await User.findById(decoded.sub)
      .select("role assignedYard managedMainYards isActive");

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User account is disabled." });
    }

    req.user = {
      id: user._id,
      role: user.role,
      assignedYard: user.assignedYard,
      managedMainYards: user.managedMainYards || [],
    };

    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }

    return res.status(401).json({ message: "Authentication failed." });
  }
};