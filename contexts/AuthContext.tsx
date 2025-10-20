import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_CONFIG, ApiService } from '../config/api';
import ImageCacheService from '../services/ImageCacheService';
import { NotificationService } from '../services/NotificationService';
import { webSocketService } from '../services/websocket';

export interface User {
  id: string;
  email: string;
  password?: string; // Şifre bilgisini saklamak için
  name: string;
  surname: string;
  age: number;
  location: string;
  gender: 'male' | 'female'; // Cinsiyet - erkek/kadın
  about?: string;
  avatar?: string;
  avatar_image?: string;
  bg_color?: string;
  diamonds?: number;
  is_online?: boolean;
  hobbies?: string[];
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  surname: string;
  age: number;
  location: string;
  gender: 'male' | 'female'; // Cinsiyet - erkek/kadın
}

export interface LoginData {
  email: string;
  password: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (loginData: LoginData) => Promise<boolean>;
  register: (registerData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatedProfile: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // İlk açılışta true yap

  // Debug: currentUser değişikliklerini izle
  useEffect(() => {
    // AuthContext state changes
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    // Check for stored user data
    const checkStoredUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user_data');
        const savedToken = await AsyncStorage.getItem('auth_token');
        
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          
          // Token'ı ApiService'e set et
          await ApiService.setToken(savedToken);
          
          // Backend'den güncel kullanıcı verilerini çek
          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/profile`, {
              headers: {
                'Authorization': `Bearer ${savedToken}`,
              },
            });
            
            if (response.ok) {
              const updatedUserData = await response.json();
              // Güncel veriyi set et
              setCurrentUser({
                id: updatedUserData.user.id,
                name: updatedUserData.user.name,
                surname: updatedUserData.user.surname,
                age: updatedUserData.user.age,
                location: updatedUserData.user.location,
                gender: updatedUserData.user.gender,
                avatar: updatedUserData.user.avatar,
                avatar_image: updatedUserData.user.avatar_image,
                bg_color: updatedUserData.user.bg_color,
                about: updatedUserData.user.about,
                hobbies: updatedUserData.user.hobbies,
                diamonds: updatedUserData.user.diamonds,
                is_online: true,
              });
              
              // Güncel veriyi AsyncStorage'a kaydet
              await AsyncStorage.setItem('user_data', JSON.stringify({
                id: updatedUserData.user.id,
                name: updatedUserData.user.name,
                surname: updatedUserData.user.surname,
                age: updatedUserData.user.age,
                location: updatedUserData.user.location,
                gender: updatedUserData.user.gender,
                avatar: updatedUserData.user.avatar,
                avatar_image: updatedUserData.user.avatar_image,
                bg_color: updatedUserData.user.bg_color,
                about: updatedUserData.user.about,
                hobbies: updatedUserData.user.hobbies,
                diamonds: updatedUserData.user.diamonds,
                is_online: true,
              }));
            }
          } catch (error) {
            console.error('Error fetching updated user data:', error);
          }
          
          // Connect to WebSocket
          try {
            await webSocketService.connect(userData.id);
          } catch (error) {
            console.error('WebSocket connection failed:', error);
          }
        }
      } catch (error) {
        console.error('Error checking stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredUser();
  }, []);

  // WebSocket profil güncellemesi dinleyicisi
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleProfileUpdate = (data: { userId: string; updatedFields: any }) => {
      // Sadece kendi profil güncellemesini dinle
      if (data.userId === currentUser.id.toString()) {
        console.log('🔄 Profil güncellendi (WebSocket):', data.updatedFields);
        
        // Profil resmi değiştiyse cache'i temizle
        if (data.updatedFields.avatar || data.updatedFields.avatar_image) {
          ImageCacheService.clearProfileImageCache(currentUser.id.toString());
        }

        // State'i güncelle
        setCurrentUser(prevUser => ({
          ...prevUser!,
          ...data.updatedFields
        }));

        // AsyncStorage'ı da güncelle
        AsyncStorage.setItem('user_data', JSON.stringify({
          ...currentUser,
          ...data.updatedFields
        })).catch(error => {
          console.error('AsyncStorage update error:', error);
        });
      }
    };

    // WebSocket listener'ı ekle
    webSocketService.on('profileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      webSocketService.off('profileUpdated', handleProfileUpdate);
    };
  }, [currentUser?.id]);

  // App state listener - uygulama arkaplana geçince offline yap
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', nextAppState);
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Uygulama arkaplana geçti, sadece kullanıcıyı offline yap
        console.log('📱 App went to background - setting user offline');
        // WebSocket'i kesme, sadece offline yap
        if (webSocketService.isConnected()) {
          webSocketService.emit('setUserOffline', { userId: currentUser?.id });
        }
      } else if (nextAppState === 'active') {
        // Uygulama aktif oldu, kullanıcıyı online yap
        console.log('📱 App is now active - setting user online');
        if (webSocketService.isConnected()) {
          webSocketService.emit('setUserOnline', { userId: currentUser?.id });
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      appStateSubscription?.remove();
    };
  }, [currentUser?.id]);

  // WebSocket connection management
  useEffect(() => {
    if (!currentUser?.id) return;

    // Connect to WebSocket when user is available
    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isConnected()) {
          await webSocketService.connect(currentUser.id);
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
    };
  }, [currentUser?.id]);


  // checkAuthStatus fonksiyonu artık gerekli değil, Firebase auth state listener kullanıyoruz

  const login = async (loginData: LoginData): Promise<boolean> => {
    try {
      // Email formatını kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        throw new Error('Geçersiz email formatı');
      }
      
      // API ile giriş yap
      const response = await ApiService.login(loginData.email, loginData.password) as any;
      
      if (response.token && response.user) {
        
        // Kullanıcı bilgilerini güncelle
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          surname: response.user.surname,
          age: response.user.age || 25, // Fallback yaş
          location: response.user.location || 'İstanbul', // Fallback şehir
          gender: response.user.gender,
          avatar: response.user.avatar,
          avatar_image: response.user.avatar_image,
          bg_color: response.user.bg_color,
          about: response.user.about,
          hobbies: response.user.hobbies,
          diamonds: response.user.diamonds,
          is_online: true,
        };
        
        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        // Token'ı kaydet
        await ApiService.setToken(response.token);
        
        // Kullanıcı bilgilerini kaydet
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        // WebSocket'e bağlan
        try {
          await webSocketService.connect(userData.id);
        } catch (error) {
          console.error('WebSocket connection failed:', error);
        }

        // Push token'ı kaydet
        try {
          console.log('🔔 Attempting to register push token...');
          
          // Önce notification service'i initialize et
          const notificationInitialized = await NotificationService.initialize();
          if (!notificationInitialized) {
            console.log('❌ Notification service initialization failed');
            return true; // Login devam etsin ama push token olmadan
          }
          
          const pushToken = NotificationService.getPushToken();
          console.log('🔔 Push token status:', { hasToken: !!pushToken, token: pushToken ? pushToken.substring(0, 20) + '...' : 'NULL' });
          
          if (pushToken && pushToken !== 'local-notification-token') {
            const result = await NotificationService.registerPushToken(userData.id);
            console.log('🔔 Push token registration result:', result);
            if (result) {
              console.log('✅ Push token kaydedildi');
            } else {
              console.log('❌ Push token kaydedilemedi');
            }
          } else {
            console.log('⚠️ Push token bulunamadı veya geçersiz');
          }
        } catch (pushError) {
          console.error('❌ Push token kaydetme hatası:', pushError);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (registerData: RegisterData): Promise<boolean> => {
    try {
      // API ile kullanıcı oluştur
      const response = await ApiService.register(registerData) as any;
      
      if (response.token && response.user) {
        
        // Kullanıcı bilgilerini güncelle
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          surname: response.user.surname,
          age: response.user.age || 25, // Fallback yaş
          location: response.user.location || 'İstanbul', // Fallback şehir
          gender: response.user.gender,
          avatar: response.user.avatar,
          avatar_image: response.user.avatar_image,
          bg_color: response.user.bg_color,
          about: response.user.about,
          diamonds: response.user.diamonds,
          is_online: true,
          hobbies: response.user.hobbies
        };
        
        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        // Token'ı kaydet
        await ApiService.setToken(response.token);
        
        // Kullanıcı bilgilerini kaydet
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        // WebSocket'e bağlan
        try {
          await webSocketService.connect(userData.id);
        } catch (error) {
          console.error('WebSocket connection failed:', error);
        }

        // Push token'ı kaydet
        try {
          const pushToken = NotificationService.getPushToken();
          
          if (pushToken) {
            await NotificationService.registerPushToken(userData.id);
          }
        } catch (pushError) {
          // Push token kaydetme hatası
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const updateProfile = async (updatedProfile: Partial<User>) => {
    try {
      if (!currentUser) return;
      
      // Güncellenmiş kullanıcı bilgilerini oluştur
      const updatedUser = {
        ...currentUser,
        ...updatedProfile,
      };
      
      // State'i güncelle
      setCurrentUser(updatedUser);
      
      // AsyncStorage'ı güncelle
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

      // Profil resmi değiştiyse cache'i temizle
      if (updatedProfile.avatar_image || updatedProfile.avatar) {
        ImageCacheService.clearProfileImageCache(currentUser.id.toString());
      }
      
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Push token'ı backend'ten temizle
      if (currentUser?.id) {
        try {
          const { NotificationService } = await import('../services/NotificationService');
          await NotificationService.clearPushToken(currentUser.id);
        } catch (pushError) {
          // Push token temizleme hatası önemli değil, devam et
        }
      }

      // Kullanıcıyı offline yap
      if (currentUser?.id) {
        webSocketService.setUserOffline(currentUser.id);
      }
      
      // WebSocket'i disconnect yap
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
      
      // Local storage'ı temizle
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('auth_token');
      
      // State'i temizle
      setCurrentUser(null);
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Hata olsa bile kullanıcıyı temizle
      setCurrentUser(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('auth_token');
    }
  };

  // App lifecycle events - uygulama arka plana geçince offline yap
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Uygulama arka plana geçti - offline yap
        webSocketService.setUserOffline(currentUser.id);
      } else if (nextAppState === 'active') {
        // Uygulama ön plana geldi - online yap
        webSocketService.setUserOnline(currentUser.id);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [currentUser?.id]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      currentUser, 
      login, 
      register, 
      logout, 
      updateProfile,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};