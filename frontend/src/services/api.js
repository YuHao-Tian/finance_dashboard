// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Replace with your actual backend URL

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include credentials with each request (necessary for session-based auth)
});

// Add a request interceptor if needed, but for session-based auth, this is typically not required
// unless you are using an additional authentication token along with the session.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Only needed if you are using a token along with the session
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// User Authentication
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (data) => api.post('/auth/register', data);

// Fetch User Data
export const getUserData = () => api.get('/user/profile');

// Fetch Stock Transactions
export const getStockTransactions = () => api.get('/transactions');
// Fetch User Shareholding
export const getUserShareholding = () => api.get('/shareholding');

// Add other API calls as needed

export default api;
