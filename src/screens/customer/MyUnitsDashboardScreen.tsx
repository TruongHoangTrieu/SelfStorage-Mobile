// src/screens/customer/MyUnitsDashboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { apiRequest } from '../../api';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';
import ContractPreviewModal from '../../components/staff/ContractPreviewModal';

// ─── Design Tokens (Đồng bộ Stitch Design System) ─────────────────────────
const T = {
  background: '#f7f9fd',
  surface: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f5f9',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',
  primary: '#1d4ed8',
  primaryContainer: '#2563eb',
  surfaceTint: '#1d4ed8',
  secondaryContainer: '#2563eb',
  secondaryFixed: '#cce5ff',
  secondary: '#2563eb',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outline: '#737686',
  outlineVariant: '#c3c6d7',
  error: '#ba1a1a',
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  emeraldBorder: '#a7f3d0',
  emeraldText: '#047857',
  white: '#ffffff',
};

interface MyUnitsDashboardScreenProps {
  units: CustomerRentedUnit[];
  selectedUnit?: CustomerRentedUnit | null;
  isRenewModalOpen?: boolean;
  onViewDetail?: (unit: CustomerRentedUnit) => void;
  onOpenGuestPin?: (unit: CustomerRentedUnit) => void;
  onOpenRenew: (unit: CustomerRentedUnit) => void;
  onOpenReportIssue: (unit: CustomerRentedUnit) => void;
  onOpenChangePin?: (unit: CustomerRentedUnit) => void;
  onOpenReturn?: (unit: CustomerRentedUnit) => void;
  onRentMoreUnits?: () => void;
  onOpenSidebar?: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  customerName?: string;
  onNavigateBottomTab?: (tab: CustomerTabType) => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  currentUser?: any;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export default function MyUnitsDashboardScreen({
  units,
  selectedUnit,
  isRenewModalOpen,
  onViewDetail,
  onOpenGuestPin,
  onOpenRenew,
  onOpenReportIssue,
  onOpenChangePin,
  onOpenReturn,
  onRentMoreUnits,
  onOpenSidebar,
  onRefresh,
  isRefreshing,
  customerName = 'Nguyễn Văn Hải',
  onNavigateBottomTab,
  onOpenLogin,
  onLogout,
  currentUser,
  onOpenNotifications,
  unreadNotifCount = 0,
}: MyUnitsDashboardScreenProps) {
  // Selected active unit
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [viewMode, setViewModeState] = useState<'grid' | 'detail'>('grid');
  const activeUnit: CustomerRentedUnit | undefined = units[selectedUnitIndex] || units[0];

  const setViewMode = useCallback((mode: 'grid' | 'detail', unitIdx?: number) => {
    setViewModeState(mode);
    const idxToSave = typeof unitIdx === 'number' ? unitIdx : selectedUnitIndex;
    const unitToSave = units[idxToSave] || units[0];
    AsyncStorage.setItem(
      '@selfstorage_my_units_view',
      JSON.stringify({
        viewMode: mode,
        contractId: unitToSave?.contractId || '',
        unitCode: unitToSave?.unitCode || '',
      })
    ).catch(() => {});
  }, [selectedUnitIndex, units]);

  // Khôi phục chế độ xem chi tiết buồng kho khi quay lại ứng dụng
  useEffect(() => {
    if (units.length === 0) return;
    AsyncStorage.getItem('@selfstorage_my_units_view')
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.viewMode === 'detail') {
          const idx = units.findIndex(
            (u) =>
              (parsed.contractId && String(u.contractId) === String(parsed.contractId)) ||
              (parsed.unitCode && u.unitCode === parsed.unitCode)
          );
          if (idx >= 0) {
            setSelectedUnitIndex(idx);
            setViewModeState('detail');
          }
        }
      })
      .catch(() => {});
  }, [units.length]);

  // Tự động đồng bộ sang chi tiết buồng kho đang mở modal gia hạn (khi khách quay lại từ app ngân hàng)
  useEffect(() => {
    if (isRenewModalOpen && selectedUnit && units.length > 0) {
      const idx = units.findIndex(
        (u) =>
          u.id === selectedUnit.id ||
          (u.contractId &&
            String(u.contractId) === String(selectedUnit.contractId) &&
            u.unitCode === selectedUnit.unitCode)
      );
      if (idx >= 0) {
        setSelectedUnitIndex(idx);
        setViewMode('detail');
      }
    }
  }, [isRenewModalOpen, selectedUnit, units]);

  // PIN visibility toggle
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);

  // Chuyển đổi dữ liệu hợp đồng sang cấu trúc của ContractPreviewModal có sẵn
  const contractAppointmentData = React.useMemo(() => {
    if (!activeUnit) return null;
    return {
      id: String(activeUnit.contractId || activeUnit.id),
      contractCode: activeUnit.contractCode,
      assignedUnit: activeUnit.unitCode,
      facilityName: activeUnit.facilityName,
      facilityAddress: activeUnit.facilityAddress,
      customerName: customerName || currentUser?.fullName || 'Nguyễn Văn Khách Hàng',
      phone: currentUser?.phone || '0901 234 567',
      email: currentUser?.email || 'customer@selfstorage.vn',
      identityNumber: currentUser?.idCard || currentUser?.identityNumber || 'Đã xác thực điện tử',
      preferredFloor: activeUnit.floor || 'Tầng 1',
      unitType: activeUnit.unitName,
      unitSize: activeUnit.size,
      purpose: 'Lưu trữ đồ đạc cá nhân & tài sản tự quản',
      durationMonths: activeUnit.totalDays ? Math.max(1, Math.round(activeUnit.totalDays / 30)) : 1,
      startDate: activeUnit.startDate,
      monthlyRent: activeUnit.monthlyRentFormatted,
      depositAmount: activeUnit.depositFormatted,
      signature: [],
    } as any;
  }, [activeUnit, customerName, currentUser]);

  // ─── FETCH SMART-LOCK (PIN) TỪ API ──────────────────────────────────
  const [smartLockData, setSmartLockData] = useState<any>(null);
  const [loadingSmartLock, setLoadingSmartLock] = useState(false);

  useEffect(() => {
    if (!activeUnit?.contractId || !activeUnit?.unitId) {
      setSmartLockData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingSmartLock(true);
        const data = await apiRequest<any>(
          `/contracts/${activeUnit.contractId}/units/${activeUnit.unitId}/smart-lock`
        );
        if (!cancelled) setSmartLockData(data);
      } catch (err) {
        if (!cancelled) {
          console.warn('Fetch smart-lock failed:', err);
          setSmartLockData(null);
        }
      } finally {
        if (!cancelled) setLoadingSmartLock(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUnit?.contractId, activeUnit?.unitId, activeUnit?.masterPin]);

  // PIN hiển thị: ưu tiên masterPin mới cập nhật → API → fallback
  const masterPin: string =
    activeUnit?.masterPin ||
    smartLockData?.pinCode ||
    smartLockData?.accessCode ||
    smartLockData?.pin ||
    '';

  const maskedPin = masterPin ? `•••• ${masterPin.slice(-4)}` : '••••';

  // Format zone to prevent duplicate "Khu Khu M"
  const formatZoneLabel = (zone?: string) => {
    if (!zone) return '';
    const trimmed = zone.trim();
    return trimmed.toLowerCase().startsWith('khu') ? trimmed : `Khu ${trimmed}`;
  };

  // Format floor to prevent duplicate "Tầng Tầng 1"
  const formatFloorLabel = (floor?: string | number) => {
    if (!floor) return 'Tầng 1';
    const trimmed = String(floor).trim();
    return trimmed.toLowerCase().startsWith('tầng') ? trimmed : `Tầng ${trimmed}`;
  };

  // Copied PIN feedback state
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  const handleCopyPin = async () => {
    if (!masterPin) return;
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(masterPin);
        copied = true;
      }
    } catch (e) {
      console.warn('Clipboard writeText error:', e);
    }
    setCopiedPin(true);
    if (!copied && Platform.OS !== 'web') {
      Alert.alert('Mã PIN buồng kho', `Mã PIN của bạn là: ${masterPin}\n(Bấm phím # trên khóa sau khi nhập PIN)`);
    }
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleOpenDirections = () => {
    const address = activeUnit?.facilityAddress || 'SelfStorage Việt Nam';
    const query = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    if (url) {
      Linking.openURL(url).catch((err) => console.warn('Could not open map:', err));
    }
  };



  const handleAuthAction = () => {
    if (currentUser) {
      const confirmLogout = () => {
        onLogout?.();
      };
      if (Platform.OS === 'web') {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
          confirmLogout();
        }
      } else {
        Alert.alert(
          'Đăng xuất',
          `Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${currentUser.fullName || currentUser.email || ''}?`,
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: confirmLogout },
          ]
        );
      }
    } else {
      onOpenLogin?.();
    }
  };

  // ─── Trạng thái hợp đồng & tiến độ hiển thị ở trang chi tiết ───────────
  const rentalStatusTone =
    activeUnit?.status === 'overdue'
      ? { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#dc2626' }
      : activeUnit?.status === 'expiring_soon'
      ? { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' }
      : activeUnit?.status === 'checking_out'
      ? { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#2563eb' }
      : activeUnit?.status === 'terminated'
      ? { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' }
      : { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', dot: '#10b981' };

  const rentalStatusText =
    activeUnit?.statusLabel ||
    (activeUnit?.status === 'overdue'
      ? 'Quá hạn thanh toán'
      : activeUnit?.status === 'expiring_soon'
      ? 'Sắp hết hạn'
      : activeUnit?.status === 'checking_out'
      ? 'Chờ nghiệm thu trả kho'
      : activeUnit?.status === 'terminated'
      ? 'Đã kết thúc'
      : 'Đang hoạt động');

  const totalDaysForProgress = activeUnit?.totalDays || 0;
  const remainingPercent =
    totalDaysForProgress > 0
      ? Math.max(0, Math.min(1, (activeUnit?.daysRemaining ?? 0) / totalDaysForProgress))
      : 0;

  const isReturnDisabled =
    !activeUnit ||
    !onOpenReturn ||
    activeUnit.status === 'checking_out' ||
    activeUnit.status === 'terminated';

  return (
    <View style={s.outerWrapper}>
      <View style={s.mobileContainer}>
        {/* TOP APP BAR (ĐỒNG BỘ 100% VỚI LOGO WEB VÀ STITCH UI) */}
        <View style={s.topAppBar}>
          <View style={s.brandRow}>
            {viewMode === 'detail' ? (
              <TouchableOpacity
                style={s.headerBackBtn}
                onPress={() => setViewMode('grid')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back-ios" size={16} color="#0f172a" />
                <Text style={s.headerBackBtnText}>Quay lại danh sách kho</Text>
              </TouchableOpacity>
            ) : (
              <Image
                source={require('../../../assets/logo.png')}
                style={s.topLogoImg}
                resizeMode="contain"
              />
            )}
          </View>

          <View style={s.topActionsRow}>
            {!currentUser && onOpenLogin && (
              <TouchableOpacity
                style={s.loginHeaderBtn}
                onPress={handleAuthAction}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="login"
                  size={16}
                  color={T.onSurface}
                />
                <Text
                  style={s.loginHeaderText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Đăng nhập
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={s.notifBtn}
              activeOpacity={0.8}
              onPress={onOpenNotifications}
            >
              <MaterialIcons name="notifications-none" size={20} color={T.onSurfaceVariant} />
              {unreadNotifCount > 0 ? (
                <View style={s.notifBadgeDot}>
                  <Text style={s.notifBadgeCountText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={T.primaryContainer}
            />
          }
        >
          {viewMode === 'grid' ? (
            /* VIEW 1: LƯỚI TẤT CẢ CÁC KHO (2 KHO MỖI HÀNG) */
            <View style={s.sectionWrap}>
              <View style={s.unitCarouselHeader}>
                <View style={s.carouselTitleWrap}>
                  <Text style={s.unitCarouselTitle}>KHO ĐANG KÍCH HOẠT</Text>
                  <View style={s.unitCountBadge}>
                    <Text style={s.unitCountBadgeText}>{units.length} buồng</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.rentMoreBtn}
                  activeOpacity={0.7}
                  onPress={() =>
                    onRentMoreUnits ? onRentMoreUnits() : onNavigateBottomTab?.('search')
                  }
                >
                  <MaterialIcons name="add-circle-outline" size={16} color={T.primary} />
                  <Text style={s.rentMoreBtnText}>Thuê thêm</Text>
                </TouchableOpacity>
              </View>

              {units.length === 0 ? (
                <View style={s.emptyUnitsBox}>
                  <MaterialIcons name="inventory-2" size={36} color={T.outline} />
                  <Text style={s.emptyUnitsText}>Bạn chưa thuê kho nào</Text>
                  <TouchableOpacity
                    style={s.emptyUnitsBtn}
                    onPress={() =>
                      onRentMoreUnits ? onRentMoreUnits() : onNavigateBottomTab?.('search')
                    }
                  >
                    <Text style={s.emptyUnitsBtnText}>+ Thuê kho ngay</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.twoColGrid}>
                  {units.map((unit, index) => {
                    return (
                      <TouchableOpacity
                        key={unit.id || index}
                        style={s.gridCard}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedUnitIndex(index);
                          setViewMode('detail', index);
                        }}
                      >
                        {/* Card Header: Icon & Status */}
                        <View style={s.gridCardTop}>
                          <View style={s.gridCardIconWrap}>
                            <MaterialIcons name="meeting-room" size={20} color={T.primary} />
                          </View>
                          <View style={[
                            s.gridStatusBadge,
                            unit.status === 'overdue' && { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
                            unit.status === 'expiring_soon' && { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                          ]}>
                            <Text style={[
                              s.gridStatusText,
                              unit.status === 'overdue' && { color: '#dc2626' },
                              unit.status === 'expiring_soon' && { color: '#d97706' },
                            ]}>
                              {unit.statusLabel || (unit.status === 'expiring_soon' ? 'Sắp hết hạn' : 'Đang hoạt động')}
                            </Text>
                          </View>
                        </View>

                        {/* Title & Info */}
                        <Text style={s.gridUnitTitle} numberOfLines={1}>
                          Buồng #{unit.unitCode}
                        </Text>
                        <Text style={s.gridUnitSize} numberOfLines={1}>
                          {unit.size} · {unit.unitName || 'Kho tự quản'}
                        </Text>

                        <View style={s.gridMetaRow}>
                          <MaterialIcons name="location-on" size={12} color="#64748b" />
                          <Text style={s.gridMetaText} numberOfLines={1}>
                            {unit.facilityName.split(' ')[0]} • {formatFloorLabel(unit.floor)}
                          </Text>
                        </View>

                        <View style={s.gridMetaRow}>
                          <MaterialIcons name="access-time" size={12} color="#64748b" />
                          <Text style={s.gridMetaText}>
                            Còn lại: {unit.daysRemaining ?? 30} ngày
                          </Text>
                        </View>

                        {/* Chi tiết Button */}
                        <TouchableOpacity
                          style={s.gridDetailBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedUnitIndex(index);
                            setViewMode('detail', index);
                          }}
                        >
                          <MaterialIcons name="visibility" size={14} color={T.primary} style={{ marginRight: 4 }} />
                          <Text style={s.gridDetailBtnText}>Chi tiết</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            /* VIEW 2: CHI TIẾT BUỒNG KHO */
            <View style={s.detailContent}>

              {/* HERO: THÔNG TIN BUỒNG KHO */}
              <View style={s.detailHero}>
                <View style={s.heroGlowLarge} />
                <View style={s.heroGlowSmall} />

                <View style={s.heroTopRow}>
                  <View
                    style={[
                      s.heroStatusPill,
                      { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)' },
                    ]}
                  >
                    <View style={[s.heroStatusDot, { backgroundColor: rentalStatusTone.dot }]} />
                    <Text style={s.heroStatusText} numberOfLines={1}>
                      {rentalStatusText}
                    </Text>
                  </View>
                </View>

                <Text
                  style={s.heroUnitCode}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  #{activeUnit?.unitCode || '—'}
                </Text>
                <Text style={s.heroUnitName} numberOfLines={1}>
                  {(activeUnit?.unitName || 'Kho tự quản').split('(')[0].trim()} ·{' '}
                  {activeUnit?.size || 'Tiêu chuẩn'}
                </Text>

                <View style={s.heroChipsRow}>
                  <View style={s.heroChip}>
                    <MaterialIcons name="layers" size={13} color="#dbeafe" />
                    <Text style={s.heroChipText} numberOfLines={1}>
                      {formatFloorLabel(activeUnit?.floor)} ·{' '}
                      {(formatZoneLabel(activeUnit?.zone) || 'Khu tiêu chuẩn')
                        .split('(')[0]
                        .trim()}
                    </Text>
                  </View>
                  <View style={s.heroChip}>
                    <MaterialIcons name="schedule" size={13} color="#dbeafe" />
                    <Text style={s.heroChipText} numberOfLines={1}>
                      Còn {activeUnit?.daysRemaining ?? 0} ngày
                    </Text>
                  </View>
                </View>

                <View style={s.heroAddressRow}>
                  <MaterialIcons name="place" size={14} color="rgba(219,234,254,0.85)" />
                  <Text style={s.heroAddressText} numberOfLines={1}>
                    {activeUnit?.facilityAddress ||
                      '375 Võ Nguyên Giáp, P. An Khánh, TP. Thủ Đức'}
                  </Text>
                </View>
              </View>

              {/* THẺ MÃ PIN MỞ KHÓA */}
              <View style={s.accessCard}>
                <View style={s.accessCardHeader}>
                  <View style={s.accessIconWrap}>
                    <MaterialIcons name="lock" size={20} color={T.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.accessTitle} numberOfLines={1}>
                      Mã PIN mở khóa
                    </Text>
                    <Text style={s.accessSub} numberOfLines={1}>
                      Dùng mã này tại khóa Smart Lock
                    </Text>
                  </View>
                  <View
                    style={[
                      s.accessLivePill,
                      activeUnit?.smartLockStatus === 'OFFLINE' && {
                        backgroundColor: '#f8fafc',
                        borderColor: '#e2e8f0',
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.accessLiveDot,
                        activeUnit?.smartLockStatus === 'OFFLINE' && { backgroundColor: '#94a3b8' },
                      ]}
                    />
                    <Text
                      style={[
                        s.accessLiveText,
                        activeUnit?.smartLockStatus === 'OFFLINE' && { color: '#64748b' },
                      ]}
                    >
                      {activeUnit?.smartLockStatus === 'OFFLINE' ? 'Offline' : 'Online'}
                    </Text>
                  </View>
                </View>

                <View style={s.pinDisplayRow}>
                  <Text
                    style={s.pinDisplayValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {loadingSmartLock
                      ? 'Đang tải...'
                      : isPinVisible
                      ? masterPin || '—'
                      : maskedPin}
                  </Text>
                  <View style={s.pinActionBtns}>
                    <TouchableOpacity
                      style={s.pinIconBtn}
                      activeOpacity={0.75}
                      onPress={() => setIsPinVisible((prev) => !prev)}
                      accessibilityLabel={isPinVisible ? 'Ẩn mã PIN' : 'Xem mã PIN'}
                    >
                      <MaterialIcons
                        name={isPinVisible ? 'visibility-off' : 'visibility'}
                        size={17}
                        color="#475569"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.pinIconBtn, copiedPin && s.pinIconBtnSuccess]}
                      activeOpacity={0.75}
                      onPress={handleCopyPin}
                      accessibilityLabel="Sao chép mã PIN"
                    >
                      <MaterialIcons
                        name={copiedPin ? 'check' : 'content-copy'}
                        size={16}
                        color={copiedPin ? '#047857' : '#475569'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.pinHintRow}>
                  <MaterialIcons name="touch-app" size={14} color={T.outline} />
                  <Text style={s.pinHintText} numberOfLines={1}>
                    Nhập PIN rồi bấm phím # trên khóa
                  </Text>
                </View>
              </View>

              {/* THAO TÁC NHANH */}
              <View style={s.quickActionGrid}>
                <TouchableOpacity
                  style={s.quickActionTile}
                  activeOpacity={0.85}
                  onPress={() => onOpenChangePin?.(activeUnit)}
                >
                  <View style={[s.quickActionIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons name="pin" size={19} color="#2563eb" />
                  </View>
                  <Text style={s.quickActionTileTitle} numberOfLines={1}>
                    Đổi PIN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.quickActionTile}
                  activeOpacity={0.85}
                  onPress={() => onOpenRenew(activeUnit)}
                >
                  <View style={[s.quickActionIconCircle, { backgroundColor: '#f0fdf4' }]}>
                    <MaterialCommunityIcons name="autorenew" size={19} color="#16a34a" />
                  </View>
                  <Text style={s.quickActionTileTitle} numberOfLines={1}>
                    Gia hạn
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.quickActionTile}
                  activeOpacity={0.85}
                  onPress={() => onOpenReportIssue(activeUnit)}
                >
                  <View style={[s.quickActionIconCircle, { backgroundColor: '#fef2f2' }]}>
                    <MaterialIcons name="build" size={19} color="#dc2626" />
                  </View>
                  <Text style={s.quickActionTileTitle} numberOfLines={1}>
                    Báo sự cố
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.quickActionTile}
                  activeOpacity={0.85}
                  onPress={handleOpenDirections}
                >
                  <View style={[s.quickActionIconCircle, { backgroundColor: '#f8fafc' }]}>
                    <MaterialIcons name="directions" size={19} color="#475569" />
                  </View>
                  <Text style={s.quickActionTileTitle} numberOfLines={1}>
                    Chỉ đường
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CTA TRẢ KHO & THANH LÝ HỢP ĐỒNG */}
              <TouchableOpacity
                style={[s.returnCard, isReturnDisabled && s.returnCardDisabled]}
                activeOpacity={0.85}
                disabled={isReturnDisabled}
                onPress={() => {
                  if (activeUnit && onOpenReturn) onOpenReturn(activeUnit);
                }}
              >
                <View
                  style={[
                    s.returnIconWrap,
                    isReturnDisabled && { backgroundColor: '#f1f5f9' },
                  ]}
                >
                  <MaterialIcons
                    name={
                      activeUnit?.status === 'checking_out' || activeUnit?.status === 'terminated'
                        ? 'check-circle-outline'
                        : 'logout'
                    }
                    size={20}
                    color={isReturnDisabled ? '#94a3b8' : '#b45309'}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[s.returnTitle, isReturnDisabled && { color: '#64748b' }]}
                    numberOfLines={1}
                  >
                    {activeUnit?.status === 'terminated'
                      ? 'Hợp đồng đã kết thúc'
                      : activeUnit?.status === 'checking_out'
                      ? 'Đã gửi yêu cầu trả kho'
                      : 'Trả kho'}
                  </Text>
                  <Text style={s.returnSub} numberOfLines={2}>
                    {activeUnit?.status === 'terminated'
                      ? 'Buồng kho này không còn trong hợp đồng thuê.'
                      : activeUnit?.status === 'checking_out'
                      ? activeUnit.returnDate
                        ? `Đã hẹn ${activeUnit.returnDate}${
                            activeUnit.returnTimeSlot ? ` · ${activeUnit.returnTimeSlot}` : ''
                          }. Nhân viên sẽ nghiệm thu hiện trạng.`
                        : 'Yêu cầu đang chờ nhân viên nghiệm thu hiện trạng.'
                      : 'Gửi yêu cầu trả kho & thanh lý hợp đồng.'}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={isReturnDisabled ? '#cbd5e1' : '#b45309'}
                />
              </TouchableOpacity>

              {/* HỢP ĐỒNG THUÊ */}
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>Hợp đồng thuê</Text>
                  <TouchableOpacity
                    style={s.sectionLinkBtn}
                    activeOpacity={0.7}
                    onPress={() => setShowContractModal(true)}
                  >
                    <Text style={s.sectionLinkText}>Xem hợp đồng</Text>
                    <MaterialIcons name="chevron-right" size={16} color={T.primary} />
                  </TouchableOpacity>
                </View>

                <View style={s.contractPanel}>
                  <View style={s.contractTopRow}>
                    <View style={s.contractCodePill}>
                      <MaterialIcons name="description" size={13} color="#1d4ed8" />
                      <Text style={s.contractCodeText} numberOfLines={1}>
                        {activeUnit?.contractCode || '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.contractStatGrid}>
                    <View style={s.contractStatCell}>
                      <Text style={s.contractStatCellLabel} numberOfLines={1}>
                        Diện tích
                      </Text>
                      <Text style={s.contractStatCellValue} numberOfLines={1}>
                        {(activeUnit?.size || 'Tiêu chuẩn').split('(')[0].trim()}
                      </Text>
                    </View>

                    <View style={s.contractStatCell}>
                      <Text style={s.contractStatCellLabel} numberOfLines={1}>
                        Thời hạn
                      </Text>
                      <Text style={s.contractStatCellValue} numberOfLines={1}>
                        {activeUnit?.totalDays
                          ? `${Math.max(1, Math.round(activeUnit.totalDays / 30))} tháng`
                          : '—'}
                      </Text>
                    </View>

                    <View style={s.contractStatCell}>
                      <Text style={s.contractStatCellLabel} numberOfLines={1}>
                        Còn lại
                      </Text>
                      <Text
                        style={[s.contractStatCellValue, { color: rentalStatusTone.text }]}
                        numberOfLines={1}
                      >
                        {activeUnit?.daysRemaining ?? 0} ngày
                      </Text>
                    </View>
                  </View>

                  <View style={s.contractProgressWrap}>
                    <View style={s.contractProgressLabelRow}>
                      <Text style={s.contractProgressLabel} numberOfLines={1}>
                        Số ngày thuê
                      </Text>
                      <Text style={s.contractProgressValue} numberOfLines={1}>
                        {activeUnit?.daysRemaining ?? 0}/{totalDaysForProgress || 0} ngày
                      </Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View
                        style={[
                          s.progressFill,
                          { flex: Math.max(remainingPercent, 0.02) },
                        ]}
                      />
                      <View style={{ flex: Math.max(1 - remainingPercent, 0.0001) }} />
                    </View>
                    <View style={s.contractDatesRow}>
                      <Text style={s.contractDateText} numberOfLines={1}>
                        Bắt đầu: {activeUnit?.startDate || '—'}
                      </Text>
                      <Text style={s.contractDateDot}>·</Text>
                      <Text style={s.contractDateText} numberOfLines={1}>
                        Kết thúc: {activeUnit?.endDate || '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* BOTTOM NAVIGATION BAR */}
        <CustomerBottomNavBar
          activeTab="my-storage"
          onSelectTab={(tab) => {
            if (onNavigateBottomTab) {
              onNavigateBottomTab(tab);
            }
          }}
        />

      {/* Modal Xem Hợp Đồng Điện Tử */}
      <ContractPreviewModal
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
        appointment={contractAppointmentData}
        assignedUnitCode={activeUnit?.unitCode}
      />

      </View>
    </View>
  );
}

// ─── STYLESHEET ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  headerBackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridStatusBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  gridUnitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  gridUnitSize: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  gridMetaText: {
    fontSize: 10.5,
    color: '#64748b',
  },
  gridDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  gridDetailBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563eb',
  },
  backToGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  backToGridBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  outerWrapper: { flex: 1, backgroundColor: '#f8fafc', width: '100%', alignItems: 'center' },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: T.background,
    position: 'relative',
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 14,
    paddingBottom: 12,
    backgroundColor: T.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: T.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  topLogoImg: {
    height: 26,
    width: 88,
  },
  brandIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  greetingSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '800',
    color: T.onSurface,
    flexShrink: 1,
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    flexShrink: 0,
  },
  greetingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  brandLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  brandLocationText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    fontWeight: '600',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  loginHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    maxWidth: 105,
    flexShrink: 0,
  },
  logoutHeaderBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  loginHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.onSurface,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
    gap: 16,
  },
  detailContent: {
    gap: 14,
  },

  // Section
  sectionWrap: { gap: 8 },

  // Unit carousel
  unitCarouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitCarouselTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: T.outline,
    letterSpacing: 0.8,
  },
  rentMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rentMoreBtnText: { fontSize: 12, fontWeight: '600', color: T.primary },
  unitTabsScroll: { gap: 10, paddingBottom: 2 },
  unitTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 185,
    borderRadius: 14,
    backgroundColor: T.surfaceContainerLowest,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitTabItemActive: { borderWidth: 2, borderColor: T.primaryContainer },
  unitTabItemInactive: {
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.6)',
    opacity: 0.85,
  },
  activePingDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primaryContainer,
  },
  unitTabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitTabIconWrapActive: { backgroundColor: T.surfaceContainerHigh },
  unitTabIconWrapInactive: { backgroundColor: T.surfaceContainerLow },
  unitTabCode: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  unitTabCodeActive: { color: T.onSurface },
  unitTabCodeInactive: { color: T.onSurfaceVariant },
  unitTabSub: { fontSize: 11, color: T.onSurfaceVariant },

  // Empty units
  emptyUnitsBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.4)',
  },
  emptyUnitsText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  emptyUnitsBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.primaryContainer,
  },
  emptyUnitsBtnText: { color: T.white, fontSize: 12, fontWeight: '700' },

  // Smart panel
  smartPanelCard: {
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.4)',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  facilityLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  facilityLocText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  protocolText: { fontSize: 10, color: T.outline },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(91, 184, 254, 0.4)',
  },
  securityTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: T.primary,
    letterSpacing: 0.2,
  },

  // Shortcuts
  shortcutsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.4)',
    paddingTop: 10,
    gap: 8,
  },
  shortcutBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.surface,
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  shortcutSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 1,
  },

  // Inventory
  inventoryCard: {
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.4)',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inventoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.3)',
    paddingBottom: 10,
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.onSurface,
  },
  inventorySub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 2,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: T.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
  },
  inventoryEmptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  inventoryEmptyText: {
    fontSize: 12,
    color: T.outline,
    textAlign: 'center',
    lineHeight: 17,
  },
  inventoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.3)',
  },
  inventoryItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: T.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
  },
  inventoryItemNotes: {
    fontSize: 10,
    color: T.outline,
    marginTop: 1,
  },
  itemActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Contract
  contractCard: {
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.4)',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  contractHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.3)',
    paddingBottom: 10,
  },
  contractCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.onSurface,
  },
  contractCodeSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 1,
  },
  contractActiveBadge: {
    backgroundColor: T.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.emeraldBorder,
    maxWidth: '50%',
    flexShrink: 0,
  },
  contractActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.emeraldText,
  },
  contractStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  contractStatLabel: { fontSize: 11, color: T.outline },
  contractStatValBold: {
    fontSize: 15,
    fontWeight: '700',
    color: T.onSurface,
    marginTop: 2,
  },
  contractStatDates: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  autoPayNote: {
    fontSize: 10,
    color: T.emeraldText,
    fontWeight: '600',
    marginTop: 1,
  },
  contractActionsRow: { flexDirection: 'row', gap: 8 },
  eContractBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(91, 184, 254, 0.4)',
  },
  eContractBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
  },
  renewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: T.primaryContainer,
  },
  renewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.white,
  },

  // Support card
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.4)',
    padding: 14,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
  },
  supportSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 2,
    lineHeight: 15,
  },

  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: T.onSurface,
  },

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItemLabelActive: {
    fontSize: 10,
    fontWeight: '700',
    color: T.primary,
    marginTop: 2,
  },
  navItemLabelInactive: {
    fontSize: 10,
    fontWeight: '500',
    color: T.onSurfaceVariant,
    marginTop: 2,
  },
  activeTabBottomDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.primary,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.3)',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.onSurface,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: T.onSurfaceVariant,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: T.onSurface,
  },
  submitAddBtn: {
    backgroundColor: T.primaryContainer,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitAddBtnText: {
    color: T.white,
    fontSize: 13,
    fontWeight: '700',
  },
  // Unit Specs Card
  unitSpecsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  specsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  specsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  unitTypePill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    maxWidth: '52%',
    flexShrink: 1,
  },
  unitTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  specLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  amenityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0369a1',
  },
  statusPillSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    maxWidth: '100%',
  },
  statusPillGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusPillYellow: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusPillRed: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusPillSmallText: {
    fontSize: 9,
    fontWeight: '700',
  },

  carouselTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  unitCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  smartPassHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  passHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  passLocationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  passMainSection: {
    gap: 4,
    paddingVertical: 2,
  },
  passBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passUnitPrefix: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#2563eb',
  },
  passSizePill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  passSizePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  passUnitTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  passLocationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  passLocationMetaText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  passLocationMetaDot: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  passLocationMetaSub: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
  passPinBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  passPinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passPinLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  passPinLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#334155',
  },
  passPinActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  passPinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  passPinActionBtnSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  passPinActionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  passPinCodeRow: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  passPinCodeValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 7,
    color: '#1d4ed8',
    fontVariant: ['tabular-nums'],
  },
  passPinTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    justifyContent: 'center',
  },
  passPinTipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  quickActionPill: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 4,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  returnUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#b45309',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  returnUnitBtnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  returnUnitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnUnitTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400e',
  },
  returnUnitSub: {
    fontSize: 11,
    color: '#a16207',
    marginTop: 2,
    lineHeight: 15,
  },
  detailHero: {
    backgroundColor: '#1d4ed8',
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    right: -50,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
    flexShrink: 1,
  },
  heroUnitCode: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
    marginTop: 14,
  },
  heroUnitName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(239,246,255,0.92)',
    marginTop: 2,
  },
  heroChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: '100%',
  },
  heroChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#eff6ff',
    flexShrink: 1,
  },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  heroAddressText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(219,234,254,0.85)',
    fontWeight: '500',
  },
  accessCard: {
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195,198,215,0.45)',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  accessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accessIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: T.onSurface,
  },
  accessSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 1,
  },
  accessLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  accessLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  accessLiveText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
  },
  pinDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pinDisplayValue: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#1d4ed8',
    fontVariant: ['tabular-nums'],
  },
  pinActionBtns: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  pinIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIconBtnSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  pinHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  pinHintText: {
    flex: 1,
    fontSize: 10.5,
    color: T.outline,
    fontWeight: '500',
  },
  sectionBlock: { gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  sectionLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: T.primary,
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(195,198,215,0.45)',
    paddingVertical: 10,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickActionTileTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: T.onSurface,
  },
  returnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  returnCardDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  returnIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400e',
  },
  returnSub: {
    fontSize: 10.5,
    color: '#a16207',
    marginTop: 2,
    lineHeight: 14,
  },
  contractPanel: {
    backgroundColor: T.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195,198,215,0.45)',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contractTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contractCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  contractCodeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1d4ed8',
    flexShrink: 1,
  },
  contractStatusPill: {
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
    maxWidth: '48%',
  },
  contractStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  contractStatGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  contractStatCell: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contractStatCellLabel: {
    fontSize: 10,
    color: T.outline,
    fontWeight: '600',
  },
  contractStatCellValue: {
    fontSize: 13,
    fontWeight: '800',
    color: T.onSurface,
    marginTop: 4,
  },
  contractProgressWrap: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 11,
    gap: 7,
  },
  contractProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contractProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.onSurfaceVariant,
    flexShrink: 1,
  },
  contractProgressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: T.primary,
    flexShrink: 0,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: T.primary,
    borderRadius: 4,
    minWidth: 6,
  },
  contractDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractDateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: T.outline,
    flexShrink: 0,
  },
  contractDateDot: {
    fontSize: 10.5,
    color: T.outline,
  },
  supportChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contractStatCol: {
    flex: 1,
    minWidth: 0,
  },
});