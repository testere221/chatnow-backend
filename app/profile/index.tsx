import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountBadge from '../../components/CountBadge';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { SwipeableTabContainer } from '../../components/SwipeableTabContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useProfile } from '../../contexts/ProfileContext';
import { NavigationHelper } from '../../utils/NavigationHelper';

export default function OwnProfile() {
  const { currentUser, resetUserData } = useProfile();
  const { resetChatData, getChats, getTotalUnreadCount } = useChat();
  const { logout, currentUser: authUser } = useAuth();
  const [showFullAbout, setShowFullAbout] = useState(false);
  const insets = useSafeAreaInsets();

  const hasNoNavigationButtons = insets.bottom === 0;

  // WebSocket listeners artık ChatContext'te yönetiliyor

  const handleLogout = async () => {
    resetUserData();
    resetChatData();
    await logout();
    NavigationHelper.goToLogin();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabını Sil',
      'Hesabınızı silmek için web sitesine yönlendirileceksiniz. Orada email ve şifrenizi girerek hesabınızı silebilirsiniz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Web Sitesine Git',
          style: 'destructive',
          onPress: () => {
            // Web sitesine yönlendir
            const webUrl = 'https://chatnow.com.tr/delete-account.html';
            Linking.openURL(webUrl).catch(err => {
              console.error('Web sitesi açılamadı:', err);
              Alert.alert('Hata', 'Web sitesi açılamadı. Lütfen tarayıcınızdan manuel olarak gidin.');
            });
          },
        },
      ]
    );
  };

  const handleSwipeLeft = useCallback(() => NavigationHelper.goHome(), []);
  const handleSwipeRight = useCallback(() => NavigationHelper.goToChats(), []);

  const headerColors = useMemo(
    () => (currentUser.gender === 'male' ? ['#0ea5e9', '#2563eb'] as const : ['#ff5584', '#ff7aa0'] as const),
    [currentUser.gender]
  );

  return (
    <ProtectedRoute>
      <SwipeableTabContainer onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} enabled>
        <View style={styles.safeArea}>
          {/* Header */}
          <LinearGradient
            colors={headerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              {
                paddingTop: hasNoNavigationButtons ? insets.top + 6 : insets.top + 18,
                paddingBottom: hasNoNavigationButtons ? 10 : 16,
              },
            ]}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>Profil</Text>
              <TouchableOpacity
                style={styles.tokenChip}
                onPress={() => NavigationHelper.goToTokenPurchase()}
                accessibilityRole="button"
                accessibilityLabel="Jeton satın al"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={styles.tokenIconCircle}>
                  <Ionicons name="diamond" size={12} color="#ff5f90" />
                </View>
                <Text style={styles.tokenChipText}>{currentUser.diamonds ?? 0} Jeton</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                {currentUser.avatarImage ? (
                  <Image
                    source={{
                      uri: currentUser.avatarImage.startsWith('data:')
                        ? currentUser.avatarImage
                        : currentUser.avatarImage.startsWith('http')
                        ? currentUser.avatarImage
                        : `data:image/jpeg;base64,${currentUser.avatarImage}`,
                    }}
                    style={styles.avatar}
                    onError={(error) => {
                      // console.log('❌ OwnProfile: Resim yüklenemedi:', currentUser.avatarImage, error);
                    }}
                    onLoad={() => {
                      // console.log('✅ OwnProfile: Resim yüklendi:', currentUser.avatarImage);
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: currentUser.gender === 'male' ? '#3B82F6' : '#FF6B95' },
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>
                      {currentUser.avatar || (currentUser.gender === 'male' ? '👨' : '👩')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.userName} numberOfLines={2}>
                {currentUser.name}{currentUser.surname ? ` ${currentUser.surname}` : ''}
              </Text>
              <Text style={styles.userMeta} numberOfLines={1}>
                {currentUser.age} yaşında • {currentUser.location}
              </Text>
            </View>

            {/* About */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="create-outline" size={18} color="#ff5f90" />
                <Text style={styles.cardHeaderText}>Hakkımda</Text>
              </View>
              <Text style={styles.aboutText} numberOfLines={showFullAbout ? undefined : 5}>
                {currentUser.about || 'Henüz hakkımda bilgisi eklenmemiş.'}
              </Text>
              {currentUser.about && currentUser.about.length > 200 && (
                <TouchableOpacity style={styles.moreBtn} onPress={() => setShowFullAbout(v => !v)}>
                  <Text style={styles.moreText}>{showFullAbout ? 'Daha az' : 'Devamını göster'}</Text>
                  <Ionicons name={showFullAbout ? 'chevron-up' : 'chevron-down'} size={16} color="#ff5f90" />
                </TouchableOpacity>
              )}
            </View>

            {/* Account */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hesap</Text>

              <TouchableOpacity style={styles.row} onPress={() => NavigationHelper.goToEditProfile()}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="person-outline" size={18} color="#2563eb" />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Profili Düzenle</Text>
                    <Text style={styles.rowSub}>Fotoğraf ve bilgilerini güncelle</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.row} onPress={() => NavigationHelper.goToBlockedUsers()}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#ede9fe' }]}>
                    <Ionicons name="person-remove-outline" size={18} color="#7c3aed" />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Engellenen Kullanıcılar</Text>
                    <Text style={styles.rowSub}>Engellediğin kişileri yönet</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.row} onPress={handleLogout}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Çıkış Yap</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Hesabımı Sil</Text>
                    <Text style={styles.rowSub}>Hesabınızı kalıcı olarak silin</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Navigation */}
          <View
            style={[
              styles.bottomNav,
              {
                paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 8 : 4),
                paddingTop: 12,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => NavigationHelper.goHome()}
              accessibilityRole="button"
              accessibilityLabel="Keşfet"
            >
              <Ionicons name="compass" size={20} color="#9ca3af" />
              <Text style={styles.navText}>Keşfet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => NavigationHelper.goToChats()}
              accessibilityRole="button"
              accessibilityLabel="Mesajlar"
            >
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#9ca3af" />
                <CountBadge count={getTotalUnreadCount()} size="small" />
              </View>
              <Text style={styles.navText}>Mesajlar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} accessibilityRole="button" accessibilityLabel="Profil">
              <Ionicons name="person" size={20} color="#ef4444" />
              <Text style={styles.navTextActive}>Profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SwipeableTabContainer>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  headerGradient: { paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },

  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tokenIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tokenChipText: { color: '#fff', fontWeight: '700' },

  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarWrap: {
    marginBottom: 14,
    borderRadius: 64,
    padding: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFB6C1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 56, color: '#fff' },
  userName: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    flexWrap: 'wrap'
  },
  userMeta: { marginTop: 4, fontSize: 14, color: '#6b7280' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardHeaderText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  aboutText: { color: '#374151', fontSize: 14, lineHeight: 20 },
  moreBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff0f5',
    borderWidth: 1,
    borderColor: '#ffd0df',
    alignItems: 'center',
    gap: 6,
  },
  moreText: { color: '#ff5f90', fontWeight: '700' },

  section: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#6b7280', marginBottom: 10 },

  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280' },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  navText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  navTextActive: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  iconContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});