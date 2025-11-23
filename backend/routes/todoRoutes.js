const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');

const Todo = require('../models/todoModel.js'); // (Model "ใหม่")
const Event = require('../models/eventModel.js'); // (Model "Event" (Event))

// ( "ฟังก์ชัน "เช็ก "สิทธิ์"" (Permission "Check" Function) ... ( "จำเป็น" (Needed) ... "มาก" (Very)))
const checkEventAccess = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || (await Todo.findById(req.params.todoId))?.event;
    if (!eventId) return res.status(404).json({ message: 'Resource not found' });
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const isOwner = event.owner.toString() === req.user._id.toString();
    const isAcceptedGuest = event.guests.find(g => 
      g.email === req.user.email.toLowerCase() && g.status === 'accepted'
    );

    // ("เฉพาะ" (ONLY) ... "Owner" (เจ้าของ) ... "หรือ" (OR) ... "แขก" (Accepted Guest) ... "ที่ "มีสิทธิ์"" (Have "Permission"))
    if (!isOwner && !isAcceptedGuest) {
      return res.status(401).json({ message: 'Not authorized for this task' });
    }
    
    req.event = event; // ( "ส่ง" (Pass) ... "Event" (Event) ... "ไป" (Go) ... "ต่อ" (Next))
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @swagger
 * tags:
 *   - name: Todos
 *   description: ระบบจัดการงานย่อย (Tasks)
 */

/**
 * @swagger
 * /api/todos/{eventId}:
 *   get:
 *     summary: ดึงงานย่อยทั้งหมดของ Event
 *     tags: [Todos]
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
 *         description: รายการงานย่อย
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ GET /api/todos/:eventId
// (ดึง "งานย่อย" (Tasks) ... "ทั้งหมด" (All) ... "ของ" (Of) ... "Event" (Event) ... "นี้" (This))
// -----------------------------------------------------------------
router.get('/:eventId', protect, checkEventAccess, async (req, res) => {
  try {
    const todos = await Todo.find({ event: req.params.eventId })
      .populate('author', 'name profileColor')
      .sort({ createdAt: 'asc' });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/todos/{eventId}:
*   post:
 *     summary: สร้างงานย่อยใหม่สำหรับ Event
 *     tags: [Todos]
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
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: ข้อความของงานย่อย
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Task text is required
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ POST /api/todos/:eventId
// ( "สร้าง" (Create) ... "งานย่อย" (Task) ... "ใหม่" (New))
// -----------------------------------------------------------------
router.post('/:eventId', protect, checkEventAccess, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Task text is required' });
  }
  try {
    const todo = new Todo({
      event: req.params.eventId,
      author: req.user._id,
      text: text,
      isCompleted: false
    });
    const createdTodo = await todo.save();
    const populatedTodo = await Todo.findById(createdTodo._id)
      .populate('author', 'name profileColor');
      
    res.status(201).json(populatedTodo);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/todos/{todoId}/toggle:
 *   put:
 *     summary: ติ๊ก/สลับสถานะงานย่อย (เสร็จ/ไม่เสร็จ)
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: todoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Task
 *     responses:
 *       200:
 *         description: Task updated
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ PUT /api/todos/:todoId/toggle
// ( "ติ๊ก" (Toggle) ... "สถานะ" (Status) ... "เสร็จ" (Complete) / "ไม่เสร็จ" (Incomplete))
// -----------------------------------------------------------------
router.put('/:todoId/toggle', protect, checkEventAccess, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.todoId);
    if (!todo) return res.status(404).json({ message: 'Task not found' });

    // ( "สลับ" (Toggle) ... "สถานะ" (Status))
    todo.isCompleted = !todo.isCompleted;
    await todo.save();
    
    const populatedTodo = await Todo.findById(todo._id)
      .populate('author', 'name profileColor');
      
    res.json(populatedTodo);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

/**
 * @swagger
 * /api/todos/{todoId}:
 *   delete:
 *     summary: ลบงานย่อย
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: todoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID ของ Task
 *     responses:
 *       200:
 *         description: Task removed
 *       401:
 *         description: Not authorized to delete this task
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server Error
 */

// -----------------------------------------------------------------
// ⭐️ DELETE /api/todos/:todoId
// ( "ลบ" (Delete) ... "งานย่อย" (Task))
// -----------------------------------------------------------------
router.delete('/:todoId', protect, checkEventAccess, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.todoId);
    if (!todo) return res.status(404).json({ message: 'Task not found' });

    // ( "เฉพาะ" (ONLY) ... "เจ้าของ "Event"" (Event "Owner") ... "หรือ" (OR) ... "คน "สร้าง" "งาน"" (Task "Author") ... "ที่ "ลบ"" (Can "Delete") ... "ได้")
    const isEventOwner = req.event.owner.toString() === req.user._id.toString();
    const isTaskAuthor = todo.author.toString() === req.user._id.toString();

    if (!isEventOwner && !isTaskAuthor) {
      return res.status(401).json({ message: 'Not authorized to delete this task' });
    }

    await todo.deleteOne();
    res.json({ message: 'Task removed' });
    
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});


module.exports = router;