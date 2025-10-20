import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { API_CONFIG } from '../config/api';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';
import ImageCacheService from '../services/ImageCacheService';

export interface UserProfile {
  id: string;
  name: string;
  surname: string;
  age: number;
  location: string;
  gender: 'male' | 'female'; // Cinsiyet - erkek/kadın
  avatar: string;
  avatarImage?: string; // Resim URI'si için opsiyonel alan
  bgColor: string;
  about: string;
  hobbies: string[];
  isOnline: boolean;
  diamonds: number;
}

export interface BlockedUser {
  id: string;
  name: string;
  surname: string;
  age: number;
  gender: 'male' | 'female';
  avatar: string;
  bgColor: string;
  reason: string;
  blockedDate: string;
}

interface ProfileContextType {
  currentUser: UserProfile;
  blockedUsers: string[]; // Sadece user ID'leri
  updateProfile: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  updateDiamonds: (diamonds: number) => void;
  spendDiamonds: (amount: number) => Promise<boolean>;
  addDiamonds: (amount: number) => Promise<void>;
  blockUser: (user: UserProfile, reason: string) => void;
  unblockUser: (userId: string) => void;
  resetUserData: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Initial user profile data - boş profil
const initialProfile: UserProfile = {
  id: '',
  name: '',
  surname: '',
  age: 0,
  location: '',
  gender: 'female', // Varsayılan kadın
  avatar: '👤',
  bgColor: '#0b1215',
  about: '',
  hobbies: [],
  isOnline: false,
  diamonds: 0,
};

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser: authUser, updateProfile: updateAuthProfile } = useAuth();
  const { updateUserState } = useChat();
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialProfile);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]); // Sadece user ID'leri

  // AuthContext'ten gelen kullanıcı bilgilerini ProfileContext'e senkronize et - OPTIMIZED
  useEffect(() => {
    if (authUser) {
      const profileUser: UserProfile = {
        id: authUser.id.toString(),
        name: authUser.name,
        surname: authUser.surname,
        age: authUser.age,
        location: authUser.location,
        gender: authUser.gender || 'female', // Varsayılan kadın, ama kayıt sırasında set edilecek
        avatar: authUser.avatar || '👤',
        avatarImage: authUser.avatar_image,
        bgColor: authUser.bg_color || '#FFB6C1',
        about: authUser.about || 'Yeni kullanıcı',
        hobbies: authUser.hobbies || ['Yeni kullanıcı'],
        isOnline: authUser.is_online || true,
        diamonds: authUser.diamonds ?? 1000 // Başlangıç jetonu
      };
      
      
      // Kullanıcı bilgilerini güncelle
      setCurrentUser(profileUser);
      
      // Engellenen kullanıcıları yükle
      loadBlockedUsersFromAPI(authUser.id.toString());
      
      return () => {};
    } else {
      // Auth user yoksa boş profil yap
      setCurrentUser(initialProfile);
      setBlockedUsers([]);
    }
  }, [authUser, authUser?.diamonds]);

  // Engellenen kullanıcıları yükle
  const loadBlockedUsersFromAPI = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        console.log('❌ Token yok, engellenen kullanıcılar yüklenemedi');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/blocked`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const blockedUserIds = data.blockedUsers.map((user: any) => user.id);
        setBlockedUsers(blockedUserIds);
        console.log('✅ Engellenen kullanıcılar yüklendi:', blockedUserIds);
      } else {
        console.error('❌ Engellenen kullanıcılar yüklenirken hata:', response.status);
      }
    } catch (error) {
      console.error('❌ Engellenen kullanıcılar yüklenirken hata:', error);
    }
  };

  const updateProfile = async (updatedProfile: Partial<User>) => {
    try {
      // AuthContext'teki kullanıcı bilgilerini güncelle
      await updateAuthProfile(updatedProfile);
      
      // Local state'i de güncelle - UserProfile ile uyumlu field mapping
      const profileUpdate: Partial<UserProfile> = {
        name: updatedProfile.name,
        surname: updatedProfile.surname,
        age: updatedProfile.age,
        location: updatedProfile.location,
        about: updatedProfile.about,
        hobbies: updatedProfile.hobbies,
        avatarImage: updatedProfile.avatar_image,
        avatar: updatedProfile.avatar,
      };
      
      setCurrentUser(prevProfile => ({
        ...prevProfile,
        ...profileUpdate,
      }));
      
      // Global state'i de güncelle (Chat ekranlarında profil resmi güncellemesi için)
      if (authUser?.id) {
        updateUserState(authUser.id, {
          name: updatedProfile.name || currentUser.name,
          surname: updatedProfile.surname || currentUser.surname,
          avatar: updatedProfile.avatar || currentUser.avatar,
          avatarImage: updatedProfile.avatar_image || currentUser.avatarImage || '',
          bgColor: currentUser.bgColor,
          gender: currentUser.gender,
          isOnline: true,
          lastSeen: new Date()
        });

        // Profil resmi değiştiyse cache'i temizle
        if (updatedProfile.avatar_image || updatedProfile.avatar) {
          ImageCacheService.clearProfileImageCache(authUser.id.toString());
        }
      }
      
    } catch (error) {
      console.error('❌ ProfileContext: Profil güncellenirken hata:', error);
      throw error;
    }
  };

  const spendDiamonds = async (amount: number): Promise<boolean> => {
    if (currentUser.diamonds >= amount) {
      try {
        const newDiamondCount = currentUser.diamonds - amount;
        
        // Backend'de elmas sayısını güncelle
        const token = await getToken();
        if (token) {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/update-diamonds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              diamonds: newDiamondCount
            }),
          });

          if (!response.ok) {
            throw new Error('Backend güncelleme hatası');
          }
        }

        // Local state'i güncelle
        setCurrentUser(prev => ({
          ...prev,
          diamonds: newDiamondCount,
        }));
        return true;
      } catch (error) {
        console.error('❌ ProfileContext: Elmas harcanırken hata:', error);
        return false;
      }
    }
    return false;
  };

  const addDiamonds = async (amount: number) => {
    try {
      const newDiamondCount = currentUser.diamonds + amount;
      
      // Backend'de elmas sayısını güncelle
      const token = await getToken();
      if (token) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/update-diamonds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            diamonds: newDiamondCount
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Backend güncelleme hatası');
        }

        const responseData = await response.json();
        console.log('✅ Jeton güncellendi:', responseData);
      }

      // Local state'i güncelle
      setCurrentUser(prev => ({
        ...prev,
        diamonds: newDiamondCount,
      }));
    } catch (error) {
      console.error('❌ ProfileContext: Elmas eklenirken hata:', error);
      // Hata durumunda kullanıcıyı bilgilendir
      Alert.alert(
        'Hata',
        'Jeton eklenirken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const updateDiamonds = (diamonds: number) => {
    setCurrentUser(prev => ({
      ...prev,
      diamonds: diamonds,
    }));
  };

  const getToken = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 Token alındı:', token ? 'Mevcut' : 'Yok');
      return token;
    } catch (error) {
      console.error('❌ Token alınırken hata:', error);
      return null;
    }
  };

  const blockUser = async (user: UserProfile, reason: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Token bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Backend'de engelleme kaydı oluştur
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${user.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Engelleme işlemi başarısız');
      }

      const result = await response.json();

      // Local state'i güncelle (sadece user ID'yi ekle)
      setBlockedUsers(prev => {
        // Zaten engellenmiş mi kontrol et
        if (prev.includes(user.id)) {
          return prev;
        }
        return [...prev, user.id];
      });

      console.log('✅ Kullanıcı engellendi:', result);
    } catch (error) {
      console.error('❌ Kullanıcı engellenirken hata:', error);
      throw error;
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Token bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Backend'den engelleme kaydını sil
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}/unblock`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Engelleme kaldırma işlemi başarısız');
      }

      const result = await response.json();

      // Local state'i güncelle
      setBlockedUsers(prev => prev.filter(id => id !== userId));

      console.log('✅ Engelleme kaldırıldı:', result);
    } catch (error) {
      console.error('❌ Engelleme kaldırılırken hata:', error);
      throw error;
    }
  };

  const resetUserData = () => {
    // resetUserData çağrıldı, boş profil yapılıyor
    setCurrentUser(initialProfile);
    setBlockedUsers([]);
  };

  // currentUser değiştiğinde temizleme
  useEffect(() => {
    if (!currentUser) {
      // Kullanıcı çıkış yaptığında temizle
      setCurrentUser(initialProfile);
      setBlockedUsers([]);
      // Kullanıcı çıkış yaptı, profil verileri temizlendi
    }
  }, [currentUser]);

  const value = useMemo(() => ({ 
    currentUser, 
    blockedUsers, 
    updateProfile, 
    updateDiamonds,
    spendDiamonds, 
    addDiamonds, 
    blockUser, 
    unblockUser,
    resetUserData
  }), [
    currentUser, 
    blockedUsers, 
    updateProfile, 
    updateDiamonds,
    spendDiamonds, 
    addDiamonds, 
    blockUser, 
    unblockUser,
    resetUserData
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
