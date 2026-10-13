import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CheckInAppointment, AvailableUnit } from '../../types/handover';
import ContractPreviewModal from '../../components/staff/ContractPreviewModal';
import PrintReceiptModal from '../../components/staff/PrintReceiptModal';

interface HandoverDetailScreenProps {
  appointment: CheckInAppointment;
  availableUnits: AvailableUnit[];
  onBackToQueue: () => void;
  onCompleteHandover: (updatedData: {
    appointmentId: string;
    unitCode: string;
    condition: string;
    notes?: string;
  }) => void;
  isSubmitting?: boolean;
}

export default function HandoverDetailScreen({
  appointment,
  availableUnits,
  onBackToQueue,
  onCompleteHandover,
  isSubmitting = false,
}: HandoverDetailScreenProps) {
  // Active Tab trên điện thoại: 'verify' (Xác thực) hoặc 'actions' (Thao tác bàn giao)
  const [activeSubTab, setActiveSubTab] = useState<'verify' | 'actions'>('actions');

  // Trạng thái ô kho gán
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    appointment.assignedUnit || 'A-101'
  );
  const [showUnitPickerModal, setShowUnitPickerModal] = useState<boolean>(false);

  // Tình trạng kho & ghi chú
  const [condition, setCondition] = useState<string>(
    'Kho sạch sẽ, không mùi, đèn sáng, ổ khóa Smart Lock PIN hoạt động tốt'
  );
  const [customNotes, setCustomNotes] = useState<string>(appointment.specialNotes || '');

  // Trạng thái Modals
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Lọc danh sách ô kho trống phù hợp
  const compatibleUnits = availableUnits.filter(
    (u) => u.status === 'vacant' || u.code === selectedUnitCode
  );

  const handleFinishHandover = () => {
    // Mở modal xác nhận nội bộ (tương thích 100% cả Web, iOS và Android, không bị lỗi Alert.alert trên browser)
    setShowConfirmModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToQueue}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>XÁC THỰC & BÀN GIAO KHO</Text>
          <Text style={styles.headerSubtitle}>
            Đơn #{appointment.id.slice(-6).toUpperCase()} • {appointment.customerName}
          </Text>
        </View>

        {/* Nút In Tài Liệu nhanh */}
        <TouchableOpacity style={styles.quickPrintBtn} onPress={() => setShowPrintModal(true)}>
          <Text style={styles.quickPrintText}>🖨️ In</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control Tabs (Phù hợp cả Mobile & Tablet) */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeSubTab === 'verify' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('verify')}
        >
          <Text style={[styles.tabButtonText, activeSubTab === 'verify' && styles.tabButtonTextActive]}>
            👤 1. Xác thực & Đặt chỗ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeSubTab === 'actions' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('actions')}
        >
          <Text style={[styles.tabButtonText, activeSubTab === 'actions' && styles.tabButtonTextActive]}>
            🔑 2. Thao tác bàn giao
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollPadding}>
        {activeSubTab === 'verify' ? (
          /* ================= PHẦN BÊN TRÁI: XÁC THỰC KHÁCH HÀNG & CHI TIẾT ĐẶT CHỖ ================= */
          <View style={styles.tabContent}>
            {/* 1. Thông tin khách hàng */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>👤</Text>
                <Text style={styles.cardTitle}>Thông Tin Định Danh Khách Hàng</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Họ và tên:</Text>
                <Text style={styles.dataValueHighlight}>{appointment.customerName}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Số điện thoại:</Text>
                <Text style={styles.dataValue}>📞 {appointment.phone}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>CCCD / Hộ chiếu:</Text>
                <Text style={styles.dataValue}>🪪 {appointment.idCard || 'Đã đối chiếu thực tế'}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Email liên hệ:</Text>
                <Text style={styles.dataValue}>✉️ {appointment.email}</Text>
              </View>
            </View>

            {/* 2. Chi tiết đặt chỗ */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📋</Text>
                <Text style={styles.cardTitle}>Chi Tiết Đơn Đặt Chỗ</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Chi nhánh kho:</Text>
                <Text style={styles.dataValue}>{appointment.facilityName || 'Trụ sở chính Thủ Đức'}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Loại ngăn kho:</Text>
                <Text style={styles.dataValue}>{appointment.unitType} ({appointment.unitSize})</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Ngày bắt đầu:</Text>
                <Text style={styles.dataValue}>📅 {appointment.startDate}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Thời hạn thuê:</Text>
                <Text style={styles.dataValue}>⏱️ {appointment.durationMonths} Tháng</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Mục đích lưu trữ:</Text>
                <Text style={styles.dataValue}>{appointment.purpose || 'Đồ gia dụng & nội thất'}</Text>
              </View>
            </View>

            {/* 3. Trạng thái Đặt cọc & Tài chính */}
            <View style={[styles.card, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💵</Text>
                <Text style={[styles.cardTitle, { color: '#166534' }]}>Trạng Thái Tiền Cọc & Thanh Toán</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Tiền cọc giữ chỗ:</Text>
                <Text style={[styles.dataValueHighlight, { color: '#15803D' }]}>{appointment.depositAmount}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Trạng thái cọc:</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>✓ ĐÃ THANH TOÁN 100%</Text>
                </View>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Đơn giá thuê:</Text>
                <Text style={styles.dataValue}>{appointment.monthlyRent}</Text>
              </View>
              <Text style={styles.depositNote}>
                * Khách hàng đã hoàn tất cọc qua cổng thanh toán SePay/VietQR. Không cần thu thêm tiền cọc tại quầy.
              </Text>
            </View>

            <TouchableOpacity style={styles.nextStepBtn} onPress={() => setActiveSubTab('actions')}>
              <Text style={styles.nextStepBtnText}>Tiếp tục sang Thao Tác Bàn Giao →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= PHẦN BÊN PHẢI: CÁC THAO TÁC BÀN GIAO ================= */
          <View style={styles.tabContent}>
            {/* 1. GÁN Ô KHO: Menu thả xuống (Dropdown) để xác nhận hoặc thay đổi ô kho */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📦</Text>
                <Text style={styles.cardTitle}>Gán Ô Kho Vật Lý</Text>
              </View>
              <Text style={styles.fieldGuide}>
                Xác nhận ô kho đã gán hoặc chọn ô kho khác cùng loại còn trống nếu ô ban đầu không khả dụng:
              </Text>

              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setShowUnitPickerModal(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownLabel}>Ô KHO BÀN GIAO CHÍNH THỨC</Text>
                  <Text style={styles.dropdownSelectedValue}>{selectedUnitCode}</Text>
                  <Text style={styles.dropdownSubValue}>
                    {compatibleUnits.find((u) => u.code === selectedUnitCode)?.features ||
                      'Khóa điện tử Smart Lock PIN 24/7'}
                  </Text>
                </View>
                <View style={styles.changePill}>
                  <Text style={styles.changePillText}>ĐỔI Ô ▾</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* 2. KIỂM TRA HIỆN TRẠNG KHO BÀN GIAO */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🛡️</Text>
                <Text style={styles.cardTitle}>Kiểm Tra Hiện Trạng & Biên Bản</Text>
              </View>
              <Text style={styles.fieldGuide}>Tình trạng ô kho lúc bàn giao (lưu vào HandoverRecord):</Text>

              <TextInput
                style={styles.conditionInput}
                value={condition}
                onChangeText={setCondition}
                multiline
                placeholder="Nhập hiện trạng ngăn kho..."
              />

              <View style={styles.checklistQuickRow}>
                {['Sạch sẽ & Khô ráo', 'Khóa Smart PIN tốt', 'Bóng đèn hoạt động'].map((tag) => (
                  <View key={tag} style={styles.checkTag}>
                    <Text style={styles.checkTagText}>✓ {tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.fieldGuide, { marginTop: 10, marginBottom: 4 }]}>
                Ghi chú thêm của nhân viên khi bàn giao (tùy chọn):
              </Text>
              <TextInput
                style={[styles.conditionInput, { minHeight: 45 }]}
                value={customNotes}
                onChangeText={setCustomNotes}
                placeholder="Ví dụ: Đã cấp thẻ RFID phụ, hướng dẫn khách mở cửa..."
              />
            </View>

            {/* 3. HỢP ĐỒNG KỸ THUẬT SỐ: Xem trước hợp đồng cho thuê */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📑</Text>
                <Text style={styles.cardTitle}>Hợp Đồng Kỹ Thuật Số</Text>
              </View>
              <Text style={styles.fieldGuide}>
                Hợp đồng điện tử được sinh tự động theo mẫu chuẩn pháp lý với mã định danh duy nhất:
              </Text>

              <TouchableOpacity
                style={styles.previewContractBtn}
                onPress={() => setShowContractModal(true)}
              >
                <Text style={styles.previewContractBtnText}>👁️ Xem Trước Hợp Đồng Cho Thuê</Text>
              </TouchableOpacity>
            </View>

            {/* 4. CÁC NÚT BẤM & TƯƠNG TÁC CHÍNH (LUỒNG 2) */}
            <View style={styles.actionButtonGroup}>
              {/* [ In tài liệu ] */}
              <TouchableOpacity
                style={styles.printBtn}
                onPress={() => setShowPrintModal(true)}
              >
                <Text style={styles.printBtnText}>🖨️ [ In Tài Liệu Tại Quầy ]</Text>
              </TouchableOpacity>

              {/* [ Hoàn tất bàn giao ] */}
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={handleFinishHandover}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.completeBtnText}>✓ [ Hoàn Tất Bàn Giao ]</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL DROPDOWN CHỌN ĐỔI Ô KHO */}
      <Modal visible={showUnitPickerModal} transparent animationType="fade" onRequestClose={() => setShowUnitPickerModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerDialog}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>CHỌN Ô KHO THAY THẾ</Text>
              <TouchableOpacity onPress={() => setShowUnitPickerModal(false)} style={styles.closePickerBtn}>
                <Text style={styles.closePickerText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerSubtitle}>
              Danh sách ô kho thuộc loại <Text style={{ fontWeight: 'bold' }}>{appointment.unitType}</Text> đang sẵn sàng:
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {compatibleUnits.map((u) => {
                const isSelected = u.code === selectedUnitCode;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.unitPickItem, isSelected && styles.unitPickItemActive]}
                    onPress={() => {
                      setSelectedUnitCode(u.code);
                      setShowUnitPickerModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unitPickCode, isSelected && styles.unitPickCodeActive]}>
                        Ô kho: {u.code}
                      </Text>
                      <Text style={styles.unitPickDetail}>{u.floor} • {u.zone} • {u.size}</Text>
                      <Text style={styles.unitPickFeatures}>{u.features}</Text>
                    </View>
                    {isSelected && <Text style={styles.unitPickCheck}>✓ Đang chọn</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL XEM TRƯỚC HỢP ĐỒNG */}
      <ContractPreviewModal
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
        appointment={appointment}
        assignedUnitCode={selectedUnitCode}
        onPrint={() => setShowPrintModal(true)}
      />

      {/* MODAL IN TÀI LIỆU */}
      <PrintReceiptModal
        visible={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        appointment={appointment}
        assignedUnitCode={selectedUnitCode}
      />

      {/* MODAL XÁC NHẬN HOÀN TẤT BÀN GIAO (LUỒNG 2) */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) setShowConfirmModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmIconBadge}>
                <Text style={styles.confirmIconText}>🔐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmTitle}>XÁC NHẬN BÀN GIAO KHO</Text>
                <Text style={styles.confirmSubtitle}>
                  Kích hoạt hợp đồng và cấp khóa thông minh
                </Text>
              </View>
              {!isSubmitting && (
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={styles.closePickerBtn}
                >
                  <Text style={styles.closePickerText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.confirmBody}>
              {/* Thẻ tóm tắt thông tin */}
              <View style={styles.confirmSummaryCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Khách hàng:</Text>
                  <Text style={styles.confirmValBold}>{appointment.customerName}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Số điện thoại:</Text>
                  <Text style={styles.confirmVal}>{appointment.phone}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Ô kho bàn giao:</Text>
                  <View style={styles.confirmUnitBadge}>
                    <Text style={styles.confirmUnitBadgeText}>{selectedUnitCode}</Text>
                    <Text style={styles.confirmUnitType}>({appointment.unitType})</Text>
                  </View>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Hiện trạng:</Text>
                  <Text style={styles.confirmVal} numberOfLines={2}>
                    {condition || 'Kho sạch sẽ, không mùi, đèn sáng'}
                  </Text>
                </View>
              </View>

              {/* Danh sách hành động tự động */}
              <View style={styles.confirmActionsList}>
                <Text style={styles.confirmActionsListTitle}>Các tác vụ hệ thống sẽ thực thi ngay:</Text>
                <View style={styles.confirmActionItem}>
                  <Text style={styles.confirmActionCheck}>✓</Text>
                  <Text style={styles.confirmActionText}>
                    Kích hoạt Hợp đồng điện tử pháp lý chính thức
                  </Text>
                </View>
                <View style={styles.confirmActionItem}>
                  <Text style={styles.confirmActionCheck}>✓</Text>
                  <Text style={styles.confirmActionText}>
                    Chuyển ô kho <Text style={{ fontWeight: '700' }}>{selectedUnitCode}</Text> sang trạng thái{' '}
                    <Text style={{ fontWeight: '700', color: '#DC2626' }}>ĐANG THUÊ (Occupied)</Text>
                  </Text>
                </View>
                <View style={styles.confirmActionItem}>
                  <Text style={styles.confirmActionCheck}>✓</Text>
                  <Text style={styles.confirmActionText}>
                    Sinh mã Smart PIN 6 số và bàn giao quyền mở cửa
                  </Text>
                </View>
              </View>
            </View>

            {/* Nút hành động */}
            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmCancelText}>Kiểm tra lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={() => {
                  onCompleteHandover({
                    appointmentId: appointment.id,
                    unitCode: selectedUnitCode,
                    condition,
                    notes: customNotes,
                  });
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmSubmitText}>✓ Đồng Ý Bàn Giao</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  quickPrintBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPrintText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#2563EB',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#2563EB',
  },
  contentScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 14,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
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
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dataLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  dataValueHighlight: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '900',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  depositNote: {
    fontSize: 11,
    color: '#166534',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  nextStepBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  nextStepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fieldGuide: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 18,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    gap: 10,
  },
  dropdownLabel: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '800',
  },
  dropdownSelectedValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  dropdownSubValue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  changePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changePillText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  conditionInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 12,
    color: '#0F172A',
    minHeight: 65,
    textAlignVertical: 'top',
  },
  checklistQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  checkTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  checkTagText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  previewContractBtn: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  previewContractBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },
  actionButtonGroup: {
    gap: 10,
    marginTop: 10,
  },
  printBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  printBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  completeBtn: {
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 400,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  closePickerBtn: {
    padding: 4,
  },
  closePickerText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  unitPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitPickItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  unitPickCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitPickCodeActive: {
    color: '#1D4ED8',
  },
  unitPickDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  unitPickFeatures: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  unitPickCheck: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  confirmDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  confirmIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmIconText: {
    fontSize: 20,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  confirmSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  confirmBody: {
    gap: 12,
  },
  confirmSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  confirmValBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  confirmUnitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmUnitBadgeText: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '900',
  },
  confirmUnitType: {
    fontSize: 11,
    color: '#64748B',
  },
  confirmActionsList: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  confirmActionsListTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  confirmActionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  confirmActionCheck: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  confirmActionText: {
    fontSize: 12,
    color: '#14532D',
    flex: 1,
    lineHeight: 16,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSubmitText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
