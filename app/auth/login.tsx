
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NavigationHelper } from '../../utils/NavigationHelper';
import { router } from 'expo-router';

function CNBubble() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoSquare}>
        <Text style={styles.logoText}>CN</Text>
      </View>
    </View>
  );
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const monkeyScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (password.length > 0) {
      Animated.sequence([
        Animated.spring(monkeyScale, { toValue: 1.35, friction: 3, tension: 140, useNativeDriver: true }),
        Animated.spring(monkeyScale, { toValue: 1.1, friction: 4, tension: 110, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.spring(monkeyScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
    }
  }, [password.length, monkeyScale]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async () => {
    const e = email.trim();
    const p = password;
    const err: typeof errors = {};
    if (!e) err.email = 'E-posta gerekli';
    else if (!validateEmail(e)) err.email = 'Geçerli e-posta girin';
    if (!p) err.password = 'Şifre gerekli';
    else if (p.length < 6) err.password = 'En az 6 karakter';
    else if (p.length > 20) err.password = 'En fazla 20 karakter';

    if (err.email || err.password) { setErrors(err); return; }
    setErrors({});

    setIsLoading(true);
    try {
      const success = await login({ email: e, password: p });
      if (success) NavigationHelper.goHome();
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const code = error?.code || '';
      
      // API'den gelen "Geçersiz kimlik bilgileri" hatası
      if (errorMessage.includes('Geçersiz kimlik bilgileri') || 
          code.includes('invalid-credential') || 
          code.includes('wrong-password') || 
          code.includes('user-not-found')) {
        
        // E-posta formatı doğruysa sadece şifre hatalı olabilir
        if (validateEmail(e)) {
          setErrors({ password: 'Şifre hatalı' });
        } else {
          setErrors({ email: 'E-posta hatalı' });
        }
      } else if (code.includes('too-many-requests')) {
        setErrors({ general: 'Çok fazla deneme. Bir süre bekleyin' });
      } else if (code.includes('network-request-failed')) {
        setErrors({ general: 'Ağ hatası. Bağlantınızı kontrol edin' });
      } else {
        setErrors({ general: 'Giriş sırasında bir hata oluştu' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroller, { 
            paddingTop: insets.top + 12, 
            paddingBottom: insets.bottom + 20,
            flexGrow: 1
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#EC4899', '#F472B6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerGrad}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Tekrar hoş geldin</Text>
              <View style={styles.headerChip}><Text style={styles.headerChipTxt}>Güvenli giriş</Text></View>
            </View>
          </LinearGradient>

          <View style={[styles.container, { flex: 1, justifyContent: 'center' }]}>
            <CNBubble />

            <View style={styles.card}>
              <Text style={styles.label}>E-posta</Text>
              <View style={[styles.fieldWrap, errors.email && styles.fieldError]}>
                <Text style={styles.prefix}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ornek@mail.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t)=>{ setEmail(t); if (errors.email) setErrors(p=>({...p, email: undefined})) }}
                />
              </View>
              {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}

              <Text style={[styles.label, { marginTop: 12 }]}>Şifre</Text>
              <View style={[styles.fieldWrap, errors.password && styles.fieldError]}>
                <Text style={styles.prefix}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t)=>{ setPassword(t); if (errors.password) setErrors(p=>({...p, password: undefined})) }}
                  maxLength={20}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={()=>setShowPassword(s=>!s)}>
                  <Animated.View style={{ transform:[{scale: monkeyScale}] }}>
                    <Text style={styles.eyeTxt}>{password.length===0 ? '🐵' : (showPassword ? '🐵' : '🙈')}</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
              {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}

              {!!errors.general && (
                <View style={styles.generalError}>
                  <Text style={styles.generalErrorTxt}>{errors.general}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryBtnTxt}>{isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.linkRow}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={styles.link}>Şifremi unuttum</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerTxt}>Hesabınız yok mu?</Text>
              <TouchableOpacity onPress={() => NavigationHelper.goToRegister()}>
                <Text style={styles.footerLink}> Kaydol</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroller: { alignItems: 'center', paddingHorizontal: 20 },

  headerGrad: { 
    width: '100%', 
    maxWidth: 400, 
    borderRadius: 16, 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    marginBottom: 20
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '900',
    flex: 1
  },
  headerChip: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 999 
  },
  headerChipTxt: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '700' 
  },

  container: { 
    width: '100%', 
    maxWidth: 400,
    paddingHorizontal: 0
  },

  logoWrap: { 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 20 
  },
  logoSquare: {
    width: 70, 
    height: 70, 
    backgroundColor: '#E93E7F', 
    borderRadius: 16,
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#E93E7F', 
    shadowOpacity: 0.25, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 6 },
    elevation: 8, 
    transform: [{ rotate: '-10deg' }],
  },
  logoText: { 
    fontSize: 30, 
    fontWeight: '900', 
    color: '#fff', 
    letterSpacing: 1.0 
  },

  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginTop: 0, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3 
  },

  label: { 
    color: '#111827', 
    fontWeight: '800', 
    marginBottom: 8,
    fontSize: 14
  },
  fieldWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    backgroundColor: '#FCE7F3',
    minHeight: 50
  },
  fieldError: { borderColor: '#EF4444' },
  prefix: { fontSize: 16, color: '#6B7280', marginRight: 10 },
  input: { 
    flex: 1, 
    color: '#111827', 
    fontSize: 16, 
    paddingVertical: 0,
    minHeight: 20
  },

  eyeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  eyeTxt: { fontSize: 18 },

  primaryBtn: { 
    backgroundColor: '#EC4899', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    marginTop: 16,
    minHeight: 50
  },
  primaryBtnTxt: { 
    color: '#fff', 
    fontWeight: '800',
    fontSize: 16
  },
  btnDisabled: { backgroundColor: '#9CA3AF' },

  linkRow: { 
    alignItems: 'center', 
    marginTop: 16 
  },
  link: { 
    color: '#EC4899', 
    fontWeight: '700',
    fontSize: 14
  },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 20,
    paddingHorizontal: 20
  },
  footerTxt: { 
    color: '#6B7280', 
    fontSize: 14 
  },
  footerLink: { 
    fontSize: 14, 
    fontWeight: '800', 
    marginLeft: 6, 
    color: '#EC4899' 
  },

  error: { 
    color: '#EF4444', 
    fontSize: 12, 
    marginTop: 6,
    marginLeft: 4
  },
  generalError: { 
    backgroundColor: '#FEF2F2', 
    borderColor: '#FECACA', 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    marginTop: 12 
  },
  generalErrorTxt: { 
    color: '#DC2626', 
    fontSize: 14, 
    textAlign: 'center', 
    fontWeight: '500' 
  },
});
