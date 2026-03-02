import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between">
      <h1 className="text-2xl font-bold">PostJourney</h1>
      <div className="space-x-4">
        <Link to="/" className="hover:text-gray-200">Home</Link>
        <Link to="/login" className="hover:text-gray-200">Login</Link>
        <Link to="/register" className="hover:text-gray-200">Register</Link>
        <Link to="/dashboard" className="hover:text-gray-200">Dashboard</Link>
      </div>
    </nav>
  );
}

export default Navbar;
