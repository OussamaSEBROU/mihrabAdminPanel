/* 
 * SANCTUARY FINAL SERVER (v2.1) - UNIFIED ROUTES
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

// --- الـ Routes الموحدة ---

// المزامنة (APK Sync)
app.post(['/api/sync', '/sync'], async (req, res) => {
  const { deviceId, data } = req.body;
  await User.findOneAndUpdate({ deviceId }, { ...data, lastSync: new Date() }, { upsert: true });
  res.json({ success: true });
});

// تسجيل الدخول
app.post(['/api/admin/login', '/admin/login'], async (req, res) => {
    const admin = await Admin.findOne({ email: req.body.email });
    if (admin && await bcrypt.compare(req.body.password, admin.password)) {
        const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET || 'monaliza12_secret');
        res.json({ token });
    } else res.status(400).send('Invalid');
});

// جلب المستخدمين (Users Explorer)
app.get(['/api/admin/users', '/admin/users'], auth, async (req, res) => {
    const users = await User.find().sort({ lastSync: -1 });
    res.json(users);
});

// ميتريكس الذكاء (Detailed Metrics)
app.get(['/api/admin/metrics', '/admin/metrics', '/api/admin/detailed-metrics', '/admin/detailed-metrics'], auth, async (req, res) => {
    const totalInstalls = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 86400000) } });
    const likelyUninstalled = await User.countDocuments({ lastSync: { $lte: new Date(Date.now() - (30 * 86400000)) } });
    res.json({ totalInstalls, activeToday, likelyUninstalled });
});

app.get('/', (req, res) => res.send('Sanctuary Neural Engine is Live!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('🚀 Unified Server Engine v2.1 Active'));
