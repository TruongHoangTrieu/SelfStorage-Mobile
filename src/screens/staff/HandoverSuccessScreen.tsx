import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { CheckInAppointment } from '../../types/handover';

interface HandoverSuccessScreenProps {
  appointment: CheckInAppointment;
  assignedUnitCode: string;
  contractCode?: string;
  accessPin?: string;
  onBackToQueue: () => void;
  onPrintAgain: () => void;
}

export default function HandoverSuccessScreen({
  appointment,
  assignedUnitCode,
  contractCode = 'CON-20261013-8910AB',
  accessPin = '682914',
  onBackToQueue,
  onPrintAgain,
}: HandoverSuccessScreenProps) {
  const [hasSentNotify, setHasSentNotify] = useState<boolean>(false);

  const handleSendNotification = () => {
    setHasSentNotify(true);
    const msg = `Đã gửi mã PIN ${accessPin} và hướng dẫn mở cửa ô kho ${assignedUnitCode} tới số điện thoại ${appointment.phone} của khách hàng qua Zalo/SMS.`;
    if (Platform.OS === 'web') {
      // In web browser, set state and show clean alert
      window.alert(`Gửi thông báo thành công 📱\n\n${msg}`);
    } else {
      Alert.alert('Gửi thông báo thành công 📱', msg);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      <View style={styles.card}>
        {/* Success Banner */}
        <View style={styles.iconCircle}>
          <Text style={styles.partyIcon}>🎉</Text>
        </View>

        <Text style={styles.headline}>HOÀN TẤT BÀN GIAO THÀNH CÔNG!</Text>
        <Text style={styles.subheadline}>
          Ô kho <Text style={styles.highlightText}>{assignedUnitCode}</Text> đã được kích hoạt trạng thái{' '}
          <Text style={{ color: '#15803D', fontWeight: 'bold' }}>ĐANG THUÊ (Occupied)</Text>.
        </Text>

        {/* Contract Code Badge */}
        <View style={styles.contractBadge}>
          <Text style={styles.contractLabel}>MÃ HỢP ĐỒNG ĐIỆN TỬ</Text>
          <Text style={styles.contractCodeText}>{contractCode}</Text>
        </View>

        {/* Smart PIN Box */}
        <View style={styles.pinCard}>
          <Text style={styles.pinHeader}>MÃ SMART PIN MỞ KHÓA THÔNG MINH 24/7</Text>
          <View style={styles.pinDisplayRow}>
            {accessPin.split('').map((digit, idx) => (
              <View key={idx} style={styles.pinDigitBox}>
                <Text style={styles.pinDigitText}>{digit}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.pinGuideText}>
            Khách hàng bấm [Mã PIN] + phím [#] trên ổ khóa số của ngăn kho để mở cửa.
          </Text>
        </View>

        {/* Tóm tắt thông tin bàn giao */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Khách thuê:</Text>
            <Text style={styles.summaryValue}>{appointment.customerName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số điện thoại:</Text>
            <Text style={styles.summaryValue}>📞 {appointment.phone}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ngăn kho:</Text>
            <Text style={[styles.summaryValue, { color: '#2563EB', fontWeight: '900' }]}>
              {assignedUnitCode} ({appointment.unitSize})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thời hạn hợp đồng:</Text>
            <Text style={styles.summaryValue}>{appointment.durationMonths} Tháng</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trạng thái đơn hàng:</Text>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ HOÀN TẤT (Completed)</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={[styles.sendNotifyBtn, hasSentNotify && { backgroundColor: '#059669' }]}
            onPress={handleSendNotification}
          >
            <Text style={styles.sendNotifyText}>
              {hasSentNotify
                ? '✓ Đã Gửi Mã PIN Qua SMS & Zalo Cho Khách'
                : '📱 Gửi Mã PIN Qua Zalo / SMS Cho Khách'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.printAgainBtn} onPress={onPrintAgain}>
            <Text style={styles.printAgainText}>🖨️ In Lại Thẻ Smart PIN & Hợp Đồng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.returnQueueBtn} onPress={onBackToQueue}>
            <Text style={styles.returnQueueText}>← Quay Lại Hàng Đợi Nhận Kho (Trang A)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentPadding: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  partyIcon: {
    fontSize: 34,
  },
  headline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  highlightText: {
    color: '#2563EB',
    fontWeight: '900',
  },
  contractBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    marginBottom: 16,
  },
  contractLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  contractCodeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E40AF',
    marginTop: 2,
  },
  pinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinHeader: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pinDisplayRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pinDigitBox: {
    width: 40,
    height: 48,
    borderRadius: 10,
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
  pinGuideText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  actionColumn: {
    width: '100%',
    gap: 10,
  },
  sendNotifyBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendNotifyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  printAgainBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  printAgainText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  returnQueueBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  returnQueueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
