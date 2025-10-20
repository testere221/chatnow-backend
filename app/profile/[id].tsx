import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountBadge from '../../components/CountBadge';
import { ApiService } from '../../config/api';
import { User as FirebaseUser, useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useProfile } from '../../contexts/ProfileContext';
import { NavigationHelper } from '../../utils/NavigationHelper';


export default function UserProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const userId = id as string;
  const { currentUser: authUser } = useAuth();
  const { addNewChat, getChatById, onlineUsers, getUserState, globalUserStates, updateUserState, getChats, getTotalUnreadCount } = useChat();
  const { currentUser, blockUser } = useProfile();
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const insets = useSafeAreaInsets();
  

  // API'den kullanıcı bilgilerini çek
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // Önce global state'den kontrol et
        const globalUserState = getUserState(userId);
        if (globalUserState) {
          // Global state kullanılıyor
          // Global state'den user objesi oluştur
          setUser({
            id: userId,
            email: '', // Email bilgisi yok, boş string
            name: globalUserState.name,
            surname: globalUserState.surname,
            avatar: globalUserState.avatar,
            bg_color: globalUserState.bgColor,
            gender: globalUserState.gender,
            is_online: globalUserState.isOnline,
            // Global state'den gelen bilgiler
            age: globalUserState.age || 25,
            location: globalUserState.location || 'Bilinmiyor',
            about: globalUserState.about || 'Kullanıcı hakkında bilgi yok',
            hobbies: globalUserState.hobbies || [],
            diamonds: globalUserState.diamonds || 0,
            avatar_image: globalUserState.avatarImage || ''
          } as FirebaseUser);
          setLoading(false);
          return;
        }
        
        // Global state bulunamadı, API'den çekiliyor
        
        // Global state'de yoksa API'den al
        const users = await ApiService.getUsers() as FirebaseUser[];
        const userData = users.find((u: any) => u.id === userId || u._id === userId);
        
        if (userData) {
          setUser(userData);
          
          // Global state'i güncelle
          const userIdForState = userData.id;
          if (userIdForState) {
            // Global state güncellendi
            updateUserState(userIdForState, {
              isOnline: !!userData.is_online,
              lastSeen: new Date(),
              name: userData.name,
              surname: userData.surname || '',
              avatar: userData.avatar || '👤',
              bgColor: userData.bg_color || '#FFB6C1',
              gender: userData.gender || 'female',
              avatarImage: userData.avatar_image || ''
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        // Kullanıcı bilgileri yüklenirken hata
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId && userId !== 'undefined' && userId !== 'null') {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [userId]);

  // Global state değişikliklerini dinle - real-time sync
  useEffect(() => {
    const globalUserState = getUserState(userId);
    if (globalUserState && user && globalUserState.isOnline !== user.is_online) {
      // Real-time sync
      setUser(prev => prev ? {
        ...prev,
        is_online: globalUserState.isOnline,
        last_active: globalUserState.lastSeen
      } : null);
    }
  }, [globalUserStates, userId]); // user dependency kaldırıldı - infinite loop önleme

  // WebSocket listener - Real-time badge güncellemeleri
  useEffect(() => {
    if (!authUser?.id) return;

    // WebSocket listeners artık ChatContext'te yönetiliyor
  }, [authUser?.id, getChats]);

  const handleBlockUser = () => {
    if (!user) return;
    setShowBlockModal(true);
  };

  const confirmBlockUser = () => {
    if (!user) return;
    
    // Kullanıcıyı engelle
    blockUser({
      id: user.id,
      name: user.name,
      surname: user.surname,
      age: user.age,
      location: user.location,
      gender: user.gender || 'female',
      avatar: user.avatar || '',
      avatarImage: user.avatar_image || '',
      bgColor: user.bg_color || '#FFB6C1',
      about: user.about || '',
      hobbies: user.hobbies || [],
      diamonds: user.diamonds || 0,
      isOnline: false
    }, 'Kullanıcı tarafından engellendi');
    
    setShowMenu(false);
    setShowBlockModal(false);
    NavigationHelper.goHome();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Kullanıcı bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Kullanıcı bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={user.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff6b95', '#ff8fab']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => NavigationHelper.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user.name}</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={64}
          removeClippedSubviews={true}
        >
        {/* Profile Picture and Basic Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              {user.avatar_image ? (
                <Image 
                  source={{ 
                    uri: user.avatar_image.startsWith('data:') 
                      ? user.avatar_image 
                      : user.avatar_image.startsWith('http')
                      ? user.avatar_image
                      : `data:image/jpeg;base64,${user.avatar_image}`
                  }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                  fadeDuration={200}
                  loadingIndicatorSource={require('../../assets/images/icon.png')}
                  progressiveRenderingEnabled={true}
                  onError={(error) => {
                    // console.log('❌ Profile: Resim yüklenemedi:', user.avatar_image, error);
                  }}
                  onLoad={() => {
                    // console.log('✅ Profile: Resim yüklendi:', user.avatar_image);
                  }}
                />
              ) : user.avatar ? (
                <View style={[
                  styles.profileImage, 
                  { backgroundColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95' }
                ]}>
                  <Text style={[styles.profileEmoji, { color: '#ffffff' }]}>
                    {user.avatar || (user.gender === 'male' ? '👨' : '👩')}
                  </Text>
                </View>
              ) : (
                <View style={[
                  styles.profileImage, 
                  { backgroundColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95' }
                ]}>
                  <Text style={{ fontSize: 60, color: '#ffffff' }}>
                    {user.avatar || (user.gender === 'male' ? '👨' : '👩')}
                  </Text>
                </View>
              )}
              <View style={[styles.statusDot, { 
                backgroundColor: (() => {
                  const userState = getUserState(userId);
                  // SADECE global state kullan - fallback yok!
                  const isOnline = userState?.isOnline || false;
                  return isOnline ? '#00ff00' : '#ff3b30';
                })()
              }]} />
            </View>
          </View>
          
          <Text style={styles.userName} numberOfLines={2}>{user.name}{user.surname ? ` ${user.surname}` : ''}</Text>
          
          {/* Age and Location */}
          <View style={styles.userInfoRow}>
            <View style={[
              styles.ageBadge, 
              { backgroundColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95' }
            ]}>
              <Text style={styles.ageText}>{user.age} yaşında</Text>
            </View>
            <View style={[
              styles.locationBadge,
              { backgroundColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95' }
            ]}>
              <Ionicons name="location" size={16} color="#ffffff" />
              <Text style={styles.locationText}>{user.location}</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutCard}>
          <Text style={[
            styles.aboutTitle,
            { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
          ]}>Hakkında</Text>
          <Text 
            style={styles.aboutText}
            numberOfLines={showFullAbout ? undefined : 5}
          >
            {user.about || 'Henüz hakkımda bilgisi eklenmemiş.'}
          </Text>
          {user.about && user.about.length > 200 && (
            <TouchableOpacity 
              style={[
                styles.showMoreButton,
                { 
                  backgroundColor: user.gender === 'male' ? '#E3F2FD' : '#FCE4EC',
                  borderColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95'
                }
              ]}
              onPress={() => setShowFullAbout(!showFullAbout)}
            >
              <Text style={[
                styles.showMoreText,
                { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
              ]}>
                {showFullAbout ? 'Daha az göster' : 'Devamını göster'}
              </Text>
              <Ionicons 
                name={showFullAbout ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={user.gender === 'male' ? '#1976D2' : '#C2185B'} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Hobbies Section */}
        <View style={styles.hobbiesCard}>
          <Text style={[
            styles.hobbiesTitle,
            { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
          ]}>Hobiler</Text>
          {user.hobbies && user.hobbies.length > 0 ? (
            <View style={styles.hobbiesContainer}>
              {user.hobbies?.map((hobby: string, index: number) => (
                <View key={`hobby-${hobby}-${index}`} style={[
                  styles.hobbyTag,
                  { 
                    backgroundColor: user.gender === 'male' ? '#E3F2FD' : '#fdf2f8',
                    borderColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95'
                  }
                ]}>
                  <Text style={[
                    styles.hobbyText,
                    { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
                  ]}>{hobby}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noHobbiesText}>Henüz hobi eklenmemiş.</Text>
          )}
        </View>
        </ScrollView>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={[
            styles.messageButton,
            { 
              backgroundColor: user.gender === 'male' ? '#E3F2FD' : '#FCE4EC',
              borderColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95'
            }
          ]}
          onPress={() => {
            // Jeton satın alma sayfasına yönlendir
            NavigationHelper.navigate('/tokens/purchase');
          }}
        >
          <Ionicons 
            name="cash" 
            size={20} 
            color={user.gender === 'male' ? '#3B82F6' : '#FF6B95'} 
          />
          <Text style={[
            styles.messageButtonText,
            { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
          ]}>Jeton Satın Al</Text>
          <Text style={[
            styles.tokenText,
            { color: user.gender === 'male' ? '#1976D2' : '#C2185B' }
          ]}>{currentUser?.diamonds || 0} jetonunuz var</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.chatButton,
            { backgroundColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95' }
          ]}
          onPress={() => {
            // Sohbet butonuna tıklandı
            
            const existingChat = getChatById(userId);
            // Existing chat kontrolü
            
            if (existingChat) {
              // Mevcut chat bulundu, chat ekranına gidiliyor
              NavigationHelper.goToChat(userId);
            } else {
              // Yeni chat oluşturulacak, chat ekranına gidiliyor
              NavigationHelper.goToChat(userId);
            }
          }}
        >
          <Ionicons name="chatbubble" size={20} color="#ffffff" />
          <Text style={styles.chatButtonText}>Sohbet</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { 
        paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 8 : 4),
        paddingTop: 12,
      }]}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => NavigationHelper.goHome()}
          activeOpacity={0.7}
        >
          <Ionicons name="compass" size={20} color="#ef4444" />
          <Text style={styles.tabActive}>Keşfet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => NavigationHelper.goToChats()}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#9ca3af" />
            <CountBadge count={getTotalUnreadCount()} size="small" />
          </View>
          <Text style={styles.tabInactive}>Mesajlar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => NavigationHelper.goToProfile()}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color="#9ca3af" />
          <Text style={styles.tabInactive}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Seçenekler</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleBlockUser}
            >
              <Text style={styles.menuItemIcon}>🚫</Text>
              <Text style={styles.menuItemText}>Kullanıcıyı Engelle</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Blocked User Modal */}
      <Modal
        visible={showBlockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowBlockedModal(false);
          // Engellenmiş kullanıcı modal'ından ana sayfaya git
          NavigationHelper.goHome();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockedModalContainer}>
            <View style={styles.blockedIconContainer}>
              <Text style={styles.blockedIcon}>🚫</Text>
            </View>
            <Text style={styles.blockedTitle}>Engellenmiş</Text>
            <Text style={styles.blockedMessage}>
              Bu kullanıcının profilini görüntüleyemezsiniz!
            </Text>
            <TouchableOpacity 
              style={styles.blockedButton}
              onPress={() => {
                setShowBlockedModal(false);
                // Engellenmiş kullanıcı modal'ından ana sayfaya git
                NavigationHelper.goHome();
              }}
            >
              <Text style={styles.blockedButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modern Block User Modal - Resimdeki Tasarım */}
      <Modal
        visible={showBlockModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View style={styles.blockModalOverlay}>
          <View style={styles.blockModalContainer}>
            <View style={styles.blockIconContainer}>
              <View style={styles.blockIconCircle}>
                <Text style={styles.blockIconText}>🚫</Text>
              </View>
            </View>
            
            <Text style={styles.blockModalTitle}>Kullanıcıyı Engelle</Text>
            <Text style={styles.blockModalMessage}>
              {user?.name} kullanıcısını engellemek istediğinizden emin misiniz? Engellenen kullanıcılar size mesaj gönderemez.
            </Text>
            
            <View style={styles.blockModalButtons}>
              <TouchableOpacity 
                style={styles.blockCancelButton}
                onPress={() => setShowBlockModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.blockCancelButtonText}>İPTAL</Text>
              </TouchableOpacity>
              
              <View style={styles.blockButtonSeparator} />
              
              <TouchableOpacity 
                style={styles.blockConfirmButton}
                onPress={confirmBlockUser}
                activeOpacity={0.7}
              >
                <Text style={styles.blockConfirmButtonText}>ENGELLE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#1f2937',
    fontSize: 16,
  },
  loadingText: {
    color: '#1f2937',
    fontSize: 16,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 20, // Minimal boşluk
    flexGrow: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: 'relative',
    width: 150,
    height: 150,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileEmoji: {
    fontSize: 80,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: 16,
    flexWrap: 'wrap'
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fdf2f8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff6b95',
  },
  showMoreText: {
    fontSize: 14,
    color: '#ff6b95',
    fontWeight: '600',
    marginRight: 4,
  },
  hobbiesCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  hobbiesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyTag: {
    backgroundColor: '#fdf2f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff6b95',
  },
  hobbyText: {
    fontSize: 14,
    color: '#ff6b95',
    fontWeight: '600',
  },
  noHobbiesText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 2, // 16'dan 8'e düşürüldü
    paddingBottom: 1, // Alt navigasyon için minimal padding
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 16, // Butonlar arası boşluk
    marginBottom: 0, // Gereksiz margin kaldırıldı
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 0, // Daha küçük yükseklik
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  tokenText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#ff6b95',
    paddingVertical: 9, // Aynı yükseklik
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ff6b95',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    flex: 1,
  },
  tabActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  tabInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginBottom: 8,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  menuItemArrow: {
    fontSize: 18,
    color: '#888888',
  },
  // Blocked Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  blockedModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blockedIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  blockedIcon: {
    fontSize: 40,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  blockedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  blockedButton: {
    backgroundColor: '#ff6b95',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#ff6b95',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  blockedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  // Modern Block Modal Styles - Resimdeki Tasarım
  blockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  blockModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  blockIconContainer: {
    marginBottom: 20,
  },
  blockIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockIconText: {
    fontSize: 30,
  },
  blockModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  blockModalMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  blockModalButtons: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  blockCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  blockButtonSeparator: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  blockConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockConfirmButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
});
