import React, { useEffect, useState } from "react";

const Payments = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/payments")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPayments(data.payments);
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Payment History 📊</h1>

      {payments.map((p) => (
        <div key={p._id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <p><b>Order ID:</b> {p.orderId}</p>
          <p><b>Payment ID:</b> {p.paymentId}</p>
          <p><b>Amount:</b> ₹{p.amount}</p>
          <p><b>Status:</b> {p.status}</p>
          <p><b>User:</b> {p.userName}</p>
          <p><b>Date:</b> {new Date(p.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default Payments;
