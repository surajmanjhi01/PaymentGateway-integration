import React from "react";
import { useNavigate } from "react-router-dom";

const Failure = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Payment Failed ❌</h1>
      <p>Something went wrong with your payment.</p>

      <button onClick={() => navigate("/")}>
        Retry Payment
      </button>
    </div>
  );
};

export default Failure;
