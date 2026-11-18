import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  onOpenReturnModal: () => void;
}

export default function UnitDetailManageScreen({
  unit,
  onBackToDashboard,
  onOpenGuestPinModal,
  onOpenRenewModal,
  onOpenUpgradeModal,
  onOpenReportIssueModal,
  onOpenChangePinModal,
  onOpenReturnModal,
}: UnitDetailManageScreenProps) {
  const [activeTab, setActiveTab] = useState<'access' | 'history'>('access');
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);

  // Tính phần trăm tiến độ hợp đồng đã trôi qua
  const elapsedDays = Math.max(0, unit.totalDays - unit.daysRemaining);
  const progressPercent = Math.min(100, Math.round((elapsedDays / unit.totalDays) * 100));

  const isCheckingOut = unit.status === ('checking_out' as any);
  const isExpiring = unit.status === 'expiring_soon';
  const isOverdue = unit.status === 'overdue';

  return (
    <View style={styles.container}>
      {/* ─── 1. Header Tinh Gọn ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToDashboard} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Kho {unit.unitCode}</Text>
            <View
              style={[
                styles.statusBadge,
                isCheckingOut && styles.badgeCheckingOut,
                isOverdue && styles.badgeOverdue,
                isExpiring && styles.badgeExpiring,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isCheckingOut && styles.badgeTextCheckingOut,
                  isOverdue && styles.badgeTextOverdue,
                  isExpiring && styles.badgeTextExpiring,
                ]}
              >
                {isCheckingOut ? 'Chờ trả kho' : unit.statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {unit.facilityName} • {unit.zone} ({unit.floor})
          </Text>
        </View>

        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>#{unit.contractCode.slice(-6)}</Text>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Banner thông báo nếu đang chờ nghiệm thu trả kho */}
        {isCheckingOut && (
          <View style={styles.checkoutBanner}>
            <MaterialIcons name="hourglass-top" size={18} color="#EA580C" />
            <Text style={styles.checkoutBannerText}>
              Đã gửi yêu cầu trả kho. Vui lòng gặp nhân viên tại quầy cơ sở để kiểm tra hiện trạng và hoàn tất thủ tục trả kho.
            </Text>
          </View>
        )}

        {/* ─── 2. Thẻ Khóa Thông Minh (Smart Lock PIN) ─── */}
        <View style={styles.smartPinCard}>
          <View style={styles.pinHeader}>
            <View style={styles.pinHeaderLeft}>
              <MaterialIcons name="lock" size={18} color="#2563EB" />
              <Text style={styles.pinHeaderTitle}>Mã khóa Smart PIN</Text>
            </View>
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setIsPinVisible(!isPinVisible)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isPinVisible ? 'visibility-off' : 'visibility'}
                size={18}
                color="#64748B"
              />
              <Text style={styles.eyeBtnText}>{isPinVisible ? 'Ẩn' : 'Hiện'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pinBody}>
            <Text style={styles.pinDigits}>
              {isPinVisible ? unit.masterPin : '••••••'}
            </Text>
            <TouchableOpacity
              style={styles.changePinBtn}
              onPress={onOpenChangePinModal}
              activeOpacity={0.8}
            >
              <MaterialIcons name="vpn-key" size={15} color="#2563EB" />
              <Text style={styles.changePinBtnText}>Đổi PIN</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pinCaption}>Nhập mã này tại cửa kho để mở khóa 24/7</Text>
        </View>

        {/* ─── 3. Thẻ Thời Hạn & Chi Phí ─── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời hạn thuê:</Text>
            <Text style={styles.infoValBold}>
              {unit.startDate} → {unit.endDate}
            </Text>
          </View>

          {/* Thanh tiến độ ngày thuê */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                  isExpiring && { backgroundColor: '#F59E0B' },
                  isOverdue && { backgroundColor: '#EF4444' },
                ]}
              />
            </View>
            <Text style={styles.progressNote}>
              {unit.daysRemaining > 0
                ? `Còn ${unit.daysRemaining} ngày thuê`
                : 'Đã đến ngày thanh lý / trả kho'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.gridTwoCols}>
            <View>
              <Text style={styles.subLabel}>Giá thuê hàng tháng</Text>
              <Text style={styles.subVal}>{unit.monthlyRentFormatted}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.subLabel}>Kỳ thanh toán</Text>
              <Text style={styles.subVal}>Hàng tháng</Text>
            </View>
          </View>
        </View>

        {/* ─── 4. Thẻ Vị Trí & Không Gian Kho ─── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cơ sở kho:</Text>
            <Text style={styles.infoValBold}>{unit.facilityName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoVal}>{unit.facilityAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Diện tích:</Text>
            <Text style={styles.infoVal}>{unit.dimensions || unit.size}</Text>
          </View>
        </View>

        {/* ─── 5. Tab Phụ: Mã Khách & Lịch Sử ─── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'access' && styles.tabItemActive]}
            onPress={() => setActiveTab('access')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabItemText, activeTab === 'access' && styles.tabItemTextActive]}>
              Mã khách ({unit.guestAccessCodes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}>
              Lịch sử giao dịch ({unit.payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'access' ? (
          <View style={styles.tabContent}>
            <View style={styles.guestActionRow}>
              <Text style={styles.guestHeaderTitle}>Mã tạm thời chia sẻ cho người thân</Text>
              <TouchableOpacity
                style={styles.addGuestBtn}
                onPress={onOpenGuestPinModal}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={16} color="#2563EB" />
                <Text style={styles.addGuestBtnText}>Tạo mã</Text>
              </TouchableOpacity>
            </View>

            {unit.guestAccessCodes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Chưa có mã khách nào được tạo</Text>
                <Text style={styles.emptySubText}>
                  Bạn có thể tạo mã PIN tạm thời có giới hạn giờ cho bạn bè hoặc người chuyển đồ.
                </Text>
              </View>
            ) : (
              unit.guestAccessCodes.map((g) => (
                <View key={g.id} style={styles.guestItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestItemName}>{g.guestName}</Text>
                    <Text style={styles.guestItemExpiry}>Hạn dùng: {g.validTo}</Text>
                  </View>
                  <View style={styles.guestPinBox}>
                    <Text style={styles.guestPinText}>{g.pinCode}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {unit.payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Chưa có giao dịch thanh toán nào</Text>
              </View>
            ) : (
              unit.payments.map((p) => (
                <View key={p.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{p.typeLabel}</Text>
                    <Text style={styles.historyDate}>{p.paidAt} • {p.method}</Text>
                  </View>
                  <Text style={styles.historyAmount}>+{formatVND(p.amount)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── 6. Thanh Thao Tác Cố Định Dưới Đáy (Bottom Action Bar) ─── */}
      <View style={styles.bottomBar}>
        {/* Nút 1: Gia hạn hợp đồng */}
        <TouchableOpacity
          style={styles.primaryRenewBtn}
          onPress={onOpenRenewModal}
          activeOpacity={0.85}
        >
          <MaterialIcons name="autorenew" size={18} color="#FFFFFF" />
          <Text style={styles.primaryRenewText}>Gia Hạn</Text>
        </TouchableOpacity>

        {/* Nút 2: Trả kho */}
        <TouchableOpacity
          style={[styles.returnBtn, isCheckingOut && styles.returnBtnDisabled]}
          onPress={onOpenReturnModal}
          activeOpacity={0.85}
        >
          <MaterialIcons name="exit-to-app" size={18} color="#FFFFFF" />
          <Text style={styles.returnBtnText}>
            {isCheckingOut ? 'Chi Tiết Trả Kho' : 'Trả Kho'}
          </Text>
        </TouchableOpacity>

        {/* Nút 3: Cấp mã khách */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onOpenGuestPinModal}
          activeOpacity={0.8}
        >
          <MaterialIcons name="person-add" size={18} color="#334155" />
          <Text style={styles.secondaryBtnText}>Mã Khách</Text>
        </TouchableOpacity>

        {/* Nút 4: Báo sự cố */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onOpenReportIssueModal}
          activeOpacity={0.8}
        >
          <MaterialIcons name="build" size={18} color="#334155" />
          <Text style={styles.secondaryBtnText}>Sự Cố</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  badgeCheckingOut: {
    backgroundColor: '#FFEDD5',
  },
  badgeTextCheckingOut: {
    color: '#C2410C',
  },
  badgeExpiring: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextExpiring: {
    color: '#B45309',
  },
  badgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextOverdue: {
    color: '#B91C1C',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  checkoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkoutBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#C2410C',
    fontWeight: '600',
    lineHeight: 16,
  },
  smartPinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pinHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  eyeBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  pinBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pinDigits: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 4,
  },
  changePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePinBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  pinCaption: {
    fontSize: 11,
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  infoValBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  progressNote: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  gridTwoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  subVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563EB',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  tabContent: {
    marginBottom: 20,
  },
  guestActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  addGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  addGuestBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 15,
  },
  guestItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  guestItemName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  guestItemExpiry: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  guestPinBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  guestPinText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  primaryRenewBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryRenewText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  returnBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingVertical: 11,
    borderRadius: 10,
  },
  returnBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  returnBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  secondaryBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
});
