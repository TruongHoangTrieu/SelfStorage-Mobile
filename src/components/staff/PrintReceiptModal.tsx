import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CheckInAppointment } from '../../types/handover';

interface PrintReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: CheckInAppointment;
  assignedUnitCode: string;
}

export default function PrintReceiptModal({
  visible,
  onClose,
  appointment,
  assignedUnitCode,
}: PrintReceiptModalProps) {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('printer-pos-01');
  const [printContract, setPrintContract] = useState<boolean>(true);
  const [printPinReceipt, setPrintPinReceipt] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const handleExecutePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      onClose();
      if (Platform.OS === 'web') {
        window.alert(
          `In thành công 🎉\n\nĐã gửi lệnh in tài liệu đơn #${appointment.id.slice(-6).toUpperCase()} tới máy in quầy lễ tân.`
        );
      } else {
        Alert.alert(
          'In thành công 🎉',
          `Đã gửi lệnh in tài liệu đơn #${appointment.id.slice(-6).toUpperCase()} tới máy in quầy lễ tân.`,
          [{ text: 'Đóng' }]
        );
      }
    }, 1200);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>🖨️ IN TÀI LIỆU BÀN GIAO</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              In hợp đồng, phiếu bàn giao và thẻ mã PIN Smart Lock cho khách hàng{' '}
              <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>{appointment.customerName}</Text>.
            </Text>

            {/* Máy in chọn sẵn */}
            <Text style={styles.sectionLabel}>CHỌN MÁY IN TẠI CƠ SỞ:</Text>
            <View style={styles.printerList}>
              {[
                { id: 'printer-pos-01', name: 'Máy in Lễ tân (Epson POS-80 Nhiệt)', status: '🟢 Đang sẵn sàng' },
                { id: 'printer-office-a4', name: 'Máy in Văn phòng A4 (Canon LBP-2900 LAN)', status: '🟢 Đang sẵn sàng' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.printerOption, selectedPrinter === p.id && styles.printerOptionActive]}
                  onPress={() => setSelectedPrinter(p.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.printerName, selectedPrinter === p.id && styles.printerNameActive]}>
                      {p.name}
                    </Text>
                    <Text style={styles.printerStatus}>{p.status}</Text>
                  </View>
                  <View style={[styles.radioCircle, selectedPrinter === p.id && styles.radioCircleActive]}>
                    {selectedPrinter === p.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Danh mục tài liệu cần in */}
            <Text style={styles.sectionLabel}>TÀI LIỆU CẦN IN KÈM THEO:</Text>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setPrintContract(!printContract)}
            >
              <View style={[styles.checkbox, printContract && styles.checkboxChecked]}>
                {printContract && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkLabel}>Hợp đồng cho thuê kho điện tử (Khổ A4)</Text>
                <Text style={styles.checkSub}>Gồm điều khoản quyền lợi, tiền cọc và chữ ký 2 bên</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setPrintPinReceipt(!printPinReceipt)}
            >
              <View style={[styles.checkbox, printPinReceipt && styles.checkboxChecked]}>
                {printPinReceipt && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkLabel}>Phiếu bàn giao & Thẻ Smart PIN (Khổ K80)</Text>
                <Text style={styles.checkSub}>Số ô kho {assignedUnitCode || appointment.assignedUnit}, mã Smart Key 6 số, mã QR vào thang máy</Text>
              </View>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isPrinting}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.printBtn}
                onPress={handleExecutePrint}
                disabled={isPrinting || (!printContract && !printPinReceipt)}
              >
                {isPrinting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.printBtnText}>Gửi Lệnh In Ngay 🖨️</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxWidth: 420,
    maxHeight: '88%',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  printerList: {
    gap: 8,
    marginBottom: 16,
  },
  printerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  printerOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  printerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  printerNameActive: {
    color: '#1E40AF',
  },
  printerStatus: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  printBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
