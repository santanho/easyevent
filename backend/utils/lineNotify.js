const axios = require('axios');
const User = require('../models/userModel');

const notifyLine = async (event, messageText) => {
  try {
    if (!event) return;

    // 1. หา LINE ID ของเจ้าของ (Owner)
    const ownerUser = await User.findById(event.owner);
    const ownerLineId = ownerUser ? ownerUser.lineUserId : null;

    // 2. หา LINE ID ของแขก (Guests)
    // (รองรับทั้งกรณี guest เป็น object หรือมีแต่ email)
    const guestEmails = event.guests.map(g => g.email || g); 
    const guestUsers = await User.find({ email: { $in: guestEmails } });
    const guestLineIds = guestUsers.map(u => u.lineUserId).filter(id => id);

    // 3. รวม ID ทั้งหมด (ตัดตัวซ้ำและค่าว่างออก)
    const allLineIds = [...new Set([ownerLineId, ...guestLineIds].filter(id => id))];

    if (allLineIds.length === 0) {
      console.log('LINE Notify: No connected users found.');
      return;
    }

    // 4. ส่งข้อความ (Multicast)
    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_TOKEN) {
      console.error('LINE Notify: Missing Token');
      return;
    }

    await axios.post('https://api.line.me/v2/bot/message/multicast', 
      {
        to: allLineIds,
        messages: [{ type: 'text', text: messageText }]
      },
      { headers: { 'Authorization': `Bearer ${LINE_TOKEN}` } }
    );

    console.log(`✅ LINE Notification sent to ${allLineIds.length} users: "${messageText}"`);

  } catch (error) {
    console.error('❌ LINE Notify Error:', error.response ? error.response.data : error.message);
  }
};

module.exports = notifyLine;