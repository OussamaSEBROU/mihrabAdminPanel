const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    autoSeedAdmin();
  })
  .catch(err => console.error('❌ DB Connection Error:', err.message));

// Schemas
const User = mongoose.model('User', new mongoose.Schema({
  deviceId: { type: String, unique: true },
  lastSync: { type: Date, default: Date.now },
  activeStatus: { type: String, default: 'Idle' },
  readingStats: { totalMinutes: { type: Number, default: 0 } },
  shelves: Array, books: Array, habit: Object
}));

const Admin = mongoose.model('Admin', new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
}));

// دالة إنشاء الأدمن تلقائياً
async function autoSeedAdmin() {
  const email = 'oussama.sebrou@gmail.com';
  const existing = await Admin.findOne({ email });
  if (!existing) {
      const hashedPassword = await bcrypt.hash('monaliza12', 10);
      await new Admin({ email, password: hashedPassword, role: 'super_admin' }).save();
      console.log('🛡️ Admin seeded successfully.');
  }
}

// Middleware للتحقق من التوكن
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send('Access Denied');
    try {
      req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret');
      next();
    } catch (err) { res.status(401).send('Invalid Token'); }
};

// --- الـ Routes (لاحظ أننا جعلناها تدعم المسارات بوضوح) ---

// 1. تسجيل الدخول
app.post(['/api/admin/login', '/admin/login'], async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(400).send('User not found');
  const validPass = await bcrypt.compare(password, admin.password);
  if (!validPass) return res.status(400).send('Invalid Password');
  const token = jwt.sign({ _id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'monaliza12_secret');
  res.json({ token, role: admin.role });
});

// 2. المزامنة (APK Sync)
app.post(['/api/sync', '/sync'], async (req, res) => {
  const { deviceId, data } = req.body;
  await User.findOneAndUpdate({ deviceId }, { ...data, lastSync: new Date() }, { upsert: true });
  res.json({ success: true });
});

// 3. الإحصائيات (Metrics)
app.get(['/api/admin/metrics', '/admin/metrics'], auth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeCount = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 60000) } });
  res.json({ totalUsers, activeCount });
});

// 4. قائمة المستخدمين
app.get(['/api/admin/users', '/admin/users'], auth, async (req, res) => {
  const users = await User.find().sort({ lastSync: -1 });
  res.json(users);
});

// اختبار عمل السيرفر عند فتحه بالمتصفح مباشرة
app.get('/', (req, res) => res.send('🚀 Sanctuary Backend is Live!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API Running on port ${PORT}`));
