import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffReturnOrder } from '../../types/handover';
import { formatVND } from '../../utils/formatters';

interface InspectionSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  order: StaffReturnOrder | null;
  totalExtraCharges?: number;
  returnPhotosCount?: number;
  onViewReportAgain?: () => void;
}

export default function InspectionSuccessModal({
  visible,
  onClose,
  order,
  totalExtraCharges = 0,
  returnPhotosCount = 0,
  onViewReportAgain,
}: InspectionSuccessModalProps) {
  if (!order) return null;

  const hasFine = totalExtraCharges > 0;
  const photoCount = returnPhotosCount || order.returnPhotos?.length || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Biểu tượng thành công với 2 vòng hào quang */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconRingOuter}>
              <View style={styles.iconRingInner}>
                <MaterialIcons name="check" size={32} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Badge trạng thái */}
          <View style={styles.badgeSuccess}>
            <MaterialIcons name="verified" size={13} color="#047857" />
            <Text style={styles.badgeSuccessText}>NGHIỆM THU HOÀN TẤT</Text>
          </View>

          {/* Tiêu đề chính */}
          <Text style={styles.headline}>Nghiệm Thu Thành Công</Text>
          <Text style={styles.subheadline}>
            Hợp đồng đã hoàn tất thủ tục thanh lý. Ô kho{' '}
            <Text style={styles.boldText}>#{order.unitCode}</Text> đã được giải phóng về trạng thái{' '}
            <Text style={styles.availableHighlight}>TRỐNG (AVAILABLE)</Text>.
          </Text>

          {/* Khung tóm tắt Hợp đồng & Ô kho */}
          <View style={styles.heroSummaryCard}>
            <View style={styles.heroColLeft}>
              <Text style={styles.heroLabel}>MÃ HỢP ĐỒNG</Text>
              <Text style={styles.heroCodeText} numberOfLines={1}>
                {order.contractCode}
              </Text>
              <Text style={styles.heroCustomerText} numberOfLines={1}>
                {order.customerName}
              </Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroColRight}>
              <Text style={styles.heroLabel}>Ô KHO GIẢI PHÓNG</Text>
              <Text style={styles.heroUnitText}>#{order.unitCode}</Text>
              <Text style={styles.heroUnitType} numberOfLines={1}>
                {order.unitSize || '9.0m²'}
              </Text>
            </View>
          </View>

          {/* Bảng chi tiết kết quả nghiệm thu */}
          <View style={styles.resultDetailsBox}>
            {/* Mục 1: Trạng thái ô kho */}
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialIcons name="meeting-room" size={14} color="#15803D" />
                </View>
                <Text style={styles.detailLabel}>Trạng thái ô kho:</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>TRỐNG (AVAILABLE)</Text>
              </View>
            </View>

            {/* Mục 2: Đối chiếu ảnh */}
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <MaterialIcons name="compare" size={14} color="#7C3AED" />
                </View>
                <Text style={styles.detailLabel}>Ảnh đối chiếu:</Text>
              </View>
              <Text style={styles.photoCountText}>
                Đã lưu <Text style={{ fontWeight: '800', color: '#7C3AED' }}>{photoCount > 0 ? `${photoCount} ảnh` : 'đầy đủ ảnh'}</Text> trước & sau
              </Text>
            </View>

            {/* Mục 3: Mã PIN khóa thông minh */}
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialIcons name="lock" size={14} color="#2563EB" />
                </View>
                <Text style={styles.detailLabel}>Mã Smart PIN:</Text>
              </View>
              <Text style={styles.revokedPinText}>Đã thu hồi truy cập</Text>
            </View>

            {/* Mục 4: Quyết toán phụ phí */}
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailLeft}>
                <View
                  style={[
                    styles.detailIconBox,
                    { backgroundColor: hasFine ? '#FEE2E2' : '#DCFCE7' },
                  ]}
                >
                  <MaterialIcons
                    name={hasFine ? 'warning' : 'receipt'}
                    size={14}
                    color={hasFine ? '#DC2626' : '#15803D'}
                  />
                </View>
                <Text style={styles.detailLabel}>Phụ phí phát sinh:</Text>
              </View>
              <Text
                style={[
                  styles.feeAmountText,
                  { color: hasFine ? '#DC2626' : '#15803D' },
                ]}
              >
                {hasFine ? `+${formatVND(totalExtraCharges)}` : '0 đ (Đã thu đủ)'}
              </Text>
            </View>
          </View>

          {/* Nút hành động */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={styles.primaryDoneBtn}
              onPress={onClose}
              activeOpacity={0.88}
            >
              <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryDoneBtnText}>HOÀN TẤT & ĐÓNG</Text>
            </TouchableOpacity>

            {onViewReportAgain && (
              <TouchableOpacity
                style={styles.secondaryViewBtn}
                onPress={() => {
                  onClose();
                  onViewReportAgain();
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="visibility" size={15} color="#475569" />
                <Text style={styles.secondaryViewBtnText}>Xem lại biên bản & ảnh đối chiếu</Text>
              </TouchableOpacity>
            )}
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
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
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
  iconWrapper: {
    marginBottom: 10,
    marginTop: 4,
  },
  iconRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  boldText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  availableHighlight: {
    color: '#15803D',
    fontWeight: '800',
  },
  heroSummaryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  heroCustomerText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 10,
  },
  heroUnitText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#004AC6',
  },
  heroUnitType: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  resultDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  photoCountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  revokedPinText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  feeAmountText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8,
  },
  primaryDoneBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryDoneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  secondaryViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
  },
  secondaryViewBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});

