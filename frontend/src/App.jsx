import { BrowserRouter, Routes, Route } from "react-router-dom";
import Payements from "./components/Payements.jsx";
import PaymentButton from "./components/InitPayment.jsx";
import Success from "./components/Success.jsx";
import Failure from "./components/Failure.jsx";
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import Course from "./components/course.jsx";
import CourseAccess from "./components/CourseAccess.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/init" element={<PaymentButton />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/success" element={<Success />} />
        <Route path="/failure" element={<Failure />} />
        <Route path="/payments" element={<Payements />} />
        <Route path="/course" element={<Course />} />
        <Route path="/course-access" element={<CourseAccess />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

