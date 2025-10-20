require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatnow';

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin kullanıcısı zaten mevcut');
      console.log('Username: admin');
      console.log('Şifreyi değiştirmek için veritabanından silin ve tekrar çalıştırın');
      process.exit(0);
    }

    // Create admin
    const admin = new Admin({
      username: 'admin',
      password: 'admin123', // Bu şifreyi değiştirmeyi unutmayın!
      email: 'admin@chatnow.com',
      role: 'super_admin'
    });

    await admin.save();
    
    console.log('');
    console.log('🎉 Admin kullanıcısı başarıyla oluşturuldu!');
    console.log('');
    console.log('📋 Giriş Bilgileri:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  GÜVENLİK: İlk girişten sonra şifrenizi değiştirin!');
    console.log('🌐 Admin Panel: http://localhost:3000/admin');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createAdmin();

