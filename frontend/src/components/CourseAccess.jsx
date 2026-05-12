import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const CourseAccess = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const courseId = params.get("courseId");
  const paymentId = params.get("paymentId");

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      if (!storedUser?._id || !courseId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/course-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: storedUser._id,
            courseId,
          }),
        });

        const data = await response.json();
        setHasAccess(Boolean(data.success));
      } catch (error) {
        console.error("Access check error:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [courseId]);

  if (loading) {
    return <div style={{ padding: 24 }}>Checking course access...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", background: "white", borderRadius: 16, boxShadow: "0 10px 28px rgba(0,0,0,0.08)", padding: 28 }}>
        <h1 style={{ marginTop: 0 }}>{hasAccess ? "Course Access Granted" : "Course Access Denied"}</h1>
        <p>{hasAccess ? "Your payment is verified and the course is available." : "No access record was found for this course."}</p>

        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "#f1f5f9" }}>
          <div><strong>Course ID:</strong> {courseId || "Not available"}</div>
          <div style={{ marginTop: 8 }}><strong>Payment ID:</strong> {paymentId || "Not available"}</div>
        </div>

        {hasAccess ? (
          <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <h2 style={{ marginTop: 0 }}>Premium Content</h2>
            <p>This content is visible only after the payment has been verified and the access record exists.</p>
          </div>
        ) : (
          <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
            <p style={{ margin: 0 }}>Access is denied until the backend stores a matching UserCourse record.</p>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Link to="/course" style={{ display: "inline-block", padding: "10px 16px", borderRadius: 8, background: "#2563eb", color: "white", textDecoration: "none" }}>
            Back to Courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseAccess;
