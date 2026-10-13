import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StaffUser } from '../../types/handover';

interface StaffSettingsScreenProps {
  currentUser: StaffUser;
  onOpenSidebar: () => void;
  onSwitchToCustomer: () => void;
}

export default function StaffSettingsScreen({
  currentUser,
  onOpenSidebar,
  onSwitchToCustomer,
}: StaffSettingsScreenProps) {
  const handleAlert = (title: string, msg: string) => {
    Alert.alert(title, msg);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>⚙️ QUẢN TRỊ CA TRỰC</Text>
          <Text style={styles.mainTitle}>CÀI ĐẶT NHÂN VIÊN</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>NV</Text>
          </View>
          <Text style={styles.staffName}>{currentUser.fullName}</Text>
          <Text style={styles.staffRole}>{currentUser.role} • {currentUser.email}</Text>
          <View style={styles.facilityPill}>
            <Text style={styles.facilityPillText}>📍 {currentUser.facilityName}</Text>
          </View>
        </View>

        {/* Cài đặt ca trực & thiết bị quầy */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>THIẾT LẬP THIẾT BỊ TẠI QUẦY</Text>

          <TouchableOpacity style={styles.settingRow} onPress={() => handleAlert('Máy in quầy', 'Máy in hóa đơn Epson POS-80 đã kết nối thành công.')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingName}>🖨️ Máy in nhiệt POS tại quầy</Text>
              <Text style={styles.settingDesc}>Epson TM-T82III (K80 LAN) - Đang kết nối</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => handleAlert('Đầu đọc thẻ RFID', 'Đầu đọc thẻ từ thông minh ACR122U sẵn sàng ghi thẻ.')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingName}>📡 Đầu đọc/ghi thẻ từ RFID</Text>
              <Text style={styles.settingDesc}>ACR122U NFC Reader - Sẵn sàng</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => handleAlert('Khóa số Smart Lock', 'Kết nối Gateway IoT Smart Lock hoạt động ổn định 24/7.')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingName}>🔐 Đồng bộ cổng Gateway Smart Lock</Text>
              <Text style={styles.settingDesc}>Zigbee/BLE Hub v2 - Trực tuyến</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Chuyển chế độ & Đăng xuất */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TÀI KHOẢN & PHÂN QUYỀN</Text>

          <TouchableOpacity style={styles.settingRow} onPress={onSwitchToCustomer}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingName, { color: '#2563EB' }]}>🔄 Chuyển sang Giao diện Khách hàng</Text>
              <Text style={styles.settingDesc}>Xem luồng đặt kho và trải nghiệm khách thuê</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => handleAlert('Đăng xuất', 'Đã lưu ca trực của nhân viên.')}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingName, { color: '#DC2626' }]}>🚪 Kết thúc ca trực / Đăng xuất</Text>
              <Text style={styles.settingDesc}>Bàn giao ca trực cho nhân viên tiếp theo</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  staffName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  staffRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  facilityPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  facilityPillText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: '300',
  },
});
