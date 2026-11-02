import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ContractPreviewModal from '../../components/staff/ContractPreviewModal';
import { CheckInAppointment } from '../../types/handover';

interface HandoverSuccessScreenProps {
  appointment: CheckInAppointment;
  assignedUnitCode: string;
  contractCode?: string;
  accessPin?: string;
  signature?: string[];
  isEditing?: boolean;
  onBackToQueue: () => void;
  onPrintAgain?: () => void;
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
  signature,
  isEditing,
  onBackToQueue,
}: HandoverSuccessScreenProps) {
  const insets = useSafeAreaInsets();
  const [showContractPreview, setShowContractPreview] = useState<boolean>(false);
  const activeSignature = signature || appointment.signature || [];
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    Clipboard.setString(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentPadding,
        {
          paddingTop: insets.top > 0 ? insets.top + 16 : 24,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36,
        },
      ]}
    >
      <View style={styles.mainCard}>
        {/* Biểu tượng trạng thái thành công */}
        <View style={styles.successIconWrapper}>
          <View style={styles.iconRingOuter}>
            <View style={styles.iconRingInner}>
              <MaterialIcons name="check" size={36} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Tiêu đề */}
        <Text style={styles.headline}>
          {isEditing || appointment.status === 'completed'
            ? 'Hoàn Tất Chỉnh Sửa'
            : 'Bàn Giao Kho Thành Công'}
        </Text>
        <Text style={styles.subheadline}>
          {isEditing || appointment.status === 'completed'
            ? <>Hồ sơ bàn giao ô kho <Text style={styles.boldDark}>#{assignedUnitCode}</Text> đã được cập nhật thành công.</>
            : <>Ô kho <Text style={styles.boldDark}>#{assignedUnitCode}</Text> đã sẵn sàng hoạt động.</>}
        </Text>

        {/* Khung tóm tắt: Mã Hợp Đồng & Ô Kho */}
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

        {/* Khung Smart Lock PIN rút gọn */}
        <View style={styles.pinCard}>
          <View style={styles.pinCardHeader}>
            <View style={styles.pinIconCircle}>
              <MaterialIcons name="lock" size={14} color={T.cyan} />
            </View>
            <Text style={styles.pinCardTitle}>MÃ SMART PIN MỞ KHÓA</Text>
          </View>

          {/* Dãy 6 ô chữ số PIN */}
          <View style={styles.pinDigitsRow}>
            {accessPin.split('').map((digit, index) => (
              <View key={index} style={styles.digitBox}>
                <Text style={styles.digitText}>{digit}</Text>
              </View>
            ))}
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

        {/* Nút xem lại hợp đồng nhỏ gọn nếu cần */}
        <TouchableOpacity
          onPress={() => setShowContractPreview(true)}
          style={styles.viewContractRowBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="description" size={15} color={T.primary} />
          <Text style={styles.viewContractRowText}>Xem chi tiết hợp đồng điện tử</Text>
        </TouchableOpacity>

        {/* Nút hoàn tất */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={onBackToQueue}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Hoàn Tất & Quay Lại</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Xem lại hợp đồng */}
      <ContractPreviewModal
        visible={showContractPreview}
        onClose={() => setShowContractPreview(false)}
        appointment={appointment}
        assignedUnitCode={assignedUnitCode}
        initialSignature={activeSignature}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  successIconWrapper: {
    marginBottom: 14,
  },
  iconRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subheadline: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
  heroSummaryCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroColLeft: {
    flex: 1.2,
  },
  heroColRight: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  heroDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  codeWithCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#004AC6',
  },
  inlineCopyBtn: {
    padding: 3,
  },
  heroUnitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pinCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pinIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  digitBox: {
    width: 36,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38BDF8',
  },
  copyPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  copyPinBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  infoTable: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  activeTag: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  viewContractRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 16,
  },
  viewContractRowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004AC6',
    textDecorationLine: 'underline',
  },
  actionsContainer: {
    width: '100%',
  },
  primaryActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#004AC6',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#004AC6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
