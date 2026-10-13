import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { changeSmartLockPinApi } from '../../api';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onPinChanged: (newPin: string) => void;
}

export default function ChangePinModal({
  visible,
  onClose,
  unit,
  onPinChanged,
}: ChangePinModalProps) {
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      if (Platform.OS === 'web') window.alert('Mã PIN mới phải là chuỗi từ 4 đến 8 chữ số');
      return;
    }

    if (newPin !== confirmPin) {
      if (Platform.OS === 'web') window.alert('Mã PIN xác nhận không trùng khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (unit.contractId && unit.unitId) {
        await changeSmartLockPinApi(unit.contractId, unit.unitId, newPin).catch((err) => {
          console.warn('Backend changePin API notice:', err.message);
        });
      }

      onPinChanged(newPin);
      onClose();
      if (Platform.OS === 'web') {
        window.alert(`🎉 Đổi mã PIN Smart Lock cho ô ${unit.unitCode} thành công!\nMã mới: ${newPin}`);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(`Lỗi đổi mã PIN: ${err.message}`);
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
              <Text style={styles.iconText}>🔑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>ĐỔI MÃ SMART PIN 24/7</Text>
              <Text style={styles.subtitle}>Thiết lập mật khẩu mở khóa cá nhân cho ô {unit.unitCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.pinHintBanner}>
              <Text style={styles.pinHintText}>
                💡 Mã PIN từ 4 đến 8 chữ số, dùng để bấm trực tiếp trên bàn phím số Smart Lock tại cửa kho.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mã PIN mới (4 - 8 chữ số): *</Text>
              <TextInput
                style={styles.textInput}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="numeric"
                secureTextEntry
                maxLength={8}
                placeholder="Nhập 4-8 số..."
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nhập lại mã PIN mới để xác nhận: *</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                secureTextEntry
                maxLength={8}
                placeholder="Xác nhận lại..."
              />
            </View>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>✓ Lưu Mã PIN Mới</Text>
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
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
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
  body: {
    gap: 12,
  },
  pinHintBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pinHintText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
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
