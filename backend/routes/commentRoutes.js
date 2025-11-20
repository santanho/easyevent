const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');

const notifyLine = require('../utils/lineNotify');

const Comment = require('../models/commentModel.js'); 
const Event = require('../models/eventModel.js'); 

// -----------------------------------------------------------------
// ⭐️ (อัปเกรด V2!) GET /api/comments/:eventId
// (ดึง "เฉพาะ" (ONLY) ... "คอมเมนต์ "แม่"" (Parent "Comments"))
// -----------------------------------------------------------------
router.get('/:eventId', protect, async (req, res) => {
  try {
    // (เช็ก "สิทธิ์" (Permission) ... "เหมือนเดิม")
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const isOwner = event.owner.toString() === req.user._id.toString();
    const isGuest = event.guests.find(g => g.email === req.user.email.toLowerCase());
    if (!isOwner && !isGuest) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // --- 👇👇👇 (นี่คือ "Logic "ใหม่"" (The "New" Logic)) 👇👇👇 ---
    
    // (ดึง "เฉพาะ" (ONLY) ... "คอมเมนต์" (Comments) ... ที่ "parentComment" (แม่) ... "คือ" (Is) ... 'null')
    const comments = await Comment.find({ 
      event: req.params.eventId,
      parentComment: null 
    })
      .populate('author', 'name profileColor') 
      .sort({ createdAt: 'asc' })
      .lean(); // ⭐️ (แปลงเป็น "JS Object" ... (เพื่อให้ "แก้" (Modify) ... "ได้" (Editable)))

    // 2. (วน Loop ... "นับ "ลูก"" (Count "Children") ... "ของ "แต่ละคน"" (For "Each"))
    for (const comment of comments) {
      const replyCount = await Comment.countDocuments({ parentComment: comment._id });
      comment.replyCount = replyCount; // ⭐️ ( "ยัด" (Inject) ... "ตัวนับ" (Counter) ... "เข้าไป" (Into it))
    }
      
    res.json(comments);

  } catch (error) {
    console.error('GET /comments/:eventId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ (API "ใหม่"!) GET /api/comments/replies/:commentId
// (ดึง "คำตอบกลับ" (Replies) ... "ทั้งหมด" (All) ... "ของ" (Of) ... "คอมเมนต์ "แม่"" (Parent "Comment") ... "นี้" (This))
// -----------------------------------------------------------------
router.get('/replies/:commentId', protect, async (req, res) => {
  try {
    // (เรา "ควรจะ" (Should) ... "เช็ก "สิทธิ์"" (Check "Permission") ... "ตรงนี้" (Here) ... "ด้วย" (Too) ...
    // ...แต่ (But) ... "เพื่อ" (For) ... "ความ "ง่าย"" (Simplicity) ... เราจะ "ข้าม" (Skip) ... "มัน" (It) ... "ไป "ก่อน"" (For "now"))
    
    // (ดึง "ลูก" (Children) ... "ทั้งหมด" (All) ... (ที่ "มี" (Have) ... "แม่" (Parent) ... "คนนี้" (This)))
    const replies = await Comment.find({ parentComment: req.params.commentId })
      .populate('author', 'name profileColor') 
      .sort({ createdAt: 'asc' }); 
      
    res.json(replies);

  } catch (error) {
    console.error('GET /comments/replies/:commentId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


// -----------------------------------------------------------------
// ⭐️ (อัปเกรด V2!) POST /api/comments/:eventId
// ( "สร้าง" (Create) ... "คอมเมนต์ "แม่"" (Parent "Comment") ... "หรือ" (OR) ... "คอมเมนต์ "ลูก"" (Child "Comment" (Reply)))
// -----------------------------------------------------------------
router.post('/:eventId', protect, async (req, res) => {
  // (Frontend "ต้อง" (MUST) ... "ส่ง" (Send) ... 'parentCommentId' ... "มา "ด้วย"" (As "well") ... (ถ้า (If) ... "มัน" (It) ... "คือ "Reply"" (Is a "Reply")))
  const { text, location, parentCommentId } = req.body; 
  
  if (!text) {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  try {
    // (เช็ก "สิทธิ์" (Permission) ... "เหมือนเดิม")
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const isOwner = event.owner.toString() === req.user._id.toString();
    const isAcceptedGuest = event.guests.find(g => 
      g.email === req.user.email.toLowerCase() && g.status === 'accepted'
    );
    if (!isOwner && !isAcceptedGuest) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // (สร้าง "คอมเมนต์" (Comment) ... (เวอร์ชัน "ใหม่" (New)))
    const comment = new Comment({
      event: req.params.eventId,
      author: req.user._id,
      text: text,
      location: location || null,
      parentComment: parentCommentId || null // 👈 ( "บันทึก" (Save) ... "ID "แม่"" (Parent "ID") ... (ถ้า (If) ... "มี" (Have)))
    });

    const createdComment = await comment.save();

    const populatedComment = await Comment.findById(createdComment._id)
      .populate('author', 'name profileColor');
      
    const eventForNotify = await Event.findById(req.params.eventId);
    await notifyLine(eventForNotify, `💬 คอมเมนต์ใหม่ใน "${eventForNotify.title}"\n${req.user.name}: "${text}"`);

    res.status(201).json(populatedComment);

  } catch (error) {
    console.error('POST /comments/:eventId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;