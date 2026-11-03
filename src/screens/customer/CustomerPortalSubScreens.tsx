import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomerRentedUnit, CustomerUser } from '../../types/customerStorage';
import { formatVND, formatVietnameseDate } from '../../utils/formatters';
import { apiRequest } from '../../api';

// ==========================================
// 1. MÀN HÌNH THANH TOÁN & HÓA ĐƠN (LUỒNG 4)
// ==========================================
interface CustomerPaymentsScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onBack?: () => void;
  onOpenSidebar?: () => void;
}

export function CustomerPaymentsScreen({
  units,
  onBack,
  onBackToUnits,
  onOpenSidebar,
}: CustomerPaymentsScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 20));

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [apiPayments, setApiPayments] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tải trực tiếp danh sách thanh toán từ API Backend
  const loadPayments = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiRequest<any>('/payments');
      if (res) {
        const list = Array.isArray(res) ? res : res.data || res.items || [];
        if (list.length > 0) {
          setApiPayments(list);
        }
      }
    } catch {
      // Fallback về payments từ units
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments(true);
  }, []);

  // Tổng hợp toàn bộ danh sách giao dịch từ API hoặc từ units
  const allPayments = useMemo(() => {
    if (apiPayments.length > 0) {
      return apiPayments.map((p, idx) => {
        const contractCode =
          p.contract?.contractCode ||
          p.contractCode ||
          (p.reservation ? `ĐẶT CHỖ #${p.reservation.reservationCode || p.reservation.id}` : 'CON-2026');
        const matchedUnit = units.find(
          (u) =>
            String(u.contractId) === String(p.contractId || p.contract?.id) ||
            (p.contract?.contractCode && u.contractCode === p.contract.contractCode) ||
            (u.unitCode && ((p.notes && p.notes.includes(u.unitCode)) || (p.transactionReference && p.transactionReference.includes(u.unitCode))))
        );

        const unitCode =
          matchedUnit?.unitCode ||
          p.contract?.contractItems?.[0]?.unit?.unitNumber ||
          p.reservation?.unit?.unitNumber ||
          p.unitCode ||
          (units.length > 0 ? units[idx % units.length]?.unitCode : '') ||
          'Ô kho';
        const typeLabel =
          p.paymentType === 'DEPOSIT'
            ? 'Tiền cọc bảo đảm'
            : p.paymentType === 'RENTAL'
            ? 'Tiền thuê kho kỳ đầu'
            : 'Gia hạn thuê kho';
        const paidAt = p.paidAt
          ? formatVietnameseDate(p.paidAt)
          : p.createdAt
          ? formatVietnameseDate(p.createdAt)
          : 'Hôm nay';

        return {
          id: String(p.id || idx),
          paymentCode: p.paymentCode || `PAY-${p.id}`,
          amount: Number(p.amount) || 0,
          type: p.paymentType || 'RENTAL',
          typeLabel,
          status: p.status || 'PAID',
          paidAt,
          method: p.paymentMethod || 'SEPAY_QR',
          periodDescription: p.transactionReference || p.notes || `Thanh toán hợp đồng ${contractCode}`,
          unitCode,
          contractCode,
        };
      });
    }

    return units.flatMap((u) =>
      (u.payments || []).map((p) => ({ ...p, unitCode: u.unitCode, contractCode: u.contractCode }))
    );
  }, [apiPayments, units]);

  // Tổng tiền đã thanh toán thành công
  const totalPaid = useMemo(() => {
    return allPayments
      .filter((p) => p.status === 'PAID' || p.status === 'SUCCESS' || !p.status)
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [allPayments]);

  // Tổng tiền cọc đang giữ
  const totalDeposit = useMemo(() => {
    return allPayments
      .filter((p) => p.type === 'DEPOSIT' && (p.status === 'PAID' || p.status === 'SUCCESS' || !p.status))
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [allPayments]);

  // Cước quá hạn / chưa thanh toán
  const overdueBalance = useMemo(() => {
    return allPayments
      .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [allPayments]);

  const handleDownloadInvoice = (code: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Đã xuất hóa đơn điện tử VAT cho giao dịch #${code}. File PDF đã được gửi về email.`);
    } else {
      Alert.alert('Hóa đơn điện tử VAT', `Đã xuất hóa đơn cho giao dịch #${code}. File PDF đã được gửi về email của bạn.`);
    }
  };

  return (
    <View style={ps.container}>
{/* TOP HEADER */}
      <View style={[ps.header, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={ps.navBackBtn}
          onPress={() => (onBack ? onBack() : onBackToUnits?.())}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={16} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ps.headerSubtitle}>TÀI CHÍNH & HÓA ĐƠN</Text>
          <Text style={ps.headerTitle}>Lịch Sử Thanh Toán</Text>
        </View>
      </View>

            <ScrollView
        style={ps.scroll}
        contentContainerStyle={ps.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadPayments(false);
            }}
          />
        }
      >
        {/* TRANSACTION HISTORY SECTION */}
        <View style={ps.sectionTitleRow}>
          <Text style={ps.sectionTitle}>Các Giao Dịch Gần Đây ({allPayments.length})</Text>
        </View>

        {loading && allPayments.length === 0 ? (
          <View style={ps.loadingBox}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={ps.loadingText}>Đang tải dữ liệu thanh toán từ máy chủ...</Text>
          </View>
        ) : allPayments.length === 0 ? (
          <View style={ps.emptyBox}>
            <MaterialIcons name="receipt-long" size={44} color="#cbd5e1" />
            <Text style={ps.emptyText}>Chưa có giao dịch phát sinh</Text>
          </View>
        ) : (
          allPayments.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={ps.paymentCard}
              activeOpacity={0.85}
              onPress={() => setSelectedReceipt(p)}
            >
              <View style={ps.paymentCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={ps.paymentTypeLabel}>{p.typeLabel}</Text>
                  <Text style={ps.paymentSubCode}>
                    HĐ: #{p.contractCode?.slice(-6) || 'CON'} • Ô: {p.unitCode} • Mã: {p.paymentCode}
                  </Text>
                </View>
                <View style={ps.paidBadge}>
                  <MaterialIcons name="check-circle" size={12} color="#059669" />
                  <Text style={ps.paidBadgeText}>ĐÃ NỘP</Text>
                </View>
              </View>

              <View style={ps.paymentCardBody}>
                <Text style={ps.paymentAmount}>{formatVND(p.amount)}</Text>
                <View style={ps.dateRow}>
                  <MaterialIcons name="calendar-today" size={13} color="#64748b" />
                  <Text style={ps.paymentDate}>{p.paidAt}</Text>
                </View>
              </View>

              {Boolean(p.periodDescription) && (
                <View style={ps.descBox}>
                  <Text style={ps.paymentDesc}>{p.periodDescription}</Text>
                </View>
              )}


            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PAYMENT RECEIPT MODAL SÁNG ĐỒNG BỘ */}
      {selectedReceipt && (
        <Modal
          visible={Boolean(selectedReceipt)}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <View style={ps.modalOverlay}>
            <View style={ps.modalBox}>
              <View style={ps.modalHeaderRow}>
                <Text style={ps.modalHeaderTitle}>BIÊN NHẬN ĐIỆN TỬ SEPAY</Text>
                <TouchableOpacity onPress={() => setSelectedReceipt(null)} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={ps.modalAmountBox}>
                <Text style={ps.modalAmountText}>{formatVND(selectedReceipt.amount)}</Text>
                <View style={ps.modalSuccessBadge}>
                  <MaterialIcons name="check-circle" size={13} color="#059669" />
                  <Text style={ps.modalSuccessBadgeText}>ĐÃ THANH TOÁN THÀNH CÔNG</Text>
                </View>
              </View>

              <View style={ps.modalDetailsList}>
                <View style={ps.modalDetailRow}>
                  <Text style={ps.modalDetailLabel}>Loại thanh toán:</Text>
                  <Text style={ps.modalDetailVal} numberOfLines={1}>{selectedReceipt.typeLabel}</Text>
                </View>
                <View style={ps.modalDetailRow}>
                  <Text style={ps.modalDetailLabel}>Mã giao dịch:</Text>
                  <Text
                    style={[ps.modalDetailVal, { color: '#2563eb' }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {selectedReceipt.paymentCode}
                  </Text>
                </View>
                <View style={ps.modalDetailRow}>
                  <Text style={ps.modalDetailLabel}>Hợp đồng & Ô kho:</Text>
                  <Text style={ps.modalDetailVal} numberOfLines={2}>
                    {selectedReceipt.contractCode?.startsWith('#') ? selectedReceipt.contractCode : `#${selectedReceipt.contractCode}`} • {selectedReceipt.unitCode}
                  </Text>
                </View>
                <View style={ps.modalDetailRow}>
                  <Text style={ps.modalDetailLabel}>Thời gian:</Text>
                  <Text style={ps.modalDetailVal}>{selectedReceipt.paidAt}</Text>
                </View>
                <View style={ps.modalDetailRow}>
                  <Text style={ps.modalDetailLabel}>Phương thức:</Text>
                  <Text style={ps.modalDetailVal}>Cổng SePay VietQR (Tự động)</Text>
                </View>
                {Boolean(selectedReceipt.periodDescription) && (
                  <View style={ps.modalDescBox}>
                    <Text style={ps.modalDescText}>{selectedReceipt.periodDescription}</Text>
                  </View>
                )}
              </View>

              <View style={ps.modalActionRow}>
                <TouchableOpacity
                  style={ps.modalCloseBtn}
                  onPress={() => setSelectedReceipt(null)}
                  activeOpacity={0.8}
                >
                  <Text style={ps.modalCloseBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navBackBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtnText: {
    color: '#1e293b',
    fontSize: 11.5,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricNote: {
    color: '#94a3b8',
    fontSize: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerTitle: {
    color: '#1e40af',
    fontSize: 13,
    fontWeight: '800',
  },
  infoBannerDesc: {
    color: '#2563eb',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitleRow: {
    marginTop: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentTypeLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentSubCode: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  paymentCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  paymentAmount: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDate: {
    color: '#64748b',
    fontSize: 11.5,
  },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
  },
  paymentDesc: {
    color: '#475569',
    fontSize: 11.5,
  },
  paymentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  paymentMethodText: {
    color: '#94a3b8',
    fontSize: 10.5,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  invoiceBtnText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalAmountBox: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalAmountText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#059669',
  },
  modalSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  modalSuccessBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  modalDetailsList: {
    paddingVertical: 14,
    gap: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    flexShrink: 0,
    width: 115,
  },
  modalDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  modalDescBox: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  modalDescText: {
    fontSize: 11,
    color: '#475569',
  },
  modalActionRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
});


// ==========================================
// 2. MÀN HÌNH TRUY CẬP & BẢO MẬT (SMART PIN)
// ==========================================
interface CustomerAccessScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar?: () => void;
  onOpenGuestPin: (unit: CustomerRentedUnit) => void;
  onOpenChangePin: (unit: CustomerRentedUnit) => void;
}

export function CustomerAccessScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
  onOpenGuestPin,
  onOpenChangePin,
}: CustomerAccessScreenProps) {
  const [pinVisibility, setPinVisibility] = useState<Record<string, boolean>>({});

  const togglePin = (unitId: string) => {
    setPinVisibility((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>AN NINH & KHÓA ĐIỆN TỬ</Text>
          <Text style={styles.headerTitle}>Truy Cập & Smart Key</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.securityBanner}>
          <Text style={styles.securityBannerIcon}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityBannerTitle}>Bảo Mật Cấp Độ Cao 24/7</Text>
            <Text style={styles.securityBannerDesc}>
              Khóa Smart Lock được kết nối IoT thời gian thực. Mỗi lần mở cửa đều được ghi log bảo vệ tài sản của bạn.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mã PIN Chính Từng Ô Kho ({units.length})</Text>

        {units.map((u) => {
          const isShow = pinVisibility[u.id];
          return (
            <View key={u.id} style={styles.unitAccessCard}>
              <View style={styles.unitAccessHeader}>
                <View>
                  <Text style={styles.unitAccessCode}>Ô {u.unitCode} • {u.unitName}</Text>
                  <Text style={styles.unitAccessLocation}>
                    {u.facilityName} ({u.floor})
                  </Text>
                </View>
                <View style={styles.batteryBadge}>
                  <Text style={styles.batteryBadgeText}>🔋 Pin Khóa 95%</Text>
                </View>
              </View>

              <View style={styles.pinBox}>
                <View>
                  <Text style={styles.pinBoxLabel}>MÃ SMART PIN CHỦ</Text>
                  <Text style={styles.pinBoxNumber}>{isShow ? u.masterPin : '••••••'}</Text>
                </View>
                <TouchableOpacity style={styles.peekBtn} onPress={() => togglePin(u.id)}>
                  <Text style={styles.peekBtnText}>{isShow ? 'Ẩn 🙈' : 'Xem 👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accessActionRow}>
                <TouchableOpacity
                  style={styles.changePinActionBtn}
                  onPress={() => onOpenChangePin(u)}
                >
                  <Text style={styles.changePinActionText}>🔑 Đổi Mã PIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createGuestActionBtn}
                  onPress={() => onOpenGuestPin(u)}
                >
                  <Text style={styles.createGuestActionText}>⏱️ + Tạo Mã Cho Khách</Text>
                </TouchableOpacity>
              </View>

              {/* Danh sách mã khách của ô này */}
              {u.guestAccessCodes && u.guestAccessCodes.length > 0 && (
                <View style={styles.guestCodeSection}>
                  <Text style={styles.guestCodeTitle}>
                    Mã khách đang hiệu lực ({u.guestAccessCodes.length}):
                  </Text>
                  {u.guestAccessCodes.map((g) => (
                    <View key={g.id} style={styles.guestCodeItem}>
                      <View>
                        <Text style={styles.guestCodeName}>👤 {g.guestName}</Text>
                        <Text style={styles.guestCodeExpiry}>Hạn dùng: {g.validTo}</Text>
                      </View>
                      <View style={styles.guestPinBadge}>
                        <Text style={styles.guestPinBadgeText}>{g.pinCode}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 3. MÀN HÌNH TÀI LIỆU & HỢP ĐỒNG
// ==========================================
interface CustomerDocumentsScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar?: () => void;
}

export function CustomerDocumentsScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
}: CustomerDocumentsScreenProps) {
  const handleViewDoc = (name: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Đang mở bản xem trước tài liệu "${name}" có chữ ký điện tử.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>HỒ SƠ PHÁP LÝ</Text>
          <Text style={styles.headerTitle}>Tài Liệu & Hợp Đồng</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Hợp Đồng Thuê Kho Điện Tử</Text>

        {units.map((u) => (
          <View key={u.id} style={styles.docCard}>
            <View style={styles.docCardHeader}>
              <Text style={styles.docIcon}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Hợp Đồng Thuê Ô {u.unitCode}</Text>
                <Text style={styles.docCode}>Mã: #{u.contractCode} • {u.unitName}</Text>
                <Text style={styles.docDates}>Thời hạn: {u.startDate} → {u.endDate}</Text>
              </View>
              <View style={styles.signedBadge}>
                <Text style={styles.signedBadgeText}>✓ ĐÃ KÝ SỐ</Text>
              </View>
            </View>

            <View style={styles.docItemList}>
              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Hợp Đồng Điện Tử ${u.contractCode}`)}
              >
                <Text style={styles.docItemText}>📑 Hợp đồng thuê kho tự quản (PDF có dấu)</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Biên Bản Bàn Giao Ô ${u.unitCode}`)}
              >
                <Text style={styles.docItemText}>📋 Biên bản nghiệm thu bàn giao & cấp mã PIN</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Chứng Nhận Bảo Hiểm Ô ${u.unitCode}`)}
              >
                <Text style={styles.docItemText}>🛡️ Giấy chứng nhận bảo hiểm tài sản PCCC</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 4. MÀN HÌNH HỖ TRỢ & TRỢ GIÚP (LUỒNG 7)
// ==========================================
interface CustomerSupportScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar?: () => void;
  onOpenReportIssue: (unit: CustomerRentedUnit) => void;
}

export function CustomerSupportScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
  onOpenReportIssue,
}: CustomerSupportScreenProps) {
  const allTickets = units.flatMap((u) =>
    (u.supportTickets || []).map((t) => ({ ...t, unitCode: u.unitCode }))
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>TRUNG TÂM CSKH 24/7</Text>
          <Text style={styles.headerTitle}>Hỗ Trợ & Sự Cố</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hotline Bar */}
        <View style={styles.hotlineBox}>
          <View style={styles.hotlineLeft}>
            <Text style={styles.hotlineIcon}>📞</Text>
            <View>
              <Text style={styles.hotlineLabel}>ĐƯỜNG DÂY NÓNG KHẨN CẤP (24/7)</Text>
              <Text style={styles.hotlineNumber}>1900 6868</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              if (Platform.OS === 'web') window.alert('Đang kết nối tổng đài viên CSKH 1900 6868...');
            }}
          >
            <Text style={styles.callBtnText}>Gọi Ngay</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Report Issue Button */}
        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => {
            if (units.length > 0) onOpenReportIssue(units[0]);
          }}
        >
          <Text style={styles.newTicketBtnIcon}>🛠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.newTicketBtnTitle}>Tạo Phiếu Báo Cố Mới</Text>
            <Text style={styles.newTicketBtnDesc}>
              Báo kẹt khóa Smart Lock, đèn hỏng, ẩm ướt, yêu cầu kỹ thuật tại chỗ
            </Text>
          </View>
          <Text style={styles.newTicketArrow}>→</Text>
        </TouchableOpacity>

        {/* Tickets List */}
        <Text style={styles.sectionTitle}>Các Phiếu Yêu Cầu Của Bạn ({allTickets.length})</Text>

        {allTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Hiện tại không có sự cố nào đang chờ xử lý.</Text>
          </View>
        ) : (
          allTickets.map((t) => (
            <View key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketCardHeader}>
                <View>
                  <Text style={styles.ticketSubject}>{t.subject}</Text>
                  <Text style={styles.ticketMeta}>
                    Mã #{t.requestCode} • Ô {t.unitCode} • Ngày tạo: {t.createdAt}
                  </Text>
                </View>
                <View
                  style={[
                    styles.ticketStatusBadge,
                    t.status === 'RESOLVED' && { backgroundColor: '#065F46' },
                  ]}
                >
                  <Text style={styles.ticketStatusText}>
                    {t.status === 'RESOLVED' ? '✓ ĐÃ XỬ LÝ' : '⏳ ĐANG XỬ LÝ'}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketDesc}>{t.description}</Text>

              {t.resolutionNotes && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>Kỹ thuật viên phản hồi:</Text>
                  <Text style={styles.resolutionText}>{t.resolutionNotes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 5. MÀN HÌNH HỒ SƠ & CÀI ĐẶT
// ==========================================
interface CustomerProfileScreenProps {
  currentUser: CustomerUser;
  onBackToUnits: () => void;
  onOpenSidebar?: () => void;
}

export function CustomerProfileScreen({
  currentUser,
  onBackToUnits,
  onOpenSidebar,
}: CustomerProfileScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>CÀI ĐẶT TÀI KHOẢN</Text>
          <Text style={styles.headerTitle}>Hồ Sơ Cá Nhân</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: currentUser.avatar }} style={styles.profileAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{currentUser.fullName}</Text>
            <Text style={styles.profileEmail}>{currentUser.email}</Text>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>⭐ {currentUser.membershipTier}</Text>
            </View>
          </View>
        </View>

        {/* Detailed Fields */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldSectionTitle}>Thông Tin Định Danh Khách Hàng</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Số điện thoại:</Text>
            <Text style={styles.fieldValue}>{currentUser.phone}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>CCCD / Hộ chiếu:</Text>
            <Text style={styles.fieldValue}>079095012345</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Địa chỉ liên hệ:</Text>
            <Text style={styles.fieldValue}>25 Đường Số 7, P. Linh Trung, Thủ Đức</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Ngày gia nhập:</Text>
            <Text style={styles.fieldValue}>{currentUser.joinedDate}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricNote: {
    color: '#64748B',
    fontSize: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0C4A6E',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  infoBannerIcon: {
    fontSize: 24,
  },
  infoBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  infoBannerDesc: {
    color: '#BAE6FD',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  paymentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentTypeLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentSubCode: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paidBadgeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
  },
  paymentCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentAmount: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '900',
  },
  paymentDate: {
    color: '#94A3B8',
    fontSize: 11,
  },
  paymentDesc: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  paymentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  paymentMethodText: {
    color: '#64748B',
    fontSize: 10,
  },
  invoiceBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  invoiceBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#064E3B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  securityBannerIcon: {
    fontSize: 24,
  },
  securityBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  securityBannerDesc: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  unitAccessCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  unitAccessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  unitAccessCode: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  unitAccessLocation: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  batteryBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batteryBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  pinBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinBoxLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  pinBoxNumber: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 2,
  },
  peekBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  peekBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  accessActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  changePinActionBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePinActionText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  createGuestActionBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  createGuestActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  guestCodeSection: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 8,
  },
  guestCodeTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  guestCodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
  },
  guestCodeName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  guestCodeExpiry: {
    color: '#64748B',
    fontSize: 10,
  },
  guestPinBadge: {
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  guestPinBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  docCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIcon: {
    fontSize: 26,
  },
  docTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  docCode: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  docDates: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  signedBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signedBadgeText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '900',
  },
  docItemList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  docItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  docItemText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  docItemAction: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  hotlineBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#831843',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BE185D',
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hotlineIcon: {
    fontSize: 24,
  },
  hotlineLabel: {
    color: '#FBCFE8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hotlineNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  callBtn: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  newTicketBtnIcon: {
    fontSize: 24,
  },
  newTicketBtnTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  newTicketBtnDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  newTicketArrow: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  ticketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketSubject: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  ticketMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  ticketStatusBadge: {
    backgroundColor: '#854D0E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketStatusText: {
    color: '#FEF08A',
    fontSize: 9,
    fontWeight: '800',
  },
  ticketDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  resolutionBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  resolutionLabel: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  resolutionText: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  vipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  vipBadgeText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
  },
  fieldSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  fieldSectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  fieldValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  roleSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
    marginTop: 8,
  },
  roleSwitchIcon: {
    fontSize: 24,
  },
  roleSwitchTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  roleSwitchDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  roleSwitchArrow: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
});
