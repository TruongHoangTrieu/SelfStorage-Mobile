import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckInAppointment } from '../../types/handover';

interface HandoverSuccessScreenProps {
  appointment: CheckInAppointment;
  assignedUnitCode: string;
  contractCode?: string;
  accessPin?: string;
  onBackToQueue: () => void;
  onPrintAgain: () => void;
}

const T = {
  primary: '#004AC6',
  primaryDark: '#003399',
  primaryBg: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  dark: '#0F172A',
  darkCard: '#1E293B',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textMuted: '#64748B',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  emeraldText: '#047857',
  cyan: '#38BDF8',
};

export default function HandoverSuccessScreen({
  appointment,
  assignedUnitCode,
  contractCode = 'CON-20261013-8910AB',
  accessPin = '682914',
  onBackToQueue,
  onPrintAgain,
}: HandoverSuccessScreenProps) {
  const [hasSentNotify, setHasSentNotify] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    Clipboard.setString(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendNotification = () => {
    setHasSentNotify(true);
    const msg = `Mã PIN [${accessPin}] và thông tin ô kho [${assignedUnitCode}] đã được gửi tự động tới SĐT ${appointment.phone} & Email của khách hàng.`;
    if (Platform.OS === 'web') {
      window.alert(`Gửi thông báo thành công\n\n${msg}`);
    } else {
      Alert.alert('Gửi thông báo thành công', msg, [{ text: 'Đóng' }]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      <View style={styles.mainCard}>
        {/* Biểu tượng trạng thái thành công */}
        <View style={styles.successIconWrapper}>
          <View style={styles.iconRingOuter}>
            <View style={styles.iconRingInner}>
              <MaterialIcons name="check" size={38} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Tiêu đề & Trạng thái */}
        <View style={styles.badgeSuccess}>
          <MaterialIcons name="verified" size={14} color={T.emeraldDark} />
          <Text style={styles.badgeSuccessText}>BIÊN BẢN BÀN GIAO ĐÃ KÍCH HOẠT</Text>
        </View>

        <Text style={styles.headline}>Bàn Giao Kho Thành Công</Text>
        <Text style={styles.subheadline}>
          Thủ tục nhận kho đã hoàn tất hợp lệ. Ô kho{' '}
          <Text style={styles.boldDark}>#{assignedUnitCode}</Text> hiện đã sẵn sàng cho khách hàng lưu trữ đồ.
        </Text>

        {/* Khung nổi bật: Mã Hợp Đồng & Ô Kho */}
        <View style={styles.heroSummaryCard}>
          <View style={styles.heroColLeft}>
            <Text style={styles.heroLabel}>MÃ HỢP ĐỒNG</Text>
            <View style={styles.codeWithCopyRow}>
              <Text style={styles.heroCodeText} numberOfLines={1} ellipsizeMode="middle">
                {contractCode}
              </Text>
              <TouchableOpacity
                onPress={() => handleCopy(contractCode, 'contract')}
                style={styles.inlineCopyBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={copiedField === 'contract' ? 'check' : 'content-copy'}
                  size={13}
                  color={T.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroColRight}>
            <Text style={styles.heroLabel}>Ô KHO BÀN GIAO</Text>
            <Text style={styles.heroUnitText} numberOfLines={1}>
              #{assignedUnitCode}
            </Text>
          </View>
        </View>

        {/* Khung Smart Lock PIN */}
        <View style={styles.pinCard}>
          <View style={styles.pinCardHeader}>
            <View style={styles.pinIconCircle}>
              <MaterialIcons name="lock" size={14} color={T.cyan} />
            </View>
            <Text style={styles.pinCardTitle}>MÃ SMART PIN MỞ KHÓA 24/7</Text>
          </View>

          {/* Dãy 6 ô chữ số PIN */}
          <View style={styles.pinDigitsRow}>
            {accessPin.split('').map((digit, index) => (
              <View key={index} style={styles.digitBox}>
                <Text style={styles.digitText}>{digit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pinGuideBox}>
            <MaterialIcons name="info-outline" size={13} color="#94A3B8" />
            <Text style={styles.pinGuideText}>
              Nhập mã PIN gồm 6 số rồi nhấn phím <Text style={styles.whiteBold}>[#]</Text> trên bàn phím khóa để mở cửa.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.copyPinBtn}
            onPress={() => handleCopy(accessPin, 'pin')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={copiedField === 'pin' ? 'check' : 'content-copy'}
              size={14}
              color={T.cyan}
            />
            <Text style={styles.copyPinBtnText}>
              {copiedField === 'pin' ? 'Đã sao chép mã PIN' : 'Sao chép mã PIN'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bảng chi tiết hồ sơ bàn giao */}
        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialIcons name="person" size={16} color={T.textMuted} />
              <Text style={styles.infoLabel}>Khách hàng:</Text>
            </View>
            <Text style={styles.infoValue}>{appointment.customerName}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialIcons name="phone" size={16} color={T.textMuted} />
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
            </View>
            <Text style={styles.infoValue}>{appointment.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialIcons name="meeting-room" size={16} color={T.textMuted} />
              <Text style={styles.infoLabel}>Loại diện tích:</Text>
            </View>
            <Text style={styles.infoValue}>
              {appointment.unitType || 'Kho mini'} ({appointment.unitSize || '5m²'})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <MaterialIcons name="date-range" size={16} color={T.textMuted} />
              <Text style={styles.infoLabel}>Thời hạn thuê:</Text>
            </View>
            <Text style={styles.infoValue}>{appointment.durationMonths || 1} tháng</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLabelGroup}>
              <MaterialIcons name="circle" size={8} color={T.emerald} />
              <Text style={styles.infoLabel}>Trạng thái kho:</Text>
            </View>
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>ĐANG LƯU KHO</Text>
            </View>
          </View>
        </View>

        {/* Các nút hành động */}
        <View style={styles.actionsContainer}>
          {/* Nút In phiếu */}
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={onPrintAgain}
            activeOpacity={0.85}
          >
            <MaterialIcons name="print" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>In Phiếu Bàn Giao & Hợp Đồng</Text>
          </TouchableOpacity>

          {/* Nút Gửi SMS/Email */}
          <TouchableOpacity
            style={[styles.secondaryActionBtn, hasSentNotify && styles.sentActionBtn]}
            onPress={handleSendNotification}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={hasSentNotify ? 'check-circle' : 'send'}
              size={17}
              color={hasSentNotify ? '#FFFFFF' : T.primary}
            />
            <Text style={[styles.secondaryActionText, hasSentNotify && { color: '#FFFFFF' }]}>
              {hasSentNotify
                ? 'Đã Gửi Mã PIN Tới Khách Hàng'
                : 'Gửi Thông Báo PIN Cho Khách'}
            </Text>
          </TouchableOpacity>

          {/* Nút Quay lại hàng đợi */}
          <TouchableOpacity
            style={styles.backQueueBtn}
            onPress={onBackToQueue}
            activeOpacity={0.85}
          >
            <MaterialIcons name="arrow-back" size={17} color={T.textMain} />
            <Text style={styles.backQueueText}>Quay lại danh sách bàn giao</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingBottom: 36,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
  },
  successIconWrapper: {
    marginBottom: 10,
  },
  iconRingOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRingInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  badgeSuccessText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  boldDark: {
    color: '#0F172A',
    fontWeight: '800',
  },

  heroSummaryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  heroColLeft: {
    flex: 1.2,
    minWidth: 0,
  },
  heroColRight: {
    flex: 0.8,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  heroLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  codeWithCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroCodeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E40AF',
    flexShrink: 1,
  },
  inlineCopyBtn: {
    padding: 3,
    backgroundColor: '#DBEAFE',
    borderRadius: 5,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 8,
  },
  heroUnitText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#004AC6',
  },

  pinCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pinIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCardTitle: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 290,
    marginBottom: 10,
  },
  digitBox: {
    flex: 1,
    height: 46,
    maxWidth: 44,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pinGuideBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  pinGuideText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    flexShrink: 1,
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  copyPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  copyPinBtnText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },

  infoTable: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  activeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeTagText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },

  actionsContainer: {
    width: '100%',
    gap: 9,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#004AC6',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#004AC6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sentActionBtn: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  secondaryActionText: {
    color: '#004AC6',
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  backQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 2,
  },
  backQueueText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
});
