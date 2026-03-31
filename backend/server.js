const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات مع طباعة تفصيلية للخطأ
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('CRITICAL: MONGO_URI is not defined in Render environment!');
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Successfully');
    autoSeedAdmin();
  })
  .catch(err => {
    console.error('❌ DATABASE CONNECTION ERROR:', err.message);
  });

// ... (نفس السكيمات السابقة) ...
const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});
const Admin = mongoose.model('Admin', AdminSchema);

async function autoSeedAdmin() {
  try {
    const email = 'oussama.sebrou@gmail.com';
    const existing = await Admin.findOne({ email });
    if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('monaliza12', salt);
        await new Admin({ email, password: hashedPassword, role: 'super_admin' }).save();
        console.log('🛡️ Super Admin logic finished.');
    }
  } catch (err) { console.error('Seed Error:', err.message); }
}

// تعديل اللوجن لطباعة الخطأ الحقيقي
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).send('Invalid Credentials (User not found)');

    const validPass = await bcrypt.compare(password, admin.password);
    if (!validPass) return res.status(400).send('Invalid Credentials (Password mismatch)');

    const token = jwt.sign({ _id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'monaliza12_secret');
    res.json({ token, role: admin.role });
  } catch (err) {
    console.error('Login Route Error:', err.message); // هذا السطر سيخبرنا بالسبب الحقيقي في الـ Logs
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ... باقي المسارات السابقة ...
app.get('/', (req, res) => res.send('Sanctuary API is Running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
