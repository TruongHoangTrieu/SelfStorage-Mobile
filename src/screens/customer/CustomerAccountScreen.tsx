import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest, fetchMySupportRequestsApi } from '../../api';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';
import { CustomerRentedUnit, CustomerTab } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface CustomerAccountScreenProps {
  currentUser: any;
  rentedUnits?: CustomerRentedUnit[];
  myReservations?: any[];
  onUpdateUser?: (updated: any) => void;
  onLogout?: () => void;
  onNavigateBottomTab?: (tab: CustomerTabType) => void;
  onNavigateSubTab?: (subTab: CustomerTab) => void;
  onOpenNotifications?: () => void;
  onOpenSidebar?: () => void;
  onViewAllReservations?: () => void;
  onRefreshReservations?: () => Promise<void>;
}

export default function CustomerAccountScreen({
  currentUser,
  rentedUnits = [],
  myReservations = [],
  onUpdateUser,
  onLogout,
  onNavigateBottomTab,
  onNavigateSubTab,
  onOpenNotifications,
  onOpenSidebar,
  onViewAllReservations,
  onRefreshReservations,
}: CustomerAccountScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24));

  // Modal states
  const { handleLogout: authLogout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'info' | 'password'>('info');
  
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

  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lọc các đơn đặt giữ chỗ đang chờ nhận kho (Active) đồng bộ với Web
  const activeReservations = useMemo(() => {
    return (myReservations || []).filter(
      (r: any) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'EXPIRED'
    );
  }, [myReservations]);

  // Lịch hẹn nhận kho sắp tới
  const upcomingReservations = useMemo(() => {
    return activeReservations.slice(0, 3);
  }, [activeReservations]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  const loadSupportTickets = async () => {
    try {
      const res = await fetchMySupportRequestsApi().catch(() => null);
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setSupportTickets(res.data);
      } else {
        const all = rentedUnits.flatMap((u) => u.supportTickets || []);
        setSupportTickets(all);
      }
    } catch {
      const all = rentedUnits.flatMap((u) => u.supportTickets || []);
      setSupportTickets(all);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSupportTickets();
  }, []);

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

      setPassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật thành công.');
    } catch (err: any) {
      setPassMsg({
        type: 'error',
        text: err?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handlePerformLogout = async () => {
    setShowLogoutModal(false);
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await authLogout();
      }
    } catch (e) {
      console.warn('Lỗi khi đăng xuất:', e);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(true);
  };

  const _unusedOldLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
        onLogout?.();
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => onLogout?.() },
      ]);
    }
  };

  // Lấy 2 chữ cái đầu làm Avatar viết tắt
  const userInitials = useMemo(() => {
    const name = (currentUser?.fullName || 'Khách').trim();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [currentUser]);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingTop: topInset + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await Promise.all([
                loadSupportTickets(),
                onRefreshReservations ? onRefreshReservations() : Promise.resolve(),
              ]);
              setIsRefreshing(false);
            }}
          />
        }
      >
        {/* TOP HEADER */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.userName} numberOfLines={1}>
              {currentUser?.fullName || 'Nguyễn Hoàng Long'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.avatarWrapper}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            {currentUser?.avatarUrl ? (
              <Image source={{ uri: currentUser.avatarUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>{userInitials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 1: LỊCH HẸN NHẬN KHO SẮP TỚI */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Lịch hẹn nhận kho sắp tới</Text>
          {myReservations && myReservations.length > 0 && (
            <TouchableOpacity
              onPress={() => onViewAllReservations ? onViewAllReservations() : (onNavigateBottomTab ? onNavigateBottomTab('book-new') : null)}
              activeOpacity={0.7}
            >
              <Text style={s.viewAllLink}>Xem tất cả &gt;</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.appointmentList}>
          {upcomingReservations.length > 0 ? (
            upcomingReservations.map((res: any, index: number) => {
              const rawDate = res.appointmentDate || res.checkInDate || '';
              const dateParts = rawDate.includes('T') ? rawDate.split('T')[0].split('-') : rawDate.split('-');
              const timeStr = rawDate.includes('T') ? rawDate.split('T')[1]?.slice(0, 5) : '09:00';
              const dayMonthStr = dateParts.length >= 3 ? `${dateParts[2]}/${dateParts[1]}` : 'Sắp tới';

              return (
                <TouchableOpacity
                  key={res.id || index}
                  style={s.appointmentCard}
                  activeOpacity={0.8}
                  onPress={() => onViewAllReservations ? onViewAllReservations() : (onNavigateBottomTab ? onNavigateBottomTab('my-storage') : null)}
                >
                  <View style={s.timeBadge}>
                    <Text style={s.timeBadgeTime}>{timeStr}</Text>
                    <Text style={s.timeBadgeDate}>{dayMonthStr}</Text>
                  </View>
                  <View style={s.appointmentInfo}>
                    <Text style={s.appointmentName} numberOfLines={1}>
                      {(res.items?.[0]?.unitType?.name || res.unitType?.name || 'Kho Tự Quản') + (res.items?.[0]?.unit?.unitNumber ? ' · Ô ' + res.items[0].unit.unitNumber : '')}
                    </Text>
                    <Text style={s.appointmentSub} numberOfLines={1}>
                      {res.facility?.name || 'SelfStorage'} · {res.rentalPeriod || 1} tháng
                    </Text>
                  </View>
                  <View style={s.resStatusBadge}>
                    <Text style={s.resStatusText}>
                      {res.status === 'CONFIRMED' ? 'Đã duyệt' : (res.status === 'COMPLETED' ? 'Đã nhận' : 'Chờ nhận')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={s.emptySectionCard}>
              <View style={s.emptySectionIconWrap}>
                <MaterialIcons name="event-available" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.emptySectionTitle}>Chưa có lịch hẹn nhận kho mới</Text>
                <Text style={s.emptySectionSub}>Bạn có thể đặt giữ chỗ kho trực tuyến bất kỳ lúc nào</Text>
              </View>
              <TouchableOpacity
                style={s.emptySectionBtn}
                activeOpacity={0.8}
                onPress={() => onViewAllReservations ? onViewAllReservations() : (onNavigateBottomTab ? onNavigateBottomTab('book-new') : null)}
              >
                <Text style={s.emptySectionBtnText}>Thuê kho</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SECTION 2: YÊU CẦU HỖ TRỢ SỰ CỐ GẦN ĐÂY */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>Yêu cầu hỗ trợ sự cố gần đây</Text>
          <TouchableOpacity
            onPress={() => onNavigateBottomTab ? onNavigateBottomTab('support') : onNavigateSubTab?.('support')}
            activeOpacity={0.7}
          >
            <Text style={s.viewAllLink}>Xem tất cả &gt;</Text>
          </TouchableOpacity>
        </View>

        {supportTickets && supportTickets.length > 0 ? (
          supportTickets.slice(0, 2).map((ticket: any, index: number) => {
            const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
            const isProcessing = ticket.status === 'PROCESSING' || ticket.status === 'IN_PROGRESS';
            const statusLabel = isResolved ? 'Đã xử lý' : (isProcessing ? 'Đang xử lý' : 'Chờ tiếp nhận');
            const statusColor = isResolved ? '#16a34a' : (isProcessing ? '#2563eb' : '#d97706');
            const statusBg = isResolved ? '#dcfce7' : (isProcessing ? '#eff6ff' : '#fef3c7');

            return (
              <TouchableOpacity
                key={ticket.id || index}
                style={[s.dealCard, { marginBottom: 10 }]}
                activeOpacity={0.8}
                onPress={() => onNavigateBottomTab ? onNavigateBottomTab('support') : onNavigateSubTab?.('support')}
              >
                <View style={[s.dealInitialsCircle, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons
                    name={ticket.category === 'LOCK' ? 'vpn-key' : 'build'}
                    size={18}
                    color="#2563eb"
                  />
                </View>
                <View style={s.dealInfo}>
                  <Text style={s.dealName} numberOfLines={1}>
                    {ticket.subject || ticket.categoryLabel || 'Hỗ trợ kỹ thuật'}
                  </Text>
                  <Text style={s.dealSub} numberOfLines={1}>
                    {ticket.requestCode ? `#${ticket.requestCode} · ` : ''}{ticket.createdAt || 'Gần đây'}
                  </Text>
                </View>
                <View style={[s.ticketStatusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[s.ticketStatusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={s.emptySectionCard}>
            <View style={[s.emptySectionIconWrap, { backgroundColor: '#f0fdf4' }]}>
              <MaterialIcons name="verified" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.emptySectionTitle}>Hệ thống buồng kho hoạt động tốt</Text>
              <Text style={s.emptySectionSub}>Không có sự cố hoặc yêu cầu kỹ thuật nào đang chờ xử lý</Text>
            </View>
            <TouchableOpacity
              style={[s.emptySectionBtn, { backgroundColor: '#eff6ff' }]}
              activeOpacity={0.8}
              onPress={() => onNavigateBottomTab ? onNavigateBottomTab('support') : onNavigateSubTab?.('support')}
            >
              <Text style={[s.emptySectionBtnText, { color: '#2563eb' }]}>Báo sự cố</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 3: CÀI ĐẶT & QUẢN TRỊ TÀI KHOẢN */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>Cài đặt & Tài khoản</Text>
        </View>

        <View style={s.settingsGroup}>
          <TouchableOpacity
            style={s.settingsItem}
            activeOpacity={0.7}
            onPress={() => {
              setProfileModalTab('info');
              setShowProfileModal(true);
            }}
          >
            <View style={s.settingsIconWrap}>
              <MaterialIcons name="person-outline" size={20} color="#334155" />
            </View>
            <Text style={s.settingsLabel}>Hồ sơ cá nhân & Đổi mật khẩu</Text>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity
            style={s.settingsItem}
            activeOpacity={0.7}
            onPress={onViewAllReservations}
          >
            <View style={s.settingsIconWrap}>
              <MaterialIcons name="bookmark-border" size={20} color="#334155" />
            </View>
            <Text style={s.settingsLabel}>Đơn đặt giữ chỗ của tôi</Text>
            {activeReservations && activeReservations.length > 0 && (
              <View
                style={{
                  backgroundColor: '#eff6ff',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  marginRight: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>
                  {activeReservations.length} đơn
                </Text>
              </View>
            )}
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity
            style={s.settingsItem}
            activeOpacity={0.7}
            onPress={() => onNavigateSubTab?.('payments')}
          >
            <View style={s.settingsIconWrap}>
              <MaterialIcons name="receipt-long" size={20} color="#334155" />
            </View>
            <Text style={s.settingsLabel}>Hóa đơn</Text>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity
            style={s.settingsItem}
            activeOpacity={0.7}
            onPress={onOpenNotifications}
          >
            <View style={s.settingsIconWrap}>
              <MaterialIcons name="notifications-none" size={20} color="#334155" />
            </View>
            <Text style={s.settingsLabel}>Trung tâm thông báo & Cảnh báo</Text>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={s.settingsDivider} />

          <TouchableOpacity
            style={s.settingsItem}
            activeOpacity={0.7}
            onPress={handleConfirmLogout}
          >
            <View style={[s.settingsIconWrap, { backgroundColor: '#fef2f2' }]}>
              <MaterialIcons name="logout" size={20} color="#dc2626" />
            </View>
            <Text style={[s.settingsLabel, { color: '#dc2626' }]}>Đăng xuất tài khoản</Text>
            <MaterialIcons name="chevron-right" size={20} color="#f87171" />
          </TouchableOpacity>
        </View>

        {/* BOTTOM SPACING FOR NAV BAR */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL 1: HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={[s.modalSafeArea, { paddingTop: topInset }]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)} style={s.modalBackBtn}>
              <MaterialIcons name="arrow-back-ios" size={18} color="#1e293b" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Hồ Sơ & Bảo Mật</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Sub tabs */}
          <View style={s.modalTabsRow}>
            <TouchableOpacity
              style={[s.modalTabBtn, profileModalTab === 'info' && s.modalTabBtnActive]}
              onPress={() => setProfileModalTab('info')}
            >
              <Text style={[s.modalTabText, profileModalTab === 'info' && s.modalTabTextActive]}>
                Thông tin cá nhân
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modalTabBtn, profileModalTab === 'password' && s.modalTabBtnActive]}
              onPress={() => setProfileModalTab('password')}
            >
              <Text style={[s.modalTabText, profileModalTab === 'password' && s.modalTabTextActive]}>
                Đổi mật khẩu
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
            {profileModalTab === 'info' ? (
              <View style={s.formCard}>
                {profileMsg && (
                  <View style={[s.msgBanner, profileMsg.type === 'success' ? s.msgSuccess : s.msgError]}>
                    <Text style={profileMsg.type === 'success' ? s.msgSuccessText : s.msgErrorText}>
                      {profileMsg.text}
                    </Text>
                  </View>
                )}

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Họ và tên</Text>
                  <TextInput
                    style={s.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nhập họ và tên"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Số điện thoại</Text>
                  <TextInput
                    style={s.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Địa chỉ Email</Text>
                  <TextInput
                    style={[s.input, s.inputDisabled]}
                    value={email}
                    editable={false}
                  />
                  <Text style={s.hintText}>Email đăng ký không thể thay đổi</Text>
                </View>

                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                  activeOpacity={0.8}
                >
                  {isUpdatingProfile ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={s.submitBtnText}>Lưu Thay Đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.formCard}>
                {passMsg && (
                  <View style={[s.msgBanner, passMsg.type === 'success' ? s.msgSuccess : s.msgError]}>
                    <Text style={passMsg.type === 'success' ? s.msgSuccessText : s.msgErrorText}>
                      {passMsg.text}
                    </Text>
                  </View>
                )}

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Mật khẩu hiện tại</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={s.inputRowText}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Nhập mật khẩu hiện tại"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showCurrentPass}
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                      <MaterialIcons name={showCurrentPass ? 'visibility-off' : 'visibility'} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Mật khẩu mới</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={s.inputRowText}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Tối thiểu 6 ký tự"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPass}
                    />
                    <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                      <MaterialIcons name={showNewPass ? 'visibility-off' : 'visibility'} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Xác nhận mật khẩu mới</Text>
                  <TextInput
                    style={s.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleChangePassword}
                  disabled={isChangingPass}
                  activeOpacity={0.8}
                >
                  {isChangingPass ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={s.submitBtnText}>Đổi Mật Khẩu</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIconWrap}>
              <MaterialIcons name="logout" size={30} color="#dc2626" />
            </View>
            <Text style={s.confirmTitle}>Đăng xuất tài khoản</Text>
            <Text style={s.confirmDesc}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
            </Text>
            <View style={s.confirmActionRow}>
              <TouchableOpacity
                style={s.confirmCancelBtn}
                activeOpacity={0.8}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={s.confirmCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmSubmitBtn}
                activeOpacity={0.8}
                onPress={handlePerformLogout}
              >
                <Text style={s.confirmSubmitText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM NAV BAR */}
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
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e8e93',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  // HERO CARD
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 22,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextCol: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 11.5,
    color: '#64748b',
  },

  // 4 QUICK ACTIONS
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionItem: {
    alignItems: 'center',
    width: 68,
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },

  // 3 MINI KPI STAT BOXES
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },

  // APPOINTMENT CARDS
  resStatusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  resStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  ticketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptySectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  emptySectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  emptySectionSub: {
    fontSize: 11,
    color: '#64748b',
  },
  emptySectionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emptySectionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  appointmentList: {
    gap: 10,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  timeBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timeBadgeTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  timeBadgeDate: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  appointmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  appointmentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  appointmentSub: {
    fontSize: 11.5,
    color: '#64748b',
  },

  // DEAL CARD
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dealInitialsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealInitialsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  dealInfo: {
    flex: 1,
    marginRight: 8,
  },
  dealName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  dealSub: {
    fontSize: 11,
    color: '#64748b',
  },

  // SETTINGS GROUP
  settingsGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 64,
  },

  // MODALS
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  modalTabBtnActive: {
    backgroundColor: '#eff6ff',
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalTabTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1e293b',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputRowText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1e293b',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  msgBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  msgSuccess: {
    backgroundColor: '#dcfce7',
  },
  msgSuccessText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
  },
  msgError: {
    backgroundColor: '#fee2e2',
  },
  msgErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },

  // INVOICE LOOKUP MODAL
  invoiceSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invoiceSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
  },
  emptyInvoicesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyInvoicesText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  invoiceItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  invoiceItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceItemCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  invoiceItemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  invoiceItemDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginBottom: 8,
  },
  invoiceItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceItemDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // CONFIRM LOGOUT MODAL
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  invoiceItemStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
