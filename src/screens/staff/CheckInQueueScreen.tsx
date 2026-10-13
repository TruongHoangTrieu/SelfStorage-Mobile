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

interface CheckInQueueScreenProps {
  appointments: CheckInAppointment[];
  onStartHandover: (appointment: CheckInAppointment) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  facilityName?: string;
  onOpenSidebar: () => void;
}

export default function CheckInQueueScreen({
  appointments,
  onStartHandover,
  onRefresh,
  isRefreshing = false,
  facilityName = 'Trụ sở chính Thủ Đức',
  onOpenSidebar,
}: CheckInQueueScreenProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'slots' | 'kanban'>('slots');

  // Thống kê nhanh
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      arrived: appointments.filter((a) => a.status === 'arrived').length,
      in_progress: appointments.filter((a) => a.status === 'in_progress').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
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
        selectedStatus === 'all' || app.status === selectedStatus;

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

  // Helper render Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: '#B45309' }]}>⏳ Chờ xử lý</Text>
          </View>
        );
      case 'arrived':
        return (
          <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>📍 Đã đến quầy</Text>
          </View>
        );
      case 'in_progress':
        return (
          <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.badgeText, { color: '#7E22CE' }]}>⚙️ Đang xử lý</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.badgeText, { color: '#15803D' }]}>✓ Hoàn tất</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: '#475569' }]}>{status}</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.sidebarToggleBtn} onPress={onOpenSidebar}>
          <Text style={styles.sidebarToggleIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarFacility}>📍 {facilityName}</Text>
          <Text style={styles.topBarTitle}>HÀNG ĐỢI NHẬN KHO (HÔM NAY)</Text>
        </View>

        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'slots' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('slots')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'slots' && styles.viewToggleTextActive]}>
              Khung giờ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'kanban' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('kanban')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'kanban' && styles.viewToggleTextActive]}>
              Kanban
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thống kê nhanh Strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statScroll} contentContainerStyle={styles.statContainer}>
        <TouchableOpacity
          style={[styles.statPill, selectedStatus === 'all' && styles.statPillActive]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.statLabel, selectedStatus === 'all' && styles.statLabelActive]}>Tất cả</Text>
          <Text style={[styles.statNumber, selectedStatus === 'all' && styles.statNumberActive]}>{stats.total}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statPill, selectedStatus === 'pending' && styles.statPillActive]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text style={[styles.statLabel, selectedStatus === 'pending' && styles.statLabelActive]}>Chờ xử lý</Text>
          <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.pending}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statPill, selectedStatus === 'arrived' && styles.statPillActive]}
          onPress={() => setSelectedStatus('arrived')}
        >
          <Text style={[styles.statLabel, selectedStatus === 'arrived' && styles.statLabelActive]}>Đã đến</Text>
          <Text style={[styles.statNumber, { color: '#2563EB' }]}>{stats.arrived}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statPill, selectedStatus === 'in_progress' && styles.statPillActive]}
          onPress={() => setSelectedStatus('in_progress')}
        >
          <Text style={[styles.statLabel, selectedStatus === 'in_progress' && styles.statLabelActive]}>Đang xử lý</Text>
          <Text style={[styles.statNumber, { color: '#9333EA' }]}>{stats.in_progress}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statPill, selectedStatus === 'completed' && styles.statPillActive]}
          onPress={() => setSelectedStatus('completed')}
        >
          <Text style={[styles.statLabel, selectedStatus === 'completed' && styles.statLabelActive]}>Hoàn tất</Text>
          <Text style={[styles.statNumber, { color: '#059669' }]}>{stats.completed}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Thanh Tìm Kiếm */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo Tên, SĐT, Mã đơn hoặc Số ô kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Không tìm thấy đơn hẹn phù hợp</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc.' : 'Hôm nay chưa có đơn hẹn nhận kho mới.'}
            </Text>
          </View>
        ) : viewMode === 'slots' ? (
          // CHẾ ĐỘ XEM THEO KHUNG GIỜ
          Object.entries(groupedBySlot).map(([slot, items]) => (
            <View key={slot} style={styles.slotGroup}>
              <View style={styles.slotHeader}>
                <View style={styles.slotTimeBadge}>
                  <Text style={styles.slotTimeText}>⏰ {slot}</Text>
                </View>
                <Text style={styles.slotCountText}>{items.length} khách hẹn</Text>
              </View>

              {items.map((app) => (
                <View key={app.id} style={styles.appointmentCard}>
                  {/* Card Top Row */}
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{app.customerName}</Text>
                      <Text style={styles.customerContact}>📞 {app.phone}</Text>
                    </View>
                    {renderStatusBadge(app.status)}
                  </View>

                  {/* Card Middle: Unit & Slot Info */}
                  <View style={styles.cardInfoBox}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoColLabel}>LOẠI / KÍCH THƯỚC</Text>
                      <Text style={styles.infoColValue} numberOfLines={1}>{app.unitType}</Text>
                      <Text style={styles.infoColSub}>{app.unitSize}</Text>
                    </View>

                    <View style={styles.infoColDivider} />

                    <View style={styles.infoCol}>
                      <Text style={styles.infoColLabel}>Ô KHO GÁN</Text>
                      <Text style={styles.unitCodeValue}>{app.assignedUnit}</Text>
                      <Text style={styles.infoColSub}>{app.preferredFloor}</Text>
                    </View>

                    <View style={styles.infoColDivider} />

                    <View style={styles.infoCol}>
                      <Text style={styles.infoColLabel}>TIỀN CỌC</Text>
                      <Text style={styles.depositValue}>
                        {app.depositStatus === 'paid' ? '✓ Đã cọc' : 'Chưa cọc'}
                      </Text>
                      <Text style={styles.infoColSub}>{app.depositAmount}</Text>
                    </View>
                  </View>

                  {/* Special Notes (nếu có) */}
                  {app.specialNotes ? (
                    <View style={styles.notesRow}>
                      <Text style={styles.notesText}>📝 {app.specialNotes}</Text>
                    </View>
                  ) : null}

                  {/* Action Button: BẮT ĐẦU NHẬN KHO */}
                  <View style={styles.cardActionRow}>
                    <Text style={styles.orderCodeText}>#{app.id.slice(-6).toUpperCase()}</Text>

                    {app.status === 'completed' ? (
                      <View style={styles.completedTag}>
                        <Text style={styles.completedTagText}>✓ Đã Bàn Giao ({app.contractCode || 'HĐ Kích Hoạt'})</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.startHandoverBtn,
                          app.status === 'in_progress' && styles.startHandoverBtnInProgress,
                        ]}
                        onPress={() => onStartHandover(app)}
                      >
                        <Text style={styles.startHandoverText}>
                          {app.status === 'in_progress' ? 'Tiếp Tục Bàn Giao →' : '[ Bắt đầu nhận kho ] →'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          // CHẾ ĐỘ KANBAN THEO CỘT
          <View style={styles.kanbanContainer}>
            {['pending', 'arrived', 'in_progress', 'completed'].map((colStatus) => {
              const colItems = filteredAppointments.filter((a) => a.status === colStatus);
              const colTitle =
                colStatus === 'pending' ? 'Chờ xử lý' :
                colStatus === 'arrived' ? 'Đã đến' :
                colStatus === 'in_progress' ? 'Đang xử lý' : 'Hoàn tất';

              return (
                <View key={colStatus} style={styles.kanbanCol}>
                  <View style={styles.kanbanColHeader}>
                    <Text style={styles.kanbanColTitle}>{colTitle}</Text>
                    <View style={styles.kanbanColCount}>
                      <Text style={styles.kanbanColCountText}>{colItems.length}</Text>
                    </View>
                  </View>

                  {colItems.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={styles.kanbanCard}
                      onPress={() => onStartHandover(app)}
                    >
                      <Text style={styles.kanbanCustomer}>{app.customerName}</Text>
                      <Text style={styles.kanbanUnit}>Ô {app.assignedUnit} • {app.unitSize.split(' ')[0]}</Text>
                      <Text style={styles.kanbanTime}>⏰ {app.slotTime}</Text>
                    </TouchableOpacity>
                  ))}
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
    backgroundColor: '#F1F5F9',
  },
  topBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarToggleIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topBarFacility: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  viewToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  statScroll: {
    backgroundColor: '#FFFFFF',
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  statPillActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statLabelActive: {
    color: '#2563EB',
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  statNumberActive: {
    color: '#2563EB',
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  listScroll: {
    flex: 1,
  },
  listPadding: {
    padding: 14,
    paddingBottom: 40,
  },
  slotGroup: {
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  slotTimeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotTimeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  slotCountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerContact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoColDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  infoColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoColValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  unitCodeValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
  },
  depositValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  infoColSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  notesRow: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  orderCodeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  startHandoverBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  startHandoverBtnInProgress: {
    backgroundColor: '#7E22CE',
  },
  startHandoverText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  completedTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedTagText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  kanbanContainer: {
    gap: 12,
  },
  kanbanCol: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kanbanColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  kanbanColTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  kanbanColCount: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  kanbanColCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  kanbanCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kanbanCustomer: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  kanbanUnit: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2,
  },
  kanbanTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
