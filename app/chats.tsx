import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// useFocusEffect kaldırıldı
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SwipeableTabContainer } from '../components/SwipeableTabContainer';
import { API_CONFIG, ApiService } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useProfile } from '../contexts/ProfileContext';
// import { firebaseService } from '../services/FirebaseService'; // Firebase kaldırıldı
import CountBadge from '../components/CountBadge';
import { NavigationHelper } from '../utils/NavigationHelper';

export default function Chats() {
  const router = useRouter();
  const { currentUser: authUser } = useAuth();
  const { chats, setChats, getChats, onlineUsers, getUserInfo, isLoadingChats, getUserState, globalUserStates, updateUserState, getTotalUnreadCount, getChatUnreadCount } = useChat();
  const { currentUser: profileUser, blockUser, unblockUser, blockedUsers } = useProfile();
  const insets = useSafeAreaInsets();
  
  // Navigasyon tuşu olmayan telefonları tespit et
  const hasNoNavigationButtons = insets.bottom === 0;
  
  // Tüm sohbetleri göster - engellenen kullanıcılar da görünsün
  const filteredChats = useMemo(() => {
    return chats; // Filtreleme kaldırıldı - engellenen kullanıcılar da görünsün
  }, [chats]);

  // State tanımlamaları
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [blockingStatus, setBlockingStatus] = useState<{[key: string]: {isBlockedByMe: boolean, isBlockedByOther: boolean}}>({});

  // Chat item'larını memoize et
  const renderChatItem = useCallback(({ item: chat }: { item: any }) => {
    const isSelected = selectedChatId === chat.id;
    const unreadCount = getChatUnreadCount(chat.id);
    
    return (
      <TouchableOpacity
        key={chat.id}
        style={[styles.chatItem, isSelected && styles.selectedChatItem]}
        onPress={() => {
          setSelectedChatId(chat.id);
          NavigationHelper.goToChat(chat.user1Id === authUser?.id ? chat.user2Id : chat.user1Id);
        }}
        onLongPress={() => {
          setSelectedChatForAction(chat.id);
          setShowBlockModal(true);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${chat.otherUser?.name || 'Kullanıcı'} ile sohbet`}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: chat.bgColor || '#FFB6C1' }]}>
            {chat.avatarImage ? (
              <Image source={{ uri: chat.avatarImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{chat.avatar || '👤'}</Text>
            )}
          </View>
          <View style={[
            styles.statusIndicator,
            chat.otherUser?.is_online ? styles.onlineIndicator : styles.offlineIndicator
          ]} />
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>
              {(() => {
                const parts = chat.id.split('_');
                if (!authUser?.id) return chat.otherUser?.name || 'Kullanıcı';
                const status = blockingStatus[chat.id];
                if (status?.isBlockedByMe) return 'Engellenen Kullanıcı';
                if (status?.isBlockedByOther) return 'Bu kullanıcı sizi engelledi';
                
                // getUserState ile doğru veriyi al
                const otherUserId = parts[0] === authUser?.id ? parts[1] : parts[0];
                const userState = getUserState(otherUserId);
                const otherUserName = userState?.name || chat.otherUser?.name || 'Kullanıcı';
                console.log(`📱 Chats ekranı isim (2): ${otherUserName} (${chat.id}) - userState:`, userState);
                return otherUserName;
              })()}
            </Text>
            <View style={styles.chatMeta}>
              <Text style={styles.timestamp}>
                {(() => {
                  if (!chat.lastTime) return 'Şimdi';
                  try {
                    const lastTime = new Date(chat.lastTime);
                    const now = new Date();
                    const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / (1000 * 60));
                    
                    if (diffMinutes < 1) return 'Şimdi';
                    if (diffMinutes < 60) return `${diffMinutes}dk`;
                    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}sa`;
                    
                    // 24 saatten önceki mesajlar için gün formatı
                    const diffDays = Math.floor(diffMinutes / 1440);
                    if (diffDays === 1) return 'Dün';
                    if (diffDays < 7) return `${diffDays} gün önce`;
                    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
                    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
                    return `${Math.floor(diffDays / 365)} yıl önce`;
                  } catch (_e) {
                    return 'Şimdi';
                  }
                })()}
              </Text>
              <CountBadge count={unreadCount} size="small" />
            </View>
          </View>
          <Text style={styles.lastMessage} numberOfLines={2} ellipsizeMode="tail">{chat.lastMessage}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [selectedChatId, getChatUnreadCount, authUser?.id, blockingStatus]);
  
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isLoadingBlockingStatus, setIsLoadingBlockingStatus] = useState(true);
  const [userGenders, setUserGenders] = useState<{[key: string]: string}>({});
  const slideAnim = useRef(new Animated.Value(0)).current;
  const menuScaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChatForAction, setSelectedChatForAction] = useState<string | null>(null);

  // Chat'leri yükle - sadece bir kez
  useEffect(() => {
    if (authUser?.id && !isLoadingChats && chats.length === 0) {
      getChats(); // Chat listesi boşsa yükle
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Chats yüklendiğinde global state'i güncelle - SADECE İLK YÜKLEME
  useEffect(() => {
    if (chats.length > 0) {
      chats.forEach(chat => {
        const parts = chat.id.split('_');
        const otherUserId = parts[0] === authUser?.id ? parts[1] : parts[0];
        if (chat.otherUser && !getUserState(otherUserId)) {
          updateUserState(otherUserId, {
            isOnline: !!chat.otherUser.is_online,
            lastSeen: chat.otherUser.last_active ? new Date(chat.otherUser.last_active) : new Date(),
            name: chat.otherUser.name,
            surname: chat.otherUser.surname || '',
            avatar: chat.otherUser.avatar || '👤',
            bgColor: chat.otherUser.bg_color || '#FFB6C1',
            gender: chat.otherUser.gender || 'female'
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.length, authUser?.id]); // chats yerine chats.length - infinite loop önleme

  // Real-time mesaj güncellemeleri
  useEffect(() => {
    if (!authUser?.id) return;

    // WebSocket listener - yeni mesaj geldiğinde chat listesini güncelle
    const handleNewMessage = (data: any) => {
      if (data.senderId !== authUser.id) {
        // Yeni mesaj geldi, chat listesini güncelle
        getChats();
      }
    };

    // WebSocket event listener'ları ekle
    const webSocketService = require('../services/websocket').default;
    if (webSocketService && webSocketService.on) {
      webSocketService.on('new_message', handleNewMessage);
    }

    return () => {
      if (webSocketService && webSocketService.off) {
        webSocketService.off('new_message', handleNewMessage);
      }
    };
  }, [authUser?.id, getChats]);

  // Gender bilgilerini çek
  useEffect(() => {
    const loadUserGenders = async () => {
      if (!filteredChats.length) return;
      const genderMap: {[key: string]: string} = {};
      for (const chat of filteredChats) {
        const parts = chat.id.split('_');
        const otherUserId = parts[0] === authUser?.id ? parts[1] : parts[0];
        try {
          const userInfo = await getUserInfo(otherUserId);
          if (userInfo?.gender) genderMap[otherUserId] = userInfo.gender;
        } catch (_e) {}
      }
      setUserGenders(genderMap);
    };
    loadUserGenders();
  }, [filteredChats, authUser?.id, getUserInfo]);

  // Engelleme durumunu kontrol et - sadece chat ID'leri değiştiğinde
  useEffect(() => {
    const checkBlockingStatus = async () => {
      if (!authUser?.id || !filteredChats.length) {
        setIsLoadingBlockingStatus(false);
        return;
      }
      setIsLoadingBlockingStatus(true);
      const statusMap: {[key: string]: {isBlockedByMe: boolean, isBlockedByOther: boolean}} = {};
      for (const chat of filteredChats) {
        const parts = chat.id.split('_');
        const otherUserId = parts[0] === authUser.id ? parts[1] : parts[0];
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${otherUserId}/block-status`, {
            headers: {
              'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (data.success) {
            statusMap[chat.id] = { isBlockedByMe: data.blockedByMe, isBlockedByOther: data.blockedByThem };
          } else {
            statusMap[chat.id] = { isBlockedByMe: false, isBlockedByOther: false };
          }
        } catch (_e) {
          statusMap[chat.id] = { isBlockedByMe: false, isBlockedByOther: false };
        }
      }
      setBlockingStatus(statusMap);
      setIsLoadingBlockingStatus(false);
    };
    checkBlockingStatus();
  }, [authUser?.id, filteredChats.map(chat => chat.id).join(',')]);

  // useFocusEffect tamamen kaldırıldı - sadece useEffect kullanıyoruz
  useEffect(() => {
    if (chats.length === 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [chats.length, fadeAnim, scaleAnim]);

  // Swipe gesture handlers
  const handleSwipeLeft = useCallback(() => {
    NavigationHelper.goToProfile();
  }, []);

  const handleSwipeRight = useCallback(() => {
    NavigationHelper.goHome();
  }, []);

  // Long press handler
  const handleLongPress = useCallback((chat: any) => {
    if (selectedChatId && selectedChatId !== chat.id) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.timing(menuScaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(menuScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ])
      ]).start();
      setSelectedChatId(chat.id);
    } else {
      setSelectedChatId(chat.id);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(menuScaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedChatId, slideAnim, menuScaleAnim, opacityAnim]);

  // Action handlers
  const handleDeleteMessages = useCallback(async (chatId: string) => {
    try {
      await ApiService.deleteChat(chatId);
      setSelectedChatId(null);
      // getChats(); // KALDIRILDI (race condition yaratıyordu)
    } catch (_e) {}
  }, [getChats]);

  const handleUnblockUser = useCallback(async (chatId: string) => {
    try {
      const chatIdParts = chatId.split('_');
      const user1Id = chatIdParts[0];
      const user2Id = chatIdParts[1];
      if (!authUser?.id) return;
      const otherUserId = user1Id === authUser.id ? user2Id : user1Id;
      await unblockUser(otherUserId);
      setBlockingStatus(prev => ({ ...prev, [chatId]: { ...(prev[chatId] || {isBlockedByOther:false}), isBlockedByMe: false } }));
      setSelectedChatId(null);
      // getChats(); // KALDIRILDI (race condition yaratıyordu)
    } catch (_e) {}
  }, [getChats, authUser?.id, unblockUser]);

  const handleBlockUser = useCallback(async (chatId: string) => {
    try {
      const chatIdParts = chatId.split('_');
      const user1Id = chatIdParts[0];
      const user2Id = chatIdParts[1];
      if (!authUser?.id) return;
      const otherUserId = user1Id === authUser.id ? user2Id : user1Id;
      const chat = chats.find(c => c.id === chatId);
      if (!chat?.otherUser) return;
      const userProfile = {
        id: chat.otherUser.id || chat.otherUser._id || '',
        name: chat.otherUser.name || '',
        surname: chat.otherUser.surname || '',
        age: 25,
        location: 'Türkiye',
        gender: (chat.otherUser.gender as 'male' | 'female') || 'female',
        avatar: chat.otherUser.avatar || '👤',
        avatarImage: chat.otherUser.avatar_image || '',
        bgColor: chat.otherUser.bg_color || '#FFB6C1',
        about: '',
        hobbies: [],
        isOnline: !!chat.otherUser.is_online,
        diamonds: 0
      };
      await blockUser(userProfile, 'Mesajlar sayfasından engellendi');
      setBlockingStatus(prev => ({ ...prev, [chatId]: { ...(prev[chatId] || {isBlockedByOther:false}), isBlockedByMe: true } }));
      setSelectedChatId(null);
      // getChats(); // KALDIRILDI (race condition yaratıyordu)
    } catch (_e) {}
  }, [authUser?.id, chats, blockUser, getChats]);

  return (
    <ProtectedRoute>
      <SwipeableTabContainer onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} enabled={true}>
        <View style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <LinearGradient
              colors={profileUser?.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff5571', '#ff6b95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.headerGradient,
                { paddingTop: hasNoNavigationButtons ? insets.top + 4 : insets.top + 16, paddingBottom: hasNoNavigationButtons ? 8 : 16 }
              ]}
            >
              <View style={styles.headerContent}>
                <Text style={styles.title}>Mesajlar</Text>
                <TouchableOpacity 
                  style={styles.tokenChip}
                  onPress={() => NavigationHelper.goToTokenPurchase()}
                  accessibilityRole="button"
                  accessibilityLabel="Jeton satın al"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <View style={styles.tokenIconCircle}>
                    <Text style={styles.tokenIconDollar}>$</Text>
                  </View>
                  <Text style={styles.tokenChipText}>{profileUser?.diamonds || 0} Jeton</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Chat List */}
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={64}
              removeClippedSubviews={true}
            >
              {filteredChats.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Animated.View 
                    style={[styles.emptyContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
                  >
                    <View style={styles.emptyIconContainer}>
                      <Text style={styles.emptyIcon}>💬</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Mesaj kutunuz boş</Text>
                    <Text style={styles.emptyMessage}>Yeni insanlarla tanışmak için{'\n'}birilerine mesaj atabilirsiniz</Text>
                    <TouchableOpacity style={styles.exploreButton} onPress={() => NavigationHelper.goHome()}>
                      <Text style={styles.exploreButtonText}>Keşfet</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              ) : (isLoadingBlockingStatus || isLoadingChats || chats.length === 0) ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>{isLoadingChats ? "Chat'ler yükleniyor..." : chats.length === 0 ? "Chat'ler yükleniyor..." : 'Yükleniyor...'}</Text>
                </View>
              ) : (
                filteredChats.map((chat) => {
                  const isSelected = selectedChatId === chat.id;
                  if (isSelected) {
                    return (
                      <View key={`slide-${chat.id}`} style={styles.slideContainer}>
                        {/* Sol taraf - Kapatma butonu */}
                        <TouchableOpacity 
                          style={styles.closeButton}
                          onPress={() => {
                            Animated.parallel([
                              Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                              Animated.timing(menuScaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
                              Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                            ]).start(() => setSelectedChatId(null));
                          }}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel="Menüyü kapat"
                        >
                          <Ionicons name="close" size={20} color="#ffffff" />
                        </TouchableOpacity>
                        
                        {/* Sağ taraf - Context menu */}
                        <Animated.View style={[
                          styles.contextMenuContainer,
                          {
                            transform: [
                              { translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] })},
                              { scale: menuScaleAnim }
                            ],
                            opacity: opacityAnim,
                          }
                        ]}>
                          {/* Avatar */}
                          <View style={styles.contextMenuAvatar}>
                            <View style={styles.contextMenuAvatarCircle}>
                              {(() => {
                                const parts = chat.id.split('_');
                                if (!authUser?.id) return null;
                                const status = blockingStatus[chat.id];
                                if (status?.isBlockedByMe || status?.isBlockedByOther) {
                                  return <Ionicons name="ban" size={24} color="#ef4444" />;
                                } else if (chat.avatarImage) {
                                  return (
                                    <Image 
                                      source={{ uri: chat.avatarImage.startsWith('data:') ? chat.avatarImage : `data:image/jpeg;base64,${chat.avatarImage}` }} 
                                      style={styles.contextMenuAvatarImage}
                                    />
                                  );
                                } else if (chat.avatar) {
                                  return <Text style={styles.contextMenuAvatarEmoji}>{chat.avatar}</Text>;
                                } else {
                                  return <Text style={styles.contextMenuAvatarEmoji}>{chat.gender === 'male' ? '👨' : '👩'}</Text>;
                                }
                              })()}
                            </View>
                          </View>
                          
                          {/* Koşullu butonlar */}
                          <View style={styles.contextMenuButtons}>
                            {blockingStatus[chat.id]?.isBlockedByMe && (
                              <TouchableOpacity 
                                style={styles.contextMenuButtonTop}
                                onPress={() => { setSelectedChatForAction(chat.id); setShowUnblockModal(true); }}
                                accessibilityRole="button"
                                accessibilityLabel="Engeli kaldır"
                              >
                                <Text style={styles.contextMenuButtonText}>Engeli Kaldır</Text>
                              </TouchableOpacity>
                            )}
                            
                            {!blockingStatus[chat.id]?.isBlockedByMe && !blockingStatus[chat.id]?.isBlockedByOther && (
                              <TouchableOpacity 
                                style={styles.contextMenuButtonTop}
                                onPress={() => { setSelectedChatForAction(chat.id); setShowBlockModal(true); }}
                                accessibilityRole="button"
                                accessibilityLabel="Kullanıcıyı engelle"
                              >
                                <Text style={styles.contextMenuButtonText}>Kullanıcıyı Engelle</Text>
                              </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity 
                              style={styles.contextMenuButtonBottom}
                              onPress={() => { setSelectedChatForAction(chat.id); setShowDeleteModal(true); }}
                              accessibilityRole="button"
                              accessibilityLabel="Mesajları sil"
                            >
                              <Text style={styles.contextMenuButtonText}>Mesajları Sil</Text>
                            </TouchableOpacity>
                          </View>
                        </Animated.View>
                      </View>
                    );
                  } else {
                    return (
                      <TouchableOpacity 
                        key={`touch-${chat.id}-${isSelected ? 'selected' : 'normal'}`} 
                        style={styles.chatItem}
                        delayLongPress={500}
                        onLongPress={() => handleLongPress(chat)}
                        onPress={() => {
                          const chatIdParts = chat.id.split('_');
                          const user1Id = chatIdParts[0];
                          const user2Id = chatIdParts[1];
                          if (!authUser?.id) return;
                          const otherUserId = user1Id === authUser.id ? user2Id : user1Id;
                          if (chat.otherUser) {
                            updateUserState(otherUserId, {
                              isOnline: !!chat.otherUser.is_online,
                              lastSeen: chat.otherUser.last_active ? new Date(chat.otherUser.last_active) : new Date(),
                              name: chat.otherUser.name,
                              surname: chat.otherUser.surname || '',
                              avatar: chat.otherUser.avatar || '👤',
                              bgColor: chat.otherUser.bg_color || '#FFB6C1',
                              gender: chat.otherUser.gender || 'female'
                            });
                          }
                          NavigationHelper.goToChat(otherUserId);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Sohbeti aç"
                      >
                        <View style={styles.avatarContainer}>
                          <View style={[
                            styles.avatar, 
                            { 
                              backgroundColor: (() => {
                                const parts = chat.id.split('_');
                                if (!authUser?.id) return '#FF6B95';
                                const inferredOtherUserId = parts[0] === authUser.id ? parts[1] : parts[0];
                                const status = blockingStatus[chat.id];
                                if (status?.isBlockedByMe) return '#ff3b30';
                                if (status?.isBlockedByOther) return '#6c757d';
                                const userGender = userGenders[inferredOtherUserId];
                                return userGender === 'female' ? '#FF6B95' : '#3B82F6';
                              })()
                            }
                          ]}>
                            {(() => {
                              const parts = chat.id.split('_');
                              if (!authUser?.id) return null;
                              const status = blockingStatus[chat.id];
                              if (status?.isBlockedByMe) {
                                return (<View style={styles.placeholderContainer}><Ionicons name="ban" size={30} color="#ffffff" /></View>);
                              } else if (status?.isBlockedByOther) {
                                return (<View style={styles.placeholderContainer}><Ionicons name="person" size={30} color="#ffffff" /></View>);
                              } else if (chat.avatarImage) {
                                return (
                                  <Image 
                                    source={{ 
                                      uri: chat.avatarImage.startsWith('data:') 
                                        ? chat.avatarImage 
                                        : chat.avatarImage.startsWith('http')
                                        ? chat.avatarImage
                                        : `data:image/jpeg;base64,${chat.avatarImage}` 
                                    }} 
                                    style={styles.avatarImage}
                                    onError={(error) => {
                                      // console.log('❌ Chats: Resim yüklenemedi:', chat.avatarImage, error);
                                    }}
                                    onLoad={() => {
                                      // console.log('✅ Chats: Resim yüklendi:', chat.avatarImage);
                                    }}
                                  />
                                );
                              } else if (chat.avatar) {
                                return <Text style={[styles.avatarEmoji, { color: '#ffffff' }]}>{chat.avatar}</Text>;
                              } else {
                                return (
                                  <View style={[styles.placeholderContainer, { backgroundColor: chat.gender === 'female' ? '#FF6B95' : '#3B82F6' }]}>
                                    <Text style={[styles.avatarEmoji, { color: '#ffffff' }]}>{chat.gender === 'male' ? '👨' : '👩'}</Text>
                                  </View>
                                );
                              }
                            })()}
                          </View>
                          {(() => {
                            const parts = chat.id.split('_');
                            if (!authUser?.id) return null;
                            const status = blockingStatus[chat.id];
                            if (status?.isBlockedByMe || status?.isBlockedByOther) return null;
                            return (
                              <View style={[styles.statusDot, { 
                                backgroundColor: (() => {
                                  const otherUserId = parts[0] === authUser?.id ? parts[1] : parts[0];
                                  const userState = getUserState(otherUserId);
                                  const isOnline = userState?.isOnline || false;
                                  return isOnline ? '#00ff00' : '#ff3b30';
                                })()
                              }]} />
                            );
                          })()}
                        </View>
                        
                        <View style={styles.chatInfo}>
                          <View style={styles.chatHeader}>
                            <Text style={styles.chatName}>
                              {(() => {
                                const parts = chat.id.split('_');
                                if (!authUser?.id) return chat.otherUser?.name || 'Kullanıcı';
                                const status = blockingStatus[chat.id];
                                if (status?.isBlockedByMe) return 'Engellenen Kullanıcı';
                                if (status?.isBlockedByOther) return 'Bu kullanıcı sizi engelledi';
                                const otherUserName = chat.otherUser?.name || 'Kullanıcı';
                                console.log(`📱 Chats ekranı isim (2): ${otherUserName} (${chat.id})`);
                                return otherUserName;
                              })()}
                            </Text>
                            <View style={styles.chatMeta}>
                              <Text style={styles.timestamp}>
                                {(() => {
                                  if (!chat.lastTime) return 'Şimdi';
                                  try {
                                    const lastTime = new Date(chat.lastTime);
                                    const now = new Date();
                                    const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / (1000 * 60));
                                    
                                    if (diffMinutes < 1) return 'Şimdi';
                                    if (diffMinutes < 60) return `${diffMinutes}dk`;
                                    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}sa`;
                                    
                                    // 24 saatten önceki mesajlar için gün formatı
                                    const diffDays = Math.floor(diffMinutes / 1440);
                                    if (diffDays === 1) return 'Dün';
                                    if (diffDays < 7) return `${diffDays} gün önce`;
                                    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
                                    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
                                    return `${Math.floor(diffDays / 365)} yıl önce`;
                                  } catch (_e) {
                                    return 'Şimdi';
                                  }
                                })()}
                              </Text>
                              <CountBadge count={getChatUnreadCount(chat.id)} size="small" />
                            </View>
                          </View>
                          <Text style={styles.lastMessage} numberOfLines={2} ellipsizeMode="tail">{chat.lastMessage}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                })
              )}
            </ScrollView>

            {/* Block Modal */}
            <Modal
              visible={showBlockModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => { setShowBlockModal(false); setSelectedChatForAction(null); }}
            >
              <View style={styles.blockModalOverlay}>
                <View style={styles.blockModalContainer} accessible accessibilityLabel="Kullanıcıyı Engelle">
                  <View style={styles.blockIconContainer}>
                    <View style={styles.blockIconCircle}>
                      <Text style={styles.blockIconText}>🚫</Text>
                    </View>
                  </View>
                  <Text style={styles.blockModalTitle}>Kullanıcıyı Engelle</Text>
                  <Text style={styles.blockModalMessage}>
                    Bu kullanıcıyı engellemek istediğinizden emin misiniz? Engellenen kullanıcılar size mesaj gönderemez.
                  </Text>
                  <View style={styles.blockModalButtons}>
                    <TouchableOpacity 
                      style={styles.blockCancelButton}
                      onPress={() => { setShowBlockModal(false); setSelectedChatForAction(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockCancelButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.blockConfirmButton}
                      onPress={() => {
                        if (selectedChatForAction) {
                          handleBlockUser(selectedChatForAction);
                          setShowBlockModal(false);
                          setSelectedChatForAction(null);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockConfirmButtonText}>Engelle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Unblock Modal */}
            <Modal
              visible={showUnblockModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => { setShowUnblockModal(false); setSelectedChatForAction(null); }}
            >
              <View style={styles.blockModalOverlay}>
                <View style={styles.blockModalContainer} accessible accessibilityLabel="Engeli Kaldır">
                  <View style={styles.blockIconContainer}>
                    <View style={styles.blockIconCircle}>
                      <Text style={styles.blockIconText}>✅</Text>
                    </View>
                  </View>
                  <Text style={styles.blockModalTitle}>Engeli Kaldır</Text>
                  <Text style={styles.blockModalMessage}>
                    Bu kullanıcının engelini kaldırmak istediğinizden emin misiniz? Engeli kaldırıldıktan sonra kullanıcı size tekrar mesaj gönderebilir.
                  </Text>
                  <View style={styles.blockModalButtons}>
                    <TouchableOpacity 
                      style={styles.blockCancelButton}
                      onPress={() => { setShowUnblockModal(false); setSelectedChatForAction(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockCancelButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.blockConfirmButton}
                      onPress={() => {
                        if (selectedChatForAction) {
                          handleUnblockUser(selectedChatForAction);
                          setShowUnblockModal(false);
                          setSelectedChatForAction(null);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockConfirmButtonText}>Engeli Kaldır</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Delete Messages Modal */}
            <Modal
              visible={showDeleteModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => { setShowDeleteModal(false); setSelectedChatForAction(null); }}
            >
              <View style={styles.blockModalOverlay}>
                <View style={styles.blockModalContainer} accessible accessibilityLabel="Mesajları Sil">
                  <View style={styles.blockIconContainer}>
                    <View style={styles.blockIconCircle}>
                      <Text style={styles.blockIconText}>🗑️</Text>
                    </View>
                  </View>
                  <Text style={styles.blockModalTitle}>Mesajları Sil</Text>
                  <Text style={styles.blockModalMessage}>
                    Bu kullanıcı ile olan tüm mesajları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </Text>
                  <View style={styles.blockModalButtons}>
                    <TouchableOpacity 
                      style={styles.blockCancelButton}
                      onPress={() => { setShowDeleteModal(false); setSelectedChatForAction(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockCancelButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.blockConfirmButton}
                      onPress={() => {
                        if (selectedChatForAction) {
                          handleDeleteMessages(selectedChatForAction);
                          setShowDeleteModal(false);
                          setSelectedChatForAction(null);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.blockConfirmButtonText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Bottom Navigation */}
            <View style={[styles.bottomNav, { 
              paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 8 : 4),
              paddingTop: 12,
            }]}>
              <TouchableOpacity 
                style={styles.navItem} 
                onPress={() => NavigationHelper.goHome()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Keşfet"
              >
                <Ionicons name="compass" size={20} color="#9ca3af" />
                <Text style={styles.tabText}>Keşfet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Mesajlar">
                <View style={styles.iconContainer}>
                  <Ionicons name="chatbubble-outline" size={20} color="#ef4444" />
                  <CountBadge count={getTotalUnreadCount()} size="small" />
                </View>
                <Text style={styles.tabActive}>Mesajlar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem} 
                onPress={() => NavigationHelper.goToProfile()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Profil"
              >
                <Ionicons name="person-outline" size={20} color="#9ca3af" />
                <Text style={styles.tabText}>Profil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SwipeableTabContainer>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  headerGradient: { 
    paddingTop: 16,
    paddingBottom: 16, 
    paddingHorizontal: 20 
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tokenChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  tokenIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  tokenIconDollar: { 
    color: '#ff6b95', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  tokenChipText: { color: '#fff', fontWeight: '700' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 100, // Bottom navigation için boşluk
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  // Slide Container Styles
  slideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 0,
    height: 82, // Chat item yüksekliği
  },
  closeButton: {
    width: 40, // Küçültüldü
    height: 40, // Küçültüldü
    borderRadius: 20,
    backgroundColor: '#ef4444', // Kırmızı
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // Context Menu Styles
  contextMenuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f3f4f6', // Açık gri arka plan
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingVertical: 16,
    paddingHorizontal: 20,
    height: 82, // Chat item yüksekliği
  },
  contextMenuAvatar: { marginRight: 16 },
  contextMenuAvatarCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center',
  },
  contextMenuAvatarImage: { width: 50, height: 50, borderRadius: 25 },
  contextMenuAvatarEmoji: { fontSize: 24, color: '#ffffff' },
  contextMenuButtons: { flex: 1, flexDirection: 'column' },
  contextMenuButtonTop: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 4 },
  contextMenuButtonBottom: { backgroundColor: '#EC4899', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  contextMenuButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 24 },
  avatarText: { fontSize: 24, color: '#ffffff' },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  placeholderContainer: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#e5e7eb', borderRadius: 25 },
  placeholderText: { fontSize: 8, color: '#6b7780', opacity: 0.6 },
  placeholderIcon: { fontSize: 20, color: '#6b7780', opacity: 0.8 },
  statusIndicator: { position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1a1f2e' },
  onlineIndicator: { position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00ff00', borderWidth: 2, borderColor: '#1a1f2e' },
  offlineIndicator: { position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff0000', borderWidth: 2, borderColor: '#1a1f2e' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  chatMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timestamp: { fontSize: 12, color: '#9aa4b2', marginRight: 8 },
  unreadBadge: { backgroundColor: '#1976f3', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  lastMessage: { fontSize: 14, color: '#6b7280' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 70,
  },
  navItem: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  tabActive: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  iconContainer: { position: 'relative' },
  badge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#38BDF8', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 100 },
  emptyContent: { alignItems: 'center', justifyContent: 'center' },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  emptyIcon: { fontSize: 48, textAlign: 'center' },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 12 },
  emptyMessage: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  exploreButton: {
    backgroundColor: '#1976f3', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 25,
    shadowColor: '#1976f3', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  exploreButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  statusDot: { position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ffffff' },
  // Split Row Styles
  splitRowContainer: {
    marginHorizontal: 20, marginVertical: 0, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 2, height: 82,
  },
  splitRowTop: { backgroundColor: '#8B5CF6', height: 41, paddingHorizontal: 20, justifyContent: 'center' },
  splitRowBottom: { backgroundColor: '#EC4899', height: 41, paddingHorizontal: 20, justifyContent: 'center' },
  splitRowContent: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  splitRowAvatar: { position: 'relative', marginRight: 16 },
  splitRowAvatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  splitRowAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  splitRowAvatarEmoji: { fontSize: 20, color: '#ffffff' },
  splitRowStatusDot: { position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ffffff' },
  splitRowInfo: { flex: 1, justifyContent: 'center' },
  splitRowTextContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  splitRowEmail: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold', flex: 1 },
  splitRowTimestamp: { fontSize: 12, color: '#FFFFFF', opacity: 0.8 },
  splitRowMessage: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  blockModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  blockModalContainer: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15,
  },
  blockIconContainer: { marginBottom: 20 },
  blockIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  blockIconText: { fontSize: 30 },
  blockModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, textAlign: 'center' },
  blockModalMessage: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  blockModalButtons: { flexDirection: 'row', width: '100%', gap: 12 },
  blockCancelButton: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  blockCancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  blockConfirmButton: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  blockConfirmButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});