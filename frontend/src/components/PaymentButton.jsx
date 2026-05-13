import { useState } from "react";
import { useNavigate } from "react-router-dom";
function PaymentButton({ courseId, amount, userId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const fetchUserContact = async (currentUserId) => {
    const response = await fetch(`http://localhost:5000/user/${currentUserId}`);
    const data = await response.json();

    if (!response.ok || !data.success || !data.user) {
      throw new Error(data.message || "Unable to fetch user details");
    }

    return data.user.phoneNumber;
  };

  const makePayment = async () => {
    const fullName = localStorage.getItem("fullName") || "User";
    const email = localStorage.getItem("email") || "user@example.com";
    const currentUserId = userId || localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!currentUserId) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (!token) {
      alert("Authentication token not found. Please login again.");
      navigate("/login");
      return;
    }

    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded");
      return;
    }

    setLoading(true);

    try {
      const contact = await fetchUserContact(currentUserId);

      const res = await fetch("http://localhost:5000/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // ✅ Send JWT token
        },
        body: JSON.stringify({
          amount,
          courseId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        alert(data.message || "Unable to create order");
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Course Purchase",
        description: `Purchase ${courseId}`,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const token = localStorage.getItem("token");
            const verifyRes = await fetch("http://localhost:5000/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // ✅ Send JWT token
              },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              navigate(`/success?paymentId=${response.razorpay_payment_id}&courseId=${courseId}`);
              return;
            }

            alert(verifyData.message || "Payment verification failed");
            navigate("/failure");
          } catch (error) {
            console.error("Verification error:", error);
            alert("Payment done, but verification failed.");
            navigate("/failure");
          }
        },
        prefill: {
          name: fullName,
          email,
          contact,
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay popup closed");
          },
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        navigate("/failure");
      });

      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={makePayment}
      disabled={loading}
      style={{
        background: "#3b82f6",
        color: "#fff",
        border: "none",
        padding: "6px 10px",
        borderRadius: 5,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Processing..." : `Buy Now`}
    </button>
  );
}

export default PaymentButton;
