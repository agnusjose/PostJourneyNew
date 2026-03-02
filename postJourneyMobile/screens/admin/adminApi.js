const API = "http://localhost:5000/api/admin";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getAdminStats = async () =>
  fetch(`${API}/stats`, { headers: authHeader() }).then(r => r.json());

export const getUsers = async () =>
  fetch(`${API}/users`, { headers: authHeader() }).then(r => r.json());

export const updateUserStatus = async (id, isActive) =>
  fetch(`${API}/users/${id}/status`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });

export const verifyProvider = async (id, status) =>
  fetch(`${API}/providers/${id}/verify`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
