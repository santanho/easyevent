import axios from 'axios';

// URL ของ Backend API (ที่เรารันไว้ใน Port 5000)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
});

// (การตั้งค่า Header ถูกย้ายไปทำใน AuthContext.js ตอน Login)

export default api;