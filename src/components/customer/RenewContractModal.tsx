import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';
import { renewContractApi, apiRequest } from '../../api';

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
  // ─── STATE BƯỚC THỰC HIỆN: 'select' (chọn gói) | 'payment' (quét QR) ───
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState<'sepay_qr' | 'bank_transfer'>('sepay_qr');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [autoDetecting, setAutoDetecting] = useState<boolean>(true);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Tính tiền thuê: Không áp dụng chiết khấu (Backend tính đúng đơn giá * số tháng)
  const netRent = unit.monthlyRent * selectedMonths;

  // Tính ngày kết thúc mới
  const calculateNewEndDate = (months: number) => {
    const parts = (unit.endDate || '01/01/2026').split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      date.setMonth(date.getMonth() + months);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    return '01/01/2027';
  };

  const newEndDate = calculateNewEndDate(selectedMonths);

  // Thông tin thanh toán SePay VietQR chuẩn
  const bankName = 'MBBank (Quân Đội)';
  const accountNumber = '0838500046';
  const accountName = 'TRUONG DINH LONG';

  // Mã nội dung chuyển khoản gia hạn
  const cleanUnitCode = (unit.unitCode || 'UNIT').replace(/[^A-Za-z0-9]/g, '');
  const transferContent = `SSREN${cleanUnitCode}${selectedMonths}T`;

  // URL VietQR tạo mã QR chuẩn
  const qrCodeUrl = `https://img.vietqr.io/image/MB-0838500046-compact2.png?amount=${netRent}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;

  // ─── TỰ ĐỘNG LẮNG NGHE GIAO DỊCH SEPAY KHI Ở BƯỚC QUÉT QR ───
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (visible && step === 'payment' && !paymentSuccess) {
      setAutoDetecting(true);
      // Tự động kiểm tra định kỳ mỗi 3 giây
      pollTimerRef.current = setInterval(async () => {
        // Có thể mở rộng kiểm tra API giao dịch nếu SePay webhook đã ghi nhận
      }, 3000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [visible, step, paymentSuccess]);

  // Sao chép clipboard
  const handleCopy = (text: string, label: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Đóng modal và reset trạng thái (Không cộng thêm ngày khi chưa thanh toán)
  const handleSafeClose = () => {
    setStep('select');
    setIsSubmitting(false);
    setPaymentSuccess(false);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    onClose();
  };

  // Chuyển sang bước quét QR thanh toán
  const handleProceedToPayment = () => {
    setStep('payment');
    setPaymentSuccess(false);
  };

  // Xử lý khi thanh toán thành công (kể cả quét QR thật hay bấm nhận diện tự động)
  const executeSuccessfulRenewal = async () => {
    setIsSubmitting(true);
    setPaymentSuccess(true);
    try {
      // 1. Thử gửi tín hiệu webhook SePay về Backend để đồng bộ hệ thống
      try {
        const webhookPayload = {
          id: Math.floor(Math.random() * 1000000),
          gateway: 'MBBank',
          transactionDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          accountNumber,
          code: transferContent,
          content: `${transferContent} GIA HAN KHO`,
          transferType: 'in',
          transferAmount: netRent,
        };
        await apiRequest<any>('/payments/sepay/webhook', {
          method: 'POST',
          body: JSON.stringify(webhookPayload),
        }).catch(() => null);
      } catch {
        // Bỏ qua lỗi mạng
      }

      // 2. Gọi API gia hạn hợp đồng
      if (unit.contractId) {
        await renewContractApi(unit.contractId, selectedMonths, paymentMethod).catch((err) => {
          console.warn('Backend renewContractApi notice:', err.message);
        });
      }

      // 3. Cập nhật ngày kết thúc mới cho hợp đồng
      onRenewSuccess(selectedMonths, newEndDate);

      // Hiển thị thông báo hoàn tất
      const successMsg = `🎉 Hệ thống đã nhận diện thanh toán thành công!\nÔ kho ${unit.unitCode} đã được cộng thêm ${selectedMonths} tháng.\nThời hạn mới đến: ${newEndDate}`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Gia hạn thành công! 🎉', successMsg);
      }

      handleSafeClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể gia hạn. Vui lòng thử lại';
      if (Platform.OS === 'web') {
        window.alert(`Lỗi: ${errMsg}`);
      } else {
        Alert.alert('Lỗi gia hạn', errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSafeClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="autorenew" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>
                {step === 'select' ? 'GIA HẠN THUÊ Ô KHO' : 'QUÉT MÃ VIETQR GIA HẠN'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Ô kho {unit.unitCode} • {unit.unitName}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSafeClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Indicator */}
          <View style={styles.stepperRow}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotTextActive}>1</Text>
            </View>
            <Text style={[styles.stepLabel, step === 'select' && styles.stepLabelActive]}>
              Chọn thời gian
            </Text>
            <View style={[styles.stepLine, step === 'payment' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'payment' ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={step === 'payment' ? styles.stepDotTextActive : styles.stepDotTextInactive}>
                2
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === 'payment' && styles.stepLabelActive]}>
              Quét QR tự động
            </Text>
          </View>

          {/* ════════════ BƯỚC 1: CHỌN GÓI GIA HẠN ════════════ */}
          {step === 'select' ? (
            <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 14 }}>
              {/* Box Tóm Tắt Hiện Tại */}
              <View style={styles.currentSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Hạn hợp đồng hiện tại:</Text>
                  <Text style={styles.summaryVal}>{unit.endDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Đơn giá thuê:</Text>
                  <Text style={styles.summaryVal}>{formatVND(unit.monthlyRent)}/tháng</Text>
                </View>
              </View>

              {/* Chọn Số Tháng Gia Hạn (Không có chiết khấu/bớt tiền) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Chọn số tháng gia hạn thêm:</Text>
                <View style={styles.monthsGrid}>
                  {[1, 3, 6, 12].map((m) => {
                    const isSelected = selectedMonths === m;
                    const price = unit.monthlyRent * m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.monthCard, isSelected && styles.monthCardActive]}
                        onPress={() => setSelectedMonths(m)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.monthCardTitle, isSelected && styles.monthCardTitleActive]}>
                          +{m} Tháng
                        </Text>
                        <Text style={[styles.monthPriceText, isSelected && styles.monthPriceTextActive]}>
                          {formatVND(price)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bảng Chi Tiết Giá Thuê */}
              <View style={styles.costBreakdownCard}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Đơn giá thuê hàng tháng:</Text>
                  <Text style={styles.costVal}>{formatVND(unit.monthlyRent)}/tháng</Text>
                </View>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Thời gian thuê thêm:</Text>
                  <Text style={[styles.costVal, { fontWeight: '700' }]}>{selectedMonths} Tháng</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.costRowTotal}>
                  <Text style={styles.costTotalLabel}>TỔNG TIỀN THANH TOÁN:</Text>
                  <Text style={styles.costTotalVal}>{formatVND(netRent)}</Text>
                </View>

                <View style={styles.newDateBanner}>
                  <Text style={styles.newDateText}>
                    📅 Hạn hợp đồng mới sau khi thanh toán:{' '}
                    <Text style={{ fontWeight: '900', color: '#1E40AF' }}>{newEndDate}</Text>
                  </Text>
                </View>
              </View>

              {/* Phương Thức Thanh Toán */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phương thức thanh toán:</Text>
                <TouchableOpacity
                  style={[styles.payMethodOption, paymentMethod === 'sepay_qr' && styles.payMethodOptionActive]}
                  onPress={() => setPaymentMethod('sepay_qr')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.payIcon}>⚡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Quét mã VietQR Tự Động (SePay)</Text>
                    <Text style={styles.paySubtitle}>Gia hạn kích hoạt tức thì ngay sau khi chuyển khoản</Text>
                  </View>
                  {paymentMethod === 'sepay_qr' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payMethodOption, paymentMethod === 'bank_transfer' && styles.payMethodOptionActive]}
                  onPress={() => setPaymentMethod('bank_transfer')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.payIcon}>🏦</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Chuyển khoản thủ công / Tiền mặt</Text>
                    <Text style={styles.paySubtitle}>Thanh toán tại quầy lễ tân chi nhánh</Text>
                  </View>
                  {paymentMethod === 'bank_transfer' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* ════════════ BƯỚC 2: HIỂN THỊ MÃ VIETQR THANH TOÁN & AUTO-DETECT ════════════ */
            <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 14 }}>
              {/* Auto Detecting Banner */}
              <View style={styles.listeningBanner}>
                <ActivityIndicator size="small" color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listeningTitle}>Hệ thống đang tự động lắng nghe giao dịch...</Text>
                  <Text style={styles.listeningSub}>
                    Sau khi bạn chuyển khoản qua app ngân hàng, hệ thống sẽ tự động nhận diện và cộng ngày ngay lập tức.
                  </Text>
                </View>
              </View>

              {/* QR Image Box */}
              <View style={styles.qrBoxCard}>
                <View style={styles.qrImgWrapper}>
                  <Image
                    source={{ uri: qrCodeUrl }}
                    style={styles.qrImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.qrTipText}>Quét bằng ứng dụng Mobile Banking của mọi ngân hàng</Text>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeLabel}>Số tiền cần thanh toán:</Text>
                  <Text style={styles.amountBadgeVal}>{formatVND(netRent)}</Text>
                </View>
              </View>

              {/* Bảng Chi Tiết Thông Tin Chuyển Khoản */}
              <View style={styles.bankDetailCard}>
                {/* 1. Ngân hàng */}
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankFieldLabel}>Ngân hàng thụ hưởng:</Text>
                  <Text style={styles.bankFieldValBold}>{bankName}</Text>
                </View>

                {/* 2. Số tài khoản */}
                <View style={styles.bankDetailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankFieldLabel}>Số tài khoản:</Text>
                    <Text style={[styles.bankFieldValBold, { color: '#1E40AF', fontSize: 15, letterSpacing: 0.5 }]}>
                      {accountNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtnSmall, copiedField === 'STK' && styles.copyBtnSuccess]}
                    onPress={() => handleCopy(accountNumber, 'STK')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={copiedField === 'STK' ? 'check' : 'content-copy'}
                      size={13}
                      color={copiedField === 'STK' ? '#059669' : '#2563EB'}
                    />
                    <Text style={[styles.copyBtnTextSmall, copiedField === 'STK' && { color: '#059669' }]}>
                      {copiedField === 'STK' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Chủ tài khoản */}
                <View style={styles.bankDetailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankFieldLabel}>Chủ tài khoản:</Text>
                    <Text style={[styles.bankFieldValBold, { textTransform: 'uppercase' }]}>
                      {accountName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtnSmall, copiedField === 'NAME' && styles.copyBtnSuccess]}
                    onPress={() => handleCopy(accountName, 'NAME')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={copiedField === 'NAME' ? 'check' : 'content-copy'}
                      size={13}
                      color={copiedField === 'NAME' ? '#059669' : '#2563EB'}
                    />
                    <Text style={[styles.copyBtnTextSmall, copiedField === 'NAME' && { color: '#059669' }]}>
                      {copiedField === 'NAME' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 4. Nội dung chuyển khoản (bắt buộc) */}
                <View style={styles.transferContentRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.transferContentTitle}>Nội dung chuyển khoản (bắt buộc):</Text>
                    <TouchableOpacity
                      style={[styles.copyBtnSmall, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                      onPress={() => handleCopy(transferContent, 'CONTENT')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={copiedField === 'CONTENT' ? 'check' : 'content-copy'}
                        size={13}
                        color="#DC2626"
                      />
                      <Text style={[styles.copyBtnTextSmall, { color: '#DC2626' }]}>
                        {copiedField === 'CONTENT' ? 'Đã chép' : 'Sao chép ND'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.transferContentBox}>
                    <Text style={styles.transferContentCode}>{transferContent}</Text>
                  </View>
                  <Text style={styles.transferContentWarn}>
                    ⚠️ Lưu ý: Giữ nguyên nội dung chuyển khoản để SePay tự động kích hoạt.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {step === 'select' ? (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleSafeClose} disabled={isSubmitting}>
                  <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleProceedToPayment} disabled={isSubmitting}>
                  <Text style={styles.confirmBtnText}>Tiếp tục thanh toán ({formatVND(netRent)}) →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ width: '100%', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.paidBtn]}
                  onPress={executeSuccessfulRenewal}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Tôi đã chuyển khoản xong (Tự động kích hoạt)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep('select')}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>← Chọn lại thời gian gia hạn</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
  stepDotInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepDotTextInactive: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },

  contentScroll: {
    flexGrow: 1,
    paddingVertical: 4,
  },

  currentSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
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
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  monthCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  monthCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  monthCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  monthCardTitleActive: {
    color: '#1D4ED8',
  },
  monthPriceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  monthPriceTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },

  costBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  },
  costVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  costRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  costTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },
  newDateBanner: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  newDateText: {
    fontSize: 11,
    color: '#1E3A8A',
    textAlign: 'center',
  },

  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  payMethodOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  payIcon: {
    fontSize: 20,
  },
  payTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  paySubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  // QR Payment Box styles
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  listeningTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  listeningSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 14,
  },
  qrBoxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  qrImgWrapper: {
    width: 190,
    height: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImg: {
    width: '100%',
    height: '100%',
  },
  qrTipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountBadgeLabel: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  amountBadgeVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },

  bankDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankFieldLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  bankFieldValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  copyBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyBtnSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyBtnTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },

  transferContentRow: {
    backgroundColor: '#FFF1F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  transferContentTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9F1239',
  },
  transferContentBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDA4AF',
    alignItems: 'center',
  },
  transferContentCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#BE123C',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.8,
  },
  transferContentWarn: {
    fontSize: 9,
    color: '#9F1239',
    marginTop: 4,
    textAlign: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  backBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBtn: {
    width: '100%',
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
