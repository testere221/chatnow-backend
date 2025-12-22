# 🔐 Google Play Service Account Key Alma Rehberi

Bu rehber, Google Play Console'dan Service Account JSON key'ini nasıl alacağınızı adım adım açıklar.

## 📋 Ön Gereksinimler

- Google Play Console hesabına erişim
- Uygulamanızın Google Play Console'da yayında olması (veya en azından oluşturulmuş olması)

## 🚀 Adım Adım Kurulum

### 1. Google Cloud Console'a Git

1. Tarayıcıda şu adrese gidin:
   ```
   https://console.cloud.google.com/
   ```

2. Google Play Console ile aynı Google hesabıyla giriş yapın

### 2. Yeni Proje Oluştur (veya Mevcut Projeyi Seç)

1. Üst menüden **"Select a project"** dropdown'ına tıklayın
2. **"+ Create Project"** butonuna tıklayın
3. Proje adını girin (örn: `chatnow-backend`)
4. **"Create"** butonuna tıklayın
5. Proje oluşturulduktan sonra projeyi seçin

### 3. Google Play Android Developer API'yi Etkinleştir

1. Sol menüden **"APIs & Services"** → **"Library"** seçin
2. Arama kutusuna **"Google Play Android Developer API"** yazın
3. **"Google Play Android Developer API"** seçeneğine tıklayın
4. **"Enable"** butonuna tıklayın
5. API'nin etkinleştirilmesini bekleyin (birkaç saniye sürebilir)

### 4. Service Account Oluştur

1. Sol menüden **"APIs & Services"** → **"Credentials"** seçin
2. Üst kısımdan **"+ CREATE CREDENTIALS"** butonuna tıklayın
3. **"Service account"** seçeneğini seçin

4. **Service account details** formunu doldurun:
   - **Service account name:** `chatnow-play-api` (veya istediğiniz bir isim)
   - **Service account ID:** Otomatik oluşturulur (değiştirebilirsiniz)
   - **Description:** `Google Play Billing Verification` (opsiyonel)

5. **"CREATE AND CONTINUE"** butonuna tıklayın

6. **Grant this service account access to project** (opsiyonel):
   - Bu adımı şimdilik atlayabilirsiniz
   - **"CONTINUE"** butonuna tıklayın

7. **Grant users access to this service account** (opsiyonel):
   - Bu adımı da atlayabilirsiniz
   - **"DONE"** butonuna tıklayın

### 5. Service Account Key Oluştur

1. Oluşturduğunuz Service Account'a tıklayın (tabloda görünecek)
2. **"KEYS"** sekmesine gidin
3. **"ADD KEY"** → **"Create new key"** seçeneğine tıklayın
4. **Key type** olarak **"JSON"** seçin
5. **"CREATE"** butonuna tıklayın
6. JSON dosyası otomatik olarak indirilecek (örn: `chatnow-play-api-xxxxx.json`)

⚠️ **ÖNEMLİ:** Bu JSON dosyasını güvenli bir yerde saklayın! Bu dosya Google Play API'ye erişim sağlar.

### 6. Service Account'u Google Play Console'a Bağla

1. Yeni bir sekmede **Google Play Console**'a gidin:
   ```
   https://play.google.com/console
   ```

2. Uygulamanızı seçin (veya oluşturun)

3. Sol menüden **"Setup"** → **"API access"** seçin

4. **"Link a service account"** bölümüne gidin

5. **"CREATE NEW SERVICE ACCOUNT"** linkine tıklayın
   - Bu sizi Google Cloud Console'a yönlendirecek
   - Yukarıdaki adımları tamamladıysanız bu adımı atlayabilirsiniz

6. **"Grant access"** bölümünde:
   - Oluşturduğunuz Service Account'u seçin (eğer listede görünmüyorsa, email adresini manuel girin)
   - **"Grant access"** butonuna tıklayın

7. **Permissions** ekranında:
   - ✅ **"View financial data"** seçeneğini işaretleyin (satın alma doğrulaması için gerekli)
   - ✅ **"Manage orders and subscriptions"** seçeneğini işaretleyin
   - **"Invite user"** butonuna tıklayın

8. Service Account başarıyla bağlandı! ✅

### 7. JSON Key'i Environment Variable Olarak Ayarla

#### Local Development (.env dosyası)

1. İndirdiğiniz JSON dosyasını açın (metin editörü ile)
2. Tüm içeriği kopyalayın
3. `backend/.env` dosyasına ekleyin:

```env
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

**ÖNEMLİ:** JSON içeriğini tek tırnak içine alın ve tüm JSON'u tek satırda yazın!

#### Koyeb Production

1. **Koyeb Dashboard**'a gidin:
   ```
   https://app.koyeb.com
   ```

2. Service'inizi seçin (chatnow-backend)

3. **"Variables"** sekmesine gidin

4. **"+ Add Variable"** butonuna tıklayın

5. Formu doldurun:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** JSON dosyasının tüm içeriğini yapıştırın (tek satırda)
   - **Secret:** ✅ İşaretleyin (güvenlik için)

6. **"Save"** butonuna tıklayın

7. Service'i yeniden başlatın (Koyeb otomatik olarak yeniden başlatır)

## ✅ Doğrulama

Backend log'larında şunu görmelisiniz:

```
✅ Google Play Developer API initialized
```

Eğer hata görürseniz:
- JSON formatını kontrol edin (geçerli JSON olmalı)
- Service Account'un Google Play Console'a bağlı olduğundan emin olun
- API'nin etkinleştirildiğinden emin olun

## 🔒 Güvenlik Notları

1. **JSON key'i asla Git'e commit etmeyin!**
   - `.gitignore` dosyasına `*service-account*.json` eklenmiş olmalı
   - Zaten eklenmiş ✅

2. **JSON key'i sadece environment variable olarak kullanın**
   - Dosya olarak saklamayın
   - Production'da sadece Koyeb environment variable'ında olmalı

3. **Service Account permissions'ı minimum tutun**
   - Sadece gerekli izinleri verin
   - "View financial data" ve "Manage orders" yeterli

## 🐛 Sorun Giderme

### "API not enabled" hatası
- Google Cloud Console'da "Google Play Android Developer API"nin etkinleştirildiğinden emin olun

### "Permission denied" hatası
- Service Account'un Google Play Console'a bağlı olduğundan emin olun
- "View financial data" permission'ının verildiğinden emin olun

### "Invalid JSON" hatası
- JSON içeriğinin tek satırda ve tek tırnak içinde olduğundan emin olun
- Özel karakterlerin escape edildiğinden emin olun

### "Service account not found" hatası
- Service Account email'ini Google Play Console'da kontrol edin
- Service Account'un doğru projede olduğundan emin olun

## 📚 Ek Kaynaklar

- [Google Play Developer API Dokümantasyonu](https://developers.google.com/android-publisher)
- [Service Account Oluşturma Rehberi](https://cloud.google.com/iam/docs/service-accounts)
- [Google Play Console API Access](https://support.google.com/googleplay/android-developer/answer/6112435)

