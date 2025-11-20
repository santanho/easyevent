const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  // (ใคร... เป็น "เจ้าของ" (Owner) ... Webhook นี้)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // (ชื่อที่ "จำง่าย" (Friendly Name) ... เช่น "Project A")
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // (URL "จริง" (Actual URL) ... ที่ "ยาวๆ")
  url: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

const Webhook = mongoose.model('Webhook', webhookSchema);
module.exports = Webhook;