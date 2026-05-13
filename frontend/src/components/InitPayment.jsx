import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PaymentButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user] = useState(() => {
    const userId = localStorage.getItem("userId");
    const fullName = localStorage.getItem("fullName");
    const email = localStorage.getItem("email");

    if (!userId) {
      return null;
    }

    return {
      userId,
      fullName: fullName || "User",
      email: email || "user@example.com"
    };
  });

  // ✅ Fetch logged-in user details from localStorage
  useEffect(() => {
    if (!user) {
      // Redirect to login if no user is logged in
      navigate("/login");
    }
  }, [navigate, user]);

  const makePayment = async () => {
    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please login again.");
        navigate("/login");
        return;
      }

      // ✅ CREATE ORDER WITH JWT TOKEN
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // ✅ Send JWT token
        },
        body: JSON.stringify({
          amount: 1,
          courseId: "demo_course" // Include courseId
        }),
      });

      const data = await res.json();
      console.log("Order API response:", data);

      // ✅ Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        name: "Test App",
        description: "Test Payment",
        order_id: data.order.id,

        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },

        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi",
                    flows: ["collect"],
                  },
                ],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },

        // ✅ SUCCESS
        handler: async function (response) {
          console.log("Handler triggered", response);

          try {
            const token = localStorage.getItem("token");
            const verifyRes = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/verify-payment`,

              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}` // ✅ Send JWT token
                },
                body: JSON.stringify(response),
              }
            );

            const verifyData = await verifyRes.json();
            console.log("Verification response:", verifyData);

            if (verifyData.success) {
              navigate(`/success?paymentId=${response.razorpay_payment_id}`);
            } else {
              navigate("/failure");
            }
          } catch (error) {
            console.error("Verification error:", error);
            navigate("/failure");
          }
        },

        prefill: {
          name: user.fullName, // ✅ Use logged-in user's name
          email: user.email, // ✅ Use logged-in user's email
          contact: "9999999999",
        },

        modal: {
          ondismiss: function () {
            console.log("Payment popup closed");
            navigate("/failure");
          },
        },

        theme: {
          color: "#3399cc",
        },
      };

      // ✅ Razorpay instance
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.log("Payment Failed:", response);
        navigate("/failure");
      });

      rzp.open();

    } catch (error) {
      console.error("Payment error:", error);
      navigate("/failure");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  // ✅ FIXED JSX RETURN
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Payment Portal</h2>
        <p><strong>User:</strong> {user.fullName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <button 
          onClick={makePayment} 
          disabled={loading}
          style={{...styles.button, opacity: loading ? 0.6 : 1}}
        >
          {loading ? "Processing..." : "Pay ₹1"}
        </button>

        <button 
          onClick={() => navigate("/payments")}
          style={styles.ThirdButton}
        >
          View Payments
        </button>
        <button 
          onClick={() => navigate("/course")}
          style={styles.secondaryButton}
        >
          View Courses
        </button>
          
        <button 
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5"
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    maxWidth: "400px"
  },
  button: {
    padding: "12px 30px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
    marginRight: "10px",
    width: "100%"
  },
  secondaryButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
    width: "100%"
  },
  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
    width: "100%"
  },
   ThirdButton: {
    padding: "10px 20px",
    backgroundColor: "#ff0000",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
    width: "100%"
  },
};

export default PaymentButton;
