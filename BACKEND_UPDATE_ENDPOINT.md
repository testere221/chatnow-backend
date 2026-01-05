# Backend Update Endpoint Ekleme Talimatları

## 📍 Backend Klasörü
`C:\Users\PC\Desktop\yedek\ChatNow\backend`

## 🔧 Yapılacak Değişiklik

`backend/index.js` dosyasında `/api/users/update` endpoint'ini eklemen gerekiyor.

### Endpoint Kodu

Aşağıdaki kodu `backend/index.js` dosyasına ekle. Endpoint'i `/api/users/update-diamonds` endpoint'inden SONRA, `/api/users/:id/block` endpoint'inden ÖNCE ekle:

```javascript
// Update user data endpoint - Spesifik route, :id route'larından önce olmalı
app.post('/api/users/update', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Profile update request received');
    console.log('🔧 Request URL:', req.url);
    console.log('🔧 Request path:', req.path);
    console.log('🔧 Request method:', req.method);
    const userId = req.user.userId;
    const { name, surname, age, location, about, hobbies, avatar_image } = req.body;
    
    console.log('🔧 Update data:', { userId, name, surname, age, location, about, hobbies, hasAvatarImage: !!avatar_image });

    // userId'yi ObjectId'ye çevir (eğer string ise)
    let userObjectId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } else {
      userObjectId = userId;
    }

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
    console.log('🔧 Updating user with ObjectId:', userObjectId);

    const updatedUser = await User.findByIdAndUpdate(
      userObjectId,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      console.error('❌ User not found:', userObjectId);
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }
    
    console.log('✅ User updated successfully:', updatedUser._id);

    res.json({ 
      message: 'Kullanıcı bilgileri güncellendi.', 
      user: {
        id: updatedUser._id.toString(), // MongoDB ObjectId'yi string'e çevir
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
        hobbies: updatedUser.hobbies || [],
        diamonds: updatedUser.diamonds || 0,
        is_online: true,
        last_active: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Kullanıcı bilgileri güncellenirken hata oluştu.', error: error.message });
  }
});
```

## 📝 Adımlar

1. `C:\Users\PC\Desktop\yedek\ChatNow\backend\index.js` dosyasını aç
2. `/api/users/update-diamonds` endpoint'ini bul (satır ~1111 civarı)
3. O endpoint'ten SONRA yukarıdaki kodu ekle
4. Backend'i yeniden başlat: `npm start`

## ⚠️ Önemli

- Endpoint'i `/api/users/:id/block` endpoint'inden ÖNCE ekle (route sırası önemli!)
- `authenticateToken` middleware'i kullanıldığından emin ol
- Backend'i yeniden başlatmayı unutma

## ✅ Test

Backend'i yeniden başlattıktan sonra:
1. Frontend'de profil güncelleme işlemini dene
2. Backend konsolunda "Profile update request received" logunu görmelisin
3. Profil güncelleme başarılı olmalı

