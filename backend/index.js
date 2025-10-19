require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const compression = require('compression');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');

// Models
const User = require('./models/User');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const Block = require('./models/Block');

// Services
const { sendEmail } = require('./services/emailService');

// Test data generators
const generateRandomUser = () => {
  const names = [
    'Ahmet', 'Mehmet', 'Ali', 'Veli', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Ömer', 'Yusuf',
    'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice', 'Merve', 'Elif', 'Selin', 'Büşra', 'Derya',
    'Can', 'Eren', 'Berk', 'Kaan', 'Arda', 'Emir', 'Deniz', 'Cem', 'Burak', 'Onur',
    'Selin', 'Ece', 'İrem', 'Cansu', 'Gizem', 'Pınar', 'Seda', 'Burcu', 'Özge', 'Tuba'
  ];
  
  const surnames = [
    'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
    'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
    'Aksoy', 'Polat', 'Erdoğan', 'Güneş', 'Bulut', 'Aktaş', 'Öz', 'Korkmaz', 'Çakır', 'Türk'
  ];
  
  const cities = [
    'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Diyarbakır',
    'Kayseri', 'Eskişehir', 'Urfa', 'Malatya', 'Erzurum', 'Van', 'Batman', 'Elazığ', 'Isparta', 'Trabzon'
  ];
  
  const hobbies = [
    'Müzik', 'Spor', 'Kitap', 'Sinema', 'Yemek', 'Seyahat', 'Fotoğraf', 'Dans', 'Resim', 'Oyun',
    'Bilgisayar', 'Doğa', 'Hayvanlar', 'Sanat', 'Tarih', 'Bilim', 'Teknoloji', 'Moda', 'Güzellik', 'Sağlık'
  ];
  
  const name = names[Math.floor(Math.random() * names.length)];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const age = Math.floor(Math.random() * 30) + 18; // 18-47 yaş arası
  const userHobbies = hobbies.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
  
  return {
    name,
    surname,
    email: `${name.toLowerCase()}.${surname.toLowerCase()}${Math.floor(Math.random() * 1000)}@test.com`,
    password: '123456', // Test için basit şifre
    age,
    gender,
    location: city,
    hobbies: userHobbies,
    avatarImage: null, // Varsayılan avatar kullanılacak
    diamonds: Math.floor(Math.random() * 100) + 10, // 10-109 arası elmas
    is_online: Math.random() > 0.7, // %30 online olma ihtimali
    last_active: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Son 7 gün içinde
  };
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chatnow-super-secret-jwt-key-2024';

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})); // Güvenlik headers
app.use(compression()); // Gzip sıkıştırma
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // JSON limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files serving for uploaded images
app.use('/uploads', express.static('uploads')); // URL encoded limit

// Static files serving for HTML pages
app.use(express.static('.'));

// Handle preflight requests
app.options('*', cors());

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// Image upload endpoint
app.post('/api/upload/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resim dosyası bulunamadı.' });
    }

    // Ngrok URL'ini kullan (ngrok-free.app ile başlayan URL'ler için)
    const host = req.get('host');
    const protocol = req.protocol;
    
    // Eğer ngrok URL'i ise, ngrok URL'ini kullan
    let imageUrl;
    if (host && host.includes('ngrok-free.app')) {
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    } else {
      // Local development için
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }
    
    // Resim başarıyla yüklendi

    res.json({
      success: true,
      message: 'Resim başarıyla yüklendi.',
      imageUrl: imageUrl
    });
  } catch (error) {
    // Resim yükleme hatası
    res.status(500).json({ 
      success: false, 
      message: 'Resim yüklenirken hata oluştu.', 
      error: error.message 
    });
  }
});

// Base64'i dosyaya kaydet ve HTTP URL döndür
app.post('/api/convert-base64-to-file', authenticateToken, async (req, res) => {
  try {
    const { base64Data, filename, mimeType } = req.body;
    
    console.log('🔄 Base64 dönüştürme isteği geldi:', {
      filename: filename,
      base64Length: base64Data ? base64Data.length : 0,
      mimeType: mimeType,
      userId: req.user.userId
    });
    
    if (!base64Data) {
      console.log('❌ Base64 data eksik');
      return res.status(400).json({ message: 'Base64 data gerekli.' });
    }
    
    // Base64'i buffer'a çevir
    const buffer = Buffer.from(base64Data, 'base64');
    console.log('✅ Base64 buffer\'a çevrildi, boyut:', buffer.length);
    
    // Dosya adı oluştur
    const fileExtension = 'jpeg'; // JPG yerine JPEG kullan
    const uniqueFilename = filename || `converted-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
    console.log('📁 Dosya adı oluşturuldu:', uniqueFilename);
    
    // Dosyayı kaydet
    const fs = require('fs');
    const filePath = path.join(__dirname, 'uploads', uniqueFilename);
    fs.writeFileSync(filePath, buffer);
    console.log('💾 Dosya kaydedildi:', filePath);
    
    // HTTP URL oluştur
    const host = req.get('host');
    const protocol = req.protocol;
    const imageUrl = `${protocol}://${host}/uploads/${uniqueFilename}`;
    console.log('🌐 HTTP URL oluşturuldu:', imageUrl);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: uniqueFilename
    });
    
    console.log('✅ Base64 dönüştürme başarılı!');
    
  } catch (error) {
    console.log('❌ Base64 dönüştürme hatası:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Base64 dönüştürme hatası', 
      error: error.message 
    });
  }
});

// MongoDB bağlantısı - Environment variable kullan
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://ferhatkortak1:3jjh%25FfNdwK%21%21@ac-xeugihl-shard-00-00.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-01.ja5wqma.mongodb.net:27017,ac-xeugihl-shard-00-02.ja5wqma.mongodb.net:27017/chatnow?ssl=true&replicaSet=atlas-xs46p5-shard-0&authSource=admin&retryWrites=true&w=majority';
console.log('🔗 MongoDB URI:', MONGODB_URI ? 'Connected' : 'Not set');

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10, // Maksimum bağlantı sayısı
  serverSelectionTimeoutMS: 30000, // Sunucu seçim timeout (30 saniye)
  socketTimeoutMS: 30000, // Socket timeout (30 saniye)
  connectTimeoutMS: 30000, // Bağlantı timeout (30 saniye)
});

mongoose.connection.on('connected', () => {
  // MongoDB bağlantısı başarılı
  // MongoDB bağlantısı başarılı
});

mongoose.connection.on('error', (err) => {
  // MongoDB bağlantı hatası
});

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: 'ChatNow Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  // console.log('📝 Register request received:', req.body);
  
  try {
    const { email, password, name, surname, age, location, gender } = req.body;
    
    // Debug: Log received data
    
    // Validate required fields
    if (!email || !password || !name || !age || !location || !gender) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }
    
    // Validate age is a valid number
    if (isNaN(age) || age < 18 || age > 99) {
      return res.status(400).json({ message: 'Yaş 18-99 arasında olmalıdır.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    // Geçici olarak şifreyi hash'leme (basit string olarak sakla)
    // Şifre basit string olarak saklanıyor
    const hashedPassword = password; // Hash'leme yok, basit string

    // Cinsiyete göre avatar ataması
    const defaultAvatar = gender === 'female' ? '👩' : '👨';
    const defaultBgColor = gender === 'female' ? '#FF6B95' : '#3B82F6';

    const newUser = new User({
      email,
      password: hashedPassword,
      name,
      surname,
      age,
      location,
      gender,
      avatar: defaultAvatar,
      bg_color: defaultBgColor,
      about: 'Yeni kullanıcı',
      hobbies: ['Yeni kullanıcı'],
      diamonds: 1000,
      is_online: true,
      last_active: new Date()
    });

    // console.log('💾 Saving user to MongoDB:', { email, name, surname });
    await newUser.save();
    // User kaydedildi

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Kayıt başarılı!',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        age: newUser.age,
        location: newUser.location,
        gender: newUser.gender,
        avatar: newUser.avatar,
        avatar_image: newUser.avatar_image,
        bg_color: newUser.bg_color,
        about: newUser.about,
        hobbies: newUser.hobbies,
        diamonds: newUser.diamonds,
        is_online: newUser.is_online,
        last_active: newUser.last_active
      }
    });
  } catch (error) {
    // Register hatası
    res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Login denemesi

    const user = await User.findOne({ email });
    // Kullanıcı bulundu
    
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri.' });
    }

    // Şifre karşılaştırması
    // Geçici olarak bcrypt yerine basit string karşılaştırması
    const isPasswordValid = password === user.password; 
    
    if (!isPasswordValid) {
      // Geçersiz şifre
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri.' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    await User.findByIdAndUpdate(user._id, { is_online: true, last_active: new Date() });

    res.json({
      message: 'Giriş başarılı!',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        age: user.age,
        location: user.location,
        gender: user.gender,
        avatar: user.avatar,
        avatar_image: user.avatar_image,
        bg_color: user.bg_color,
        about: user.about,
        hobbies: user.hobbies,
        diamonds: user.diamonds,
        is_online: user.is_online,
        last_active: user.last_active
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Giriş sırasında bir hata oluştu.', error: error.message });
  }
});

// User Routes - Public endpoint for user info
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    // Add last_active field if not exists and convert _id to id
    const usersWithLastActive = users.map(user => {
      const userObj = user.toObject();
      return {
        ...userObj,
        id: userObj._id, // Add id field for frontend compatibility
        last_active: userObj.last_active || new Date(),
        is_online: false // Default to offline, will be updated by WebSocket
      };
    });
    
    res.json(usersWithLastActive);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcılar alınırken hata oluştu.', error: error.message });
  }
});

// Users with pagination
app.get('/api/users/paginated', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, phase = 'online' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Pagination request
    const currentUserId = req.user.userId;

    let query = {};
    let sort = {};

    if (phase === 'online') {
      // Online kullanıcıları önce göster
      query = { is_online: true };
      sort = { last_active: -1 };
    } else {
      // Offline kullanıcıları sonra göster
      query = { is_online: false };
      sort = { last_active: -1 };
    }

    // Mevcut kullanıcıyı hariç tut
    query._id = { $ne: currentUserId };

    // Karşılıklı engelleme kontrolü
    const blockedByMe = await Block.find({ blocker_id: currentUserId }).select('blocked_id');
    const blockedByThem = await Block.find({ blocked_id: currentUserId }).select('blocker_id');
    
    const blockedUserIds = [
      ...blockedByMe.map(block => block.blocked_id),
      ...blockedByThem.map(block => block.blocker_id)
    ];

    // Engellenen kullanıcıları hariç tut
    if (blockedUserIds.length > 0) {
      query._id = { 
        $ne: currentUserId,
        $nin: blockedUserIds
      };
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Add last_active field if not exists and convert _id to id
    const usersWithLastActive = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        id: userObj._id, // Add id field for frontend compatibility
        last_active: userObj.last_active || new Date(),
        is_online: userObj.is_online || false
      };
    });

    // Check if there are more users
    const totalCount = await User.countDocuments(query);
    const hasMore = (skip + limitNum) < totalCount;

    // Pagination response ready

    res.json({
      users: usersWithLastActive,
      hasMore,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error) {
    // Pagination hatası
    res.status(500).json({ message: 'Kullanıcılar alınırken hata oluştu.', error: error.message });
  }
});

// Message Routes
app.get('/api/messages/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.userId;

    // Mesajlar istendi - pagination ile
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Toplam mesaj sayısını al
    const totalMessages = await Message.countDocuments({ chat_id: chatId });
    
    // Mesajları ters sırada al (en yeniler önce), sonra sayfalama yap, sonra tekrar ters çevir
    const messages = await Message.find({ chat_id: chatId })
      .sort({ timestamp: -1 }) // En yeniler önce
      .skip(skip)
      .limit(limitNum)
      .lean();

    // console.log('📊 Database query result for chatId:', chatId, 'message count:', messages.length);

    if (messages.length === 0) {
      // console.log('❌ No messages found in database for chatId:', chatId);
      // Check if there are ANY messages in the database
      const totalMessages = await Message.countDocuments();
      // console.log('📊 Total messages in database:', totalMessages);
      
      // Check similar chatIds
      const allChatIds = await Message.distinct('chat_id');
      // console.log('📊 All chat_ids in database:', allChatIds);
    }

    // Debug: MongoDB'den gelen ham verileri logla
    // console.log('DEBUG: Raw messages from MongoDB:', messages.map(msg => ({
    //   _id: msg._id,
    //   sender_id: msg.sender_id,
    //   receiver_id: msg.receiver_id,
    //   text: msg.text?.substring(0, 20) + '...'
    // })));

    const filteredMessages = messages.filter(
      message => !message.deleted_for.includes(userId)
    );

    // Mesajları doğru sırada (eski -> yeni) döndür
    const sortedMessages = filteredMessages.reverse();

    // Debug: API'den dönen mesajları logla
    // console.log('DEBUG: API returning messages:', sortedMessages.map(msg => ({
    //   _id: msg._id,
    //   sender_id: msg.sender_id,
    //   text: msg.text?.substring(0, 20) + '...'
    // })));

    // Pagination bilgileriyle birlikte döndür
    const hasMore = skip + limitNum < totalMessages;
    const totalPages = Math.ceil(totalMessages / limitNum);

    res.json({
      messages: sortedMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    // Mesajlar alınırken hata
    res.status(500).json({ message: 'Mesajlar alınırken hata oluştu.', error: error.message });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { receiverId, text, imageUrl } = req.body;
    const senderId = req.user.userId;
    
    
    // Mesaj gönderiliyor

    // Jeton kontrolü
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Mesaj türüne göre jeton miktarını belirle
    let requiredTokens = 0;
    if (imageUrl) {
      requiredTokens = 500; // Resim mesajı için 500 jeton
    } else if (text && text.trim()) {
      requiredTokens = 100; // Yazılı mesaj için 100 jeton
    }

    // Jeton yeterli mi kontrol et
    if (sender.diamonds < requiredTokens) {
      return res.status(400).json({ 
        message: 'Yetersiz jeton!',
        error: 'INSUFFICIENT_TOKENS',
        requiredTokens,
        currentTokens: sender.diamonds
      });
    }

    // Jetonları düş
    await User.findByIdAndUpdate(senderId, {
      $inc: { diamonds: -requiredTokens }
    });

    const chat_id = [senderId, receiverId].sort().join('_');
    // Chat ID oluşturuldu

    // Chat oluştur/güncelle - MESAJ KAYDETMEDEN ÖNCE
    const sortedIds = [senderId, receiverId].sort();
    const user1Id = sortedIds[0];
    const user2Id = sortedIds[1];
    
    // Mevcut chat'i bul
    const existingChat = await Chat.findOne({
      $or: [
        { user1_id: senderId, user2_id: receiverId },
        { user1_id: receiverId, user2_id: senderId }
      ]
    });

    let updateFields = {
      user1_id: user1Id,
      user2_id: user2Id,
      chat_id: chat_id,
      last_message: text || 'Resim',
      last_time: new Date(),
      name: sender?.name || 'Bilinmeyen Kullanıcı',
      avatar: sender?.avatar || '👤',
      avatar_image: sender?.avatar_image || '', // Boş string yap
      bg_color: sender?.bg_color || '#FFB6C1',
      gender: sender?.gender || 'female'
    };

    if (existingChat) {
      // Mevcut chat'i güncelle
      await Chat.findByIdAndUpdate(existingChat._id, updateFields);
    } else {
      // Yeni chat oluştur
      const newChat = new Chat({
        ...updateFields,
        unread_count: 0
      });
      await newChat.save();
    }

    const newMessage = new Message({
      chat_id,
      sender_id: senderId,
      receiver_id: receiverId,
      text,
      image_url: imageUrl,
      timestamp: new Date(),
      read: false,
      deleted_for: []
    });

    // Debug: Gönderilen mesajı logla
    // console.log('DEBUG: Saving message:', {
    //   chat_id,
    //   sender_id: senderId,
    //   receiver_id: receiverId,
    //   text: text?.substring(0, 20) + '...'
    // });

    await newMessage.save();
    
    // Update sender's last_active - Mesaj gönderen kişinin son aktivitesini güncelle
    await User.findByIdAndUpdate(senderId, { 
      last_active: new Date(),
      is_online: true 
    });
    
    // Mesaj kaydedildi
    
    // WebSocket ile mesajı yayınla - HEM ALICIYA HEM GÖNDERENE
    const messageData = {
      chatId: chat_id,
      message: {
        id: newMessage._id.toString(),
        senderId: senderId,
        receiverId: receiverId,
        text: text,
        imageUrl: imageUrl,
        timestamp: newMessage.timestamp,
        read: false
      }
    };

    // Message data'ya sender bilgilerini ekle
    const messageDataWithSender = {
      ...messageData,
      message: {
        ...messageData.message,
        senderName: sender?.name || 'Bilinmeyen',
        senderSurname: sender?.surname || '',
        sender_name: sender?.name || 'Bilinmeyen',
        sender_surname: sender?.surname || ''
      }
    };
    
    // Alıcıya newMessage event'i gönder (bildirim ve count için)
    io.to(receiverId).emit('newMessage', messageDataWithSender);
    
    // Gönderene messageSent event'i gönder (bildirim yok, sadece mesaj görünür)
    io.to(senderId).emit('messageSent', {
      messageId: newMessage._id,
      chatId: chat_id,
      message: messageDataWithSender.message,
      success: true
    });
    // Yeni mesaj yayınlandı

    // Hızlı response gönder
    res.json({
      success: true,
      message: 'Mesaj gönderildi!',
      messageId: newMessage._id,
      chatId: chat_id,
      user: {
        diamonds: sender.diamonds - requiredTokens
      }
    });

    // Push notification kontrolü - HER ZAMAN GÖNDER
    const receiverSocketId = onlineUsers.get(receiverId);
    const isReceiverOnline = !!receiverSocketId;
    
    // Push notification check
    
    // Push notification gönder - SADECE OFFLINE KULLANICILAR İÇİN
    if (!isReceiverOnline) {
      try {
        const receiver = await User.findById(receiverId);
        const sender = await User.findById(senderId);
        
        // Push notification - OFFLINE KULLANICI İÇİN
        
        if (receiver && receiver.push_token && sender) {
          // Local notification token ise Expo API'sine gönderme
          if (receiver.push_token === 'local-notification-token') {
            // Local notification token detected - skipping Expo API
            
            // Local notification için frontend'e WebSocket ile bildirim gönder
            try {
              const notificationData = {
                userId: receiverId,
                title: sender.name + ' ' + (sender.surname || ''),
                body: text || 'Yeni mesaj',
                data: {
                  chatId: chat_id,
                  messageId: newMessage._id,
                  senderId: senderId,
                  type: 'message'
                }
              };
              
              // Belirli kullanıcıya gönder
              io.to(receiverId).emit('localNotification', notificationData);
            } catch (error) {
              // Error sending local notification event
            }
            return;
          }

          const message = {
            to: receiver.push_token,
            sound: 'default',
            title: sender.name + ' ' + (sender.surname || ''),
            body: text || 'Yeni mesaj',
            data: {
              chatId: chat_id,
              messageId: newMessage._id,
              senderId: senderId,
              type: 'message'
            },
            priority: 'high',
            ttl: 3600,
            channelId: 'messages',
            badge: 1,
            categoryId: 'MESSAGE',
            android: {
              priority: 'high',
              channelId: 'messages',
              sound: 'default',
              vibrate: true,
              lights: true,
              visibility: 'public',
              importance: 'high',
              bypassDnd: true,
              lockscreenVisibility: 'public'
            },
            ios: {
              sound: 'default',
              badge: 1,
              priority: 'high',
              category: 'MESSAGE'
            }
          };

          console.log('📱 Sending push notification to Expo:', {
            to: receiver.push_token.substring(0, 20) + '...',
            title: message.title,
            body: message.body,
            data: message.data
          });

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
          });

          const result = await response.json();
          
          // Expo Push Response
          
          if (response.ok) {
            // Push notification sent successfully
          } else {
            // Push notification failed
          }
        } else {
          // Cannot send push notification
        }
      } catch (error) {
        // Push notification error
      }
    }

    // Get receiver user info for chat
    const receiverUser = await User.findById(receiverId).select('-password');
    // console.log('DEBUG: Receiver user found:', {
    //   id: receiverUser?._id,
    //   name: receiverUser?.name,
    //   avatar: receiverUser?.avatar,
    //   avatar_image: receiverUser?.avatar_image,
    //   gender: receiverUser?.gender
    // });
    
    // Chat güncelleme - count yönetimi ile (zaten yukarıda oluşturuldu)

    // Count güncelleme - sadece alıcı için artır
    if (existingChat) {
      const isReceiverUser1 = existingChat.user1_id === receiverId;
      if (isReceiverUser1) {
        updateFields.unread_count_user1 = (existingChat.unread_count_user1 || 0) + 1;
        updateFields.unread_count_user2 = 0; // Gönderen için sıfırla
      } else {
        updateFields.unread_count_user2 = (existingChat.unread_count_user2 || 0) + 1;
        updateFields.unread_count_user1 = 0; // Gönderen için sıfırla
      }
      
      // Sender bilgilerini güncelle (mesaj gönderen kişinin bilgileri)
      updateFields.name = sender?.name || 'Bilinmeyen Kullanıcı';
      updateFields.avatar = sender?.avatar || '👤';
      updateFields.avatar_image = sender?.avatar_image || '';
      updateFields.bg_color = sender?.bg_color || '#FFB6C1';
      updateFields.gender = sender?.gender || 'female';
    } else {
      // Yeni chat - alıcı için 1, gönderen için 0
      if (receiverId === user1Id) {
        updateFields.unread_count_user1 = 1;
        updateFields.unread_count_user2 = 0;
      } else {
        updateFields.unread_count_user1 = 0;
        updateFields.unread_count_user2 = 1;
      }
    }
    
    const chat = await Chat.findOneAndUpdate(
      {
        $or: [
          { user1_id: senderId, user2_id: receiverId },
          { user1_id: receiverId, user2_id: senderId }
        ]
      },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    // Güncel kullanıcı bilgilerini al
    const updatedSender = await User.findById(senderId);
    
    res.status(201).json({ 
      message: 'Mesaj gönderildi!', 
      newMessage,
      user: {
        diamonds: updatedSender.diamonds
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Mesaj gönderilirken hata oluştu.', error: error.message });
  }
});

// Mesajları okundu işaretle
app.post('/api/messages/markAsRead', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.userId;

    // Mark as read çağrıldı

    // Chat'i bul - chatId format'ına göre arama yap
    let chat;
    if (chatId.includes('_')) {
      // chatId format: "user1_user2" ise bu format ile ara
      const [user1, user2] = chatId.split('_');
      // Chat aranıyor
      
      // Önce chat_id ile ara
      chat = await Chat.findOne({ chat_id: chatId });
      // console.log('DEBUG: Chat found with chat_id:', chat ? 'YES' : 'NO');
      
      // Eğer chat_id ile bulunamazsa user ID'leri ile ara
      if (!chat) {
        chat = await Chat.findOne({
          $or: [
            { user1_id: user1, user2_id: user2 },
            { user1_id: user2, user2_id: user1 }
          ]
        });
        // console.log('DEBUG: Chat found with user IDs:', chat ? 'YES' : 'NO');
      }
    } else {
      // chatId MongoDB ObjectId ise direkt ara
      // console.log('DEBUG: Searching chat with MongoDB ObjectId:', chatId);
      chat = await Chat.findOne({
        _id: chatId,
        $or: [{ user1_id: userId }, { user2_id: userId }]
      });
      
      // console.log('DEBUG: Chat found with ObjectId:', chat ? 'YES' : 'NO');
    }
    
    // console.log('DEBUG: Final chat result:', chat ? {
    //   _id: chat._id,
    //   chat_id: chat.chat_id,
    //   user1_id: chat.user1_id,
    //   user2_id: chat.user2_id
    // } : 'NOT FOUND');

    if (!chat) {
      // console.log('DEBUG: Chat not found for chatId:', chatId);
      return res.status(404).json({ message: 'Chat bulunamadı.' });
    }

    // console.log('DEBUG: Chat found:', chat._id);

    // Count'u sıfırla
    const isUser1 = chat.user1_id === userId;
    if (isUser1) {
      chat.unread_count_user1 = 0;
    } else {
      chat.unread_count_user2 = 0;
    }

    await chat.save();

    res.json({ message: 'Mesajlar okundu işaretlendi.' });
  } catch (error) {
    res.status(500).json({ message: 'Mesajlar okundu işaretlenirken hata oluştu.', error: error.message });
  }
});

// Update user diamonds endpoint
app.post('/api/users/update-diamonds', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { diamonds } = req.body;

    // Jeton güncelleme isteği

    if (typeof diamonds !== 'number' || diamonds < 0) {
      return res.status(400).json({ message: 'Geçersiz jeton miktarı.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { diamonds: diamonds },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Jeton güncellendi

    res.json({ 
      message: 'Jeton sayısı güncellendi.', 
      diamonds: updatedUser.diamonds
    });
  } catch (error) {
    res.status(500).json({ message: 'Jeton sayısı güncellenirken hata oluştu.', error: error.message });
  }
});

// Update user data endpoint
app.post('/api/users/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, surname, age, location, about, hobbies, avatar_image } = req.body;

    // Profil güncelleme isteği

    // Güncellenecek alanları hazırla
    const updateData = {
      last_active: new Date(), // Profil güncellerken son aktiviteyi güncelle
      is_online: true // Aktif kullanıcı olarak işaretle
    };
    
    if (name) updateData.name = name;
    if (surname) updateData.surname = surname;
    if (age) updateData.age = age;
    if (location) updateData.location = location;
    if (about) updateData.about = about;
    if (hobbies) updateData.hobbies = hobbies;
    if (avatar_image) {
      updateData.avatar_image = avatar_image;
      updateData.avatar = ''; // Avatar emoji'yi temizle
    }

    // Update data hazırlandı

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcı başarıyla güncellendi

    res.json({ 
      message: 'Kullanıcı bilgileri güncellendi.', 
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        surname: updatedUser.surname,
        age: updatedUser.age,
        location: updatedUser.location,
        gender: updatedUser.gender,
        avatar: updatedUser.avatar,
        avatar_image: updatedUser.avatar_image,
        bg_color: updatedUser.bg_color,
        about: updatedUser.about,
        hobbies: updatedUser.hobbies,
        diamonds: updatedUser.diamonds,
        is_online: updatedUser.is_online,
        last_active: updatedUser.last_active
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı bilgileri güncellenirken hata oluştu.', error: error.message });
  }
});

// Chat Routes
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Chat listesi istendi

    // console.log('🔍 Chat listesi getiriliyor, userId:', userId);
    
    // Tüm chat'leri al
    // const allChats = await Chat.find({}).sort({ last_time: -1 });
    // console.log('🔍 Tüm chat\'ler:', allChats.map(c => ({
    //   chat_id: c.chat_id,
    //   user1_id: c.user1_id,
    //   user2_id: c.user2_id,
    //   deleted_for: c.deleted_for
    // })));
    
    // Chat'i manuel olarak bul
    // const manualChat = await Chat.findOne({
    //   $or: [
    //     { user1_id: userId, user2_id: '68e00551f918f6fe48cf3e9d' },
    //     { user1_id: '68e00551f918f6fe48cf3e9d', user2_id: userId }
    //   ]
    // });
    // console.log('🔍 Manuel chat arama:', manualChat);
    
    const chats = await Chat.find({
      $or: [{ user1_id: userId }, { user2_id: userId }],
      deleted_for: { $nin: [userId] } // Bu kullanıcı tarafından silinmemiş olanlar
    }).sort({ last_time: -1 });
    
    // console.log('🔍 Bulunan chat sayısı:', chats.length);
    // console.log('🔍 Chat detayları:', chats.map(c => ({
    //   chat_id: c.chat_id,
    //   deleted_for: c.deleted_for,
    //   user1_id: c.user1_id,
    //   user2_id: c.user2_id
    // })));
    
    // Chat'ler veritabanından alındı

    // Tüm kullanıcı ID'lerini topla
    const allUserIds = new Set();
    chats.forEach(chat => {
      allUserIds.add(chat.user1_id);
      allUserIds.add(chat.user2_id);
    });

    // Tek seferde tüm kullanıcıları getir
    const users = await User.find({ 
      _id: { $in: Array.from(allUserIds) } 
    }).select('-password');
    
    // Kullanıcıları ID'ye göre map'le
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    // Chat'leri işle
    const populatedChats = chats.map(chat => {
      const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
      const otherUser = userMap[otherUserId];

      // Unread count'u hesapla - sadece alıcı için
      const isUser1 = chat.user1_id === userId;
      const unreadCount = isUser1 
        ? (chat.unread_count_user1 || 0)
        : (chat.unread_count_user2 || 0);

      return {
        id: chat.chat_id || [chat.user1_id, chat.user2_id].sort().join('_'), // Chat ID formatı: user1_user2
        user1Id: chat.user1_id,
        user2Id: chat.user2_id,
        lastMessage: chat.last_message,
        lastTime: chat.last_time,
        unreadCount: unreadCount,
        name: otherUser?.name || 'Bilinmeyen Kullanıcı',
        avatar: otherUser?.avatar,
        avatarImage: otherUser?.avatar_image,
        bgColor: otherUser?.bg_color,
        gender: otherUser?.gender,
        // Diğer kullanıcı bilgilerini ekle
        otherUser: otherUser ? {
          id: otherUser._id.toString(),
          _id: otherUser._id.toString(),
          name: otherUser.name,
          surname: otherUser.surname,
          avatar: otherUser.avatar,
          avatar_image: otherUser.avatar_image,
          bg_color: otherUser.bg_color,
          gender: otherUser.gender,
          is_online: otherUser.is_online,
          last_active: otherUser.last_active
        } : null
      };
    });

    // Debug: API'den dönen chat'leri logla
    // console.log('DEBUG: API returning chats:', populatedChats.map(chat => ({
    //   id: chat.id,
    //   user1Id: chat.user1Id,
    //   user2Id: chat.user2Id,
    //   lastMessage: chat.lastMessage?.substring(0, 20) + '...',
    //   lastTime: chat.lastTime,
    //   unreadCount: chat.unreadCount,
    //   name: chat.name,
    //   avatar: chat.avatar,
    //   avatarImage: chat.avatarImage,
    //   gender: chat.gender
    // })));

    res.json(populatedChats);
  } catch (error) {
    res.status(500).json({ message: 'Sohbetler alınırken hata oluştu.', error: error.message });
  }
});

// WebSocket Connection - OLD HANDLER REMOVED (Using new one below)

// Block/Unblock API Endpoints
app.post('/api/users/:id/block', authenticateToken, async (req, res) => {
  try {
    const { id: blockedId } = req.params;
    const blockerId = req.user.userId;
    const { reason } = req.body;

    // Kendini engelleme kontrolü
    if (blockerId === blockedId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kendinizi engelleyemezsiniz' 
      });
    }

    // Zaten engellenmiş mi kontrol et
    const existingBlock = await Block.findOne({
      blocker_id: blockerId,
      blocked_id: blockedId
    });

    if (existingBlock) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kullanıcı zaten engellenmiş' 
      });
    }

    // Engelleme oluştur
    const block = new Block({
      blocker_id: blockerId,
      blocked_id: blockedId,
      reason: reason || 'Kullanıcı tarafından engellendi'
    });

    await block.save();

    // WebSocket ile bildir
    io.to(blockerId).emit('user_blocked', {
      blockedUserId: blockedId,
      blockerUserId: blockerId,
      reason: block.reason
    });

    res.json({ 
      success: true, 
      message: 'Kullanıcı başarıyla engellendi',
      blockId: block._id
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Kullanıcı engellenirken hata oluştu' 
    });
  }
});

app.delete('/api/users/:id/unblock', authenticateToken, async (req, res) => {
  try {
    const { id: blockedId } = req.params;
    const blockerId = req.user.userId;

    // Engelleme kaydını sil
    const deletedBlock = await Block.findOneAndDelete({
      blocker_id: blockerId,
      blocked_id: blockedId
    });

    if (!deletedBlock) {
      return res.status(404).json({ 
        success: false, 
        message: 'Engelleme kaydı bulunamadı' 
      });
    }

    // WebSocket ile bildir
    io.to(blockerId).emit('user_unblocked', {
      unblockedUserId: blockedId,
      blockerUserId: blockerId
    });

    res.json({ 
      success: true, 
      message: 'Engelleme kaldırıldı' 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Engelleme kaldırılırken hata oluştu' 
    });
  }
});

app.get('/api/users/blocked', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Engellenen kullanıcıları getir
    const blockedUsers = await Block.find({ blocker_id: userId })
      .sort({ created_at: -1 });

    // Her engellenen kullanıcı için User bilgilerini al
    const blockedUsersWithDetails = await Promise.all(
      blockedUsers.map(async (block) => {
        const user = await User.findById(block.blocked_id).select('name surname avatar avatar_image gender bg_color');
        return {
          id: block.blocked_id,
          name: user?.name || 'Bilinmeyen Kullanıcı',
          surname: user?.surname || '',
          avatar: user?.avatar || '👤',
          avatarImage: user?.avatar_image || '',
          gender: user?.gender || 'female',
          bgColor: user?.bg_color || '#FFB6C1',
          reason: block.reason,
          blockedAt: block.created_at
        };
      })
    );

    res.json({
      success: true, 
      blockedUsers: blockedUsersWithDetails
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Engellenen kullanıcılar getirilirken hata oluştu' 
    });
  }
});

// Mevcut kullanıcının profil bilgilerini getir
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        age: user.age,
        location: user.location,
        gender: user.gender,
        avatar: user.avatar,
        avatar_image: user.avatar_image,
        bg_color: user.bg_color,
        about: user.about,
        hobbies: user.hobbies,
        diamonds: user.diamonds,
        is_online: user.is_online,
        last_active: user.last_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Profil bilgileri alınırken hata oluştu.', error: error.message });
  }
});

// Kullanıcının engellenip engellenmediğini kontrol et
app.get('/api/users/:id/block-status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token gerekli' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUserId = decoded.userId;
    const targetUserId = req.params.id;

    // Mevcut kullanıcı hedef kullanıcıyı engellemiş mi?
    const blockedByMe = await Block.findOne({ 
      blocker_id: currentUserId, 
      blocked_id: targetUserId 
    });

    // Hedef kullanıcı mevcut kullanıcıyı engellemiş mi?
    const blockedByThem = await Block.findOne({ 
      blocker_id: targetUserId, 
      blocked_id: currentUserId 
    });


    res.json({
      success: true,
      blockedByMe: !!blockedByMe,
      blockedByThem: !!blockedByThem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Manuel test kullanıcısı oluşturma endpoint'i
app.post('/api/test/create-manual-user', async (req, res) => {
  try {
    const { email = 'test@test.com', password = '123456' } = req.body;
    
    console.log('🧪 Manuel test kullanıcısı oluşturuluyor:', { email, password });
    
    // Geçici olarak şifreyi hash'leme (basit string olarak sakla)
    console.log('🔐 Şifre basit string olarak saklanıyor:', { original: password });
    
    const user = new User({
      name: 'Test',
      surname: 'User',
      email: email,
      password: password, // Hash'leme yok, basit string
      age: 25,
      gender: 'male',
      location: 'İstanbul',
      hobbies: ['Test'],
      diamonds: 100,
      is_online: false,
      last_active: new Date()
    });
    
    await user.save();
    console.log('✅ Manuel test kullanıcısı oluşturuldu:', user.email);
    
    res.json({
      success: true,
      message: 'Manuel test kullanıcısı oluşturuldu',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Test kullanıcısı oluşturulurken hata oluştu', error: error.message });
  }
});

// Test kullanıcıları oluşturma endpoint'i
app.post('/api/test/create-users', async (req, res) => {
  try {
    const { count = 50 } = req.body;
    
    // console.log(`🧪 ${count} test kullanıcısı oluşturuluyor...`);
    
    const users = [];
    for (let i = 0; i < count; i++) {
      const userData = generateRandomUser();
      
      // Şifreyi hashle
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      
      await user.save();
      users.push({
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        gender: user.gender,
        age: user.age,
        location: user.location,
        hobbies: user.hobbies,
        diamonds: user.diamonds,
        is_online: user.is_online,
        last_active: user.last_active
      });
    }
    
    // Test kullanıcıları oluşturuldu
    
    res.json({
      success: true,
      message: `${users.length} test kullanıcısı oluşturuldu`,
      users: users.slice(0, 10), // İlk 10 kullanıcıyı göster
      total: users.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test kullanıcıları oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Test kullanıcılarını silme endpoint'i
app.delete('/api/test/delete-users', async (req, res) => {
  try {
    // console.log('🗑️ Test kullanıcıları siliniyor...');
    
    // @test.com ile biten tüm kullanıcıları sil
    const result = await User.deleteMany({
      email: { $regex: /@test\.com$/ }
    });
    
    // console.log(`✅ ${result.deletedCount} test kullanıcısı silindi`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} test kullanıcısı silindi`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test kullanıcıları silinirken hata oluştu',
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend çalışıyor!', 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - mesajlar oluşturma
app.post('/api/test/create-messages', async (req, res) => {
  try {
    const { chatId, count = 5 } = req.body;
    
    // console.log('🔧 Creating test messages for chatId:', chatId);
    
    if (!chatId) {
      return res.status(400).json({ message: 'chatId gerekli' });
    }
    
    // ChatId'den user ID'lerini çıkar
    const [userId1, userId2] = chatId.split('_');
    
    // Test mesajları oluştur
    const testMessages = [];
    
    for (let i = 0; i < count; i++) {
      const isFromUser1 = i % 2 === 0;
      const senderId = isFromUser1 ? userId1 : userId2;
      const receiverId = isFromUser1 ? userId2 : userId1;
      
      const message = new Message({
        chat_id: chatId,
        sender_id: senderId,
        receiver_id: receiverId,
        text: `Test mesajı ${i + 1}: ${isFromUser1 ? 'Kullanıcı 1' : 'Kullanıcı 2'} tarafından gönderildi`,
        timestamp: new Date(Date.now() - (count - i) * 60000), // Her mesaj 1 dakika arayla
        read: false,
        deleted_for: []
      });
      
      await message.save();
      testMessages.push(message);
    }
    
    // console.log('✅ Test mesajları oluşturuldu:', testMessages.length);
    
    res.json({ 
      message: 'Test mesajları oluşturuldu', 
      count: testMessages.length,
      chatId: chatId,
      messages: testMessages.map(msg => ({
        id: msg._id,
        text: msg.text,
        sender_id: msg.sender_id,
        timestamp: msg.timestamp
      }))
    });
    
  } catch (error) {
    console.error('❌ Test mesajları oluşturulurken hata:', error);
    res.status(500).json({ message: 'Test mesajları oluşturulamadı', error: error.message });
  }
});

// Test endpoint - mesajları temizle
app.delete('/api/test/clear-messages', async (req, res) => {
  try {
    const { chatId } = req.body;
    
    if (chatId) {
      // Belirli chat'in mesajlarını sil
      const result = await Message.deleteMany({ chat_id: chatId });
      // console.log(`✅ ${chatId} chat'inin ${result.deletedCount} mesajı silindi`);
      
      res.json({ 
        message: `${chatId} chat'inin mesajları silindi`, 
        deletedCount: result.deletedCount,
        chatId: chatId
      });
    } else {
      // Tüm test mesajlarını sil
      const result = await Message.deleteMany({
        text: { $regex: /^Test mesajı \d+:/ }
      });
      console.log(`✅ ${result.deletedCount} test mesajı silindi`);
      
      res.json({ 
        message: 'Tüm test mesajları silindi', 
        deletedCount: result.deletedCount
      });
    }
    
  } catch (error) {
    console.error('❌ Test mesajları silinirken hata:', error);
    res.status(500).json({ message: 'Test mesajları silinemedi', error: error.message });
  }
});

// Test endpoint - chat oluşturma
app.post('/api/test/create-chats', async (req, res) => {
  try {
    const { count = 20 } = req.body;
    
    console.log(`🧪 ${count} test chat'i oluşturuluyor...`);
    
    // Mevcut kullanıcıları al
    const users = await User.find({}).limit(50);
    if (users.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'En az 2 kullanıcı gerekli'
      });
    }
    
    const chats = [];
    for (let i = 0; i < count; i++) {
      // Rastgele 2 kullanıcı seç
      const user1 = users[Math.floor(Math.random() * users.length)];
      let user2 = users[Math.floor(Math.random() * users.length)];
      while (user2._id.equals(user1._id)) {
        user2 = users[Math.floor(Math.random() * users.length)];
      }
      
      const chat = new Chat({
        participants: [user1._id, user2._id],
        lastMessage: `Test mesajı ${i + 1}`,
        lastMessageTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Son 7 gün içinde
      });
      
      await chat.save();
      chats.push({
        id: chat._id,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime
      });
    }
    
    console.log(`✅ ${count} test chat'i başarıyla oluşturuldu`);
    
    res.json({
      success: true,
      message: `${count} test chat'i oluşturuldu`,
      chats: chats
    });
  } catch (error) {
    console.error('❌ Test chat\'leri oluşturulurken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Test chat\'leri oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

// Test chat'leri silme endpoint'i
app.delete('/api/test/delete-chats', async (req, res) => {
  try {
    console.log('🗑️ Test chat\'leri siliniyor...');
    
    // Tüm chat'leri sil
    const result = await Chat.deleteMany({});
    
    console.log(`✅ ${result.deletedCount} chat silindi`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} chat silindi`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Test chat\'leri silinirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Test chat\'leri silinirken hata oluştu',
      error: error.message
    });
  }
});

// WebSocket Online/Offline Status Management
const onlineUsers = new Map(); // userId -> socketId mapping

io.on('connection', (socket) => {
  // Yeni kullanıcı bağlandı

  // Join event handler
  socket.on('join', async (userId) => {
    try {
      
      // Online users map'ine ekle
      onlineUsers.set(userId, socket.id);
      
      // Kullanıcıyı kendi room'una join et
      socket.join(userId);
      
      // Veritabanında is_online = true yap
      await User.findByIdAndUpdate(userId, { 
        is_online: true,
        last_active: new Date()
      });
      
      // Tüm bağlı clientlara bildir
      socket.broadcast.emit('user_status_changed', {
        userId: userId,
        isOnline: true,
        lastActive: new Date()
      });
      
      // User marked as online
    } catch (error) {
      // Join event error
    }
  });

  // Kullanıcı online oldu
  socket.on('user_online', async (data) => {
    try {
      const { userId } = data;
      // Kullanıcı online
      
      // Online users map'ine ekle
      onlineUsers.set(userId, socket.id);
      
      // Kullanıcıyı kendi room'una join et
      socket.join(userId);
      // console.log(`🏠 Kullanıcı ${userId} kendi room'una join oldu`);
      
      // Veritabanında is_online = true yap
      await User.findByIdAndUpdate(userId, { 
        is_online: true,
        last_active: new Date()
      });
      
      // Tüm bağlı clientlara bildir
      socket.broadcast.emit('user_status_changed', {
        userId: userId,
        isOnline: true,
        lastActive: new Date()
      });
      
      // console.log(`✅ ${userId} online olarak işaretlendi`);
    } catch (error) {
      // User online error
    }
  });

  // Kullanıcı offline oldu
  socket.on('user_offline', async (data) => {
    try {
      const { userId } = data;
      // console.log(`👤 Kullanıcı offline: ${userId}`);
      
      // Online users map'ten çıkar
      onlineUsers.delete(userId);
      
      // Veritabanında is_online = false yap
      await User.findByIdAndUpdate(userId, { 
        is_online: false,
        last_active: new Date()
      });
      
      // Tüm bağlı clientlara bildir
      socket.broadcast.emit('user_status_changed', {
        userId: userId,
        isOnline: false,
        lastActive: new Date()
      });
      
      // console.log(`❌ ${userId} offline olarak işaretlendi`);
    } catch (error) {
      console.error('❌ User offline hata:', error);
    }
  });

  // Kullanıcıyı offline yap (WebSocket bağlantısını koru)
  socket.on('setUserOffline', async (data) => {
    try {
      const { userId } = data.userId;
      console.log('📱 Setting user offline:', userId);
      
      // Online users map'inden çıkar
      onlineUsers.delete(userId);
      
      await User.findByIdAndUpdate(userId, { is_online: false, last_active: new Date() });
      console.log('✔', userId, 'offline olarak işaretlendi');
      
      // Tüm kullanıcılara bu kullanıcının offline olduğunu bildir
      io.emit('userStatusChange', {
        userId: userId,
        isOnline: false,
        lastActive: new Date()
      });
      
    } catch (error) {
      console.error('❌ Set user offline error:', error);
    }
  });

  // Kullanıcıyı online yap
  socket.on('setUserOnline', async (data) => {
    try {
      const { userId } = data.userId;
      console.log('📱 Setting user online:', userId);
      
      // Online users map'ine ekle
      onlineUsers.set(userId, socket.id);
      
      await User.findByIdAndUpdate(userId, { is_online: true, last_active: new Date() });
      // User marked as online
      
      // Tüm kullanıcılara bu kullanıcının online olduğunu bildir
      io.emit('userStatusChange', {
        userId: userId,
        isOnline: true,
        lastActive: new Date()
      });
      
    } catch (error) {
      console.error('❌ Set user online error:', error);
    }
  });

  // Mesaj gönderme event handler - KALDIRILDI (REST API'de yapılıyor)
  socket.on('sendMessage', async (data) => {
    try {
      console.log('📨 WebSocket sendMessage - REST API kullanılmalı');
      socket.emit('error', { message: 'WebSocket mesaj gönderme kaldırıldı, REST API kullanın' });
    } catch (error) {
      console.error('❌ WebSocket sendMessage error:', error);
      socket.emit('error', { message: 'Mesaj gönderilemedi', error: error.message });
    }
  });

  // Socket bağlantısı koptu
  socket.on('disconnect', async () => {
    try {
      // Bu socket'e ait kullanıcıyı bul
      let disconnectedUserId = null;
      for (let [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        // Online users map'ten çıkar
        onlineUsers.delete(disconnectedUserId);
        
        // Veritabanında is_online = false yap
        await User.findByIdAndUpdate(disconnectedUserId, { 
          is_online: false,
          last_active: new Date()
        });
        
        // Tüm bağlı clientlara bildir
        socket.broadcast.emit('user_status_changed', {
          userId: disconnectedUserId,
          isOnline: false,
          lastActive: new Date()
        });
        
      }
    } catch (error) {
      console.error('❌ Disconnect hata:', error);
    }
  });
});

// Mesaj silme endpoint'i - Sadece silen kullanıcı için
app.delete('/api/messages/delete-chat', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.userId;

    if (!chatId) {
      return res.status(400).json({ message: 'chatId gerekli' });
    }

    console.log(`🗑️ Mesajlar siliniyor, chatId: ${chatId}, userId: ${userId}`);

    // Chat'i bul
    const chat = await Chat.findOne({ chat_id: chatId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat bulunamadı' });
    }

    // Kullanıcının bu chat'te olup olmadığını kontrol et
    if (chat.user1_id !== userId && chat.user2_id !== userId) {
      return res.status(403).json({ message: 'Bu chat\'e erişim yetkiniz yok' });
    }

    // Sadece bu kullanıcı için mesajları "deleted_for" listesine ekle
    const updatedMessages = await Message.updateMany(
      { chat_id: chatId },
      { $addToSet: { deleted_for: userId } }
    );
    console.log(`✅ ${updatedMessages.modifiedCount} mesaj silindi (sadece ${userId} için)`);

    // Chat'i silen kullanıcı için "deleted_for" listesine ekle
    const updatedChat = await Chat.findOneAndUpdate(
      { chat_id: chatId },
      { $addToSet: { deleted_for: userId } },
      { new: true }
    );
    
    // Eğer chat'te deleted_for field yoksa oluştur
    if (!updatedChat) {
      await Chat.findOneAndUpdate(
        { chat_id: chatId },
        { $set: { deleted_for: [userId] } }
      );
    }

    console.log(`✅ Chat silindi (sadece ${userId} için)`);

    // WebSocket ile bildir - SADECE SİLEN KULLANICIYA
    console.log('📡 WebSocket event gönderiliyor:', { chatId, userId });
    io.to(userId).emit('chat_deleted', {
      chatId: chatId,
      userId: userId
    });
    console.log('📡 WebSocket event gönderildi!');

    res.json({ 
      message: 'Chat silindi (sadece sizin için)', 
      deletedMessages: updatedMessages.modifiedCount,
      chatId: chatId
    });

  } catch (error) {
    console.error('❌ Mesaj silme hatası:', error);
    res.status(500).json({ message: 'Mesajlar silinirken hata oluştu', error: error.message });
  }
});

// Push Notification Endpoints
// Clear push token on logout
app.post('/api/notifications/clear-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clear push token from user
    await User.findByIdAndUpdate(userId, {
      push_token: null,
      platform: null,
      updated_at: new Date()
    });

    res.json({ message: 'Push token başarıyla temizlendi.' });
  } catch (error) {
    res.status(500).json({ message: 'Push token temizlenirken hata oluştu', error: error.message });
  }
});

// Register push token
app.post('/api/notifications/register-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pushToken, platform } = req.body;

    if (!pushToken) {
      return res.status(400).json({ message: 'Push token gerekli.' });
    }

    // Update user with push token
    const updateResult = await User.findByIdAndUpdate(userId, {
      push_token: pushToken,
      platform: platform || 'unknown',
      updated_at: new Date()
    }, { new: true });

    // Push token registered
    
    res.json({ message: 'Push token başarıyla kaydedildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Push token kaydedilirken hata oluştu', error: error.message });
  }
});

// Send push notification (internal use)
app.post('/api/notifications/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, title, body, data } = req.body;
    const senderId = req.user.userId;

    console.log(`📤 Sending push notification - To: ${receiverId}, From: ${senderId}`);

    if (!receiverId || !title || !body) {
      return res.status(400).json({ message: 'Alıcı ID, başlık ve mesaj gerekli.' });
    }

    // Get receiver's push token
    const receiver = await User.findById(receiverId);
    if (!receiver || !receiver.push_token) {
      return res.status(404).json({ message: 'Alıcının push token\'ı bulunamadı.' });
    }

    // Send push notification via Expo
    const message = {
      to: receiver.push_token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {}
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Push notification sent successfully:`, result);
      res.json({ message: 'Bildirim başarıyla gönderildi.', result });
    } else {
      console.error(`❌ Push notification failed:`, result);
      res.status(500).json({ message: 'Bildirim gönderilemedi.', error: result });
    }
  } catch (error) {
    console.error('❌ Push notification send error:', error);
    res.status(500).json({ message: 'Bildirim gönderilirken hata oluştu', error: error.message });
  }
});

// Şifre sıfırlama token'ı oluştur
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email adresi gerekli.' });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.' });
    }

    // Reset token oluştur (24 saat geçerli)
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Email gönder - SMTP ile
    const resetLink = `https://chatnow.com.tr/reset-password.html?token=${resetToken}`;
    const emailHtml = `
      <h2>Şifre Sıfırlama</h2>
      <p>Merhaba ${user.name},</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
      <a href="${resetLink}" style="background: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
      <p>Bu link 24 saat geçerlidir.</p>
      <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
    `;
    
    const emailResult = await sendEmail(email, 'ChatNow - Şifre Sıfırlama', emailHtml);
    
    if (emailResult.success) {
      res.json({ 
        message: 'Şifre sıfırlama linki email adresinize gönderildi.',
        success: true 
      });
    } else {
      res.status(500).json({
        message: 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.',
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Şifre sıfırlama işlemi sırasında hata oluştu.', error: error.message });
  }
});

// Şifre sıfırlama token'ını doğrula
app.post('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token gerekli.' });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    res.json({ 
      message: 'Token geçerli.',
      userId: user._id,
      email: user.email,
      valid: true 
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebinde bulunun.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Geçersiz token.' });
    } else {
      console.error('Verify reset token error:', error);
      res.status(500).json({ message: 'Token doğrulama sırasında hata oluştu.', error: error.message });
    }
  }
});

// Yeni şifre belirle
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token ve yeni şifre gerekli.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Şifreyi güncelle (hash'leme yok, plain text)
    await User.findByIdAndUpdate(user._id, {
      password: newPassword,
      updated_at: new Date()
    });

    res.json({ 
      message: 'Şifreniz başarıyla güncellendi.',
      success: true 
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebinde bulunun.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Geçersiz token.' });
    } else {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Şifre güncellenirken hata oluştu.', error: error.message });
    }
  }
});

// Hesap silme (Web)
app.post('/api/auth/delete-account-web', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli.' });
    }

    // Kullanıcıyı bul ve şifreyi kontrol et
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Şifre kontrolü (plain text karşılaştırma)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Şifre yanlış.' });
    }

    const userId = user._id.toString();

    // Kullanıcının tüm mesajlarını sil
    await Message.deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    // Kullanıcının tüm chat'lerini sil
    await Chat.deleteMany({
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    });

    // Kullanıcının tüm block kayıtlarını sil
    await Block.deleteMany({
      $or: [
        { userId: userId },
        { blockedUserId: userId }
      ]
    });

    // Kullanıcıyı sil
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'Hesabınız başarıyla silindi.',
      success: true 
    });
  } catch (error) {
    console.error('Delete account web error:', error);
    res.status(500).json({ message: 'Hesap silinirken hata oluştu.', error: error.message });
  }
});

// Hesap silme
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Kullanıcının tüm mesajlarını sil
    await Message.deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    // Kullanıcının tüm chat'lerini sil
    await Chat.deleteMany({
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    });

    // Kullanıcının tüm block kayıtlarını sil
    await Block.deleteMany({
      $or: [
        { userId: userId },
        { blockedUserId: userId }
      ]
    });

    // Kullanıcıyı sil
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'Hesabınız başarıyla silindi.',
      success: true 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Hesap silinirken hata oluştu.', error: error.message });
  }
});

// Server başlat
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
  console.log(`🌐 Public Server: http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile API: http://192.168.42.238:${PORT}`);
  // console.log(`📊 WebSocket: ws://192.168.42.238:${PORT}`);
  console.log(`📱 API Test: http://localhost:${PORT}/api/test`);
  console.log(`🧪 Test Users: POST http://localhost:${PORT}/api/test/create-users`);
  console.log(`🗑️ Delete Test: DELETE http://localhost:${PORT}/api/test/delete-users`);
});