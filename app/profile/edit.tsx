import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ApiService } from '../../config/api';
import { useAuth, User } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { NavigationHelper } from '../../utils/NavigationHelper';

export default function EditProfile() {
  const router = useRouter();
  const { currentUser, updateProfile } = useProfile();
  const { currentUser: authUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: currentUser.name,
    surname: currentUser.surname,
    age: currentUser.age.toString(),
    location: currentUser.location,
    about: currentUser.about,
    hobbies: currentUser.hobbies.join(', '),
  });
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf galerisine erişim için izin gereklidir.');
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin gereklidir.');
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowImagePicker(false);
    }
  };

  const takePhotoWithCamera = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowImagePicker(false);
    }
  };

  // Resmi sıkıştıran fonksiyon
  const compressImage = async (imageUri: string): Promise<string> => {
    try {
      const resizedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: 400,
              height: 400
            }
          }
        ],
        {
          compress: 0.5, // %50 kalite
          format: ImageManipulator.SaveFormat.JPEG
        }
      );
      return resizedImage.uri;
    } catch (error) {
      console.error('❌ Edit: Resim sıkıştırılırken hata:', error);
      throw new Error('Resim sıkıştırılamadı');
    }
  };

  // Blob'u Base64'e çeviren fonksiyon
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, kısmını kaldır
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        Alert.alert('Hata', 'Ad alanı gereklidir');
        return;
      }
      if (formData.name.length > 15) {
        Alert.alert('Hata', 'Ad en fazla 15 karakter olabilir');
        return;
      }
      if (formData.surname && formData.surname.length > 15) {
        Alert.alert('Hata', 'Soyad en fazla 15 karakter olabilir');
        return;
      }
      
      // Convert hobbies string to array
      const hobbiesArray = formData.hobbies
        .split(',')
        .map(hobby => hobby.trim())
        .filter(hobby => hobby.length > 0);

      // Backend'e gönderilecek veri
      const profileUpdateData: any = {
        name: formData.name,
        surname: formData.surname,
        age: parseInt(formData.age) || currentUser.age,
        location: formData.location,
        about: formData.about,
        hobbies: hobbiesArray,
      };

      // Eğer resim seçildiyse sıkıştır, Base64'e çevir ve avatar_image alanını güncelle
      if (selectedImage) {
        try {
          // Profil resmi işleniyor
          
          // Önce resmi sıkıştır
          const compressedImageUri = await compressImage(selectedImage);
          // Resim sıkıştırıldı
          
          // Sıkıştırılmış resmi fetch et
          const response = await fetch(compressedImageUri);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          // Blob oluşturuldu
          
          // Resim boyutunu kontrol et (500KB limit)
          if (blob.size > 500000) {
            Alert.alert('Hata', 'Resim çok büyük (500KB\'dan fazla). Lütfen daha küçük bir resim seçin.');
            return;
          }
          
          const base64 = await blobToBase64(blob);
          // Base64 dönüşümü tamamlandı
          
          profileUpdateData.avatar_image = base64;
        } catch (error) {
          console.error('❌ Profil resmi işlenirken hata:', error);
          Alert.alert('Hata', `Profil resmi yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
          return;
        }
      }

      // Backend'e profil güncelleme isteği gönder
      const response = await ApiService.updateProfile(profileUpdateData);

      // Local state'i de güncelle - AuthContext ile uyumlu field mapping
      const updatedProfile: Partial<User> = {
        name: formData.name,
        surname: formData.surname,
        age: parseInt(formData.age) || currentUser.age,
        location: formData.location,
        about: formData.about,
        hobbies: hobbiesArray,
      };

      // Eğer resim seçildiyse local state'e de ekle
      if (selectedImage && profileUpdateData.avatar_image) {
        updatedProfile.avatar_image = profileUpdateData.avatar_image;
        updatedProfile.avatar = ''; // Avatar emoji'yi temizle
      }

      await updateProfile(updatedProfile);
      
      setShowSuccessModal(true);
      // 2 saniye sonra otomatik kapat ve profile git
      setTimeout(() => {
        setShowSuccessModal(false);
        NavigationHelper.goToProfile();
      }, 2000);
    } catch (error) {
      console.error('❌ Profil güncellenirken hata:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={currentUser?.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff5571', '#ff6b95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => NavigationHelper.goToProfile()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Profili Düzenle</Text>
          <View style={styles.placeholder} />
        </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Image Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={() => setShowImagePicker(true)}
              activeOpacity={0.8}
            >
              {selectedImage ? (
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('❌ Edit: Seçilen resim yüklenemedi:', selectedImage, error);
                  }}
                  onLoad={() => {
                  }}
                />
              ) : currentUser.avatarImage ? (
                <Image 
                  source={{ 
                    uri: currentUser.avatarImage.startsWith('data:') 
                      ? currentUser.avatarImage 
                      : currentUser.avatarImage.startsWith('http')
                      ? currentUser.avatarImage
                      : `data:image/jpeg;base64,${currentUser.avatarImage}`
                  }} 
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('❌ Edit: Mevcut profil resmi yüklenemedi:', currentUser.avatarImage, error);
                  }}
                  onLoad={() => {
                    console.log('✅ Edit: Mevcut profil resmi yüklendi:', currentUser.avatarImage);
                  }}
                />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: currentUser.bgColor }]}>
                  <Text style={styles.profileEmoji}>{currentUser.avatar}</Text>
                </View>
              )}
              <View style={styles.editImageButton}>
                <Ionicons name="camera" size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name - Full Width */}
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Ad</Text>
              <View style={styles.compactInputContainer}>
                <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.compactInput}
                  value={formData.name}
                  onChangeText={(value) => {
                    if (value.length <= 15) {
                      handleInputChange('name', value);
                    }
                  }}
                  placeholder="Adınızı girin"
                  placeholderTextColor="#9ca3af"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Surname - Full Width */}
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Soyad</Text>
              <View style={styles.compactInputContainer}>
                <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.compactInput}
                  value={formData.surname}
                  onChangeText={(value) => {
                    if (value.length <= 15) {
                      handleInputChange('surname', value);
                    }
                  }}
                  placeholder="Soyadınızı girin"
                  placeholderTextColor="#9ca3af"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Age and Location - Side by Side */}
            <View style={styles.rowContainer}>
              <View style={[styles.compactCard, styles.halfWidth]}>
                <Text style={styles.compactLabel}>Yaş</Text>
                <View style={styles.compactInputContainer}>
                  <Ionicons name="calendar" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.compactInput}
                    value={formData.age}
                    onChangeText={(value) => handleInputChange('age', value)}
                    placeholder="Yaşınızı girin"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={[styles.compactCard, styles.halfWidth]}>
                <Text style={styles.compactLabel}>Şehir</Text>
                <View style={styles.compactInputContainer}>
                  <Ionicons name="location" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.compactInput}
                    value={formData.location}
                    onChangeText={(value) => handleInputChange('location', value)}
                    placeholder="Şehrinizi girin"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Hobbies - Full Width */}
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Hobiler</Text>
              <View style={styles.compactInputContainer}>
                <Ionicons name="heart" size={20} color="#6b7280" style={styles.inputIcon} />
                <View style={styles.inputWithSuggestion}>
                  <TextInput
                    style={styles.compactInput}
                    value={formData.hobbies}
                    onChangeText={(value) => handleInputChange('hobbies', value)}
                    placeholder="Müzik, spor, okuma, film..."
                    placeholderTextColor="#9ca3af"
                  />
                  {!formData.hobbies && (
                    <Text style={styles.suggestionText}>Müzik, spor, okuma, film...</Text>
                  )}
                </View>
              </View>
            </View>

            {/* About - Full Width */}
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Hakkımda</Text>
              <View style={styles.compactInputContainer}>
                <Ionicons name="information-circle" size={20} color="#6b7280" style={styles.inputIcon} />
                <View style={styles.inputWithSuggestion}>
                  <TextInput
                    style={[styles.compactInput, styles.autoExpandInput]}
                    value={formData.about}
                    onChangeText={(value) => handleInputChange('about', value)}
                    placeholder="Kendinizi tanıtın, nelerden hoşlandığınızı yazın..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  {!formData.about && (
                    <Text style={styles.suggestionText}>Kendinizi tanıtın, nelerden hoşlandığınızı yazın...</Text>
                  )}
                </View>
              </View>
              <Text style={styles.characterCount}>{formData.about.length}/500</Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={currentUser?.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff5571', '#ff6b95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
      </ScrollView>

        {/* Modern Image Picker Modal */}
        <Modal
          visible={showImagePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImagePicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImagePicker(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Profil Resmi Seç</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowImagePicker(false)}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={pickImageFromGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={24} color="#ff6b95" />
                  <Text style={styles.modalButtonText}>Galeriden Seç</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={takePhotoWithCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={24} color="#ff6b95" />
                  <Text style={styles.modalButtonText}>Kamera ile Çek</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modern Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContainer}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#10B981" />
              </View>
              
              <Text style={styles.successTitle}>Başarılı!</Text>
              <Text style={styles.successMessage}>Profil başarıyla güncellendi</Text>
              
              <View style={styles.successProgressContainer}>
                <View style={styles.successProgressBar}>
                  <View style={styles.successProgressFill} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
    overflow: 'hidden',
  },
  profileEmoji: {
    fontSize: 60,
    textAlign: 'center',
    lineHeight: 120,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff6b95',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  compactInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  compactInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    padding: 0,
  },
  textAreaInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  autoExpandInput: {
    minHeight: 20,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  inputWithSuggestion: {
    flex: 1,
    position: 'relative',
  },
  suggestionText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    fontSize: 16,
    color: '#d1d5db',
    pointerEvents: 'none',
    zIndex: 1,
  },
  halfWidth: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 48,
  },
  textArea: {
    height: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 8,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ff6b95',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  modalButtonText: {
    color: '#ff6b95',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  // Modern Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  successProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
    width: '100%',
  },
});