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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffReturnOrder, ReturnCategory } from '../../types/handover';
import { INITIAL_RETURN_ORDERS } from '../../data/mockStaffData';
import { fetchStaffContractsApi } from '../../api';
import { formatVND } from '../../utils/formatters';
import SimpleReturnInspectionModal from '../../components/staff/SimpleReturnInspectionModal';

interface StaffReturnQueueScreenProps {
  facilityId?: string | number;
  facilityName?: string;
  onOpenSidebar: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export default function StaffReturnQueueScreen({
  facilityId,
  facilityName = 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
  onOpenSidebar,
  onOpenNotifications,
  unreadNotifCount = 0,
}: StaffReturnQueueScreenProps) {
  const insets = useSafeAreaInsets();
  const [returnOrders, setReturnOrders] = useState<StaffReturnOrder[]>(INITIAL_RETURN_ORDERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ReturnCategory>('all');
  const [backendSynced, setBackendSynced] = useState<boolean>(false);

  // Modal nghiệm thu trả kho (dùng chung SimpleReturnInspectionModal với bên UI đặt kho)
  const [selectedOrder, setSelectedOrder] = useState<StaffReturnOrder | null>(null);
  const [isInspectionModalVisible, setIsInspectionModalVisible] = useState<boolean>(false);

  // Tải danh sách hợp đồng trả kho và đồng bộ với AsyncStorage
  const loadReturnOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStaffContractsApi(facilityId).catch(() => null);

      let baseList = INITIAL_RETURN_ORDERS;
      if (Array.isArray(res) && res.length > 0) {
        setBackendSynced(true);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const mapped: StaffReturnOrder[] = res.map((item: any) => {
          const firstUnitItem = item.contractItems?.[0];
          const endDateObj = item.endDate ? new Date(item.endDate) : new Date();
          const endDateTime = endDateObj.getTime();

          let returnType: StaffReturnOrder['returnType'] = 'today';
          let overdueDays = 0;
          let overdueFine = 0;

          if (item.status === 'TERMINATED') {
            returnType = 'completed';
          } else if (item.status === 'OVERDUE' || endDateTime < startOfToday) {
            returnType = 'overdue';
            const diffDays = Math.ceil((startOfToday - endDateTime) / 86400000);
            overdueDays = Math.max(1, diffDays);
            overdueFine = overdueDays * 50000;
          } else if (endDateTime >= startOfToday && endDateTime <= startOfToday + 86400000) {
            returnType = 'today';
          } else {
            returnType = 'early';
          }

          const existingPhotos =
            Array.isArray(firstUnitItem?.handoverRecords?.[0]?.photos)
              ? firstUnitItem.handoverRecords[0].photos
              : [];

          return {
            id: item.id,
            contractCode: item.contractCode,
            customerName: item.customer?.fullName || 'Khách hàng',
            phone: item.customer?.phone || '0908123456',
            email: item.customer?.email || 'customer@example.com',
            unitCode: firstUnitItem?.unit?.unitNumber || 'A-101',
            smartLockPin: firstUnitItem?.accessCode || '821301',
            unitType: firstUnitItem?.unit?.unitType?.name || 'Kho Tiêu Chuẩn',
            unitSize: `${firstUnitItem?.unit?.unitType?.size || 9.0}m²`,
            facilityName: item.reservation?.facility?.name || facilityName,
            startDate: item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '01/10/2026',
            endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : '31/10/2026',
            status: item.status,
            returnType,
            depositAmount: firstUnitItem?.depositAmount || 1000000,
            unpaidFees: 0,
            overdueDays,
            overdueFine,
            extraChargesTotal: overdueFine,
            notes: item.terms || undefined,
            handoverPhotos: existingPhotos,
            handoverCondition: firstUnitItem?.handoverRecords?.[0]?.condition || 'Kho sạch sẽ, nguyên vẹn.',
          };
        });

        // Kết hợp và ưu tiên các đơn test hiện tại
        const existingCodes = new Set(mapped.map((m) => m.contractCode));
        const mergedMock = INITIAL_RETURN_ORDERS.filter((o) => !existingCodes.has(o.contractCode));
        baseList = [...INITIAL_RETURN_ORDERS, ...mapped.filter((m) => !mergedMock.some((b) => b.id === m.id))];
      }

      // Khôi phục trạng thái đã nghiệm thu từ AsyncStorage
      const hydrated = await Promise.all(
        baseList.map(async (ord) => {
          try {
            const saved = await AsyncStorage.getItem(`return_order_state_${ord.id}`);
            const savedPin = await AsyncStorage.getItem(`unit_smart_pin_${ord.unitCode}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              return {
                ...ord,
                ...parsed,
                smartLockPin: savedPin || parsed.smartLockPin || ord.smartLockPin,
              };
            }
          } catch {}
          return ord;
        })
      );

      setReturnOrders(hydrated);
    } catch {
      setReturnOrders(INITIAL_RETURN_ORDERS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [facilityId, facilityName]);

  useEffect(() => {
    loadReturnOrders();
  }, [loadReturnOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadReturnOrders();
  };

  // Thống kê số lượng theo danh mục
  const stats = useMemo(() => {
    return {
      total: returnOrders.length,
      today: returnOrders.filter((o) => o.returnType === 'today').length,
      early: returnOrders.filter((o) => o.returnType === 'early').length,
      overdue: returnOrders.filter((o) => o.returnType === 'overdue' || (o.overdueDays && o.overdueDays > 0)).length,
      completed: returnOrders.filter((o) => o.returnType === 'completed' || o.status === 'TERMINATED').length,
    };
  }, [returnOrders]);

  // Lọc theo từ khóa tìm kiếm & danh mục
  const filteredOrders = useMemo(() => {
    return returnOrders.filter((order) => {
      if (selectedCategory === 'today' && order.returnType !== 'today') return false;
      if (selectedCategory === 'early' && order.returnType !== 'early') return false;
      if (
        selectedCategory === 'overdue' &&
        order.returnType !== 'overdue' &&
        (!order.overdueDays || order.overdueDays <= 0)
      ) {
        return false;
      }
      if (selectedCategory === 'completed' && order.returnType !== 'completed' && order.status !== 'TERMINATED') {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        order.contractCode.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phone.includes(q) ||
        order.unitCode.toLowerCase().includes(q)
      );
    });
  }, [returnOrders, selectedCategory, searchQuery]);

  // Badge trạng thái ngắn gọn
  const renderReturnTypeBadge = (order: StaffReturnOrder) => {
    const isCompleted = order.status === 'TERMINATED' || order.returnType === 'completed';
    if (isCompleted) {
      return (
        <View style={[styles.typeBadge, styles.badgeCompleted]}>
          <MaterialIcons name="check-circle" size={12} color="#16A34A" />
          <Text style={[styles.typeBadgeText, styles.textCompleted]}>Đã thanh lý</Text>
        </View>
      );
    }
    if (order.overdueDays && order.overdueDays > 0) {
      return (
        <View style={[styles.typeBadge, styles.badgeOverdue]}>
          <MaterialIcons name="warning" size={12} color="#D97706" />
          <Text style={[styles.typeBadgeText, styles.textOverdue]}>Trễ {order.overdueDays} ngày</Text>
        </View>
      );
    }
    if (order.returnType === 'today') {
      return (
        <View style={[styles.typeBadge, styles.badgeToday]}>
          <MaterialIcons name="event" size={12} color="#2563EB" />
          <Text style={[styles.typeBadgeText, styles.textToday]}>Hôm nay</Text>
        </View>
      );
    }
    return (
      <View style={[styles.typeBadge, styles.badgeEarly]}>
        <MaterialIcons name="schedule" size={12} color="#0284C7" />
        <Text style={[styles.typeBadgeText, styles.textEarly]}>Trước hạn</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
        <View style={styles.topBarMainRow}>
          <TouchableOpacity style={styles.sidebarToggleBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.topBarTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topBarMainTitle}>Trả Kho</Text>
              {backendSynced && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              )}
            </View>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications-none" size={22} color="#0F172A" />
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#94A3B8" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên khách, SĐT, mã kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Bộ lọc danh mục Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsPillRow}>
          <TouchableOpacity
            style={[styles.statPill, selectedCategory === 'all' && styles.statPillActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'all' && styles.statPillLabelActive]}>
              Tất cả ({stats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedCategory === 'today' && styles.statPillActive]}
            onPress={() => setSelectedCategory('today')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'today' && styles.statPillLabelActive]}>
              Hôm nay ({stats.today})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedCategory === 'overdue' && styles.statPillActive]}
            onPress={() => setSelectedCategory('overdue')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'overdue' && styles.statPillLabelActive]}>
              Quá hạn ({stats.overdue})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedCategory === 'early' && styles.statPillActive]}
            onPress={() => setSelectedCategory('early')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'early' && styles.statPillLabelActive]}>
              Trước hạn ({stats.early})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statPill, selectedCategory === 'completed' && styles.statPillActive]}
            onPress={() => setSelectedCategory('completed')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'completed' && styles.statPillLabelActive]}>
              Đã thanh lý ({stats.completed})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── Danh Sách Đơn Trả Kho ─── */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Đang tải danh sách trả kho...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="assignment-turned-in" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Không có đơn trả kho nào</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Không tìm thấy kết quả phù hợp.' : 'Hiện không có đơn nào cần xử lý.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted = order.status === 'TERMINATED' || order.returnType === 'completed';
            const isOverdue = Boolean(order.overdueDays && order.overdueDays > 0);

            return (
              <TouchableOpacity
                key={order.id}
                style={[styles.cleanCard, isCompleted && styles.cleanCardCompleted]}
                onPress={() => {
                  setSelectedOrder(order);
                  setIsInspectionModalVisible(true);
                }}
                activeOpacity={0.88}
              >
                {/* Hàng 1: Mã Hợp Đồng (Trái) & Badge Trạng Thái (Phải) */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.contractCodeBadge}>
                    <MaterialIcons name="description" size={13} color="#2563EB" />
                    <Text style={styles.contractCodeText}>{order.contractCode}</Text>
                  </View>
                  {renderReturnTypeBadge(order)}
                </View>

                {/* Hàng 2: Tên Khách Hàng (To, rõ ràng) */}
                <Text style={styles.customerName}>{order.customerName}</Text>

                {/* Hàng 3: Ô Kho & Diện Tích (Trái) <─────────> SĐT (Phải) */}
                <View style={styles.detailRow}>
                  <View style={styles.unitInfoGroup}>
                    <MaterialIcons name="meeting-room" size={15} color="#0F172A" />
                    <Text style={styles.unitCodeText}>Ô #{order.unitCode}</Text>
                    <Text style={styles.unitSizeText}>• {order.unitSize || order.unitType || 'Tiêu chuẩn'}</Text>
                  </View>
                  <Text style={styles.phoneText}>{order.phone}</Text>
                </View>

                {/* Hàng 4: Nếu trễ hạn thì hiện 1 dòng cảnh báo ngắn gọn */}
                {isOverdue ? (
                  <View style={styles.overdueAlertRow}>
                    <MaterialIcons name="warning" size={13} color="#D97706" />
                    <Text style={styles.overdueAlertText}>
                      Quá hạn {order.overdueDays} ngày • Phạt trễ: +{formatVND(order.overdueFine || order.overdueDays * 50000)}
                    </Text>
                  </View>
                ) : isCompleted ? (
                  <View style={styles.completedAlertRow}>
                    <MaterialIcons name="check-circle" size={13} color="#16A34A" />
                    <Text style={styles.completedAlertText}>Đã hoàn tất thanh lý hợp đồng</Text>
                  </View>
                ) : null}

                {/* Hàng 5: Nút hành động duy nhất, ngắn gọn */}
                <TouchableOpacity
                  style={[styles.actionBtn, isCompleted ? styles.actionBtnCompleted : styles.actionBtnActive]}
                  onPress={() => {
                    setSelectedOrder(order);
                    setIsInspectionModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={isCompleted ? 'visibility' : 'fact-check'}
                    size={16}
                    color={isCompleted ? '#0F172A' : '#FFFFFF'}
                  />
                  <Text style={[styles.actionBtnText, isCompleted && styles.actionBtnTextCompleted]}>
                    {isCompleted ? 'Xem Biên Bản' : 'Nghiệm Thu Trả Kho'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL NGHIỆM THU TRẢ KHO (DÙNG CHUNG VỚI BÊN UI ĐẶT KHO) ─── */}
      <SimpleReturnInspectionModal
        visible={isInspectionModalVisible}
        onClose={() => setIsInspectionModalVisible(false)}
        order={selectedOrder}
        onSuccess={(updatedOrder) => {
          setSelectedOrder(updatedOrder);
          setReturnOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
          AsyncStorage.setItem(
            `return_order_state_${updatedOrder.id}`,
            JSON.stringify(updatedOrder)
          ).catch(() => null);
        }}
      />
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
    paddingBottom: 10,
  },
  topBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sidebarToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topBarTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  topBarMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  statsPillRow: {
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
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  statPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statPillLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  cleanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cleanCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  contractCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  textCompleted: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  badgeOverdue: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  textOverdue: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeToday: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  textToday: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeEarly: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  textEarly: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  unitInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitSizeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  phoneText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  overdueAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  overdueAlertText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  completedAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  completedAlertText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#166534',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnActive: {
    backgroundColor: '#C2410C',
  },
  actionBtnCompleted: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnTextCompleted: {
    color: '#0F172A',
  },
});
