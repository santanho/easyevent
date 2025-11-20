const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  // (1. "โพล" (Poll) ... "ไหน" (Which) ... ที่ "เป็นเจ้าของ" (Owns) ... "ตัวเลือก" (Option) ... นี้)
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
  },
  // (2. "ข้อความ" (Text) ... "ของ" (Of) ... "ตัวเลือก" (Option) ... "คือ" (Is) ... "อะไร" (What))
  text: {
    type: String,
    required: true,
    trim: true,
  },
  // (3. "ใคร" (Who) ... "โหวต" (Voted) ... "ตัวเลือก" (Option) ... "นี้" (This) ... "บ้าง" (Else))
  // (นี่คือ "Array" (Array) ... ของ "User ID" (User IDs))
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const PollOption = mongoose.model('PollOption', pollOptionSchema);
module.exports = PollOption;