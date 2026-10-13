import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { CheckInAppointment } from '../../types/handover';

interface ContractPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: CheckInAppointment;
  assignedUnitCode: string;
  onPrint?: () => void;
}

export default function ContractPreviewModal({
  visible,
  onClose,
  appointment,
  assignedUnitCode,
  onPrint,
}: ContractPreviewModalProps) {
  const currentDate = new Date().toLocaleDateString('vi-VN');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.modalTitle}>📄 HỢP ĐỒNG THUÊ KHO ĐIỆN TỬ</Text>
              <Text style={styles.modalSubtitle}>Mã dự kiến: CON-20261013-{(appointment.id.slice(-6)).toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Contract Content */}
          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollPadding}>
            <View style={styles.legalHeader}>
              <Text style={styles.countryHeader}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
              <Text style={styles.mottoHeader}>Độc lập - Tự do - Hạnh phúc</Text>
              <Text style={styles.contractDocTitle}>HỢP ĐỒNG DỊCH VỤ CHO THUÊ KHO TỰ QUẢN</Text>
              <Text style={styles.contractDate}>Ngày ký kết: {currentDate}</Text>
            </View>

            {/* Bên A */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>BÊN CHO THUÊ (BÊN A):</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Đơn vị:</Text> HỆ THỐNG KHO TỰ PHỤC VỤ SELFSTORAGE VIỆT NAM</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Chi nhánh:</Text> {appointment.facilityName || 'Trụ sở chính Thủ Đức'}</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Hotline hỗ trợ:</Text> 1900 6868 - Giám sát an ninh 24/7</Text>
            </View>

            {/* Bên B */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>BÊN THUÊ KHO (BÊN B):</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Họ và tên:</Text> {appointment.customerName}</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Số điện thoại:</Text> {appointment.phone}</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>CCCD/Passport:</Text> {appointment.idCard || 'Đã đối chiếu thực tế'}</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>Email:</Text> {appointment.email}</Text>
            </View>

            {/* Điều 1: Đối tượng thuê */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>ĐIỀU 1: THÔNG TIN NGĂN KHO BÀN GIAO</Text>
              <View style={styles.infoGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>MÃ SỐ Ô KHO</Text>
                  <Text style={styles.gridValueHighlight}>{assignedUnitCode || appointment.assignedUnit}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>LOẠI KHO</Text>
                  <Text style={styles.gridValue}>{appointment.unitType}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>KÍCH THƯỚC</Text>
                  <Text style={styles.gridValue}>{appointment.unitSize}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>THỜI HẠN THUÊ</Text>
                  <Text style={styles.gridValue}>{appointment.durationMonths} Tháng</Text>
                </View>
              </View>
            </View>

            {/* Điều 2: Tài chính */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>ĐIỀU 2: GIÁ THUÊ & TIỀN CỌC ĐẢM BẢO</Text>
              <Text style={styles.fieldRow}><Text style={styles.fieldLabel}>• Đơn giá thuê tháng:</Text> {appointment.monthlyRent}</Text>
              <Text style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>• Tiền đặt cọc giữ chỗ:</Text> {appointment.depositAmount}{' '}
                <Text style={{ color: '#059669', fontWeight: 'bold' }}>[ĐÃ THANH TOÁN 100%]</Text>
              </Text>
              <Text style={styles.noteLegal}>* Tiền cọc được hoàn trả 100% khi thanh lý hợp đồng và bàn giao kho nguyên trạng.</Text>
            </View>

            {/* Điều 3: Quyền & Mã khóa */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>ĐIỀU 3: QUY TẮC AN NINH & SMART ACCESS</Text>
              <Text style={styles.bulletItem}>1. Khách hàng được cấp mã PIN bảo mật cá nhân 6 số truy cập 24/7.</Text>
              <Text style={styles.bulletItem}>2. Tuyệt đối không lưu trữ hàng cấm, chất cháy nổ, chất độc hại hoặc sinh vật sống.</Text>
              <Text style={styles.bulletItem}>3. Hệ thống camera AI giám sát hành lang và cảm biến khói tự động kết nối PCCC.</Text>
            </View>

            {/* Chữ ký */}
            <View style={styles.signatureRow}>
              <View style={styles.signBox}>
                <Text style={styles.signTitle}>ĐẠI DIỆN BÊN A</Text>
                <Text style={styles.signSubtitle}>(Đã ký điện tử)</Text>
                <Text style={styles.signStamp}>✓ HỆ THỐNG XÁC THỰC</Text>
              </View>
              <View style={styles.signBox}>
                <Text style={styles.signTitle}>ĐẠI DIỆN BÊN B</Text>
                <Text style={styles.signSubtitle}>(Xác thực tại quầy)</Text>
                <Text style={styles.signCustomer}>{appointment.customerName}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
              <Text style={styles.closeActionText}>Quay Lại</Text>
            </TouchableOpacity>

            {onPrint && (
              <TouchableOpacity
                style={styles.printActionBtn}
                onPress={() => {
                  onClose();
                  onPrint();
                }}
              >
                <Text style={styles.printActionText}>🖨️ In Hợp Đồng</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 12,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollPadding: {
    padding: 16,
  },
  legalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  countryHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  mottoHeader: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
    marginBottom: 8,
  },
  contractDocTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 4,
  },
  contractDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  fieldRow: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  fieldLabel: {
    fontWeight: '700',
    color: '#0F172A',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gridItem: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    flex: 1,
    minWidth: '45%',
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  gridValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 2,
  },
  gridValueHighlight: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '900',
    marginTop: 2,
  },
  noteLegal: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 6,
  },
  bulletItem: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  signBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  signTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  signSubtitle: {
    fontSize: 9,
    color: '#64748B',
  },
  signStamp: {
    fontSize: 11,
    fontWeight: '900',
    color: '#059669',
  },
  signCustomer: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  footerRow: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  closeActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  printActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
