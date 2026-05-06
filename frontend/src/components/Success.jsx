import React from "react";
import { useLocation } from "react-router-dom";

const Success = () => {
  const query = new URLSearchParams(useLocation().search);
  const paymentId = query.get("paymentId");

  return (
    <div>
      <h1>Payment Successful 🎉</h1>
      <p>Payment ID: {paymentId}</p>
    </div>
  );
};

export default Success;
