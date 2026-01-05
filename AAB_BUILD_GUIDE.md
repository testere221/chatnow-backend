# 📦 Android App Bundle (AAB) Oluşturma Rehberi

Bu rehber Google Play Store'a yüklemek için AAB dosyası oluşturma adımlarını içerir.

## 📋 Ön Hazırlık

### 1. EAS CLI Kurulumu
```bash
npm install -g eas-cli
```

### 2. EAS Login
```bash
eas login
```
Expo hesabınızla giriş yapın (ferhatkortak2)

## 🚀 AAB Oluşturma

### Yöntem 1: EAS Build (Önerilen)

```bash
# Production AAB oluştur
eas build --platform android --profile production
```

Bu komut:
- ✅ EAS sunucularında build yapar
- ✅ Keystore'u otomatik yönetir
- ✅ AAB dosyasını indirir
- ✅ Google Play Store'a hazır

### Yöntem 2: Local Build (Alternatif)

```bash
# Android klasörüne git
cd android

# AAB oluştur
./gradlew bundleRelease

# AAB dosyası şurada olacak:
# android/app/build/outputs/bundle/release/app-release.aab
```

## 📝 Google Play Console'a Yükleme

### 1. Google Play Console'a Git
- https://play.google.com/console
- Uygulamanızı seçin (veya yeni uygulama oluşturun)

### 2. Production Track'e Git
- Sol menüden "Production" → "Create new release"

### 3. AAB Dosyasını Yükle
- "Upload" butonuna tıklayın
- Oluşturduğunuz `.aab` dosyasını seçin
- Yükleme tamamlanana kadar bekleyin

### 4. Release Notes Ekleyin
- "Release notes" bölümüne değişiklikleri yazın
- Örnek: "İlk sürüm - ChatNow uygulaması"

### 5. Review ve Submit
- "Review release" butonuna tıklayın
- Tüm bilgileri kontrol edin
- "Start rollout to Production" butonuna tıklayın

## 🔐 Keystore Bilgileri

**Önemli:** Keystore dosyasını ve şifrelerini güvenli bir yerde saklayın!

- **Keystore Dosyası:** `android/app/chatnow-release-key.keystore`
- **Key Alias:** `chatnow-key-alias`
- **Store Password:** `chatnow123`
- **Key Password:** `chatnow123`

## ⚠️ Önemli Notlar

1. **Version Code:** Her yeni release için `app.json` dosyasındaki `versionCode` değerini artırın
2. **Version Name:** `version` değerini güncelleyin (örn: 1.0.0 → 1.0.1)
3. **API URL:** Production API URL'lerinin doğru olduğundan emin olun (`config/api.ts`)
4. **Testing:** AAB'yi test etmek için "Internal testing" track'ine önce yükleyin

## 🐛 Sorun Giderme

### Build Hatası
- EAS credentials kontrol edin: `eas credentials`
- Keystore dosyasının doğru yerde olduğundan emin olun

### Google Play Console Hatası
- AAB formatının doğru olduğundan emin olun
- Version code'un önceki release'ten büyük olduğunu kontrol edin

## 📞 Yardım

- EAS Dokümantasyon: https://docs.expo.dev/build/introduction/
- Google Play Console: https://support.google.com/googleplay/android-developer

