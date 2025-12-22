// purchase.tsx — responsive UI for phones and tablets; palette and flow preserved
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../config/api';
import { useProfile } from '../../contexts/ProfileContext';
import { NavigationHelper } from '../../utils/NavigationHelper';

type DiamondPackage = { id: string; amount: number; priceText: string; product_id?: string };
type PaymentMethod = { id: string; name: string; icon: keyof typeof Ionicons.glyphMap };

// Fallback packages (eğer backend çalışmazsa)
const FALLBACK_PACKAGES: DiamondPackage[] = [
  { id: '1', amount: 100, priceText: '10 TL' },
  { id: '2', amount: 500, priceText: '45 TL' },
  { id: '3', amount: 1000, priceText: '80 TL' },
  { id: '4', amount: 2500, priceText: '180 TL' },
];

const METHODS: PaymentMethod[] = [
  { id: '1', name: 'Kredi Kartı', icon: 'card' },
  { id: '2', name: 'Mobil Ödeme', icon: 'phone-portrait' },
];

export default function Purchase() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const cols = isTablet ? 2 : 1;
  const gap = 12;
  const pad = 20;
  const cardWidth = useMemo(() => (width - pad * 2 - gap * (cols - 1)) / cols, [width, cols]);

  const scale = (n: number) => {
    const f = Math.max(0.92, Math.min(1.12, width / 375));
    return Math.round(n * f);
  };

  const { currentUser, addDiamonds } = useProfile();
  const primary = currentUser?.gender === 'male' ? '#3B82F6' : '#FF6B95';
  const gradient = useMemo<[string, string]>(() => (currentUser?.gender === 'male' ? ['#1e3a8a', '#3b82f6'] : ['#ff5571', '#ff6b95']), [currentUser?.gender]);

  const [packages, setPackages] = useState<DiamondPackage[]>(FALLBACK_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>('2');
  const [selectedMethod, setSelectedMethod] = useState<string>('1');

  // Initialize BillingService and fetch packages
  useEffect(() => {
    const initializeBilling = async () => {
      try {
        // Fetch packages from backend
        const response = await ApiService.request<any[]>('/api/token-packages');
        
        if (response && response.length > 0) {
          // Backend'den gelen paketleri formatla
          const formattedPackages: DiamondPackage[] = response.map((pkg, index) => ({
            id: String(index + 1),
            amount: pkg.token_amount,
            priceText: `${pkg.price_try.toFixed(2)} TL`,
            product_id: pkg.product_id,
          }));
          
          setPackages(formattedPackages);
          // İlk paketi seçili yap
          if (formattedPackages.length > 0) {
            setSelectedPkg(formattedPackages[0].id);
          }

          // Initialize BillingService with product IDs (only in production builds, not Expo Go)
          const productIds = formattedPackages
            .map(pkg => pkg.product_id)
            .filter((id): id is string => !!id);
          
          if (productIds.length > 0 && Platform.OS === 'android') {
            try {
              // Lazy import BillingService to avoid crashes in Expo Go
              const { BillingService } = await import('../../services/BillingService');
              await BillingService.initialize(productIds);
              console.log('[Purchase] BillingService initialized successfully');
            } catch (billingError: any) {
              console.warn('[Purchase] BillingService not available (Expo Go or build issue):', billingError?.message || billingError);
              // Billing initialization hatası kritik değil, devam edebiliriz
            }
          }
        } else {
          // Fallback paketleri kullan
          setPackages(FALLBACK_PACKAGES);
        }
      } catch (error) {
        console.error('Paketler yüklenemedi, fallback kullanılıyor:', error);
        // Hata durumunda fallback paketleri kullan
        setPackages(FALLBACK_PACKAGES);
      } finally {
        setLoading(false);
      }
    };

    initializeBilling();
  }, []);

  const onBuy = async () => {
    const p = packages.find(x => x.id === selectedPkg);
    if (!p) return;

    // Eğer product_id yoksa veya Android değilse, test modunda direkt jeton ekle
    if (!p.product_id || Platform.OS !== 'android') {
      console.warn('[Purchase] No product_id or not Android, adding diamonds directly (test mode)');
      addDiamonds(p.amount);
      NavigationHelper.goToProfile();
      return;
    }

    // Google Play Billing ile satın alma
    if (purchasing) return; // Zaten satın alma işlemi devam ediyor

    setPurchasing(true);
    try {
      // Lazy import BillingService to avoid crashes in Expo Go
      const { BillingService } = await import('../../services/BillingService');
      
      console.log('[Purchase] Starting purchase for product:', p.product_id);
      const result = await BillingService.purchase(p.product_id);
      
      if (result.success) {
        // Backend'den jetonlar zaten yüklendi, sadece UI'ı güncelle
        const creditedAmount = result.diamondsCredited || p.amount;
        addDiamonds(creditedAmount);
        
        Alert.alert(
          'Başarılı!',
          `${creditedAmount} jeton hesabınıza yüklendi.`,
          [{ text: 'Tamam', onPress: () => NavigationHelper.goToProfile() }]
        );
      } else {
        Alert.alert(
          'Satın Alma Başarısız',
          result.message || 'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error: any) {
      console.error('[Purchase] Purchase error:', error);
      
      // Eğer BillingService yüklenemezse (Expo Go), test modunda devam et
      if (error?.message?.includes('Cannot find module') || error?.code === 'MODULE_NOT_FOUND') {
        console.warn('[Purchase] BillingService not available, using test mode');
        addDiamonds(p.amount);
        Alert.alert(
          'Test Modu',
          `${p.amount} jeton test modunda eklendi. Production build'de gerçek satın alma çalışacak.`,
          [{ text: 'Tamam', onPress: () => NavigationHelper.goToProfile() }]
        );
      } else {
        Alert.alert(
          'Hata',
          error?.message || 'Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => NavigationHelper.goToProfile()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.hTitle, { fontSize: scale(20) }]}>Jeton Satın Al</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { fontSize: scale(18) }]}>Jeton Paketleri</Text>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={primary} />
            <Text style={{ marginTop: 12, color: '#6B7280', fontSize: scale(14) }}>Paketler yükleniyor...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {packages.map((p, i) => {
            const selected = selectedPkg === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.9}
                onPress={() => setSelectedPkg(p.id)}
                style={[
                  styles.card,
                  { width: cardWidth, marginRight: (i % cols) < (cols - 1) ? gap : 0 },
                  selected && { borderColor: primary, borderWidth: 2, shadowColor: primary, shadowOpacity: 0.2 },
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: currentUser?.gender === 'male' ? '#eef2ff' : '#fdf2f8' }]}>
                  <Ionicons name="diamond" size={22} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { fontSize: scale(16) }]}>{p.amount} Jeton</Text>
                  <Text style={[styles.cardSub, { fontSize: scale(14) }]}>{p.priceText}</Text>
                </View>
                <View style={styles.radio}>
                  <View style={[styles.dot, selected && { backgroundColor: primary, borderColor: primary }]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { fontSize: scale(18), marginTop: 16 }]}>Ödeme Yöntemi</Text>
        {METHODS.map(m => {
          const selected = selectedMethod === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.9}
              onPress={() => setSelectedMethod(m.id)}
              style={[styles.payCard, selected && { borderColor: primary, borderWidth: 2, shadowColor: primary, shadowOpacity: 0.2 }]}
            >
              <View style={[styles.cardIcon, { backgroundColor: currentUser?.gender === 'male' ? '#eef2ff' : '#fdf2f8' }]}>
                <Ionicons name={m.icon} size={22} color={primary} />
              </View>
              <Text style={[styles.payName, { fontSize: scale(16) }]}>{m.name}</Text>
              <View style={styles.radio}>
                <View style={[styles.dot, selected && { backgroundColor: primary, borderColor: primary }]}>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Buy button */}
      <View style={styles.buyBar}>
        <TouchableOpacity 
          onPress={onBuy} 
          style={[styles.buyBtn, purchasing && styles.buyBtnDisabled]} 
          activeOpacity={0.92}
          disabled={purchasing || loading}
        >
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buyGrad}>
            {purchasing ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buyText}>İşleniyor...</Text>
              </>
            ) : (
              <>
                <Ionicons name="diamond" size={18} color="#fff" />
                <Text style={styles.buyText}>Satın Al</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hTitle: { color: '#fff', fontWeight: '700' },
  sectionTitle: { color: '#1F2937', fontWeight: '700', marginVertical: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: { color: '#1F2937', fontWeight: '700' },
  cardSub: { color: '#6B7280', fontWeight: '600' },
  radio: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  payName: { flex: 1, color: '#1F2937', fontWeight: '600' },
  buyBar: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  buyBtn: { borderRadius: 14, overflow: 'hidden' },
  buyBtnDisabled: { opacity: 0.6 },
  buyGrad: { height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buyText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },
});