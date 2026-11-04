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
import { renewContractApi, apiRequest, checkPaymentCodeStatusApi } from '../../api';

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
  // State: 'select' (chọn kỳ hạn) | 'payment' (quét VietQR)
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState<'sepay_qr' | 'bank_transfer'>('sepay_qr');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Tính tiền thuê
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

  // Mã phiên ngẫu nhiên độc nhất cho mỗi lần mở QR (tránh trùng lặp với giao dịch cũ trong quá khứ)
  const [sessionNonce, setSessionNonce] = useState<string>(() =>
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Thông tin thanh toán SePay VietQR
  const bankName = 'MBBank';
  const accountNumber = '0838500046';
  const accountName = 'TRUONG DINH LONG';

  // Mã nội dung chuyển khoản gia hạn kèm nonce phiên
  const cleanUnitCode = (unit.unitCode || 'UNIT').replace(/[^A-Za-z0-9]/g, '');
  const transferContent = `SSREN${cleanUnitCode}${selectedMonths}T${sessionNonce}`;

  // URL VietQR tạo mã QR chuẩn
  const qrCodeUrl = `https://img.vietqr.io/image/MB-0838500046-compact2.png?amount=${netRent}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;

  // Tự động lắng nghe định kỳ khi ở bước quét QR
  const pollTimerRef = useRef<any>(null);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    if (visible && step === 'payment' && !paymentSuccess) {
      const checkPayment = async () => {
        if (isCheckingRef.current) return;
        isCheckingRef.current = true;
        try {
          const res = await checkPaymentCodeStatusApi(
            transferContent,
            netRent,
            sessionStartTimeRef.current
          );
          if (res && res.isPaid) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setPaymentSuccess(true);

            // Đảm bảo contract được cập nhật trên backend
            if (unit.contractId) {
              await renewContractApi(
                unit.contractId,
                selectedMonths,
                paymentMethod,
                transferContent
              ).catch(() => null);
            }

            if (Platform.OS === 'web') {
              window.alert('Thanh toán gia hạn thành công!');
            } else {
              Alert.alert('Thành công', 'Thanh toán gia hạn thành công!');
            }
            onRenewSuccess(selectedMonths, newEndDate);
            handleSafeClose();
          }
        } catch {
          // Lỗi mạng trong quá trình polling, không ngắt luồng
        } finally {
          isCheckingRef.current = false;
        }
      };

      // Đợi 2.5s sau khi mở QR mới bắt đầu polling để khách kịp quét mã
      pollTimerRef.current = setInterval(checkPayment, 2500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [visible, step, paymentSuccess, transferContent, netRent, selectedMonths, newEndDate, unit.contractId, paymentMethod]);

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

  // Đóng modal và reset trạng thái
  const handleSafeClose = () => {
    setStep('select');
    setIsSubmitting(false);
    setPaymentSuccess(false);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    onClose();
  };

  // Chuyển sang bước quét QR (sinh nonce mới và ghi nhận thời gian bắt đầu phiên)
  const handleProceedToPayment = () => {
    const newNonce = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSessionNonce(newNonce);
    sessionStartTimeRef.current = Date.now();
    setStep('payment');
    setPaymentSuccess(false);
  };

  // Xác nhận gia hạn thành công khi người dùng bấm nút thủ công
  const executeSuccessfulRenewal = async () => {
    setIsSubmitting(true);
    try {
      // 1. Kiểm tra trạng thái SePay cho phiên chuyển khoản hiện tại
      const checkRes = await checkPaymentCodeStatusApi(
        transferContent,
        netRent,
        sessionStartTimeRef.current
      ).catch(() => null);

      if (!checkRes || !checkRes.isPaid) {
        const notFoundMsg = `Hệ thống chưa ghi nhận tiền chuyển cho nội dung: ${transferContent}.\n\nNếu bạn vừa quét mã, vui lòng đợi 5-15 giây để ngân hàng xử lý hoặc kiểm tra lại nội dung chuyển khoản.`;
        if (Platform.OS === 'web') {
          window.alert(notFoundMsg);
        } else {
          Alert.alert('Chờ xác nhận', notFoundMsg);
        }
        return;
      }

      // 2. Cập nhật gia hạn hợp đồng trên hệ thống backend
      if (unit.contractId) {
        await renewContractApi(
          unit.contractId,
          selectedMonths,
          paymentMethod,
          transferContent
        ).catch((err) => {
          console.warn('Backend renewContractApi notice:', err.message);
        });
      }

      setPaymentSuccess(true);
      if (Platform.OS === 'web') {
        window.alert('Gia hạn hợp đồng thành công!');
      } else {
        Alert.alert('Thành công', 'Gia hạn hợp đồng thành công!');
      }
      onRenewSuccess(selectedMonths, newEndDate);
      handleSafeClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể gia hạn. Vui lòng thử lại';
      if (Platform.OS === 'web') {
        window.alert(`Lỗi: ${errMsg}`);
      } else {
        Alert.alert('Lỗi', errMsg);
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
                {step === 'select' ? 'Gia Hạn Hợp Đồng' : 'Thanh Toán Gia Hạn'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Ô kho {unit.unitCode} • {unit.unitName}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSafeClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Stepper Indicator */}
          <View style={styles.stepperRow}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotTextActive}>1</Text>
            </View>
            <Text style={[styles.stepLabel, step === 'select' && styles.stepLabelActive]}>
              Thời gian
            </Text>
            <View style={[styles.stepLine, step === 'payment' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'payment' ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={step === 'payment' ? styles.stepDotTextActive : styles.stepDotTextInactive}>
                2
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === 'payment' && styles.stepLabelActive]}>
              Thanh toán VietQR
            </Text>
          </View>

          {/* ════════════ BƯỚC 1: CHỌN GÓI GIA HẠN ════════════ */}
          {step === 'select' ? (
            <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 12 }}>
              {/* Box Tóm Tắt Hiện Tại */}
              <View style={styles.currentSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Hạn hiện tại:</Text>
                  <Text style={styles.summaryVal}>{unit.endDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Đơn giá:</Text>
                  <Text style={styles.summaryVal}>{formatVND(unit.monthlyRent)}/tháng</Text>
                </View>
              </View>

              {/* Chọn Số Tháng Gia Hạn */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Thời gian gia hạn:</Text>
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
                  <Text style={styles.costLabel}>Giá thuê:</Text>
                  <Text style={styles.costVal}>{formatVND(unit.monthlyRent)}/tháng</Text>
                </View>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Thời gian gia hạn:</Text>
                  <Text style={[styles.costVal, { fontWeight: '700' }]}>{selectedMonths} Tháng</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.costRowTotal}>
                  <Text style={styles.costTotalLabel}>Tổng thanh toán:</Text>
                  <Text style={styles.costTotalVal}>{formatVND(netRent)}</Text>
                </View>

                <View style={styles.newDateBanner}>
                  <MaterialIcons name="event" size={15} color="#1E40AF" />
                  <Text style={styles.newDateText}>
                    Hạn hợp đồng mới:{' '}
                    <Text style={{ fontWeight: '800', color: '#1E40AF' }}>{newEndDate}</Text>
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
                  <View style={styles.payIconBox}>
                    <MaterialIcons name="qr-code-scanner" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Chuyển khoản VietQR</Text>
                    <Text style={styles.paySubtitle}>Tự động kích hoạt ngay sau khi thanh toán</Text>
                  </View>
                  {paymentMethod === 'sepay_qr' && (
                    <MaterialIcons name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payMethodOption, paymentMethod === 'bank_transfer' && styles.payMethodOptionActive]}
                  onPress={() => setPaymentMethod('bank_transfer')}
                  activeOpacity={0.85}
                >
                  <View style={styles.payIconBox}>
                    <MaterialIcons name="storefront" size={20} color="#64748B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Thanh toán tại quầy</Text>
                    <Text style={styles.paySubtitle}>Tiền mặt hoặc quẹt thẻ tại cơ sở</Text>
                  </View>
                  {paymentMethod === 'bank_transfer' && (
                    <MaterialIcons name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* ════════════ BƯỚC 2: HIỂN THỊ MÃ VIETQR THANH TOÁN ════════════ */
            <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 12 }}>
              {/* Waiting Banner */}
              <View style={styles.listeningBanner}>
                <ActivityIndicator size="small" color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listeningTitle}>Chờ nhận chuyển khoản</Text>
                  <Text style={styles.listeningSub}>
                    Hệ thống tự động cập nhật hợp đồng sau khi nhận thanh toán.
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
                <Text style={styles.qrTipText}>Quét mã bằng ứng dụng ngân hàng</Text>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeLabel}>Số tiền:</Text>
                  <Text style={styles.amountBadgeVal}>{formatVND(netRent)}</Text>
                </View>
              </View>

              {/* Bảng Chi Tiết Thông Tin Chuyển Khoản */}
              <View style={styles.bankDetailCard}>
                {/* 1. Ngân hàng */}
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankFieldLabel}>Ngân hàng:</Text>
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

                {/* 4. Nội dung chuyển khoản */}
                <View style={styles.transferContentRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.transferContentTitle}>Nội dung chuyển khoản:</Text>
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
                        {copiedField === 'CONTENT' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.transferContentBox}>
                    <Text style={styles.transferContentCode}>{transferContent}</Text>
                  </View>
                  <View style={styles.transferNoteRow}>
                    <MaterialIcons name="info-outline" size={13} color="#BE123C" />
                    <Text style={styles.transferContentWarn}>
                      Lưu ý: Giữ đúng nội dung chuyển khoản để hệ thống xác nhận tự động.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {step === 'select' ? (
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleSafeClose} disabled={isSubmitting}>
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleProceedToPayment} disabled={isSubmitting}>
                  <Text style={styles.confirmBtnText}>Tiếp tục</Text>
                </TouchableOpacity>
              </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Xác nhận đã chuyển khoản</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep('select')}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>Quay lại</Text>
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
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 10,
    fontWeight: '800',
  },
  stepDotTextInactive: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  stepLine: {
    width: 18,
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },

  contentScroll: {
    flexGrow: 1,
    paddingVertical: 2,
  },

  currentSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 0,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },

  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  monthCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  monthCardTitleActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  monthPriceText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  monthPriceTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  costBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  costLabel: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 0,
  },
  costVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 1,
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
    fontWeight: '800',
    color: '#2563EB',
  },
  newDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  newDateText: {
    fontSize: 11,
    color: '#1E3A8A',
    flex: 1,
  },

  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  payMethodOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  payIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  paySubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },

  // QR Payment Box styles
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
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
    marginTop: 1,
    lineHeight: 14,
  },
  qrBoxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 6,
  },
  qrImgWrapper: {
    width: 180,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  amountBadgeLabel: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  amountBadgeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },

  bankDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  bankFieldLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  bankFieldValBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  copyBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  transferContentTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9F1239',
  },
  transferContentBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDA4AF',
    alignItems: 'center',
    marginVertical: 4,
  },
  transferContentCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#BE123C',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.6,
  },
  transferNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transferContentWarn: {
    fontSize: 9,
    color: '#9F1239',
    flex: 1,
  },

  // Footer
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paidBtn: {
    backgroundColor: '#16A34A',
    width: '100%',
  },
  backBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
