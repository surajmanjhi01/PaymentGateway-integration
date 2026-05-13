const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../schemas/UserSchema");
const router = express.Router();

// JWT Secret - should be in .env
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

// ✅ Register Route
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber } = req.body;

    // Validation
    if (!fullName || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber
    });

    await newUser.save();
    res.status(201).json({ 
      message: "User registered successfully",
      userId: newUser._id 
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ 
      message: "Login successful",
      token,
      userId: user._id,
      fullName: user.fullName,
      email: user.email
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
