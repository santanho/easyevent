const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  // (1. "Event (กิจกรรม)" ... "ไหน" (Which) ... ที่ "เป็นเจ้าของ" (Owns) ... "โพล" (Poll) ... นี้)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  // (2. "ใคร" (Who) ... "เป็น "คนสร้าง"" (Author) ... "โพล" (Poll) ... นี้)
  // (เรา "อนุญาต" (Allow) ... "ทุกคน" (Everyone) ... (Owner + Guests) ... ให้ "สร้าง" (Create) ... ได้)
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // (3. "คำถาม" (Question) ... "คือ" (Is) ... "อะไร" (What))
  question: {
    type: String,
    required: true,
    trim: true,
  },
  // (4. "ตัวเลือก" (Options) ... "มี" (Has) ... "อะไร" (What) ... "บ้าง" (Else))
  // (นี่คือ "Array" (Array) ... ของ "ID" (IDs) ... ที่ "ชี้" (Pointing) ... ไป "หา" (To) ... "Model (ตาราง)" ... "ถัดไป" (Next))
  options: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PollOption'
  }]
}, { timestamps: true });

const Poll = mongoose.model('Poll', pollSchema);
module.exports = Poll;