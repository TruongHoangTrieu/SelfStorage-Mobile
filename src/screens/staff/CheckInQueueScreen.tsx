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
import { CheckInAppointment } from '../../types/handover';
import { MaterialIcons } from '@expo/vector-icons';

interface CheckInQueueScreenProps {
  appointments: CheckInAppointment[];
  onStartHandover: (appointment: CheckInAppointment) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  facilityName?: string;
  onOpenSidebar: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
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

// Format chuỗi ngày hôm nay đầy đủ: "Thứ X, DD/MM/YYYY"
function getTodayFullText(): string {
  const now = new Date();
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = dayNames[now.getDay()];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
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
  onRefresh,
  isRefreshing = false,
  facilityName = 'Trụ sở chính Thủ Đức',
  onOpenSidebar,
  onOpenNotifications,
  unreadNotifCount = 0,
}: CheckInQueueScreenProps) {
  const insets = useSafeAreaInsets();

  // Tuần đang chọn (mặc định là thứ Hai của tuần hiện tại)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'calendar' | 'slots'>('calendar');

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

  // Lọc theo tìm kiếm
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        app.customerName.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        app.assignedUnit.toLowerCase().includes(query) ||
        app.id.toLowerCase().includes(query)
      );
    });
  }, [appointments, searchQuery]);

  // Nhóm lịch hẹn theo từng ngày trong tuần
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, CheckInAppointment[]>();

    weekDays.forEach((d) => {
      map.set(formatDateKey(d), []);
    });

    filteredAppointments.forEach((app) => {
      const dateKey = normalizeAppointmentDate(app.startDate);
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(app);
      }
    });

    return map;
  }, [weekDays, filteredAppointments]);

  // ─── GIỮ NGUYÊN 100% DẠNG CARD TRƯỚC KHI THAY ĐỔI (WIDGET CARD) ───
  const renderAppointmentCard = (app: CheckInAppointment) => {
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const dayLabel = app.startDate === todayStr ? 'TODAY' : (app.startDate ? `NGÀY ${app.startDate}` : 'TODAY');

    // Tách giờ '1:00' và 'PM' (hoặc '09:00' và 'SA')
    const timeParts = (app.slotTime || '1:00 PM').trim().split(/\s+/);
    const timeMain = timeParts[0] || '1:00';
    const timePeriod = timeParts[1] || 'PM';

    // Cỡ kích thước kho
    const unitSizeLabel = app.unitSize
      ? app.unitSize.split(' ')[0]
      : (app.unitType ? app.unitType.replace('Kho ', '') : 'Tiêu chuẩn');

    return (
      <TouchableOpacity
        key={app.id}
        style={styles.wCard}
        onPress={() => onStartHandover(app)}
        activeOpacity={0.85}
      >
        {/* Thanh accent đứng bên trái: vạch màu ấm/vàng hổ phách như mẫu gốc */}
        <View
          style={[
            styles.wAccent,
            app.status === 'completed' && { backgroundColor: '#10B981' },
            app.status === 'in_progress' && { backgroundColor: '#8B5CF6' },
          ]}
        />

        <View style={styles.wBody}>
          {/* Hàng 1: TODAY (Trái) <───────────────────────────> 1:00 PM (Phải) */}
          <View style={styles.wRow1}>
            <Text style={styles.wDayLabel}>{dayLabel}</Text>
            <View style={styles.wTimeRow}>
              <Text style={styles.wTimeMain}>{timeMain}</Text>
              <Text style={styles.wTimePeriod}>{timePeriod}</Text>
            </View>
          </View>

          {/* Hàng 2: TÊN KHÁCH (LÊN DÒNG TRÊN) <───────────────> NÚT NHẬN KHO (RÚT GỌN) */}
          <View style={styles.wRow2}>
            <Text style={styles.wCustomerName} numberOfLines={1}>
              {app.customerName}
            </Text>

            <View
              style={[
                styles.wActionButton,
                app.status === 'completed'
                  ? styles.wActionButtonDone
                  : app.status === 'in_progress'
                  ? styles.wActionButtonInProgress
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.wActionText,
                  app.status === 'completed' && styles.wActionTextDone,
                ]}
              >
                {app.status === 'completed'
                  ? 'Đã bàn giao'
                  : app.status === 'in_progress'
                  ? 'Tiếp tục'
                  : 'Nhận kho'}
              </Text>
            </View>
          </View>

          {/* Hàng 3: TÊN KHO (XUỐNG DƯỚI) <─────────────────────> SĐT TO RÕ (KHÔNG ICON) */}
          <View style={styles.wRow3}>
            <View style={styles.wTitleRow}>
              <Text style={styles.wTitle} numberOfLines={1}>
                {app.assignedUnit || 'A-101'}
              </Text>
              <Text style={styles.wTitleSub} numberOfLines={1}>
                {unitSizeLabel}
              </Text>
            </View>

            <Text style={styles.wBigPhone}>
              {app.phone}
            </Text>
          </View>

          {/* Ghi chú nhanh (nếu có) */}
          {app.specialNotes ? (
            <View style={styles.wNoteBox}>
              <MaterialIcons name="notes" size={11} color="#D97706" />
              <Text style={styles.wNoteText} numberOfLines={1}>
                {app.specialNotes}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header (MÀU XANH DƯƠNG CHUẨN THƯƠNG HIỆU, SAFE AREA CHỐNG TRÀN) ─── */}
      <View
        style={[
          styles.blueHeader,
          {
            paddingTop: insets.top > 0 ? insets.top + 6 : 14,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onOpenSidebar}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitleText}>Lịch nhận kho theo ngày</Text>
            <Text style={styles.headerSubFacility} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setViewLayout(viewLayout === 'calendar' ? 'slots' : 'calendar')}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={viewLayout === 'calendar' ? 'view-agenda' : 'calendar-today'}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>

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

      {/* ─── Thanh điều hướng Tuần & UI NHẬN BIẾT HÔM NAY ─── */}
      <View style={styles.navBarCard}>
        {/* Banner hiển thị hôm nay là ngày nào */}
        <View style={styles.todayBannerRow}>
          <View style={styles.todayBannerLeft}>
            <View style={styles.todayIndicatorDot} />
            <MaterialIcons name="event" size={15} color="#1D4ED8" />
            <Text style={styles.todayBannerText}>
              Hôm nay: <Text style={styles.todayBannerBold}>{getTodayFullText()}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.todayJumpBtn}
            onPress={handleGoToday}
            activeOpacity={0.8}
          >
            <MaterialIcons name="today" size={14} color="#1D4ED8" />
            <Text style={styles.todayJumpText}>Về hôm nay</Text>
          </TouchableOpacity>
        </View>

        {/* Thanh tuần: Mũi tên < > & Tiêu đề Tháng (BỎ FILTER TẤT CẢ/CHỜ NHẬN) */}
        <View style={styles.weekNavInner}>
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handlePrevWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={24} color="#1D4ED8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handleNextWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-right" size={24} color="#1D4ED8" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthCenterCol}>
            <Text style={styles.monthTitle}>
              Tháng {selectedMonday.getMonth() + 1} {selectedMonday.getFullYear()}
            </Text>
            <Text style={styles.dateRangeSubtitle}>
              Tuần từ {formatDayMonth(selectedMonday)} đến {formatDayMonth(sunday)}
            </Text>
          </View>

          {/* Khoảng trống cân đối sau khi bỏ filter */}
          <View style={{ width: 68 }} />
        </View>

        {/* Thanh tìm kiếm nhanh */}
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

      {/* ─── DẠNG 1: LỊCH THEO NGÀY (GIỮ NGUYÊN DẠNG CARD CŨ) ─── */}
      {viewLayout === 'calendar' ? (
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
              onRefresh={onRefresh}
              tintColor="#1D4ED8"
              colors={['#1D4ED8']}
            />
          }
        >
          {weekDays.map((dayDate) => {
            const dateKey = formatDateKey(dayDate);
            const dayAppointments = appointmentsByDay.get(dateKey) || [];
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

                {/* Cột phải: Danh sách đơn hẹn theo dạng CARD CŨ */}
                <View style={styles.dayRightCol}>
                  {dayAppointments.length === 0 ? (
                    <View style={styles.emptyDayWrap}>
                      <Text style={styles.emptyDayText}>Trống lịch hẹn</Text>
                    </View>
                  ) : (
                    dayAppointments.map((app) => renderAppointmentCard(app))
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* ─── DẠNG 2: XEM TOÀN BỘ DANH SÁCH (FALLBACK) ─── */
        <ScrollView
          style={styles.calendarScrollView}
          contentContainerStyle={[
            styles.calendarContent,
            { padding: 14, paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#1D4ED8"
              colors={['#1D4ED8']}
            />
          }
        >
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyListWrap}>
              <MaterialIcons name="event-busy" size={40} color="#94A3B8" />
              <Text style={styles.emptyListTitle}>Không có lịch hẹn nhận kho</Text>
              <Text style={styles.emptyListSub}>
                Chưa có đơn bàn giao nào khớp với bộ lọc tìm kiếm.
              </Text>
            </View>
          ) : (
            filteredAppointments.map((app) => renderAppointmentCard(app))
          )}
        </ScrollView>
      )}
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

  // Thanh điều hướng tuần & Banner Hôm nay
  navBarCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  todayBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  todayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4ED8',
  },
  todayBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  todayBannerBold: {
    fontWeight: '800',
    color: '#1D4ED8',
  },
  todayJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  todayJumpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  weekNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  arrowBtn: {
    padding: 4,
  },
  monthCenterCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateRangeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Thanh tìm kiếm
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
  },

  // Danh sách lịch theo ngày (Daily timeline)
  calendarScrollView: {
    flex: 1,
  },
  calendarContent: {
    paddingTop: 4,
  },
  dayTimelineRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    width: 60,
    alignItems: 'center',
    paddingTop: 2,
  },
  dayOfWeekText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayOfWeekTextToday: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  normalDayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  todayBlueCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayBadgePill: {
    marginTop: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgePillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },

  // Cột phải: chứa các card
  dayRightCol: {
    flex: 1,
    paddingLeft: 8,
  },
  emptyDayWrap: {
    paddingVertical: 14,
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // ─── STYLES CHUẨN CỦA WIDGET CARD GỐC (GIỮ NGUYÊN 100%) ───
  wCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingTop: 12,
    paddingBottom: 11,
    paddingLeft: 12,
    paddingRight: 14,
    marginBottom: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wAccent: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#E8A766',
    marginRight: 11,
    alignSelf: 'stretch',
    marginVertical: 1,
  },
  wBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  wRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  wDayLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  wTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wTimeMain: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: -0.5,
  },
  wTimePeriod: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    marginLeft: 3,
  },
  wRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  wCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181B',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  wActionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 8,
  },
  wActionButtonInProgress: {
    backgroundColor: '#7C3AED',
  },
  wActionButtonDone: {
    backgroundColor: '#DCFCE7',
  },
  wActionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  wActionTextDone: {
    color: '#15803D',
  },
  wRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  wTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  wTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: -0.2,
  },
  wTitleSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  wBigPhone: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  wNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 6,
  },
  wNoteText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
  },

  emptyListWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyListSub: {
    fontSize: 12,
    color: '#64748B',
  },
});
