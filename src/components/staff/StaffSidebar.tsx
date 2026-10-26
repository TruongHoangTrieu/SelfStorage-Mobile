import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffTab, StaffUser } from '../../types/handover';

interface StaffSidebarProps {
  visible: boolean;
  onClose: () => void;
  activeTab: StaffTab;
  onSelectTab: (tab: StaffTab) => void;
  currentUser: StaffUser;
  pendingCount?: number;
  onSwitchToCustomer: () => void;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

interface NavItemConfig {
  tab: StaffTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: number;
}

export default function StaffSidebar({
  visible,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
  pendingCount = 0,
  onSwitchToCustomer,
  onLogout,
  onOpenNotifications,
  unreadNotifCount = 0,
}: StaffSidebarProps) {
  const navItems: NavItemConfig[] = [
    {
      tab: 'dashboard',
      label: 'Bảng điều khiển',
      icon: 'dashboard',
    },
    {
      tab: 'queue',
      label: 'Hàng đợi nhận kho',
      icon: 'assignment-turned-in',
      badge: pendingCount,
    },
    {
      tab: 'checkout',
      label: 'Trả kho & Thanh lý',
      icon: 'exit-to-app',
    },
    {
      tab: 'facility',
      label: 'Sơ đồ cơ sở & Ô kho',
      icon: 'grid-view',
    },
    {
      tab: 'support',
      label: 'Hỗ trợ & Xử lý sự cố',
      icon: 'support-agent',
    },
    {
      tab: 'settings',
      label: 'Cài đặt & Giao ca',
      icon: 'tune',
    },
  ];

  // Lấy 2 chữ cái đầu làm avatar
  const initials = currentUser.fullName
    ? currentUser.fullName
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : 'NV';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Sidebar Container ở bên TRÁI */}
        <SafeAreaView style={styles.sidebarContainer}>
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Trạng thái cổng nhân viên */}
            <View style={styles.statusPill}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusPillText}>CỔNG NHÂN VIÊN (STAFF PORTAL)</Text>
            </View>
          </View>

          {/* User Profile Card */}
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {currentUser.fullName}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {currentUser.role || 'Nhân viên vận hành'}
                </Text>
              </View>
              <View style={styles.facilityRow}>
                <MaterialIcons name="location-on" size={13} color="#38BDF8" />
                <Text style={styles.userFacility} numberOfLines={1}>
                  {currentUser.facilityName || 'Kho Chi Nhánh'}
                </Text>
              </View>
            </View>
          </View>

          {/* Danh mục điều hướng */}
          <View style={styles.navSectionHeader}>
            <Text style={styles.navSectionLabel}>DANH MỤC VẬN HÀNH</Text>
          </View>

          <ScrollView
            style={styles.navList}
            contentContainerStyle={styles.navListContent}
            showsVerticalScrollIndicator={false}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.tab;
              return (
                <TouchableOpacity
                  key={item.tab}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => {
                    onSelectTab(item.tab);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                    />
                  </View>
                  <Text
                    style={[styles.itemLabel, isActive && styles.itemLabelActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text
                        style={[styles.badgeText, isActive && styles.badgeTextActive]}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  )}
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}

            {/* Mục Thông báo vận hành */}
            {onOpenNotifications && (
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  onClose();
                  onOpenNotifications();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.iconWrapper}>
                  <MaterialIcons name="notifications" size={20} color="#94A3B8" />
                </View>
                <Text style={styles.itemLabel}>Thông báo vận hành</Text>
                {unreadNotifCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                    <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer: Chuyển vai trò & Version */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => {
                onClose();
                onSwitchToCustomer();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.switchIconCircle}>
                <MaterialIcons name="swap-horiz" size={18} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchModeTitle}>Chuyển sang Khách hàng</Text>
                <Text style={styles.switchModeSubtitle}>Đăng xuất & Về trang chủ</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#64748B" />
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="logout" size={16} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Đăng xuất ca trực</Text>
              </TouchableOpacity>
            )}

            <View style={styles.systemInfoRow}>
              <Text style={styles.versionText}>SelfStorage Staff v2.4</Text>
              <View style={styles.versionDot} />
              <Text style={styles.shiftText}>Ca trực 24/7</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Nền mờ bên phải - bấm ra ngoài để đóng */}
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropDismiss: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  sidebarContainer: {
    width: 310,
    maxWidth: '85%',
    backgroundColor: '#0F172A',
    height: '100%',
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoImage: {
    height: 40,
    width: 160,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#004AC6',
    borderWidth: 2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  roleBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  roleBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  userFacility: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },

  navSectionHeader: {
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 6,
  },
  navSectionLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navListContent: {
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#004AC6',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  itemLabel: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13.5,
    fontWeight: '600',
  },
  itemLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#004AC6',
  },
  activeIndicator: {
    position: 'absolute',
    right: 8,
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#090D16',
    gap: 10,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModeTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  switchModeSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  systemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  versionText: {
    color: '#475569',
    fontSize: 10.5,
  },
  versionDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#475569',
  },
  shiftText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '600',
  },
});
