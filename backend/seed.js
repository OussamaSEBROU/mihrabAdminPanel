/* 
 * SANCTUARY ADMIN SEED SCRIPT
 * ----------------------------
 * هذا الملف يقوم بإنشاء حساب السوبر أدمن الوحيد في قاعدة بياناتك.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// تعريف هيكل الأدمن (Admin Schema)
const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const Admin = mongoose.model('Admin', AdminSchema);

const seedAdmin = async () => {
    try {
        // الاتصال بقاعدة البيانات باستخدام المفتاح الذي وضعته في Render
        // إذا كنت تشغله محلياً، تأكد من وضع الرابط أو استخدام .env
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI) {
            console.error('ERROR: MONGO_URI is not defined in environment variables!');
            process.exit(1);
        }

        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB Atlas Successfully');
        
        // التحقق مما إذا كان المستخدم موجوداً بالفعل لتجنب التكرار
        const existingAdmin = await Admin.findOne({ email: 'oussama.sebrou@gmail.com' });
        if (existingAdmin) {
            console.log('Admin already exists! Skipping seed.');
            process.exit();
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('monaliza12', salt);
        
        // إنشاء السوبر أدمن الجديد
        const superAdmin = new Admin({
            email: 'oussama.sebrou@gmail.com',
            password: hashedPassword,
            role: 'super_admin'
        });
        
        await superAdmin.save();
        console.log('--------------------------------------------------');
        console.log('DONE: Super Admin seeded successfully');
        console.log('Email: oussama.sebrou@gmail.com');
        console.log('Password: monaliza12');
        console.log('--------------------------------------------------');
        process.exit();
        
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
};

// تشغيل الدالة
seedAdmin();
