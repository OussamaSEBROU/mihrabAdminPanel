const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    autoSeedAdmin(); // تشغيل عملية إنشاء الأدمن تلقائياً بمجرد الاتصال
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, required: true },
  lastSync: { type: Date, default: Date.now },
  activeStatus: { type: String, default: 'Idle' },
  readingStats: {
    totalMinutes: { type: Number, default: 0 },
    dailyMinutes: { type: Map, of: Number },
    minutesPerBook: { type: Map, of: Number }
  },
  shelves: Array,
  books: Array,
  habit: Object
});

const User = mongoose.model('User', UserSchema);

const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const Admin = mongoose.model('Admin', AdminSchema);

// --- حماية: إنشاء السوبر أدمن تلقائياً ---
async function autoSeedAdmin() {
  try {
    const email = 'oussama.sebrou@gmail.com';
    const existing = await Admin.findOne({ email });
    if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('monaliza12', salt);
        const admin = new Admin({ email, password: hashedPassword, role: 'super_admin' });
        await admin.save();
        console.log('🛡️ Super Admin created successfully!');
    } else {
        console.log('🛡️ Admin account verified.');
    }
  } catch (err) {
    console.error('Error in auto-seeding:', err);
  }
}

// Admin Auth Routes
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).send('Invalid Credentials (User not found)');

    const validPass = await bcrypt.compare(password, admin.password);
    if (!validPass) return res.status(400).send('Invalid Credentials (Password mismatch)');

    const token = jwt.sign({ _id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'monaliza12_secret');
    res.json({ token, role: admin.role });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Sync from APK
app.post('/api/sync', async (req, res) => {
  const { deviceId, data } = req.body;
  try {
    await User.findOneAndUpdate(
        { deviceId },
        { ...data, lastSync: new Date() },
        { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Metrics & Users API for Admin
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send('Access Denied');
    try {
      req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret');
      next();
    } catch (err) { res.status(400).send('Invalid Token'); }
};

app.get('/api/admin/metrics', auth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeCount = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 60000) } });
  res.json({ totalUsers, activeCount });
});

app.get('/api/admin/users', auth, async (req, res) => {
  const users = await User.find().sort({ lastSync: -1 });
  res.json(users);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
