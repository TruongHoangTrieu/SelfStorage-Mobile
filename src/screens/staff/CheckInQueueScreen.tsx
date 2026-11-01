import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckInAppointment, StaffReturnOrder } from '../../types/handover';
import { INITIAL_RETURN_ORDERS } from '../../data/mockStaffData';
import { MaterialIcons } from '@expo/vector-icons';

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

export default function CheckInQueueScreen({
  appointments,
  onStartHandover,
  returnOrders = INITIAL_RETURN_ORDERS,
  onOpenReturnOrder,
  onRefresh,
  isRefreshing = false,
  facilityName = 'Trụ sở chính Thủ Đức',
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

    // 1. Chuyển đổi các đơn Nhận kho
    const checkinList: UnifiedScheduleItem[] = appointments.map((app) => ({
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
    const checkoutList: UnifiedScheduleItem[] = returnOrders.map((ord, idx) => {
      // Gán ngày trả kho: nếu có endDate thì dùng, hoặc phân bổ vào hôm nay / ngày mai của tuần
      let returnDateStr = ord.returnType === 'today' ? todayFormatted : normalizeAppointmentDate(ord.endDate);
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
        slotTime: idx % 2 === 0 ? '02:00 PM' : '10:30 AM',
        status: ord.status === 'TERMINATED' || ord.returnType === 'completed' ? 'completed' : 'pending',
        specialNotes: ord.notes || 'Hẹn trả ô kho & kiểm tra tài sản',
        rawReturnOrder: ord,
      };
    });

    return [...checkinList, ...checkoutList];
  }, [appointments, returnOrders]);

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

    // Tách giờ '1:00' và 'PM'
    const timeParts = (item.slotTime || (isCheckout ? '02:00 PM' : '09:00 AM')).trim().split(/\s+/);
    const timeMain = timeParts[0] || '1:00';
    const timePeriod = timeParts[1] || 'PM';

    // Nhãn kích thước kho
    const unitSizeLabel = item.unitSize
      ? item.unitSize.split(' ')[0]
      : (item.unitType ? item.unitType.replace('Kho ', '') : 'Tiêu chuẩn');

    const handleCardPress = () => {
      if (isCheckout) {
        if (onOpenReturnOrder && item.rawReturnOrder) {
          onOpenReturnOrder(item.rawReturnOrder);
        }
      } else {
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
        {/* Thanh accent đứng bên trái: Nhận kho = Xanh dương / Vàng hổ phách; Trả kho = Cam đậm */}
        <View
          style={[
            styles.wAccent,
            isCheckout ? styles.wAccentCheckout : styles.wAccentCheckin,
            item.status === 'completed' && { backgroundColor: '#10B981' },
            item.status === 'in_progress' && { backgroundColor: '#8B5CF6' },
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
            </View>

            <View style={styles.wTimeRow}>
              <Text style={[styles.wTimeMain, isCheckout && { color: '#C2410C' }]}>
                {timeMain}
              </Text>
              <Text style={styles.wTimePeriod}>{timePeriod}</Text>
            </View>
          </View>

          {/* Hàng 2: TÊN KHÁCH (HIỂN THỊ ĐẦY ĐỦ TÊN KHÁCH) <───────────────> NÚT HÀNH ĐỘNG */}
          <View style={styles.wRow2}>
            <Text style={styles.wCustomerName}>
              {item.customerName}
            </Text>

            <View
              style={[
                styles.wActionButton,
                isCheckout ? styles.wActionButtonCheckout : styles.wActionButtonCheckin,
                item.status === 'completed'
                  ? styles.wActionButtonDone
                  : item.status === 'in_progress'
                  ? styles.wActionButtonInProgress
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.wActionText,
                  item.status === 'completed' && styles.wActionTextDone,
                ]}
              >
                {item.status === 'completed'
                  ? (isCheckout ? 'Đã trả kho' : 'Đã bàn giao')
                  : item.status === 'in_progress'
                  ? 'Tiếp tục'
                  : isCheckout
                  ? 'Nghiệm thu'
                  : 'Nhận kho'}
              </Text>
            </View>
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

          {/* Ghi chú nhanh (nếu có) */}
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
      </TouchableOpacity>
    );
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

          <View style={styles.monthCenterCol}>
            <Text style={styles.monthTitle}>
              Tháng {selectedMonday.getMonth() + 1} {selectedMonday.getFullYear()}
            </Text>
            <Text style={styles.dateRangeSubtitle}>
              {formatDayMonth(selectedMonday)} - {formatDayMonth(sunday)}
            </Text>
          </View>

          {/* Khoảng trống cân đối */}
          <View style={styles.rightNavPlaceholder} />
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
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#1D4ED8"
              colors={['#1D4ED8']}
            />
          ) : undefined
        }
      >
        {weekDays.map((dayDate) => {
          const dateKey = formatDateKey(dayDate);
          const dayItems = itemsByDay.get(dateKey) || [];
          const isToday = isTodayDate(dayDate);
          const dayIndex = dayDate.getDay();
          const dayNameLabel = DAY_NAMES[dayIndex];
          const dayNumberStr = String(dayDate.getDate());

          return (
            <View
              key={dateKey}
              style={[
                styles.dayTimelineRow,
                isToday && styles.dayTimelineRowToday,
              ]}
            >
              {/* Cột trái: Thứ & Số ngày & Badge HÔM NAY */}
              <View style={styles.dayLeftCol}>
                <Text
                  style={[
                    styles.dayOfWeekText,
                    isToday && styles.dayOfWeekTextToday,
                  ]}
                >
                  {dayNameLabel}
                </Text>

                {isToday ? (
                  <View style={styles.todayBlueCircle}>
                    <Text style={styles.todayCircleText}>{dayNumberStr}</Text>
                  </View>
                ) : (
                  <Text style={styles.normalDayNumber}>{dayNumberStr}</Text>
                )}

                {isToday ? (
                  <View style={styles.todayBadgePill}>
                    <Text style={styles.todayBadgePillText}>HÔM NAY</Text>
                  </View>
                ) : null}
              </View>

              {/* Cột phải: Danh sách đơn nhận & trả kho với màu sắc card riêng biệt */}
              <View style={styles.dayRightCol}>
                {dayItems.length === 0 ? (
                  <View style={styles.emptyDayWrap}>
                    <Text style={styles.emptyDayText}>Trống lịch hẹn</Text>
                  </View>
                ) : (
                  dayItems.map((item) => renderScheduleCard(item))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  monthCenterCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateRangeSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  rightNavPlaceholder: {
    width: 90,
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
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },

  // Danh sách lịch theo ngày (Daily timeline)
  calendarScrollView: {
    flex: 1,
  },
  calendarContent: {
    paddingTop: 2,
  },
  dayTimelineRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  dayTimelineRowToday: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3.5,
    borderLeftColor: '#1D4ED8',
  },
  dayLeftCol: {
    width: 54,
    alignItems: 'center',
    paddingTop: 2,
  },
  dayOfWeekText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  dayOfWeekTextToday: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  normalDayNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  todayBlueCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayBadgePill: {
    marginTop: 3,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  todayBadgePillText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },

  // Cột phải: chứa các card
  dayRightCol: {
    flex: 1,
    paddingLeft: 6,
  },
  emptyDayWrap: {
    paddingVertical: 12,
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontStyle: 'italic',
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
  wRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    minHeight: 24,
  },
  wCustomerName: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#18181B',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },

  // Nút hành động
  wActionButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
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
  wActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  wActionTextDone: {
    color: '#15803D',
  },

  wRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
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
    marginTop: 4,
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
});
