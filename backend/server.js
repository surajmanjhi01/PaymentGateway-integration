require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");

const connectDB = require("./Database/db");

const Payment = require("./schemas/PaymentSchema");
const User = require("./schemas/UserSchema");
const UserCourse = require("./schemas/userCourseSchema");

const authRoutes = require("./routes/routes");
const protectCourse = require("./middleware/authMiddleware");


// ======================
// MIDDLEWARE
// ======================

app.use(cors({
  origin: true
}));

app.use(express.json());


// ======================
// DATABASE
// ======================

connectDB();


// ======================
// RAZORPAY CONFIG
// ======================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// ======================
// CREATE ORDER
// ======================

app.post("/create-order", async (req, res) => {
  try {

    const { amount, userId, courseId } = req.body;

    if (!amount || !userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "amount, userId and courseId required"
      });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
      notes: {
        userId,
        courseId
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
});


// ======================
// VERIFY PAYMENT
// ======================

app.post("/verify-payment", async (req, res) => {
  console.log("VERIFY API HIT");

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  // 🔐 Verify Signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid signature"
    });
  }

  try {
    // Fetch order details
    const order = await razorpay.orders.fetch(razorpay_order_id);

    const userId = order.notes?.userId;
    const courseId = order.notes?.courseId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Order is missing userId"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const existingPayment = await Payment.findOne({
      paymentId: razorpay_payment_id
    });

    // Save Payment
    if (!existingPayment) {
      const newPayment = new Payment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: "success",
        amount: order.amount / 100,
        userId,
        userName: user.fullName,
        userEmail: user.email
      });

      await newPayment.save();
    }

    // 🔥 Grant Course Access
    if (userId && courseId) {

      await UserCourse.updateOne(
        { userId, courseId },
        {
          $set: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
          }
        },
        { upsert: true }
      );

      console.log("✅ Course Access Granted");
    }

    return res.json({
      success: true,
      message: "Payment verified and access granted"
    });

  } catch (error) {

    console.error("DB Error:", error);

    return res.status(500).json({
      success: false,
      message: "Database error"
    });
  }
});


// ======================
// CHECK COURSE ACCESS
// ======================

app.post("/course-access", async (req, res) => {

  const { userId, courseId } = req.body;

  const access = await UserCourse.findOne({
    userId,
    courseId
  });

  if (!access) {
    return res.json({
      success: false,
      message: "Payment required"
    });
  }

  res.json({
    success: true,
    message: "Access granted"
  });
});


// ======================
// PROTECTED COURSE ROUTE
// ======================

app.get("/course", protectCourse, async (req, res) => {
  const user = req.user;
  const courseId = req.query.courseId;

  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: "courseId required"
    });
  }

  const access = await UserCourse.findOne({
    userId: user._id,
    courseId
  });

  if (!access) {
    return res.status(403).json({
      success: false,
      message: "Course access required"
    });
  }

  return res.json({
    success: true,
    message: "Access granted",
    courseId,
    content: "Premium course content"
  });
});


// ======================
// USER ROUTES
// ======================

app.use("/auth", authRoutes);


// ======================
// GET USER
// ======================

app.get("/user/:id", async (req, res) => {
  try {

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


// ======================
// START SERVER
// ======================

app.listen(5000, () => {
  console.log("Server running on port 5000");
});


// ======================
// LIST PAYMENTS
// ======================

app.get("/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.json({ success: true, payments });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});