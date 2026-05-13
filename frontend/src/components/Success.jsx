import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Success = () => {
  const query = new URLSearchParams(useLocation().search);
  const paymentId = query.get("paymentId");
  const courseId = query.get("courseId");
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to courses page after 3 seconds
    const timer = setTimeout(() => {
      navigate("/course");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>✅ Payment Successful!</h1>
        <p style={styles.text}>Payment ID: <strong>{paymentId}</strong></p>
        {courseId && <p style={styles.text}>Course: <strong>{courseId}</strong></p>}
        <p style={styles.subtitle}>Redirecting to courses in 3 seconds...</p>
        
        <button 
          onClick={() => navigate("/course")}
          style={styles.button}
        >
          Go to Courses Now
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
    backgroundColor: "#f0f9ff"
  },
  card: {
    backgroundColor: "white",
    padding: "50px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    maxWidth: "500px"
  },
  title: {
    color: "#28a745",
    fontSize: "28px",
    marginBottom: "20px"
  },
  text: {
    fontSize: "16px",
    color: "#555",
    marginBottom: "15px"
  },
  subtitle: {
    fontSize: "14px",
    color: "#999",
    marginTop: "20px"
  },
  button: {
    padding: "12px 30px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px"
  }
};

export default Success;
