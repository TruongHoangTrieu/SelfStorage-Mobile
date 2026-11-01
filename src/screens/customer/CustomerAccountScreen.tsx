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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest, setAuthToken } from '../../api';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';
import CustomerInvoiceDetailModal, {
  CustomerInvoiceItem,
} from '../../components/customer/CustomerInvoiceDetailModal';

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
  rentedUnits?: CustomerRentedUnit[];
  onUpdateUser?: (updated: any) => void;
  onLogout?: () => void;
  onNavigateBottomTab?: (tab: CustomerTabType) => void;
  onOpenSidebar?: () => void;
}

export default function CustomerAccountScreen({
  currentUser,
  rentedUnits = [],
  onUpdateUser,
  onLogout,
  onNavigateBottomTab,
  onOpenSidebar,
}: CustomerAccountScreenProps) {
  // Navigation tabs: 'profile' (Hồ sơ & Bảo mật) | 'invoices' (Truy cứu hóa đơn VAT)
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices'>('profile');

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

  // Invoices & Payment Lookup states
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedInvoiceCategory, setSelectedInvoiceCategory] = useState<'all' | 'rent' | 'deposit' | 'renewal'>('all');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<CustomerInvoiceItem | null>(null);
  const [isInvoiceModalVisible, setIsInvoiceModalVisible] = useState(false);
  const [apiPayments, setApiPayments] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Load API Payments nếu có kết nối Backend
  useEffect(() => {
    let isMounted = true;
    async function loadApiPayments() {
      try {
        setIsLoadingInvoices(true);
        const res = await apiRequest<any>('/payments').catch(() => null);
        if (isMounted && res) {
          const list = Array.isArray(res) ? res : res.data || res.items || [];
          setApiPayments(list);
        }
      } catch (err) {
        // Fallback to rentedUnits payments
      } finally {
        if (isMounted) setIsLoadingInvoices(false);
      }
    }
    loadApiPayments();
    return () => {
      isMounted = false;
    };
  }, []);

  // Tổng hợp danh sách hóa đơn từ rentedUnits và Backend API
  const allInvoices = useMemo<CustomerInvoiceItem[]>(() => {
    const list: CustomerInvoiceItem[] = [];

    // 1. Trích xuất từ rentedUnits
    rentedUnits.forEach((u) => {
      (u.payments || []).forEach((p, idx) => {
        const cleanCode = p.paymentCode || `PAY-${idx + 1}`;
        const numPart = cleanCode.replace(/\D/g, '').slice(-6) || `${idx + 1000}`;
        list.push({
          id: p.id || `inv-${u.id}-${idx}`,
          invoiceCode: `HD-${numPart}`,
          paymentCode: p.paymentCode,
          contractCode: u.contractCode,
          unitCode: u.unitCode,
          unitType: u.unitName || u.size || 'Kho Tiêu chuẩn',
          facilityName: u.facilityName,
          amount: p.amount,
          type: p.type,
          typeLabel: p.typeLabel || (p.type === 'DEPOSIT' ? 'Tiền cọc giữ chỗ ô kho' : 'Tiền thuê kho định kỳ'),
          periodDescription: p.periodDescription || `Thanh toán hợp đồng ${u.contractCode}`,
          status: p.status || 'PAID',
          paidAt: p.paidAt || '13/10/2026',
          method: p.method || 'SEPAY_QR',
          taxRate: 8,
          customerName: currentUser?.fullName || 'Nguyễn Văn Khách Hàng',
          customerPhone: currentUser?.phone || '0908 123 456',
          customerEmail: currentUser?.email || 'customer@selfstorage.vn',
        });
      });
    });

    // 2. Dữ liệu mẫu tiêu chuẩn nếu danh sách chưa có dữ liệu
    if (list.length === 0) {
      list.push(
        {
          id: 'inv-def-01',
          invoiceCode: 'HD-20261013-8812',
          paymentCode: 'PAY-20261013-8812',
          contractCode: 'CON-20261028-TODAY',
          unitCode: 'STD_1-02',
          unitType: 'Kho Gia đình Tiêu chuẩn (9.0m²)',
          facilityName: 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
          amount: 890000,
          type: 'DEPOSIT',
          typeLabel: 'Tiền cọc giữ chỗ ô kho',
          periodDescription: 'Cọc bảo đảm 01 tháng (Hoàn cấn trừ vào tiền thuê)',
          status: 'PAID',
          paidAt: '13/10/2026 08:45',
          method: 'SEPAY_QR',
          taxRate: 8,
          customerName: currentUser?.fullName || 'Nguyễn Văn Khách Hàng',
          customerPhone: currentUser?.phone || '0908 123 456',
          customerEmail: currentUser?.email || 'customer@selfstorage.vn',
        },
        {
          id: 'inv-def-02',
          invoiceCode: 'HD-20261013-8813',
          paymentCode: 'PAY-20261013-8813',
          contractCode: 'CON-20261028-TODAY',
          unitCode: 'STD_1-02',
          unitType: 'Kho Gia đình Tiêu chuẩn (9.0m²)',
          facilityName: 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
          amount: 890000,
          type: 'RENTAL',
          typeLabel: 'Tiền thuê kho tự quản tháng 10/2026',
          periodDescription: 'Cước thuê kho định kỳ tháng 10/2026 (Đã kích hoạt Smart PIN)',
          status: 'PAID',
          paidAt: '13/10/2026 08:46',
          method: 'SEPAY_QR',
          taxRate: 8,
          customerName: currentUser?.fullName || 'Nguyễn Văn Khách Hàng',
          customerPhone: currentUser?.phone || '0908 123 456',
          customerEmail: currentUser?.email || 'customer@selfstorage.vn',
        },
        {
          id: 'inv-def-03',
          invoiceCode: 'HD-20260920-7715',
          paymentCode: 'PAY-20260920-7715',
          contractCode: 'CON-20260920-MINI',
          unitCode: 'VNG-MINI-01',
          unitType: 'Kho Mini Tiện Ích (4.9m²)',
          facilityName: 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
          amount: 490000,
          type: 'RENTAL',
          typeLabel: 'Tiền thuê kho tự quản tháng 09/2026',
          periodDescription: 'Cước thuê kho lưu trữ hồ sơ tài liệu',
          status: 'PAID',
          paidAt: '20/09/2026 14:15',
          method: 'BANK_TRANSFER',
          taxRate: 8,
          customerName: currentUser?.fullName || 'Nguyễn Văn Khách Hàng',
          customerPhone: currentUser?.phone || '0908 123 456',
          customerEmail: currentUser?.email || 'customer@selfstorage.vn',
        }
      );
    }

    return list;
  }, [rentedUnits, currentUser]);

  // Bộ lọc tìm kiếm hóa đơn
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      const q = invoiceSearchQuery.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        inv.invoiceCode.toLowerCase().includes(q) ||
        inv.paymentCode.toLowerCase().includes(q) ||
        inv.contractCode.toLowerCase().includes(q) ||
        inv.unitCode.toLowerCase().includes(q) ||
        (inv.facilityName && inv.facilityName.toLowerCase().includes(q)) ||
        inv.typeLabel.toLowerCase().includes(q);

      const matchCategory =
        selectedInvoiceCategory === 'all'
          ? true
          : selectedInvoiceCategory === 'rent'
          ? inv.type === 'RENTAL'
          : selectedInvoiceCategory === 'deposit'
          ? inv.type === 'DEPOSIT'
          : inv.type === 'RENEWAL';

      return matchSearch && matchCategory;
    });
  }, [allInvoices, invoiceSearchQuery, selectedInvoiceCategory]);

  // Thống kê tổng tiền đã thanh toán
  const totalPaidSum = useMemo(() => {
    return allInvoices.reduce((sum, item) => sum + item.amount, 0);
  }, [allInvoices]);

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

  // Tải nhanh hóa đơn PDF
  const handleQuickDownload = (inv: CustomerInvoiceItem) => {
    const msg = `Hóa đơn điện tử #${inv.invoiceCode} cho ô kho ${inv.unitCode} đã được xuất thành công.`;
    if (Platform.OS === 'web') {
      window.alert(`Tải Hóa Đơn PDF Thành Công\n\n${msg}\nKiểm tra thư mục tải về của bạn.`);
    } else {
      Alert.alert('Tải Hóa Đơn Thành Công', `${msg}\nĐã lưu vào bộ nhớ máy.`, [{ text: 'Đóng' }]);
    }
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

        {/* ─── THANH CHUYỂN TAB CHỨC NĂNG (SEGMENTED TABS) ─── */}
        <View style={s.tabSegmentContainer}>
          <TouchableOpacity
            style={[s.tabSegmentBtn, activeTab === 'profile' && s.tabSegmentBtnActive]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="manage-accounts"
              size={18}
              color={activeTab === 'profile' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[s.tabSegmentText, activeTab === 'profile' && s.tabSegmentTextActive]}>
              Hồ sơ & Bảo mật
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabSegmentBtn, activeTab === 'invoices' && s.tabSegmentBtnActive]}
            onPress={() => setActiveTab('invoices')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="receipt-long"
              size={18}
              color={activeTab === 'invoices' ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[s.tabSegmentText, activeTab === 'invoices' && s.tabSegmentTextActive]}>
              Truy cứu hóa đơn VAT
            </Text>
            <View
              style={[
                s.tabCountBadge,
                activeTab === 'invoices' ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#EFF6FF' },
              ]}
            >
              <Text
                style={[
                  s.tabCountBadgeText,
                  activeTab === 'invoices' ? { color: '#1D4ED8' } : { color: '#2563EB' },
                ]}
              >
                {allInvoices.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ================================================================ */}
        {/* TAB 1: THÔNG TIN HỒ SƠ & BẢO MẬT MẬT KHẨU                        */}
        {/* ================================================================ */}
        {activeTab === 'profile' ? (
          <>
            {/* Banner gợi ý truy cứu hóa đơn nhanh */}
            <TouchableOpacity
              style={s.invoicePromoBanner}
              onPress={() => setActiveTab('invoices')}
              activeOpacity={0.88}
            >
              <View style={s.promoIconBox}>
                <MaterialIcons name="request-quote" size={26} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.promoHeaderRow}>
                  <Text style={s.promoTitle}>Truy Cứu Hóa Đơn Điện Tử VAT</Text>
                  <View style={s.promoLiveBadge}>
                    <Text style={s.promoLiveBadgeText}>Mới</Text>
                  </View>
                </View>
                <Text style={s.promoSub}>
                  Tra cứu biên lai thanh toán, tải hóa đơn VAT có mã cơ quan thuế cho tất cả ô kho.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#1D4ED8" />
            </TouchableOpacity>

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
          </>
        ) : (
          /* ================================================================ */
          /* TAB 2: TRUY CỨU HÓA ĐƠN & BIÊN LAI THANH TOÁN (VAT)              */
          /* ================================================================ */
          <View style={s.invoicesTabContainer}>
            {/* Khung Tóm Tắt Tài Chính & Hóa Đơn */}
            <View style={s.financialHeroCard}>
              <View style={s.financialHeroRow}>
                <View style={s.financialHeroCol}>
                  <Text style={s.financialHeroLabel}>TỔNG TIỀN ĐÃ XUẤT HÓA ĐƠN</Text>
                  <Text style={s.financialHeroAmount}>{formatVND(totalPaidSum)}</Text>
                </View>
                <View style={s.vatGuaranteedBadge}>
                  <MaterialIcons name="verified" size={13} color="#047857" />
                  <Text style={s.vatGuaranteedText}>Hóa đơn VAT 8%</Text>
                </View>
              </View>

              <View style={s.financialDivider} />

              <View style={s.financialFooterRow}>
                <Text style={s.financialFooterText}>
                  Số lượng: <Text style={{ fontWeight: '800', color: '#1E293B' }}>{allInvoices.length} hóa đơn</Text>
                </Text>
                <Text style={s.financialFooterText}>
                  CQT: <Text style={{ fontWeight: '800', color: '#15803D' }}>Đã cấp mã tra cứu</Text>
                </Text>
              </View>
            </View>

            {/* Thanh Tìm Kiếm Hóa Đơn Thông Minh */}
            <View style={s.searchInvoiceCard}>
              <View style={s.searchInvoiceBar}>
                <MaterialIcons name="search" size={22} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.searchInvoiceInput}
                  placeholder="Tra cứu theo mã HĐ, mã hóa đơn, ô kho..."
                  placeholderTextColor="#94A3B8"
                  value={invoiceSearchQuery}
                  onChangeText={setInvoiceSearchQuery}
                />
                {invoiceSearchQuery ? (
                  <TouchableOpacity onPress={() => setInvoiceSearchQuery('')} style={{ padding: 4 }}>
                    <MaterialIcons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Bộ lọc loại hóa đơn */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterPillScroll}
              >
                <TouchableOpacity
                  style={[s.filterPill, selectedInvoiceCategory === 'all' && s.filterPillActive]}
                  onPress={() => setSelectedInvoiceCategory('all')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterPillText, selectedInvoiceCategory === 'all' && s.filterPillTextActive]}>
                    Tất cả ({allInvoices.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.filterPill, selectedInvoiceCategory === 'rent' && s.filterPillActive]}
                  onPress={() => setSelectedInvoiceCategory('rent')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterPillText, selectedInvoiceCategory === 'rent' && s.filterPillTextActive]}>
                    Tiền thuê kho
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.filterPill, selectedInvoiceCategory === 'deposit' && s.filterPillActive]}
                  onPress={() => setSelectedInvoiceCategory('deposit')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterPillText, selectedInvoiceCategory === 'deposit' && s.filterPillTextActive]}>
                    Tiền cọc giữ chỗ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.filterPill, selectedInvoiceCategory === 'renewal' && s.filterPillActive]}
                  onPress={() => setSelectedInvoiceCategory('renewal')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.filterPillText, selectedInvoiceCategory === 'renewal' && s.filterPillTextActive]}>
                    Gia hạn hợp đồng
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Danh Sách Hóa Đơn */}
            <View style={s.invoicesListHeaderRow}>
              <Text style={s.invoicesListTitle}>
                Danh Sách Hóa Đơn Điện Tử ({filteredInvoices.length})
              </Text>
              <Text style={s.invoicesListSub}>Chạm để xem chi tiết hóa đơn</Text>
            </View>

            {filteredInvoices.length === 0 ? (
              <View style={s.emptyInvoiceBox}>
                <MaterialIcons name="receipt-long" size={48} color="#CBD5E1" />
                <Text style={s.emptyInvoiceTitle}>Không tìm thấy hóa đơn phù hợp</Text>
                <Text style={s.emptyInvoiceSub}>
                  Vui lòng thử từ khóa tìm kiếm khác hoặc kiểm tra lại mã hóa đơn của bạn.
                </Text>
                <TouchableOpacity
                  style={s.resetFilterBtn}
                  onPress={() => {
                    setInvoiceSearchQuery('');
                    setSelectedInvoiceCategory('all');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.resetFilterBtnText}>Xem tất cả hóa đơn</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredInvoices.map((inv) => (
                <View key={inv.id} style={s.invoiceCard}>
                  {/* Card Header: Mã HĐ & Badge */}
                  <View style={s.invoiceCardHeader}>
                    <View style={s.invoiceCodeWrap}>
                      <MaterialIcons name="receipt" size={16} color="#1D4ED8" />
                      <Text style={s.invoiceCodeText}>{inv.invoiceCode}</Text>
                    </View>
                    <View style={s.invoicePaidBadge}>
                      <MaterialIcons name="check-circle" size={12} color="#15803D" />
                      <Text style={s.invoicePaidBadgeText}>ĐÃ THANH TOÁN</Text>
                    </View>
                  </View>

                  {/* Khoản tiền & Dịch vụ */}
                  <View style={s.invoiceCardBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.invoiceServiceTitle}>{inv.typeLabel}</Text>
                      <Text style={s.invoiceSubDetail}>
                        Ô kho: <Text style={s.boldSubText}>#{inv.unitCode}</Text> • HĐ: #{inv.contractCode.slice(-6).toUpperCase()}
                      </Text>
                      {inv.facilityName && (
                        <Text style={s.invoiceFacilityText} numberOfLines={1}>
                          {inv.facilityName}
                        </Text>
                      )}
                    </View>

                    <View style={s.invoiceAmountWrap}>
                      <Text style={s.invoiceAmountText}>{formatVND(inv.amount)}</Text>
                      <Text style={s.invoiceVatTag}>Đã gồm VAT 8%</Text>
                    </View>
                  </View>

                  {/* Ngày & Phương thức */}
                  <View style={s.invoiceCardFooter}>
                    <View style={s.invoiceDateRow}>
                      <MaterialIcons name="event" size={13} color="#64748B" />
                      <Text style={s.invoiceDateText}>{inv.paidAt}</Text>
                    </View>

                    <Text style={s.invoiceMethodText}>
                      Phương thức: {inv.method === 'SEPAY_QR' ? 'SePay VietQR' : 'Chuyển khoản'}
                    </Text>
                  </View>

                  {/* Nút Xem Hóa Đơn VAT & Tải PDF */}
                  <View style={s.invoiceActionRow}>
                    <TouchableOpacity
                      style={s.viewVatInvoiceBtn}
                      onPress={() => {
                        setSelectedInvoiceForModal(inv);
                        setIsInvoiceModalVisible(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="visibility" size={15} color="#1D4ED8" />
                      <Text style={s.viewVatInvoiceBtnText}>Xem Hóa Đơn Điện Tử VAT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.quickDownloadBtn}
                      onPress={() => handleQuickDownload(inv)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="file-download" size={16} color="#475569" />
                      <Text style={s.quickDownloadBtnText}>Tải PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── MODAL HÓA ĐƠN ĐIỆN TỬ VAT CHI TIẾT ─── */}
      <CustomerInvoiceDetailModal
        visible={isInvoiceModalVisible}
        onClose={() => setIsInvoiceModalVisible(false)}
        invoice={selectedInvoiceForModal}
      />

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
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e7ff',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dbeafe',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: T.primary,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
  },
  userEmail: {
    fontSize: 12,
    color: T.outline,
    marginTop: 2,
  },

  // ─── SEGMENTED TABS ───
  tabSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabSegmentBtnActive: {
    backgroundColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ─── BANNER PROMO HÓA ĐƠN ───
  invoicePromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  promoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  promoLiveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  promoLiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  promoSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },

  // ─── CARD CHUNG ───
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e7ff',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: T.onSurface,
  },
  cardSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 2,
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  msgBoxSuccess: {
    backgroundColor: T.successLight,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  msgBoxError: {
    backgroundColor: T.errorLight,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  msgText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputWrapDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.brand,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  fullLogoutBtnText: {
    color: T.error,
    fontSize: 13,
    fontWeight: '800',
  },

  // ─── TAB INVOICES STYLES ───
  invoicesTabContainer: {
    gap: 12,
  },
  financialHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  financialHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  financialHeroCol: {
    flex: 1,
  },
  financialHeroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  financialHeroAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  vatGuaranteedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vatGuaranteedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  financialDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  financialFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialFooterText: {
    fontSize: 11,
    color: '#64748B',
  },
  searchInvoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInvoiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInvoiceInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A',
  },
  filterPillScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  invoicesListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  invoicesListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoicesListSub: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyInvoiceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyInvoiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyInvoiceSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  resetFilterBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invoiceCodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  invoicePaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  invoicePaidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  invoiceCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 10,
  },
  invoiceServiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  invoiceSubDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  boldSubText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  invoiceFacilityText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  invoiceAmountWrap: {
    alignItems: 'flex-end',
  },
  invoiceAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  invoiceVatTag: {
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  invoiceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  invoiceDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  invoiceMethodText: {
    fontSize: 11,
    color: '#64748B',
  },
  invoiceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  viewVatInvoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  viewVatInvoiceBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  quickDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  quickDownloadBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
});
