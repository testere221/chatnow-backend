// Test kullanıcılarını silme scripti
const mongoose = require('mongoose');

// MongoDB bağlantısı
const MONGODB_URI = 'mongodb://ferhatkortak1:3jjh%25FfNdwK%21%21@ac-xeugihl-shard-00-00.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-01.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-02.ja5wqma.mongodb.net:27017/chatnow?ssl=true&replicaSet=atlas-xs46p5-shard-0&authSource=admin&retryWrites=true&w=majority';

// Mevcut User modelini import et
const User = require('./models/User');

async function deleteTestUsers() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Test kullanıcılarını sil
    const result = await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    console.log(`🗑️ ${result.deletedCount} test kullanıcısı silindi`);

    console.log('\n🎉 Test kullanıcıları başarıyla silindi!');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    // Bağlantıyı kapat
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Scripti çalıştır
deleteTestUsers();
