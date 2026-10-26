import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckInAppointment } from '../../types/handover';

interface StaffDashboardScreenProps {
  appointments: CheckInAppointment[];
  onGoToQueue: () => void;
  onOpenSidebar: () => void;
  facilityName?: string;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export default function StaffDashboardScreen({
  appointments,
  onGoToQueue,
  onOpenSidebar,
  facilityName = 'Trụ sở chính Thủ Đức',
  onOpenNotifications,
  unreadNotifCount = 0,
}: StaffDashboardScreenProps) {
  const pending = appointments.filter((a) => a.status === 'pending').length;
  const arrived = appointments.filter((a) => a.status === 'arrived').length;
  const inProgress = appointments.filter((a) => a.status === 'in_progress').length;
  const completed = appointments.filter((a) => a.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Top Bar (Dàn trải rộng, bỏ icon, tên cơ sở nổi bật) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
          <MaterialIcons name="menu" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.topBarTitleCol}>
          <Text style={styles.subTitle} numberOfLines={1}>
            {facilityName}
          </Text>
          <Text style={styles.mainTitle} numberOfLines={1}>
            Bảng điều khiển ca trực
          </Text>
        </View>

        {onOpenNotifications && (
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications-none" size={21} color="#0F172A" />
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding}>
        {/* KPI Cards Row */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
            <View style={styles.kpiIconWrap}>
              <MaterialIcons name="calendar-today" size={18} color="#1D4ED8" />
            </View>
            <Text style={[styles.kpiValue, { color: '#1D4ED8' }]}>{appointments.length}</Text>
            <Text style={styles.kpiLabel}>Tổng khách hẹn hôm nay</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="schedule" size={18} color="#D97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pending + arrived}</Text>
            <Text style={styles.kpiLabel}>Chờ nhận kho</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <MaterialIcons name="autorenew" size={18} color="#9333EA" />
            </View>
            <Text style={[styles.kpiValue, { color: '#9333EA' }]}>{inProgress}</Text>
            <Text style={styles.kpiLabel}>Đang làm thủ tục</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <MaterialIcons name="check-circle" size={18} color="#15803D" />
            </View>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{completed}</Text>
            <Text style={styles.kpiLabel}>Đã bàn giao xong</Text>
          </View>
        </View>

        {/* Quick Action Banner */}
        <View style={styles.actionBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerHeadline}>Luồng 2 đang hoạt động</Text>
            <Text style={styles.bannerDesc}>
              Hiện có {pending + arrived} khách hàng cần hoàn tất thủ tục bàn giao ô kho trong ca trực hôm nay.
            </Text>
          </View>
          <TouchableOpacity style={styles.bannerBtn} onPress={onGoToQueue}>
            <Text style={styles.bannerBtnText}>Vào Hàng Đợi →</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin kho bãi nhanh */}
        <View style={styles.facilityStatusCard}>
          <Text style={styles.sectionTitle}>Tình Trạng Kho Bãi Tại Cơ Sở</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Tỷ lệ lấp đầy kho:</Text>
            <Text style={styles.progressValue}>88.5% (177/200 ô)</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '88.5%' }]} />
          </View>

          <View style={styles.facilityMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>23</Text>
              <Text style={styles.metricLabel}>Ô kho trống (Vacant)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>177</Text>
              <Text style={styles.metricLabel}>Đang thuê (Occupied)</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>0</Text>
              <Text style={styles.metricLabel}>Bảo trì (Maintenance)</Text>
            </View>
          </View>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  subTitle: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mainTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  actionBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerHeadline: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
  },
  bannerDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  facilityStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  facilityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
