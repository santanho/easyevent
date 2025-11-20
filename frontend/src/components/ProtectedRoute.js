import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth(); // ดึง Token จาก Context

  if (!token) {
    // ถ้าไม่มี Token (ยังไม่ Login) ให้เด้งไปหน้า Login
    return <Navigate to="/" />;
  }

  return children; // ถ้ามี Token, แสดงหน้าที่ต้องการ
};

export default ProtectedRoute;