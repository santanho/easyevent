import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. ตอนเปิดเว็บ (Refresh): พยายามกู้คืน User ทั้งก้อนจาก localStorage (รวม _id)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('userInfo'); // ⭐️ อ่านข้อมูล user ทั้งก้อน
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  // 2. ตั้งค่า Header ของ axios เมื่อ Token เปลี่ยน
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // 3. ฟังก์ชัน Login (ที่คุณถามถึง)
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      
      // ⭐️ สร้าง Object ข้อมูลที่จะเก็บ (ต้องมี _id และ lineUserId)
      const userData = {
        _id: data._id,          
        name: data.name,
        email: data.email,
        profileColor: data.profileColor,
        lineUserId: data.lineUserId 
      };

      // ⭐️ บันทึกลง localStorage (เพื่อให้ Refresh แล้วไม่หาย)
      localStorage.setItem('token', data.token); 
      localStorage.setItem('userInfo', JSON.stringify(userData)); // เก็บทั้งก้อนเลย

      // อัปเดต State
      setToken(data.token);
      setUser(userData); 
      
      return true;
    } catch (error) {
      console.error('Login failed', error);
      return false;
    }
  };

  // 4. ฟังก์ชัน Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo'); // ล้างออกให้หมด
    localStorage.removeItem('userName'); // (ของเก่า ลบทิ้งไป)
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);