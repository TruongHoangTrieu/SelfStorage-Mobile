import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest, setAuthToken } from '../../api';

// Design tokens matching current app theme
const T = {
  bg: '#f8f9ff',
  surface: '#ffffff',
  surfaceSubtle: '#eff4ff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  primary: '#0b1c30',
  brand: '#fd651e',
  brandDark: '#a73a00',
  brandLight: '#ffdbce',
  border: '#e2e8f0',
  outline: '#c6c6cd',
  green: '#16a34a',
  greenLight: '#dcfce7',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  amber: '#d97706',
  amberLight: '#fef3c7',
  error: '#dc2626',
};

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

export default function LoginScreen({
  onLoginSuccess,
  onClose,
  initialMode = 'login',
}: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          // ignore
        }
      }

      onLoginSuccess(userData);
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

      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
      onLoginSuccess(userData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký không thành công. Email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  // Quick login helper
  const handleQuickLogin = (quickRole: 'customer' | 'staff') => {
    if (quickRole === 'customer') {
      setEmail('customer@selfstorage.vn');
      setPassword('123456');
      handleLogin('customer@selfstorage.vn', '123456');
    } else {
      setEmail('staff@selfstorage.vn');
      setPassword('123456');
      handleLogin('staff@selfstorage.vn', '123456');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Bar */}
        <View style={s.topNav}>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={24} color={T.onSurface} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={s.topBrand}>
            <View style={s.logoIconWrap}>
              <MaterialCommunityIcons name="cube-outline" size={20} color="#ffffff" />
            </View>
            <Text style={s.brandTitle}>Kho Thông Minh</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Banner */}
        <View style={s.heroSection}>
          <Text style={s.heroTitle}>
            {mode === 'login' ? 'Chào Mừng Trở Lại!' : 'Tạo Tài Khoản Mới'}
          </Text>
          <Text style={s.heroSubtitle}>
            {mode === 'login'
              ? 'Đăng nhập để quản lý ô kho tự quản, đặt buồng lưu trữ và mở khoá thông minh 24/7.'
              : 'Đăng ký tài khoản khách hàng để bắt đầu trải nghiệm hệ thống kho tự quản thông minh.'}
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
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={() => (mode === 'login' ? handleLogin() : handleRegister())}
            disabled={loading}
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
        </View>

        {/* Quick Demo Login Section */}
        {mode === 'login' && (
          <View style={s.quickSection}>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>HOẶC ĐĂNG NHẬP NHANH BẰNG TÀI KHOẢN MẪU</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.quickGrid}>
              {/* Customer Account */}
              <TouchableOpacity
                style={s.quickCard}
                onPress={() => handleQuickLogin('customer')}
                activeOpacity={0.8}
              >
                <View style={[s.quickIconBox, { backgroundColor: T.brandLight }]}>
                  <MaterialIcons name="person" size={22} color={T.brandDark} />
                </View>
                <View style={s.quickInfo}>
                  <View style={s.quickBadgeRow}>
                    <Text style={s.quickTitle}>Khách Hàng</Text>
                    <View style={s.roleBadgeCustomer}>
                      <Text style={s.roleBadgeCustomerText}>Khách thuê</Text>
                    </View>
                  </View>
                  <Text style={s.quickEmail}>customer@selfstorage.vn</Text>
                  <Text style={s.quickPass}>MK: 123456</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={T.outline} />
              </TouchableOpacity>

              {/* Staff Account */}
              <TouchableOpacity
                style={s.quickCard}
                onPress={() => handleQuickLogin('staff')}
                activeOpacity={0.8}
              >
                <View style={[s.quickIconBox, { backgroundColor: T.blueLight }]}>
                  <MaterialIcons name="badge" size={22} color={T.blue} />
                </View>
                <View style={s.quickInfo}>
                  <View style={s.quickBadgeRow}>
                    <Text style={s.quickTitle}>Nhân Viên Chi Nhánh</Text>
                    <View style={s.roleBadgeStaff}>
                      <Text style={s.roleBadgeStaffText}>Vận hành</Text>
                    </View>
                  </View>
                  <Text style={s.quickEmail}>staff@selfstorage.vn</Text>
                  <Text style={s.quickPass}>MK: 123456</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={T.outline} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Security Note */}
        <View style={s.securityFooter}>
          <MaterialIcons name="verified-user" size={16} color={T.green} />
          <Text style={s.securityText}>
            Bảo mật SSL 256-bit • Mã khóa PIN & Hợp đồng số bảo vệ 24/7
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 28,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  topBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: T.onSurfaceVariant,
    lineHeight: 20,
  },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
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
    marginBottom: 24,
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
  quickSection: {
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.outline,
    letterSpacing: 0.5,
  },
  quickGrid: {
    gap: 12,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickInfo: {
    flex: 1,
  },
  quickBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.onSurface,
  },
  roleBadgeCustomer: {
    backgroundColor: T.brandLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeCustomerText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.brandDark,
  },
  roleBadgeStaff: {
    backgroundColor: T.blueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeStaffText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.blue,
  },
  quickEmail: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    marginBottom: 2,
  },
  quickPass: {
    fontSize: 11,
    color: T.outline,
    fontWeight: '600',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
});
