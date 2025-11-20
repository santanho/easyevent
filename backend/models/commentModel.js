const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // (1. "Event (กิจกรรม)" ... "ไหน" (Which) ... (ที่เรา "คอมเมนต์" (Commented) ... "ใน" (In)))
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  // (2. "ใคร" (Who) ... "เป็น "คน" (Author) ... "คอมเมนต์" (Commented))
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // (3. "ข้อความ" (Text) ... "คือ" (Is) ... "อะไร" (What))
  text: {
    type: String,
    required: true,
    trim: true,
  },
  // (4. "โบนัส" (Bonus): "มี "สถานที่"" (Has "Location") ... "หรือไม่" (Or not))
  // (เรา "เพิ่ม" (Add) ... "เผื่อ" (In case) ... "อนาคต" (Future) ... เราอยาก "แปะ" (Pin) ... "แผนที่" (Map))
  location: {
    type: String,
    trim: true,
    nullable: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment', // ⭐️ ( "อ้างอิง" (References) ... "ตัวมันเอง" (Itself)!)
    default: null // (ถ้า (If) ... "คือ" (Is) ... 'null' ... แปลว่า (Means) ... "นี่" (This) ... "คือ "แม่"" (Is a "Parent"))
  },
}, { timestamps: true }); // (timestamps = 'createdAt', 'updatedAt')

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;