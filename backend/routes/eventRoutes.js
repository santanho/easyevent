const express = require('express');
const router = express.Router();
const axios = require('axios');
const notifyLine = require('../utils/lineNotify.js');
const { Resend } = require('resend');
const { protect } = require('../middleware/authMiddleware.js');
const Event = require('../models/eventModel.js'); 
const User = require('../models/userModel.js');
const Webhook = require('../models/webhookModel.js');

// (ฟังก์ชัน "Email Helper" ... "เหมือนเดิม")
const sendInvitationEmail = async (toEmail, eventTitle, ownerName) => {
    const SENDER = process.env.SENDER_EMAIL;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    const rsvpLink = `${FRONTEND_URL}/Easyevent/invited`;

    // Check Sandbox (ส่งได้เฉพาะอีเมลตัวเองในโหมดฟรี)
    if (!toEmail || toEmail.toLowerCase() !== SENDER.toLowerCase()) {
        console.log(`[Email] Sandbox Mode: Skipping email to ${toEmail}`);
        return; 
    }

    // เช็ก Key
    if (!process.env.RESEND_API_KEY) {
        console.error('[Email] Missing RESEND_API_KEY');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: 'Event App <onboarding@resend.dev>',
            to: [toEmail],
            subject: `[Event Invitation] 💌 คุณถูกเชิญเข้าร่วม: ${eventTitle}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2>คำเชิญเข้าร่วมกิจกรรม</h2>
                    <p>คุณ <strong>${ownerName}</strong> ได้เชิญคุณเข้าร่วม: <strong>${eventTitle}</strong></p>
                    <a href="${rsvpLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Click Here to Respond
                    </a>
                </div>
            `
        });

        if (error) {
            console.error('[Email] Resend Error:', error);
        } else {
            console.log(`[Email] Sent successfully! ID: ${data.id}`);
        }
    } catch (err) {
        console.error('[Email] Sending Failed:', err);
    }
};

// -----------------------------------------------------------------
// ⭐️ (2. "อัปเกรด" (Upgrade) ... ฟังก์ชัน "Discord Helper")
// (มันจะ "รับ" (Receive) ... "ID" ... (แทน "URL"))
// -----------------------------------------------------------------
const notifyDiscord = async (message, webhookId) => {
  if (!webhookId) return;
  try {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook || !webhook.url) return;

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLink = `${FRONTEND_URL}/Easyevent/invited`;
    
    await axios.post(webhook.url, {
      content: `@everyone [Event Update] 🚀: ${message}\nLink: ${inviteLink}`
    });
  } catch (error) {
    console.error('Discord Notify failed:', error.message);
  }
}
// (GET /myevents ... "เหมือนเดิม")
router.get('/myevents', protect, async (req, res) => {
  try {
    const myEmail = req.user.email.toLowerCase();
    
    // 1. ดึง Events (เฉพาะตัวแม่!)
    const events = await Event.find({
      $or: [
        { owner: req.user._id }, 
        { "guests.email": myEmail, "guests.status": "accepted" } 
      ]
    }).populate('owner', 'name email profileColor');

    // ... (ส่วน Logic เย็บข้อมูล User Profile ... เหมือนเดิม ไม่ต้องแก้) ...
    // 2. รวบรวมอีเมลแขกทั้งหมด
    const allGuestEmails = new Set();
    events.forEach(event => {
      event.guests.forEach(g => allGuestEmails.add(g.email));
    });
    // 3. ดึง User Profiles
    const users = await User.find({ email: { $in: Array.from(allGuestEmails) } })
                            .select('email name profileColor');
    // 4. Map
    const userMap = new Map(users.map(u => [u.email, u]));
    // 5. Stitch
    const eventsWithGuests = events.map(event => {
      const eventObj = event.toObject();
      eventObj.guests = eventObj.guests.map(guest => ({
        ...guest,
        user: userMap.get(guest.email) || null
      }));
      return eventObj;
    });
    
    res.json(eventsWithGuests);

  } catch (error) {
    console.error('GET /myevents error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// (GET /invited ... "เหมือนเดิม")
router.get('/invited', protect, async (req, res) => {
  try {
    const myEmail = req.user.email.toLowerCase();
    const events = await Event.find({
      "guests.email": myEmail,
      "guests.status": "pending"
    }).populate('owner', 'name email');
    res.json(events);
  } catch (error) {
    console.error('GET /invited error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// (GET /invited/count ... "เหมือนเดิม")
router.get('/invited/count', protect, async (req, res) => {
  try {
    const myEmail = req.user.email.toLowerCase();
    const count = await Event.countDocuments({
      "guests.email": myEmail,
      "guests.status": "pending"
    });
    res.json({ count: count });
  } catch (error) {
    console.error('GET /invited/count error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// (PUT /rsvp/:eventId ... "เหมือนเดิม")
router.put('/rsvp/:eventId', protect, async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const myEmail = req.user.email.toLowerCase();
    const guestIndex = event.guests.findIndex(g => g.email === myEmail);

    if (guestIndex === -1 || event.guests[guestIndex].status !== 'pending') {
      return res.status(404).json({ message: 'Invitation not found or already responded' });
    }

    // ⭐ UPDATE STATUS
    event.guests[guestIndex].status = status;

    // ⭐ VERY IMPORTANT → เพิ่ม user._id ให้ guest
    event.guests[guestIndex].user = req.user._id;

    // Save
    await event.save();

    res.json(event.guests[guestIndex]);

  } catch (error) {
    console.error('PUT /rsvp error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


// -----------------------------------------------------------------
// ⭐️ (3. "อัปเกรด" (Upgrade) ... POST /api/events (Create))
// -----------------------------------------------------------------
router.post('/', protect, async (req, res) => {
  const { title, description, startTime, endTime, guests, webhookId, color, parentEventId, eventType } = req.body;

  try {
    if (new Date(startTime) < new Date(Date.now() - 60000)) {
        return res.status(400).json({ message: 'Cannot create event in the past.' });
    }
    // 1. กำหนดสถานะเริ่มต้น (ลูก=accepted, แม่=pending)
    const initialStatus = parentEventId ? 'accepted' : 'pending';

    // 2. สร้าง Guest Array
    const guestArray = (guests || [])
      .map(email => ({ 
        email: email.trim().toLowerCase(), 
        status: initialStatus 
      }));

    // (กรองเจ้าของออก)
    const ownerEmailLower = req.user.email.toLowerCase();

    // 3. เตรียมข้อมูลบันทึก
    const eventDataToSave = {
      title,
      description,
      startTime,
      endTime,
      owner: req.user._id,
      webhook: webhookId || null,
      guests: guestArray.filter(g => g.email !== ownerEmailLower),
      color: color || '#1890ff',
      parentEvent: parentEventId || null,
      eventType: eventType || 'quick'
    };

    // 4. สร้างและบันทึก Event
    const event = new Event(eventDataToSave);
    const createdEvent = await event.save();

    // --- ส่วนการแจ้งเตือนและสร้างกลุ่ม ---

    // 5. ส่ง Email (เฉพาะ Event หลักเท่านั้น!)
    if (!parentEventId) {
        console.log('Sending emails to guests (Main Event)...');
        for (const guest of createdEvent.guests) {
            sendInvitationEmail(guest.email, createdEvent.title, req.user.name);
        }
    } else {
        console.log('Skipping emails for Sub-Event.');
    }

    // 6. ส่ง Discord (แจ้งเตือนเสมอ)
    notifyDiscord(
      `${createdEvent.title}" โดย ${req.user.name}`, 
      createdEvent.webhook
    );

    // 7. สร้างกลุ่ม LINE (เฉพาะ Event หลัก และมีคนเชื่อม LINE ครบ)
    await notifyLine(createdEvent, `🎉 มีกิจกรรมใหม่: "${createdEvent.title}"\nโดย: ${req.user.name}\nวันที่: ${new Date(startTime).toLocaleDateString()}`);

    res.status(201).json(createdEvent);

  } catch (error) {
    console.error('--- CRITICAL POST ERROR ---', error);
    res.status(400).json({ message: 'Invalid event data' });
  }
});

// -----------------------------------------------------------------
// ⭐️ (4. "อัปเกรด" (Upgrade) ... PUT /api/events/:id (Update))
// -----------------------------------------------------------------
router.put('/:id', protect, async (req, res) => {
  // 1. (เปลี่ยน "ตัวแปร" (Variable) ... ที่ "รับ" (Receive))
  const { title, description, startTime, endTime, guests, webhookId, color } = req.body;

  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // (Logic การ "รวม" แขก ... "เหมือนเดิม")
    const newGuestEmails = (guests || [])
      .map(e => e.trim().toLowerCase())
    const existingGuests = event.guests;
    const acceptedGuests = existingGuests.filter(g => g.status === 'accepted');
    const newPendingGuests = newGuestEmails
      .filter(email => !acceptedGuests.find(g => g.email === email))
      .map(email => ({ email, status: 'pending' }));
    event.guests = [...acceptedGuests, ...newPendingGuests];

    // (อัปเดต ... "เหมือนเดิม")
    event.title = title || event.title;
    event.description = description || event.description;
    event.startTime = startTime || event.startTime;
    event.endTime = endTime || event.endTime;
    // 2. (เปลี่ยน "ชื่อ Field" (Field Name))
    event.webhook = webhookId || event.webhook;
    event.color = color || event.color;

    const updatedEvent = await event.save(); // <-- (บันทึกสำเร็จ!)

    await notifyLine(updatedEvent, `✏️ กิจกรรมถูกแก้ไข: "${updatedEvent.title}"\nโดย: ${req.user.name}`);
    // (เรียก Email - เฉพาะ "แขกใหม่" ... "เหมือนเดิม")
    console.log('Sending emails to *newly* added pending guests...');
    for (const guest of newPendingGuests) {
      sendInvitationEmail(guest.email, updatedEvent.title, req.user.name);
    }

    // (เรา "ไม่" (DO NOT) ... "จำเป็น" (Need) ... ต้อง "ยิง" (Fire) ... Discord "ซ้ำ" (Again) ... ตอน "แก้ไข" (Edit))

    res.json(updatedEvent);
  } catch (error) {
    console.error('PUT /:id error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// (DELETE /:id ... "เหมือนเดิม")
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const myEmail = req.user.email.toLowerCase();

    if (event.owner.toString() === req.user._id.toString()) {
      await notifyLine(event, `🗑️ กิจกรรมถูกยกเลิก: "${event.title}"\nโดย: ${req.user.name}`);
      await event.deleteOne();
      return res.json({ message: 'Event (Owner) removed' });
    }

    const guestIndex = event.guests.findIndex(g => g.email === myEmail);
    if (guestIndex > -1) {
      event.guests.splice(guestIndex, 1);
      await event.save();
      return res.json({ message: 'Event (Guest) left' });
    }

    return res.status(401).json({ message: 'User not authorized' });
  } catch (error) {
    console.error('DELETE /:id error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) GET /api/events/:id
// (API ใหม่: "ดึง" (Fetch) ... "Event "เดียว"" (Single Event) ... (สำหรับ "หน้า Details"))
// -----------------------------------------------------------------
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('owner', 'name email profileColor') // ⭐️ (ดึง "Owner" (เจ้าของ))
      .populate('guests.user', 'name email profileColor')

    if (!event) {
      return res.status(404).json({ message: 'Event not found' }); // (แก้ 4404 -> 404)
    }

    // (เช็ก "สิทธิ์" (Permission) ... (ว่า "เรา" (We) ... "เป็น" (Are) ... "Owner" (เจ้าของ) ... "หรือ" (OR) ... "เป็น" (Are) ... "Guest" (แขก)))
    const isOwner = event.owner._id.toString() === req.user._id.toString();
    const isGuest = event.guests.find(g => g.email === req.user.email.toLowerCase());

    if (!isOwner && !isGuest) {
      return res.status(401).json({ message: 'Not authorized to view this event' });
    }
    
    res.json(event);

  } catch (error) {
    console.error('GET /:id error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ⭐️ GET /api/events/:id/sub-events (ดึงกิจกรรมลูก)
router.get('/:id/sub-events', protect, async (req, res) => {
  try {
    const subEvents = await Event.find({ parentEvent: req.params.id })
      .populate('owner', 'name email profileColor');
    res.json(subEvents);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;