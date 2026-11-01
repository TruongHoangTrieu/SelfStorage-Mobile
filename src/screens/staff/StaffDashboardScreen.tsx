import React, { useMemo } from 'react';
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
import { INITIAL_RETURN_ORDERS, INITIAL_SUPPORT_TICKETS } from '../../data/mockStaffData';

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

  // 1. Số khách cần giao kho hôm nay (chờ hoặc đã đến, hoặc tổng các đơn nhận hôm nay)
  const pendingHandover = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'arrived'
  ).length;
  const handoverCount = pendingHandover > 0 ? pendingHandover : appointments.length;

  // 2. Số khách cần trả kho hôm nay
  const returnCount = useMemo(() => {
    return INITIAL_RETURN_ORDERS.filter(
      (o) => o.returnType === 'today' && o.status !== 'TERMINATED'
    ).length || 1;
  }, []);

  // 3. Số sự cố cần trợ giúp
  const supportCount = useMemo(() => {
    return INITIAL_SUPPORT_TICKETS.filter(
      (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    ).length || 2;
  }, []);

  // Tên nhân viên hiển thị: LOẠI BỎ TRIỆT ĐỂ DẤU NGOẶC (ví dụ "Nguyễn Văn Staff (Kho A)" -> "Nguyễn Văn Staff")
  const rawDisplayName = currentUser?.fullName || 'Nhân Viên';
  const cleanDisplayName = rawDisplayName.replace(/\s*\([^)]*\)/g, '').trim() || 'Nhân Viên';

  // Lấy 2 chữ cái đầu làm avatar
  const initials = cleanDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'NV';

  // Danh sách các chức năng vận hành dạng lưới 3 cột (ĐÃ BỎ "GIAO CA")
  const gridMenuItems = [
    {
      id: 'queue',
      title: 'Nhận kho',
      icon: 'assignment-turned-in' as const,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      badge: handoverCount,
      onPress: () => onNavigateTab('queue'),
    },
    {
      id: 'checkout',
      title: 'Trả kho',
      icon: 'exit-to-app' as const,
      color: '#D97706',
      bgColor: '#FEF3C7',
      badge: returnCount,
      onPress: () => onNavigateTab('checkout'),
    },
    {
      id: 'facility',
      title: 'Ô kho',
      icon: 'grid-view' as const,
      color: '#059669',
      bgColor: '#ECFDF5',
      badge: 0,
      onPress: () => onNavigateTab('facility'),
    },
    {
      id: 'support',
      title: 'Sự cố',
      icon: 'support-agent' as const,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      badge: supportCount,
      onPress: () => onNavigateTab('support'),
    },
    {
      id: 'notifications',
      title: 'Thông báo',
      icon: 'notifications' as const,
      color: '#E11D48',
      bgColor: '#FFE4E6',
      badge: unreadNotifCount,
      onPress: () => onOpenNotifications && onOpenNotifications(),
    },
  ];

  return (
    <View style={styles.container}>
      {/* ─── Header Xanh Dương Thương Hiệu (Safe Area chống tràn) ─── */}
      <View
        style={[
          styles.blueHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {/* Avatar & Chỉ hiển thị Tên nhân viên sạch sẽ (Không ngoặc, không "Xin chào", không tên kho kèm bên) */}
          <View style={styles.userProfileWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {cleanDisplayName}
              </Text>
              <Text style={styles.roleSubText}>Nhân viên vận hành</Text>
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

        {/* ─── HIỂN THỊ ĐẦY ĐỦ TÊN TRỤ SỞ Ở DƯỚI (KHÔNG BỊ CẮT CHỮ) ─── */}
        <View style={styles.facilityFullCard}>
          <View style={styles.facilityIconWrap}>
            <MaterialIcons name="location-on" size={18} color="#1D4ED8" />
          </View>
          <View style={styles.facilityTextWrap}>
            <Text style={styles.facilitySubLabel}>CƠ SỞ VẬN HÀNH</Text>
            <Text style={styles.facilityNameFullText}>
              {facilityName}
            </Text>
          </View>
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
        {/* ─── TỔNG QUAN NGÀY HÔM NAY (3 CHỈ SỐ THEO YÊU CẦU) ─── */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionHeaderTitle}>TỔNG QUAN HÔM NAY</Text>
          <View style={styles.summaryRow}>
            {/* 1. Khách cần giao kho */}
            <TouchableOpacity
              style={[styles.summaryCard, { borderColor: '#BFDBFE' }]}
              onPress={() => onNavigateTab('queue')}
              activeOpacity={0.8}
            >
              <View style={[styles.summaryIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <MaterialIcons name="assignment-turned-in" size={18} color="#1D4ED8" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#1D4ED8' }]}>
                {handoverCount}
              </Text>
              <Text style={styles.summaryCardLabel}>
                Khách cần giao kho
              </Text>
            </TouchableOpacity>

            {/* 2. Khách cần trả kho */}
            <TouchableOpacity
              style={[styles.summaryCard, { borderColor: '#FED7AA' }]}
              onPress={() => onNavigateTab('checkout')}
              activeOpacity={0.8}
            >
              <View style={[styles.summaryIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <MaterialIcons name="exit-to-app" size={18} color="#EA580C" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#EA580C' }]}>
                {returnCount}
              </Text>
              <Text style={styles.summaryCardLabel}>
                Khách cần trả kho
              </Text>
            </TouchableOpacity>

            {/* 3. Sự cố cần trợ giúp */}
            <TouchableOpacity
              style={[styles.summaryCard, { borderColor: '#DDD6FE' }]}
              onPress={() => onNavigateTab('support')}
              activeOpacity={0.8}
            >
              <View style={[styles.summaryIconWrap, { backgroundColor: '#F5F3FF' }]}>
                <MaterialIcons name="support-agent" size={18} color="#7C3AED" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#7C3AED' }]}>
                {supportCount}
              </Text>
              <Text style={styles.summaryCardLabel}>
                Sự cố cần trợ giúp
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── DẠNG LƯỚI 3 CỘT (GRID VIEW NHƯ ẢNH MẪU - ĐÃ BỎ GIAO CA) ─── */}
        <Text style={styles.sectionHeaderTitle}>CHỨC NĂNG VẬN HÀNH</Text>
        <View style={styles.gridContainer}>
          {gridMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              {/* Badge số lượng ở góc trên bên phải của ô */}
              {item.badge > 0 && (
                <View style={styles.gridBadge}>
                  <Text style={styles.gridBadgeText}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}

              {/* Icon tròn nhạt màu */}
              <View style={[styles.gridIconWrap, { backgroundColor: item.bgColor }]}>
                <MaterialIcons name={item.icon} size={28} color={item.color} />
              </View>

              {/* Nhãn chức năng ngắn gọn ở dưới (không có mô tả) */}
              <Text style={styles.gridItemTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Nút chuyển sang Khách hàng & Đăng xuất ─── */}
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
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleSubText: {
    fontSize: 11.5,
    color: '#BFDBFE',
    fontWeight: '500',
    marginTop: 1,
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

  // Thẻ hiển thị đầy đủ tên trụ sở
  facilityFullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  facilityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityTextWrap: {
    flex: 1,
  },
  facilitySubLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  facilityNameFullText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
    marginTop: 1,
    lineHeight: 18,
  },

  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingTop: 16,
  },

  // ─── TỔNG QUAN NGÀY HÔM NAY (3 THẺ CÂN ĐỐI) ───
  summarySection: {
    marginBottom: 18,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  summaryCardLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ─── DẠNG LƯỚI 3 CỘT (GRID LAYOUT NHƯ ẢNH MẪU) ───
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
    marginBottom: 20,
  },
  gridItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  gridIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  gridBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  gridBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Footer
  footerSection: {
    marginTop: 4,
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
