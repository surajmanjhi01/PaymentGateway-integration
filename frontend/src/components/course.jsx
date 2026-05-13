import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PaymentButton from "./PaymentButton";

const sampleCourses = [
  {
    id: "course_1",
    title: "AI Engineer Agentic Track",
    author: "Ed Donner, Ligency",
    rating: "4.7",
    ratingsCount: "39,335",
    price: 1,
    bg: "linear-gradient(90deg,#ff7b7b,#ffd27b)"
  },
  {
    id: "course_2",
    title: "AI Engineer Core Track",
    author: "Ligency, Ed Donner",
    rating: "4.7",
    ratingsCount: "34,245",
    price: 1,
    bg: "linear-gradient(90deg,#ffb36b,#ffd67b)"
  },
  {
    id: "course_3",
    title: "100 Days of Code",
    author: "Dr. Angela Yu",
    rating: "4.7",
    ratingsCount: "422,564",
    price: 1,
    bg: "linear-gradient(90deg,#7bd1ff,#b88bff)"
  }
];

const Course = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);

  // ✅ Get logged-in user
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // ✅ Check course access per course
  const checkAccess = async (isRefetch = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    if (isRefetch) setRefetching(true);
    else setLoading(true);

    try {
      const newAccessMap = {};

      // Check all courses in parallel for speed
      const accessPromises = sampleCourses.map(course =>
        fetch(`http://localhost:5000/course?courseId=${course.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }).then(res => ({ courseId: course.id, hasAccess: res.ok }))
      );

      const results = await Promise.all(accessPromises);
      results.forEach(({ courseId, hasAccess }) => {
        newAccessMap[courseId] = hasAccess;
      });

      setAccessMap(newAccessMap);
    } catch (error) {
      console.error("Error checking access:", error);
    } finally {
      if (isRefetch) setRefetching(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [user]);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Courses</h1>
        <button 
          onClick={() => checkAccess(true)}
          disabled={refetching}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: refetching ? "not-allowed" : "pointer",
            opacity: refetching ? 0.6 : 1
          }}
        >
          {refetching ? "Refreshing..." : "🔄 Refresh Access"}
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          marginTop: 20
        }}
      >
        {sampleCourses.map((course) => (
          <div
            key={course.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
            }}
          >
            <div
              style={{
                height: 120,
                background: course.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "bold",
                textAlign: "center",
                padding: 10
              }}
            >
              {course.title}
            </div>

            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{course.author}</div>

              <div style={{ margin: "8px 0", fontSize: 14 }}>
                ⭐ {course.rating} ({course.ratingsCount})
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>₹{course.price}</strong>

                {accessMap[course.id] ? (
                  <button
                    onClick={() => navigate(`/course/${course.id}/content`)}
                    style={{
                      background: "green",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 5,
                      cursor: "pointer"
                    }}
                  >
                    Access Course
                  </button>
                ) : (
                  <PaymentButton
                    courseId={course.id}
                    amount={course.price}
                    userId={user?._id}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Course;