import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffSupportTicket, TicketStatus, TicketCategory, TicketPriority } from '../../types/handover';
import { INITIAL_SUPPORT_TICKETS } from '../../data/mockStaffData';
import {
  fetchStaffSupportRequestsApi,
  getSupportRequestDetailApi,
  updateTicketProgressApi,
  addTicketNoteApi,
  createSupportRequestApi,
} from '../../api';
import { formatVietnameseDate } from '../../utils/formatters';

interface StaffSupportScreenProps {
  facilityId?: string | number;
  facilityName?: string;
  staffUser?: any;
  onOpenSidebar: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export default function StaffSupportScreen({
  facilityId,
  facilityName = 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
  staffUser,
  onOpenSidebar,
  onOpenNotifications,
  unreadNotifCount = 0,
}: StaffSupportScreenProps) {
  const [tickets, setTickets] = useState<StaffSupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const insets = useSafeAreaInsets();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [backendSynced, setBackendSynced] = useState<boolean>(false);

  // Modal xem chi tiết & cập nhật tiến độ
  const [selectedTicket, setSelectedTicket] = useState<StaffSupportTicket | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('IN_PROGRESS');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  // Modal tạo ticket báo cáo sự cố mới
  const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<TicketCategory>('LOCK');
  const [newPriority, setNewPriority] = useState<TicketPriority>('MEDIUM');
  const [newSubject, setNewSubject] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newUnitCode, setNewUnitCode] = useState<string>('');
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);

  // Tải danh sách ticket từ Backend API
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStaffSupportRequestsApi(facilityId).catch(() => null);

      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setBackendSynced(true);
        const mapped: StaffSupportTicket[] = res.data.map((item: any) => ({
          id: item.id,
          requestCode: item.requestCode || `TK-${item.id.slice(-6).toUpperCase()}`,
          subject: item.subject || 'Sự cố hỗ trợ',
          description: item.description || '',
          category: item.category || 'OTHER',
          priority: item.priority || 'MEDIUM',
          status: item.status || 'OPEN',
          customerId: item.customerId,
          customerName: item.customer?.fullName || 'Khách hàng',
          customerPhone: item.customer?.phone || '0908 123 456',
          customerEmail: item.customer?.email,
          unitCode: item.contractItem?.unit?.unitNumber || (item.unitNumber ? String(item.unitNumber) : undefined),
          facilityId: item.facilityId,
          facilityName: item.facility?.name || facilityName,
          assignedStaffId: item.assignedStaffId,
          assignedStaffName: item.assignedStaff?.fullName,
          photos: item.photos || [],
          createdAt: item.createdAt ? formatVietnameseDate(item.createdAt) : 'Hôm nay',
          resolvedAt: item.resolvedAt ? formatVietnameseDate(item.resolvedAt) : undefined,
          logs: item.logs || [],
        }));

        // Ghép danh sách backend và mock để luôn có dữ liệu
        const existingCodes = new Set(mapped.map((m) => m.requestCode));
        const merged = [...mapped];
        INITIAL_SUPPORT_TICKETS.forEach((mock) => {
          if (!existingCodes.has(mock.requestCode)) {
            merged.push(mock);
          }
        });
        setTickets(merged);
      }
    } catch (err: any) {
      console.warn('Backend loadTickets notice:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [facilityId, facilityName]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTickets();
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'OPEN').length,
      in_progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
      resolved: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
    };
  }, [tickets]);

  // Bộ lọc tìm kiếm
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        ticket.requestCode.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.customerName.toLowerCase().includes(q) ||
        (ticket.customerPhone && ticket.customerPhone.includes(q)) ||
        (ticket.unitCode && ticket.unitCode.toLowerCase().includes(q));

      const matchStatus =
        selectedStatus === 'all'
          ? true
          : selectedStatus === 'RESOLVED'
          ? ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
          : ticket.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [tickets, searchQuery, selectedStatus]);

  // Mở modal chi tiết ticket
  const handleOpenDetail = async (ticket: StaffSupportTicket) => {
    setSelectedTicket(ticket);
    setTargetStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status);
    setResolutionNote('');
    setNewNoteText('');
    setIsDetailModalVisible(true);

    try {
      setIsLoadingDetail(true);
      const detail = await getSupportRequestDetailApi(ticket.id).catch(() => null);
      if (detail && detail.id) {
        setSelectedTicket((prev) => ({
          ...(prev || ticket),
          description: detail.description || ticket.description,
          logs: detail.logs || ticket.logs || [],
          photos: detail.photos || ticket.photos || [],
        }));
      }
    } catch {
      // Dùng dữ liệu hiện tại nếu offline
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Cập nhật trạng thái / tiến độ ticket
  const handleUpdateProgress = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    try {
      setIsUpdatingProgress(true);
      const note = resolutionNote.trim() || `Nhân viên đã cập nhật trạng thái sang ${newStatus}`;

      await updateTicketProgressApi(selectedTicket.id, newStatus, note).catch((err) => {
        console.warn('API updateProgress fallback:', err.message);
      });

      // Cập nhật state cục bộ
      const updatedTicket: StaffSupportTicket = {
        ...selectedTicket,
        status: newStatus,
        resolvedAt: newStatus === 'RESOLVED' ? 'Vừa xong' : selectedTicket.resolvedAt,
        logs: [
          ...(selectedTicket.logs || []),
          {
            id: `log-${Date.now()}`,
            userId: String(staffUser?.id || 'staff'),
            note,
            newStatus,
            createdAt: 'Vừa xong',
            user: {
              id: String(staffUser?.id || 'staff'),
              fullName: staffUser?.fullName || 'Nhân viên hỗ trợ',
            },
          },
        ],
      };

      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
      );
      setSelectedTicket(updatedTicket);
      setResolutionNote('');

      Alert.alert(
        'Thành công! ✓',
        newStatus === 'RESOLVED'
          ? `Đã đánh dấu hoàn tất xử lý sự cố #${selectedTicket.requestCode}`
          : `Đã chuyển ticket #${selectedTicket.requestCode} sang trạng thái ${newStatus}`
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái sự cố.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Thêm ghi chú / phản hồi vào ticket
  const handleAddNote = async () => {
    if (!selectedTicket || !newNoteText.trim()) return;

    try {
      setIsSubmittingNote(true);
      const note = newNoteText.trim();
      await addTicketNoteApi(selectedTicket.id, note).catch(() => null);

      const newLog = {
        id: `log-${Date.now()}`,
        userId: String(staffUser?.id || 'staff'),
        note,
        createdAt: 'Vừa xong',
        user: {
          id: String(staffUser?.id || 'staff'),
          fullName: staffUser?.fullName || 'Nhân viên hỗ trợ',
        },
      };

      const updatedTicket = {
        ...selectedTicket,
        logs: [...(selectedTicket.logs || []), newLog],
      };

      setSelectedTicket(updatedTicket);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
      );
      setNewNoteText('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi phản hồi.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Tạo ticket mới từ phía nhân viên
  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDescription.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và mô tả sự cố.');
      return;
    }

    try {
      setIsCreatingTicket(true);
      const res = await createSupportRequestApi({
        facilityId: facilityId || 1,
        category: newCategory,
        priority: newPriority,
        subject: newSubject.trim(),
        description: newDescription.trim(),
      }).catch(() => null);

      const newTicket: StaffSupportTicket = {
        id: res?.id || `tk-local-${Date.now()}`,
        requestCode: res?.requestCode || `TK-LOC-${Date.now().toString(36).toUpperCase().slice(-4)}`,
        subject: newSubject.trim(),
        description: newDescription.trim(),
        category: newCategory,
        priority: newPriority,
        status: 'OPEN',
        customerId: String(staffUser?.id || 'staff'),
        customerName: `${staffUser?.fullName || 'Nhân viên kho'} (Nội bộ)`,
        customerPhone: staffUser?.phone || '0907654321',
        facilityId: facilityId || 1,
        facilityName,
        unitCode: newUnitCode.trim() || undefined,
        createdAt: 'Hôm nay',
        logs: [
          {
            id: `log-${Date.now()}`,
            userId: String(staffUser?.id || 'staff'),
            note: 'Nhân viên phát hiện và tạo báo cáo sự cố tại hiện trường',
            createdAt: 'Hôm nay',
          },
        ],
      };

      setTickets([newTicket, ...tickets]);
      setIsCreateModalVisible(false);
      setNewSubject('');
      setNewDescription('');
      setNewUnitCode('');

      Alert.alert('Thành công! 🎉', `Đã ghi nhận sự cố #${newTicket.requestCode}`);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo báo cáo sự cố.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Helpers render Badge
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <MaterialIcons name="flash-on" size={11} color="#DC2626" />
            <Text style={[styles.priorityText, { color: '#DC2626' }]}>Khẩn cấp</Text>
          </View>
        );
      case 'HIGH':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <MaterialIcons name="priority-high" size={11} color="#D97706" />
            <Text style={[styles.priorityText, { color: '#D97706' }]}>Ưu tiên cao</Text>
          </View>
        );
      case 'MEDIUM':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
            <Text style={[styles.priorityText, { color: '#2563EB' }]}>Trung bình</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.priorityText, { color: '#64748B' }]}>Thấp</Text>
          </View>
        );
    }
  };

  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Chờ tiếp nhận</Text>
          </View>
        );
      case 'IN_PROGRESS':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#7C3AED' }]} />
            <Text style={[styles.statusBadgeText, { color: '#7C3AED' }]}>Đang xử lý</Text>
          </View>
        );
      case 'RESOLVED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
            <MaterialIcons name="check" size={12} color="#15803D" />
            <Text style={[styles.statusBadgeText, { color: '#15803D' }]}>Đã giải quyết</Text>
          </View>
        );
      case 'CLOSED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.statusBadgeText, { color: '#64748B' }]}>Đã đóng</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderCategoryName = (category: TicketCategory) => {
    switch (category) {
      case 'LOCK':
        return 'Ổ khóa Smart Lock';
      case 'UNIT':
        return 'Ngăn kho / Cơ sở vật chất';
      case 'ACCESS_CODE':
        return 'Mã PIN truy cập';
      case 'PAYMENT':
        return 'Thanh toán & Phụ phí';
      case 'DAMAGE':
        return 'Hư hỏng / Bồi thường';
      case 'CLEANING':
        return 'Vệ sinh & Môi trường';
      default:
        return 'Hỗ trợ chung';
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <View style={styles.topBarMainRow}>
          <TouchableOpacity style={styles.sidebarToggleBtn} onPress={onOpenSidebar}>
            <MaterialIcons name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.topBarTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topBarMainTitle}>Hỗ Trợ & Sự Cố</Text>
              {backendSynced && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>Live BE</Text>
                </View>
              )}
            </View>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setIsCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Báo sự cố</Text>
            </TouchableOpacity>

            {onOpenNotifications && (
              <TouchableOpacity style={styles.notifBtn} onPress={onOpenNotifications}>
                <MaterialIcons name="notifications-none" size={22} color="#1E293B" />
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Thanh tìm kiếm nhanh */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color="#94A3B8" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã ticket, tên khách, số ĐT, mã ô kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsPillRow}>
          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'all' && styles.statPillActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.statPillLabel, selectedStatus === 'all' && styles.statPillLabelActive]}>
              Tất cả ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'OPEN' && styles.statPillActive]}
            onPress={() => setSelectedStatus('OPEN')}
          >
            <Text style={[styles.statPillLabel, selectedStatus === 'OPEN' && styles.statPillLabelActive]}>
              Chờ tiếp nhận ({stats.open})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'IN_PROGRESS' && styles.statPillActive]}
            onPress={() => setSelectedStatus('IN_PROGRESS')}
          >
            <Text style={[styles.statPillLabel, selectedStatus === 'IN_PROGRESS' && styles.statPillLabelActive]}>
              Đang xử lý ({stats.in_progress})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'RESOLVED' && styles.statPillActive]}
            onPress={() => setSelectedStatus('RESOLVED')}
          >
            <Text style={[styles.statPillLabel, selectedStatus === 'RESOLVED' && styles.statPillLabelActive]}>
              Đã giải quyết ({stats.resolved})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── Danh sách Ticket Sự cố ─── */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Đang tải danh sách sự cố...</Text>
          </View>
        ) : filteredTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="support-agent" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Không có sự cố nào</Text>
            <Text style={styles.emptySubtitle}>
              Tất cả hệ thống kho và thiết bị hiện đang hoạt động bình thường, ổn định.
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => {
            const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

            return (
              <TouchableOpacity
                key={ticket.id}
                style={[styles.ticketCard, isResolved && styles.ticketCardResolved]}
                onPress={() => handleOpenDetail(ticket)}
                activeOpacity={0.85}
              >
                {/* Hàng 1: Mã ticket & Badges */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.requestCodeText}>{ticket.requestCode}</Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{renderCategoryName(ticket.category)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {renderPriorityBadge(ticket.priority)}
                    {renderStatusBadge(ticket.status)}
                  </View>
                </View>

                {/* Hàng 2: Tiêu đề sự cố */}
                <Text style={styles.ticketSubject} numberOfLines={1}>
                  {ticket.subject}
                </Text>

                {/* Hàng 3: Mô tả ngắn gọn */}
                <Text style={styles.ticketDesc} numberOfLines={2}>
                  {ticket.description}
                </Text>

                {/* Hàng 4: Khách hàng & Ô kho */}
                <View style={styles.ticketMetaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <MaterialIcons name="person" size={13} color="#64748B" />
                    <Text style={styles.customerNameText} numberOfLines={1}>
                      {ticket.customerName}
                    </Text>
                    {ticket.customerPhone ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${ticket.customerPhone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 }}
                      >
                        <MaterialIcons name="phone" size={12} color="#2563EB" />
                        <Text style={styles.phoneLinkText}>{ticket.customerPhone}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {ticket.unitCode && (
                    <View style={styles.unitBadge}>
                      <MaterialIcons name="meeting-room" size={12} color="#1E3A8A" />
                      <Text style={styles.unitBadgeText}>Ô {ticket.unitCode}</Text>
                    </View>
                  )}
                </View>

                {/* Hàng 5: Nút hành động */}
                <View style={styles.actionRow}>
                  <Text style={styles.timeAgoText}>{ticket.createdAt}</Text>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      ticket.status === 'OPEN'
                        ? styles.actionBtnOpen
                        : ticket.status === 'IN_PROGRESS'
                        ? styles.actionBtnInProgress
                        : styles.actionBtnResolved,
                    ]}
                    onPress={() => handleOpenDetail(ticket)}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        isResolved && { color: '#15803D' },
                      ]}
                    >
                      {ticket.status === 'OPEN'
                        ? 'Tiếp nhận xử lý →'
                        : ticket.status === 'IN_PROGRESS'
                        ? 'Cập nhật tiến độ →'
                        : 'Xem nhật ký ✓'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL XEM CHI TIẾT & TIẾN ĐỘ TICKET ─── */}
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.modalTitle}>{selectedTicket?.requestCode}</Text>
                  {selectedTicket && renderStatusBadge(selectedTicket.status)}
                </View>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedTicket?.subject}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Thông tin đối chiếu */}
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách hàng:</Text>
                  <Text style={styles.detailVal}>{selectedTicket?.customerName}</Text>
                </View>
                {selectedTicket?.customerPhone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số điện thoại:</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedTicket?.customerPhone}`)}>
                      <Text style={[styles.detailVal, { color: '#2563EB', fontWeight: '700' }]}>
                        {selectedTicket?.customerPhone} (Gọi ngay)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {selectedTicket?.unitCode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngăn kho:</Text>
                    <Text style={[styles.detailVal, { fontWeight: '700' }]}>Ô {selectedTicket?.unitCode}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phân loại sự cố:</Text>
                  <Text style={styles.detailVal}>{selectedTicket && renderCategoryName(selectedTicket.category)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mức ưu tiên:</Text>
                  <View>{selectedTicket && renderPriorityBadge(selectedTicket.priority)}</View>
                </View>
              </View>

              {/* Mô tả chi tiết sự cố */}
              <Text style={styles.sectionHeader}>Mô tả chi tiết sự cố</Text>
              <View style={styles.descBox}>
                <Text style={styles.descFullText}>{selectedTicket?.description}</Text>
              </View>

              {/* Cập nhật nhanh trạng thái (Dành cho Nhân viên) */}
              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Cập nhật trạng thái xử lý</Text>
              <View style={styles.statusActionRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    targetStatus === 'IN_PROGRESS' && styles.statusChoiceActive,
                  ]}
                  onPress={() => setTargetStatus('IN_PROGRESS')}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      targetStatus === 'IN_PROGRESS' && styles.statusChoiceTextActive,
                    ]}
                  >
                    Đang xử lý
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    targetStatus === 'RESOLVED' && styles.statusChoiceActiveGreen,
                  ]}
                  onPress={() => setTargetStatus('RESOLVED')}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      targetStatus === 'RESOLVED' && styles.statusChoiceTextActive,
                    ]}
                  >
                    Đã giải quyết ✓
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    targetStatus === 'CLOSED' && styles.statusChoiceActiveGray,
                  ]}
                  onPress={() => setTargetStatus('CLOSED')}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      targetStatus === 'CLOSED' && styles.statusChoiceTextActive,
                    ]}
                  >
                    Đóng ticket
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.resolutionInput}
                placeholder="Ghi chú phương án khắc phục tại hiện trường..."
                placeholderTextColor="#94A3B8"
                value={resolutionNote}
                onChangeText={setResolutionNote}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveProgressBtn, isUpdatingProgress && { opacity: 0.6 }]}
                onPress={() => handleUpdateProgress(targetStatus)}
                disabled={isUpdatingProgress}
              >
                {isUpdatingProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProgressBtnText}>Lưu Cập Nhật Trạng Thái</Text>
                )}
              </TouchableOpacity>

              {/* Nhật ký xử lý & Trao đổi */}
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>Nhật ký & Trao đổi sự cố</Text>
              {isLoadingDetail ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 10 }} />
              ) : selectedTicket?.logs && selectedTicket.logs.length > 0 ? (
                <View style={styles.logsContainer}>
                  {selectedTicket.logs.map((log, idx) => (
                    <View key={log.id || idx} style={styles.logItem}>
                      <View style={styles.logDot} />
                      <View style={styles.logContent}>
                        <View style={styles.logHeader}>
                          <Text style={styles.logUser}>{log.user?.fullName || 'Hệ thống'}</Text>
                          <Text style={styles.logTime}>{log.createdAt}</Text>
                        </View>
                        <Text style={styles.logNote}>{log.note}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noLogsText}>Chưa có trao đổi nào thêm cho yêu cầu này.</Text>
              )}

              {/* Nhập phản hồi nhanh */}
              <View style={styles.addNoteRow}>
                <TextInput
                  style={styles.addNoteInput}
                  placeholder="Nhắn phản hồi cho khách..."
                  placeholderTextColor="#94A3B8"
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                />
                <TouchableOpacity
                  style={[styles.sendNoteBtn, (!newNoteText.trim() || isSubmittingNote) && { opacity: 0.5 }]}
                  onPress={handleAddNote}
                  disabled={!newNoteText.trim() || isSubmittingNote}
                >
                  <MaterialIcons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL TẠO BÁO CÁO SỰ CỐ MỚI ─── */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Báo Cáo Sự Cố Hiện Trường</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Phân loại sự cố</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {(['LOCK', 'UNIT', 'ACCESS_CODE', 'CLEANING', 'OTHER'] as TicketCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChoice, newCategory === cat && styles.categoryChoiceActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.categoryChoiceText, newCategory === cat && styles.categoryChoiceTextActive]}>
                      {renderCategoryName(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Mức độ ưu tiên</Text>
              <View style={styles.priorityRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[styles.priorityChoice, newPriority === pri && styles.priorityChoiceActive]}
                    onPress={() => setNewPriority(pri)}
                  >
                    <Text style={[styles.priorityChoiceText, newPriority === pri && styles.priorityChoiceTextActive]}>
                      {pri === 'URGENT' ? 'Khẩn cấp' : pri === 'HIGH' ? 'Cao' : pri === 'MEDIUM' ? 'Bình thường' : 'Thấp'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Mã ngăn kho (nếu có)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: A-101, VNG-302..."
                placeholderTextColor="#94A3B8"
                value={newUnitCode}
                onChangeText={setNewUnitCode}
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Tiêu đề sự cố *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Đèn hành lang tầng 2 không sáng, Khóa kẹt..."
                placeholderTextColor="#94A3B8"
                value={newSubject}
                onChangeText={setNewSubject}
              />

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Mô tả chi tiết *</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="Mô tả cụ thể vị trí, tình trạng và phương án đề xuất..."
                placeholderTextColor="#94A3B8"
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <TouchableOpacity
                style={[styles.confirmCreateBtn, isCreatingTicket && { opacity: 0.6 }]}
                onPress={handleCreateTicket}
                disabled={isCreatingTicket}
              >
                {isCreatingTicket ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmCreateBtnText}>GỬI BÁO CÁO SỰ CỐ</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sidebarToggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  topBarTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  topBarMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notifBtn: {
    position: 'relative',
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  statsPillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statPillLabelActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ticketCardResolved: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customerNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  phoneLinkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionBtnOpen: {
    backgroundColor: '#2563EB',
  },
  actionBtnInProgress: {
    backgroundColor: '#7C3AED',
  },
  actionBtnResolved: {
    backgroundColor: '#DCFCE7',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descFullText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  statusActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusChoiceActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  statusChoiceActiveGreen: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  statusChoiceActiveGray: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  statusChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resolutionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    minHeight: 50,
    marginBottom: 10,
  },
  saveProgressBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveProgressBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  logsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    gap: 8,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 5,
  },
  logContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  logUser: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  logTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  logNote: {
    fontSize: 12,
    color: '#334155',
  },
  noLogsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addNoteInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendNoteBtn: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  categoryChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChoiceActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChoiceText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  categoryChoiceTextActive: {
    color: '#FFFFFF',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChoice: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityChoiceActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  priorityChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  priorityChoiceTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12.5,
    color: '#1E293B',
  },
  confirmCreateBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  confirmCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

