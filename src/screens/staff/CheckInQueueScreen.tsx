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

// 7 ngày trong tuần theo tiếng Việt
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

// Lấy 7 ngày trong tuần bắt đầu từ thứ Hai
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

// Kiểm tra 2 ngày có cùng ngày/tháng/năm
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

// Chuẩn hóa chuỗi ngày của lịch hẹn về DD/MM/YYYY
function normalizeAppointmentDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // Nếu là DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  // Nếu là ISO YYYY-MM-DD
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
  const today = useMemo(() => new Date(), []);

  // Tuần đang chọn (khởi tạo là thứ Hai của tuần hiện tại)
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending'>('all');
  const [viewLayout, setViewLayout] = useState<'calendar' | 'slots'>('calendar');

  // Tính 7 ngày trong tuần đang xem
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

  // Lọc danh sách lịch hẹn theo tìm kiếm và chế độ lọc
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        app.customerName.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        app.assignedUnit.toLowerCase().includes(query) ||
        app.id.toLowerCase().includes(query);

      const matchFilter =
        filterMode === 'all'
          ? true
          : app.status === 'pending' || app.status === 'arrived' || app.status === 'in_progress';

      return matchSearch && matchFilter;
    });
  }, [appointments, searchQuery, filterMode]);

  // Nhóm lịch hẹn theo từng ngày trong tuần đang chọn
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

  // Định dạng màu sắc thẻ theo trạng thái (như ảnh mẫu: xanh dương nhẹ, vàng hổ phách, xanh lá)
  const getCardStyle = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          bg: '#FEF3C7',
          border: '#FDE68A',
          badgeText: 'Đang bàn giao',
          badgeColor: '#B45309',
        };
      case 'completed':
        return {
          bg: '#F0FDF4',
          border: '#BBF7D0',
          badgeText: 'Đã nhận kho',
          badgeColor: '#15803D',
        };
      case 'arrived':
        return {
          bg: '#E0F2FE',
          border: '#BAE6FD',
          badgeText: 'Đã đến cơ sở',
          badgeColor: '#0369A1',
        };
      case 'pending':
      default:
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          badgeText: 'Chờ nhận',
          badgeColor: '#1D4ED8',
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header (Màu xanh lá đậm chuẩn nhận diện như ảnh mẫu) ─── */}
      <View
        style={[
          styles.greenHeader,
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
            <Text style={styles.headerTitleText}>Lịch nhận kho</Text>
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

      {/* ─── Thanh điều hướng Tuần & Tháng (Giống 100% mẫu người dùng gửi) ─── */}
      <View style={styles.navBarCard}>
        <View style={styles.navBarInner}>
          {/* Nút Hôm nay */}
          <TouchableOpacity
            style={styles.todayButton}
            onPress={handleGoToday}
            activeOpacity={0.8}
          >
            <Text style={styles.todayButtonText}>Hôm nay</Text>
          </TouchableOpacity>

          {/* Mũi tên tiến / lùi tuần */}
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handlePrevWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={22} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={handleNextWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-right" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Tiêu đề Tháng & Dải ngày của tuần */}
          <View style={styles.monthCenterCol}>
            <Text style={styles.monthTitle}>
              Tháng {selectedMonday.getMonth() + 1} {selectedMonday.getFullYear()}
            </Text>
            <Text style={styles.dateRangeSubtitle}>
              ({formatDayMonth(selectedMonday)} - {formatDayMonth(sunday)})
            </Text>
          </View>

          {/* Nút lọc Tất cả / Chờ nhận */}
          <View style={styles.filterToggleWrap}>
            <TouchableOpacity
              style={[
                styles.filterToggleBtn,
                filterMode === 'all' && styles.filterToggleBtnActive,
              ]}
              onPress={() => setFilterMode('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterToggleText,
                  filterMode === 'all' && styles.filterToggleTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterToggleBtn,
                filterMode === 'pending' && styles.filterToggleBtnActive,
              ]}
              onPress={() => setFilterMode('pending')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterToggleText,
                  filterMode === 'pending' && styles.filterToggleTextActive,
                ]}
              >
                Chờ nhận
              </Text>
            </TouchableOpacity>
          </View>
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

      {/* ─── DẠNG 1: LỊCH THEO NGÀY (CHÍNH - GIỐNG ẢNH MẪU) ─── */}
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
              tintColor="#16A34A"
              colors={['#16A34A']}
            />
          }
        >
          {weekDays.map((dayDate) => {
            const dateKey = formatDateKey(dayDate);
            const dayAppointments = appointmentsByDay.get(dateKey) || [];
            const isTodayDay = isSameDay(dayDate, today);
            const dayIndex = dayDate.getDay();
            const dayNameLabel = DAY_NAMES[dayIndex];
            const dayNumberStr = String(dayDate.getDate());

            return (
              <View key={dateKey} style={styles.dayTimelineRow}>
                {/* Cột trái: Thứ & Số ngày (Hôm nay có vòng tròn xanh lá) */}
                <View style={styles.dayLeftCol}>
                  <Text style={styles.dayOfWeekText}>{dayNameLabel}</Text>
                  {isTodayDay ? (
                    <View style={styles.todayCircle}>
                      <Text style={styles.todayCircleText}>{dayNumberStr}</Text>
                    </View>
                  ) : (
                    <Text style={styles.normalDayNumber}>{dayNumberStr}</Text>
                  )}
                </View>

                {/* Cột phải: Danh sách đơn nhận kho trong ngày hoặc "Trống lịch hẹn" */}
                <View style={styles.dayRightCol}>
                  {dayAppointments.length === 0 ? (
                    <View style={styles.emptyDayWrap}>
                      <Text style={styles.emptyDayText}>Trống lịch hẹn</Text>
                    </View>
                  ) : (
                    dayAppointments.map((app) => {
                      const cardVisual = getCardStyle(app.status);
                      return (
                        <TouchableOpacity
                          key={app.id}
                          style={[
                            styles.appointmentCard,
                            {
                              backgroundColor: cardVisual.bg,
                              borderColor: cardVisual.border,
                            },
                          ]}
                          onPress={() => onStartHandover(app)}
                          activeOpacity={0.85}
                        >
                          {/* Dòng 1: Tiêu đề ô kho + Tên khách + Giờ hẹn */}
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardUnitText} numberOfLines={1}>
                              1x Kho #{app.assignedUnit || 'A-101'} - {app.customerName}
                            </Text>
                            <Text
                              style={[
                                styles.cardStatusTag,
                                { color: cardVisual.badgeColor },
                              ]}
                            >
                              {app.slotTime || '09:00'}
                            </Text>
                          </View>

                          {/* Dòng 2: Kích thước kho & SĐT */}
                          <Text style={styles.cardDetailText} numberOfLines={1}>
                            {app.unitSize || app.unitType} • SĐT: {app.phone}
                          </Text>

                          {/* Dòng 3 (nếu có ghi chú) */}
                          {app.specialNotes ? (
                            <View style={styles.cardNoteRow}>
                              <MaterialIcons name="notes" size={12} color="#D97706" />
                              <Text style={styles.cardNoteText} numberOfLines={1}>
                                {app.specialNotes}
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* ─── DẠNG 2: XEM THEO KHUNG GIỜ (FALLBACK) ─── */
        <ScrollView
          style={styles.calendarScrollView}
          contentContainerStyle={[
            styles.calendarContent,
            { padding: 16, paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 36 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#16A34A"
              colors={['#16A34A']}
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
            filteredAppointments.map((app) => {
              const cardVisual = getCardStyle(app.status);
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[
                    styles.slotModeCard,
                    {
                      backgroundColor: cardVisual.bg,
                      borderColor: cardVisual.border,
                    },
                  ]}
                  onPress={() => onStartHandover(app)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardUnitText} numberOfLines={1}>
                      #{app.assignedUnit} • {app.customerName}
                    </Text>
                    <View style={styles.timeBadgeSlot}>
                      <MaterialIcons name="schedule" size={12} color={cardVisual.badgeColor} />
                      <Text style={[styles.timeBadgeSlotText, { color: cardVisual.badgeColor }]}>
                        {app.slotTime || '09:00'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDetailText}>
                    Ngày bắt đầu: {app.startDate} • {app.unitSize || app.unitType}
                  </Text>
                  <Text style={styles.cardDetailText}>SĐT: {app.phone}</Text>

                  <View style={styles.slotBtnRow}>
                    <Text style={[styles.slotActionBtn, { color: cardVisual.badgeColor }]}>
                      Bắt đầu bàn giao →
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
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

  // Header xanh lá theo mẫu
  greenHeader: {
    backgroundColor: '#16A34A',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubFacility: {
    fontSize: 11,
    color: '#DCFCE7',
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
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  navBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  todayButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateRangeSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  filterToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  filterToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterToggleTextActive: {
    color: '#16A34A',
    fontWeight: '800',
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
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
  },
  dayLeftCol: {
    width: 54,
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
  normalDayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  todayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Cột phải: danh sách đơn hẹn
  dayRightCol: {
    flex: 1,
    paddingLeft: 8,
  },
  emptyDayWrap: {
    paddingVertical: 8,
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  appointmentCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardUnitText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardStatusTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDetailText: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 3,
  },
  cardNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardNoteText: {
    fontSize: 11,
    color: '#B45309',
  },

  // Dạng khung giờ
  slotModeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  timeBadgeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeSlotText: {
    fontSize: 11,
    fontWeight: '800',
  },
  slotBtnRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  slotActionBtn: {
    fontSize: 12,
    fontWeight: '800',
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
