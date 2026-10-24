import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest, setAuthToken } from '../../api';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';

const T = {
  bg: '#f7f9fd',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  primary: '#1d4ed8',
  brand: '#2563eb',
  brandLight: '#dbeafe',
  brandDark: '#1e40af',
  border: '#e2e8f0',
  outline: '#737686',
  outlineVariant: '#c3c6d7',
  success: '#16a34a',
  successLight: '#dcfce7',
  error: '#dc2626',
  errorLight: '#fee2e2',
};

interface CustomerAccountScreenProps {
  currentUser: any;
  onUpdateUser?: (updated: any) => void;
  onLogout?: () => void;
  onNavigateBottomTab?: (tab: CustomerTabType) => void;
  onOpenSidebar?: () => void;
}

export default function CustomerAccountScreen({
  currentUser,
  onUpdateUser,
  onLogout,
  onNavigateBottomTab,
  onOpenSidebar,
}: CustomerAccountScreenProps) {
  // Profile edit states
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email] = useState(currentUser?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Update profile
  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).' });
      return;
    }

    try {
      setIsUpdatingProfile(true);
      setProfileMsg(null);

      const res = await apiRequest<any>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const updatedUser = {
        ...currentUser,
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(res?.user || res || {}),
      };

      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch {
          // ignore
        }
      }

      onUpdateUser?.(updatedUser);
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      Alert.alert('Thành công', 'Thông tin tài khoản đã được lưu lại.');
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.message || 'Cập nhật thông tin thất bại. Vui lòng kiểm tra lại.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };



  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường mật khẩu.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp với mật khẩu mới.' });
      return;
    }

    try {
      setIsChangingPass(true);
      setPassMsg(null);

      await apiRequest<any>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      Alert.alert('Thành công', 'Mật khẩu đăng nhập của bạn đã được thay đổi.');
    } catch (err: any) {
      setPassMsg({
        type: 'error',
        text: err?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Confirm logout
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          setAuthToken(null);
          if (Platform.OS === 'web') {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            } catch {
              // ignore
            }
          }
          onLogout?.();
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Top Header Bar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          {onOpenSidebar && (
            <TouchableOpacity onPress={onOpenSidebar} style={s.menuBtn}>
              <MaterialIcons name="menu" size={24} color={T.onSurface} />
            </TouchableOpacity>
          )}
          <Image
            source={require('../../../assets/logo.png')}
            style={s.topLogoImg}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity onPress={handleLogout} style={s.logoutHeaderBtn} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={16} color={T.error} />
          <Text style={s.logoutHeaderText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Overview Card */}
        <View style={s.userCard}>
          <View style={s.avatarWrap}>
            <MaterialIcons name="person" size={32} color={T.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>Khách hàng thuê kho</Text>
            </View>
            <Text style={s.userName} numberOfLines={1} ellipsizeMode="tail">
              {currentUser?.fullName || 'Khách hàng'}
            </Text>
            <Text style={s.userEmail} numberOfLines={1} ellipsizeMode="tail">
              {currentUser?.email || 'Chưa cập nhật email'}
            </Text>
          </View>
        </View>

        {/* Form 1: Cập Nhật Thông Tin Cá Nhân */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBox}>
              <MaterialIcons name="edit" size={20} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Thông Tin Khách Hàng</Text>
              <Text style={s.cardSub}>Chỉnh sửa họ tên và số điện thoại liên lạc</Text>
            </View>
          </View>

          {profileMsg && (
            <View style={[s.msgBox, profileMsg.type === 'error' ? s.msgBoxError : s.msgBoxSuccess]}>
              <MaterialIcons
                name={profileMsg.type === 'error' ? 'error-outline' : 'check-circle-outline'}
                size={18}
                color={profileMsg.type === 'error' ? T.error : T.success}
              />
              <Text style={[s.msgText, { color: profileMsg.type === 'error' ? T.error : T.success }]}>
                {profileMsg.text}
              </Text>
            </View>
          )}

          <Text style={s.inputLabel}>Họ và tên *</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="badge" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Nhập họ và tên..."
              placeholderTextColor={T.outline}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text style={s.inputLabel}>Số điện thoại *</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="phone" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Nhập số điện thoại..."
              placeholderTextColor={T.outline}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={s.inputLabel}>Địa chỉ Email</Text>
          <View style={[s.inputWrap, s.inputWrapDisabled]}>
            <MaterialIcons name="email" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={[s.input, { color: T.outline }]}
              value={email}
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, isUpdatingProfile && s.btnDisabled]}
            onPress={handleUpdateProfile}
            disabled={isUpdatingProfile}
            activeOpacity={0.85}
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color="#ffffff" />
                <Text style={s.submitBtnText}>Lưu Thay Đổi Thông Tin</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Form 2: Đổi Mật Khẩu */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="lock" size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Đổi Mật Khẩu Đăng Nhập</Text>
              <Text style={s.cardSub}>Cập nhật mật khẩu để bảo vệ an toàn tài khoản</Text>
            </View>
          </View>

          {passMsg && (
            <View style={[s.msgBox, passMsg.type === 'error' ? s.msgBoxError : s.msgBoxSuccess]}>
              <MaterialIcons
                name={passMsg.type === 'error' ? 'error-outline' : 'check-circle-outline'}
                size={18}
                color={passMsg.type === 'error' ? T.error : T.success}
              />
              <Text style={[s.msgText, { color: passMsg.type === 'error' ? T.error : T.success }]}>
                {passMsg.text}
              </Text>
            </View>
          )}

          <Text style={s.inputLabel}>Mật khẩu hiện tại *</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="lock-outline" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Nhập mật khẩu hiện tại..."
              placeholderTextColor={T.outline}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={s.eyeBtn}>
              <MaterialIcons name={showCurrentPass ? 'visibility' : 'visibility-off'} size={20} color={T.outline} />
            </TouchableOpacity>
          </View>

          <Text style={s.inputLabel}>Mật khẩu mới (ít nhất 6 ký tự) *</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="vpn-key" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Nhập mật khẩu mới..."
              placeholderTextColor={T.outline}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={s.eyeBtn}>
              <MaterialIcons name={showNewPass ? 'visibility' : 'visibility-off'} size={20} color={T.outline} />
            </TouchableOpacity>
          </View>

          <Text style={s.inputLabel}>Xác nhận mật khẩu mới *</Text>
          <View style={s.inputWrap}>
            <MaterialIcons name="check" size={20} color={T.outline} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Nhập lại mật khẩu mới..."
              placeholderTextColor={T.outline}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: '#1d4ed8' }, isChangingPass && s.btnDisabled]}
            onPress={handleChangePassword}
            disabled={isChangingPass}
            activeOpacity={0.85}
          >
            {isChangingPass ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialIcons name="security" size={18} color="#ffffff" />
                <Text style={s.submitBtnText}>Cập Nhật Mật Khẩu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>



        {/* Nút Đăng Xuất To Rõ Ràng */}
        <TouchableOpacity style={s.fullLogoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialIcons name="logout" size={20} color={T.error} />
          <Text style={s.fullLogoutBtnText}>Đăng Xuất Khỏi Thiết Bị</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav Bar */}
      <CustomerBottomNavBar
        activeTab="account"
        onSelectTab={(tab) => onNavigateBottomTab?.(tab)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    height: 56,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e7ff',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLogoImg: {
    height: 26,
    width: 88,
  },
  logoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fca5a5',
    flexShrink: 0,
  },
  logoutHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.error,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
    gap: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: T.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.brandDark,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: T.onSurface,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: T.onSurfaceVariant,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: T.onSurface,
  },
  cardSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    marginTop: 2,
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
  },
  msgBoxError: {
    backgroundColor: T.errorLight,
    borderColor: '#fca5a5',
  },
  msgBoxSuccess: {
    backgroundColor: T.successLight,
    borderColor: '#86efac',
  },
  msgText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 6,
  },
  inputWrapDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.8,
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
    borderRadius: 12,
    height: 46,
    marginTop: 14,
    gap: 8,
    shadowColor: T.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  fullLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.error,
  },

});
