# 🎛️ Chat Now - Admin Panel

## 📋 Özellikler

- ✅ **Güvenli Giriş:** JWT tabanlı authentication
- 💎 **Jeton Paket Yönetimi:** CRUD işlemleri
- 📊 **İstatistikler:** Toplam ve aktif paket sayısı
- 🎨 **Modern UI:** Responsive ve kullanıcı dostu

## 🚀 Kurulum ve Başlatma

### 1. Admin Kullanıcısı Oluştur

```bash
cd backend
npm run create-admin
```

**Varsayılan Giriş Bilgileri:**
- Username: `admin`
- Password: `admin123`

⚠️ **Güvenlik:** İlk girişten sonra şifrenizi değiştirin!

### 2. Backend'i Başlat

```bash
npm start
```

### 3. Admin Panel'e Giriş

Tarayıcıda aç:
```
http://localhost:3000/admin
```

## 📦 Jeton Paketi Yönetimi

### Yeni Paket Ekle

1. **"+ Yeni Paket Ekle"** butonuna tıkla
2. Formu doldur:
   - **Product ID:** Google Play'deki product ID (örn: `token_pack_1`)
   - **Jeton Miktarı:** Paketteki jeton sayısı
   - **Fiyat (TRY):** Türk Lirası fiyatı
   - **Fiyat (USD):** Dolar fiyatı
   - **Sıralama:** Gösterim sırası (0, 1, 2, ...)
3. **"Kaydet"** butonuna tıkla

### Paketi Düzenle

- Paket satırındaki **"Düzenle"** butonuna tıkla
- Değişiklikleri yap ve kaydet

### Paketi Sil

- Paket satırındaki **"Sil"** butonuna tıkla
- Onaylama popup'ında **"Tamam"** butonuna tıkla

### Aktif/Pasif Durumu

- Paketler `is_active` alanı ile aktif/pasif yapılabilir
- Sadece **aktif paketler** mobil uygulamada gösterilir

## 🔗 API Endpoints

### Admin Authentication

#### Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "username": "admin",
    "email": "admin@chatnow.com",
    "role": "super_admin"
  }
}
```

### Token Packages (Admin)

#### Get All Packages
```http
GET /api/admin/token-packages
Authorization: Bearer <token>
```

#### Create Package
```http
POST /api/admin/token-packages
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": "token_pack_1",
  "token_amount": 100,
  "price_try": 9.99,
  "price_usd": 0.99,
  "display_order": 0
}
```

#### Update Package
```http
PUT /api/admin/token-packages/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": "token_pack_1",
  "token_amount": 150,
  "price_try": 14.99,
  "price_usd": 1.49,
  "display_order": 0,
  "is_active": true
}
```

#### Delete Package
```http
DELETE /api/admin/token-packages/:id
Authorization: Bearer <token>
```

### Token Packages (Public - Mobile App)

#### Get Active Packages
```http
GET /api/token-packages
```

**Response:**
```json
[
  {
    "_id": "...",
    "product_id": "token_pack_1",
    "token_amount": 100,
    "price_try": 9.99,
    "price_usd": 0.99,
    "display_order": 0,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

## 🎯 İleri Özellikler (Gelecek)

- 👥 **Kullanıcı Yönetimi:** Kullanıcıları görüntüle, düzenle, ban
- 💬 **Destek Sistemi:** Kullanıcı mesajlarına yanıt ver
- 📊 **Gelişmiş İstatistikler:** Satış, kullanıcı, mesaj istatistikleri
- 📈 **Dashboard:** Grafikler ve raporlar
- 🔔 **Bildirimler:** Toplu bildirim gönderimi

## 🔒 Güvenlik

- JWT token 24 saat geçerli
- Token `localStorage`'da saklanıyor
- Otomatik logout token süresi dolduğunda
- Bcrypt ile şifre hashleme
- Admin middleware ile route koruması

## 🛠️ Teknik Detaylar

**Frontend:**
- Vanilla JavaScript (framework yok)
- Modern CSS (Gradient, Grid, Flexbox)
- Fetch API

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Bcrypt Password Hashing

## 📝 Notlar

1. **Google Play Product ID:** Google Play Console'da oluşturduğunuz ürün ID'leri ile eşleşmeli
2. **Sıralama:** 0'dan başlar, küçükten büyüğe sıralanır
3. **Fiyat Değişiklikleri:** Google Play'de fiyat değişiklikleri 1-2 gün sürebilir
4. **Token Miktarı:** İstediğiniz zaman değiştirebilirsiniz (anlık güncellenir)


