import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckInAppointment, StaffTab, StaffUser } from '../../types/handover';

interface StaffDashboardScreenProps {
  appointments: CheckInAppointment[];
  onNavigateTab: (tab: StaffTab) => void;
  facilityName?: string;
  currentUser?: StaffUser;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
  onLogout?: () => void;
  onSwitchToCustomer?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function StaffDashboardScreen({
  appointments,
  onNavigateTab,
  facilityName = 'Trụ sở chính Thủ Đức',
  currentUser,
  onOpenNotifications,
  unreadNotifCount = 0,
  onLogout,
  onSwitchToCustomer,
  onRefresh,
  isRefreshing = false,
}: StaffDashboardScreenProps) {
  const insets = useSafeAreaInsets();

  const pending = appointments.filter((a) => a.status === 'pending').length;
  const arrived = appointments.filter((a) => a.status === 'arrived').length;
  const inProgress = appointments.filter((a) => a.status === 'in_progress').length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const totalPending = pending + arrived;

  // Lấy 2 chữ cái đầu làm avatar
  const displayName = currentUser?.fullName || 'Nhân Viên';
  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'NV';

  // Định dạng thứ ngày hiện tại
  const now = new Date();
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const todayStr = `${dayNames[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  return (
    <View style={styles.container}>
      {/* ─── Header Xanh Dương Thương Hiệu ─── */}
      <View
        style={[
          styles.blueHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {/* Avatar & Thông tin nhân viên */}
          <View style={styles.userProfileWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.greetingText}>Xin chào,</Text>
              <Text style={styles.userNameText} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.facilityRow}>
                <MaterialIcons name="business" size={12} color="#BFDBFE" />
                <Text style={styles.facilityText} numberOfLines={1}>
                  {facilityName}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Icons bên phải */}
          <View style={styles.headerActions}>
            {onOpenNotifications && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onOpenNotifications}
                activeOpacity={0.7}
              >
                <MaterialIcons name="notifications-none" size={22} color="#FFFFFF" />
                {unreadNotifCount > 0 && (
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {(onLogout || onSwitchToCustomer) && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onLogout || onSwitchToCustomer}
                activeOpacity={0.7}
              >
                <MaterialIcons name="logout" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Thanh ngày hôm nay */}
        <View style={styles.dateBanner}>
          <MaterialIcons name="event" size={14} color="#93C5FD" />
          <Text style={styles.dateBannerText}>Ca trực hôm nay: {todayStr}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollPadding,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#1D4ED8"
              colors={['#1D4ED8']}
            />
          ) : undefined
        }
      >
        {/* ─── Tóm tắt nhanh số liệu Ca Trực (KPI Cards) ─── */}
        <Text style={styles.sectionTitle}>TỔNG QUAN CA TRỰC</Text>
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: '#DBEAFE' }]}
            onPress={() => onNavigateTab('queue')}
            activeOpacity={0.8}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="calendar-today" size={17} color="#1D4ED8" />
            </View>
            <Text style={[styles.kpiValue, { color: '#1D4ED8' }]}>{appointments.length}</Text>
            <Text style={styles.kpiLabel}>Hẹn nhận hôm nay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: '#FEF3C7' }]}
            onPress={() => onNavigateTab('queue')}
            activeOpacity={0.8}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="pending-actions" size={17} color="#D97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{totalPending}</Text>
            <Text style={styles.kpiLabel}>Chờ nhận kho</Text>
          </TouchableOpacity>

          <View style={[styles.kpiCard, { borderColor: '#F3E8FF' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <MaterialIcons name="autorenew" size={17} color="#9333EA" />
            </View>
            <Text style={[styles.kpiValue, { color: '#9333EA' }]}>{inProgress}</Text>
            <Text style={styles.kpiLabel}>Đang làm thủ tục</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#DCFCE7' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <MaterialIcons name="check-circle" size={17} color="#15803D" />
            </View>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{completed}</Text>
            <Text style={styles.kpiLabel}>Đã bàn giao xong</Text>
          </View>
        </View>

        {/* ─── CÁC NÚT ĐIỀU HƯỚNG CHÍNH (THAY THẾ TAB MENU) ─── */}
        <Text style={styles.sectionTitle}>DANH MỤC CHỨC NĂNG VẬN HÀNH</Text>

        <View style={styles.menuCardsContainer}>
          {/* NÚT 1: HÀNG ĐỢI NHẬN KHO */}
          <TouchableOpacity
            style={[styles.actionCard, { borderLeftColor: '#1D4ED8' }]}
            onPress={() => onNavigateTab('queue')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="assignment-turned-in" size={26} color="#1D4ED8" />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Hàng Đợi Nhận Kho</Text>
                {totalPending > 0 && (
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{totalPending} chờ</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDesc}>
                Lịch nhận kho theo ngày, đối chiếu CCCD, bàn giao ô kho & ký hợp đồng điện tử
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {/* NÚT 2: TRẢ KHO & THANH LÝ HỢP ĐỒNG */}
          <TouchableOpacity
            style={[styles.actionCard, { borderLeftColor: '#D97706' }]}
            onPress={() => onNavigateTab('checkout')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="exit-to-app" size={26} color="#D97706" />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Trả Kho & Thanh Lý</Text>
              </View>
              <Text style={styles.cardDesc}>
                Tiếp nhận trả kho, chụp ảnh hiện trạng đối chiếu, kiểm tra tài sản & kết thúc hợp đồng
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {/* NÚT 3: SƠ ĐỒ CƠ SỞ & TRẠNG THÁI Ô KHO */}
          <TouchableOpacity
            style={[styles.actionCard, { borderLeftColor: '#059669' }]}
            onPress={() => onNavigateTab('facility')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="grid-view" size={26} color="#059669" />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Sơ Đồ Cơ Sở & Ô Kho</Text>
              </View>
              <Text style={styles.cardDesc}>
                Xem trực quan sơ đồ mặt bằng, tình trạng ô kho trống, đang thuê hoặc đang bảo trì
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {/* NÚT 4: HỖ TRỢ & XỬ LÝ SỰ CỐ */}
          <TouchableOpacity
            style={[styles.actionCard, { borderLeftColor: '#7C3AED' }]}
            onPress={() => onNavigateTab('support')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: '#F5F3FF' }]}>
              <MaterialIcons name="support-agent" size={26} color="#7C3AED" />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Hỗ Trợ & Xử Lý Sự Cố</Text>
              </View>
              <Text style={styles.cardDesc}>
                Tiếp nhận ticket sự cố từ khách hàng, xử lý mã PIN, ổ khóa và hỗ trợ kỹ thuật tại chỗ
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>

          {/* NÚT 5: CÀI ĐẶT & GIAO CA TRỰC */}
          <TouchableOpacity
            style={[styles.actionCard, { borderLeftColor: '#475569' }]}
            onPress={() => onNavigateTab('settings')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <MaterialIcons name="tune" size={26} color="#475569" />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Cài Đặt & Giao Ca Trực</Text>
              </View>
              <Text style={styles.cardDesc}>
                Xem thông tin tài khoản nhân viên, cấu hình ứng dụng, tổng kết và bàn giao ca làm việc
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ─── Nút chuyển đổi chế độ & Đăng xuất ─── */}
        <View style={styles.footerSection}>
          {onSwitchToCustomer && (
            <TouchableOpacity
              style={styles.switchModeCard}
              onPress={onSwitchToCustomer}
              activeOpacity={0.8}
            >
              <View style={styles.switchIconBox}>
                <MaterialIcons name="swap-horiz" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Chuyển sang Chế độ Khách hàng</Text>
                <Text style={styles.switchSub}>Đăng xuất tài khoản nhân viên và về trang chính</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {onLogout && (
            <TouchableOpacity
              style={styles.logoutFullBtn}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Đăng xuất khỏi Cổng Nhân Viên</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  blueHeader: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userProfileWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userTextCol: {
    flex: 1,
  },
  greetingText: {
    fontSize: 11.5,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  facilityText: {
    fontSize: 11,
    color: '#DBEAFE',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeWrap: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dateBannerText: {
    fontSize: 11.5,
    color: '#EFF6FF',
    fontWeight: '600',
  },

  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // Menu cards list
  menuCardsContainer: {
    gap: 10,
    marginBottom: 18,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4.5,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },

  // Footer
  footerSection: {
    marginTop: 6,
    gap: 10,
  },
  switchModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  switchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  switchSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
});
