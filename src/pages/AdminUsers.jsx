import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/admin/users")
      .then((res) => setUsers(res.data.users || []))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin – User Management</h1>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        users.map((u) => (
          <div
            key={u._id}
            className="bg-white shadow p-4 rounded mb-3 border"
          >
            <p><strong>Name:</strong> {u.name}</p>
            <p><strong>Email:</strong> {u.email}</p>
            <p><strong>User Type:</strong> {u.userType}</p>
          </div>
        ))
      )}
    </div>
  );
}