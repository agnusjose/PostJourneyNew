import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Register() {
  const [step, setStep] = useState(1); // 1 = enter details, 2 = verify OTP
  const [user, setUser] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [previewUrl, setPreviewUrl] = useState(""); // Ethereal preview URL
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // Submit registration details
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/register", user);
      alert(res.data.message); // "OTP sent to email"

      // Capture Ethereal preview URL if returned by backend
      if (res.data.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      }

      setStep(2); // Move to OTP step
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  // Submit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/verify-otp", { email: user.email, otp });
      alert(res.data.message); // "User registered successfully"
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      {step === 1 && (
        <form
          onSubmit={handleRegister}
          className="bg-white p-8 rounded-2xl shadow-md w-96"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
          <input
            type="text"
            name="name"
            placeholder="Name"
            className="border p-2 w-full mb-4 rounded"
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="border p-2 w-full mb-4 rounded"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="border p-2 w-full mb-4 rounded"
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded w-full hover:bg-blue-700"
          >
            Register
          </button>

          {previewUrl && (
            <p className="mt-4 text-sm text-center text-gray-600">
              Preview OTP email here:{" "}
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {previewUrl}
              </a>
            </p>
          )}
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={handleVerifyOtp}
          className="bg-white p-8 rounded-2xl shadow-md w-96"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Verify OTP</h2>
          <p className="mb-4 text-center">
            We have sent an OTP to <strong>{user.email}</strong>
          </p>
          <input
            type="text"
            name="otp"
            placeholder="Enter OTP"
            className="border p-2 w-full mb-4 rounded text-center"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-green-600 text-white py-2 px-4 rounded w-full hover:bg-green-700"
          >
            Verify OTP
          </button>
        </form>
      )}
    </div>
  );
}

export default Register;