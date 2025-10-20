// ChatDetail_fixed.tsx — cleaned TSX, stable keyboard, responsive modals, image viewer, modern icons
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_CONFIG, ApiService } from '../../config/api';
import { useChat } from '../../contexts/ChatContext';
import { useProfile } from '../../contexts/ProfileContext';
import { webSocketService } from '../../services/websocket';
import { NavigationHelper } from '../../utils/NavigationHelper';
import { formatLastSeen } from '../../utils/TimeUtils';

// Base64'i HTTP URL'ye çevir - Otomatik
const convertBase64ToHttpAuto = async (base64Data: string): Promise<string> => {
  console.log('🔍 URI analizi:', {
    uri: base64Data,
    startsWithHttp: base64Data.startsWith('http'),
    startsWithData: base64Data.startsWith('data:'),
    startsWithFile: base64Data.startsWith('file://'),
    startsWithContent: base64Data.startsWith('content://'),
    length: base64Data.length
  });
  
  // Eğer zaten HTTP URL ise direkt döndür
  if (base64Data.startsWith('http')) {
    console.log('✅ HTTP URL, direkt döndürülüyor');
    return base64Data;
  }
  
  // Eğer data: URI ise direkt döndür
  if (base64Data.startsWith('data:')) {
    console.log('✅ Data URI, direkt döndürülüyor');
    return base64Data;
  }
  
  // Eğer file:// URI ise direkt döndür
  if (base64Data.startsWith('file://')) {
    console.log('✅ File URI, direkt döndürülüyor');
    return base64Data;
  }
  
  // Eğer content:// URI ise direkt döndür
  if (base64Data.startsWith('content://')) {
    console.log('✅ Content URI, direkt döndürülüyor');
    return base64Data;
  }
  
  // Eğer Base64 string ise HTTP'ye çevir
  try {
    console.log('🔄 Base64 otomatik HTTP\'ye çevriliyor...');
    
    // Android sürümüne göre format belirle
    const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64Data);
    const mimeType = isBase64 ? 'image/jpeg' : 'image/jpeg';
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/convert-base64-to-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: base64Data,
        filename: `auto-${Date.now()}.jpeg`,
        mimeType: mimeType
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Base64 otomatik HTTP\'ye çevrildi:', result.imageUrl);
      return result.imageUrl;
    } else {
      console.log('❌ Base64 otomatik çevirme hatası:', result.message);
      return `data:image/jpeg;base64,${base64Data}`; // Fallback
    }
  } catch (error) {
    console.log('❌ Base64 otomatik çevirme network hatası:', error);
    return `data:image/jpeg;base64,${base64Data}`; // Fallback
  }
};

type Msg = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string | null;
  timestamp: any;
  read: boolean;
  deletedFor: string[];
};

// Message Image Component with Auto Convert
const MessageImageWithAutoConvert = ({ imageUrl, style }: { imageUrl: string | null | undefined, style: any }) => {
  const [imageUri, setImageUri] = useState<string>(imageUrl || '');
  
  useEffect(() => {
    const convertImage = async () => {
      console.log('🔍 MessageImageWithAutoConvert - imageUrl:', imageUrl);
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:') && !imageUrl.startsWith('file://') && !imageUrl.startsWith('content://')) {
        console.log('🔄 Mesaj Base64 otomatik HTTP\'ye çevriliyor...');
        const httpUrl = await convertBase64ToHttpAuto(imageUrl);
        setImageUri(httpUrl);
        console.log('✅ Mesaj HTTP URL güncellendi:', httpUrl);
      } else {
        setImageUri(imageUrl || '');
        console.log('✅ Mesaj URL direkt kullanılıyor:', imageUrl);
      }
    };
    
    convertImage();
  }, [imageUrl]);
  
  return (
    <Image 
      source={{ 
        uri: imageUri,
        headers: {
          'Accept': 'image/jpeg, image/jpg, image/png, image/gif, image/webp'
        }
      }} 
      style={style}
      resizeMode="cover"
      onError={(error) => {
        console.log('❌ Mesaj resim yüklenemedi:', imageUri, error);
      }}
      onLoad={() => {
        console.log('✅ Mesaj resmi yüklendi:', imageUri);
      }}
    />
  );
};

const getUserData = (userId: string) => ({
  id: userId, name: 'Kullanıcı', surname: '', avatar: '👤', avatar_image: '', bg_color: '#999', gender: 'female',
  last_active: new Date().toISOString(), is_online: false,
});

export default function ChatDetail() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const win = useWindowDimensions();
  const isNarrow = win.width < 380;
  const screenH = Dimensions.get('window').height;

  const { sendMessage, getMessages, markMessagesAsRead, getUserInfo, listenUserInfo, getUserState, globalUserStates } = useChat();
  const { currentUser, blockUser, unblockUser, blockedUsers, updateDiamonds } = useProfile();

  // UI state
  const [messageText, setMessageText] = useState('');
  const [displayedMessages, setDisplayedMessages] = useState<Msg[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatUser, setChatUser] = useState<any>(getUserData(id));
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);

  // Menus and modals
  const [showMenu, setShowMenu] = useState(false);
  const [showInsufficientTokensModal, setShowInsufficientTokensModal] = useState(false);
  const [insufficientTokens, setInsufficientTokens] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Keyboard + layout
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputBarH, setInputBarH] = useState(60);
  const [rootHeight, setRootHeight] = useState<number | null>(null);
  const anyModalOpen = showInsufficientTokensModal || showBlockModal || showDeleteModal || showImageModal || showMenu;
  const modalOpenRef = useRef(false);
  useEffect(() => { modalOpenRef.current = anyModalOpen; }, [anyModalOpen]);

  const listRef = useRef<FlatList<Msg>>(null);
  const textInputRef = useRef<TextInput>(null);

  const headerColor = chatUser?.gender === 'male' ? '#007AFF' : '#FF6B95';
  const disabledColor = chatUser?.gender === 'male' ? '#B3D9FF' : '#FFB6C1';
  const headerGradientColors: [string, string] = chatUser?.gender === 'male' ? ['#007AFF', '#0056CC'] : ['#FF6B95', '#E91E63'];
  const dropdownGradientColors: [string, string, string] = chatUser?.gender === 'male' ? ['#3B82F6', '#1D4ED8', '#1E40AF'] : ['#FF6B95', '#E91E63', '#C2185B'];

  // Keyboard listeners
  useEffect(() => {
    const onShow = (e: any) => {
      if (modalOpenRef.current) return;
      setIsKeyboardVisible(true);
      const h = Math.max(0, e.endCoordinates?.height || 0);
      if (Platform.OS === 'android') {
        setKeyboardHeight(h);
      } else {
        setKeyboardHeight(h);
      }
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = () => {
      if (modalOpenRef.current) return;
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    };
    const s1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
    const s2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // Root onLayout to stabilize Android tablets
  const onRootLayout = useCallback((h: number) => {
    setRootHeight(h);
    if (Platform.OS === 'android' && !anyModalOpen) {
      const delta = Math.max(0, screenH - h);
      if (!isKeyboardVisible && delta === 0) setKeyboardHeight(0);
      if (delta > 0) setKeyboardHeight(delta);
    }
  }, [anyModalOpen, isKeyboardVisible, screenH]);

  useEffect(() => {
    if (!anyModalOpen && Platform.OS === 'android') {
      setKeyboardHeight(0);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [anyModalOpen]);

  // Load more messages (infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || loadingMore || !currentUser?.id || !id) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res: any = await getMessages(id as string, nextPage);
      
      if (res?.messages?.length) {
        // Eski mesajları başa ekle (pagination için)
        setDisplayedMessages(prev => {
          const newMessages = [...(res.messages as Msg[]), ...prev];
          // Memory management: En fazla 1000 mesaj tut
          if (newMessages.length > 1000) {
            return newMessages.slice(0, 1000);
          }
          return newMessages;
        });
        setHasMoreMessages(Boolean(res.hasMore));
        setCurrentPage(nextPage);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      // Error loading more messages
      setHasMoreMessages(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreMessages, loadingMore, currentUser?.id, id, currentPage, getMessages]);

  // Messages load
  useEffect(() => {
    if (!currentUser?.id || !id) return;
    const run = async () => {
      setLoading(true);
      try {
        const res: any = await getMessages(id as string, 1);
        if (res?.messages?.length) {
          setDisplayedMessages(res.messages as Msg[]);
          setHasMoreMessages(Boolean(res.hasMore));
          setCurrentPage(1);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
          markMessagesAsRead(id as string);
        } else {
          setDisplayedMessages([]); setHasMoreMessages(false); setCurrentPage(1);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentUser?.id, id]);

  // Realtime
  useEffect(() => {
    if (!currentUser?.id || !id) return;
    (async () => { try { await webSocketService.connect(currentUser.id); } catch {} })();
    const currentChatId = [currentUser.id, id].sort().join('_');
    const onNew = (data: { chatId: string; message: Msg }) => {
      if (data.chatId !== currentChatId) return;
      
      // Eğer bu mesajı gönderen kullanıcı biz isek, temp mesajı kaldır ve gerçek mesajı ekle
      if (data.message.senderId === currentUser.id) {
        setDisplayedMessages(prev => {
          // Temp mesajları kaldır (temp_ ile başlayan)
          const filtered = prev.filter(m => !m.id.startsWith('temp_'));
          // Gerçek mesajı ekle (eğer yoksa)
          return filtered.some(m => m.id === data.message.id) ? filtered : [...filtered, data.message];
        });
      } else {
        // Başka kullanıcıdan gelen mesaj
        setDisplayedMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        markMessagesAsRead(id as string);
      }
      
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    };
    webSocketService.on('newMessage', onNew);
    return () => { webSocketService.off('newMessage', onNew); };
  }, [currentUser?.id, id, markMessagesAsRead]);

  // User data
  useEffect(() => {
    const blocked = blockedUsers.includes(id as string);
    setIsBlocked(blocked);
    (async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const r = await fetch(`${API_CONFIG.BASE_URL}/api/users/${id}/block-status`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          const d = await r.json();
          if (d?.success) setIsBlockedBy(d.blockedByThem);
        }
      } catch {}
      try {
        const userInfo = await getUserInfo(id, true);
        if (userInfo) {
          setChatUser({
            id: userInfo.id || userInfo._id,
            name: userInfo.name, surname: userInfo.surname,
            avatar: userInfo.avatar,             avatar_image: userInfo.avatarImage || userInfo.avatar_image,
            bg_color: userInfo.bgColor || userInfo.bg_color, 
            gender: userInfo.gender || 'female',
            last_active: userInfo.lastActive || userInfo.last_active, 
            is_online: userInfo.isOnline !== undefined ? userInfo.isOnline : userInfo.is_online
          });
        }
      } catch {}
    })();
  }, [id, blockedUsers]);

  // Real-time kullanıcı bilgileri güncelleme
  useEffect(() => {
    if (!id) return;
    
        const handleUserInfoUpdate = (data: { userId: string; userInfo: any }) => {
          if (data.userId === id) {
            setChatUser((prev: any) => ({
              ...prev,
              name: data.userInfo.name || prev.name,
              surname: data.userInfo.surname || prev.surname,
              avatar: data.userInfo.avatar || prev.avatar,
              avatar_image: data.userInfo.avatarImage || data.userInfo.avatar_image || prev.avatar_image,
              bg_color: data.userInfo.bgColor || data.userInfo.bg_color || prev.bg_color,
              gender: data.userInfo.gender || prev.gender,
              last_active: data.userInfo.lastActive || data.userInfo.last_active || prev.last_active,
              is_online: data.userInfo.isOnline !== undefined ? data.userInfo.isOnline : (data.userInfo.is_online !== undefined ? data.userInfo.is_online : prev.is_online)
            }));
          }
        };

    // WebSocket dinleyicisini ekle
    webSocketService.on('user_info_updated', handleUserInfoUpdate);
    
    // Periyodik olarak kullanıcı bilgilerini güncelle (her 30 saniyede bir)
    const interval = setInterval(async () => {
      try {
        const userInfo = await getUserInfo(id, true);
        if (userInfo) {
          setChatUser((prev: any) => ({
            ...prev,
            name: userInfo.name || prev.name,
            surname: userInfo.surname || prev.surname,
            avatar: userInfo.avatar || prev.avatar,
            avatar_image: userInfo.avatarImage || userInfo.avatar_image || prev.avatar_image,
            bg_color: userInfo.bgColor || userInfo.bg_color || prev.bg_color,
            gender: userInfo.gender || prev.gender,
            last_active: userInfo.lastActive || userInfo.last_active || prev.last_active,
            is_online: userInfo.isOnline !== undefined ? userInfo.isOnline : (userInfo.is_online !== undefined ? userInfo.is_online : prev.is_online)
          }));
        }
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    }, 15000); // 15 saniye - daha sık güncelleme
    
    return () => {
      webSocketService.off('user_info_updated', handleUserInfoUpdate);
      clearInterval(interval);
    };
  }, [id, getUserInfo]);

  // Engelleme durumu değiştiğinde kullanıcı bilgilerini güncelle
  useEffect(() => {
    if (isBlocked) {
      setChatUser((prev: any) => ({
        ...prev,
        name: 'Engellenen Kullanıcı',
        surname: ''
      }));
    } else if (isBlockedBy) {
      setChatUser((prev: any) => ({
        ...prev,
        name: 'Bu kullanıcı sizi engelledi',
        surname: ''
      }));
    }
  }, [isBlocked, isBlockedBy]);


  // Send text
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !currentUser?.id || !id) return;
    const text = messageText.trim();
    setMessageText('');
    const temp: Msg = {
      id: `temp_${Date.now()}`,
      senderId: currentUser.id,
      receiverId: id as string,
      text,
      timestamp: new Date(),
      read: false,
      deletedFor: []
    };
    setDisplayedMessages(prev => [...prev, temp]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const response: any = await sendMessage(id as string, text);
      if (response?.updatedDiamonds !== undefined) updateDiamonds(response.updatedDiamonds);
      markMessagesAsRead(id as string);
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_TOKENS') {
        const currentTokens = err.currentTokens ?? currentUser?.diamonds ?? 0;
        const requiredTokens = err.requiredTokens ?? 100;
        setInsufficientTokens(requiredTokens - currentTokens);
        Keyboard.dismiss();
        setShowInsufficientTokensModal(true);
      }
      setDisplayedMessages(prev => prev.filter(m => m.id !== temp.id));
      setMessageText(text);
    }
  }, [messageText, currentUser?.id, id, sendMessage, updateDiamonds, markMessagesAsRead]);

  // Send image
  const handleImagePicker = useCallback(async () => {
    if (!currentUser?.id || !id) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.3,
    });
    if (r.canceled || !r.assets[0]) return;
    const imageUri = r.assets[0].uri;
    const temp: Msg = {
      id: `temp_image_${Date.now()}`,
      senderId: currentUser.id,
      receiverId: id as string,
      text: '📷 Resim',
      imageUrl: imageUri,
      timestamp: new Date(),
      read: false,
      deletedFor: []
    };
    setDisplayedMessages(prev => [...prev, temp]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const formData = new FormData();
      formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'image.jpg' } as any);
      const upload = await fetch(`${API_CONFIG.BASE_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const up = await upload.json();
      console.log('🔍 Resim yükleme sonucu:', up);
      if (!up?.success || !up?.imageUrl) throw new Error('upload-fail');

      try {
        console.log('🔍 Resim URL ile mesaj gönderiliyor:', up.imageUrl);
        const response: any = await sendMessage(id as string, '📷 Resim', up.imageUrl);
        if (response?.updatedDiamonds !== undefined) updateDiamonds(response.updatedDiamonds);
      } catch (err: any) {
        if (err?.message === 'INSUFFICIENT_TOKENS') {
          const currentTokens = err.currentTokens ?? currentUser?.diamonds ?? 0;
          const requiredTokens = err.requiredTokens ?? 100;
          setInsufficientTokens(requiredTokens - currentTokens);
          Keyboard.dismiss();
          setShowInsufficientTokensModal(true);
        }
        setDisplayedMessages(prev => prev.filter(m => m.id !== temp.id));
      }
    } catch {
      setDisplayedMessages(prev => prev.filter(m => m.id !== temp.id));
    }
  }, [currentUser?.id, id, sendMessage, updateDiamonds]);

  // Render
  const renderMessage = useCallback(({ item }: { item: Msg }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    const bubbleColor = isCurrentUser
      ? (currentUser?.gender === 'male' ? '#007AFF' : '#FF6B95')
      : (chatUser?.gender === 'male' ? '#007AFF' : '#FF6B95');

    const timeString = (() => {
      try {
        const date = (item as any).timestamp?.toDate ? (item as any).timestamp.toDate() : new Date(item.timestamp);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      } catch { return '--:--'; }
    })();

    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.sentMessage : styles.receivedMessage]}>
        <View style={[styles.messageBubble, {
          backgroundColor: bubbleColor,
          borderBottomRightRadius: isCurrentUser ? 4 : 0,
          borderBottomLeftRadius: isCurrentUser ? 0 : 4,
        }]}>
          {item.imageUrl ? (
            <TouchableOpacity
              onPress={() => { setSelectedImage(item.imageUrl!); setShowImageModal(true); }}
              activeOpacity={0.85}
            >
              <MessageImageWithAutoConvert 
                imageUrl={item.imageUrl}
                style={styles.messageImage}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, { color: '#FFFFFF' }]}>{item.text}</Text>
          )}
          <Text style={[styles.messageTime, { color: '#FFFFFF' }]}>{timeString}</Text>
        </View>
      </View>
    );
  }, [currentUser?.id, currentUser?.gender, chatUser?.gender]);

  const bottomSpacer = inputBarH + Math.max(insets.bottom, 10) + ((Platform.OS === 'ios' && !anyModalOpen) ? keyboardHeight : 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.fullScreen} edges={['top', 'bottom']} onLayout={e => onRootLayout(e.nativeEvent.layout.height)}>
        <LinearGradient colors={['#007AFF', '#0056CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
          <View style={styles.userInfo}><Text style={styles.userName}>Yükleniyor...</Text></View>
          <View style={styles.menuButton}><Text style={styles.menuButtonText}>⋮</Text></View>
        </LinearGradient>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fullScreen} edges={['top', 'bottom']} onLayout={e => onRootLayout(e.nativeEvent.layout.height)}>
      {/* Header */}
      <LinearGradient colors={headerGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <TouchableOpacity 
          style={styles.userInfo} 
          activeOpacity={0.7}
          onPress={() => {
            if (chatUser?.id) {
              NavigationHelper.goToUserProfile(chatUser.id);
            }
          }}
        >
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar, 
              { 
                backgroundColor: isBlocked || isBlockedBy ? '#6B7280' : '#FFF',
                borderColor: isBlocked || isBlockedBy ? '#EF4444' : 'rgba(255, 255, 255, 0.3)'
              }
            ]}>
              {isBlocked || isBlockedBy ? (
                <Ionicons 
                  name="ban" 
                  size={24} 
                  color="#EF4444" 
                />
              ) : chatUser?.avatar_image && chatUser.avatar_image.trim() !== '' ? (
                <Image 
                  source={{ 
                    uri: chatUser.avatar_image.startsWith('data:') 
                      ? chatUser.avatar_image 
                      : chatUser.avatar_image.startsWith('http')
                      ? chatUser.avatar_image
                      : `data:image/jpeg;base64,${chatUser.avatar_image}`
                  }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.log('❌ Chat: Resim yüklenemedi:', chatUser.avatar_image, error);
                  }}
                  onLoad={() => {
                    console.log('✅ Chat: Resim yüklendi:', chatUser.avatar_image);
                  }}
                />
              ) : (
                <Text style={[styles.avatarText, { color: chatUser?.gender === 'male' ? '#3B82F6' : '#FF6B95' }]}>
                  {chatUser?.avatar || (chatUser?.gender === 'male' ? '👨' : '👩')}
                </Text>
              )}
            </View>
            {/* Online/Offline Status Dot */}
            {!isBlocked && !isBlockedBy && (
              <View style={[
                styles.statusDot,
                { 
                  backgroundColor: (() => {
                    const st = getUserState(id as string);
                    return st?.isOnline ? '#10B981' : '#EF4444';
                  })()
                }
              ]} />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={2}>
              {(() => {
                if (isBlocked) return 'Engellenen Kullanıcı';
                if (isBlockedBy) return 'Bu kullanıcı sizi engelledi';
                const name = chatUser?.name || '';
                const surname = chatUser?.surname || '';
                return surname ? `${name} ${surname}`.trim() : name || '';
              })()}
            </Text>
            <Text style={styles.userStatus}>
              {(() => {
                if (isBlocked || isBlockedBy) return 'Engellenmiş';
                const st = getUserState(id as string);
                const isOnline = st?.isOnline || false;
                // Veritabanından gelen doğru veriyi kullan, WebSocket state'i değil
                const lastSeen = chatUser?.last_active || st?.lastSeen;
                
                
                if (isOnline) {
                  return 'Çevrimiçi';
                } else if (lastSeen && lastSeen !== '{}' && lastSeen !== 'null' && lastSeen !== 'undefined') {
                  try {
                    const formatted = formatLastSeen(lastSeen);
                    if (formatted !== 'Bilinmiyor') {
                      // Offline kullanıcılar için "Şimdi aktif" yerine gerçek zaman farkını göster
                      if (formatted === 'Şimdi aktif') {
                        // Offline kullanıcılar için daha hassas zaman hesaplama
                        try {
                          const lastSeenDate = new Date(lastSeen);
                          const now = new Date();
                          const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);
                          
                          if (diffInSeconds < 60) {
                            return 'Son görülme: Az önce';
                          } else if (diffInSeconds < 3600) {
                            const minutes = Math.floor(diffInSeconds / 60);
                            return `Son görülme: ${minutes} dakika önce`;
                          } else {
                            const hours = Math.floor(diffInSeconds / 3600);
                            return `Son görülme: ${hours} saat önce`;
                          }
                        } catch (error) {
                          return 'Son görülme: Az önce';
                        }
                      }
                      return `Son görülme: ${formatted}`;
                    }
                  } catch (error) {
                    // formatLastSeen error
                  }
                }
                // Eğer lastSeen yoksa veya geçersizse, chatUser'dan last_active'ı kontrol et
                if (chatUser?.last_active && chatUser.last_active !== '{}' && chatUser.last_active !== 'null' && chatUser.last_active !== 'undefined') {
                  try {
                    const formatted = formatLastSeen(chatUser.last_active);
                    if (formatted !== 'Bilinmiyor') {
                      // Offline kullanıcılar için "Şimdi aktif" yerine gerçek zaman farkını göster
                      if (formatted === 'Şimdi aktif') {
                        // Offline kullanıcılar için daha hassas zaman hesaplama
                        try {
                          const lastActiveDate = new Date(chatUser.last_active);
                          const now = new Date();
                          const diffInSeconds = Math.floor((now.getTime() - lastActiveDate.getTime()) / 1000);
                          
                          if (diffInSeconds < 60) {
                            return 'Son görülme: Az önce';
                          } else if (diffInSeconds < 3600) {
                            const minutes = Math.floor(diffInSeconds / 60);
                            return `Son görülme: ${minutes} dakika önce`;
                          } else {
                            const hours = Math.floor(diffInSeconds / 3600);
                            return `Son görülme: ${hours} saat önce`;
                          }
                        } catch (error) {
                          return 'Son görülme: Az önce';
                        }
                      }
                      return `Son görülme: ${formatted}`;
                    }
                  } catch (error) {
                    // chatUser.last_active formatLastSeen error
                  }
                }
                return 'Çevrimdışı';
              })()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* List + Input */}
      <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' && !anyModalOpen ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={displayedMessages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `msg-${index}-${item.id}`}
          style={styles.messagesList}
          contentContainerStyle={[styles.messagesContentContainer, { paddingBottom: bottomSpacer }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.8}
          onEndReached={loadMoreMessages}
          ListHeaderComponent={
            hasMoreMessages && currentPage > 1 ? (
              <View style={styles.loadMoreContainer}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <TouchableOpacity onPress={loadMoreMessages} style={styles.loadMoreButton}>
                    <Text style={styles.loadMoreText}>Daha fazla mesaj yükle</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={21}
          initialNumToRender={50}
          getItemLayout={(data, index) => ({
            length: 80, // Ortalama mesaj yüksekliği
            offset: 80 * index,
            index,
          })}
        />

        <View
          style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10), marginBottom: Platform.OS === 'android' && !anyModalOpen ? keyboardHeight : 0 }]}
          onLayout={e => setInputBarH(Math.max(56, Math.ceil(e.nativeEvent.layout.height)))}
        >
          {isBlocked || isBlockedBy ? (
            <View style={styles.blockedWarning}>
              <Text style={styles.blockedWarningIcon}>🚫</Text>
              <Text style={styles.blockedWarningText}>{isBlocked ? 'Bu kullanıcıyı engellediniz' : 'Bu kullanıcı sizi engelledi'}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[styles.imageButton, { borderColor: headerColor }]} onPress={handleImagePicker} activeOpacity={0.7}>
                <Ionicons name="camera" size={20} color={headerColor} />
              </TouchableOpacity>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Mesaj yaz..."
                placeholderTextColor="#6B7280"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: !messageText.trim() ? disabledColor : headerColor }]}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Image Viewer */}
      {showImageModal && selectedImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
          <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.92)',justifyContent:'center',alignItems:'center'}}>
            <TouchableOpacity style={{position:'absolute',top:0,left:0,right:0,bottom:0}} activeOpacity={1} onPress={() => setShowImageModal(false)} />
            <Image 
              source={{ 
                uri: selectedImage?.startsWith('http') 
                  ? selectedImage 
                  : selectedImage?.startsWith('data:')
                  ? selectedImage
                  : `data:image/jpeg;base64,${selectedImage}`
              }} 
              style={{width:'100%',height:'100%'}} 
              resizeMode="contain"
              onError={async (error) => {
                console.log('❌ Modal resim yüklenemedi:', selectedImage, error);
                // Base64 ise HTTP'ye çevir
                if (selectedImage && !selectedImage.startsWith('http') && !selectedImage.startsWith('data:')) {
                  console.log('🔄 Base64 modal resmi HTTP\'ye çevriliyor...');
                  const httpUrl = await convertBase64ToHttpAuto(selectedImage);
                  console.log('✅ Modal resmi HTTP URL:', httpUrl);
                }
              }}
              onLoad={() => {
                console.log('✅ Modal resmi yüklendi:', selectedImage);
              }}
            />
            <TouchableOpacity style={{position:'absolute',top:16,right:16,width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}} onPress={() => setShowImageModal(false)}>
              <Text style={{color:'#fff',fontSize:22,fontWeight:'700'}}>✕</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Token modal */}
      {showInsufficientTokensModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => { setShowInsufficientTokensModal(false); Keyboard.dismiss(); }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: isNarrow ? 340 : 420, width: isNarrow ? '92%' : '88%' }]}>
              <View style={styles.modalHeader}><Text style={styles.modalHeaderText}>Yetersiz Jeton</Text></View>
              <View style={styles.modalContent}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(59,130,246,0.15)' }]}><Ionicons name="diamond-outline" size={32} color="#3B82F6" /></View>
                <Text style={styles.modalMessageText}>Mesaj göndermek için {insufficientTokens} jeton daha gerekiyor.</Text>
                <Text style={styles.modalSubMessage}>Jeton satın almak için aşağıdaki butona dokunun.</Text>
              </View>
              <View style={[styles.modalButtons, isNarrow ? styles.modalButtonsColumn : styles.modalButtonsRow]}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowInsufficientTokensModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => { setShowInsufficientTokensModal(false); NavigationHelper.goToTokenPurchase(); }}>
                  <Text style={styles.modalButtonPrimaryText}>Jeton Satın Al</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: isNarrow ? 340 : 420, width: isNarrow ? '92%' : '88%' }]}>
              <View style={styles.modalHeader}><Text style={styles.modalHeaderText}>Mesajları Sil</Text></View>
              <View style={styles.modalContent}>
                <View style={styles.modalIconWrap}><Ionicons name="trash-outline" size={32} color="#3B82F6" /></View>
                <Text style={styles.modalMessageText}>Mesajları silmek istediğinize emin misiniz?</Text>
                <Text style={styles.modalSubMessage}>Bu işlem geri alınamaz.</Text>
              </View>
              <View style={[styles.modalButtons, isNarrow ? styles.modalButtonsColumn : styles.modalButtonsRow]}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={async () => {
                  try {
                    if (!currentUser?.id || !id) return;
                    const chatId = [currentUser.id, id].sort().join('_');
                    await ApiService.deleteChat(chatId);
                    setShowDeleteModal(false);
                    setShowMenu(false);
                    NavigationHelper.goToMessages();
                  } catch { setShowDeleteModal(false); }
                }}>
                  <Text style={styles.modalButtonPrimaryText}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Block/Unblock modal */}
      {showBlockModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowBlockModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: isNarrow ? 340 : 420, width: isNarrow ? '92%' : '88%' }]}>
              <View style={styles.modalHeader}><Text style={styles.modalHeaderText}>{isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}</Text></View>
              <View style={styles.modalContent}>
                <View style={[styles.modalIconWrap, { backgroundColor: isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Ionicons name={isBlocked ? 'person-add-outline' : 'ban'} size={32} color={isBlocked ? '#10B981' : '#EF4444'} />
                </View>
                <Text style={styles.modalMessageText}>{isBlocked ? 'Bu kullanıcının engelini kaldırmak istediğinize emin misiniz?' : 'Bu kullanıcıyı engellemek istediğinize emin misiniz?'}</Text>
              </View>
              <View style={[styles.modalButtons, isNarrow ? styles.modalButtonsColumn : styles.modalButtonsRow]}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowBlockModal(false)}>
                  <Text style={styles.modalButtonSecondaryText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={async () => {
                  try {
                    if (!currentUser?.id || !id) return;
                    if (isBlocked) {
                      await unblockUser(id);
                    } else {
                      await blockUser(chatUser!, 'Chat ekranından engellendi');
                    }
                    setShowBlockModal(false);
                    setShowMenu(false);
                    NavigationHelper.goToMessages();
                  } catch { setShowBlockModal(false); }
                }}>
                  <Text style={styles.modalButtonPrimaryText}>{isBlocked ? 'Engeli Kaldır' : 'Engelle'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <View style={styles.dropdownOverlay}>
          <TouchableOpacity style={styles.dropdownBackdrop} onPress={() => setShowMenu(false)} />
          <LinearGradient colors={dropdownGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.dropdownMenu, { top: (insets.top + 64) }]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowMenu(false); setShowDeleteModal(true); }}>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={styles.dropdownIcon} />
              <Text style={styles.dropdownText}>Mesajları Sil</Text>
            </TouchableOpacity>
            {!isBlockedBy && (
              <>
                <View style={styles.dropdownSeparator} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowMenu(false); setShowBlockModal(true); }}>
                  <Ionicons name={isBlocked ? 'person-add-outline' : 'person-remove-outline'} size={20} color="#FFFFFF" style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>{isBlocked ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  chatContainer: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative' },

  header: {
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 50 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: { fontSize: 20 },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  statusDot: { position: 'absolute', bottom: 0, right: 5, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ffffff' },
  userDetails: { 
    flex: 1, 
    justifyContent: 'center', 
    minHeight: 50,
    paddingVertical: 4
  },
  userName: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 20,
    flexWrap: 'wrap',
    flex: 1
  },
  userStatus: { 
    color: '#fff', 
    fontSize: 12, 
    opacity: 0.8,
    marginTop: 2,
    lineHeight: 16
  },
  menuButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  menuButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', lineHeight: 24 },

  messagesList: { flex: 1, paddingHorizontal: 16 },
  messagesContentContainer: { paddingTop: 20 },
  messageContainer: { marginVertical: 4 },
  sentMessage: { alignItems: 'flex-end' },
  receivedMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginVertical: 2 },
  imageContainer: { width: 200, height: 150, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  messageImage: { width: 200, height: 150, borderRadius: 8 },
  messageText: { fontSize: 16, fontWeight: '400', lineHeight: 20 },
  messageTime: { fontSize: 11, marginTop: 4, fontWeight: '400' },

  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5, borderTopColor: '#C6C6C8', minHeight: 60, maxHeight: 120,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  imageButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: '#FFFFFF', borderWidth: 2 },
  textInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, color: '#1F2937', fontSize: 16, maxHeight: 100, marginRight: 12, minHeight: 48 },
  sendButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  blockedWarning: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffebee', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12 },
  blockedWarningIcon: { fontSize: 20, marginRight: 8 },
  blockedWarningText: { color: '#d32f2f', fontSize: 16, fontWeight: '600' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#000', fontSize: 16, marginTop: 10 },

  dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  dropdownBackdrop: { flex: 1, backgroundColor: 'transparent' },
  dropdownMenu: { position: 'absolute', right: 20, borderRadius: 20, minWidth: 240, paddingVertical: 12 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  dropdownIcon: { marginRight: 12 },
  dropdownText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  dropdownSeparator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)', marginHorizontal: 16, marginVertical: 4 },

  modalOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, marginHorizontal: 20, maxWidth: 340, width: '88%', overflow:'hidden' },
  modalHeader: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16 },
  modalHeaderText: { fontSize: 18, fontWeight:'700', color:'#111827', textAlign:'center' },
  modalContent: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  modalIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(59,130,246,0.15)', marginBottom: 12 },
  modalMessageText: { fontSize: 15, color:'#374151', textAlign:'center', lineHeight:22 },
  modalSubMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  modalButtons: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  modalButtonsRow: { flexDirection: 'row' },
  modalButtonsColumn: { flexDirection: 'column' },
  modalButtonSecondary: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonSecondaryText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  modalButtonPrimary: { flex: 1, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalButtonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Load more styles
  loadMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
