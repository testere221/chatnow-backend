# ChatNow Backend API

Bun + Elysia + MongoDB ile geliştirilmiş ChatNow uygulamasının backend API'si.

## 🚀 Özellikler

- **Authentication**: JWT tabanlı kimlik doğrulama
- **User Management**: Kullanıcı CRUD işlemleri
- **Messaging**: Real-time mesajlaşma sistemi
- **Chat Management**: Sohbet yönetimi
- **Block System**: Kullanıcı engelleme sistemi
- **Admin Panel**: Yönetici paneli
- **Token System**: Jeton sistemi

## 🛠️ Teknoloji Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Database**: MongoDB
- **ORM**: Mongoose
- **Authentication**: JWT
- **Validation**: Zod

## 📋 Kurulum

### 1. Bağımlılıkları Yükle
```bash
bun install
```

### 2. Environment Variables
`.env` dosyasını oluşturun:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chatnow
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@chatnow.com
```

### 3. MongoDB Kurulumu

#### Seçenek 1: MongoDB Atlas (Önerilen)
1. [MongoDB Atlas](https://www.mongodb.com/atlas) hesabı oluşturun
2. Yeni cluster oluşturun
3. Connection string'i alın
4. `.env` dosyasında `MONGODB_URI`'yi güncelleyin

#### Seçenek 2: Local MongoDB
1. [MongoDB Community Server](https://www.mongodb.com/try/download/community) indirin
2. Kurulumu tamamlayın
3. MongoDB servisini başlatın

### 4. Uygulamayı Çalıştır
```bash
# Development
bun run dev

# Production
bun run start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgileri

### Users
- `GET /api/users` - Kullanıcı listesi
- `GET /api/users/:id` - Kullanıcı detayı
- `PUT /api/users/:id` - Kullanıcı güncelleme
- `POST /api/users/:id/block` - Kullanıcı engelleme
- `DELETE /api/users/:id/unblock` - Engeli kaldırma

### Messages
- `GET /api/messages/:chatId` - Mesaj listesi
- `POST /api/messages` - Mesaj gönderme
- `PUT /api/messages/:id/read` - Mesajı okundu işaretleme
- `DELETE /api/messages/:id` - Mesaj silme

### Chats
- `GET /api/chats` - Chat listesi
- `GET /api/chats/:id` - Chat detayı
- `DELETE /api/chats/:id` - Chat silme
- `PUT /api/chats/:id/read` - Chat'i okundu işaretleme

### Admin
- `POST /api/admin/login` - Admin girişi
- `GET /api/admin/stats` - İstatistikler
- `GET /api/admin/users` - Kullanıcı yönetimi
- `GET /api/admin/messages` - Mesaj yönetimi

## 🔧 Admin Panel

Admin paneli `http://localhost:3000/admin` adresinde erişilebilir.

**Varsayılan Admin Bilgileri:**
- Username: `admin`
- Password: `admin123`

## 📊 Veritabanı Yapısı

### Collections
- `users` - Kullanıcı bilgileri
- `messages` - Mesajlar
- `chats` - Sohbet listesi
- `blocks` - Engelleme sistemi
- `admins` - Admin kullanıcıları

## 🚀 Deployment

### Vercel
```bash
bun run build
vercel --prod
```

### Docker
```bash
docker build -t chatnow-backend .
docker run -p 3000:3000 chatnow-backend
```

## 📝 Geliştirme

### Yeni Model Ekleme
1. `src/models/` klasöründe yeni model dosyası oluşturun
2. Mongoose schema tanımlayın
3. Route'larda kullanın

### Yeni Route Ekleme
1. `src/routes/` klasöründe yeni route dosyası oluşturun
2. Elysia ile endpoint'leri tanımlayın
3. `src/index.ts`'de route'u import edin

## 🐛 Hata Ayıklama

### MongoDB Bağlantı Hatası
- MongoDB servisinin çalıştığından emin olun
- Connection string'in doğru olduğunu kontrol edin
- Firewall ayarlarını kontrol edin

### JWT Hatası
- JWT_SECRET'in tanımlandığından emin olun
- Token'ın geçerli olduğunu kontrol edin

## 📄 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun
3. Commit yapın
4. Push yapın
5. Pull Request oluşturun

## 📞 İletişim

- Email: admin@chatnow.com
- GitHub: [ChatNow Repository](https://github.com/chatnow/backend)
