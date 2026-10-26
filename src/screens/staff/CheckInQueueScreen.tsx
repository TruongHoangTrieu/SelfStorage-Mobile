import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'slots' | 'kanban'>('slots');

  // Thống kê nhanh
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed').length,
      arrived: appointments.filter((a) => a.status === 'arrived').length,
      in_progress: appointments.filter((a) => a.status === 'in_progress').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled' || a.status === 'expired').length,
    };
  }, [appointments]);

  // Bộ lọc tìm kiếm
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        app.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone.includes(searchQuery) ||
        app.assignedUnit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        selectedStatus === 'all'
          ? true
          : selectedStatus === 'cancelled'
          ? app.status === 'cancelled' || app.status === 'expired'
          : selectedStatus === 'pending'
          ? app.status === 'pending' || app.status === 'confirmed'
          : app.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [appointments, searchQuery, selectedStatus]);

  // Nhóm theo khung giờ
  const groupedBySlot = useMemo(() => {
    const groups: Record<string, CheckInAppointment[]> = {};
    filteredAppointments.forEach((app) => {
      const slot = app.slotTime || 'Khung giờ khác';
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(app);
    });
    return groups;
  }, [filteredAppointments]);

  // Helper render Badge (Tối giản, chuyên nghiệp, không dùng emoji thô)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.badgeText, { color: '#B45309' }]}>Chờ xử lý</Text>
          </View>
        );
      case 'confirmed':
        return (
          <View style={[styles.badge, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#0284C7' }]} />
            <Text style={[styles.badgeText, { color: '#0369A1' }]}>Đã xác nhận</Text>
          </View>
        );
      case 'arrived':
        return (
          <View style={[styles.badge, { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#2563EB' }]} />
            <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>Đã đến quầy</Text>
          </View>
        );
      case 'in_progress':
        return (
          <View style={[styles.badge, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#9333EA' }]} />
            <Text style={[styles.badgeText, { color: '#7E22CE' }]}>Đang xử lý</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#16A34A' }]} />
            <Text style={[styles.badgeText, { color: '#15803D' }]}>Đã bàn giao</Text>
          </View>
        );
      case 'cancelled':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#DC2626' }]} />
            <Text style={[styles.badgeText, { color: '#DC2626' }]}>Đã hủy</Text>
          </View>
        );
      case 'expired':
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#64748B' }]} />
            <Text style={[styles.badgeText, { color: '#64748B' }]}>Hết hạn</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.badgeText, { color: '#475569' }]}>{status}</Text>
          </View>
        );
    }
  };

  // Helper render card theo phong cách Kanban chuẩn mực (nhỏ gọn, thanh lịch, chống tràn chữ 100%)
  const renderAppointmentCard = (app: CheckInAppointment) => {
    return (
      <View key={app.id} style={styles.appointmentCard}>
        {/* Hàng 1: Khung giờ bên trái + Ô kho & Badge trạng thái bên phải */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.slotBadge}>
            <MaterialIcons name="schedule" size={12} color="#1D4ED8" />
            <Text style={styles.slotBadgeText}>{app.slotTime}</Text>
          </View>
          <View style={styles.unitRightGroup}>
            <Text style={styles.unitNumberText}>#{app.assignedUnit}</Text>
            {renderStatusBadge(app.status)}
          </View>
        </View>

        {/* Hàng 2: Tên khách hàng & Số điện thoại */}
        <View style={styles.cardCustomerSection}>
          <Text style={styles.customerName} numberOfLines={1}>
            {app.customerName}
          </Text>
          <View style={styles.customerPhoneRow}>
            <MaterialIcons name="phone" size={12} color="#64748B" />
            <Text style={styles.customerPhoneText}>{app.phone}</Text>
          </View>
        </View>

        {/* Hàng 3: Hộp thông tin loại kho & thanh toán (chuẩn Kanban FE) */}
        <View style={styles.unitInfoBox}>
          <Text style={styles.unitTypeBoxText} numberOfLines={1}>
            {app.unitType || 'Kho lưu trữ'}
          </Text>
          <View style={styles.paymentStatusGroup}>
            <Text
              style={[
                styles.paymentStatusText,
                { color: app.depositStatus === 'paid' ? '#15803D' : '#D97706' },
              ]}
            >
              {app.depositStatus === 'paid' ? 'Đã cọc' : 'Chưa cọc'}
            </Text>
            <Text style={styles.paymentDot}>•</Text>
            <Text
              style={[
                styles.paymentStatusText,
                { color: app.rentalStatus === 'paid' ? '#15803D' : '#D97706' },
              ]}
            >
              {app.rentalStatus === 'paid' ? 'Đã thu thuê' : 'Chưa thu thuê'}
            </Text>
          </View>
        </View>

        {/* Ghi chú nhanh (nếu có) */}
        {app.specialNotes ? (
          <View style={styles.noteBox}>
            <MaterialIcons name="notes" size={12} color="#D97706" />
            <Text style={styles.noteText} numberOfLines={1}>
              {app.specialNotes}
            </Text>
          </View>
        ) : null}

        {/* Hàng 4: Nút hành động */}
        <View style={styles.cardActionRow}>
          {app.status === 'completed' ? (
            <View style={styles.completedTag}>
              <MaterialIcons name="check" size={13} color="#15803D" />
              <Text style={styles.completedTagText}>Đã bàn giao</Text>
            </View>
          ) : app.status === 'cancelled' ? (
            <View style={styles.cancelledTag}>
              <Text style={styles.cancelledTagText}>Đã hủy</Text>
            </View>
          ) : app.status === 'expired' ? (
            <View style={styles.expiredTag}>
              <Text style={styles.expiredTagText}>Quá hạn</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.startHandoverBtn,
                app.status === 'in_progress' && styles.startHandoverBtnInProgress,
              ]}
              onPress={() => onStartHandover(app)}
              activeOpacity={0.8}
            >
              <Text style={styles.startHandoverText}>
                {app.status === 'in_progress' ? 'Tiếp tục bàn giao →' : 'Bắt đầu nhận kho →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header (Gọn gàng, loại bỏ các thanh phụ cồng kềnh) ─── */}
      <View style={styles.topBar}>
        <View style={styles.topBarMainRow}>
          <TouchableOpacity
            style={styles.sidebarToggleBtn}
            onPress={onOpenSidebar}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarFacility} numberOfLines={1}>
              {facilityName}
            </Text>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              Hàng đợi nhận kho
            </Text>
          </View>

          {/* Nút chuyển đổi giao diện Khung Giờ / Kanban ngay trên TopBar */}
          <TouchableOpacity
            style={styles.viewModeTopBtn}
            onPress={() => setViewMode(viewMode === 'slots' ? 'kanban' : 'slots')}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={viewMode === 'slots' ? 'view-kanban' : 'schedule'}
              size={18}
              color="#1D4ED8"
            />
            <Text style={styles.viewModeTopText}>
              {viewMode === 'slots' ? 'Kanban' : 'Khung giờ'}
            </Text>
          </TouchableOpacity>

          {onOpenNotifications && (
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={onOpenNotifications}
              activeOpacity={0.7}
            >
              <MaterialIcons name="notifications-none" size={20} color="#0F172A" />
              {unreadNotifCount > 0 ? (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Thanh Tìm Kiếm Tối Giản */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên khách, SĐT, số ô kho..."
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

      {/* Thống kê / Bộ lọc trạng thái tinh gọn */}
      <View style={styles.filterBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statContainer}>
          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'all' && styles.statPillActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.statLabel, selectedStatus === 'all' && styles.statLabelActive]}>
              Tất cả ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'pending' && styles.statPillActive]}
            onPress={() => setSelectedStatus('pending')}
          >
            <Text style={[styles.statLabel, selectedStatus === 'pending' && styles.statLabelActive]}>
              Chờ ({stats.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'arrived' && styles.statPillActive]}
            onPress={() => setSelectedStatus('arrived')}
          >
            <Text style={[styles.statLabel, selectedStatus === 'arrived' && styles.statLabelActive]}>
              Đã đến ({stats.arrived})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'in_progress' && styles.statPillActive]}
            onPress={() => setSelectedStatus('in_progress')}
          >
            <Text style={[styles.statLabel, selectedStatus === 'in_progress' && styles.statLabelActive]}>
              Đang xử lý ({stats.in_progress})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'completed' && styles.statPillActive]}
            onPress={() => setSelectedStatus('completed')}
          >
            <Text style={[styles.statLabel, selectedStatus === 'completed' && styles.statLabelActive]}>
              Hoàn tất ({stats.completed})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Danh Sách Hàng Đợi */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="inbox" size={40} color="#CBD5E1" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyTitle}>Không có đơn hẹn</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Thử tìm với từ khóa khác' : 'Hôm nay chưa có đơn hẹn nhận kho mới.'}
            </Text>
          </View>
        ) : viewMode === 'slots' ? (
          // CHẾ ĐỘ XEM THEO KHUNG GIỜ
          Object.entries(groupedBySlot).map(([slot, items]) => (
            <View key={slot} style={styles.slotGroup}>
              <View style={styles.slotHeader}>
                <View style={styles.slotTimeBadge}>
                  <MaterialIcons name="schedule" size={12} color="#64748B" />
                  <Text style={styles.slotTimeText}>{slot}</Text>
                </View>
                <Text style={styles.slotCountText}>{items.length} khách</Text>
              </View>

              {items.map((app) => renderAppointmentCard(app))}
            </View>
          ))
        ) : (
          // CHẾ ĐỘ KANBAN THEO CỘT
          <View style={styles.kanbanContainer}>
            {['pending', 'arrived', 'in_progress', 'completed'].map((colStatus) => {
              const colItems = filteredAppointments.filter((a) => {
                if (colStatus === 'pending') return a.status === 'pending' || a.status === 'confirmed';
                return a.status === colStatus;
              });
              const colTitle =
                colStatus === 'pending' ? 'Chờ xử lý' :
                colStatus === 'arrived' ? 'Đã đến quầy' :
                colStatus === 'in_progress' ? 'Đang xử lý' : 'Đã bàn giao';

              return (
                <View key={colStatus} style={styles.kanbanCol}>
                  <View style={styles.kanbanColHeader}>
                    <Text style={styles.kanbanColTitle}>{colTitle}</Text>
                    <View style={styles.kanbanColCount}>
                      <Text style={styles.kanbanColCountText}>{colItems.length}</Text>
                    </View>
                  </View>

                  {colItems.length === 0 ? (
                    <Text style={styles.kanbanColEmpty}>Không có đơn nào</Text>
                  ) : (
                    colItems.map((app) => renderAppointmentCard(app))
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  topBarFacility: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topBarTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  viewModeTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewModeTopText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
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
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  statContainer: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1D4ED8',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statLabelActive: {
    color: '#FFFFFF',
  },
  listScroll: {
    flex: 1,
  },
  listPadding: {
    padding: 14,
    paddingBottom: 40,
  },
  slotGroup: {
    marginBottom: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  slotTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotTimeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  slotCountText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  slotBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  unitRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitNumberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardCustomerSection: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerPhoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  unitInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginBottom: 8,
  },
  unitTypeBoxText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  paymentStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentDot: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  startHandoverBtn: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  startHandoverBtnInProgress: {
    backgroundColor: '#7E22CE',
  },
  startHandoverText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTagText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelledTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelledTagText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  expiredTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredTagText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  kanbanContainer: {
    gap: 12,
  },
  kanbanCol: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kanbanColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  kanbanColTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  kanbanColCount: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  kanbanColCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  kanbanColEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyDesc: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
});
