# 🚀 Koyeb Deployment Rehberi

Bu rehber backend'i Koyeb'e deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Hazırlık

### 1. GitHub Repository Hazırlığı

Backend klasörünü GitHub'a yükle:

```bash
cd backend
git init
git add .
git commit -m "Initial commit - Backend for Koyeb deployment"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

### 2. Koyeb Hesabı Oluştur

1. [Koyeb](https://www.koyeb.com) hesabı oluştur
2. GitHub hesabını bağla

## 🚀 Deployment Adımları

### 1. Koyeb Dashboard'da Yeni Servis Oluştur

1. Koyeb Dashboard'a git
2. "Create Web Service" butonuna tıkla
3. "GitHub" seçeneğini seç
4. Backend repository'ni seç
5. Branch: `main` seç

### 2. Build Ayarları

- **Build Type**: Dockerfile (backend klasöründe Dockerfile var)
- **Dockerfile Path**: `backend/Dockerfile` (veya sadece `Dockerfile` eğer root'ta ise)
- **Root Directory**: `backend` (eğer backend klasörü ayrı bir repo ise)

### 3. Environment Variables (ÖNEMLİ!)

Koyeb Dashboard'da şu environment variable'ları ekle:

```
PORT=8080
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatnow?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-change-this
CORS_ORIGIN=*
```

**Önemli:**
- `MONGODB_URI`: MongoDB Atlas connection string'in
- `JWT_SECRET`: Güvenli bir secret key (en az 32 karakter)
- `CORS_ORIGIN`: Production'da spesifik domain'ler belirt (örn: `https://yourapp.com`)

### 4. Deploy

1. "Deploy" butonuna tıkla
2. Koyeb build işlemini başlatacak
3. Deployment tamamlandığında URL alacaksın: `https://your-app-name.koyeb.app`

## 🔧 Deployment Sonrası

### 1. Frontend API URL'ini Güncelle

Deployment tamamlandıktan sonra Koyeb'den aldığın URL'yi frontend'de güncelle:

`config/api.ts` dosyasında:

```typescript
export const API_CONFIG = {
  // Koyeb Production URLs
  BASE_URL: 'https://your-app-name.koyeb.app',
  WEBSOCKET_URL: 'https://your-app-name.koyeb.app',
  
  // Local Development URLs (comment out)
  // BASE_URL: 'http://192.168.204.149:3000',
  // WEBSOCKET_URL: 'http://192.168.204.149:3000',
  ...
}
```

### 2. MongoDB Atlas IP Whitelist

Koyeb'in IP adreslerini MongoDB Atlas IP whitelist'ine ekle:

1. MongoDB Atlas Dashboard → Network Access
2. "Add IP Address" → "Allow Access from Anywhere" (`0.0.0.0/0`) ekle
   (veya Koyeb'in IP aralığını ekle)

### 3. Test

1. Backend URL'ini tarayıcıda aç: `https://your-app-name.koyeb.app`
2. API test endpoint'ini kontrol et: `https://your-app-name.koyeb.app/api/test`
3. Frontend'den bağlantıyı test et

## 📝 Önemli Notlar

- **Port**: Koyeb otomatik olarak PORT environment variable'ını set eder
- **HTTPS**: Koyeb otomatik HTTPS sağlar
- **WebSocket**: Socket.IO Koyeb'de çalışır, ama sticky sessions gerekebilir
- **File Uploads**: `uploads/` klasörü geçici olacak, kalıcı storage için Koyeb Storage veya S3 kullan

## 🔍 Troubleshooting

### Build Hatası
- Dockerfile'ın doğru path'te olduğundan emin ol
- `package.json` dosyasının backend klasöründe olduğunu kontrol et

### Runtime Hatası
- Environment variable'ların doğru set edildiğini kontrol et
- Koyeb logs'u kontrol et: Dashboard → Service → Logs

### MongoDB Bağlantı Hatası
- MongoDB Atlas IP whitelist'ini kontrol et
- `MONGODB_URI` environment variable'ının doğru olduğunu kontrol et

## 🎯 Sonraki Adımlar

1. ✅ Backend'i Koyeb'e deploy et
2. ✅ Frontend API URL'ini güncelle
3. ✅ Test et
4. ✅ Production'da kullan!

