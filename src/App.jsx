import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";

// ✅ IMPORTANT: web version of service provider dashboard
import ServiceProviderDashboard from "./pages/ServiceProviderDashboard";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/service-provider"
              element={<ServiceProviderDashboard />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
