import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface CustomAlertModalProps {
  visible: boolean;
  type?: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export default function CustomAlertModal({
  visible,
  type = 'warning',
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
}: CustomAlertModalProps) {
  const isWarning = type === 'warning';
  const isError = type === 'error';
  const isSuccess = type === 'success';

  const iconName = isWarning
    ? 'warning'
    : isError
    ? 'error-outline'
    : isSuccess
    ? 'check-circle'
    : 'info-outline';

  const iconColor = isWarning
    ? '#D97706'
    : isError
    ? '#DC2626'
    : isSuccess
    ? '#10B981'
    : '#2563EB';

  const bgRingColor = isWarning
    ? '#FEF3C7'
    : isError
    ? '#FEE2E2'
    : isSuccess
    ? '#ECFDF5'
    : '#EFF6FF';

  const borderRingColor = isWarning
    ? '#FDE68A'
    : isError
    ? '#FECACA'
    : isSuccess
    ? '#A7F3D0'
    : '#BFDBFE';

  const confirmBtnBg = isWarning
    ? '#D97706'
    : isError
    ? '#DC2626'
    : isSuccess
    ? '#10B981'
    : '#2563EB';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View style={[styles.iconRingOuter, { backgroundColor: bgRingColor, borderColor: borderRingColor }]}>
            <View style={[styles.iconRingInner, { backgroundColor: iconColor }]}>
              <MaterialIcons name={iconName as any} size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {cancelText ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  onCancel ? onCancel() : onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: confirmBtnBg },
                !cancelText && { flex: 1 },
              ]}
              onPress={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  iconRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconRingInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

