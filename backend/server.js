require("dotenv").config();

const express = require("express");
const app = express();
const Razorpay = require("razorpay");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./Database/db");
const Payment = require("./schemas/PaymentSchema");
const User = require("./schemas/UserSchema");
const authRoutes = require("./routes/routes");


app.use(cors({
  origin: "http://localhost:5173"
}));

console.log("MONGO URL:", process.env.MONGO_URL);

connectDB();   // ✅ MUST CALL

app.use(express.json());

// ✅ Authentication Routes
app.use("/auth", authRoutes);



const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



app.post("/create-order", async (req, res) => {
  try {
    console.log("Incoming body:", req.body); // 👈 add

    const { amount, userId } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "amount and userId required"
      });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
      notes: {
        userId: userId
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error); // 👈 IMPORTANT
    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
});



const crypto = require("crypto");

app.post("/verify-payment", async (req, res) => {
  console.log("VERIFY API HIT");
  console.log(req.body);

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  // ❌ Signature mismatch
  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid signature"
    });
  }

  try {
    // 🔒 STEP 5 — CHECK DUPLICATE BEFORE ANYTHING
    const existingPayment = await Payment.findOne({
      paymentId: razorpay_payment_id
    });

    if (existingPayment) {
      console.log("⚠️ Duplicate payment detected:", razorpay_payment_id);

      return res.json({
        success: true,
        message: "Payment already recorded"
      });
    }

    // ✅ Fetch order details from Razorpay
    const order = await razorpay.orders.fetch(razorpay_order_id);
    console.log("ORDER NOTES:", order.notes);

    // Try to resolve user details from notes.userId (preferred)
    let userName = "Unknown";
    let userEmail = "Unknown";
    let userRefId = null;
    const noteUserId = order.notes?.userId;
    if (noteUserId) {
      userRefId = noteUserId;
      try {
        const foundUser = await User.findById(noteUserId).select("fullName email name");
        if (foundUser) {
          userName = foundUser.fullName || foundUser.name || "Unknown";
          userEmail = foundUser.email || "Unknown";
        }
      } catch (e) {
        console.error("Error fetching user by note userId:", e);
      }
    }

    // ✅ Create new payment entry (attach userId if available)
    const newPayment = new Payment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      status: "success",
      amount: order.amount / 100 || 0,
      userId: userRefId,
      userName,
      userEmail
    });

    await newPayment.save();

    console.log("✅ Payment saved to DB:", newPayment);

    return res.json({
      success: true,
      message: "Payment verified and stored"
    });

  } catch (error) {
    console.error("DB Error:", error);

    return res.status(500).json({
      success: false,
      message: "Database error"
    });
  }
});

app.get("/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error("Fetch payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments"
    });
  }
});



app.post("/create-user", async (req, res) => {
  try {
    const { name, email } = req.body;

    // 🔍 Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // ✅ Create new user
      user = new User({
        name,
        email
      });

      await user.save();
    }

    res.json({
      success: true,
      userId: user._id
    });

  } catch (error) {
    console.error("User error:", error);
    res.status(500).json({
      success: false,
      message: "User creation failed"
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.listen(5000, () => {
  console.log(`Server started on port ${5000}`);
});
