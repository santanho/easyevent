const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');

const notifyLine = require('../utils/lineNotify');

const Poll = require('../models/pollModel.js');
const PollOption = require('../models/pollOptionModel.js');
const Event = require('../models/eventModel.js'); // (เรา "ต้องการ" (Need) ... "Event" ... เพื่อ "เช็ก" (Check) ... "สิทธิ์" (Permission))

/**
 * @swagger
 * tags:
 *   - name: Polls
 *   description: ระบบโหวต
 */

/**
 * @swagger
 * /api/polls/{eventId}:
 *   get:
 *     summary: ดึงโพลทั้งหมดของ Event
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Event
 *     responses:
 *       200:
 *         description: รายการโพลทั้งหมด
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ GET /api/polls/:eventId
// (ดึง "โพลทั้งหมด" (All Polls) ... "ของ" (Of) ... "Event (กิจกรรม)" ... "นี้" (This))
// -----------------------------------------------------------------
router.get('/:eventId', protect, async (req, res) => {
  try {
    // (เรา "ต้อง" (MUST) ... "เช็ก" (Check) ... "สิทธิ์" (Permission) ... "ก่อน" (First))
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isOwner = event.owner.toString() === req.user._id.toString();
    const isGuest = event.guests.find(g => g.email === req.user.email.toLowerCase());

    if (!isOwner && !isGuest) {
      return res.status(401).json({ message: 'Not authorized to view polls for this event' });
    }

    // (ถ้า "มี" (Have) ... "สิทธิ์" (Right) ... "ดึง" (Fetch) ... "โพล" (Polls) ... "ทั้งหมด" (All))
    const polls = await Poll.find({ event: req.params.eventId })
      .populate('author', 'name profileColor') // (ดึง "คนสร้าง" (Author) ... "โพล" (Poll))
      .populate({
        path: 'options', // (ดึง "ตัวเลือก" (Options))
        populate: {
          path: 'votes', // (ดึง "คนที่โหวต" (Voters) ... "ใน" (In) ... "ตัวเลือก" (Options))
          select: 'name profileColor _id' // (ดึง "เฉพาะ" (Only) ... "ข้อมูล" (Info) ... ที่ "จำเป็น" (Needed))
        }
      });

    res.json(polls);

  } catch (error) {
    console.error('GET /polls/:eventId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/{eventId}:
 *   post:
 *     summary: สร้างโพลใหม่สำหรับ Event
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - options
 *             properties:
 *               question:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Poll created
 *       400:
 *         description: Poll needs a question and at least 2 options
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ POST /api/polls/:eventId
// (สร้าง "โพล" (Poll) ... "ใหม่" (New) ... (สำหรับ "Event (กิจกรรม)" ... "นี้" (This)))
// -----------------------------------------------------------------
router.post('/:eventId', protect, async (req, res) => {
  // (Frontend "ต้อง" (MUST) ... "ส่ง" (Send) ... "คำถาม" (Question) ... และ "Array "ตัวเลือก"" (Array of "Options"))
  const { question, options } = req.body;

  if (!question || !options || options.length < 2) {
    return res.status(400).json({ message: 'Poll needs a question and at least 2 options' });
  }

  try {
    // (เรา "ต้อง" (MUST) ... "เช็ก" (Check) ... "สิทธิ์" (Permission) ... "อีกครั้ง" (Again))
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isOwner = event.owner.toString() === req.user._id.toString();
    const isAcceptedGuest = event.guests.find(g =>
      g.email === req.user.email.toLowerCase() && g.status === 'accepted'
    );

    // (ตาม "โจทย์" (Request) ... ของคุณ... "แขก" (Guests) ... "สร้างได้" (Can create))
    if (!isOwner && !isAcceptedGuest) {
      return res.status(401).json({ message: 'Not authorized to create a poll' });
    }

    // --- (สร้าง "โพล" (Poll) ... (ที่ "ซับซ้อน" (Complex))) ---

    // 1. (สร้าง "Poll "แม่"" (Parent Poll) ... (ที่ "ว่างเปล่า" (Empty)) ... "ก่อน" (First))
    const poll = new Poll({
      event: req.params.eventId,
      author: req.user._id,
      question: question,
      options: [], // (ยัง "ว่าง" (Empty) ... อยู่)
      author: req.user._id,
    });

    // 2. (สร้าง "Array "ตัวเลือก"" (Array of "Options") ... (ใน "DB"))
    const createdOptions = await Promise.all(
      options.map(optionText => {
        const newOption = new PollOption({
          poll: poll._id,
          text: optionText,
          votes: []
        });
        return newOption.save();
      })
    );

    // 3. (เอา "ID" (IDs) ... ของ "ตัวเลือก" (Options) ... "ยัด" (Push) ... "กลับ" (Back) ... "เข้าไป" (Into) ... "Poll "แม่"")
    poll.options = createdOptions.map(opt => opt._id);
    await poll.save(); // (บันทึก "Poll "แม่"" (Parent Poll) ... (ที่ "สมบูรณ์" (Complete) ... แล้ว))

    // 4. (ดึง "ข้อมูล" (Data) ... "ทั้งหมด" (Full) ... กลับไป)
    const populatedPoll = await Poll.findById(poll._id)
      .populate('author', 'name profileColor')
      .populate({ path: 'options', populate: { path: 'votes', select: 'name _id' } });

    await notifyLine(event, `📊 โพลใหม่: "${question}"\nในกิจกรรม: "${event.title}"\nสร้างโดย: ${req.user.name}`);

    res.status(201).json(populatedPoll);

  } catch (error) {
    console.error('POST /polls/:eventId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/{pollId}/add-option:
 *   post:
 *     summary: เพิ่มตัวเลือกใหม่ใน Poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Poll
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - optionText
 *             properties:
 *               optionText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Poll updated
 *       400:
 *         description: Option text is required
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Poll or Event not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ POST /api/polls/:pollId/add-option
// (เพิ่ม "ตัวเลือก" (Option) ใหม่ ... ลงใน "โพล" (Poll))
// -----------------------------------------------------------------
router.post('/:pollId/add-option', protect, async (req, res) => {
  console.log('add-option hit ✅ pollId:', req.params.pollId, 'body:', req.body);
  console.log('req.user:', req.user);
  const { pollId } = req.params;
  const { optionText } = req.body;

  console.log('🟡 Incoming add-option');
  console.log('pollId:', pollId);
  console.log('optionText:', optionText);
  console.log('req.user:', req.user);

  if (!optionText) {
    console.log('❌ No optionText provided');
    return res.status(400).json({ message: 'Option text is required' });
  }

  try {
    const poll = await Poll.findById(pollId);
    console.log('poll found:', poll ? poll._id : 'not found');
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const event = await Event.findById(poll.event);
    console.log('event found:', event ? event._id : 'not found');
    if (!event) return res.status(404).json({ message: 'Parent event not found' });

    const isOwner = event.owner.toString() === req.user._id.toString();
    const isAcceptedGuest = event.guests.find(
      (g) => g.email === req.user.email.toLowerCase() && g.status === 'accepted'
    );
    console.log('isOwner:', isOwner, 'isAcceptedGuest:', !!isAcceptedGuest);

    if (!isOwner && !isAcceptedGuest) {
      console.log('❌ Not authorized');
      return res.status(401).json({ message: 'Not authorized' });
    }

    const newOption = new PollOption({
      poll: pollId,
      text: optionText,
      votes: [],
    });
    await newOption.save();
    console.log('✅ Option saved:', newOption._id);

    poll.options.push(newOption._id);
    await poll.save();
    console.log('✅ Poll updated');

    const updatedPoll = await Poll.findById(poll._id)
      .populate('author', 'name profileColor')
      .populate({
        path: 'options',
        populate: { path: 'votes', select: 'name _id' },
      });

    console.log('✅ Returning updatedPoll');
    res.json(updatedPoll);
  } catch (error) {
    console.error('🔥 POST /:pollId/add-option error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/vote/{optionId}:
 *   put:
 *     summary: โหวตตัวเลือก (สามารถติ๊ก/ยกเลิกติ๊ก)
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Poll Option
 *     responses:
 *       200:
 *         description: Poll updated
 *       401:
 *         description: Not authorized to vote
 *       404:
 *         description: Option or Poll not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ PUT /api/polls/vote/:optionId
// ( "โหวต" (Vote) ... "ตัวเลือก" (Option) ... "นี้" (This))
// -----------------------------------------------------------------
router.put('/vote/:optionId', protect, async (req, res) => {
  try {
    const optionId = req.params.optionId;
    const userId = req.user._id;

    // (ค้นหา "ตัวเลือก" (Option) ... ที่ "เรา" (We) ... "คลิก" (Clicked))
    const option = await PollOption.findById(optionId);
    if (!option) return res.status(404).json({ message: 'Option not found' });
    
    // (ค้นหา "โพล "แม่"" (Parent "Poll") ... (เพื่อ "เช็ก" (Check) ... "สิทธิ์" (Permission)))
    const poll = await Poll.findById(option.poll);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    
    // (เช็ก "สิทธิ์" (Permission) ... (ว่า "เรา" (We) ... "อยู่" (Are in) ... "ใน" (In) ... "Event" (Event) ... "นี้" (This) ... หรือไม่))
    const event = await Event.findById(poll.event);
    const isOwner = event.owner.toString() === userId.toString();
    const isAcceptedGuest = event.guests.find(g => 
      g.email === req.user.email.toLowerCase() && g.status === 'accepted'
    );
    if (!isOwner && !isAcceptedGuest) {
      return res.status(401).json({ message: 'Not authorized to vote' });
    }

    // --- 👇👇👇 (นี่คือ "Logic "ใหม่"" (The "New" Logic) ... (แบบ "Checkbox")) 👇👇👇 ---
    
    // 1. (ค้นหา "ID" (ID) ... "ของ "เรา"" (Of "Us") ... "ใน" (In) ... "Array "Votes"" ... "ของ "ตัวเลือก"" (Of "This" option) ... "นี้" (This) ... "เท่านั้น" (Only))
    const voteIndex = option.votes.indexOf(userId);

    if (voteIndex > -1) {
      // 2. (ถ้า "เจอ" (Found) ... (แปลว่า "เรา" (We) ... "กำลัง "ติ๊กออก"" (Are "Un-checking")))
      option.votes.splice(voteIndex, 1); // ( "ดึง" (Pull) ... "โหวต" (Vote) ... "ออก" (Out))
    } else {
      // 3. (ถ้า "ไม่" (Not) ... "เจอ" (Found) ... (แปลว่า "เรา" (We) ... "กำลัง "ติ๊กเข้า"" (Are "Checking")))
      option.votes.push(userId); // ( "ยัด" (Push) ... "โหวต" (Vote) ... "เข้าไป" (In))
    }
    // --- 👆👆👆 (จบ "Logic "ใหม่"") 👆👆👆 ---

    await option.save(); // (บันทึก "ตัวเลือก" (Option) ... ที่ "อัปเดต" (Updated) ... แล้ว)

    // (ดึง "โพล" (Poll) ... "ทั้งหมด" (Full) ... (ที่ "อัปเดต" (Updated) ... แล้ว) ... "กลับไป" (Back))
    const updatedPoll = await Poll.findById(poll._id)
      .populate('author', 'name profileColor')
      .populate({ path: 'options', populate: { path: 'votes', select: 'name _id' } });

    res.json(updatedPoll);

  } catch (error) {
    console.error('PUT /vote/:optionId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/{pollId}:
 *   delete:
 *     summary: ลบ Poll และตัวเลือกทั้งหมด
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Poll
 *     responses:
 *       200:
 *         description: Poll and all its options successfully deleted
 *       401:
 *         description: Not authorized to delete this poll
 *       404:
 *         description: Poll or Parent Event not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) DELETE /api/polls/:pollId
// ( "ลบ "โพล"" (Delete "Poll") ... (และ "ตัวเลือก" (Options) ... "ทั้งหมด" (All) ... "ของ" (Of) ... "มัน" (It)))
// -----------------------------------------------------------------
router.delete('/:pollId', protect, async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  try {
    // 1. (ค้นหา "โพล "แม่"" (Parent "Poll"))
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    // 2. (ค้นหา "Event "แม่"" (Parent "Event") ... (เพื่อ "เช็ก" (Check) ... "เจ้าของ" (Owner)))
    const event = await Event.findById(poll.event);
    if (!event) return res.status(404).json({ message: 'Parent event not found' });

    // 3. (เช็ก "สิทธิ์" (Permission))
    const isPollAuthor = poll.author.toString() === userId.toString();
    const isEventOwner = event.owner.toString() === userId.toString();

    // ("เฉพาะ" (ONLY) ... "คนสร้างโพล" (Author) ... "หรือ" (OR) ... "เจ้าของ Event" (Owner) ... ที่ "ลบ" (Delete) ... ได้)
    if (!isPollAuthor && !isEventOwner) {
      return res.status(401).json({ message: 'Not authorized to delete this poll' });
    }

    // 4. (ลบ "ลูก" (Children) ... (คือ "ตัวเลือก" (Options)) ... "ทั้งหมด" (All) ... "ทิ้ง" (Away) ... "ก่อน" (First))
    await PollOption.deleteMany({ poll: pollId });

    // 5. (ลบ "แม่" (Parent) ... (คือ "โพล" (Poll)) ... "ทิ้ง" (Away) ... "ทีหลัง" (Last))
    await poll.deleteOne(); // (หรือ 'Poll.findByIdAndDelete(pollId)')

    res.json({ message: 'Poll and all its options successfully deleted' });

  } catch (error) {
    console.error('DELETE /polls/:pollId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/{pollId}/reset:
 *   put:
 *     summary: ล้างผลโหวตทั้งหมดของ Poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Poll
 *     responses:
 *       200:
 *         description: Poll votes reset
 *       401:
 *         description: Not authorized (Only the poll author can reset votes)
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) PUT /api/polls/:pollId/reset
// ( "ล้าง" (Clear) ... "ผลโหวต" (All votes) ... "ทั้งหมด" (All) ... "ของ" (Of) ... "โพล" (Poll) ... "นี้" (This))
// -----------------------------------------------------------------
router.put('/:pollId/reset', protect, async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  try {
    // 1. (ค้นหา "โพล "แม่"" (Parent "Poll"))
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    // 2. (เช็ก "สิทธิ์" (Permission) ... ( "เฉพาะ" (ONLY) ... "คนสร้างโพล" (Poll Author)))
    if (poll.author.toString() !== userId.toString()) {
      return res.status(401).json({ message: 'Not authorized (Only the poll author can reset votes)' });
    }

    // --- (ถ้า "มี" (Have) ... "สิทธิ์" (Right) ... "ล้าง" (Reset)) ---

    // 3. (นี่คือ "หัวใจ" (The "Heart") ... ครับ)
    // ( "สั่ง" (Command) ... "DB" (Database) ...
    // ...ให้ "อัปเดต "ทุก"" (Update "Many") ... "ตัวเลือก" (Options) ...
    // ...ที่ "อยู่ "ใน"" (That "Belong to") ... "โพล "นี้"" (This "Poll") ... (`poll: pollId`) ...
    // ...โดย "ตั้งค่า" (Set) ... "Array "Votes"" (The "Votes" Array) ...
    // ...ให้ "กลายเป็น" (Into) ... "Array "ว่างเปล่า"" (An "Empty" Array) ... (`[]`))
    await PollOption.updateMany(
      { poll: pollId },
      { $set: { votes: [] } }
    );

    // 4. (ดึง "โพล" (Poll) ... "ทั้งหมด" (Full) ... (ที่ "อัปเดต" (Updated) ... (ว่างเปล่า (Empty)) ... แล้ว) ... "กลับไป" (Back))
    const updatedPoll = await Poll.findById(poll._id)
      .populate('author', 'name profileColor')
      .populate({ path: 'options', populate: { path: 'votes', select: 'name _id' } });

    res.json(updatedPoll);

  } catch (error) {
    console.error('PUT /:pollId/reset error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/polls/option/{optionId}:
 *   delete:
 *     summary: ลบตัวเลือกออกจาก Poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Poll Option
 *     responses:
 *       200:
 *         description: Poll updated
 *       401:
 *         description: Not authorized to delete this option
 *       404:
 *         description: Option or Poll not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ (API ใหม่!) DELETE /api/polls/option/:optionId
// (ลบ "ตัวเลือก" (Option) ออกจากโพล)
// -----------------------------------------------------------------
router.delete('/option/:optionId', protect, async (req, res) => {
  const { optionId } = req.params;
  const userId = req.user._id;

  try {
    // 1. หาตัวเลือก
    const option = await PollOption.findById(optionId);
    if (!option) return res.status(404).json({ message: 'Option not found' });

    // 2. หาโพลแม่ และ Event (เพื่อเช็คสิทธิ์)
    const poll = await Poll.findById(option.poll);
    const event = await Event.findById(poll.event);

    const isPollAuthor = poll.author.toString() === userId.toString();
    const isEventOwner = event.owner.toString() === userId.toString();

    // (อนุญาตให้ "คนสร้างโพล" หรือ "เจ้าของ Event" ลบได้)
    if (!isPollAuthor && !isEventOwner) {
      return res.status(401).json({ message: 'Not authorized to delete this option' });
    }

    // 3. ลบตัวเลือก
    await PollOption.findByIdAndDelete(optionId);

    // 4. เอา ID ออกจาก array ของโพลแม่
    poll.options.pull(optionId);
    await poll.save();

    // 5. ส่งโพลล่าสุดกลับไปอัปเดตหน้าจอ
    const updatedPoll = await Poll.findById(poll._id)
      .populate('author', 'name profileColor')
      .populate({ path: 'options', populate: { path: 'votes', select: 'name _id' } });

    res.json(updatedPoll);

  } catch (error) {
    console.error('DELETE /option/:optionId error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;