const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const Admin = mongoose.model('Admin', AdminSchema);

const seedAdmin = async () => {
    try {
        await mongoose.connect('mongodb+srv://oussama:sebrou@cluster0.abcde.mongodb.net/sanctuary_admin?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('monaliza12', salt);
        
        const superAdmin = new Admin({
            email: 'oussama.sebrou@gmail.com',
            password: hashedPassword,
            role: 'super_admin'
        });
        
        await superAdmin.save();
        console.log('Super Admin seeded successfully');
        process.exit();
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
};

// seedAdmin(); 
// Uncomment and run with node seed.js after updating MONGO_URI
