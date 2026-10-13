import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { StaffTab, StaffUser } from '../../types/handover';

interface StaffSidebarProps {
  visible: boolean;
  onClose: () => void;
  activeTab: StaffTab;
  onSelectTab: (tab: StaffTab) => void;
  currentUser: StaffUser;
  pendingCount?: number;
  onSwitchToCustomer: () => void;
}

export default function StaffSidebar({
  visible,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
  pendingCount = 4,
  onSwitchToCustomer,
}: StaffSidebarProps) {
  const navItems: { tab: StaffTab; label: string; icon: string; badge?: number }[] = [
    { tab: 'dashboard', label: 'Bảng điều khiển', icon: '📊' },
    { tab: 'queue', label: 'Hàng đợi nhận kho', icon: '📥', badge: pendingCount },
    { tab: 'checkout', label: 'Trả kho / Thanh lý', icon: '📤' },
    { tab: 'facility', label: 'Sơ đồ cơ sở & Ô kho', icon: '🗺️' },
    { tab: 'support', label: 'Hỗ trợ & Sự cố', icon: '🛠️' },
    { tab: 'settings', label: 'Cài đặt ca trực', icon: '⚙️' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        
        <SafeAreaView style={styles.sidebarContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandIcon}>📦</Text>
              <View>
                <Text style={styles.brandTitle}>SelfStorage</Text>
                <Text style={styles.brandSubtitle}>CỔNG NHÂN VIÊN (STAFF)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile Mini Badge */}
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>NV</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{currentUser.fullName}</Text>
              <Text style={styles.userRole}>Vai trò: {currentUser.role}</Text>
              <Text style={styles.userFacility} numberOfLines={1}>📍 {currentUser.facilityName}</Text>
            </View>
          </View>

          {/* Nav Items List */}
          <View style={styles.navList}>
            <Text style={styles.navSectionLabel}>TÁC VỤ VẬN HÀNH HÀNG NGÀY</Text>
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
                >
                  <Text style={styles.itemIcon}>{item.icon}</Text>
                  <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                    {item.label}
                  </Text>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => {
                onClose();
                onSwitchToCustomer();
              }}
            >
              <Text style={styles.switchModeIcon}>🔄</Text>
              <Text style={styles.switchModeText}>Chuyển sang Chế độ Khách hàng</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>SelfStorage Mobile Staff v1.2.0 • 2026</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row',
  },
  dismissArea: {
    flex: 1,
  },
  sidebarContainer: {
    width: 310,
    backgroundColor: '#0F172A',
    height: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    fontSize: 26,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  userName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '800',
  },
  userRole: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  userFacility: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  navSectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#2563EB',
  },
  itemIcon: {
    fontSize: 20,
  },
  itemLabel: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  itemLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#2563EB',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchModeIcon: {
    fontSize: 16,
  },
  switchModeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  versionText: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
  },
});
