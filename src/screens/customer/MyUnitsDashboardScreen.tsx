// src/screens/customer/MyUnitsDashboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { apiRequest } from '../../api';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';

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
  onViewDetail?: (unit: CustomerRentedUnit) => void;
  onOpenGuestPin?: (unit: CustomerRentedUnit) => void;
  onOpenRenew: (unit: CustomerRentedUnit) => void;
  onOpenReportIssue: (unit: CustomerRentedUnit) => void;
  onOpenChangePin?: (unit: CustomerRentedUnit) => void;
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
  onViewDetail,
  onOpenGuestPin,
  onOpenRenew,
  onOpenReportIssue,
  onOpenChangePin,
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
  const activeUnit: CustomerRentedUnit | undefined = units[selectedUnitIndex] || units[0];

  // PIN visibility toggle
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);

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
  }, [activeUnit?.contractId, activeUnit?.unitId]);

  // PIN hiển thị: ưu tiên API → fallback field trong unit
  const masterPin: string =
    smartLockData?.pinCode ||
    smartLockData?.accessCode ||
    smartLockData?.pin ||
    activeUnit?.masterPin ||
    '';

  const maskedPin = masterPin ? `•••• ${masterPin.slice(-4)}` : '••••';



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

  return (
    <View style={s.outerWrapper}>
      <View style={s.mobileContainer}>
        {/* TOP APP BAR (ĐỒNG BỘ 100% VỚI LOGO WEB VÀ STITCH UI) */}
        <View style={s.topAppBar}>
          <View style={s.brandRow}>
            {onOpenSidebar && (
              <TouchableOpacity onPress={onOpenSidebar} style={s.brandIconBtn}>
                <MaterialIcons name="menu" size={22} color={T.primary} />
              </TouchableOpacity>
            )}
            <Image
              source={require('../../../assets/logo.png')}
              style={s.topLogoImg}
              resizeMode="contain"
            />
          </View>

          <View style={s.topActionsRow}>
            {(onOpenLogin || onLogout) && (
              <TouchableOpacity
                style={[s.loginHeaderBtn, currentUser && s.logoutHeaderBtn]}
                onPress={handleAuthAction}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={currentUser ? 'logout' : 'login'}
                  size={16}
                  color={currentUser ? '#DC2626' : T.onSurface}
                />
                <Text
                  style={[
                    s.loginHeaderText,
                    currentUser && {
                      color: '#DC2626',
                      fontWeight: '700',
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentUser ? 'Đăng xuất' : 'Đăng nhập'}
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
          {/* USER GREETING & STATUS CARD */}
          <View style={s.greetingCard}>
            <View style={s.greetingLeft}>
              <View style={s.avatarWrap}>
                <MaterialIcons name="person" size={24} color={T.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.greetingSub}>Xin chào,</Text>
                <Text style={s.greetingName} numberOfLines={1} ellipsizeMode="tail">
                  {currentUser?.fullName || customerName || 'Khách hàng'}
                </Text>
              </View>
            </View>
            <View style={s.greetingBadge}>
              <MaterialIcons name="verified" size={14} color="#16a34a" />
              <Text style={s.greetingBadgeText}>{units.length} buồng kích hoạt</Text>
            </View>
          </View>
          {/* 1. UNIT SELECTOR */}
          <View style={s.sectionWrap}>
            <View style={s.unitCarouselHeader}>
              <Text style={s.unitCarouselTitle}>KHO ĐANG KÍCH HOẠT</Text>
              <TouchableOpacity
                style={s.rentMoreBtn}
                activeOpacity={0.7}
                onPress={() =>
                  onRentMoreUnits ? onRentMoreUnits() : onNavigateBottomTab?.('search')
                }
              >
                <MaterialIcons name="add-circle" size={16} color={T.primary} />
                <Text style={s.rentMoreBtnText}>Thuê thêm buồng</Text>
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.unitTabsScroll}
              >
                {units.map((unit, index) => {
                  const isActive = index === selectedUnitIndex;
                  return (
                    <TouchableOpacity
                      key={unit.id || index}
                      style={[
                        s.unitTabItem,
                        isActive ? s.unitTabItemActive : s.unitTabItemInactive,
                      ]}
                      onPress={() => setSelectedUnitIndex(index)}
                      activeOpacity={0.85}
                    >
                      {isActive && <View style={s.activePingDot} />}
                      <View
                        style={[
                          s.unitTabIconWrap,
                          isActive ? s.unitTabIconWrapActive : s.unitTabIconWrapInactive,
                        ]}
                      >
                        <MaterialIcons
                          name={isActive ? 'inventory-2' : 'meeting-room'}
                          size={18}
                          color={isActive ? T.primary : T.outline}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            s.unitTabCode,
                            isActive ? s.unitTabCodeActive : s.unitTabCodeInactive,
                          ]}
                        >
                          Buồng #{unit.unitCode}
                        </Text>
                        <Text style={s.unitTabSub}>
                          {unit.facilityName.split(' ')[0]} • {unit.size}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 2. SMART ACCESS CONTROL PANEL (Đã bỏ BLE Unlock button) */}
          <View style={s.smartPanelCard}>
            <View style={s.panelHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={s.facilityLocRow}>
                  <MaterialIcons name="location-on" size={15} color={T.primary} />
                  <Text style={s.facilityLocText} numberOfLines={1}>
                    {activeUnit?.facilityAddress || 'Tầng 2 - Lô B, Tòa Tân Thuận, Q.7'}
                  </Text>
                </View>
                
              </View>
              
            </View>

            {/* 3 SHORTCUT BUTTONS */}
            <View style={s.shortcutsGrid}>
              <TouchableOpacity
                style={s.shortcutBtn}
                activeOpacity={0.8}
                onPress={() => onOpenChangePin?.(activeUnit)}
              >
                <View style={s.shortcutIconWrap}>
                  <MaterialIcons name="pin" size={18} color={T.primary} />
                </View>
                <Text style={s.shortcutTitle}>Đổi mã PIN</Text>
                <Text style={s.shortcutSub}>4-8 Chữ số</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.shortcutBtn}
                activeOpacity={0.8}
                onPress={() => setIsPinVisible((prev) => !prev)}
              >
                <View style={s.shortcutIconWrap}>
                  <MaterialIcons
                    name={isPinVisible ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={T.primary}
                  />
                </View>
                <Text style={s.shortcutTitle}>Xem mã PIN</Text>
                <Text
                  style={[
                    s.shortcutSub,
                    { color: T.emeraldText, fontWeight: '700' },
                  ]}
                >
                  {loadingSmartLock
                    ? 'Đang tải...'
                    : isPinVisible
                    ? masterPin || '—'
                    : maskedPin}
                </Text>
              </TouchableOpacity>


            </View>
          </View>

          {/* 2.1 THÔNG SỐ VÀ TIỆN ÍCH BUỒNG KHO */}
          <View style={s.unitSpecsCard}>
            <View style={s.specsHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <MaterialIcons name="tune" size={16} color={T.primary} />
                <Text style={s.specsTitle} numberOfLines={1}>THÔNG SỐ BUỒNG KHO</Text>
              </View>
              <View style={s.unitTypePill}>
                <Text style={s.unitTypePillText} numberOfLines={1}>
                  {activeUnit?.unitName || 'Kho Tiêu Chuẩn'}
                </Text>
              </View>
            </View>

            <View style={s.specsGrid}>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Kích thước (D x R x C)</Text>
                <Text style={s.specVal}>{activeUnit?.dimensions || '2.0m x 1.5m x 2.8m'}</Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Thể tích lưu trữ</Text>
                <Text style={[s.specVal, { color: T.primary, fontWeight: '800' }]}>
                  {activeUnit?.size || '8.4 m³ (Tiêu chuẩn)'}
                </Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Vị trí mặt bằng</Text>
                <Text style={s.specVal}>{activeUnit?.floor || 'Tầng 2'} • {activeUnit?.zone || 'Zone A'}</Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Nhiệt độ bảo quản</Text>
                <Text style={[s.specVal, { color: '#059669' }]}>22°C - 25°C (24/7)</Text>
              </View>
            </View>

            <View style={s.amenitiesList}>
              <View style={s.amenityTag}>
                <MaterialIcons name="ac-unit" size={12} color="#0284C7" />
                <Text style={s.amenityText}>Máy lạnh 24/7</Text>
              </View>
              <View style={s.amenityTag}>
                <MaterialIcons name="videocam" size={12} color="#0284C7" />
                <Text style={s.amenityText}>CCTV 24/7</Text>
              </View>
              <View style={s.amenityTag}>
                <MaterialIcons name="local-fire-department" size={12} color="#0284C7" />
                <Text style={s.amenityText}>PCCC Tự Động</Text>
              </View>
              <View style={s.amenityTag}>
                <MaterialIcons name="lock" size={12} color="#0284C7" />
                <Text style={s.amenityText}>Khóa Thông Minh</Text>
              </View>
            </View>
          </View>

          {/* 3. CHI TIẾT HỢP ĐỒNG */}
          <View style={s.contractCard}>
            <View style={s.contractHeaderRow}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={s.contractCardTitle}>Chi tiết Hợp đồng</Text>
                <Text style={s.contractCodeSub} numberOfLines={1}>
                  Mã HĐ: {activeUnit?.contractCode || '—'}
                </Text>
              </View>
              <View style={[
                s.contractActiveBadge,
                activeUnit?.status === 'overdue' && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                activeUnit?.status === 'expiring_soon' && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
              ]}>
                <Text style={[
                  s.contractActiveBadgeText,
                  activeUnit?.status === 'overdue' && { color: '#DC2626' },
                  activeUnit?.status === 'expiring_soon' && { color: '#D97706' },
                ]} numberOfLines={1}>
                  {activeUnit?.statusLabel || (activeUnit?.status === 'expiring_soon' ? 'Sắp hết hạn' : 'Đang hoạt động')}
                </Text>
              </View>
            </View>

            <View style={s.contractStatsGrid}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.contractStatLabel}>Thời hạn hợp đồng</Text>
                <Text style={s.contractStatValBold}>
                  {activeUnit?.totalDays
                    ? `${Math.round(activeUnit.totalDays / 30)} Tháng`
                    : '—'}
                </Text>
                <Text style={s.contractStatDates} numberOfLines={1}>
                  {activeUnit?.startDate || '—'} - {activeUnit?.endDate || '—'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.contractStatLabel}>Thời gian còn lại</Text>
                <Text style={[
                  s.contractStatValBold,
                  { color: activeUnit?.status === 'overdue' ? '#DC2626' : (activeUnit?.status === 'expiring_soon' ? '#D97706' : T.primary) }
                ]}>
                  {activeUnit?.daysRemaining ?? 0} Ngày
                </Text>
                <View style={[
                  s.statusPillSmall,
                  activeUnit?.status === 'overdue' ? s.statusPillRed : (activeUnit?.status === 'expiring_soon' ? s.statusPillYellow : s.statusPillGreen)
                ]}>
                  <Text style={[
                    s.statusPillSmallText,
                    activeUnit?.status === 'overdue' ? { color: '#B91C1C' } : (activeUnit?.status === 'expiring_soon' ? { color: '#B45309' } : { color: '#047857' })
                  ]} numberOfLines={1}>
                    {activeUnit?.status === 'expiring_soon'
                      ? 'Sắp hết hạn'
                      : activeUnit?.status === 'overdue'
                      ? 'Đã quá hạn'
                      : 'Đang an toàn'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 6 }}>
              <TouchableOpacity
                style={s.renewBtn}
                activeOpacity={0.85}
                onPress={() => onOpenRenew(activeUnit)}
              >
                <MaterialCommunityIcons name="autorenew" size={20} color="#FFFFFF" />
                <Text style={s.renewBtnText}>Gia hạn trực tuyến</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. QUICK SUPPORT (chỉ giữ "Báo sự cố" — có API) */}
          <View style={s.sectionWrap}>
            <Text style={s.sectionHeading}>Hỗ trợ</Text>
            <TouchableOpacity
              style={s.supportCard}
              activeOpacity={0.85}
              onPress={() => onOpenReportIssue(activeUnit)}
            >
              <View style={s.supportIconWrap}>
                <MaterialIcons name="support-agent" size={22} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.supportTitle}>Tạo yêu cầu sự cố</Text>
                <Text style={s.supportSub}>
                  Báo cáo hư hỏng, sự cố khóa, hoặc yêu cầu hỗ trợ kỹ thuật
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={T.outline} />
            </TouchableOpacity>
          </View>
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

      </View>
    </View>
  );
}

// ─── STYLESHEET ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
    height: 56,
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
});