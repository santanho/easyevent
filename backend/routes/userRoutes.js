const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');
const User = require('../models/userModel.js'); // (Model ที่เราเพิ่ง "แก้" (Modified) ... ใน "ขั้นตอนที่ 1")

// -----------------------------------------------------------------
// (เราจะ "เพิ่ม" (Add) ... API 'search' ... "ทิ้งไว้" (Leave it here) ... "เผื่อ" (In case) ... "อนาคต" (Future) ... เราจะทำ "ระบบเพื่อน")
// @route   GET /api/users/search
// @desc    ค้นหา User (ยกเว้นตัวเอง)
// @access  Private
router.get('/search', protect, async (req, res) => {
  const query = req.query.q ? {
    $or: [
      { name: { $regex: req.query.q, $options: 'i' } }, // ค้นหาจากชื่อ
      { email: { $regex: req.query.q, $options: 'i' } }, // ค้นหาจากอีเมล
    ],
    _id: { $ne: req.user._id } // $ne = Not Equal (ไม่เอาตัวเอง)
  } : {};

  try {
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// ⭐️ (API "ใหม่" (New) ... ที่เรา "ต้องการ" (NEED) ... สำหรับ "หน้า Setting")
// @route   PUT /api/users/profile
// @desc    สำหรับ "เปลี่ยนชื่อ" (Name) + "เปลี่ยนสี" (Color)
// @access  Private
// -----------------------------------------------------------------
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // (อัปเดต "เฉพาะ" ... 2 ค่านี้)
    user.name = req.body.name || user.name;
    user.profileColor = req.body.profileColor || user.profileColor;

    const updatedUser = await user.save();

    // (ส่ง "ข้อมูลใหม่" (New Data) ... กลับไปให้ Frontend ... (เผื่อต้องอัปเดต 'Welcome, ...'))
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profileColor: updatedUser.profileColor,
    });
  } catch (error) {
    console.error('PUT /profile error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;