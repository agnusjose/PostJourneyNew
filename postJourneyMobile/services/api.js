import axios from 'axios';

const API_URL = 'http://YOUR_BACKEND_IP:5000/api'; // replace with your backend URL

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, data, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.log('Register error:', error.response?.data || error.message);
    throw error;
  }
};

export const loginUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, data, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.log('Login error:', error.response?.data || error.message);
    throw error;
  }
};
