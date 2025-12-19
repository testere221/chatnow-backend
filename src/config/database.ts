import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatnow';

export const connectDatabase = async (): Promise<void> => {
  try {
    // MongoDB Atlas için connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    // MongoDB yoksa uygulamayı durdurma, sadece uyar
    console.log('⚠️ MongoDB bağlantısı olmadan devam ediliyor...');
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB bağlantısı kapatıldı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı kapatma hatası:', error);
  }
};

// MongoDB bağlantı durumu kontrolü
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB bağlı');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB hatası:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB bağlantısı kesildi');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});