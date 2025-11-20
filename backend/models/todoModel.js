const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  // (1. "Event (โปรเจกต์ "แม่")" ... "ไหน" (Which "Parent" Project))
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  // (2. "ใคร" (Who) ... "เป็น "คน "สร้าง"" (Author) ... "งาน" (Task) ... "นี้" (This))
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // (3. "ชื่องาน" (Task "Name") ... "คือ" (Is) ... "อะไร" (What))
  text: {
    type: String,
    required: true,
    trim: true,
  },
  // (4. "เสร็จ" (Completed) ... "หรือ" (Or) ... "ยัง" (Not yet))
  isCompleted: {
    type: Boolean,
    default: false,
  },
  // (5. ( "โบนัส "อนาคต"" (Future "Bonus")) ... "มอบหมาย" (Assign) ... "ให้" (To) ... "ใคร" (Whom))
  // assignee: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   default: null
  // }
}, { timestamps: true }); 

const Todo = mongoose.model('Todo', todoSchema);
module.exports = Todo;