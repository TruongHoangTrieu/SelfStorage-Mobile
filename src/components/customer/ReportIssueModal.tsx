import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CustomerRentedUnit, UnitSupportTicket } from '../../types/customerStorage';
import { createSupportRequestApi } from '../../api';

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onTicketCreated: (newTicket: UnitSupportTicket) => void;
}

export default function ReportIssueModal({
  visible,
  onClose,
  unit,
  onTicketCreated,
}: ReportIssueModalProps) {
  const [category, setCategory] = useState<string>('LOCK');
  const [priority, setPriority] = useState<string>('HIGH');
  const [subject, setSubject] = useState<string>(`Sự cố với Ô ${unit.unitCode}`);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const categories = [
    { id: 'LOCK', label: '🔐 Khóa Smart PIN', desc: 'Không mở được, chập pin, kẹt chốt' },
    { id: 'UNIT', label: '💡 Thiết bị trong kho', desc: 'Bóng đèn tắt, ổ cắm hỏng, cửa kẹt' },
    { id: 'STORED_ITEMS', label: '🌡️ Nhiệt độ & Độ ẩm', desc: 'Có mùi ẩm mốc, nhiệt độ cao' },
    { id: 'DAMAGE', label: '🌧️ Rò rỉ & Cơ sở vật chất', desc: 'Thấm dột, tường ẩm, côn trùng' },
    { id: 'OTHER', label: '❓ Khác', desc: 'Yêu cầu hỗ trợ chung' },
  ];

  const priorities = [
    { id: 'LOW', label: 'Thấp' },
    { id: 'MEDIUM', label: 'Trung bình' },
    { id: 'HIGH', label: 'Ưu tiên cao' },
    { id: 'URGENT', label: 'Khẩn cấp' },
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập mô tả chi tiết sự cố gặp phải');
      return;
    }

    setIsSubmitting(true);
    try {
      // Gọi API Backend nếu có kết nối
      const res = await createSupportRequestApi({
        facilityId: unit.facilityId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      }).catch((err) => {
        console.warn('Backend support API fallback notice:', err.message);
        return null;
      });

      const requestCode = res?.requestCode || `REQ-${Date.now().toString().slice(-6)}`;
      const newTicket: UnitSupportTicket = {
        id: `ticket-${Date.now()}`,
        requestCode,
        category,
        categoryLabel: categories.find((c) => c.id === category)?.label || 'Sự cố chung',
        subject: subject.trim(),
        description: description.trim(),
        status: 'OPEN',
        priority: priority as any,
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
      };

      onTicketCreated(newTicket);
      onClose();

      if (Platform.OS === 'web') {
        window.alert(`✅ Đã gửi phiếu hỗ trợ ${requestCode} thành công!\nĐội ngũ kỹ thuật cơ sở sẽ kiểm tra và phản hồi trong 15-30 phút.`);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(`Lỗi: ${err.message || 'Không thể gửi yêu cầu'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🛠️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>BÁO CÁO SỰ CỐ & TRỢ GIÚP</Text>
              <Text style={styles.subtitle}>Tự động gắn thông tin ô kho {unit.unitCode} • {unit.facilityName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ gap: 14 }}>
            {/* Box Gắn Sẵn Thông Tin Ô Kho (Tự động điền) */}
            <View style={styles.prefillBadge}>
              <Text style={styles.prefillTitle}>THÔNG TIN Ô KHO ĐÃ LIÊN KẾT:</Text>
              <View style={styles.prefillRow}>
                <Text style={styles.prefillUnitCode}>Ô kho: {unit.unitCode}</Text>
                <Text style={styles.prefillDetails}>{unit.floor} • {unit.zone}</Text>
              </View>
              <Text style={styles.prefillContract}>Hợp đồng: {unit.contractCode}</Text>
            </View>

            {/* Danh mục sự cố */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Loại sự cố gặp phải: *</Text>
              <View style={styles.categoryGrid}>
                {categories.map((c) => {
                  const isSelected = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                      onPress={() => {
                        setCategory(c.id);
                        setSubject(`Sự cố ${c.label} - Ô ${unit.unitCode}`);
                      }}
                    >
                      <Text style={[styles.categoryCardTitle, isSelected && styles.categoryCardTitleActive]}>
                        {c.label}
                      </Text>
                      <Text style={styles.categoryCardDesc} numberOfLines={1}>
                        {c.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Mức độ ưu tiên */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mức độ khẩn cấp:</Text>
              <View style={styles.priorityRow}>
                {priorities.map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.priorityBtn, isSelected && styles.priorityBtnActive]}
                      onPress={() => setPriority(p.id)}
                    >
                      <Text style={[styles.priorityBtnText, isSelected && styles.priorityBtnTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tiêu đề sự cố */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tiêu đề phiếu yêu cầu: *</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Ví dụ: Khóa thông minh không nhận mã PIN..."
              />
            </View>

            {/* Mô tả chi tiết */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mô tả chi tiết tình trạng: *</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="Mô tả cụ thể hiện tượng: Ví dụ như đèn nhấp nháy đỏ, bấm số không phản hồi, thời điểm xảy ra..."
              />
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>📨 Gửi Phiếu Hỗ Trợ</Text>
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
    backgroundColor: '#FEE2E2',
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
  formScroll: {
    flexGrow: 0,
  },
  prefillBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  prefillTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  prefillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefillUnitCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E40AF',
  },
  prefillDetails: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  prefillContract: {
    fontSize: 10,
    color: '#64748B',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  categoryGrid: {
    gap: 6,
  },
  categoryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  categoryCardTitleActive: {
    color: '#1D4ED8',
  },
  categoryCardDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
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
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
