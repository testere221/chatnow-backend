import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountBadge from '../components/CountBadge';
import OptimizedImage from '../components/OptimizedImage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SwipeableTabContainer } from '../components/SwipeableTabContainer';
import { ApiService } from '../config/api';
import { User as AppUser } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useProfile } from '../contexts/ProfileContext';
import { NavigationHelper } from '../utils/NavigationHelper';
import { webSocketService } from '../services/websocket';
import { ImageCacheService } from '../services/ImageCacheService';

/** Types coming from API */
type PaginatedUsers = {
  users: AppUser[];
  hasMore: boolean;
};

/** Helpers */
const getUid = (u: AppUser) => u.id;
const getDiamonds = (u?: Partial<AppUser>) => (typeof u?.diamonds === 'number' ? u!.diamonds! : 0);
const getAvatarEmoji = (u: AppUser) => (u.gender === 'male' ? '👨' : '👩');

/** Ultra-optimized ProfileCard component */
const ProfileCard = memo(
  ({
    user,
    onPress,
    onLongPress,
    isOnline,
    cardWidth,
    imageHeight,
  }: {
    user: AppUser;
    onPress: () => void;
    onLongPress?: () => void;
    isOnline?: boolean;
    cardWidth: number;
    imageHeight: number;
  }) => {
    const avatarUri =
      user.avatar_image && user.avatar_image.trim() !== ''
        ? user.avatar_image.startsWith('data:')
          ? user.avatar_image
          : `data:image/jpeg;base64,${user.avatar_image}`
        : null;

    return (
      <TouchableOpacity
        style={[styles.profileCard, { width: cardWidth }]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        <View style={[styles.profileImageContainer, { height: imageHeight }]}>
          {avatarUri ? (
            <View style={[styles.profileImage, { backgroundColor: user.bg_color || '#FFB6C1', height: imageHeight }]}>
              <OptimizedImage
                uri={avatarUri}
                style={[styles.profileImageSource, { height: imageHeight }]}
                resizeMode="cover"
                cacheKey={`profile_${user.id}`}
                preload={true}
              />
            </View>
          ) : (
            <LinearGradient
              colors={user.gender === 'male' ? ['#1e3a8a', '#3b82f6', '#60a5fa'] : ['#ff5571', '#ff6b95', '#ffb3d1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.profileImage,
                {
                  height: imageHeight,
                  shadowColor: user.gender === 'male' ? '#3B82F6' : '#FF6B95',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                },
              ]}
            >
              <Text style={{ fontSize: Math.max(42, imageHeight * 0.25), color: '#ffffff' }}>
                {user.avatar || getAvatarEmoji(user)}
              </Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)']}
            style={[styles.cardGradient, { height: Math.min(56, imageHeight * 0.3) }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
          />
          <View style={isOnline ? styles.onlineIndicator : styles.offlineIndicator} />
          <View style={styles.profileInfo}>
            <Text numberOfLines={1} style={styles.profileName}>
              {user.name}, {user.age}
            </Text>
            <Text numberOfLines={1} style={styles.profileLocation}>
              {user.location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.avatar_image === nextProps.user.avatar_image &&
      prevProps.user.name === nextProps.user.name &&
      prevProps.user.age === nextProps.user.age &&
      prevProps.user.location === nextProps.user.location &&
      prevProps.user.bg_color === nextProps.user.bg_color &&
      prevProps.isOnline === nextProps.isOnline &&
      prevProps.cardWidth === nextProps.cardWidth &&
      prevProps.imageHeight === nextProps.imageHeight
    );
  }
);

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentUser } = useProfile();
  const { getUserState, updateUserState, getChats, getTotalUnreadCount } = useChat();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreOnlineUsers, setHasMoreOnlineUsers] = useState(true);
  const [hasMoreOfflineUsers, setHasMoreOfflineUsers] = useState(true);
  const [onlinePage, setOnlinePage] = useState(1);
  const [offlinePage, setOfflinePage] = useState(1);
  const USERS_PER_PAGE = 40;
  const insets = useSafeAreaInsets();

  // Grid
  const horizontalPadding = 20 * 2;
  const gutter = 12;
  const columns = width >= 768 ? 3 : 2;
  const cardWidth = (width - horizontalPadding - gutter * (columns - 1)) / columns;
  const imageHeight = Math.round(cardWidth * 1.15);

  // Compute bottom padding to avoid gap on all devices
  const bottomSafe = useMemo(() => Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 8 : 4), [insets.bottom]);
  const NAV_MIN_HEIGHT = 70;
  const NAV_TOP_PADDING = 12;
  const bottomPadding = NAV_MIN_HEIGHT + NAV_TOP_PADDING + bottomSafe + 8; // small buffer

  // WebSocket listeners artık ChatContext'te yönetiliyor

  // Hydrate ChatContext user cache outside of render or setState updaters
  const hydrateGlobal = useCallback(
    (list: AppUser[]) => {
      list.forEach((user) => {
        const userId = user.id;
        if (userId) {
          updateUserState(userId, {
            isOnline: !!user.is_online,
            lastSeen: new Date(),
            name: user.name,
            surname: user.surname || '',
            avatar: user.avatar || '👤',
            bgColor: user.bg_color || '#FFB6C1',
            gender: user.gender || 'female',
            location: user.location || 'Bilinmiyor',
            about: user.about || 'Kullanıcı hakkında bilgi yok',
            hobbies: user.hobbies || [],
            diamonds: getDiamonds(user),
            avatarImage: user.avatar_image || '',
          });
        }
      });
    },
    [updateUserState]
  );

  const loadUsers = useCallback(async () => {
    const uid = currentUser?.id;
    if (!uid || uid === 'undefined' || uid === 'null') {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setUsers([]);
      setOnlinePage(1);
      setOfflinePage(1);
      setHasMoreOnlineUsers(true);
      setHasMoreOfflineUsers(true);

      const onlineResponse = (await ApiService.getUsersPaginated(1, USERS_PER_PAGE, 'online')) as PaginatedUsers;
      const onlineList = onlineResponse.users.filter((u) => u.id !== uid);
      setHasMoreOnlineUsers(onlineResponse.hasMore);

      const offlineResponse = (await ApiService.getUsersPaginated(1, USERS_PER_PAGE, 'offline')) as PaginatedUsers;
      const offlineList = offlineResponse.users.filter((u) => u.id !== uid);
      setHasMoreOfflineUsers(offlineResponse.hasMore);

      setOnlinePage(2);
      setOfflinePage(2);

      const mapById: Record<string, AppUser> = {};
      [...onlineList, ...offlineList].forEach((u) => {
        mapById[getUid(u)] = u;
      });
      const unique = Object.values(mapById);

      // hydrate first or after, both are outside render
      hydrateGlobal(unique);
      setUsers(unique);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [USERS_PER_PAGE, currentUser?.id, hydrateGlobal]);

  // WebSocket profil güncellemesi dinleyicisi
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleProfileUpdate = (data: { userId: string; updatedFields: any }) => {
      console.log('🔄 Profil güncellendi (Home):', data);
      
      // Profil resmi değiştiyse cache'i temizle
      if (data.updatedFields.avatar || data.updatedFields.avatar_image) {
        ImageCacheService.clearProfileImageCache(data.userId);
      }
      
      // Kullanıcı listesindeki ilgili kullanıcıyı güncelle
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === data.userId) {
            return {
              ...user,
              ...data.updatedFields
            };
          }
          return user;
        })
      );
    };

    // WebSocket listener'ı ekle
    webSocketService.on('profileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      webSocketService.off('profileUpdated', handleProfileUpdate);
    };
  }, [currentUser?.id]);

  const loadMoreUsers = useCallback(async () => {
    if (loadingMore || (!hasMoreOnlineUsers && !hasMoreOfflineUsers)) return;

    try {
      setLoadingMore(true);
      let fetched: AppUser[] = [];

      if (hasMoreOnlineUsers) {
        const r = (await ApiService.getUsersPaginated(onlinePage, USERS_PER_PAGE, 'online')) as PaginatedUsers;
        fetched = r.users.filter((u: AppUser) => u.id !== currentUser?.id);
        setHasMoreOnlineUsers(r.hasMore);
        setOnlinePage((p) => p + 1);
      } else if (hasMoreOfflineUsers) {
        const r = (await ApiService.getUsersPaginated(offlinePage, USERS_PER_PAGE, 'offline')) as PaginatedUsers;
        fetched = r.users.filter((u: AppUser) => u.id !== currentUser?.id);
        setHasMoreOfflineUsers(r.hasMore);
        setOfflinePage((p) => p + 1);
      }

      // Merge without using setState updater to avoid triggering other setStates during render
      const existingIds = new Set(users.map((u) => u.id));
      const newOnly = fetched.filter((u) => !existingIds.has(u.id));
      const merged = [...users, ...newOnly];

      setUsers(merged);
      hydrateGlobal(newOnly);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMoreOnlineUsers,
    hasMoreOfflineUsers,
    onlinePage,
    offlinePage,
    USERS_PER_PAGE,
    currentUser?.id,
    users,
    hydrateGlobal,
  ]);

  useEffect(() => {
    if (currentUser?.id && users.length === 0) {
      loadUsers();
    } else if (!currentUser?.id) {
      setUsers([]);
      setLoading(false);
    }
  }, [currentUser?.id, loadUsers, users.length]);

  const handleSwipeLeft = useCallback(() => {
    NavigationHelper.goToChats();
  }, []);

  const handleSwipeRight = useCallback(() => {
    NavigationHelper.goToProfile();
  }, []);

  const totalUnreadCount = getTotalUnreadCount();

  const renderItem = useCallback(
    ({ item, index }: { item: AppUser; index: number }) => {
      const uid = getUid(item);
      const state = getUserState(uid);
      return (
        <ProfileCard
          key={`user-${uid}-${index}`}
          user={item}
          onPress={() => NavigationHelper.goToUserProfile(uid)}
          onLongPress={() => NavigationHelper.goToChat(uid)}
          isOnline={state?.isOnline || false}
          cardWidth={cardWidth}
          imageHeight={imageHeight}
        />
      );
    },
    [cardWidth, imageHeight, getUserState]
  );

  const keyExtractor = useCallback((item: AppUser, index: number) => `${getUid(item)}-${index}`, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      const row = Math.floor(index / columns);
      const rowHeight = imageHeight + 20;
      return { length: rowHeight, offset: row * rowHeight, index };
    },
    [columns, imageHeight]
  );

  return (
    <ProtectedRoute>
      <SwipeableTabContainer onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} enabled={true}>
        <View style={styles.safeArea}>
          {/* Header */}
          <LinearGradient
            colors={currentUser?.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff5571', '#ff6b95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 16, paddingBottom: 16 }]}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>Keşfet</Text>
              <TouchableOpacity style={styles.tokenChip} onPress={() => NavigationHelper.goToTokenPurchase()}>
                <View style={styles.tokenIconCircle}>
                  <Text style={styles.tokenIconDollar}>$</Text>
                </View>
                <Text style={styles.tokenChipText}>{getDiamonds(currentUser)} Jeton</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Main Content */}
          <View style={styles.content}>
            <FlatList
              key={`flatlist-${columns}`}
              data={users}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={columns}
              columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
              contentContainerStyle={{ paddingTop: 20, paddingBottom: bottomPadding }}
              onEndReachedThreshold={0.5}
              onEndReached={loadMoreUsers}
              removeClippedSubviews
              windowSize={11}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={50}
              getItemLayout={getItemLayout}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyAnimation}>
                      <Text style={styles.emptyEmoji}>😢</Text>
                      <Text style={styles.emptyEmoji2}>💔</Text>
                      <Text style={styles.emptyEmoji3}>😔</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Keşfedeceğin İnsan Kalmadı</Text>
                    <Text style={styles.emptySubtitle}>Herkesi engellemiş olabilirsin :(</Text>
                    <Text style={styles.emptyDescription}>
                      Yeni insanlarla tanışmak için engellenen kullanıcıları kontrol et
                    </Text>
                    <TouchableOpacity style={styles.checkBlockedButton} onPress={() => NavigationHelper.goToBlockedUsers()}>
                      <Text style={styles.checkBlockedButtonText}>Engellenen Kullanıcıları Kontrol Et</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
                  </View>
                )
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMore}>
                    <Text style={styles.loadingText}>Daha fazla kullanıcı yükleniyor...</Text>
                  </View>
                ) : null
              }
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              persistentScrollbar={false}
            />
          </View>

          {/* Bottom Navigation */}
          <View
            style={[
              styles.bottomNav,
              {
                paddingBottom: bottomSafe,
                paddingTop: NAV_TOP_PADDING,
              },
            ]}
          >
            <TouchableOpacity style={styles.navItem} onPress={() => NavigationHelper.goHome()} activeOpacity={0.7}>
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
                <CountBadge count={totalUnreadCount} size="small" />
              </View>
              <Text style={styles.tabText}>Mesajlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => NavigationHelper.goToProfile()}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color="#9ca3af" />
              <Text style={styles.tabText}>Profil</Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerGradient: {
    paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tokenIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tokenIconDollar: {
    color: '#ff6b95',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenChipText: { color: '#fff', fontWeight: '700' },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },

  profileCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  profileImageContainer: {
    position: 'relative',
    width: '100%',
  },
  profileImage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00c853',
    borderWidth: 2,
    borderColor: '#0b1215',
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff5252',
    borderWidth: 2,
    borderColor: '#0b1215',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    minHeight: 70,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  iconContainer: {
    position: 'relative',
  },
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
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyAnimation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyEmoji: { fontSize: 42, opacity: 0.8, marginHorizontal: 4 },
  emptyEmoji2: { fontSize: 46, opacity: 0.9, marginHorizontal: 4 },
  emptyEmoji3: { fontSize: 40, opacity: 0.7, marginHorizontal: 4 },

  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  checkBlockedButton: {
    backgroundColor: '#1976f3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#1976f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkBlockedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  profileImageSource: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    resizeMode: 'cover',
  },
});