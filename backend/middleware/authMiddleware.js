const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');
require('dotenv').config();

const protect = async (req, res, next) => {
  let token;

  // ตรวจสอบว่ามี Token ส่งมาใน Header และขึ้นต้นด้วย 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. ดึง Token ออกจาก Header
      token = req.headers.authorization.split(' ')[1];

      // 2. ตรวจสอบ Token (Verify)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. ดึงข้อมูล User จาก Token (Payload) และแนบไปกับ req
      // เพื่อให้ Endpoints อื่นๆ รู้ว่าใครเป็นคนส่ง Request
      req.user = await User.findById(decoded.id).select('-password');

      next(); // ไปยัง Endpoint ถัดไป
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' }); // 401 Unauthorized
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };