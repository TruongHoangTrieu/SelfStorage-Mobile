import React, { useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { checkCheckInEligibility } from '../../utils/checkInSchedule';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckInAppointment, StaffReturnOrder } from '../../types/handover';
import {
  fetchStaffContractsApi,
  rescheduleReservationApi,
  cancelReservationApi,
} from '../../api';
import {
  isReturnOrderCompleted,
  mapContractsToReturnOrders,
} from '../../utils/staffReturnOrders';
import { MaterialIcons } from '@expo/vector-icons';
import SimpleReturnInspectionModal from '../../components/staff/SimpleReturnInspectionModal';

// Mục lịch hợp nhất bao gồm cả Nhận kho và Trả kho
export interface UnifiedScheduleItem {
  id: string;
  orderType: 'checkin' | 'checkout';
  customerName: string;
  phone: string;
  assignedUnit: string;
  unitSize?: string;
  unitType?: string;
  startDate: string; // DD/MM/YYYY
  slotTime: string;
  status: 'pending' | 'in_progress' | 'completed';
  specialNotes?: string;
  rawCheckIn?: CheckInAppointment;
  rawReturnOrder?: StaffReturnOrder;
}

interface CheckInQueueScreenProps {
  appointments: CheckInAppointment[];
  onStartHandover: (appointment: CheckInAppointment) => void;
  returnOrders?: StaffReturnOrder[];
  onOpenReturnOrder?: (order: StaffReturnOrder) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  facilityName?: string;
  facilityId?: string | number;
  onOpenSidebar: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
  initialTypeFilter?: 'all' | 'checkin' | 'checkout';
}

// Tên 7 thứ trong tuần tiếng Việt
const DAY_NAMES = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];

// Lấy thứ Hai đầu tuần của 1 ngày bất kỳ
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Lấy 7 ngày trong tuần từ thứ Hai đến Chủ Nhật
function getWeekDays(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    days.push(next);
  }
  return days;
}

// Format DD/MM
function formatDayMonth(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// Format DD/MM/YYYY
function formatDateKey(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Kiểm tra có phải ngày hôm nay không
function isTodayDate(d: Date): boolean {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// Chuẩn hóa chuỗi ngày của lịch hẹn về DD/MM/YYYY
function normalizeAppointmentDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDateKey(parsed);
    }
  }
  return trimmed;
}

// Chuyển đổi định dạng giờ về chuẩn 24h (loại bỏ hoàn toàn SA/CH/AM/PM)
export function to24hFormat(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const clean = timeStr.trim();
  if (clean.includes('-')) {
    return to24hFormat(clean.split('-')[0].trim());
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(SA|CH|AM|PM)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = (match[3] || '').toUpperCase();
    if (period === 'CH' || period === 'PM') {
      if (h < 12) h += 12;
    } else if (period === 'SA' || period === 'AM') {
      if (h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return clean;
}

export default function CheckInQueueScreen({
  appointments,
  onStartHandover,
  returnOrders = [],
  onOpenReturnOrder,
  onRefresh,
  isRefreshing = false,
  facilityName = 'Trụ sở chính Thủ Đức',
  facilityId,
  onOpenSidebar,
  onOpenNotifications,
  unreadNotifCount = 0,
  initialTypeFilter = 'all',
}: CheckInQueueScreenProps) {
  const insets = useSafeAreaInsets();

  // Tuần đang chọn (mặc định là thứ Hai của tuần hiện tại)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'checkin' | 'checkout'>(initialTypeFilter);

  // Quản lý Modal Nghiệm Thu Trả Kho (MỞ THẲNG MODAL TẠI CHỖ, KHÔNG CHUYỂN UI CŨ)
  const [localReturnOrders, setLocalReturnOrders] = useState<StaffReturnOrder[]>(returnOrders);
  const [backendReturnOrders, setBackendReturnOrders] = useState<StaffReturnOrder[] | null>(null);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<StaffReturnOrder | null>(null);
  const [isInspectionModalVisible, setIsInspectionModalVisible] = useState<boolean>(false);

  // Modal Dời lịch hẹn nhận kho (đồng bộ quy trình trễ hẹn Web FE)
  // Modal Liên hệ khách hàng trước khi Dời lịch hoặc Báo vắng (đồng bộ Web FE ContactModal)
  const [contactTarget, setContactTarget] = useState<UnifiedScheduleItem | null>(null);
  const [contactAttempted, setContactAttempted] = useState<boolean>(false);

  const [rescheduleTarget, setRescheduleTarget] = useState<UnifiedScheduleItem | null>(null);
  const [rescheduleDayOffset, setRescheduleDayOffset] = useState<0 | 1>(1);
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('09:00');
  const [rescheduleNote, setRescheduleNote] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const RESCHEDULE_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  const openContactModal = (item: UnifiedScheduleItem) => {
    setContactTarget(item);
    setContactAttempted(false);
  };

  const openRescheduleModal = (item: UnifiedScheduleItem) => {
    setRescheduleTarget(item);
    setRescheduleDayOffset(1);
    setRescheduleSlot('09:00');
    setRescheduleNote('Đã liên hệ khách hàng xác nhận dời lịch nhận kho');
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget?.rawCheckIn) return;
    const rawId = rescheduleTarget.rawCheckIn.rawId || rescheduleTarget.rawCheckIn.id;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + rescheduleDayOffset);
    const [hh, mm] = rescheduleSlot.split(':').map((n) => parseInt(n, 10));
    targetDate.setHours(hh || 9, mm || 0, 0, 0);

    setIsSubmittingReschedule(true);
    try {
      await rescheduleReservationApi(
        rawId,
        targetDate.toISOString(),
        rescheduleNote.trim() || 'Khách dời lịch hẹn nhận kho',
      );
      setRescheduleTarget(null);
      Alert.alert(
        'Đã dời lịch hẹn',
        `Lịch nhận kho của ${rescheduleTarget.customerName} đã được dời sang ${formatDateKey(targetDate)} lúc ${rescheduleSlot}.`,
      );
      onRefresh?.();
    } catch (err: any) {
      Alert.alert('Lỗi dời lịch', err?.message || 'Không thể cập nhật lịch hẹn. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleMarkNoShow = (item: UnifiedScheduleItem) => {
    if (!item.rawCheckIn) return;
    const rawId = item.rawCheckIn.rawId || item.rawCheckIn.id;
    Alert.alert(
      'Xác nhận báo vắng & Giải phóng kho',
      `Hủy đơn nhận kho của ${item.customerName} (ô ${item.assignedUnit}) và mở lại ô kho về trạng thái Khả dụng?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Xác nhận giải phóng',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservationApi(rawId, 'Khách không đến nhận kho quá thời hạn quy định');
              Alert.alert('Thành công', `Đã giải phóng ô kho ${item.assignedUnit}.`);
              onRefresh?.();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể hủy đơn.');
            }
          },
        },
      ],
    );
  };

  // Lấy danh sách hợp đồng thật từ Backend để lịch trả kho không dùng dữ liệu mock.
  // Nhờ vậy khách gửi yêu cầu trả kho sẽ xuất hiện đúng trạng thái "chờ nghiệm thu".
  const loadBackendReturnOrders = useCallback(async () => {
    try {
      const res = await fetchStaffContractsApi(facilityId);
      const contractList = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : null;
      if (contractList) {
        // Set cả mảng rỗng: chi nhánh không có đơn thì phải trống, không rơi về mock
        setBackendReturnOrders(mapContractsToReturnOrders(contractList, facilityName, facilityId));
      }
    } catch {
      // Giữ danh sách hiện có nếu không kết nối được Backend
    }
  }, [facilityId, facilityName]);

  React.useEffect(() => {
    loadBackendReturnOrders();
  }, [loadBackendReturnOrders]);

  // Đồng bộ returnOrders kèm các cập nhật/mã PIN đã lưu và khôi phục modal nếu vừa quay lại từ App Ngân Hàng
  React.useEffect(() => {
    let isMounted = true;
    async function syncSavedReturnState() {
      const baseOrders =
        backendReturnOrders !== null
          ? backendReturnOrders
          : returnOrders && returnOrders.length > 0
          ? returnOrders
          : [];
      const hydrated = await Promise.all(
        baseOrders.map(async (ord) => {
          try {
            const savedOrdStr = await AsyncStorage.getItem(`return_order_state_${ord.id}`);
            const savedPin = await AsyncStorage.getItem(`unit_smart_pin_${ord.unitCode}`);
            let merged = { ...ord };
            if (savedOrdStr) {
              // Không khôi phục status/returnType: trạng thái "đã trả kho" chỉ có
              // sau khi nhân viên nghiệm thu và Backend xác nhận (TERMINATED).
              const { status: _savedStatus, returnType: _savedReturnType, ...savedRest } =
                JSON.parse(savedOrdStr);
              merged = { ...merged, ...savedRest };
            }
            if (savedPin && savedPin.trim().length >= 4) {
              merged.smartLockPin = savedPin.trim();
            }
            return merged;
          } catch {
            return ord;
          }
        })
      );
      if (!isMounted) return;
      setLocalReturnOrders(hydrated);

      // Nếu người dùng vừa chuyển qua app ngân hàng để thanh toán phụ thu thì mở lại đúng modal đơn đó
      try {
        const activeModalOrderId = await AsyncStorage.getItem('active_return_inspection_order_id');
        if (activeModalOrderId && isMounted) {
          const targetOrder = hydrated.find((o) => o.id === activeModalOrderId);
          if (targetOrder) {
            setSelectedReturnOrder(targetOrder);
            setIsInspectionModalVisible(true);
          }
        }
      } catch {}
    }
    syncSavedReturnState();
    return () => {
      isMounted = false;
    };
  }, [returnOrders, backendReturnOrders]);

  // Tính 7 ngày trong tuần
  const weekDays = useMemo(() => getWeekDays(selectedMonday), [selectedMonday]);
  const sunday = useMemo(() => weekDays[6], [weekDays]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    setSelectedMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setSelectedMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleGoToday = () => {
    setSelectedMonday(getMonday(new Date()));
  };

  // ─── HỢP NHẤT DANH SÁCH NHẬN KHO VÀ TRẢ KHO TRÊN CÙNG LỊCH ───
  const unifiedItems = useMemo(() => {
    const today = new Date();
    const todayFormatted = formatDateKey(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = formatDateKey(tomorrow);

    // 1. Chuyển đổi các đơn Nhận kho (giữ cả đơn EXPIRED để nhân viên demo/xử lý dời lịch, chỉ bỏ CANCELLED)
    const checkinList: UnifiedScheduleItem[] = appointments
      .filter((app) => app.status !== 'cancelled')
      .map((app) => ({
      id: `checkin-${app.id}`,
      orderType: 'checkin',
      customerName: app.customerName,
      phone: app.phone,
      assignedUnit: app.assignedUnit || 'A-101',
      unitSize: app.unitSize,
      unitType: app.unitType,
      startDate: normalizeAppointmentDate(app.startDate) || todayFormatted,
      slotTime: app.slotTime || '09:00 AM',
      status: app.status === 'completed' ? 'completed' : app.status === 'in_progress' ? 'in_progress' : 'pending',
      specialNotes: app.specialNotes,
      rawCheckIn: app,
    }));

    // 2. Chuyển đổi các đơn Trả kho (gộp chung vào lịch với màu card khác biệt)
    const checkoutList: UnifiedScheduleItem[] = localReturnOrders.map((ord, idx) => {
      // Ưu tiên ngày khách đã đăng ký trả kho; nếu chưa có mới suy ra theo hạn hợp đồng
      const scheduledDate = normalizeAppointmentDate(ord.returnDate);
      let returnDateStr =
        scheduledDate ||
        (ord.returnType === 'today'
          ? todayFormatted
          : normalizeAppointmentDate(ord.endDate));
      if (!returnDateStr) {
        returnDateStr = idx % 2 === 0 ? todayFormatted : tomorrowFormatted;
      }

      return {
        id: `checkout-${ord.id || ord.contractCode}`,
        orderType: 'checkout',
        customerName: ord.customerName,
        phone: ord.phone,
        assignedUnit: ord.unitCode,
        unitSize: ord.unitSize,
        unitType: ord.unitType || 'Kho Gia đình',
        startDate: returnDateStr,
        slotTime: ord.returnTimeSlot || (idx % 2 === 0 ? '02:00 PM' : '10:30 AM'),
        status: isReturnOrderCompleted(ord) ? 'completed' : 'pending',
        specialNotes: ord.notes || undefined,
        rawReturnOrder: ord,
      };
    });

    return [...checkinList, ...checkoutList];
  }, [appointments, localReturnOrders]);

  // Lọc theo tìm kiếm và bộ lọc loại đơn (Tất cả / Nhận kho / Trả kho)
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Lọc theo loại
      if (typeFilter !== 'all' && item.orderType !== typeFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        item.customerName.toLowerCase().includes(query) ||
        item.phone.includes(query) ||
        item.assignedUnit.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [unifiedItems, typeFilter, searchQuery]);

  // Nhóm các mục lịch theo từng ngày trong tuần
  const itemsByDay = useMemo(() => {
    const map = new Map<string, UnifiedScheduleItem[]>();

    weekDays.forEach((d) => {
      map.set(formatDateKey(d), []);
    });

    filteredItems.forEach((item) => {
      const dateKey = normalizeAppointmentDate(item.startDate);
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(item);
      }
    });

    return map;
  }, [weekDays, filteredItems]);

  // ─── RENDER CARD HỢP NHẤT: NHẬN KHO (XANH/TRẮNG) & TRẢ KHO (MÀU CAM NỔI BẬT) ───
  const renderScheduleCard = (item: UnifiedScheduleItem) => {
    const isCheckout = item.orderType === 'checkout';
    const checkInEligibility = !isCheckout
      ? checkCheckInEligibility(item.rawCheckIn || item)
      : { allowed: true };
    const isCheckInAllowed = checkInEligibility.allowed;

    // Giờ hiển thị chuẩn 24h (bỏ SA/CH/AM/PM)
    const time24h = to24hFormat(item.slotTime || (isCheckout ? '14:00' : '09:00'));
    const [timeMain, timePeriod] = time24h.split(' - ');

    // Nhãn kích thước kho
    const unitSizeLabel = item.unitSize
      ? item.unitSize.split(' ')[0]
      : (item.unitType ? item.unitType.replace('Kho ', '') : 'Tiêu chuẩn');

    const handleCardPress = () => {
      if (isCheckout) {
        // VÀO THẲNG MODAL NGHIỆM THU TRẢ KHO NGAY TẠI CHỖ (KỂ CẢ XEM LẠI / CHỈNH SỬA)
        if (item.rawReturnOrder) {
          setSelectedReturnOrder(item.rawReturnOrder);
          setIsInspectionModalVisible(true);
          AsyncStorage.setItem('active_return_inspection_order_id', item.rawReturnOrder.id).catch(() => null);
        } else if (onOpenReturnOrder) {
          onOpenReturnOrder(item.rawReturnOrder!);
        }
      } else {
        if (item.status === 'completed') {
          if (item.rawCheckIn) onStartHandover(item.rawCheckIn);
          return;
        }

        // Chặn nếu ngoài khung giờ nhận kho (trước > 1h hoặc đã trễ hẹn)
        if (!isCheckInAllowed) {
          if (checkInEligibility.isTooLate || checkInEligibility.isLateWarning) {
            Alert.alert(
              'Đơn quá hạn nhận kho',
              checkInEligibility.reason || 'Đơn đã quá giờ hẹn. Vui lòng liên hệ khách hàng trước khi dời lịch hoặc báo vắng.',
              [
                {
                  text: 'Liên hệ khách',
                  onPress: () => openContactModal(item),
                },
                { text: 'Đóng', style: 'cancel' },
              ],
            );
          } else {
            Alert.alert(
              'Chưa thể nhận kho',
              checkInEligibility.reason || 'Đơn chỉ được làm thủ tục nhận kho trước giờ hẹn tối đa 1 tiếng.',
              [{ text: 'Đã hiểu' }],
            );
          }
          return;
        }

        if (item.rawCheckIn) {
          onStartHandover(item.rawCheckIn);
        }
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.wCard,
          isCheckout && styles.wCardCheckout, // Card trả kho có màu nền & viền khác biệt
        ]}
        onPress={handleCardPress}
        activeOpacity={0.85}
      >
        {/* Thanh accent đứng bên trái: Nhận kho = Xanh dương; Nhận kho xong = Xanh lá; Trả kho = Cam đậm (luôn giữ cam) */}
        <View
          style={[
            styles.wAccent,
            isCheckout ? styles.wAccentCheckout : styles.wAccentCheckin,
            !isCheckout && item.status === 'completed' && { backgroundColor: '#10B981' },
            item.status === 'in_progress' && { backgroundColor: '#8B5CF6' },
            !isCheckout && !isCheckInAllowed && item.status !== 'completed' && { backgroundColor: '#94A3B8' },
          ]}
        />

        <View style={styles.wBody}>
          {/* Hàng 1: [NHẬN KHO / TRẢ KHO] (Trái) <───────────────────────────> 1:00 PM (Phải) */}
          <View style={styles.wRow1}>
            <View style={styles.badgeLabelRow}>
              <View
                style={[
                  styles.orderTypeTag,
                  isCheckout ? styles.orderTypeTagCheckout : styles.orderTypeTagCheckin,
                ]}
              >
                <MaterialIcons
                  name={isCheckout ? 'exit-to-app' : 'assignment-turned-in'}
                  size={11}
                  color={isCheckout ? '#C2410C' : '#1D4ED8'}
                />
                <Text
                  style={[
                    styles.orderTypeText,
                    isCheckout ? styles.orderTypeTextCheckout : styles.orderTypeTextCheckin,
                  ]}
                >
                  {isCheckout ? 'TRẢ KHO' : 'NHẬN KHO'}
                </Text>
              </View>
              {isCheckout && item.rawReturnOrder?.overdueDays && item.rawReturnOrder.overdueDays > 0 ? (
                <View style={styles.overdueDaysPill}>
                  <MaterialIcons name="warning" size={10} color="#B45309" />
                  <Text style={styles.overdueDaysPillText}>
                    Trễ {item.rawReturnOrder.overdueDays} ngày
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.wTimeRow}>
              <Text style={[styles.wTimeMain, isCheckout && { color: '#C2410C' }]}>
                {timeMain}
              </Text>
              <Text style={styles.wTimePeriod}>{timePeriod ? `- ${timePeriod}` : ''}</Text>
            </View>
          </View>

          {/* Hàng 2: TÊN KHÁCH HÀNG (DÒNG RIÊNG BIỆT 100% CHIỀU RỘNG, KHÔNG BỊ CHÈN ÉP) */}
          <View style={styles.wCustomerRow}>
            <Text style={styles.wCustomerNameFull} numberOfLines={1}>
              {item.customerName}
            </Text>
          </View>

          {/* Hàng 3: TÊN KHO <─────────────────────> SĐT TO RÕ */}
          <View style={styles.wRow3}>
            <View style={styles.wTitleRow}>
              <Text style={[styles.wTitle, isCheckout && { color: '#9A3412' }]} numberOfLines={1}>
                {item.assignedUnit || 'A-101'}
              </Text>
              <Text style={styles.wTitleSub} numberOfLines={1}>
                {unitSizeLabel}
              </Text>
            </View>

            <Text style={styles.wBigPhone}>
              {item.phone}
            </Text>
          </View>

          {/* Hàng 4: GHI CHÚ (NẾU CÓ) <─────────────> NÚT THAO TÁC / TRẠNG THÁI */}
          <View style={styles.wFooterRow}>
            <View style={styles.wFooterLeft}>
              {item.specialNotes ? (
                <View style={[styles.wNoteBox, isCheckout && styles.wNoteBoxCheckout]}>
                  <MaterialIcons
                    name="notes"
                    size={11}
                    color={isCheckout ? '#EA580C' : '#D97706'}
                  />
                  <Text
                    style={[styles.wNoteText, isCheckout && { color: '#9A3412' }]}
                    numberOfLines={1}
                  >
                    {item.specialNotes}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.wFooterRight}>
              {isCheckout ? (
                /* ─── ĐƠN TRẢ KHO ─── */
                item.status === 'completed' ? (
                  /* ĐÃ TRẢ KHO: GIỮ NGUYÊN 2 Ô [ ĐÃ TRẢ KHO ] & [ CHỈNH SỬA ] (TẤT CẢ MÀU CAM ĐẶC TRƯNG) */
                  <View style={styles.completedActionsGroup}>
                    {/* Ô 1: Trạng thái Đã trả kho (giữ chữ Trả kho, màu cam) */}
                    <View style={styles.completedBadgePillCheckout}>
                      <MaterialIcons name="assignment-turned-in" size={13} color="#C2410C" />
                      <Text style={styles.completedBadgeTextCheckout}>Đã trả kho</Text>
                    </View>

                    {/* Ô 2: Nút Chỉnh sửa (màu cam đặc trưng của Trả kho) */}
                    <TouchableOpacity
                      style={styles.editActionBtnCheckout}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCardPress();
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="edit" size={12} color="#C2410C" />
                      <Text style={styles.editActionTextCheckout}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* CHƯA TRẢ KHO: Nút [ Nghiệm thu ] cam */
                  <View
                    style={[
                      styles.wActionButton,
                      styles.wActionButtonCheckout,
                      item.status === 'in_progress' ? styles.wActionButtonInProgress : null,
                    ]}
                  >
                    <Text style={styles.wActionText}>
                      {item.status === 'in_progress' ? 'Tiếp tục' : 'Nghiệm thu'}
                    </Text>
                  </View>
                )
              ) : (
                /* ─── ĐƠN NHẬN KHO ─── */
                item.status === 'completed' ? (
                  /* ĐÃ NHẬN KHO: 2 Ô: [ Hoàn thành ] (xanh lá) & [ Chỉnh sửa ] (xanh dương) */
                  <View style={styles.completedActionsGroup}>
                    <View style={styles.completedBadgePill}>
                      <MaterialIcons name="check-circle" size={13} color="#16A34A" />
                      <Text style={styles.completedBadgeText}>Hoàn thành</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCardPress();
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="edit" size={12} color="#004ac6" />
                      <Text style={styles.editActionText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* CHƯA NHẬN KHO: Nút [ Nhận kho ] xanh dương hoặc XÁM nếu ngoài khung giờ + Nút Dời lịch nếu trễ */
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {(checkInEligibility.isLateWarning || checkInEligibility.isTooLate) && (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#93C5FD',
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          openContactModal(item);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="phone" size={12} color="#1D4ED8" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                          Liên hệ khách
                        </Text>
                      </TouchableOpacity>
                    )}
                    <View
                      style={[
                        styles.wActionButton,
                        isCheckInAllowed
                          ? (item.status === 'in_progress' ? styles.wActionButtonInProgress : styles.wActionButtonCheckin)
                          : styles.wActionButtonDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.wActionText,
                          !isCheckInAllowed && styles.wActionTextDisabled,
                        ]}
                      >
                        {item.status === 'in_progress'
                          ? 'Tiếp tục'
                          : isCheckInAllowed
                            ? 'Nhận kho'
                            : checkInEligibility.isTooLate || checkInEligibility.isLateWarning
                              ? 'Quá hạn'
                              : 'Chưa tới giờ'}
                      </Text>
                    </View>
                  </View>
                )
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header Xanh Dương Chuẩn Thương Hiệu (Safe Area chống tràn) ─── */}
      <View
        style={[
          styles.blueHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {/* Nút quay lại Trang Home Nhân Viên */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onOpenSidebar}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Tiêu đề đã đổi tên bao quát cả Nhận & Trả kho */}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitleText}>Lịch nhận & trả kho</Text>
            <Text style={styles.headerSubFacility} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {onOpenNotifications && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={onOpenNotifications}
                activeOpacity={0.7}
              >
                <MaterialIcons name="notifications-none" size={24} color="#FFFFFF" />
                {unreadNotifCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ─── Thanh điều hướng Tuần & Bộ lọc loại đơn [Tất cả / Nhận kho / Trả kho] ─── */}
      <View style={styles.navBarCard}>
        {/* Hàng trên: Nút [Hôm nay] + Mũi tên < > & Tiêu đề Tháng */}
        <View style={styles.weekNavInner}>
          <View style={styles.leftNavGroup}>
            <TouchableOpacity
              style={styles.todayPillBtn}
              onPress={handleGoToday}
              activeOpacity={0.8}
            >
              <Text style={styles.todayPillText}>Hôm nay</Text>
            </TouchableOpacity>

            <View style={styles.arrowGroup}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={handlePrevWeek}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-left" size={22} color="#1D4ED8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={handleNextWeek}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-right" size={22} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.monthRightGroup}>
            <Text style={styles.monthTitle}>
              Tháng {selectedMonday.getMonth() + 1}
            </Text>
            <View style={styles.weekDaysPill}>
              <MaterialIcons name="date-range" size={13} color="#1D4ED8" />
              <Text style={styles.weekDaysPillText}>
                {formatDayMonth(selectedMonday)} – {formatDayMonth(sunday)}
              </Text>
            </View>
          </View>
        </View>

        {/* Hàng giữa: 3 nút lọc nhanh [Tất cả] [Nhận kho] [Trả kho] */}
        <View style={styles.filterPillRow}>
          <TouchableOpacity
            style={[styles.filterPill, typeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setTypeFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, typeFilter === 'all' && styles.filterPillTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, typeFilter === 'checkin' && styles.filterPillActiveCheckin]}
            onPress={() => setTypeFilter('checkin')}
            activeOpacity={0.8}
          >
            <View style={styles.dotCheckin} />
            <Text
              style={[
                styles.filterPillText,
                typeFilter === 'checkin' && styles.filterPillTextActiveCheckin,
              ]}
            >
              Nhận kho
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, typeFilter === 'checkout' && styles.filterPillActiveCheckout]}
            onPress={() => setTypeFilter('checkout')}
            activeOpacity={0.8}
          >
            <View style={styles.dotCheckout} />
            <Text
              style={[
                styles.filterPillText,
                typeFilter === 'checkout' && styles.filterPillTextActiveCheckout,
              ]}
            >
              Trả kho
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hàng dưới: Thanh tìm kiếm nhanh */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={17} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên khách, SĐT hoặc số ô kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── DANH SÁCH LỊCH 7 NGÀY THEO TUẦN ─── */}
      <ScrollView
        style={styles.calendarScrollView}
        contentContainerStyle={[
          styles.calendarContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              loadBackendReturnOrders();
              onRefresh?.();
            }}
            tintColor="#1D4ED8"
            colors={['#1D4ED8']}
          />
        }
      >
        {/* Không có đơn nào trong tuần (hoặc do tìm kiếm/lọc) → hiển thị trạng thái trống */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyWeekWrap}>
            <MaterialIcons name="event-busy" size={34} color="#94A3B8" />
            <Text style={styles.emptyWeekTitle}>Không có lịch hẹn</Text>
            <Text style={styles.emptyWeekText}>
              Chưa có đơn nhận / trả kho phù hợp trong tuần này
            </Text>
          </View>
        ) : null}

        {weekDays.map((dayDate) => {
          const dateKey = formatDateKey(dayDate);
          const dayItems = itemsByDay.get(dateKey) || [];
          const isToday = isTodayDate(dayDate);
          const dayIndex = dayDate.getDay();
          const dayNameLabel = DAY_NAMES[dayIndex];
          const dayNumberStr = String(dayDate.getDate()).padStart(2, '0');
          const monthStr = String(dayDate.getMonth() + 1).padStart(2, '0');

          // Ngày không có đơn: bỏ hẳn khỏi danh sách, không để lại khoảng trống "Trống lịch hẹn"
          if (dayItems.length === 0) return null;

          return (
            <View key={dateKey} style={styles.daySection}>
              {/* Đường ngăn cách duy nhất: Thứ · ngày/tháng, chạy hết chiều ngang */}
              <View style={styles.dayDividerRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dayDividerLabel,
                    isToday && styles.dayDividerLabelToday,
                  ]}
                >
                  {dayNameLabel} · {dayNumberStr}/{monthStr}
                </Text>

                {isToday ? (
                  <View style={styles.todayBadgePill}>
                    <Text style={styles.todayBadgePillText} numberOfLines={1}>
                      HÔM NAY
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.dayDividerLine,
                    isToday && styles.dayDividerLineToday,
                  ]}
                />
              </View>

              {/* Thẻ nhận / trả kho: full chiều rộng hàng */}
              <View style={styles.dayCardsWrap}>
                {dayItems.map((item) => renderScheduleCard(item))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ─── MODAL NGHIỆM THU TRẢ KHO TRỰC TIẾP (TINH GỌN, ÍT CHỮ) ─── */}
      <SimpleReturnInspectionModal
        visible={isInspectionModalVisible}
        onClose={() => {
          setIsInspectionModalVisible(false);
          AsyncStorage.removeItem('active_return_inspection_order_id').catch(() => null);
        }}
        order={selectedReturnOrder}
        onSuccess={(updatedOrder) => {
          setSelectedReturnOrder(updatedOrder);
          setLocalReturnOrders((prev) =>
            prev.map((ord) => (ord.id === updatedOrder.id ? updatedOrder : ord))
          );
          AsyncStorage.setItem(`return_order_state_${updatedOrder.id}`, JSON.stringify(updatedOrder)).catch(() => null);
          AsyncStorage.removeItem('active_return_inspection_order_id').catch(() => null);
          loadBackendReturnOrders();
          onRefresh?.();
        }}
      />

      {/* ─── MODAL LIÊN HỆ KHÁCH HÀNG TRƯỚC KHI DỜI LỊCH / BÁO VẮNG (ĐỒNG BỘ WEB FE) ─── */}
      <Modal
        visible={!!contactTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setContactTarget(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 18,
              maxHeight: '90%',
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Liên Hệ Khách Hàng
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Liên hệ nhắc hẹn trước khi dời lịch hoặc báo vắng hủy đơn
                </Text>
              </View>
              <TouchableOpacity onPress={() => setContactTarget(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {contactTarget && (() => {
              const code = contactTarget.rawCheckIn?.rawId || contactTarget.id;
              const email = contactTarget.rawCheckIn?.email;
              const phoneClean = (contactTarget.phone || '').replace(/\s+/g, '');
              const reminderMessage = `Chào ${contactTarget.customerName}, hệ thống tự quản lý kho xin nhắc bạn có lịch hẹn nhận phòng/ô kho #${code} vào lúc ${contactTarget.slotTime} ngày ${contactTarget.startDate}. Vui lòng phản hồi để nhân viên hỗ trợ bạn nhé!`;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {/* Thông tin khách hàng */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 12,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      {contactTarget.customerName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>
                      Mã đơn: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{code}</Text> • Ô {contactTarget.assignedUnit}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>
                      Lịch hẹn: <Text style={{ fontWeight: '700', color: '#B45309' }}>{contactTarget.slotTime} • {contactTarget.startDate}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>
                      SĐT: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{contactTarget.phone || 'Chưa có SĐT'}</Text>
                    </Text>
                    {!!email && (
                      <Text style={{ fontSize: 12, color: '#475569' }}>
                        Email: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{email}</Text>
                      </Text>
                    )}
                  </View>

                  {/* Bước 1: Liên hệ khách */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B', textTransform: 'uppercase' }}>
                      Bước 1: Liên hệ nhắc hẹn khách hàng
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        disabled={!phoneClean}
                        onPress={() => {
                          if (phoneClean) {
                            Linking.openURL(`tel:${phoneClean}`);
                          }
                        }}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: phoneClean ? '#059669' : '#E2E8F0',
                        }}
                      >
                        <MaterialIcons name="phone" size={16} color={phoneClean ? '#FFFFFF' : '#94A3B8'} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: phoneClean ? '#FFFFFF' : '#94A3B8' }}>
                          Gọi điện
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={!phoneClean}
                        onPress={() => {
                          if (phoneClean) {
                            const sep = Platform.OS === 'ios' ? '&' : '?';
                            Linking.openURL(`sms:${phoneClean}${sep}body=${encodeURIComponent(reminderMessage)}`);
                          }
                        }}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: phoneClean ? '#0284C7' : '#E2E8F0',
                        }}
                      >
                        <MaterialIcons name="sms" size={16} color={phoneClean ? '#FFFFFF' : '#94A3B8'} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: phoneClean ? '#FFFFFF' : '#94A3B8' }}>
                          Nhắn SMS
                        </Text>
                      </TouchableOpacity>

                      {!!email && (
                        <TouchableOpacity
                          onPress={() => {
                            const subject = encodeURIComponent(`Nhắc lịch hẹn nhận kho #${code}`);
                            const body = encodeURIComponent(reminderMessage);
                            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
                          }}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: '#4F46E5',
                          }}
                        >
                          <MaterialIcons name="email" size={16} color="#FFFFFF" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                            Email
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Mẫu tin nhắn nhắc hẹn */}
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        padding: 10,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                        Mẫu tin nhắn nhắc hẹn:
                      </Text>
                      <Text style={{ fontSize: 11, color: '#334155', lineHeight: 16 }} selectable>
                        {reminderMessage}
                      </Text>
                    </View>

                    {!contactAttempted && (
                      <TouchableOpacity
                        onPress={() => setContactAttempted(true)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: '#2563EB',
                          marginTop: 2,
                        }}
                      >
                        <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          Xác nhận đã liên hệ xong với khách hàng
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bước 2: Chỉ mở sau khi đã xác nhận liên hệ */}
                  {contactAttempted && (
                    <View
                      style={{
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#E2E8F0',
                        gap: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>
                          Bước 2: Kết quả xử lý sau liên hệ
                        </Text>
                        <TouchableOpacity onPress={() => setContactAttempted(false)}>
                          <Text style={{ fontSize: 11, color: '#2563EB', textDecorationLine: 'underline', fontWeight: '600' }}>
                            Chọn lại Bước 1
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: '#ECFDF5',
                          borderWidth: 1,
                          borderColor: '#A7F3D0',
                        }}
                      >
                        <MaterialIcons name="check-circle" size={18} color="#059669" />
                        <Text style={{ flex: 1, fontSize: 11, color: '#065F46', lineHeight: 16 }}>
                          Đã hoàn tất liên hệ! Vui lòng chọn hướng xử lý theo thỏa thuận với khách hàng:
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const target = contactTarget;
                            setContactTarget(null);
                            if (target) openRescheduleModal(target);
                          }}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: '#FEF3C7',
                            borderWidth: 1,
                            borderColor: '#F59E0B',
                          }}
                        >
                          <MaterialIcons name="schedule" size={16} color="#B45309" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                            Khách xin dời lịch
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            const target = contactTarget;
                            setContactTarget(null);
                            if (target) handleMarkNoShow(target);
                          }}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: '#FFE4E6',
                            borderWidth: 1,
                            borderColor: '#F43F5E',
                          }}
                        >
                          <MaterialIcons name="person-off" size={16} color="#BE123C" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#9F1239' }}>
                            Khách báo hủy
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL DỜI LỊCH HẸN NHẬN KHO (ĐỒNG BỘ WEB FE) ─── */}
      <Modal
        visible={!!rescheduleTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingReschedule) setRescheduleTarget(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 18,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Dời Lịch Hẹn Check-in
              </Text>
              <TouchableOpacity
                onPress={() => !isSubmittingReschedule && setRescheduleTarget(null)}
              >
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {rescheduleTarget && (
              <Text style={{ fontSize: 12, color: '#475569' }}>
                Khách: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{rescheduleTarget.customerName}</Text> • Ô {rescheduleTarget.assignedUnit}
              </Text>
            )}

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              1. Chọn ngày hẹn mới (tối đa sang ngày hôm sau):
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([0, 1] as const).map((offset) => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                const selected = rescheduleDayOffset === offset;
                return (
                  <TouchableOpacity
                    key={offset}
                    onPress={() => setRescheduleDayOffset(offset)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected ? '#1D4ED8' : '#E2E8F0',
                      backgroundColor: selected ? '#EFF6FF' : '#F8FAFC',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#1D4ED8' : '#334155' }}>
                      {offset === 0 ? 'Hôm nay' : 'Ngày mai'} ({formatDayMonth(d)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              2. Chọn khung giờ nhận kho:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RESCHEDULE_SLOTS.map((slot) => {
                const selected = rescheduleSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setRescheduleSlot(slot)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? '#1D4ED8' : '#E2E8F0',
                      backgroundColor: selected ? '#1D4ED8' : '#F8FAFC',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#FFFFFF' : '#334155' }}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              3. Ghi chú / Lý do dời lịch:
            </Text>
            <TextInput
              value={rescheduleNote}
              onChangeText={setRescheduleNote}
              placeholder="VD: Khách xin dời sang sáng mai..."
              style={{
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 12,
                color: '#0F172A',
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                disabled={isSubmittingReschedule}
                onPress={() => setRescheduleTarget(null)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isSubmittingReschedule}
                onPress={handleConfirmReschedule}
                style={{
                  flex: 2,
                  paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: '#1D4ED8',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSubmittingReschedule ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    Xác nhận dời lịch
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header xanh dương chuẩn thương hiệu
  blueHeader: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    position: 'relative',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubFacility: {
    fontSize: 11,
    color: '#BFDBFE',
    marginTop: 1,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // Thanh điều hướng tuần
  navBarCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  weekNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayPillBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 1,
  },
  arrowBtn: {
    padding: 3,
  },
  monthRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekDaysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 4,
  },
  weekDaysPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.2,
  },

  // Bộ lọc loại đơn [Tất cả] [Nhận kho] [Trả kho]
  filterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
  },
  filterPillActiveCheckin: {
    backgroundColor: '#1D4ED8',
  },
  filterPillActiveCheckout: {
    backgroundColor: '#EA580C',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextActiveCheckin: {
    color: '#FFFFFF',
  },
  filterPillTextActiveCheckout: {
    color: '#FFFFFF',
  },
  dotCheckin: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  dotCheckout: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },

  // Thanh tìm kiếm
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    minHeight: 42,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 4,
    height: '100%',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  // Danh sách lịch theo ngày (Daily timeline)
  calendarScrollView: {
    flex: 1,
  },
  calendarContent: {
    paddingTop: 2,
  },
  // ─── ĐƯỜNG NGĂN CÁCH NGÀY: "THỨ 6 · 06/11 ─────────────" ───
  daySection: {
    paddingBottom: 4,
  },
  dayDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dayDividerLabel: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayDividerLabelToday: {
    color: '#1D4ED8',
  },
  dayDividerLine: {
    flex: 1,
    minWidth: 12,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dayDividerLineToday: {
    backgroundColor: '#BFDBFE',
  },
  todayBadgePill: {
    maxWidth: '100%',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  todayBadgePillText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },

  // Thẻ nhận / trả kho: full chiều rộng hàng
  dayCardsWrap: {
    paddingHorizontal: 10,
  },
  // Trạng thái trống cho cả tuần (không còn dòng "Trống lịch hẹn" cho từng ngày)
  emptyWeekWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyWeekTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyWeekText: {
    marginTop: 4,
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
  },

  // ─── STYLES CARD NHẬN KHO (NỀN TRẮNG, VIỀN XANH) ───
  wCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingTop: 8,
    paddingBottom: 7,
    paddingLeft: 9,
    paddingRight: 10,
    marginBottom: 6,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // ─── STYLES CARD TRẢ KHO (MÀU CARD KHÁC: NỀN CAM NHẠT, VIỀN CAM HỔ PHÁCH) ───
  wCardCheckout: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  wAccent: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 9,
    alignSelf: 'stretch',
    marginVertical: 1,
  },
  wAccentCheckin: {
    backgroundColor: '#2563EB',
  },
  wAccentCheckout: {
    backgroundColor: '#EA580C',
  },
  wBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  wRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overdueDaysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  overdueDaysPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  orderTypeTagCheckin: {
    backgroundColor: '#EFF6FF',
  },
  orderTypeTagCheckout: {
    backgroundColor: '#FFEDD5',
  },
  orderTypeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  orderTypeTextCheckin: {
    color: '#1D4ED8',
  },
  orderTypeTextCheckout: {
    color: '#C2410C',
  },

  wTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wTimeMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  wTimePeriod: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#71717A',
    marginLeft: 2.5,
  },
  // Hàng 2: Tên khách hàng riêng 1 dòng full-width
  wCustomerRow: {
    marginTop: 3,
    marginBottom: 2,
  },
  wCustomerNameFull: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },

  // Hàng 3: Ô kho & Số điện thoại
  wRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  wTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flex: 1,
    marginRight: 6,
  },
  wTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: -0.2,
  },
  wTitleSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
  },
  wBigPhone: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },

  // Hàng 4: Hàng footer chứa ghi chú & cụm nút hành động / trạng thái
  wFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 26,
  },
  wFooterLeft: {
    flex: 1,
    marginRight: 8,
  },
  wFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Ghi chú nhanh
  wNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  wNoteBoxCheckout: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  wNoteText: {
    fontSize: 9.5,
    color: '#92400E',
    flex: 1,
  },

  // Cụm hành động / Trạng thái
  completedActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedBadgePillCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  completedBadgeTextCheckout: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2410C',
  },
  editActionBtnCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editActionTextCheckout: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004ac6',
  },
  wActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  wActionButtonCheckin: {
    backgroundColor: '#2563EB',
  },
  wActionButtonCheckout: {
    backgroundColor: '#EA580C',
  },
  wActionButtonInProgress: {
    backgroundColor: '#7C3AED',
  },
  wActionButtonDone: {
    backgroundColor: '#DCFCE7',
  },
  wActionButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  wActionTextDisabled: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  wActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  wActionTextDone: {
    color: '#15803D',
  },
});
