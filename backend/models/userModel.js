const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  profileColor: {
    type: String,
    default: '#1890ff' // (Default = สีฟ้าของ AntD)
  },
  lineUserId: { type: String, unique: true, sparse: true },
});

// Middleware: เข้ารหัสผ่านก่อนบันทึก
userSchema.pre('save', async function (next) {
  // ( "ถ้า" (IF) ... "รหัส" (Password) ... "ไม่" (NOT) ... "ถูก "แก้"" (Modified))
  if (!this.isModified('password')) { 
    return next(); // ( "ข้าม" (Skip) ... "ไป" (Go) ... ( "แบบ "ปลอดภัย"" (Safely)))
  }
  
  // ( "ถ้า" (IF) ... "รหัส" (Password) ... "ถูก "แก้"" (IS "Modified"))
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt); // ( "แฮช" (Hash) ... "รหัส "ใหม่"" (New "Password"))
    
    // --- 👇👇👇 ( "เพิ่ม" (Add) ... "บรรทัด" (Line) ... "นี้" (This) ... "ครับ!) 👇👇👇 ---
    return next(); // ( "บอก" (Tell) ... "Mongoose" (Mongoose) ... "ว่า "ไป "ต่อ"" (To "Continue") ... "ได้" (Able to))
    // --- 👆👆👆 (จบส่วนที่ "เพิ่ม" (Add)) 👆👆👆 ---

  } catch (error) {
    return next(error); // ( "ส่ง" (Pass) ... "Error" (Error) ... "ไป" (Go) ... "ถ้า" (If) ... "Bcrypt "พัง"" (Bcrypt "Fails"))
  }
});

// Method: สำหรับเปรียบเทียบรหัสผ่านตอน Login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;