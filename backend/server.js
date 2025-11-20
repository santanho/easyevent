const express = require('express');
const connectDB = require('./config/db.js');

const authRoutes = require('./routes/authRoutes.js');
const eventRoutes = require('./routes/eventRoutes.js');
const userRoutes = require('./routes/userRoutes.js'); 
const webhookRoutes = require('./routes/webhookRoutes.js');
const commentRoutes = require('./routes/commentRoutes.js');
const pollRoutes = require('./routes/pollRoutes.js');
const todoRoutes = require('./routes/todoRoutes.js');

require('dotenv').config();

// เชื่อมต่อ Database
connectDB();

const app = express();
const cors = require('cors');


// Middleware: ทำให้ Express อ่าน JSON จาก body ของ Request ได้
app.use(express.json());
app.use(cors());

// === กำหนด API Routes ===
app.use('/api/auth', authRoutes);     // Routes สำหรับ Login/Register
app.use('/api/events', eventRoutes); // Routes สำหรับจัดการ Event (ใช้ JWT)
app.use('/api/users', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/todos', todoRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});