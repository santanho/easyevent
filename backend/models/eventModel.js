// (ลบ "ทุกอย่าง" (Everything) ... แล้ว "วาง" (Paste) ... "ก้อนนี้" (This block) ... "ก้อนเดียว" (Only))

console.log('--- ⭐️⭐️⭐️ LOADING "CORRECT V3" eventModel.js (CHECKING WEBHOOK)... ⭐️⭐️⭐️ ---');

const mongoose = require('mongoose');

// --- 1. "ลูก" (Child): (Schema "แขก") ---
const guestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false   // guest ไม่มี account ก็ได้
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { _id: false });
// --- (จบ "ลูก") ---


// --- 2. "แม่" (Parent): (Schema "Event") ---
const eventSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  // (Field 1: "แขก" (Guests) ... (ใช้ "ลูก" (Child) ... guestSchema))
  guests: [guestSchema],

  // --- 👇👇👇 "นี่คือ" (This is) ... "Field 2" (Field 2) ... (ที่ "อยู่" (Lives) ... "ใน" (IN) ... "แม่" (Parent)) 👇👇👇 ---
  webhook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    nullable: true
  },
  // --- 👆👆👆 (จบ "Field 2" แจ้งเตือนของ discord // อนาคตอาจใช้ Line message) 👆👆👆 ---

  color: {
    type: String,
    default: '#1890ff' // (Default = สีฟ้า (Blue) (AntD default))
  },
  // --- 👆👆👆 (จบ "Field 3" สีของแถบในปฏิทิน) 👆👆👆 ---

  eventType: {
    type: String,
    enum: ['quick', 'project'], // quick = ครั้งเดียวจบ, project = ต่อเนื่อง (มีโพล/Tasks)
    default: 'quick'
  },

  parentEvent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event',
    default: null 
  }
// --- 👆👆👆 (จบ "Field 4" กิจกรรมต่อเนื่อง) 👆👆👆 ---
}, { timestamps: true });
// --- (จบ "แม่") ---


// --- 3. (TTL Index ... "เหมือนเดิม") ---
eventSchema.index(
  { endTime: 1 },
  { expireAfterSeconds: 14 * 24 * 60 * 60 }
);

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;