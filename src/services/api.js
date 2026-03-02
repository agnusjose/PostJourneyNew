import axios from "axios";

// Backend URL
const api = axios.create({
  baseURL: "http://localhost:5000/api/auth",
  withCredentials: true, // required for cookies
});

export default api;
