import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';

interface RenewContractModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onRenewSuccess: (extendedMonths: number, newEndDate: string) => void;
}

export default function RenewContractModal({
  visible,
  onClose,
  unit,
  onRenewSuccess,
}: RenewContractModalProps) {
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState<'sepay_qr' | 'bank_transfer'>('sepay_qr');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tính toán chiết khấu
  const getDiscountPercent = (months: number) => {
    if (months >= 12) return 15;
    if (months >= 6) return 10;
    if (months >= 3) return 5;
    return 0;
  };

  const discountPercent = getDiscountPercent(selectedMonths);
  const grossRent = unit.monthlyRent * selectedMonths;
  const discountAmount = Math.round((grossRent * discountPercent) / 100);
  const netRent = grossRent - discountAmount;

  // Tính ngày kết thúc mới
  const calculateNewEndDate = (months: number) => {
    const parts = unit.endDate.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      date.setMonth(date.getMonth() + months);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    return '13/10/2027';
  };

  const newEndDate = calculateNewEndDate(selectedMonths);

  const handleExecuteRenew = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onRenewSuccess(selectedMonths, newEndDate);
      onClose();
      if (Platform.OS === 'web') {
        window.alert(`🎉 Gia hạn thành công ô kho ${unit.unitCode} thêm ${selectedMonths} tháng!\nThời hạn mới đến: ${newEndDate}`);
      }
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>GIA HẠN THUÊ Ô KHO</Text>
              <Text style={styles.subtitle}>Ô kho {unit.unitCode} • {unit.unitName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 14 }}>
            {/* Box Tóm Tắt Hiện Tại */}
            <View style={styles.currentSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hạn hợp đồng hiện tại:</Text>
                <Text style={styles.summaryVal}>{unit.endDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Giá thuê chuẩn:</Text>
                <Text style={styles.summaryVal}>{formatVND(unit.monthlyRent)}/tháng</Text>
              </View>
            </View>

            {/* Chọn Số Tháng Gia Hạn */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Chọn thời gian gia hạn thêm:</Text>
              <View style={styles.monthsGrid}>
                {[1, 3, 6, 12].map((m) => {
                  const isSelected = selectedMonths === m;
                  const disc = getDiscountPercent(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthCard, isSelected && styles.monthCardActive]}
                      onPress={() => setSelectedMonths(m)}
                    >
                      <Text style={[styles.monthCardTitle, isSelected && styles.monthCardTitleActive]}>
                        +{m} Tháng
                      </Text>
                      {disc > 0 ? (
                        <View style={[styles.discBadge, isSelected && styles.discBadgeActive]}>
                          <Text style={[styles.discBadgeText, isSelected && styles.discBadgeTextActive]}>
                            Giảm {disc}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noDiscText}>Giá chuẩn</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bảng Chi Tiết Giá Thuê & Chiết Khấu */}
            <View style={styles.costBreakdownCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Tiền thuê ({selectedMonths} tháng):</Text>
                <Text style={styles.costVal}>{formatVND(grossRent)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: '#16A34A' }]}>
                    Ưu đãi thời hạn ({discountPercent}%):
                  </Text>
                  <Text style={[styles.costVal, { color: '#16A34A', fontWeight: 'bold' }]}>
                    -{formatVND(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.costRowTotal}>
                <Text style={styles.costTotalLabel}>TỔNG TIỀN THANH TOÁN:</Text>
                <Text style={styles.costTotalVal}>{formatVND(netRent)}</Text>
              </View>

              <View style={styles.newDateBanner}>
                <Text style={styles.newDateText}>
                  📅 Hạn hợp đồng mới sau khi gia hạn:{' '}
                  <Text style={{ fontWeight: '900', color: '#1E40AF' }}>{newEndDate}</Text>
                </Text>
              </View>
            </View>

            {/* Phương Thức Thanh Toán (Luồng 4 Link) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phương thức thanh toán:</Text>
              <TouchableOpacity
                style={[styles.payMethodOption, paymentMethod === 'sepay_qr' && styles.payMethodOptionActive]}
                onPress={() => setPaymentMethod('sepay_qr')}
              >
                <Text style={styles.payIcon}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>Quét mã VietQR Tự Động (SePay)</Text>
                  <Text style={styles.paySubtitle}>Gia hạn kích hoạt tức thì không cần chờ duyệt</Text>
                </View>
                {paymentMethod === 'sepay_qr' && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payMethodOption, paymentMethod === 'bank_transfer' && styles.payMethodOptionActive]}
                onPress={() => setPaymentMethod('bank_transfer')}
              >
                <Text style={styles.payIcon}>🏦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle}>Chuyển khoản thủ công / Tiền mặt</Text>
                  <Text style={styles.paySubtitle}>Thanh toán tại quầy lễ tân cơ sở</Text>
                </View>
                {paymentMethod === 'bank_transfer' && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleExecuteRenew} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>✓ Xác Nhận Gia Hạn Ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentScroll: {
    flexGrow: 0,
  },
  currentSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  monthsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  monthCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  monthCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  monthCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  monthCardTitleActive: {
    color: '#1D4ED8',
  },
  discBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discBadgeActive: {
    backgroundColor: '#2563EB',
  },
  discBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  discBadgeTextActive: {
    color: '#FFFFFF',
  },
  noDiscText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  costBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  costVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  costRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  costTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  newDateBanner: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  newDateText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  payMethodOptionActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  payIcon: {
    fontSize: 18,
  },
  payTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  paySubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  checkIcon: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
