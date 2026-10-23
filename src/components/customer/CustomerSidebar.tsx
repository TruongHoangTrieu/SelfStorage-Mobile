import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { CustomerTab } from '../../types/customerStorage';
import { CURRENT_CUSTOMER_USER } from '../../data/mockCustomerStorageData';

interface CustomerSidebarProps {
  visible: boolean;
  onClose: () => void;
  activeTab: CustomerTab;
  onSelectTab: (tab: CustomerTab) => void;
  rentedUnitsCount?: number;
  onSwitchToStaff?: () => void;
  onOpenAiAssistant?: () => void;
}

export default function CustomerSidebar({
  visible,
  onClose,
  activeTab,
  onSelectTab,
  rentedUnitsCount = 2,
  onSwitchToStaff,
  onOpenAiAssistant,
}: CustomerSidebarProps) {
  const menuItems: { id: CustomerTab; icon: string; label: string; badge?: string }[] = [
    { id: 'my_units', icon: '🏠', label: 'Kho của tôi', badge: `${rentedUnitsCount} ô` },
    { id: 'payments', icon: '💳', label: 'Thanh toán & Hóa đơn' },
    { id: 'documents', icon: '📄', label: 'Tài liệu & Hợp đồng' },
    { id: 'support', icon: '🎧', label: 'Hỗ trợ & Trợ giúp' },
    { id: 'profile', icon: '👤', label: 'Hồ sơ & Cài đặt' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sidebarContainer}>
          {/* Header Customer Profile */}
          <View style={styles.profileHeader}>
            <View style={{ marginBottom: 14, alignItems: 'flex-start' }}>
              <Image
                source={require('../../../assets/logo.png')}
                style={{ height: 48, width: 180 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.avatarRow}>
              <Image source={{ uri: CURRENT_CUSTOMER_USER.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{CURRENT_CUSTOMER_USER.fullName}</Text>
                <Text style={styles.customerPhone}>{CURRENT_CUSTOMER_USER.phone}</Text>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>⭐ {CURRENT_CUSTOMER_USER.membershipTier}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SaaS Portal Navigation Label */}
          <View style={styles.portalBadgeRow}>
            <View style={styles.portalIndicator} />
            <Text style={styles.portalLabel}>SELF-SERVICE PORTAL • KHÁCH HÀNG</Text>
          </View>

          {/* Navigation Items */}
          <ScrollView style={styles.menuScroll}>
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>
                  {item.badge ? (
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* AI Assistant Quick Entry */}
          {onOpenAiAssistant && (
            <TouchableOpacity
              style={{
                marginHorizontal: 16,
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.4)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onOpenAiAssistant();
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                  Trợ lý AI SelfStorage
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>
                  Tư vấn cỡ kho & chính sách 24/7
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Footer Info */}
          <View style={styles.footerSection}>
            <View style={styles.appVersionRow}>
              <Text style={styles.appVersionText}>SelfStorage Customer Portal v2.4</Text>
              <Text style={styles.appSupportPhone}>Hotline 24/7: 1900 8866</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  sidebarContainer: {
    width: 310,
    maxWidth: '85%',
    backgroundColor: '#0F172A',
    height: '100%',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  profileHeader: {
    padding: 18,
    paddingTop: 36,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  customerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  customerPhone: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  tierBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  tierText: {
    color: '#FACC15',
    fontSize: 9,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  portalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#111827',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  portalIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  portalLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  menuScroll: {
    flex: 1,
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: '#2563EB',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    flex: 1,
  },
  menuLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#2563EB',
  },
  footerSection: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#090D16',
    gap: 10,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  switchRoleIcon: {
    fontSize: 18,
  },
  switchRoleTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  switchRoleSubtitle: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 1,
  },
  switchRoleArrow: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  appVersionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  appVersionText: {
    color: '#475569',
    fontSize: 10,
  },
  appSupportPhone: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
});
