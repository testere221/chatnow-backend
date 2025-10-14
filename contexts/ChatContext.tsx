import { useNavigation } from '@react-navigation/native';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ApiService } from '../config/api';
import { webSocketService } from '../services/websocket';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  timestamp: any;
  read: boolean;
  deletedFor: string[];
  is_from_user?: boolean; // Eski sistem uyumluluğu için
}

export interface Chat {
  id: string;
  user1Id: string;
  user2Id: string;
  lastMessage: string;
  lastTime: any;
  unreadCount: number;
  // Kullanıcı bilgileri
  name: string;
  avatar?: string;
  avatarImage?: string;
  bgColor?: string;
  gender?: string;
  timestamp?: string;
  // Diğer kullanıcı bilgileri
  otherUser?: {
    id: string;
    _id?: string;
    name: string;
    surname?: string;
    avatar?: string;
    avatar_image?: string;
    bg_color?: string;
    gender?: string;
    is_online?: boolean;
    last_active?: any;
  };
  unreadCountText?: string;
}

interface ChatContextType {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  messages: Message[];
  onlineUsers: { [userId: string]: boolean };
  userCache: { [userId: string]: any };
  isLoadingChats: boolean;
  
  // Global user state management
  globalUserStates: { [userId: string]: {
    isOnline: boolean;
    lastSeen: Date;
    name: string;
    surname: string;
    avatar: string;
    bgColor: string;
    gender: string;
  } };
  
  // Mesaj işlemleri
  sendMessage: (receiverId: string, text: string, imageUrl?: string) => Promise<void>;
  sendMessageToUser: (receiverId: string, text: string, imageUrl?: string) => Promise<void>;
  updateChat: (otherUserId: string, lastMessage: string, lastTime: string) => Promise<void>;
  addNewChat: (otherUserId: string, lastMessage: string, lastTime: string) => Promise<void>;
  hideMessagesForUser: (otherUserId: string) => Promise<void>;
  markMessageAsReadForUser: (messageId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: Message) => void;
  getMessages: (otherUserId: string, page?: number) => Promise<{ messages: Message[]; hasMore: boolean; total?: number }>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessagesAsRead: (otherUserId: string) => Promise<void>;
  setupUserMessagesListener: (userId: string, otherUserId: string, onUpdate: (messages: Message[]) => void) => () => void;
  
  // Sohbet işlemleri
  getChats: () => Promise<void>;
  getChatById: (chatId: string) => Chat | undefined;
  getTotalUnreadCount: () => number;
  getChatUnreadCount: (chatId: string) => number;
  
  // Kullanıcı bilgileri
  getUserInfo: (userId: string, forceRefresh?: boolean) => Promise<any>;
  clearUserCache: () => void;
  listenUserInfo: (userId: string, cb: (info: any|null) => void) => () => void;
  resetChatData: () => void;
  
  // Global user state methods
  updateUserState: (userId: string, state: Partial<{
    isOnline: boolean;
    lastSeen: Date;
    name: string;
    surname: string;
    avatar: string;
    avatarImage: string;
    bgColor: string;
    gender: string;
  }>) => void;
  getUserState: (userId: string) => any;
  
  // Engelleme
  isUserBlocked: (userId: string) => boolean;
  blockedUsers: string[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});
  
  // Debug: currentUser değişikliklerini izle
  useEffect(() => {
    // currentUser değişikliklerini izle
  }, [currentUser]);
  const [userCache, setUserCache] = useState<{ [userId: string]: any }>({});
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  // Global user states - tüm sayfalarda senkronize
  const [globalUserStates, setGlobalUserStates] = useState<{ [userId: string]: {
    isOnline: boolean;
    lastSeen: Date;
    name: string;
    surname: string;
    avatar: string;
    bgColor: string;
    gender: string;
  } }>({});
  
  // Message cache for performance
  const [messageCache, setMessageCache] = useState<{[key: string]: Message[]}>({});
  
  // Chat cache for performance
  const [chatCache, setChatCache] = useState<{data: Chat[], timestamp: number} | null>(null);
  const CACHE_DURATION = 30000; // 30 saniye cache

  // Count sistemi state'i
  const [unreadCounts, setUnreadCounts] = useState<{ [chatId: string]: number }>({});

  // Toplam okunmamış mesaj sayısını hesapla
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  // Belirli bir chat'in okunmamış mesaj sayısını getir
  const getChatUnreadCount = useCallback((chatId: string) => {
    return unreadCounts[chatId] || 0;
  }, [unreadCounts]);

  // Badge count güncelleme fonksiyonu
  const updateBadgeCount = useCallback(async (totalCount: number) => {
    try {
      const { NotificationService } = await import('../services/NotificationService');
      await NotificationService.setBadgeCount(totalCount);
    } catch (error) {
      // Error updating badge count
    }
  }, []);

  // Global user state methods
  const updateUserState = (userId: string, state: Partial<{
    isOnline: boolean;
    lastSeen: Date;
    name: string;
    surname: string;
    avatar: string;
    avatarImage: string;
    bgColor: string;
    gender: string;
    age: number;
    location: string;
    about: string;
    hobbies: string[];
    diamonds: number;
  }>) => {
    setGlobalUserStates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...state
      }
    }));
    
    // Online users state'ini de güncelle
    if (state.isOnline !== undefined) {
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: state.isOnline!
      }));
    }
  };

  const getUserState = (userId: string) => {
    const state = globalUserStates[userId] || null;
    // Debug sadece bulunamayanlar için
    if (!state) {
      // getUserState: Kullanıcı bulunamadı
    }
    return state;
  };

  // Kullanıcı bilgilerini cache'le
  const getUserInfo = async (userId: string, forceRefresh?: boolean) => {
    // Cache kontrolü
    if (!forceRefresh && userCache[userId]) {
      return userCache[userId];
    }
    
    try {
      // Önce chat verilerinden kullanıcı bilgilerini kontrol et
      const chatWithUser = chats.find(chat => {
        const parts = chat.id.split('_');
        return parts[0] === userId || parts[1] === userId;
      });
      
      if (chatWithUser && chatWithUser.otherUser) {
        const userInfo = {
          id: chatWithUser.otherUser.id || chatWithUser.otherUser._id,
          name: chatWithUser.otherUser.name || 'Kullanıcı',
          surname: chatWithUser.otherUser.surname || '',
          avatar: chatWithUser.otherUser.avatar || '👤',
          avatarImage: chatWithUser.otherUser.avatar_image || '',
          bgColor: chatWithUser.otherUser.bg_color || '#FFB6C1',
          gender: chatWithUser.otherUser.gender || 'female',
          isOnline: !!chatWithUser.otherUser.is_online,
          lastActive: chatWithUser.otherUser.last_active
        };
        
        setUserCache(prev => ({ ...prev, [userId]: userInfo }));
        
        // Global state'i de güncelle
        updateUserState(userId, {
          isOnline: userInfo.isOnline,
          lastSeen: userInfo.lastActive || new Date(),
          name: userInfo.name,
          surname: userInfo.surname,
          avatar: userInfo.avatar,
          avatarImage: userInfo.avatarImage,
          bgColor: userInfo.bgColor,
          gender: userInfo.gender
        });
        
        return userInfo;
      }
      
      // Chat verilerinde yoksa API'den al
      const users = await ApiService.getUsers() as any[];
      const userData = users.find((user: any) => user.id === userId);
      
      if (userData) {
        const userInfo = {
          id: userData.id,
          name: userData.name || 'Kullanıcı',
          surname: userData.surname || '',
          avatar: userData.avatar || '👤',
          avatarImage: userData.avatar_image || '',
          bgColor: userData.bg_color || '#FFB6C1',
          gender: userData.gender || 'female',
          isOnline: !!userData.is_online,
          lastActive: userData.last_active
        };
        
        setUserCache(prev => ({ ...prev, [userId]: userInfo }));
        return userInfo;
      } else {
        
        // Rastgele isim üret
        const names = ['Ahmet', 'Mehmet', 'Ali', 'Ayşe', 'Fatma', 'Zeynep', 'Can', 'Eren', 'Selin', 'Ece'];
        const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Aydın'];
        const colors = ['#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#FFA07A'];
        
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomGender = Math.random() > 0.5 ? 'male' : 'female';
        
        const defaultUserInfo = {
          id: userId,
          name: randomName,
          surname: randomSurname,
          avatar: randomGender === 'male' ? '👨' : '👩',
          avatarImage: '',
          bgColor: randomColor,
          gender: randomGender,
          isOnline: Math.random() > 0.3, // %70 online olma şansı
          lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // Son 24 saat içinde
        };
        setUserCache(prev => ({ ...prev, [userId]: defaultUserInfo }));
        return defaultUserInfo;
      }
    } catch (error) {
      // Sessiz hata - log spam'i önlemek için
    }
    
    const defaultInfo = {
      name: 'Kullanıcı',
      surname: '',
      avatar: '👤',
      avatarImage: '',
      bgColor: '#FFB6C1'
    };
    
    return defaultInfo;
  };

  // Cache'i temizle
  const clearUserCache = () => {
    setUserCache({});
  };

  // Kullanıcı bilgilerini gerçek zamanlı dinle
  const listenUserInfo = (userId: string, cb: (info: any|null) => void) => {
    // WebSocket üzerinden real-time güncellemeleri dinle
    const handleUserUpdate = (data: any) => {
      if (data.userId === userId) {
        const info = {
          id: data.id,
          name: data.name || 'Kullanıcı',
          surname: data.surname || '',
          avatar: data.avatar || '👤',
          avatarImage: data.avatar_image || '',
          bgColor: data.bg_color || '#FFB6C1',
          gender: data.gender || 'female',
          isOnline: !!data.is_online,
          lastActive: data.last_active
        };
        setUserCache(prev => ({ ...prev, [userId]: info }));
        cb(info);
      }
    };

    webSocketService.on('userUpdate', handleUserUpdate);
    
    return () => {
      webSocketService.off('userUpdate', handleUserUpdate);
    };
  };

  // Chat verilerini sıfırla
  const resetChatData = () => {
    setChats([]);
    setMessages([]);
    setOnlineUsers({});
    setUserCache({});
    setBlockedUsers([]);
  };

  // Engellenen kullanıcıları kontrol et
  const isUserBlocked = (userId: string) => {
    return blockedUsers.includes(userId);
  };

  // Toplam okunmamış mesaj sayısını getir
  // Count sistemi kaldırıldı

  // Mesaj gönder
  const sendMessage = async (receiverId: string, text: string, imageUrl?: string): Promise<any> => {
    if (!currentUser?.id) {
      return;
    }
    
    try {
      // API ile mesaj gönder
      const response = await ApiService.sendMessage(receiverId, text, imageUrl);
      
      // WebSocket bağlantısını kontrol et
      if (!webSocketService.isConnected()) {
        await webSocketService.connect(currentUser.id);
      }
      
      // Mesaj gönderildikten sonra chat listesini güncelle
      const chatId = [currentUser.id, receiverId].sort().join('_');
      const existingChatIndex = chats.findIndex(chat => chat.id === chatId);

      if (existingChatIndex !== -1) {
        // Update existing chat
        setChats(prevChats =>
          prevChats.map((chat, index) =>
            index === existingChatIndex
              ? {
                  ...chat,
                  lastMessage: text || 'Resim',
                  lastTime: new Date()
                }
              : chat
          )
        );
      } else {
        // Create new chat
        try {
          const userInfo = await getUserInfo(receiverId);
          const newChat: Chat = {
            id: chatId,
            user1Id: currentUser.id,
            user2Id: receiverId,
            lastMessage: text || 'Resim',
            lastTime: new Date(),
            unreadCount: 0, // Sender doesn't have unread messages for their own sent message
            name: userInfo.name || 'Kullanıcı',
            avatar: userInfo.avatar || '👤',
            bgColor: userInfo.bgColor || '#FFB6C1',
            gender: userInfo.gender || 'female',
            otherUser: {
              id: receiverId,
              name: userInfo.name || 'Kullanıcı',
              avatar: userInfo.avatar || '👤',
              bg_color: userInfo.bgColor || '#FFB6C1',
              gender: userInfo.gender || 'female',
              is_online: userInfo.isOnline || false
            }
          };
          setChats(prevChats => [newChat, ...prevChats]);
        } catch (error) {
          console.error('Error fetching user info for new chat in sendMessage:', error);
          // Fallback for new chat if user info fetch fails
          const newChat: Chat = {
            id: chatId,
            user1Id: currentUser.id,
            user2Id: receiverId,
            lastMessage: text || 'Resim',
            lastTime: new Date(),
            unreadCount: 0,
            name: 'Kullanıcı',
            avatar: '👤',
            bgColor: '#FFB6C1',
            gender: 'female',
            otherUser: {
              id: receiverId,
              name: 'Kullanıcı',
              avatar: '👤',
              bg_color: '#FFB6C1',
              gender: 'female',
              is_online: false
            }
          };
          setChats(prevChats => [newChat, ...prevChats]);
        }
      }
      
      // Response'dan güncel jeton sayısını al
      if (response && (response as any).user && (response as any).user.diamonds !== undefined) {
        // Bu bilgiyi chat sayfasında kullanmak için return edelim
        return { ...response, updatedDiamonds: (response as any).user.diamonds };
      }
      
      return response;
    } catch (error: any) {
      throw error;
    }
  };

  // Mesaj gönder (eski sistem uyumluluğu için)
  const sendMessageToUser = async (receiverId: string, text: string, imageUrl?: string) => {
    return sendMessage(receiverId, text, imageUrl);
  };

  // Chat güncelle (eski sistem uyumluluğu için)
  const updateChat = async (otherUserId: string, lastMessage: string, lastTime: string) => {
    // Bu fonksiyon artık gerekli değil çünkü sendMessage otomatik olarak chat'i güncelliyor
  };

  // Yeni chat ekle (eski sistem uyumluluğu için)
  const addNewChat = async (otherUserId: string, lastMessage: string, lastTime: string) => {
    // Bu fonksiyon artık gerekli değil çünkü sendMessage otomatik olarak chat'i oluşturuyor
  };

  // Mesajları gizle (eski sistem uyumluluğu için)
  const hideMessagesForUser = async (otherUserId: string) => {
    // Bu fonksiyon artık gerekli değil çünkü deleteMessage kullanılıyor
  };

  // Mesajı okundu olarak işaretle (eski sistem uyumluluğu için)
  const markMessageAsReadForUser = async (messageId: string) => {
    // Bu fonksiyon artık gerekli değil çünkü markMessagesAsRead kullanılıyor
  };

  // Chat'i sil (eski sistem uyumluluğu için)
  const deleteChat = async (chatId: string) => {
    try {
      // API'den chat'i sil
      await ApiService.deleteChat(chatId);
      
      // Local state'den chat'i kaldır
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // Count'u da temizle
      setUnreadCounts(prevCounts => {
        const newCounts = { ...prevCounts };
        delete newCounts[chatId];
        
        // Toplam count'ı hesapla ve badge'i güncelle
        const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
        updateBadgeCount(totalCount);
        
        return newCounts;
      });
      
    } catch (error) {
      throw error;
    }
  };

  // Mesajları temizle (eski sistem uyumluluğu için)
  const clearMessages = () => {
    setMessages([]);
  };

  // Mesaj ekle (eski sistem uyumluluğu için)
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Mesajları getir
  const getMessages = async (otherUserId: string, page: number = 1) => {
    if (!currentUser?.id) return { messages: [], hasMore: false };
    
    try {
      const chatId = [currentUser.id, otherUserId].sort().join('_');
      const response = await ApiService.getMessages(chatId, page) as any;
      
      if (page === 1) {
        // İlk sayfa - mesajları sıfırla
        setMessages(response.messages || []);
      } else {
        // Sonraki sayfalar - mevcut mesajların başına ekle
        setMessages(prev => [...(response.messages || []), ...prev]);
      }
      
      return {
        messages: response.messages || [],
        hasMore: response.pagination?.hasMore || false,
        total: response.pagination?.total || 0
      };
      
    } catch (error) {
      return { messages: [], hasMore: false };
    }
  };

  // Mesajı sil
  const deleteMessage = async (messageId: string) => {
    if (!currentUser?.id) return;
    
    try {
      // TODO: API'den mesaj silme fonksiyonu eklenmeli
      
      // Local state'i güncelle
      const deletedMessage = messages.find(msg => msg.id === messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Eğer silinen mesaj okunmamışsa count'u düşür
      if (deletedMessage && !deletedMessage.read) {
        const chatId = [currentUser.id, deletedMessage.senderId].sort().join('_');
        setUnreadCounts(prevCounts => {
          const newCounts = { ...prevCounts };
          if (newCounts[chatId] && newCounts[chatId] > 0) {
            newCounts[chatId] = newCounts[chatId] - 1;
            if (newCounts[chatId] === 0) {
              delete newCounts[chatId];
            }
          }
          
          // Toplam count'ı hesapla ve badge'i güncelle
          const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
          updateBadgeCount(totalCount);
          
          return newCounts;
        });
      }
      
    } catch (error) {
      throw error;
    }
  };

  // Mesajları okundu olarak işaretle - YENİ BASİT SİSTEM
  const markMessagesAsRead = async (otherUserId: string) => {
    if (!currentUser?.id) {
      return;
    }
    
    try {
      const chatId = [currentUser.id, otherUserId].sort().join('_');
      
      // Backend'e gönder
      await ApiService.markMessagesAsRead(chatId);
      
      // Count'u sıfırla
      setUnreadCounts(prevCounts => {
        const newCounts = { ...prevCounts };
        delete newCounts[chatId];
        
        console.log('✅ Messages marked as read for chat:', chatId, 'count cleared');
        
        // Toplam count'ı hesapla ve badge'i güncelle
        const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
        updateBadgeCount(totalCount);
        
        return newCounts;
      });
      
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  };

  // Sohbetleri getir - YENİ BASİT SİSTEM ile güncel count
  const getChats = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }
    
    // Eğer zaten yükleniyorsa, tekrar yükleme
    if (isLoadingChats) {
      return;
    }
    
    // Cache kontrolü
    if (chatCache && (Date.now() - chatCache.timestamp) < CACHE_DURATION) {
      setChats(chatCache.data);
      return;
    }
    
    try {
      setIsLoadingChats(true);
      const chats = await ApiService.getChats() as Chat[];
      setChats(chats);
      
      // Cache'e kaydet
      setChatCache({ data: chats, timestamp: Date.now() });
      
      // Mevcut count'ları yükle (backend'ten gelen unreadCount'ları kullan)
      const initialCounts: { [chatId: string]: number } = {};
      chats.forEach(chat => {
        if (chat.unreadCount > 0) {
          initialCounts[chat.id] = chat.unreadCount;
        }
      });
      setUnreadCounts(initialCounts);
      
      // Toplam count'ı hesapla ve badge'i güncelle
      const totalCount = Object.values(initialCounts).reduce((total, count) => total + count, 0);
      updateBadgeCount(totalCount);
      
      // Chat verilerinden global user state'leri güncelle - sadece değişenler için
      chats.forEach(chat => {
        if (chat.otherUser) {
          const userId = chat.otherUser.id || chat.otherUser._id;
          if (userId) {
            const currentState = globalUserStates[userId];
            const newState = {
              isOnline: !!chat.otherUser.is_online,
              lastSeen: chat.otherUser.last_active ? new Date(chat.otherUser.last_active) : new Date(),
              name: chat.otherUser.name,
              surname: chat.otherUser.surname || '',
              avatar: chat.otherUser.avatar || '👤',
              avatarImage: chat.otherUser.avatar_image || '',
              bgColor: chat.otherUser.bg_color || '#FFB6C1',
              gender: chat.otherUser.gender || 'female'
            };
            
            // Sadece değişen state'leri güncelle
            if (!currentState || 
                currentState.isOnline !== newState.isOnline ||
                currentState.name !== newState.name ||
                currentState.avatar !== newState.avatar) {
              updateUserState(userId, newState);
            }
          }
        }
      });
      
    } catch (error) {
      // Error getting chats
    } finally {
      setIsLoadingChats(false);
    }
  }, [currentUser?.id]); // currentUser.id dependency eklendi

  // Real-time user status updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleUserStatusChange = (data: { userId: string; isOnline: boolean; lastActive: Date }) => {
      // Global state'i güncelle
      updateUserState(data.userId, {
        isOnline: data.isOnline,
        lastSeen: new Date(data.lastActive)
      });
    };

    // WebSocket listener'ı kur
    webSocketService.onUserStatusChange(handleUserStatusChange);

    return () => {
      // Cleanup
      webSocketService.offUserStatusChange(handleUserStatusChange);
    };
  }, [currentUser?.id]);

  // Chat ID'ye göre sohbet getir
  const getChatById = (chatId: string) => {
    return chats.find(chat => chat.id === chatId);
  };

  // Real-time mesaj listener kur - OPTIMIZED with cache
  const setupUserMessagesListener = (userId: string, otherUserId: string, onUpdate: (messages: Message[]) => void) => {
    if (!currentUser?.id) return () => {};
    
    try {
      const cacheKey = `${userId}_${otherUserId}`;
      
      // Check cache first
      if (messageCache[cacheKey]) {
        onUpdate(messageCache[cacheKey]);
      }
      
      // WebSocket üzerinden real-time mesajları dinle
      const handleNewMessage = (data: any) => {
        if (data.chatId === [userId, otherUserId].sort().join('_')) {
          // Update cache
          setMessageCache(prev => ({
            ...prev,
            [cacheKey]: [...(prev[cacheKey] || []), data.message]
          }));
          
          // Update UI
          onUpdate([...(messageCache[cacheKey] || []), data.message]);
          
          // Local notification gönder - uygulama arkaplanda ise
          if (AppState.currentState !== 'active') {
            const { NotificationService } = require('../services/NotificationService');
            NotificationService.showLocalNotification(
              'Yeni Mesaj',
              data.message.text || 'Yeni mesaj aldınız',
              {
                chatId: data.chatId,
                messageId: data.message.id,
                senderId: data.message.senderId,
                type: 'message'
              }
            );
          }
        }
      };

      // Local notification event'ini dinle
      const handleLocalNotification = (data: any) => {
        if (data.userId === otherUserId) {
          const { NotificationService } = require('../services/NotificationService');
          NotificationService.showLocalNotification(
            data.title,
            data.body,
            data.data
          );
        }
      };
      
      webSocketService.on('localNotification', handleLocalNotification);
      
      return () => {
        webSocketService.off('newMessage', handleNewMessage);
        webSocketService.off('localNotification', handleLocalNotification);
      };
    } catch (error) {
      return () => {};
    }
  };

  // Engellenen kullanıcıları yükle
  const loadBlockedUsers = useCallback(async () => {
    try {
      // TODO: Implement blocked users API
      setBlockedUsers([]);
    } catch (error) {
      // Error loading blocked users
    }
  }, [currentUser?.id]); // currentUser.id dependency eklendi

  // Real-time listener'ları kur
  useEffect(() => {
    if (!currentUser?.id) return;

    const setupListeners = async () => {
      try {
        // WebSocket bağlantısını kur
        if (!webSocketService.isConnected()) {
          await webSocketService.connect(currentUser.id);
        }

        // WebSocket üzerinden real-time chat güncellemelerini dinle - KALDIRILDI (race condition yaratıyordu)
        // const handleChatUpdate = (data: any) => {
        //   if (data.chatId) {
        //     getChats();
        //   }
        // };

        // webSocketService.on('chatUpdate', handleChatUpdate);
        
        // Listen for user online/offline status
        const handleUserOnline = (data: { userId: string, isOnline: boolean }) => {
          setOnlineUsers(prev => ({
            ...prev,
            [data.userId]: data.isOnline
          }));
          
          // Chat listesini de güncelle
          setChats(prevChats => 
            prevChats.map(chat => {
              const parts = chat.id.split('_');
              const otherUserId = parts[0] === currentUser?.id ? parts[1] : parts[0];
              if (otherUserId === data.userId) {
                return {
                  ...chat,
                  otherUser: {
                    ...chat.otherUser,
                    id: chat.otherUser?.id || otherUserId,
                    name: chat.otherUser?.name || 'Kullanıcı',
                    is_online: data.isOnline
                  }
                };
              }
              return chat;
            })
          );
        };

        // Listen for new messages to update chat list
        const handleNewMessageForChatList = (data: any) => {
          console.log('🔔 New message received:', data);
          if (data.message?.senderId !== currentUser?.id) {
            // Eğer yeni chat oluşuyorsa, hemen ekle
            const chatId = [currentUser?.id, data.message?.senderId].sort().join('_');
            const existingChat = chats.find(chat => chat.id === chatId);
            
            if (!existingChat) {
              console.log('🆕 Creating new chat for:', data.message?.senderId);
              // Yeni chat oluştur - gerçek kullanıcı bilgilerini al
              getUserInfo(data.message?.senderId).then(userInfo => {
                const newChat: Chat = {
                  id: chatId,
                  user1Id: currentUser?.id || '',
                  user2Id: data.message?.senderId,
                  lastMessage: data.message?.text || 'Resim',
                  lastTime: new Date(data.message?.timestamp || Date.now()),
                  unreadCount: 1,
                  name: userInfo.name || 'Kullanıcı',
                  avatar: userInfo.avatar || '👤',
                  bgColor: userInfo.bgColor || '#FFB6C1',
                  gender: userInfo.gender || 'female',
                  otherUser: {
                    id: data.message?.senderId,
                    name: userInfo.name || 'Kullanıcı',
                    avatar: userInfo.avatar || '👤',
                    bg_color: userInfo.bgColor || '#FFB6C1',
                    gender: userInfo.gender || 'female',
                    is_online: userInfo.isOnline || false
                  }
                };
                
                // Chat listesini güncelle
                setChats(prevChats => [newChat, ...prevChats]);
                
                // Count'u güncelle
                setUnreadCounts(prevCounts => {
                  const newCounts = {
                    ...prevCounts,
                    [chatId]: 1
                  };
                  
                  // Toplam count'ı hesapla ve badge'i güncelle
                  const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
                  updateBadgeCount(totalCount);
                  
                  return newCounts;
                });
              }).catch(() => {
                // Hata durumunda varsayılan değerler
                const newChat: Chat = {
                  id: chatId,
                  user1Id: currentUser?.id || '',
                  user2Id: data.message?.senderId,
                  lastMessage: data.message?.text || 'Resim',
                  lastTime: new Date(data.message?.timestamp || Date.now()),
                  unreadCount: 1,
                  name: 'Kullanıcı',
                  avatar: '👤',
                  bgColor: '#FFB6C1',
                  gender: 'female',
                  otherUser: {
                    id: data.message?.senderId,
                    name: 'Kullanıcı',
                    avatar: '👤',
                    bg_color: '#FFB6C1',
                    gender: 'female',
                    is_online: false
                  }
                };
                
                setChats(prevChats => [newChat, ...prevChats]);
                
                // Count'u güncelle
                setUnreadCounts(prevCounts => {
                  const newCounts = {
                    ...prevCounts,
                    [chatId]: 1
                  };
                  
                  // Toplam count'ı hesapla ve badge'i güncelle
                  const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
                  updateBadgeCount(totalCount);
                  
                  return newCounts;
                });
              });
            } else {
              // Mevcut chat'in lastMessage ve lastTime'ını güncelle
              setChats(prevChats =>
                prevChats.map(chat =>
                  chat.id === chatId
                    ? {
                        ...chat,
                        lastMessage: data.message?.text || 'Resim',
                        lastTime: new Date(data.message?.timestamp || Date.now()),
                        unreadCount: chat.unreadCount + 1 // Okunmamış mesaj sayısını artır
                      }
                    : chat
                )
              );
              
              // Count'u güncelle - SADECE 1 ARTIR
              setUnreadCounts(prevCounts => {
                const newCounts = {
                  ...prevCounts,
                  [chatId]: (prevCounts[chatId] || 0) + 1
                };
                
                console.log('📊 Count updated for chat:', chatId, 'new count:', newCounts[chatId]);
                
                // Toplam count'ı hesapla ve badge'i güncelle
                const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
                updateBadgeCount(totalCount);
                
                return newCounts;
              });
            }
          }
        };
        
        // Mesaj geldiğinde hem count hem chat listesini güncelle
        const handleNewMessage = (data: { chatId: string; message: any }) => {
          // Sadece bize gelen mesajlar için işlem yap
          if (data.message.receiverId === currentUser?.id) {
            console.log('📨 handleNewMessage - Count will be updated by handleNewMessageForChatList');
            // Count güncellemesi handleNewMessageForChatList'te yapılıyor, burada duplicate olmasın
            
            // Chat listesini güncelle
            setChats(prevChats => {
              const updatedChats = prevChats.map(chat => {
                if (chat.id === data.chatId) {
                  return {
                    ...chat,
                    lastMessage: data.message.text || 'Resim',
                    lastTime: new Date(data.message.timestamp)
                  };
                }
                return chat;
              });
              return updatedChats;
            });
          }
        };

        // Listen for chat deletion
        const handleChatDeleted = (data: { chatId: string; userId: string }) => {
          // Eğer bu kullanıcı tarafından silinen chat ise, state'den kaldır
          if (data.userId === currentUser?.id) {
            setChats(prevChats => {
              const filteredChats = prevChats.filter(chat => chat.id !== data.chatId);
              return filteredChats;
            });
            
            // Count'u da temizle
            setUnreadCounts(prevCounts => {
              const newCounts = { ...prevCounts };
              delete newCounts[data.chatId];
              
              // Toplam count'ı hesapla ve badge'i güncelle
              const totalCount = Object.values(newCounts).reduce((total, count) => total + count, 0);
              updateBadgeCount(totalCount);
              
              return newCounts;
            });
          }
        };
        
        // MessageSent event'ini dinle (kendi mesajlarımız için)
        const handleMessageSent = (data: { messageId: string; chatId: string; message: any }) => {
          // Kendi mesajlarımız için chat listesini güncelle (count değişmez)
          setChats(prevChats => {
            const updatedChats = prevChats.map(chat => {
              if (chat.id === data.chatId) {
                return {
                  ...chat,
                  lastMessage: data.message.text || 'Resim',
                  lastTime: new Date(data.message.timestamp)
                };
              }
              return chat;
            });
            return updatedChats;
          });
        };

        // Önce tüm listener'ları temizle
        webSocketService.off('userOnline', handleUserOnline);
        webSocketService.off('messageForCount', handleNewMessage);
        webSocketService.off('messageSent', handleMessageSent);
        webSocketService.off('chat_deleted', handleChatDeleted);
        
        // Sonra tekrar ekle (sadece bir kez)
        webSocketService.on('userOnline', handleUserOnline);
        webSocketService.on('messageForCount', handleNewMessage);
        webSocketService.on('messageSent', handleMessageSent);
        webSocketService.on('chat_deleted', handleChatDeleted);
        webSocketService.on('newMessage', handleNewMessageForChatList);
        
        console.log('🔌 WebSocket listeners registered');

        // Engellenen kullanıcıları yükle
        await loadBlockedUsers();

        // İlk sohbetleri yükle
        await getChats();

        return () => {
          webSocketService.off('userOnline', handleUserOnline);
          webSocketService.off('messageForCount', handleNewMessage);
          webSocketService.off('messageSent', handleMessageSent);
          webSocketService.off('chat_deleted', handleChatDeleted);
          webSocketService.off('newMessage', handleNewMessageForChatList);
        };
      } catch (error) {
        // Error setting up listeners
      }
    };

    setupListeners();

    return () => {
      // Cleanup will be handled by the async function
    };
  }, [currentUser?.id]);

  // Kullanıcı değiştiğinde cache'i temizle
  useEffect(() => {
    if (currentUser?.id) {
      clearUserCache();
    }
  }, [currentUser?.id]);

  // AppState ve Focus listener - arkaplandan döndüğünde hem WebSocket hem chat'leri yenile
  useEffect(() => {
    if (!currentUser?.id) return;

    const refreshEverything = () => {
      // Uygulama aktif hale geldiğinde hem WebSocket hem chat'leri yenile
      Promise.all([
        // WebSocket bağlantısını yenile
        webSocketService.connect(currentUser.id),
        // Chat'leri yenile
        getChats()
      ]).then(() => {
        // Everything refreshed after app became active
      }).catch(error => {
        // Error refreshing after app became active
      });
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshEverything();
      }
    };

    const handleFocus = () => {
      refreshEverything();
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Focus listener ekle (navigation focus)
    const focusSubscription = navigation?.addListener?.('focus', handleFocus);

    return () => {
      appStateSubscription?.remove();
      focusSubscription?.();
    };
  }, [currentUser?.id, navigation]); // navigation dependency ekledik

  const value: ChatContextType = {
    chats,
    setChats,
    messages,
    onlineUsers,
    userCache,
    isLoadingChats,
    globalUserStates,
    listenUserInfo,
    sendMessage,
    sendMessageToUser,
    updateChat,
    addNewChat,
    hideMessagesForUser,
    markMessageAsReadForUser,
    deleteChat,
    clearMessages,
    addMessage,
    getMessages,
    deleteMessage,
    markMessagesAsRead,
    setupUserMessagesListener,
    getChats,
    getChatById,
    getTotalUnreadCount,
    getChatUnreadCount,
    getUserInfo,
    clearUserCache,
    resetChatData,
    updateUserState,
    getUserState,
    isUserBlocked,
    blockedUsers
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};