/* 
 * SANCTUARY ADMIN BACKEND v4.0 — PRECISION SYNC ENGINE
 * Full compatibility with Mihrab APK syncBridge.ts
 * Tracks: books, shelves, reading minutes, last read, app updates, geolocation
 */
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Cloud'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===== DIAGNOSTIC ENDPOINT =====
app.get('/', (req, res) => {
    res.send(`🚀 Mihrab Backend v4.0 is ALIVE! <br> Time: ${new Date().toISOString()} <br> Status: Database Connected`);
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'online', message: 'API is reachable', timestamp: new Date() });
});

// ===== ENHANCED USER SCHEMA — Matches APK syncBridge payload exactly =====
const BookSubSchema = new mongoose.Schema({
  id: String,
  title: String,
  shelfId: String,
  author: String,
  stars: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  dailyTimeSeconds: { type: Number, default: 0 },
  lastReadDate: String,
  lastReadAt: Number,
  addedAt: Number
}, { _id: false });

const ShelfSubSchema = new mongoose.Schema({
  id: String,
  name: String,
  color: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, index: true },
  installDate: { type: Date, default: Date.now },
  lastSync: { type: Date, default: Date.now },
  activeStatus: { type: String, default: 'Idle' },
  
  // Precise book-level tracking
  books: [BookSubSchema],
  shelves: [ShelfSubSchema],
  
  // Aggregated reading stats
  readingStats: {
    totalMinutes: { type: Number, default: 0 },
    minutesPerBook: { type: Map, of: Number, default: {} }
  },
  
  // Activity history log
  activityHistory: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }],
  
  // App version & update tracking
  appVersion: { type: String, default: 'unknown' },
  lastAppUpdate: Date,
  hasUpdated: { type: Boolean, default: false },
  
  // Download tracking
  totalDownloads: { type: Number, default: 0 },
  downloadHistory: [{
    bookTitle: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Geolocation (approximate)
  location: {
    country: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number,
    timezone: String
  },
  
  // Platform info
  platform: { type: String, default: 'unknown' },
  osVersion: String
});

const User = mongoose.model('User', UserSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({ 
  email: String, 
  password: { type: String },
  role: { type: String, default: 'admin' }
}));

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    try { req.admin = jwt.verify(token, process.env.JWT_SECRET || 'monaliza12_secret'); next(); } catch (err) { res.status(401).send('Unauthorized'); }
};

// ===== DATABASE CLEANUP & PRECISION FIX =====
const cleanupData = async () => {
    try {
        const users = await User.find({});
        for (let user of users) {
            if (user.readingStats && user.readingStats.totalMinutes % 1 !== 0) {
                user.readingStats.totalMinutes = Math.round(user.readingStats.totalMinutes);
                await user.save();
            }
        }
        console.log('✅ Data precision cleanup completed');
    } catch (e) {}
};
cleanupData();

// ===== GEO-IP LOOKUP (Free, no API key needed) =====
const getGeoFromIP = async (ip) => {
    try {
        const cleanIP = ip === '::1' || ip === '127.0.0.1' ? '' : ip.split(',')[0].replace('::ffff:', '').trim();
        if (!cleanIP) return null;
        
        // Use timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=country,city,regionName,lat,lon,timezone`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.country) {
                return {
                    country: data.country,
                    city: data.city,
                    region: data.regionName,
                    lat: data.lat,
                    lon: data.lon,
                    timezone: data.timezone
                };
            }
        }
    } catch (e) {
        console.error('Geo lookup failed:', e.message);
    }
    return null;
};

// --- الدعم الشامل لكل المسارات (Universal Routing) ---

// ===== PRECISION SYNC ENDPOINT — Handles all APK data =====
app.post(['/api/sync', '/sync'], async (req, res) => {
    try {
        const { deviceId, data } = req.body;
        if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

        const now = new Date();
        
        // Build the update object with precision mapping
        const updateData = {
            lastSync: now,
            activeStatus: data?.activeStatus || 'Idle'
        };
        
        // === BOOKS: Full precision sync ===
        if (data?.books && Array.isArray(data.books)) {
            updateData.books = data.books.map(b => ({
                id: b.id || '',
                title: b.title || 'Untitled',
                shelfId: b.shelfId || 'default',
                author: b.author || '',
                stars: b.stars || 0,
                timeSpentSeconds: b.timeSpentSeconds || 0,
                dailyTimeSeconds: b.dailyTimeSeconds || 0,
                lastReadDate: b.lastReadDate || '',
                lastReadAt: b.lastReadAt || 0,
                addedAt: b.addedAt || Date.now()
            }));
            
            // Build minutesPerBook map
            const minutesPerBook = {};
            data.books.forEach(b => {
                if (b.title) {
                    minutesPerBook[b.title] = Math.round((b.timeSpentSeconds || 0) / 60);
                }
            });
            
            // Calculate total reading from actual book data (not from client-reported)
            const totalSeconds = data.books.reduce((acc, b) => acc + (b.timeSpentSeconds || 0), 0);
            updateData.readingStats = {
                totalMinutes: Math.floor(totalSeconds / 60),
                minutesPerBook
            };
        }
        
        // === SHELVES: Full sync ===
        if (data?.shelves && Array.isArray(data.shelves)) {
            updateData.shelves = data.shelves.map(s => ({
                id: s.id || '',
                name: s.name || 'Unnamed Shelf',
                color: s.color || '#ff0000'
            }));
        }
        
        // === Reading stats fallback (if sent without books) ===
        if (data?.readingStats && !data?.books) {
            updateData.readingStats = {
                totalMinutes: data.readingStats.totalMinutes || 0,
                minutesPerBook: data.readingStats.minutesPerBook || {}
            };
        }
        
        // === App version tracking ===
        if (data?.appVersion) {
            updateData.appVersion = data.appVersion;
            updateData.lastAppUpdate = now;
            updateData.hasUpdated = true;
        }
        
        // === Platform info ===
        if (data?.platform) updateData.platform = data.platform;
        if (data?.osVersion) updateData.osVersion = data.osVersion;
        
        // === Download tracking ===
        if (data?.newDownload) {
            updateData.$inc = { totalDownloads: 1 };
            updateData.$push = { 
                downloadHistory: { 
                    bookTitle: data.newDownload, 
                    timestamp: now 
                } 
            };
        }
        
        // === Activity history logging ===
        const activityEntry = {
            action: data?.activeStatus || 'sync',
            timestamp: now,
            details: data?.books ? `${data.books.length} books synced` : 'heartbeat'
        };
        
        // === Geolocation from IP ===
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        const geo = await getGeoFromIP(clientIP);
        if (geo) {
            updateData.location = geo;
        }
        
        // Separate $set from $push/$inc operations
        const setData = { ...updateData };
        delete setData.$inc;
        delete setData.$push;
        
        const updateOps = { $set: setData };
        
        if (updateData.$inc) {
            updateOps.$inc = updateData.$inc;
        }
        
        // Always push activity history
        updateOps.$push = {
            ...(updateData.$push || {}),
            activityHistory: {
                $each: [activityEntry],
                $slice: -100 // Keep last 100 activities
            }
        };
        
        await User.findOneAndUpdate(
            { deviceId }, 
            updateOps, 
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        res.json({ success: true, syncedAt: now.toISOString() });
    } catch (err) {
        console.error('Sync error:', err);
        res.json({ success: false, error: err.message });
    }
});

// ===== ADMIN LOGIN =====
app.post(['/api/admin/login', '/admin/login'], async (req, res) => {
    try {
        const admin = await Admin.findOne({ email: req.body.email });
        if (admin && await bcrypt.compare(req.body.password, admin.password)) {
            res.json({ 
                token: jwt.sign({ _id: admin._id }, process.env.JWT_SECRET || 'monaliza12_secret'),
                role: admin.role || 'admin'
            });
        } else res.status(400).send('Invalid');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ===== USERS LIST — Full precision data =====
app.get(['/api/admin/users', '/admin/users'], auth, async (req, res) => {
    try {
        const users = await User.find().sort({ lastSync: -1 }).lean();
        res.json(users);
    } catch (err) {
        res.status(500).json([]);
    }
});

// ===== SINGLE USER DETAIL =====
app.get(['/api/admin/users/:deviceId', '/admin/users/:deviceId'], auth, async (req, res) => {
    try {
        const user = await User.findOne({ deviceId: req.params.deviceId }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== METRICS DASHBOARD =====
app.get(['/api/admin/metrics', '/admin/metrics'], auth, async (req, res) => {
    try {
        const totalInstalls = await User.countDocuments();
        const now = Date.now();
        const activeToday = await User.countDocuments({ lastSync: { $gte: new Date(now - 86400000) } });
        const activeThisWeek = await User.countDocuments({ lastSync: { $gte: new Date(now - 604800000) } });
        const activeNow = await User.countDocuments({ lastSync: { $gte: new Date(now - 600000) } }); // 10 min
        
        // Aggregate total reading minutes across all users
        const allUsers = await User.find({}, 'readingStats books').lean();
        let globalMinutes = 0;
        let globalBooks = 0;
        let globalShelves = 0;
        let updatedUsers = 0;
        
        allUsers.forEach(u => {
            globalMinutes += u.readingStats?.totalMinutes || 0;
            globalBooks += u.books?.length || 0;
            updatedUsers += (u.hasUpdated ? 1 : 0);
        });
        
        const shelvesAgg = await User.aggregate([
            { $project: { shelvesCount: { $size: { $ifNull: ['$shelves', []] } } } },
            { $group: { _id: null, total: { $sum: '$shelvesCount' } } }
        ]);
        globalShelves = shelvesAgg[0]?.total || 0;
        
        res.json({ 
            totalInstalls, 
            activeToday, 
            activeThisWeek,
            activeNow,
            globalMinutes,
            globalBooks,
            globalShelves,
            updatedUsers
        });
    } catch (err) {
        res.status(500).json({ totalInstalls: 0, activeToday: 0 });
    }
});

// ===== GLOBAL INSIGHTS — Top books, reading trends =====
app.get(['/api/admin/global-insights', '/admin/global-insights'], auth, async (req, res) => {
    try {
        const users = await User.find().lean();
        let allBooks = {};
        let bookLastRead = {};
        
        users.forEach(u => {
            u.books?.forEach(b => {
                const title = b.title || 'Unknown';
                if (!allBooks[title]) allBooks[title] = 0;
                allBooks[title] += Math.round((b.timeSpentSeconds || 0) / 60);
                
                // Track last read time
                if (!bookLastRead[title] || (b.lastReadAt && b.lastReadAt > bookLastRead[title])) {
                    bookLastRead[title] = b.lastReadAt || 0;
                }
            });
        });
        
        const topBooks = Object.entries(allBooks)
            .sort(([,a],[,b]) => b - a)
            .slice(0, 20)
            .map(([title, minutes]) => ({
                title, 
                minutes,
                lastRead: bookLastRead[title] ? new Date(bookLastRead[title]).toISOString() : null
            }));
        
        // Active user map
        const mapNodes = users.map(u => ({ 
            id: u.deviceId, 
            active: (Date.now() - new Date(u.lastSync).getTime()) < 600000,
            location: u.location || null
        }));
        
        // Reading distribution by hour (from activity history)
        const hourDistribution = new Array(24).fill(0);
        users.forEach(u => {
            u.activityHistory?.forEach(a => {
                if (a.action?.startsWith('Reading:')) {
                    const hour = new Date(a.timestamp).getHours();
                    hourDistribution[hour]++;
                }
            });
        });
        
        res.json({ topBooks, mapNodes, hourDistribution });
    } catch (err) {
        res.status(500).json({ topBooks: [], mapNodes: [] });
    }
});

// ===== DELETE USER =====
app.delete(['/api/admin/users/:deviceId', '/admin/users/:deviceId'], auth, async (req, res) => {
    try {
        await User.deleteOne({ deviceId: req.params.deviceId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 5000, () => console.log('🚀 Sanctuary Precision Engine v4.0 Active'));
