import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { apiRequest, setAuthToken } from '../../api';
import { saveSession } from '../../utils/authStorage';

WebBrowser.maybeCompleteAuthSession();

// Google Client ID from backend/web env or .env
const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '58444688772-nvhb0h0it4uk36jpivrlfhhlof175go1.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Design tokens matching Stitch design system
const T = {
  bg: '#f7f9fd',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  primary: '#131b2e',
  brand: '#2563eb',
  brandDark: '#1d4ed8',
  brandLight: '#dbeafe',
  border: '#e2e8f0',
  outline: '#737686',
  outlineVariant: '#c3c6d7',
  green: '#16a34a',
  greenLight: '#dcfce7',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  amber: '#d97706',
  amberLight: '#fef3c7',
  error: '#dc2626',
};

interface LoginScreenProps {
  onLoginSuccess: (user: any, token?: string) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
  toastMessage?: string | null;
}

export default function LoginScreen({
  onLoginSuccess,
  onClose,
  initialMode = 'login',
  toastMessage,
}: LoginScreenProps) {
  const [currentToast, setCurrentToast] = useState<string | null>(toastMessage || null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (toastMessage) {
      setCurrentToast(toastMessage);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: -16,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentToast(null);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toastMessage]);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Expo Google Auth Request Hook
  // Sử dụng Web Client ID để tương thích hoàn toàn với trình duyệt AuthSession / Expo Go
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  // Handle backend Google authentication
  const handleBackendGoogleLogin = async (idToken?: string, code?: string) => {
    const payload: any = {};
    if (idToken) payload.credential = idToken;
    if (code) payload.code = code;

    const res = await apiRequest<{
      message?: string;
      accessToken?: string;
      token?: string;
      user?: any;
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const token = res?.accessToken || res?.token;
    if (token) {
      setAuthToken(token);
    }

    const userData = res?.user || {
      email: 'customer.google@selfstorage.vn',
      fullName: 'Khách Hàng Google',
      role: 'STORAGE_CUSTOMER',
    };

    await saveSession(token, userData);

    Alert.alert('Thành công', `Đăng nhập Google thành công! Chào mừng ${userData.fullName || userData.email}`);
    onLoginSuccess(userData, token);
  };

  // Watch Google Auth response changes
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, code } = (response.params as any) || {};
      const token = id_token || (response as any).authentication?.idToken;
      if (token) {
        setGoogleLoading(true);
        handleBackendGoogleLogin(token)
          .catch((err: any) => setErrorMsg(err.message || 'Xác thực Google thất bại'))
          .finally(() => setGoogleLoading(false));
      } else if (code) {
        setGoogleLoading(true);
        handleBackendGoogleLogin(undefined, code)
          .catch((err: any) => setErrorMsg(err.message || 'Xác thực Google thất bại'))
          .finally(() => setGoogleLoading(false));
      }
    } else if (response?.type === 'error') {
      setErrorMsg('Đăng nhập Google thất bại: ' + (response.error?.message || 'Lỗi không xác định'));
    }
  }, [response]);

  // Handle Login submission
  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const targetEmail = (overrideEmail || email).trim();
    const targetPassword = overridePass || password;

    if (!targetEmail || !targetPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await apiRequest<{
        message?: string;
        accessToken?: string;
        token?: string;
        user?: any;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const token = res?.accessToken || res?.token;
      if (token) {
        setAuthToken(token);
      }

      const userData = res?.user || {
        email: targetEmail,
        fullName: targetEmail.includes('customer') ? 'Nguyễn Văn Khách Hàng' : 'Nhân Viên Quản Lý',
        role: targetEmail.includes('staff') ? 'FACILITY_STAFF' : 'STORAGE_CUSTOMER',
      };

      await saveSession(token, userData);

      onLoginSuccess(userData, token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await apiRequest<{
        message?: string;
        accessToken?: string;
        token?: string;
        user?: any;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password,
        }),
      });

      const token = res?.accessToken || res?.token;
      if (token) {
        setAuthToken(token);
      }

      const userData = res?.user || {
        email: email.trim(),
        fullName: fullName.trim(),
        role: 'STORAGE_CUSTOMER',
      };

      await saveSession(token, userData);

      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
      onLoginSuccess(userData, token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký không thành công. Email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login helper
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setErrorMsg('');

      const res = await promptAsync();
      if (res?.type === 'success') {
        const token = res.params?.id_token || (res as any).authentication?.idToken;
        if (token) {
          await handleBackendGoogleLogin(token);
        } else if (res.params?.code) {
          await handleBackendGoogleLogin(undefined, res.params.code);
        }
      } else if (res?.type === 'error') {
        throw new Error(res.error?.message || 'Google từ chối yêu cầu xác thực');
      }
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      const msg = err.message || '';
      setErrorMsg(msg || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      {/* Absolute close button if present */}
      {onClose && (
        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
          <MaterialIcons name="close" size={20} color={T.onSurface} />
        </TouchableOpacity>
      )}

      {/* Floating 3s Toast trên đầu màn hình đăng nhập */}
      {currentToast && (
        <Animated.View
          style={[
            s.topToastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              right: onClose ? 58 : 16,
            },
          ]}
          pointerEvents="none"
        >
          <View style={s.topToastContent}>
            <View style={s.topToastIconWrap}>
              <MaterialIcons name="notifications-active" size={16} color="#ffffff" />
            </View>
            <Text style={s.topToastText} numberOfLines={1} ellipsizeMode="tail">{typeof currentToast === 'string' ? currentToast : ''}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.centerWrapper}>
          {/* Prominent Logo */}
          <View style={s.topBrand}>
            <Image
              source={require('../../../assets/logo.png')}
              style={s.brandLogoImg}
              resizeMode="contain"
            />
          </View>

          {/* Hero Banner */}
          <View style={s.heroSection}>
            <Text style={s.heroTitle}>
              {mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
            </Text>
            <Text style={s.heroSubtitle}>
              {mode === 'login'
                ? 'Đăng nhập để quản lý buồng kho tự quản, mã PIN thông minh và ra vào 24/7.'
                : 'Trải nghiệm hệ thống lưu trữ tự quản hiện đại, bảo mật và tiện lợi.'}
            </Text>
          </View>

          {/* Mode Switch Tabs */}
          <View style={s.tabWrap}>
            <TouchableOpacity
              style={[s.tabBtn, mode === 'login' && s.tabBtnActive]}
              onPress={() => {
                setMode('login');
                setErrorMsg('');
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="login"
                size={18}
                color={mode === 'login' ? T.brandDark : T.onSurfaceVariant}
              />
              <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Đăng Nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, mode === 'register' && s.tabBtnActive]}
              onPress={() => {
                setMode('register');
                setErrorMsg('');
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="person-add"
                size={18}
                color={mode === 'register' ? T.brandDark : T.onSurfaceVariant}
              />
              <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Đăng Ký</Text>
            </TouchableOpacity>
          </View>

          {/* Error Notification */}
          {!!errorMsg && (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={20} color={T.error} />
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={s.formCard}>
            {mode === 'register' && (
              <>
                <Text style={s.inputLabel}>Họ và tên *</Text>
                <View style={s.inputWrap}>
                  <MaterialIcons name="person" size={20} color={T.outline} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    placeholderTextColor={T.outline}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>

                <Text style={s.inputLabel}>Số điện thoại</Text>
                <View style={s.inputWrap}>
                  <MaterialIcons name="phone" size={20} color={T.outline} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="Ví dụ: 0908 123 456"
                    placeholderTextColor={T.outline}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <Text style={s.inputLabel}>Email đăng nhập *</Text>
            <View style={s.inputWrap}>
              <MaterialIcons name="mail-outline" size={20} color={T.outline} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="customer@selfstorage.vn"
                placeholderTextColor={T.outline}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={s.inputLabel}>Mật khẩu *</Text>
            <View style={s.inputWrap}>
              <MaterialIcons name="lock-outline" size={20} color={T.outline} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Nhập mật khẩu..."
                placeholderTextColor={T.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={s.eyeBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={T.outline}
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[s.submitBtn, (loading || googleLoading) && s.submitBtnDisabled]}
              onPress={() => (mode === 'login' ? handleLogin() : handleRegister())}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={s.submitText}>
                    {mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Khách Hàng'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Google Divider */}
            <View style={s.dividerWithText}>
              <View style={s.line} />
              <Text style={s.dividerLabel}>HOẶC TIẾP TỤC VỚI</Text>
              <View style={s.line} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[s.googleBtn, googleLoading && s.googleBtnDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={T.brand} size="small" />
              ) : (
                <>
                  <View style={s.googleIconWrap}>
                    <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
                  </View>
                  <Text style={s.googleBtnText}>
                    {mode === 'login'
                      ? 'Đăng nhập với Google'
                      : 'Đăng ký nhanh với Google'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 14,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  topToastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 14,
    left: 16,
    right: 60,
    zIndex: 9999,
  },
  topToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 12,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  topToastIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  topToastText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  topBrand: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandLogoImg: {
    height: 36,
    width: 125,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    lineHeight: 16,
    textAlign: 'center',
  },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  tabTextActive: {
    color: T.brandDark,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: T.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: T.onSurface,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.brand,
    borderRadius: 14,
    height: 50,
    marginTop: 20,
    gap: 8,
    shadowColor: T.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  dividerWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.outline,
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  googleBtnDisabled: {
    opacity: 0.65,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.onSurface,
  },
});
