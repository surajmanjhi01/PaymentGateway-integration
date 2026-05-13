import { useState } from "react";
import { useNavigate } from "react-router-dom";
function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.clear();

        // Store JWT token and user info in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("fullName", data.fullName);
        localStorage.setItem("email", data.email);
        localStorage.setItem(
          "user",
          JSON.stringify({
            _id: data.userId,
            fullName: data.fullName,
            email: data.email,
          })
        );
        
        alert("Login successful!");
        navigate("/init");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter your email"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{...styles.button, opacity: loading ? 0.6 : 1}}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={styles.link}>
          Don't have an account? 
          <button 
            type="button"
            onClick={() => navigate("/register")}
            style={styles.linkButton}
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

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
    width: "100%",
    maxWidth: "400px"
  },
  title: {
    textAlign: "center",
    marginBottom: "30px",
    color: "#333"
  },
  form: {
    display: "flex",
    flexDirection: "column"
  },
  formGroup: {
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column"
  },
  label: {
    marginBottom: "8px",
    fontWeight: "500",
    color: "#555"
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit"
  },
  button: {
    padding: "12px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s"
  },
  error: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "12px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid #f5c6cb"
  },
  link: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#666"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    marginLeft: "5px",
    textDecoration: "underline",
    fontSize: "14px"
  }
};

export default Login;
