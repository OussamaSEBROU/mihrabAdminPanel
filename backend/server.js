/* 
 * SANCTUARY DEEP ANALYTICS ENGINE (v2.0)
 */
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Deep Analytics DB Connected'));

// مخطط المستخدم الموسع
const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true },
  installDate: { type: Date, default: Date.now }, // تاريخ التسطيب
  lastSync: { type: Date, default: Date.now },
  activeStatus: { type: String, default: 'Stationary' },
  readingStats: {
    totalMinutes: { type: Number, default: 0 },
    minutesPerBook: { type: Map, of: Number } // جرد الدقائق لكل كتاب
  },
  shelves: [{ id: String, name: String, color: String }], // الرفوف الحقيقية
  books: [{ 
    id: String, 
    title: String, 
    shelfId: String, 
    stars: Number, 
    timeSpentSeconds: Number // دقائق كل كتاب
  }],
  actionLogs: [{ type: String, date: { type: Date, default: Date.now } }], // سجل ما شارك واستصدر
  activityHistory: [{ // لحساب أوقات الذروة
    hour: Number, // من 0-23
    day: Number,  // 1-7
    minutes: Number
  }]
});

const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({ email: { type: String, unique: true }, password: { type: String } }));

// Middleware & Auth... (نفس الكود السابق)
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    try { req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret'); next(); } catch (err) { res.status(401).send('Unauthorized'); }
};

// --- API المزامنة العميق ---
app.post(['/api/sync', '/sync'], async (req, res) => {
  const { deviceId, data } = req.body;
  const now = new Date();
  
  // تحديث بيانات النشاط (أوقات الذروة)
  const activityUpdate = { hour: now.getHours(), day: now.getDay(), minutes: data.readingStats?.totalMinutes || 0 };

  await User.findOneAndUpdate(
    { deviceId },
    { 
      ...data, 
      lastSync: now, 
      $push: { activityHistory: activityUpdate } 
    },
    { upsert: true, new: true }
  );
  res.json({ success: true });
});

// ميتريكس مفصلة للوحة التحكم
app.get('/api/admin/detailed-metrics', auth, async (req, res) => {
    const totalInstalls = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 86400000) } });
    
    // حساب الـ Uninstalls (المستخدمين الذين غابوا أكثر من 30 يوم)
    const likelyUninstalled = await User.countDocuments({ lastSync: { $lte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) } });

    res.json({ totalInstalls, activeToday, likelyUninstalled });
});

app.get('/api/admin/users', auth, async (req, res) => {
    const users = await User.find().sort({ lastSync: -1 });
    res.json(users);
});

app.post('/api/admin/login', async (req, res) => {
    const admin = await Admin.findOne({ email: req.body.email });
    if (admin && await bcrypt.compare(req.body.password, admin.password)) {
        const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET || 'monaliza12_secret');
        res.json({ token });
    } else res.status(400).send('Invalid');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('🚀 Analytics Engine v2 Running'));
