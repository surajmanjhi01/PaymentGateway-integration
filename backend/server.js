require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const path = require("path");

const connectDB = require("./Database/db");

const Payment = require("./schemas/PaymentSchema");
const User = require("./schemas/UserSchema");
const UserCourse = require("./schemas/userCourseSchema");

const authRoutes = require("./routes/routes");
const protectCourse = require("./middleware/authMiddleware");
app.use("/razorpay-webhook", express.raw({ type: "application/json" }));


// ======================
// MIDDLEWARE
// ======================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://payment-gateway-frontend-gray.vercel.app"
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls and tools without Origin header.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

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
// CREATE ORDER (Protected - requires JWT)
// ======================

app.post("/create-order", protectCourse, async (req, res) => {
  try {
    // userId is now from the authenticated user (req.user)
    const userId = req.user._id;
    const { amount, courseId } = req.body;

    if (!amount || !courseId) {
      return res.status(400).json({
        success: false,
        message: "amount and courseId required"
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
// VERIFY PAYMENT (Protected - requires JWT)
// ======================

app.post("/verify-payment", protectCourse, async (req, res) => {
  console.log("VERIFY API HIT");

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  // Validation
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing payment details"
    });
  }

  try {
    //  Verify Signature (Client integrity check)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Signature Mismatch - Possible tampering");
      return res.status(400).json({
        success: false,
        message: "Invalid signature - payment tampered"
      });
    }

    console.log("✅ Signature verified");

    // : Check if payment already processed (IDEMPOTENCY)
    const existingPayment = await Payment.findOne({
      paymentId: razorpay_payment_id
    });

    if (existingPayment) {
      console.log("⚠️  Payment already processed (idempotent)");
      return res.json({
        success: true,
        message: "Payment already verified",
        paymentId: razorpay_payment_id,
        alreadyProcessed: true
      });
    }

    //  Fetch payment & order details in PARALLEL (faster)
    let paymentDetails, order;
    try {
      [paymentDetails, order] = await Promise.all([
        razorpay.payments.fetch(razorpay_payment_id),
        razorpay.orders.fetch(razorpay_order_id)
      ]);
      console.log(" Payment & Order details fetched in parallel");
    } catch (error) {
      console.error("❌ Failed to fetch from Razorpay:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to verify with Razorpay. Please try again."
      });
    }

    //  Confirm payment status is "captured"
    if (paymentDetails.status !== "captured") {
      console.error(`❌ Payment status is "${paymentDetails.status}", not "captured"`);
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${paymentDetails.status}`
      });
    }

    //  Validate order amount matches payment amount
    if (order.amount !== paymentDetails.amount) {
      console.error(`❌ Amount mismatch - Order: ${order.amount}, Payment: ${paymentDetails.amount}`);
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match order amount"
      });
    }

    //  Validate order status
    if (order.status !== "paid") {
      console.error(`❌ Order status is "${order.status}", not "paid"`);
      return res.status(400).json({
        success: false,
        message: `Order not paid. Status: ${order.status}`
      });
    }

    // ✅ STEP 8: Extract user and course info
    const userId = req.user._id;
    const courseId = order.notes?.courseId;
    const user = req.user;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User authentication failed"
      });
    }

    //  Save payment to database (IDEMPOTENT - unique paymentId)
    const newPayment = new Payment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      status: "captured",
      amount: order.amount / 100, // Convert paise to rupees
      userId,
      userName: user.fullName,
      userEmail: user.email,
      razorpayDetails: {
        paymentStatus: paymentDetails.status,
        method: paymentDetails.method,
        email: paymentDetails.email,
        contact: paymentDetails.contact
      }
    });

    await newPayment.save();
    console.log("✅ Payment saved to database");

    // ✅ STEP 10: Grant course access (IDEMPOTENT - upsert)
    if (userId && courseId) {
      await UserCourse.updateOne(
        { userId, courseId },
        {
          $set: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            accessGrantedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log("✅ Course access granted");
    }

    return res.json({
      success: true,
      message: "Payment verified and access granted",
      paymentId: razorpay_payment_id,
      amount: order.amount / 100,
      courseId
    });

  } catch (error) {
    console.error("❌ Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
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
app.post("/razorpay-webhook", async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    // 🔐 Verify webhook signature
    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false });
    }

    const event = JSON.parse(req.body);

    console.log("Webhook Event:", event.event);

    //  Handle successful payment
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const orderId = payment.order_id;
      const paymentId = payment.id;

      //  Fetch order to get notes (userId, courseId)
      const order = await razorpay.orders.fetch(orderId);

      const { userId, courseId } = order.notes;

      // Prevent duplicate entries
      const existing = await Payment.findOne({ paymentId });

      if (!existing) {
        // Save payment
        await Payment.create({
          orderId,
          paymentId,
          status: "success",
          amount: payment.amount / 100,
          userId
        });

        // Grant course access
        await UserCourse.create({
          userId,
          courseId,
          paymentId,
          orderId
        });

        console.log("Payment & Access Stored");
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false });
  }
});


// ======================
// START SERVER
// ======================

// =============
// LIST PAYMENTS (Protected - requires JWT)
// =============

app.get("/payments", protectCourse, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.json({ success: true, payments });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


// Serve frontend build and enable SPA fallback in production
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(frontendDist));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// ======================
// LIST PAYMENTS (Protected - requires JWT)
// ======================


app.get("/payments", protectCourse, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.json({ success: true, payments });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});