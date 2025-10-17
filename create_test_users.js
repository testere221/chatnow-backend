// Test kullanıcıları oluşturma scripti
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB bağlantısı
const MONGODB_URI = 'mongodb://ferhatkortak1:3jjh%25FfNdwK%21%21@ac-xeugihl-shard-00-00.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-01.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-02.ja5wqma.mongodb.net:27017/chatnow?ssl=true&replicaSet=atlas-xs46p5-shard-0&authSource=admin&retryWrites=true&w=majority';

// Mevcut User modelini import et
const User = require('./models/User');

// Test kullanıcıları
const testUsers = [
  {
    name: 'Ahmet',
    surname: 'Yılmaz',
    email: 'ahmet@test.com',
    password: '123456',
    age: 25,
    location: 'İstanbul',
    avatar: '👨',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-ahmet.jpg',
    bg_color: '#3B82F6',
    gender: 'male',
    is_online: true,
    last_active: new Date(),
    diamonds: 150,
    created_at: new Date()
  },
  {
    name: 'Ayşe',
    surname: 'Demir',
    email: 'ayse@test.com',
    password: '123456',
    age: 23,
    location: 'Ankara',
    avatar: '👩',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-ayse.jpg',
    bg_color: '#FF6B95',
    gender: 'female',
    is_online: true,
    last_active: new Date(),
    diamonds: 200,
    created_at: new Date()
  },
  {
    name: 'Mehmet',
    surname: 'Kaya',
    email: 'mehmet@test.com',
    password: '123456',
    age: 28,
    location: 'İzmir',
    avatar: '👨‍💼',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-mehmet.jpg',
    bg_color: '#10B981',
    gender: 'male',
    is_online: false,
    last_active: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 saat önce
    diamonds: 75,
    created_at: new Date()
  },
  {
    name: 'Fatma',
    surname: 'Özkan',
    email: 'fatma@test.com',
    password: '123456',
    age: 26,
    location: 'Bursa',
    avatar: '👩‍🎓',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-fatma.jpg',
    bg_color: '#F59E0B',
    gender: 'female',
    is_online: true,
    last_active: new Date(),
    diamonds: 300,
    created_at: new Date()
  },
  {
    name: 'Ali',
    surname: 'Çelik',
    email: 'ali@test.com',
    password: '123456',
    age: 30,
    location: 'Antalya',
    avatar: '👨‍🔧',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-ali.jpg',
    bg_color: '#8B5CF6',
    gender: 'male',
    is_online: false,
    last_active: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 gün önce
    diamonds: 50,
    created_at: new Date()
  },
  {
    name: 'Zeynep',
    surname: 'Arslan',
    email: 'zeynep@test.com',
    password: '123456',
    age: 24,
    location: 'Adana',
    avatar: '👩‍💻',
    avatar_image: 'https://chatnow-app.onrender.com/uploads/profile-zeynep.jpg',
    bg_color: '#EF4444',
    gender: 'female',
    is_online: true,
    last_active: new Date(),
    diamonds: 400,
    created_at: new Date()
  }
];

async function createTestUsers() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Mevcut test kullanıcılarını sil
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    console.log('🗑️ Eski test kullanıcıları silindi');

    // Yeni test kullanıcılarını oluştur
    for (const userData of testUsers) {
      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      
      await user.save();
      console.log(`✅ Kullanıcı oluşturuldu: ${userData.name} ${userData.surname} (${userData.email}) - ${userData.diamonds} 💎`);
    }

    console.log('\n🎉 Tüm test kullanıcıları başarıyla oluşturuldu!');
    console.log('\n📋 Test Kullanıcıları:');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} ${user.surname} - ${user.email} - ${user.diamonds} 💎`);
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    // Bağlantıyı kapat
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Scripti çalıştır
createTestUsers();
