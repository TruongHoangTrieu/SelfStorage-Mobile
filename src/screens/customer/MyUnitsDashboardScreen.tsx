import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { CustomerRentedUnit } from '../../types/customerStorage';

interface MyUnitsDashboardScreenProps {
  units: CustomerRentedUnit[];
  onViewDetail: (unit: CustomerRentedUnit) => void;
  onOpenGuestPin: (unit: CustomerRentedUnit) => void;
  onOpenRenew: (unit: CustomerRentedUnit) => void;
  onOpenReportIssue: (unit: CustomerRentedUnit) => void;
  onOpenSidebar: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  customerName: string;
}

export default function MyUnitsDashboardScreen({
  units,
  onViewDetail,
  onOpenGuestPin,
  onOpenRenew,
  onOpenReportIssue,
  onOpenSidebar,
  onRefresh,
  isRefreshing,
  customerName,
}: MyUnitsDashboardScreenProps) {
  // Trạng thái hiển thị mã PIN cho từng ô kho (để bảo mật khi đứng nơi đông người)
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (unitId: string) => {
    setVisiblePins((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  const activeCount = units.filter((u) => u.status === 'active').length;
  const expiringCount = units.filter((u) => u.status === 'expiring_soon').length;

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>XIN CHÀO, {customerName.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>Ô Kho Đang Thuê Của Tôi</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollPadding}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Banner Tổng Quan Nhanh */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{units.length}</Text>
            <Text style={styles.kpiLabel}>Tổng ô đang thuê</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#16A34A' }]}>{activeCount}</Text>
            <Text style={styles.kpiLabel}>Đang hoạt động</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: expiringCount > 0 ? '#EAB308' : '#64748B' }]}>
              {expiringCount}
            </Text>
            <Text style={styles.kpiLabel}>Sắp hết hạn</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>DANH SÁCH Ô KHO CỦA BẠN ({units.length})</Text>
          <Text style={styles.sectionSubtitle}>Chạm để xem chi tiết hoặc mở khóa</Text>
        </View>

        {units.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Bạn chưa có ô kho nào đang thuê</Text>
            <Text style={styles.emptySubtitle}>
              Hãy đặt chỗ trước hoặc liên hệ quầy lễ tân cơ sở để bắt đầu thuê kho tự quản.
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {units.map((unit) => {
              const isPinOpen = !!visiblePins[unit.id];
              const isExpiring = unit.status === 'expiring_soon';
              const isOverdue = unit.status === 'overdue';

              return (
                <View
                  key={unit.id}
                  style={[
                    styles.unitCard,
                    isExpiring && styles.unitCardExpiring,
                    isOverdue && styles.unitCardOverdue,
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.unitCodeBadge}>
                      <Text style={styles.unitCodeText}>Ô {unit.unitCode}</Text>
                    </View>

                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.unitNameText} numberOfLines={1}>
                        {unit.unitName}
                      </Text>
                      <Text style={styles.unitSizeText}>{unit.size}</Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        isExpiring && styles.statusBadgeExpiring,
                        isOverdue && styles.statusBadgeOverdue,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isExpiring && styles.statusBadgeTextExpiring,
                          isOverdue && styles.statusBadgeTextOverdue,
                        ]}
                      >
                        {isExpiring ? '⚠️ Sắp hết hạn' : isOverdue ? '🔴 Quá hạn' : '🟢 Đang thuê'}
                      </Text>
                    </View>
                  </View>

                  {/* Sơ đồ vị trí Mini (Mini Floor Map Snippet) */}
                  <View style={styles.mapSnippetBox}>
                    <View style={styles.mapSnippetIconRow}>
                      <Text style={styles.mapPinIcon}>📍</Text>
                      <Text style={styles.mapLocationFacility}>{unit.facilityName}</Text>
                    </View>
                    <View style={styles.mapFloorZoneRow}>
                      <View style={styles.floorTag}>
                        <Text style={styles.floorTagText}>{unit.mapPositionSnippet.floorLabel}</Text>
                      </View>
                      <View style={styles.zoneTag}>
                        <Text style={styles.zoneTagText}>{unit.mapPositionSnippet.zoneLabel}</Text>
                      </View>
                      <Text style={styles.corridorText} numberOfLines={1}>
                        {unit.mapPositionSnippet.corridor}
                      </Text>
                    </View>
                  </View>

                  {/* Thông tin thời hạn & Tài chính then chốt */}
                  <View style={styles.financialRow}>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Hạn thuê hợp đồng</Text>
                      <Text style={[styles.financialVal, isExpiring && { color: '#D97706', fontWeight: '900' }]}>
                        {unit.endDate} ({unit.daysRemaining} ngày)
                      </Text>
                    </View>

                    <View style={styles.financialItemRight}>
                      <Text style={styles.financialLabel}>Giá thuê hàng tháng</Text>
                      <Text style={styles.financialValRent}>{unit.monthlyRentFormatted}</Text>
                    </View>
                  </View>

                  {/* Smart PIN Quick Peek Card */}
                  <View style={styles.quickPinCard}>
                    <View style={styles.pinHeaderRow}>
                      <View style={styles.pinIconLabel}>
                        <Text style={styles.pinKeyIcon}>🔑</Text>
                        <Text style={styles.pinTitle}>MÃ SMART PIN MỞ CỬA 24/7</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => togglePinVisibility(unit.id)}
                      >
                        <Text style={styles.eyeBtnText}>{isPinOpen ? 'Ẩn 🙈' : 'Xem 👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.pinDisplayRow}>
                      <Text style={styles.pinDigits}>
                        {isPinOpen ? unit.masterPin : '••••••'}
                      </Text>
                      <Text style={styles.lockStatusBadge}>
                        {unit.smartLockStatus === 'LOCKED' ? '🔒 Đang khóa' : '🔓 Đã mở'}
                      </Text>
                    </View>
                  </View>

                  {/* Các nút bấm thao tác nhanh (Quick Action Bar) */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => onViewDetail(unit)}
                    >
                      <Text style={styles.detailBtnText}>👁️ [ Xem Chi Tiết ]</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.guestPinBtn}
                      onPress={() => onOpenGuestPin(unit)}
                    >
                      <Text style={styles.guestPinBtnText}>⏱️ Mã Khách</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.renewBtn}
                      onPress={() => onOpenRenew(unit)}
                    >
                      <Text style={styles.renewBtnText}>🔄 Gia Hạn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reportBtn}
                      onPress={() => onOpenReportIssue(unit)}
                    >
                      <Text style={styles.reportBtnText}>🛠️ Báo Cố</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 16,
  },
  contentScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 14,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  gridContainer: {
    gap: 14,
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  unitCardExpiring: {
    borderColor: '#FDE047',
    backgroundColor: '#FEFCE8',
  },
  unitCardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitCodeBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unitCodeText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  unitNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitSizeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeExpiring: {
    backgroundColor: '#FEF08A',
  },
  statusBadgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextExpiring: {
    color: '#A16207',
  },
  statusBadgeTextOverdue: {
    color: '#B91C1C',
  },
  mapSnippetBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  mapSnippetIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapPinIcon: {
    fontSize: 13,
  },
  mapLocationFacility: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  mapFloorZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  floorTagText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '800',
  },
  zoneTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoneTagText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  corridorText: {
    fontSize: 10,
    color: '#64748B',
    flex: 1,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  financialItem: {
    gap: 2,
  },
  financialItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  financialLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  financialVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  financialValRent: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  quickPinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinKeyIcon: {
    fontSize: 13,
  },
  pinTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eyeBtnText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  pinDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  pinDigits: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  lockStatusBadge: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 4,
  },
  detailBtn: {
    flex: 1.4,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  guestPinBtn: {
    flex: 1.1,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestPinBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  renewBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  reportBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
