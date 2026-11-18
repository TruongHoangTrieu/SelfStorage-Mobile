import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  const [showCurrentPin, setShowCurrentPin] = useState<boolean>(false);
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setNewPin('');
      setConfirmPin('');
      setShowCurrentPin(false);
      setShowNewPin(false);
      setShowConfirmPin(false);
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [visible, unit?.id]);

  const cleanNewPin = newPin.trim();
  const cleanConfirmPin = confirmPin.trim();
  const isValidLength = cleanNewPin.length >= 4 && cleanNewPin.length <= 8;
  const isNumericOnly = /^\d+$/.test(cleanNewPin);
  const isDifferentFromOld = !unit?.masterPin || cleanNewPin !== unit.masterPin;
  const isConfirmMatched = cleanConfirmPin.length > 0 && cleanNewPin === cleanConfirmPin;

  const handleGenerateRandomPin = () => {
    const randomSix = String(Math.floor(100000 + Math.random() * 900000));
    setNewPin(randomSix);
    setConfirmPin(randomSix);
    setShowNewPin(true);
    setShowConfirmPin(true);
    setErrorMessage(null);
  };

  const handleSafeClose = () => {
    setNewPin('');
    setConfirmPin('');
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!cleanNewPin || !isValidLength || !isNumericOnly) {
      const msg = 'Mã PIN mới phải gồm từ 4 đến 8 chữ số (0-9).';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Chưa hợp lệ', msg);
      }
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      const msg = 'Mã PIN xác nhận không trùng khớp với mã PIN mới.';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Chưa khớp', msg);
      }
      return;
    }

    if (unit?.masterPin && cleanNewPin === unit.masterPin) {
      const msg = 'Mã PIN mới đang trùng với mã PIN hiện tại. Vui lòng chọn mã khác.';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Trùng mã PIN cũ', msg);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (unit?.contractId && unit?.unitId) {
        await changeSmartLockPinApi(unit.contractId, unit.unitId, cleanNewPin);
      }

      onPinChanged(cleanNewPin);
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err?.message || 'Không thể cập nhật mã PIN lúc này. Vui lòng thử lại.';
      setErrorMessage(msg);
      if (Platform.OS === 'web') {
        window.alert(`Lỗi đổi mã PIN: ${msg}`);
      } else {
        Alert.alert('Không thể đổi mã PIN', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!unit) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSafeClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="dialpad" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>Đổi Mã PIN Khóa Điện Tử</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Buồng #{unit.unitCode} • {unit.facilityName}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSafeClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <MaterialIcons name="check-circle" size={44} color="#059669" />
              </View>
              <Text style={styles.successTitle}>Cập nhật mã PIN thành công</Text>
              <Text style={styles.successSub}>
                Mã PIN mở khóa mới cho buồng #{unit.unitCode} đã được đồng bộ với khóa điện tử.
              </Text>

              <View style={styles.newPinPreviewCard}>
                <Text style={styles.newPinPreviewLabel}>MÃ PIN MỚI CỦA BẠN</Text>
                <Text style={styles.newPinPreviewValue}>{cleanNewPin}</Text>
                <Text style={styles.newPinPreviewHint}>
                  Bấm mã PIN rồi nhấn phím # trên ổ khóa để mở cửa kho
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, { width: '100%', flex: 0, marginTop: 6 }]}
                onPress={handleSafeClose}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Current PIN Info Card */}
                <View style={styles.currentPinCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentPinLabel}>Mã PIN đang sử dụng</Text>
                    <Text style={styles.currentPinValue}>
                      {unit.masterPin
                        ? showCurrentPin
                          ? unit.masterPin
                          : `•••• ${unit.masterPin.slice(-2)}`
                        : 'Chưa thiết lập'}
                    </Text>
                  </View>
                  {unit.masterPin ? (
                    <TouchableOpacity
                      style={styles.toggleCurrentBtn}
                      onPress={() => setShowCurrentPin((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={showCurrentPin ? 'visibility-off' : 'visibility'}
                        size={15}
                        color="#2563EB"
                      />
                      <Text style={styles.toggleCurrentBtnText}>
                        {showCurrentPin ? 'Ẩn' : 'Xem'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Error Banner */}
                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* New PIN Input */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Mã PIN mới (4 - 8 chữ số)</Text>
                    <TouchableOpacity
                      onPress={handleGenerateRandomPin}
                      style={styles.randomBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="autorenew" size={13} color="#2563EB" />
                      <Text style={styles.randomBtnText}>Tạo ngẫu nhiên 6 số</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="lock-outline" size={18} color="#64748B" />
                    <TextInput
                      style={styles.textInput}
                      value={newPin}
                      onChangeText={(txt) => {
                        setNewPin(txt.replace(/[^0-9]/g, ''));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      secureTextEntry={!showNewPin}
                      maxLength={8}
                      placeholder="Nhập 4 - 8 chữ số..."
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPin((prev) => !prev)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={showNewPin ? 'visibility-off' : 'visibility'}
                        size={19}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm PIN Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Xác nhận mã PIN mới</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="verified-user" size={18} color="#64748B" />
                    <TextInput
                      style={styles.textInput}
                      value={confirmPin}
                      onChangeText={(txt) => {
                        setConfirmPin(txt.replace(/[^0-9]/g, ''));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      secureTextEntry={!showConfirmPin}
                      maxLength={8}
                      placeholder="Nhập lại mã PIN mới..."
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPin((prev) => !prev)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={showConfirmPin ? 'visibility-off' : 'visibility'}
                        size={19}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Validation Checklist */}
                <View style={styles.checklistCard}>
                  <View style={styles.checkRow}>
                    <MaterialIcons
                      name={isValidLength && isNumericOnly ? 'check-circle' : 'radio-button-unchecked'}
                      size={15}
                      color={isValidLength && isNumericOnly ? '#059669' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        isValidLength && isNumericOnly && styles.checkTextActive,
                      ]}
                    >
                      Độ dài từ 4 đến 8 chữ số (0-9)
                    </Text>
                  </View>
                  <View style={styles.checkRow}>
                    <MaterialIcons
                      name={
                        cleanNewPin.length > 0 && isDifferentFromOld
                          ? 'check-circle'
                          : 'radio-button-unchecked'
                      }
                      size={15}
                      color={cleanNewPin.length > 0 && isDifferentFromOld ? '#059669' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        cleanNewPin.length > 0 && isDifferentFromOld && styles.checkTextActive,
                      ]}
                    >
                      Khác với mã PIN đang sử dụng
                    </Text>
                  </View>
                  <View style={styles.checkRow}>
                    <MaterialIcons
                      name={isConfirmMatched ? 'check-circle' : 'radio-button-unchecked'}
                      size={15}
                      color={isConfirmMatched ? '#059669' : '#94A3B8'}
                    />
                    <Text style={[styles.checkText, isConfirmMatched && styles.checkTextActive]}>
                      Hai lần nhập mã PIN mới trùng khớp
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleSafeClose}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (!isValidLength || !isNumericOnly || !isConfirmMatched) && styles.confirmBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="save" size={17} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Lưu Mã PIN Mới</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    marginTop: 12,
  },
  body: {
    gap: 14,
    paddingBottom: 4,
  },
  currentPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentPinLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  currentPinValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  toggleCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  toggleCurrentBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 17,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  randomBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
    paddingVertical: 8,
  },
  eyeBtn: {
    padding: 4,
  },
  checklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  checkTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
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
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  successSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  newPinPreviewCard: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginVertical: 4,
    gap: 4,
  },
  newPinPreviewLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.8,
  },
  newPinPreviewValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 4,
  },
  newPinPreviewHint: {
    fontSize: 11,
    color: '#3B82F6',
    textAlign: 'center',
  },
});
