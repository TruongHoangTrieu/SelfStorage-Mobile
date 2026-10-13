import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';

interface UnitDetailManageScreenProps {
  unit: CustomerRentedUnit;
  onBackToDashboard: () => void;
  onOpenGuestPinModal: () => void;
  onOpenRenewModal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenReportIssueModal: () => void;
  onOpenChangePinModal: () => void;
}

export default function UnitDetailManageScreen({
  unit,
  onBackToDashboard,
  onOpenGuestPinModal,
  onOpenRenewModal,
  onOpenUpgradeModal,
  onOpenReportIssueModal,
  onOpenChangePinModal,
}: UnitDetailManageScreenProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'history'>('overview');
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);

  // Tính phần trăm tiến độ hợp đồng đã trôi qua
  const elapsedDays = Math.max(0, unit.totalDays - unit.daysRemaining);
  const progressPercent = Math.min(100, Math.round((elapsedDays / unit.totalDays) * 100));

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToDashboard}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>QUẢN LÝ Ô KHO CHI TIẾT</Text>
          <Text style={styles.headerTitle}>
            Ô {unit.unitCode} • {unit.unitName}
          </Text>
        </View>

        <View style={styles.contractCodeBadge}>
          <Text style={styles.contractCodeText}>{unit.contractCode.slice(-8)}</Text>
        </View>
      </View>

      {/* Tabs Bar */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>
            📊 1. Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'access' && styles.tabBtnActive]}
          onPress={() => setActiveTab('access')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'access' && styles.tabBtnTextActive]}>
            🔑 2. Mã khách ({unit.guestAccessCodes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            📜 3. Lịch sử ({unit.payments.length + unit.supportTickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content Body */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollPadding}>
        {/* ================= TAB 1: TỔNG QUAN & SỐ DƯ ================= */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            {/* Thẻ Vị Trí & Cơ Sở */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🏢</Text>
                <Text style={styles.cardTitle}>Vị Trí & Không Gian Kho</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cơ sở kho:</Text>
                <Text style={styles.infoValBold}>{unit.facilityName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ:</Text>
                <Text style={styles.infoVal}>{unit.facilityAddress}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tầng & Phân khu:</Text>
                <Text style={styles.infoValBold}>
                  {unit.floor} • {unit.zone}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lối tiếp cận:</Text>
                <Text style={styles.infoVal}>{unit.mapPositionSnippet.corridor}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kích thước:</Text>
                <Text style={styles.infoVal}>{unit.dimensions || unit.size}</Text>
              </View>
            </View>

            {/* Thẻ Thời Hạn Hợp Đồng & Tiến Độ */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📅</Text>
                <Text style={styles.cardTitle}>Thời Hạn Hợp Đồng Thuê</Text>
              </View>

              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>
                  Đã sử dụng: <Text style={{ fontWeight: '800' }}>{elapsedDays} ngày</Text>
                </Text>
                <Text style={styles.progressLabel}>
                  Còn lại:{' '}
                  <Text style={{ fontWeight: '900', color: unit.daysRemaining < 7 ? '#DC2626' : '#2563EB' }}>
                    {unit.daysRemaining} ngày
                  </Text>
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                    unit.daysRemaining < 7 && { backgroundColor: '#EAB308' },
                  ]}
                />
              </View>

              <View style={styles.datesRow}>
                <View>
                  <Text style={styles.dateLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.dateVal}>{unit.startDate}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.dateLabel}>Ngày kết thúc hợp đồng</Text>
                  <Text style={[styles.dateVal, { color: '#059669', fontWeight: '900' }]}>
                    {unit.endDate}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thẻ Tài Chính & Số Dư */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💳</Text>
                <Text style={styles.cardTitle}>Tài Chính & Số Dư Hiện Tại</Text>
              </View>

              <View style={styles.financeGrid}>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Giá thuê hàng tháng</Text>
                  <Text style={styles.financeValRent}>{unit.monthlyRentFormatted}</Text>
                </View>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Tiền cọc đang giữ</Text>
                  <Text style={styles.financeVal}>{unit.depositFormatted}</Text>
                </View>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Tổng lũy kế đã trả</Text>
                  <Text style={styles.financeVal}>{unit.totalPaidFormatted}</Text>
                </View>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Số dư công nợ</Text>
                  <Text style={[styles.financeVal, { color: unit.currentBalance > 0 ? '#DC2626' : '#16A34A' }]}>
                    {unit.currentBalanceFormatted}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thẻ Khóa Thông Minh Master */}
            <View style={styles.pinCard}>
              <View style={styles.pinCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinCardTitle}>MÃ SMART PIN CHÍNH (MASTER KEY)</Text>
                  <Text style={styles.pinCardSubtitle}>Dùng mở khóa 24/7 tại cửa kho {unit.unitCode}</Text>
                </View>

                <TouchableOpacity style={styles.pinEyeBtn} onPress={() => setIsPinVisible(!isPinVisible)}>
                  <Text style={styles.pinEyeText}>{isPinVisible ? 'Ẩn 🙈' : 'Xem 👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pinDisplayBox}>
                <Text style={styles.pinBigDigits}>
                  {isPinVisible ? unit.masterPin : '••••••'}
                </Text>
                <TouchableOpacity style={styles.changePinBtn} onPress={onOpenChangePinModal}>
                  <Text style={styles.changePinBtnText}>🔑 Đổi Mã PIN</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Thẻ Danh Mục Đồ Đạc Lưu Kho (Stored Items) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📦</Text>
                <Text style={styles.cardTitle}>Danh Mục Đồ Lưu Kho ({unit.storedItems.length})</Text>
              </View>

              {unit.storedItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>
                      {item.category} • Số lượng: {item.quantity} {item.unit}
                    </Text>
                    {item.notes ? <Text style={styles.itemNotes}>Ghi chú: {item.notes}</Text> : null}
                  </View>
                  {item.estimatedValue && (
                    <Text style={styles.itemVal}>{item.estimatedValue}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= TAB 2: TRUY CẬP & MÃ KHÁCH TẠM THỜI ================= */}
        {activeTab === 'access' && (
          <View style={styles.tabSection}>
            <View style={styles.actionHeaderBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionHeaderTitle}>MÃ TRUY CẬP CHO KHÁCH TẠM THỜI</Text>
                <Text style={styles.actionHeaderDesc}>
                  Cấp mã PIN có giới hạn giờ cho bạn bè, thợ chuyển nhà mà không để lộ mã PIN chính
                </Text>
              </View>

              <TouchableOpacity style={styles.createPinActionBtn} onPress={onOpenGuestPinModal}>
                <Text style={styles.createPinActionText}>+ Tạo Mã Khách</Text>
              </TouchableOpacity>
            </View>

            {unit.guestAccessCodes.length === 0 ? (
              <View style={styles.emptyTabCard}>
                <Text style={styles.emptyTabIcon}>⏱️</Text>
                <Text style={styles.emptyTabTitle}>Chưa có mã khách nào được tạo</Text>
                <Text style={styles.emptyTabDesc}>
                  Bấm "+ Tạo Mã Khách" để tạo mã PIN có thời hạn 2h, 24h hoặc 3 ngày và chia sẻ qua Zalo/Email.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {unit.guestAccessCodes.map((g) => (
                  <View key={g.id} style={styles.guestCodeCard}>
                    <View style={styles.guestCodeHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guestName}>{g.guestName}</Text>
                        <Text style={styles.guestPurpose}>{g.purpose || 'Mở cửa lấy đồ'}</Text>
                      </View>
                      <View style={styles.guestStatusBadge}>
                        <Text style={styles.guestStatusText}>🟢 {g.validTo}</Text>
                      </View>
                    </View>

                    <View style={styles.guestPinRow}>
                      <Text style={styles.guestPinLabel}>Mã PIN:</Text>
                      <Text style={styles.guestPinVal}>{g.pinCode}</Text>
                      <Text style={styles.guestUsageType}>
                        ({g.usageType === 'one_time' ? '1 lần tự hủy' : 'Nhiều lần'})
                      </Text>
                    </View>

                    <View style={styles.guestShareBtnRow}>
                      <TouchableOpacity
                        style={styles.guestShareZalo}
                        onPress={() => {
                          const msg = `Mã PIN mở ô kho ${unit.unitCode}: ${g.pinCode} (Hiệu lực: ${g.validTo})`;
                          if (Platform.OS === 'web') window.prompt('Sao chép gửi Zalo:', msg);
                        }}
                      >
                        <Text style={styles.guestShareZaloText}>💬 Chia sẻ Zalo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.guestShareEmail}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(
                              `mailto:?subject=Ma PIN mo kho ${unit.unitCode}&body=Ma PIN: ${g.pinCode} (Hieu luc: ${g.validTo})`
                            );
                          }
                        }}
                      >
                        <Text style={styles.guestShareEmailText}>✉️ Gửi Email</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 3: LỊCH SỬ THANH TOÁN & SỰ CỐ ================= */}
        {activeTab === 'history' && (
          <View style={styles.tabSection}>
            {/* Lịch sử thanh toán */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💰</Text>
                <Text style={styles.cardTitle}>Lịch Sử Thanh Toán ({unit.payments.length})</Text>
              </View>

              {unit.payments.map((p) => (
                <View key={p.id} style={styles.historyPayRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyPayTitle}>{p.typeLabel}</Text>
                    <Text style={styles.historyPayDesc}>{p.periodDescription}</Text>
                    <Text style={styles.historyPayDate}>{p.paidAt} • {p.method}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyPayAmount}>+{formatVND(p.amount)}</Text>
                    <View style={styles.historyPaidBadge}>
                      <Text style={styles.historyPaidText}>✓ Đã nộp</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Lịch sử yêu cầu hỗ trợ sự cố */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🎧</Text>
                <Text style={styles.cardTitle}>Lịch Sử Phiếu Hỗ Trợ ({unit.supportTickets.length})</Text>
              </View>

              {unit.supportTickets.length === 0 ? (
                <Text style={styles.emptyHistoryText}>Ô kho hoạt động tốt, không có sự cố nào được ghi nhận.</Text>
              ) : (
                unit.supportTickets.map((t) => (
                  <View key={t.id} style={styles.ticketRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketSubject}>{t.subject}</Text>
                      <Text style={styles.ticketDesc}>{t.description}</Text>
                      <Text style={styles.ticketMeta}>
                        Mã #{t.requestCode} • {t.createdAt}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.ticketStatusBadge,
                        t.status === 'RESOLVED' && { backgroundColor: '#DCFCE7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ticketStatusText,
                          t.status === 'RESOLVED' && { color: '#15803D' },
                        ]}
                      >
                        {t.status === 'RESOLVED' ? '✓ Đã xử lý' : 'Đang xử lý'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar (4 Tương Tác Nghiệp Vụ Chính) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionGuestBtn} onPress={onOpenGuestPinModal}>
          <Text style={styles.actionIcon}>⏱️</Text>
          <Text style={styles.actionText}>Mã Khách</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRenewBtn} onPress={onOpenRenewModal}>
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionText}>Gia Hạn</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionUpgradeBtn} onPress={onOpenUpgradeModal}>
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>Đổi Kho</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionReportBtn} onPress={onOpenReportIssueModal}>
          <Text style={styles.actionIcon}>🛠️</Text>
          <Text style={styles.actionText}>Báo Sự Cố</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  contractCodeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contractCodeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 14,
    paddingBottom: 90,
  },
  tabSection: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  infoValBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  dateVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  financeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  financeBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  financeLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  financeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  financeValRent: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  pinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  pinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinCardTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pinCardSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  pinEyeBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pinEyeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pinDisplayBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  pinBigDigits: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 6,
  },
  changePinBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePinBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCategory: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  itemVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  actionHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  actionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  actionHeaderDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  createPinActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createPinActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyTabCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyTabIcon: {
    fontSize: 36,
  },
  emptyTabTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyTabDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  guestCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  guestCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  guestPurpose: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  guestStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guestStatusText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  guestPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  guestPinLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  guestPinVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 2,
  },
  guestUsageType: {
    fontSize: 10,
    color: '#64748B',
  },
  guestShareBtnRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  guestShareZalo: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  guestShareZaloText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  guestShareEmail: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  guestShareEmailText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  historyPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyPayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyPayDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  historyPayDate: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyPayAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  historyPaidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  historyPaidText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  ticketSubject: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  ticketMeta: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  ticketStatusBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ticketStatusText: {
    color: '#854D0E',
    fontSize: 9,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  actionGuestBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  actionRenewBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  actionUpgradeBtn: {
    flex: 1,
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  actionReportBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
