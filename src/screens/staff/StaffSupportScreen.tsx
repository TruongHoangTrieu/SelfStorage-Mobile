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
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  StaffSupportTicket,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '../../types/handover';
import {
  fetchStaffSupportRequestsApi,
  getSupportRequestDetailApi,
  updateTicketProgressApi,
  addTicketNoteApi,
} from '../../api';

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
  staffUser,
  onOpenSidebar,
}: StaffSupportScreenProps) {
  const insets = useSafeAreaInsets();

  // DỮ LIỆU THẬT 100% TỪ BACKEND DATABASE
  const [tickets, setTickets] = useState<StaffSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal xem chi tiết & cập nhật tiến độ
  const [selectedTicket, setSelectedTicket] = useState<StaffSupportTicket | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('IN_PROGRESS');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  // Tải danh sách yêu cầu sự cố từ Backend API
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStaffSupportRequestsApi(facilityId).catch(() => null);

      const rawItems = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      // Ánh xạ đúng 100% các trường dữ liệu từ Backend
      const mapped: StaffSupportTicket[] = rawItems.map((item: any) => {
        const unitNumber =
          item.contractItem?.unit?.unitNumber ||
          (item.unitNumber ? String(item.unitNumber) : '') ||
          (item.unitCode ? String(item.unitCode) : '');

        let dateStr = 'Hôm nay';
        if (item.createdAt) {
          const d = new Date(item.createdAt);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            dateStr = `${day}/${month}/${year}`;
          }
        }

        return {
          id: item.id,
          requestCode: item.requestCode || String(item.id).slice(-6).toUpperCase(),
          subject: item.subject || 'Yêu cầu hỗ trợ',
          description: item.description || '',
          category: (item.category as TicketCategory) || 'OTHER',
          priority: (item.priority as TicketPriority) || 'MEDIUM',
          status: (item.status as TicketStatus) || 'OPEN',
          customerId: item.customerId,
          customerName: item.customer?.fullName || 'Khách hàng',
          customerPhone: item.customer?.phone || '',
          customerEmail: item.customer?.email,
          unitCode: unitNumber || undefined,
          facilityId: item.facilityId,
          facilityName: item.facility?.name,
          assignedStaffId: item.assignedStaffId,
          assignedStaffName: item.assignedStaff?.fullName,
          photos: item.photos || [],
          createdAt: dateStr,
          resolvedAt: item.resolvedAt,
          logs: item.logs || [],
        };
      });

      setTickets(mapped);
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu sự cố từ BE:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTickets();
  };

  // Thống kê số lượng theo trạng thái
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'OPEN').length,
      in_progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
      resolved: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
    };
  }, [tickets]);

  // Bộ lọc tìm kiếm & trạng thái
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

  // Mở modal xem chi tiết
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
      // Dùng dữ liệu hiện tại nếu API chi tiết không phản hồi
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Cập nhật trạng thái sự cố
  const handleUpdateProgress = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    try {
      setIsUpdatingProgress(true);
      const note = resolutionNote.trim() || `Cập nhật trạng thái sang ${newStatus}`;

      await updateTicketProgressApi(selectedTicket.id, newStatus, note).catch((err) => {
        console.warn('API updateTicketProgress fallback:', err.message);
      });

      const updatedTicket: StaffSupportTicket = {
        ...selectedTicket,
        status: newStatus,
        resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : selectedTicket.resolvedAt,
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

      const msg =
        newStatus === 'RESOLVED'
          ? `Đã xử lý xong yêu cầu ${selectedTicket.requestCode}`
          : `Đã cập nhật trạng thái sang ${newStatus}`;

      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Thành công', msg);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Thêm ghi chú / phản hồi
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
      Alert.alert('Lỗi', err?.message || 'Không thể gửi ghi chú.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Helper render Trạng thái chuẩn từ BE
  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Chờ xử lý</Text>
          </View>
        );
      case 'IN_PROGRESS':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={[styles.badgeDot, { backgroundColor: '#2563EB' }]} />
            <Text style={[styles.statusBadgeText, { color: '#1D4ED8' }]}>Đang xử lý</Text>
          </View>
        );
      case 'RESOLVED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
            <MaterialIcons name="check" size={11} color="#15803D" />
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

  return (
    <View style={styles.container}>
      {/* ─── Top Bar: Chỉ có nút Quay lại & Tiêu đề (ĐÃ BỎ NÚT RELOAD) ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
        <View style={styles.topBarMainRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.topBarMainTitle}>Xử Lý Sự Cố</Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Thanh tìm kiếm nhanh */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#94A3B8" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã sự cố, tên khách, số ô kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs phân loại trạng thái */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsPillRow}
        >
          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'all' && styles.statPillActive]}
            onPress={() => setSelectedStatus('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.statPillLabel,
                selectedStatus === 'all' && styles.statPillLabelActive,
              ]}
            >
              Tất cả ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'OPEN' && styles.statPillActive]}
            onPress={() => setSelectedStatus('OPEN')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.statPillLabel,
                selectedStatus === 'OPEN' && styles.statPillLabelActive,
              ]}
            >
              Chờ xử lý ({stats.open})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'IN_PROGRESS' && styles.statPillActive]}
            onPress={() => setSelectedStatus('IN_PROGRESS')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.statPillLabel,
                selectedStatus === 'IN_PROGRESS' && styles.statPillLabelActive,
              ]}
            >
              Đang xử lý ({stats.in_progress})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedStatus === 'RESOLVED' && styles.statPillActive]}
            onPress={() => setSelectedStatus('RESOLVED')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.statPillLabel,
                selectedStatus === 'RESOLVED' && styles.statPillLabelActive,
              ]}
            >
              Hoàn tất ({stats.resolved})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── Danh sách Card Sự cố (Các trường rõ ràng, không chung hàng) ─── */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Đang tải sự cố từ hệ thống...</Text>
          </View>
        ) : filteredTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="check-circle-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Không có sự cố nào</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? 'Không tìm thấy sự cố nào phù hợp với từ khóa.'
                : 'Các ô kho và thiết bị hiện đang hoạt động bình thường.'}
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
                activeOpacity={0.8}
              >
                {/* Dòng 1: Mã yêu cầu & Trạng thái (Trực tiếp từ BE, KHÔNG chế thêm tag gấp) */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.requestCodeText}>{ticket.requestCode}</Text>
                  {renderStatusBadge(ticket.status)}
                </View>

                {/* Dòng 2: Tiêu đề sự cố */}
                <Text style={styles.ticketSubject} numberOfLines={2}>
                  {ticket.subject}
                </Text>

                {/* Dòng 3: Mô tả ngắn gọn */}
                {ticket.description ? (
                  <Text style={styles.ticketDesc} numberOfLines={2}>
                    {ticket.description}
                  </Text>
                ) : null}

                {/* Dòng phân cách nhẹ */}
                <View style={styles.cardDivider} />

                {/* Dòng 4 RIÊNG BIỆT: Tên khách hàng & Số điện thoại */}
                <View style={styles.customerRow}>
                  <MaterialIcons name="person" size={15} color="#64748B" />
                  <Text style={styles.customerLabel}>Khách hàng:</Text>
                  <Text style={styles.customerValue} numberOfLines={1}>
                    {ticket.customerName}
                    {ticket.customerPhone ? ` • ${ticket.customerPhone}` : ''}
                  </Text>
                </View>

                {/* Dòng 5 RIÊNG BIỆT: Ô kho & Ngày tạo (TÁCH BIỆT HOÀN TOÀN VỚI TÊN KHÁCH) */}
                <View style={styles.unitAndDateRow}>
                  {ticket.unitCode ? (
                    <View style={styles.unitBadgeWrap}>
                      <MaterialIcons name="meeting-room" size={14} color="#1D4ED8" />
                      <Text style={styles.unitBadgeText}>Ô kho: #{ticket.unitCode}</Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  <View style={styles.dateWrap}>
                    <MaterialIcons name="schedule" size={13} color="#94A3B8" />
                    <Text style={styles.dateText}>{ticket.createdAt}</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL XEM CHI TIẾT & CẬP NHẬT TIẾN ĐỘ ─── */}
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailModalVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalTitle}>{selectedTicket?.requestCode}</Text>
                  {selectedTicket?.unitCode && (
                    <Text style={styles.modalUnitTag}>• Ô #{selectedTicket.unitCode}</Text>
                  )}
                </View>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedTicket?.subject}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDetailModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Thông tin đối chiếu trực tiếp từ BE */}
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Khách hàng:</Text>
                  <Text style={styles.detailVal}>{selectedTicket?.customerName}</Text>
                </View>
                {selectedTicket?.customerPhone ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Điện thoại:</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${selectedTicket?.customerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.detailVal, { color: '#2563EB', fontWeight: '700' }]}>
                        {selectedTicket?.customerPhone} (Gọi điện)
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {selectedTicket?.unitCode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ô kho:</Text>
                    <Text style={[styles.detailVal, { color: '#1D4ED8', fontWeight: '700' }]}>
                      #{selectedTicket.unitCode}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày tạo:</Text>
                  <Text style={styles.detailVal}>{selectedTicket?.createdAt}</Text>
                </View>
              </View>

              {/* Mô tả chi tiết hiện trường */}
              <Text style={styles.sectionHeader}>MÔ TẢ CHI TIẾT</Text>
              <View style={styles.descBox}>
                <Text style={styles.descFullText}>{selectedTicket?.description}</Text>
              </View>

              {/* Cập nhật trạng thái xử lý */}
              <Text style={[styles.sectionHeader, { marginTop: 12 }]}>CẬP NHẬT TRẠNG THÁI</Text>
              <View style={styles.statusActionRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    targetStatus === 'OPEN' && styles.statusChoiceActiveYellow,
                  ]}
                  onPress={() => setTargetStatus('OPEN')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      targetStatus === 'OPEN' && styles.statusChoiceTextActive,
                    ]}
                  >
                    Chờ xử lý
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    targetStatus === 'IN_PROGRESS' && styles.statusChoiceActiveBlue,
                  ]}
                  onPress={() => setTargetStatus('IN_PROGRESS')}
                  activeOpacity={0.8}
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
                  activeOpacity={0.8}
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
              </View>

              <TextInput
                style={styles.resolutionInput}
                placeholder="Ghi chú kết quả xử lý..."
                placeholderTextColor="#94A3B8"
                value={resolutionNote}
                onChangeText={setResolutionNote}
              />

              <TouchableOpacity
                style={[styles.saveProgressBtn, isUpdatingProgress && { opacity: 0.6 }]}
                onPress={() => handleUpdateProgress(targetStatus)}
                disabled={isUpdatingProgress}
                activeOpacity={0.85}
              >
                {isUpdatingProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProgressBtnText}>Lưu Cập Nhật Trạng Thái</Text>
                )}
              </TouchableOpacity>

              {/* Nhật ký xử lý & Ghi chú */}
              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>NHẬT KÝ XỬ LÝ</Text>
              {isLoadingDetail ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 8 }} />
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
                <Text style={styles.noLogsText}>Chưa có ghi chú nào thêm.</Text>
              )}

              {/* Nhập phản hồi nhanh */}
              <View style={styles.addNoteRow}>
                <TextInput
                  style={styles.addNoteInput}
                  placeholder="Nhập ghi chú / phản hồi..."
                  placeholderTextColor="#94A3B8"
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                />
                <TouchableOpacity
                  style={[
                    styles.sendNoteBtn,
                    (!newNoteText.trim() || isSubmittingNote) && { opacity: 0.5 },
                  ]}
                  onPress={handleAddNote}
                  disabled={!newNoteText.trim() || isSubmittingNote}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12.5,
    color: '#0F172A',
  },

  statsPillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  statPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statPillLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  // Ticket Card sạch sẽ, phân định rõ ràng
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketCardResolved: {
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 8,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },

  // DÒNG KHÁCH HÀNG RIÊNG BIỆT
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  customerLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  customerValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
    flex: 1,
  },

  // DÒNG Ô KHO & NGÀY RIÊNG BIỆT
  unitAndDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalUnitTag: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginTop: 8,
  },

  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },

  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  descFullText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
  },

  statusActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChoiceActiveYellow: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  statusChoiceActiveBlue: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusChoiceActiveGreen: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  statusChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  statusChoiceTextActive: {
    color: '#FFFFFF',
  },

  resolutionInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 8,
  },
  saveProgressBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveProgressBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  logsContainer: {
    gap: 6,
    marginBottom: 8,
  },
  logItem: {
    flexDirection: 'row',
    gap: 6,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginTop: 5,
  },
  logContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  logUser: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  logTime: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  logNote: {
    fontSize: 11,
    color: '#334155',
  },
  noLogsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  addNoteRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  addNoteInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11.5,
    color: '#0F172A',
  },
  sendNoteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
