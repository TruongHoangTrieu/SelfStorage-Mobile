import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerRentedUnit } from '../../types/customerStorage';
import { submitReturnRequestApi } from '../../api';

interface ReturnContractModalProps {
  visible: boolean;
  onClose: () => void;
  unit: CustomerRentedUnit;
  onReturnSuccess: (checkoutDate: string, timeSlot: string) => void;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateVN = (date: Date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateVN(date);
};

/** DD/MM/YYYY -> YYYY-MM-DD (ISO) để gửi backend */
const toIsoDate = (value: string) => {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
};

const RETURN_TIME_SLOTS = [
  { value: '08:00', period: 'Sáng' },
  { value: '09:00', period: 'Sáng' },
  { value: '10:00', period: 'Sáng' },
  { value: '11:00', period: 'Trưa' },
  { value: '13:00', period: 'Chiều' },
  { value: '14:00', period: 'Chiều' },
  { value: '15:00', period: 'Chiều' },
];

export default function ReturnContractModal({
  visible,
  onClose,
  unit,
  onReturnSuccess,
}: ReturnContractModalProps) {
  const [returnDate, setReturnDate] = useState<string>(() => formatDateVN(new Date()));
  const [returnTimeSlot, setReturnTimeSlot] = useState<string>('09:00');
  const [hasCleanedItems, setHasCleanedItems] = useState<boolean>(true);
  const [hasLockedDoor, setHasLockedDoor] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!visible) return null;

  const dateQuickPicks = [
    { label: 'Hôm nay', value: formatDateVN(new Date()) },
    { label: 'Ngày mai', value: addDays(1) },
    { label: '+3 ngày', value: addDays(3) },
  ];

  const handleSubmitReturn = async () => {
    if (!hasCleanedItems || !hasLockedDoor) {
      const msg =
        'Vui lòng xác nhận bạn đã dọn dẹp đồ đạc và khóa cửa kho trước khi gửi yêu cầu.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Lưu ý', msg);
      return;
    }

    const isoReturnDate = toIsoDate(returnDate);
    if (!isoReturnDate) {
      const msg = 'Ngày trả kho không hợp lệ. Vui lòng nhập theo định dạng DD/MM/YYYY.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Lưu ý', msg);
      return;
    }

    try {
      setIsSubmitting(true);

      // Bắt buộc gửi được lên Backend thì nhân viên cơ sở mới thấy yêu cầu để nghiệm thu.
      // Không âm thầm đánh dấu thành công khi máy chủ chưa nhận được.
      if (!unit.contractId) {
        const msg =
          'Không xác định được hợp đồng thuê kho. Vui lòng tải lại ứng dụng rồi thử lại.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Không thể gửi yêu cầu', msg);
        return;
      }

      try {
        await submitReturnRequestApi(unit.contractId, {
          returnDate: isoReturnDate,
          returnTimeSlot,
        });
      } catch (apiErr: any) {
        const raw = String(apiErr?.message || '');
        const msg = /404|not found|Cannot POST/i.test(raw)
          ? 'Máy chủ chưa có chức năng nhận yêu cầu trả kho (API chưa được cập nhật). Vui lòng báo quản trị viên triển khai Backend mới rồi thử lại.'
          : `Chưa gửi được yêu cầu trả kho tới hệ thống. ${raw || 'Vui lòng kiểm tra kết nối và thử lại.'}`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Không thể gửi yêu cầu', msg);
        return;
      }

      const requestData = {
        contractId: unit.contractId,
        unitCode: unit.unitCode,
        requestedAt: Date.now(),
        returnDate,
        returnTimeSlot,
        status: 'PENDING_INSPECTION',
      };
      await AsyncStorage.setItem(
        `@selfstorage_return_req_${unit.contractId || unit.id}`,
        JSON.stringify(requestData)
      ).catch(() => null);

      onReturnSuccess(returnDate, returnTimeSlot);

      const successMsg = `Đã gửi yêu cầu trả kho #${unit.unitCode} thành công!\nThời gian: ${returnDate} · ${returnTimeSlot}.\nNhân viên cơ sở ${unit.facilityName} sẽ có mặt để nghiệm thu hiện trạng.`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Gửi yêu cầu thành công', successMsg);
      }
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể gửi yêu cầu trả kho. Vui lòng thử lại.';
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Lỗi', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.sheetHandle} />

          {/* HEADER */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIconWrap}>
              <MaterialIcons name="assignment-return" size={22} color="#b45309" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                TRẢ KHO & NGHIỆM THU
              </Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Buồng #{unit.unitCode}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityLabel="Đóng"
            >
              <MaterialIcons name="close" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TÓM TẮT KHO */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryFacilityIcon}>
                  <MaterialIcons name="warehouse" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.summaryFacility} numberOfLines={2}>
                    {unit.facilityName}
                  </Text>
                  <Text style={styles.summaryMeta} numberOfLines={1}>
                    Hạn hợp đồng: {unit.endDate || '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* NGÀY BÀN GIAO */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Ngày dự kiến bàn giao kho</Text>
              <View style={styles.dateInputBox}>
                <MaterialIcons name="event" size={18} color="#2563EB" />
                <TextInput
                  style={styles.dateTextInput}
                  value={returnDate}
                  onChangeText={setReturnDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.dateQuickRow}>
                {dateQuickPicks.map((pick) => {
                  const active = returnDate === pick.value;
                  return (
                    <TouchableOpacity
                      key={pick.label}
                      style={[styles.dateQuickChip, active && styles.dateQuickChipActive]}
                      activeOpacity={0.8}
                      onPress={() => setReturnDate(pick.value)}
                    >
                      <Text
                        style={[
                          styles.dateQuickChipText,
                          active && styles.dateQuickChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {pick.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* KHUNG GIỜ BÀN GIAO */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Khung giờ khách đến trả kho</Text>
              <View style={styles.timeGrid}>
                {RETURN_TIME_SLOTS.map((slot) => {
                  const active = returnTimeSlot === slot.value;
                  return (
                    <TouchableOpacity
                      key={slot.value}
                      style={[styles.timeChip, active && styles.timeChipActive]}
                      activeOpacity={0.8}
                      onPress={() => setReturnTimeSlot(slot.value)}
                    >
                      <View
                        style={[styles.timeRadio, active && styles.timeRadioActive]}
                      >
                        {active ? <View style={styles.timeRadioDot} /> : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[styles.timeChipText, active && styles.timeChipTextActive]}
                          numberOfLines={1}
                        >
                          {slot.value}
                        </Text>
                        <Text
                          style={[styles.timeChipPeriod, active && styles.timeChipPeriodActive]}
                          numberOfLines={1}
                        >
                          {slot.period}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CHECKLIST NGHIỆM THU */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Xác nhận trước khi trả kho</Text>

              <TouchableOpacity
                style={[styles.checkCard, hasCleanedItems && styles.checkCardActive]}
                onPress={() => setHasCleanedItems(!hasCleanedItems)}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={hasCleanedItems ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={hasCleanedItems ? '#16A34A' : '#94A3B8'}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.checkTitle} numberOfLines={1}>
                    Đã dọn sạch đồ đạc
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkCard, hasLockedDoor && styles.checkCardActive]}
                onPress={() => setHasLockedDoor(!hasLockedDoor)}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={hasLockedDoor ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={hasLockedDoor ? '#16A34A' : '#94A3B8'}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.checkTitle} numberOfLines={1}>
                    Đã khóa cửa kho
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryNote}>
              <MaterialIcons name="info-outline" size={15} color="#2563EB" />
              <Text style={styles.summaryNoteText}>
                Nhân viên sẽ có mặt đúng ngày & khung giờ bạn chọn để nghiệm thu kho và hoàn trả tiền cọc bảo đảm hợp đồng (chủ yếu bằng tiền mặt tại cơ sở).
              </Text>
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Để sau</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmitReturn}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText} numberOfLines={1}>
                    Gửi yêu cầu
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerSubtitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryFacilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryFacility: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  summaryMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    flexShrink: 1,
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
  },
  dateQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dateQuickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateQuickChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  dateQuickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dateQuickChipTextActive: {
    color: '#1D4ED8',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  timeChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  timeChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  timeRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeRadioActive: {
    borderColor: '#2563EB',
  },
  timeRadioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2563EB',
  },
  timeChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#1D4ED8',
  },
  timeChipPeriod: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  timeChipPeriodActive: {
    color: '#60A5FA',
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  checkCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
  },
  summaryNoteText: {
    flex: 1,
    fontSize: 10.5,
    color: '#1D4ED8',
    lineHeight: 15,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
