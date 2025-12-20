# 🚀 Local Development Kurulumu

## Backend Başlatma

### 1. Environment Variables Ayarlama

`backend` klasöründe `.env` dosyası oluşturun:

```bash
cd backend
copy env.example .env
```

Sonra `.env` dosyasını düzenleyin:
- `MONGODB_URI`: MongoDB bağlantı string'inizi ekleyin
- `JWT_SECRET`: Güvenli bir secret key oluşturun
- `PORT`: 3000 (default, değiştirmenize gerek yok)
- `NODE_ENV`: development

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Backend'i Başlat

```bash
npm start
```

veya development mode için:

```bash
node index.js
```

Backend başladığında konsolda şunları göreceksiniz:
- Local URL: `http://localhost:3000`
- Network IP: `http://[YOUR_IP]:3000` (Expo Go için)

### 4. Expo Go için IP Ayarlama

Backend başladığında konsolda network IP'nizi göreceksiniz. Eğer Expo Go kullanıyorsanız:

1. `config/api.ts` dosyasını açın
2. `BASE_URL` ve `WEBSOCKET_URL` değerlerini network IP ile güncelleyin:
   ```typescript
   BASE_URL: 'http://192.168.1.100:3000',  // Backend konsolundaki IP'yi kullanın
   WEBSOCKET_URL: 'http://192.168.1.100:3000',
   ```

**Not:** Eğer localhost çalışıyorsa (web versiyonu), localhost kullanabilirsiniz.

## Frontend Başlatma

### 1. Expo Go'da Başlat

```bash
npx expo start
```

veya

```bash
npm start
```

### 2. QR Kodu Tara

Expo Go uygulamasını açın ve terminaldeki QR kodu tarayın.

## Önemli Notlar

- Backend ve frontend aynı network'te olmalı (Expo Go için)
- Firewall'ın 3000 portunu engellemediğinden emin olun
- MongoDB bağlantınızın çalıştığından emin olun

## Test

Backend çalışıyorsa şu URL'yi tarayıcıda açabilirsiniz:
- `http://localhost:3000/api/test` - API test
- `http://localhost:3000/admin` - Admin panel

