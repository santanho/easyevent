const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');
const User = require('../models/userModel.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const axios = require('axios');

require('dotenv').config();

// ฟังก์ชันสร้าง Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token มีอายุ 30 วัน
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password }); // password จะถูก hash โดยอัตโนมัติ (จาก userModel)

    res.status(201).json({ // 201 Created
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id), // ส่ง Token ให้ทันที
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login (Authenticate user & get token)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // ตรวจสอบ User และ Password (ใช้ method ที่เราสร้างใน model)
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profileColor: user.profileColor,
        lineUserId: user.lineUserId,
        token: generateToken(user._id), // ส่ง Token ให้ Client
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' }); // 401 Unauthorized
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) PUT /api/auth/change-password
// (API ใหม่: สำหรับ "เปลี่ยนรหัสผ่าน" (Change Password))
// -----------------------------------------------------------------
router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  try {
    const user = await User.findById(req.user._id);

    // 1. (เช็ก "รหัสเก่า")
    if (user && (await user.matchPassword(currentPassword))) {

      // 2. (ถ้า "รหัสเก่า" ถูก... "เปลี่ยน" (Set) "รหัสใหม่")
      // (Model (userModel.js) ... จะ "แฮช" (Hash) ... ให้เรา "อัตโนมัติ" (Automatically) ... (ตอน 'pre.save'))
      user.password = newPassword;

      await user.save(); // (บันทึก)

      res.json({ message: 'Password updated successfully' });

    } else {
      res.status(401).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    console.error('PUT /change-password error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) GET /api/auth/line/callback
// (API "รับ" (Callback) ... (ที่ "LINE" (LINE) ... "จะ "ยิง"" (Will "Fire") ... "กลับมา" (Back) ... "หา" (To) ... "เรา" (Us)))
// -----------------------------------------------------------------
router.get('/line/callback', async (req, res) => {

  console.log('--- DEBUG (LINE Callback): Checking .env Keys... ---');
  console.log('CLIENT_ID (from .env):', process.env.LINE_LOGIN_CHANNEL_ID);
  console.log('CLIENT_SECRET (from .env):', process.env.LINE_LOGIN_CHANNEL_SECRET);
  // (1. "อ่าน" (Read) ... "ตั๋ว" (Ticket) ... ( 'code' (โค้ด)) ... และ (And) ... "ID "ของเรา"" (Our "ID") ... ( 'state' (สเตท)) ...
  // ... "จาก" (From) ... "URL" (URL) ... (ที่ "LINE" (LINE) ... "ส่ง" (Sent) ... "กลับมา" (Back)))
  const { code, state } = req.query;
  
  // ('state' (สเตท) ... "คือ" (IS) ... 'user._id' ... "ของ "เรา"" (Of "Us") ... (ที่เรา "ส่ง" (Sent) ... "ไป" (Go) ... "ใน "ภารกิจที่ 2""))
  const ourUserId = state; 

  // ( "ตั้งค่า" (Setup) ... "กุญแจ" (Keys) ... "ของเรา" (Our))
  const REDIRECT_URI = 'https://easyevent.onrender.com/api/auth/line/callback';
  const CLIENT_ID = process.env.LINE_LOGIN_CHANNEL_ID;
  const CLIENT_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;

  // ( "สร้าง" (Build) ... "Body" (Body) ... "แบบ" (Type) ... "x-www-form-urlencoded" ... (ที่ "LINE" (LINE) ... "ต้องการ" (Requires)))
  const bodyParams = new URLSearchParams();
  bodyParams.append('grant_type', 'authorization_code');
  bodyParams.append('code', code);
  bodyParams.append('redirect_uri', REDIRECT_URI);
  bodyParams.append('client_id', CLIENT_ID);
  bodyParams.append('client_secret', CLIENT_SECRET);

  try {
    // --- (ขั้นตอนที่ 1: "แลก "ตั๋ว" (Code) ... "เป็น "Token"" (For "Token")) ---
    
    console.log('LINE Callback: Exchanging code for token...');
    
    const tokenResponse = await axios.post(
      'https://api.line.me/oauth2/v2.1/token', 
      bodyParams,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // --- (ขั้นตอนที่ 2: "เอา "Token"" (Use "Token") ... "ไป "ถาม"" (To "Ask") ... "ว่า "นี่ "ใคร""" (Who "is" this)) ---
    
    console.log('LINE Callback: Getting user profile with token...');
    
    const profileResponse = await axios.get(
      'https://api.line.me/v2/profile',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const lineUserId = profileResponse.data.userId; // (นี่คือ "ID "จริง"" (The "Real" ID) ... "ของ "LINE"" (Of "LINE") ... (เช่น "U123..."))

    // --- (ขั้นตอนที่ 3: "บันทึก" (Save) ... "ID "LINE"" (LINE "ID") ... "ลง" (Into) ... "DB "เรา"" (Our "DB")) ---
    
    console.log(`LINE Callback: Linking our user (${ourUserId}) with LINE User (${lineUserId})`);
    
    const user = await User.findById(ourUserId);
    if (!user) {
      return res.status(404).send('Your EasyEvent user account was not found.');
    }

    user.lineUserId = lineUserId; // ( "ผูก" (Connect) ... "บัญชี" (Accounts) ... "เข้า "ด้วยกัน"" (Together))
    await user.save();

    // --- (ขั้นตอนที่ 4: "ส่ง" (Send) ... "User" (ผู้ใช้) ... "กลับ" (Back) ... "ไป" (To) ... "หน้า "Setting"") ---
    
    console.log('LINE Callback: Success! Redirecting back to Frontend...');
    
    // ( "ส่ง" (Redirect) ... "Browser" (เบราว์เซอร์) ... "กลับ" (Back) ... "ไป" (To) ... "หน้า "Setting"" (Settings "Page") ... (ที่ "เรา" (We) ... "จาก" (Came) ... "มา" (From)))
    res.redirect('https://easyevent-taupe.vercel.app//Easyevent/settings');

  } catch (error) {
    console.error('LINE Callback Error:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred during LINE authentication.');
  }
});

module.exports = router;