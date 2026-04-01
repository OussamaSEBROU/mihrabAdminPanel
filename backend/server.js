/* 
 * SANCTUARY INTELLIGENCE SERVER (v2.2) - GLOBAL ANALYTICS
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

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true },
  installDate: { type: Date, default: Date.now },
  lastSync: { type: Date, default: Date.now },
  activeStatus: { type: String },
  readingStats: { totalMinutes: Number, minutesPerBook: Map },
  shelves: Array,
  books: Array,
  activityHistory: Array
});

const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({ email: String, password: { type: String } }));

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    try { req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret'); next(); } catch (err) { res.status(401).send('Unauthorized'); }
};

// --- API المزامنة ---
app.post(['/api/sync', '/sync'], async (req, res) => {
  const { deviceId, data } = req.body;
  await User.findOneAndUpdate({ deviceId }, { ...data, lastSync: new Date() }, { upsert: true });
  res.json({ success: true });
});

// --- API الإحصائيات العالمية الجديدة ---
app.get('/api/admin/global-insights', auth, async (req, res) => {
    const users = await User.find();
    
    // 1- حساب "أكثر 10 كتب قراءة" عبر كل المستخدمين
    let allBooks = {};
    users.forEach(u => {
        u.books?.forEach(b => {
             if (!allBooks[b.title]) allBooks[b.title] = 0;
             allBooks[b.title] += Math.round((b.timeSpentSeconds || 0) / 60);
        });
    });

    const topBooks = Object.entries(allBooks)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([title, minutes]) => ({ title, minutes }));

    // 2- بيانات الخريطة (نقاط نشطة مبنية على أجهزة المستخدمين)
    const mapNodes = users.map(u => ({
        id: u.deviceId,
        active: (new Date() - new Date(u.lastSync)) < (10 * 60 * 1000) // نشط في آخر 10 دقائق
    }));

    res.json({ topBooks, mapNodes, totalUsers: users.length });
});

// تسجيل الدخول، جلب المستخدمين، والميتريكس الأساسية (كما هي بلا تغيير)...
app.post('/admin/login', async (req, res) => {
    const admin = await Admin.findOne({ email: req.body.email });
    if (admin && await bcrypt.compare(req.body.password, admin.password)) {
        res.json({ token: jwt.sign({ _id: admin._id }, process.env.JWT_SECRET || 'monaliza12_secret') });
    } else res.status(400).send('Invalid');
});
app.get('/admin/users', auth, async (req, res) => res.json(await User.find().sort({ lastSync: -1 })));
app.get('/admin/metrics', auth, async (req, res) => {
    const totalInstalls = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 86400000) } });
    res.json({ totalInstalls, activeToday });
});

app.listen(process.env.PORT || 5000, () => console.log('🚀 Intelligence v2.2 Live'));
