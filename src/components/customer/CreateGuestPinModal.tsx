import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { CustomerRentedUnit, GuestAccessCode } from '../../types/customerStorage';

interface CreateGuestPinModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onCreated: (newCode: GuestAccessCode) => void;
}

export default function CreateGuestPinModal({
  visible,
  onClose,
  unit,
  onCreated,
}: CreateGuestPinModalProps) {
  const [guestName, setGuestName] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('Vận chuyển đồ đạc vào kho');
  const [durationOption, setDurationOption] = useState<'2h' | '24h' | '3d'>('24h');
  const [generatedPin, setGeneratedPin] = useState<string>(
    () => Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [usageType, setUsageType] = useState<'multi_time' | 'one_time'>('multi_time');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Sinh mã mới ngẫu nhiên
  const handleRegeneratePin = () => {
    setGeneratedPin(Math.floor(100000 + Math.random() * 900000).toString());
    setCopySuccess(false);
  };

  const getValidityTimeText = () => {
    if (durationOption === '2h') return 'Có hiệu lực trong 2 giờ tới';
    if (durationOption === '24h') return 'Có hiệu lực trong 24 giờ tới';
    return 'Có hiệu lực trong 3 ngày tới';
  };

  const handleShareZalo = () => {
    const message = `[MÃ MỞ KHO TỰ QUẢN SELFSTORAGE]\nChào ${guestName || 'bạn'},\nTôi gửi bạn mã PIN mở khóa tạm thời cho ô kho ${unit.unitCode} tại ${unit.facilityName} (${unit.floor} - ${unit.zone}):\n\n🔑 MÃ PIN: ${generatedPin}\n⏱️ Thời hạn: ${getValidityTimeText()}\n\nHướng dẫn: Nhập mã PIN trên bàn phím số Smart Lock và bấm phím # để mở khóa.`;
    
    // Mở liên kết Zalo hoặc copy
    if (Platform.OS === 'web') {
      window.prompt('Sao chép nội dung gửi qua Zalo:', message);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`[SelfStorage] Mã mở cửa ô kho ${unit.unitCode} cho ${guestName || 'khách'}`);
    const body = encodeURIComponent(`Chào ${guestName || 'bạn'},\n\nTôi chia sẻ quyền truy cập ô kho của tôi:\n- Cơ sở: ${unit.facilityName}\n- Địa chỉ: ${unit.facilityAddress}\n- Ô kho: ${unit.unitCode} (${unit.floor} - ${unit.zone})\n- MÃ PIN SMART LOCK: ${generatedPin}\n- Hiệu lực: ${getValidityTimeText()}\n\nVui lòng không chia sẻ mã này cho người khác.`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
  };

  const handleCopyClipboard = () => {
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleConfirmCreate = () => {
    if (!guestName.trim()) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập tên người nhận mã');
      return;
    }

    const newGuestCode: GuestAccessCode = {
      id: `guest-${Date.now()}`,
      guestName: guestName.trim(),
      pinCode: generatedPin,
      validFrom: 'Hôm nay',
      validTo: durationOption === '2h' ? '2 giờ nữa' : durationOption === '24h' ? '24 giờ nữa' : '3 ngày nữa',
      usageType,
      status: 'active',
      purpose: purpose.trim(),
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };

    onCreated(newGuestCode);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⏱️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>TẠO MÃ KHÁCH TẠM THỜI</Text>
              <Text style={styles.subtitle}>Cấp mã PIN mở cửa có thời hạn cho ô kho {unit.unitCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ gap: 14 }}>
            {/* Box Mã PIN Sinh Ngẫu Nhiên */}
            <View style={styles.pinDisplayCard}>
              <Text style={styles.pinLabel}>MÃ SMART PIN 6 SỐ TẠM THỜI</Text>
              <View style={styles.pinRow}>
                {generatedPin.split('').map((digit, idx) => (
                  <View key={idx} style={styles.pinDigitBox}>
                    <Text style={styles.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.regenBtn} onPress={handleRegeneratePin}>
                <Text style={styles.regenText}>🔄 Đổi mã ngẫu nhiên khác</Text>
              </TouchableOpacity>
            </View>

            {/* Tên người nhận */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tên người nhận mã (Bạn bè / Người vận chuyển): *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Anh Tuấn thợ chuyển nhà, Bạn Hùng..."
                value={guestName}
                onChangeText={setGuestName}
              />
            </View>

            {/* Mục đích */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mục đích sử dụng:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Chuyển thêm 3 thùng hồ sơ, lấy laptop..."
                value={purpose}
                onChangeText={setPurpose}
              />
            </View>

            {/* Thời gian hiệu lực */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Thời hạn hiệu lực của mã:</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionBtn, durationOption === '2h' && styles.optionBtnActive]}
                  onPress={() => setDurationOption('2h')}
                >
                  <Text style={[styles.optionBtnText, durationOption === '2h' && styles.optionBtnTextActive]}>
                    2 Giờ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionBtn, durationOption === '24h' && styles.optionBtnActive]}
                  onPress={() => setDurationOption('24h')}
                >
                  <Text style={[styles.optionBtnText, durationOption === '24h' && styles.optionBtnTextActive]}>
                    24 Giờ (Khuyên dùng)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionBtn, durationOption === '3d' && styles.optionBtnActive]}
                  onPress={() => setDurationOption('3d')}
                >
                  <Text style={[styles.optionBtnText, durationOption === '3d' && styles.optionBtnTextActive]}>
                    3 Ngày
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Loại mở khóa */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quyền hạn mở khóa:</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionBtn, usageType === 'multi_time' && styles.optionBtnActive]}
                  onPress={() => setUsageType('multi_time')}
                >
                  <Text style={[styles.optionBtnText, usageType === 'multi_time' && styles.optionBtnTextActive]}>
                    Mở nhiều lần
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionBtn, usageType === 'one_time' && styles.optionBtnActive]}
                  onPress={() => setUsageType('one_time')}
                >
                  <Text style={[styles.optionBtnText, usageType === 'one_time' && styles.optionBtnTextActive]}>
                    Mở 1 lần (Tự hủy)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Chia Sẻ Nhanh (Zalo / Email) */}
            <View style={styles.shareSection}>
              <Text style={styles.shareSectionTitle}>GỬI MÃ NHANH CHO KHÁCH:</Text>
              <View style={styles.shareBtnRow}>
                <TouchableOpacity style={styles.zaloBtn} onPress={handleShareZalo}>
                  <Text style={styles.zaloBtnText}>💬 Chia sẻ qua Zalo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.emailBtn} onPress={handleShareEmail}>
                  <Text style={styles.emailBtnText}>✉️ Gửi qua Email</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyClipboard}>
                <Text style={styles.copyBtnText}>
                  {copySuccess ? '✓ Đã sao chép mã PIN!' : '📋 Sao chép mã PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmCreate}>
              <Text style={styles.confirmBtnText}>✓ Kích Hoạt & Cấp Mã</Text>
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
    backgroundColor: '#E0F2FE',
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
  pinDisplayCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  pinLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pinDigitBox: {
    width: 38,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDigitText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  regenBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  regenText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
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
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  optionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  optionBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  shareSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
  },
  shareSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  shareBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  zaloBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  zaloBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emailBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  copyBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
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
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
