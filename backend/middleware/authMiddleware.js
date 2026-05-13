const jwt = require("jsonwebtoken");
const User = require("../schemas/UserSchema");

// JWT Secret - should match routes.js
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

const protectCourse = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header. Use: Authorization: Bearer <token>"
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    // Fetch user from DB
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = protectCourse;