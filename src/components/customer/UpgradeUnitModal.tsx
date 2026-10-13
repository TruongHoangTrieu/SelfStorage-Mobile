import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';

interface UpgradeUnitModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onRequestSubmitted: (targetTypeName: string, reason: string) => void;
}

export default function UpgradeUnitModal({
  visible,
  onClose,
  unit,
  onRequestSubmitted,
}: UpgradeUnitModalProps) {
  const [selectedTargetType, setSelectedTargetType] = useState<string>('UT-MED');
  const [reason, setReason] = useState<string>('Cần diện tích rộng hơn để chứa thêm tài sản');

  const unitTypes = [
    {
      code: 'UT-MINI',
      name: 'Kho Cá Nhân Mini',
      size: '4.9m²',
      price: 890000,
      desc: 'Phù hợp 10-15 thùng đồ & vali',
    },
    {
      code: 'UT-MED',
      name: 'Kho Gia Đình Tiêu Chuẩn',
      size: '9.0m²',
      price: 1690000,
      desc: 'Chứa nội thất căn hộ 1-2 phòng ngủ',
    },
    {
      code: 'UT-LARGE',
      name: 'Kho Doanh Nghiệp Lớn',
      size: '14.5m²',
      price: 2890000,
      desc: 'Chứa 4-6 pallet hàng hóa thương mại',
    },
    {
      code: 'UT-CLIMATE',
      name: 'Kho Mát Bảo Quản (Climate)',
      size: '6.5m²',
      price: 1990000,
      desc: 'Kiểm soát nhiệt độ 23-25°C & độ ẩm < 55%',
    },
  ];

  const target = unitTypes.find((t) => t.code === selectedTargetType) || unitTypes[1];
  const priceDifference = target.price - unit.monthlyRent;

  const handleSubmit = () => {
    onRequestSubmitted(target.name, reason);
    onClose();
    if (Platform.OS === 'web') {
      window.alert(
        `✅ Đã gửi yêu cầu điều chuyển từ ô ${unit.unitCode} sang loại "${target.name}"!\nQuản lý cơ sở sẽ liên hệ để xếp lịch bàn giao ô mới trong vòng 24h.`
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>NÂNG CẤP / ĐỔI Ô KHO</Text>
              <Text style={styles.subtitle}>Chuyển đổi kích thước ô kho theo nhu cầu</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={{ gap: 14 }}>
            {/* Box Kho Hiện Tại */}
            <View style={styles.currentCard}>
              <Text style={styles.currentCardTitle}>Ô KHO HIỆN TẠI ĐANG THUÊ:</Text>
              <View style={styles.currentRow}>
                <Text style={styles.currentCode}>{unit.unitCode}</Text>
                <Text style={styles.currentName}>{unit.unitName}</Text>
              </View>
              <Text style={styles.currentPrice}>
                {unit.size} • Giá thuê hiện tại: {formatVND(unit.monthlyRent)}/tháng
              </Text>
            </View>

            {/* Danh Sách Lựa Chọn Kho Mới */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Chọn loại ô kho mong muốn chuyển sang:</Text>
              <View style={styles.typeList}>
                {unitTypes.map((t) => {
                  const isSelected = selectedTargetType === t.code;
                  return (
                    <TouchableOpacity
                      key={t.code}
                      style={[styles.typeItem, isSelected && styles.typeItemActive]}
                      onPress={() => setSelectedTargetType(t.code)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.typeItemHeader}>
                          <Text style={[styles.typeName, isSelected && styles.typeNameActive]}>
                            {t.name} ({t.size})
                          </Text>
                          {isSelected && <Text style={styles.checkText}>✓ Đang chọn</Text>}
                        </View>
                        <Text style={styles.typeDesc}>{t.desc}</Text>
                        <Text style={styles.typePrice}>{formatVND(t.price)}/tháng</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bảng So Sánh Chênh Lệch Giá */}
            <View style={styles.diffCard}>
              <Text style={styles.diffTitle}>DỰ TOÁN CHÊNH LỆCH CHI PHÍ:</Text>
              <View style={styles.diffRow}>
                <Text style={styles.diffLabel}>Chênh lệch tiền thuê hàng tháng:</Text>
                <Text style={[styles.diffVal, priceDifference > 0 ? { color: '#B91C1C' } : { color: '#15803D' }]}>
                  {priceDifference > 0 ? `+${formatVND(priceDifference)}/tháng` : `${formatVND(priceDifference)}/tháng`}
                </Text>
              </View>
              <Text style={styles.diffNote}>
                * Tiền cọc đã nộp ({formatVND(unit.depositAmount)}) sẽ được tự động cấn trừ sang hợp đồng mới.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}>
              <Text style={styles.confirmBtnText}>✓ Gửi Yêu Cầu Chuyển Kho</Text>
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
    backgroundColor: '#FEF3C7',
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
  currentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  currentCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  currentName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  currentPrice: {
    fontSize: 11,
    color: '#64748B',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  typeList: {
    gap: 8,
  },
  typeItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  typeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  typeNameActive: {
    color: '#1D4ED8',
  },
  checkText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  typeDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  typePrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  diffCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  diffTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffLabel: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  diffVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  diffNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
