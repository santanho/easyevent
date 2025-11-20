import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Easyevent from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';


function App() {
  return (
    <div className="App">
      <Routes>
        
        {/* หน้าสาธารณะ */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* (Private Routes - หน้า "ส่วนตัว") */}
        <Route 
          path="/Easyevent/*" 
          element={
            <ProtectedRoute>
              <Easyevent />
            </ProtectedRoute>
          } 
        />

        <Route path="/" element={<Navigate to="/Easyevent/list" />} />
      </Routes>
    </div>
  );
}

export default App;