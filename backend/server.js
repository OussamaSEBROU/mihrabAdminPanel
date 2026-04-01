/* 
 * SANCTUARY TOTAL RECOVERY (v2.3) - FULL COMPATIBILITY
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
  shelves: Array, books: Array, activityHistory: Array
});

const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({ email: String, password: { type: String } }));

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    try { req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret'); next(); } catch (err) { res.status(401).send('Unauthorized'); }
};

// --- الدعم الشامل لكل المسارات (Universal Routing) ---

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
        res.json({ token: jwt.sign({ _id: admin._id }, process.env.JWT_SECRET || 'monaliza12_secret') });
    } else res.status(400).send('Invalid');
});

// قائمة المستخدمين
app.get(['/api/admin/users', '/admin/users'], auth, async (req, res) => {
    res.json(await User.find().sort({ lastSync: -1 }));
});

// الميتريكس
app.get(['/api/admin/metrics', '/admin/metrics'], auth, async (req, res) => {
    const totalInstalls = await User.countDocuments();
    const activeToday = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 86400000) } });
    res.json({ totalInstalls, activeToday });
});

// الإحصائيات العالمية
app.get(['/api/admin/global-insights', '/admin/global-insights'], auth, async (req, res) => {
    const users = await User.find();
    let allBooks = {};
    users.forEach(u => {
        u.books?.forEach(b => {
             if (!allBooks[b.title]) allBooks[b.title] = 0;
             allBooks[b.title] += Math.round((b.timeSpentSeconds || 0) / 60);
        });
    });
    const topBooks = Object.entries(allBooks).sort(([,a],[,b])=>b-a).slice(0,10).map(([title, minutes])=>({title, minutes}));
    const mapNodes = users.map(u => ({ id: u.deviceId, active: (new Date() - new Date(u.lastSync)) < 600000 }));
    res.json({ topBooks, mapNodes });
});

app.listen(process.env.PORT || 5000, () => console.log('🚀 Recovery Engine v2.3 Active'));
