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
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sanctuary_admin')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, required: true },
  lastSync: { type: Date, default: Date.now },
  installDate: { type: Date, default: Date.now },
  activeStatus: { type: String, default: 'Idle' },
  readingStats: {
    totalMinutes: { type: Number, default: 0 },
    dailyMinutes: { type: Map, of: Number }, // { "2026-03-31": 15 }
    minutesPerBook: { type: Map, of: Number }, // { "bookId": 45 }
    lastReadDate: String
  },
  shelves: [{ id: String, name: String, color: String }],
  books: [{
    id: String,
    title: String,
    author: String,
    stars: Number,
    lastReadAt: Number,
    addedAt: Number
  }],
  habit: {
    streak: Number,
    shields: Number,
    history: [String],
    missedDays: [String]
  },
  events: [{
    type: { type: String, enum: ['install', 'uninstall', 'share', 'export', 'read'] },
    timestamp: { type: Date, default: Date.now },
    metadata: Object
  }]
});

const User = mongoose.model('User', UserSchema);

const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const Admin = mongoose.model('Admin', AdminSchema);

// Admin Middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access Denied');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret');
    req.admin = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

// --- API Routes ---

// Sync from APK (Secure with APK key)
app.post('/api/sync', async (req, res) => {
  const { deviceId, data } = req.body;
  if (!deviceId) return res.status(400).send('Missing deviceId');

  try {
    let user = await User.findOne({ deviceId });
    if (!user) {
      user = new User({ deviceId, events: [{ type: 'install', timestamp: new Date() }] });
    }

    user.lastSync = new Date();
    user.activeStatus = data.activeStatus || 'Idle';
    user.shelves = data.shelves || [];
    user.books = data.books || [];
    user.habit = data.habit || {};
    
    // Update aggregate stats
    if (data.readingUpdate) {
      const { seconds, bookId, bookTitle } = data.readingUpdate;
      const minutes = seconds / 60;
      user.readingStats.totalMinutes += minutes;
      
      const today = new Date().toISOString().split('T')[0];
      const dailyMap = user.readingStats.dailyMinutes || new Map();
      dailyMap.set(today, (dailyMap.get(today) || 0) + minutes);
      user.readingStats.dailyMinutes = dailyMap;

      const bookMap = user.readingStats.minutesPerBook || new Map();
      bookMap.set(bookId, (bookMap.get(bookId) || 0) + minutes);
      user.readingStats.minutesPerBook = bookMap;

      user.events.push({ type: 'read', metadata: { bookTitle, minutes } });
    }

    await user.save();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync Failed' });
  }
});

// Admin Auth
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(400).send('Invalid Credentials');

  const validPass = await bcrypt.compare(password, admin.password);
  if (!validPass) return res.status(400).send('Invalid Credentials');

  const token = jwt.sign({ _id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'monaliza12_secret');
  res.header('Authorization', token).send({ token, role: admin.role });
});

// Create Admin (Super Admin only)
app.post('/api/admin/manage', auth, async (req, res) => {
  if (req.admin.role !== 'super_admin') return res.status(403).send('Unauthorized');
  
  const { email, password, role } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newAdmin = new Admin({ email, password: hashedPassword, role });
  await newAdmin.save();
  res.send('Admin created');
});

// Metrics
app.get('/api/admin/metrics', auth, async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeCount = await User.countDocuments({ lastSync: { $gte: new Date(Date.now() - 30000) } }); // Active in last 30s
  
  const stats = await User.aggregate([
    { $group: { _id: null, totalMinutes: { $sum: "$readingStats.totalMinutes" } } }
  ]);

  res.json({
    totalUsers,
    activeCount,
    totalMinutes: stats[0]?.totalMinutes || 0
  });
});

// User List
app.get('/api/admin/users', auth, async (req, res) => {
  const users = await User.find().sort({ lastSync: -1 });
  res.json(users);
});

// Export Data
app.get('/api/admin/export', auth, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
