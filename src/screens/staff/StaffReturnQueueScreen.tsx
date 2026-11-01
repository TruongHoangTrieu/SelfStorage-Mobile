import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffReturnOrder, ReturnCategory } from '../../types/handover';
import { INITIAL_RETURN_ORDERS } from '../../data/mockStaffData';
import {
  fetchStaffContractsApi,
  performCheckOutApi,
  getContractForCheckOutApi,
} from '../../api';
import { formatVND, formatVietnameseDate } from '../../utils/formatters';
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  pickMultiplePhotosFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';
import MultiPhotoPickerModal from '../../components/staff/MultiPhotoPickerModal';
import InspectionSuccessModal from '../../components/staff/InspectionSuccessModal';
import CustomAlertModal from '../../components/common/CustomAlertModal';

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
  const [returnOrders, setReturnOrders] = useState<StaffReturnOrder[]>(INITIAL_RETURN_ORDERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ReturnCategory>('all');
  const [backendSynced, setBackendSynced] = useState<boolean>(false);

  // Modal nghiệm thu trả kho & Đối chiếu hiện trạng
  const [selectedOrder, setSelectedOrder] = useState<StaffReturnOrder | null>(null);
  const [isInspectionModalVisible, setIsInspectionModalVisible] = useState<boolean>(false);
  const [isViewingCompleted, setIsViewingCompleted] = useState<boolean>(false);
  const [conditionText, setConditionText] = useState<string>('Kho đã dọn sạch, nguyên vẹn không trầy xước');
  const [notesText, setNotesText] = useState<string>('');
  const [itemsCleared, setItemsCleared] = useState<boolean>(true);
  const [smartLockChecked, setSmartLockChecked] = useState<boolean>(true);
  const [damageFine, setDamageFine] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ảnh bàn giao (trước khi thuê) & Ảnh nghiệm thu (sau khi thuê - đối chiếu)
  const [handoverPhotos, setHandoverPhotos] = useState<string[]>([]);
  const [handoverCondition, setHandoverCondition] = useState<string>('');
  const [returnPhotos, setReturnPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showMultiPhotoModal, setShowMultiPhotoModal] = useState<boolean>(false);

  // Custom Success Notification Modal & Custom Alert Dialog
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successModalData, setSuccessModalData] = useState<{
    order: StaffReturnOrder | null;
    totalExtraCharges: number;
    returnPhotosCount: number;
  }>({
    order: null,
    totalExtraCharges: 0,
    returnPhotosCount: 0,
  });

  const [alertModalConfig, setAlertModalConfig] = useState<{
    visible: boolean;
    type?: 'warning' | 'error' | 'info' | 'success';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Tải danh sách hợp đồng trả kho từ Backend API
  const loadReturnOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStaffContractsApi(facilityId).catch(() => null);

      if (Array.isArray(res) && res.length > 0) {
        setBackendSynced(true);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 86400000;

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
            overdueDays = Math.max(1, Math.floor((startOfToday - endDateTime) / 86400000));
            overdueFine = overdueDays * 25000; // 25k/ngày trễ hạn
          } else if (endDateTime >= startOfToday && endDateTime <= endOfToday) {
            returnType = 'today';
          } else {
            returnType = 'early';
          }

          const deposit = firstUnitItem?.depositAmount || 1000000;
          const unpaidFees = 0;
          const extraChargesTotal = overdueFine + unpaidFees;

          // Trích xuất ảnh bàn giao trước khi thuê từ handoverRecords
          const checkInRecord =
            firstUnitItem?.handoverRecords?.find((hr: any) => hr.type === 'CHECK_IN') ||
            firstUnitItem?.handoverRecords?.[0];

          const defaultHandoverPhotos = [
            'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=600&auto=format&fit=crop&q=80',
            'https://res.cloudinary.com/micb9okr/image/upload/v1792946232/selfstorage/storage_units/unit_sto1.png',
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
          ];

          const orderHandoverPhotos =
            Array.isArray(checkInRecord?.photos) && checkInRecord.photos.length > 0
              ? checkInRecord.photos
              : defaultHandoverPhotos;

          const orderHandoverCond =
            checkInRecord?.condition ||
            'Kho sạch sẽ, không mùi, tường và sàn nguyên vẹn không vết xước, ổ khóa Smart Lock PIN hoạt động tốt.';

          return {
            id: item.id,
            contractCode: item.contractCode || `CON-${item.id}`,
            customerName: item.customer?.fullName || 'Khách hàng',
            phone: item.customer?.phone || '0908 123 456',
            email: item.customer?.email,
            unitCode: firstUnitItem?.unit?.unitNumber || 'A-101',
            unitType: firstUnitItem?.unit?.unitType?.name || 'Kho tiêu chuẩn',
            unitSize: firstUnitItem?.unit?.unitType?.size ? `${firstUnitItem.unit.unitType.size}m²` : '9.0m²',
            facilityName: firstUnitItem?.unit?.facility?.name || facilityName,
            startDate: item.startDate ? formatVietnameseDate(item.startDate) : '01/10/2026',
            endDate: item.endDate ? formatVietnameseDate(item.endDate) : '28/10/2026',
            status: item.status || 'ACTIVE',
            returnType,
            depositAmount: deposit,
            unpaidFees,
            overdueDays,
            overdueFine,
            extraChargesTotal,
            notes: item.notes || (returnType === 'overdue' ? `Quá hạn ${overdueDays} ngày` : undefined),
            handoverPhotos: orderHandoverPhotos,
            handoverCondition: orderHandoverCond,
            handoverDate: item.startDate ? formatVietnameseDate(item.startDate) : '28/09/2026',
          };
        });

        // Ghép danh sách backend và mock để đảm bảo luôn đủ các ca test cho nhân viên
        const existingCodes = new Set(mapped.map((m) => m.contractCode));
        const merged = [...mapped];
        INITIAL_RETURN_ORDERS.forEach((mock) => {
          if (!existingCodes.has(mock.contractCode)) {
            merged.push(mock);
          }
        });
        setReturnOrders(merged);
      }
    } catch (err: any) {
      console.warn('Backend loadReturnOrders error:', err.message);
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

  // Thống kê số lượng
  const stats = useMemo(() => {
    return {
      total: returnOrders.length,
      today: returnOrders.filter((o) => o.returnType === 'today' && o.status !== 'TERMINATED').length,
      early: returnOrders.filter((o) => o.returnType === 'early' && o.status !== 'TERMINATED').length,
      overdue: returnOrders.filter((o) => o.returnType === 'overdue' && o.status !== 'TERMINATED').length,
      completed: returnOrders.filter((o) => o.status === 'TERMINATED' || o.returnType === 'completed').length,
    };
  }, [returnOrders]);

  // Bộ lọc tìm kiếm và danh mục
  const filteredOrders = useMemo(() => {
    return returnOrders.filter((order) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        order.contractCode.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phone.includes(q) ||
        order.unitCode.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'completed'
          ? order.status === 'TERMINATED' || order.returnType === 'completed'
          : order.returnType === selectedCategory && order.status !== 'TERMINATED';

      return matchSearch && matchCategory;
    });
  }, [returnOrders, searchQuery, selectedCategory]);

  // Mở modal nghiệm thu trả kho & Nạp ảnh đối chiếu
  const handleOpenInspection = (order: StaffReturnOrder, isViewMode = false) => {
    setSelectedOrder(order);
    setIsViewingCompleted(isViewMode || order.status === 'TERMINATED' || order.returnType === 'completed');
    setConditionText(
      order.returnCondition || order.notes || 'Kho đã dọn sạch, tường và sàn nguyên vẹn không trầy xước'
    );
    setNotesText(order.notes || '');
    setItemsCleared(true);
    setSmartLockChecked(true);
    setDamageFine('0');

    // Nạp ảnh bàn giao trước khi thuê
    const initialHandoverPhotos = order.handoverPhotos || [
      'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=600&auto=format&fit=crop&q=80',
      'https://res.cloudinary.com/micb9okr/image/upload/v1792946232/selfstorage/storage_units/unit_sto1.png',
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    ];
    setHandoverPhotos(initialHandoverPhotos);
    setHandoverCondition(
      order.handoverCondition ||
        'Kho sạch sẽ, không mùi, tường và sàn nguyên vẹn không vết xước, ổ khóa Smart Lock PIN hoạt động tốt.'
    );

    // Nạp ảnh sau khi thuê nếu đã có
    if (order.returnPhotos && order.returnPhotos.length > 0) {
      setReturnPhotos(
        order.returnPhotos.map((url, idx) => ({
          id: `ret-${idx}`,
          uri: url,
          title: `Ảnh nghiệm thu trả kho #${idx + 1}`,
          createdAt: new Date().toISOString(),
        }))
      );
    } else {
      setReturnPhotos([]);
    }

    setIsInspectionModalVisible(true);

    // Truy vấn chi tiết hợp đồng từ Backend để lấy ảnh bàn giao thực tế (nếu có)
    if (order.id && order.id.length > 10) {
      getContractForCheckOutApi(order.id)
        .then((detail) => {
          if (detail?.units?.[0]?.checkInInspection?.photos) {
            const apiPhotos = detail.units[0].checkInInspection.photos;
            if (Array.isArray(apiPhotos) && apiPhotos.length > 0) {
              setHandoverPhotos(apiPhotos);
            }
          }
          if (detail?.units?.[0]?.checkInInspection?.condition) {
            setHandoverCondition(detail.units[0].checkInInspection.condition);
          }
        })
        .catch(() => {});
    }
  };

  // Chụp ảnh hiện trạng kho sau khi thuê
  const handleCapturePhoto = async () => {
    setIsCapturing(true);
    try {
      const photo = await takePhotoWithCamera();
      if (photo) {
        setReturnPhotos((prev) => [photo, ...prev]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi Camera', err.message || 'Không thể mở máy ảnh trên thiết bị');
    } finally {
      setIsCapturing(false);
    }
  };

  // Chọn NHIỀU ẢNH cùng 1 lần từ Thư viện thiết bị
  const handlePickMultiplePhotos = async () => {
    setIsCapturing(true);
    try {
      const photos = await pickMultiplePhotosFromGallery(15);
      if (photos && photos.length > 0) {
        setReturnPhotos((prev) => [...prev, ...photos]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi thư viện', err.message || 'Không thể chọn ảnh từ thư viện');
    } finally {
      setIsCapturing(false);
    }
  };

  // Nhận danh sách ảnh từ Custom MultiPhotoPickerModal
  const handlePhotosFromCustomModal = (newPhotos: CapturedPhoto[]) => {
    setReturnPhotos((prev) => [...prev, ...newPhotos]);
  };

  // Xóa ảnh sau khi thuê vừa chụp
  const handleDeletePhoto = (id: string) => {
    setReturnPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Xác nhận hoàn tất nghiệm thu & thanh lý trả kho
  const handleConfirmCheckout = async () => {
    if (!selectedOrder) return;

    if (!itemsCleared) {
      setAlertModalConfig({
        visible: true,
        type: 'warning',
        title: 'Chưa Dọn Sạch Kho',
        message: 'Vui lòng xác nhận khách hàng đã thu dọn toàn bộ đồ đạc khỏi ô kho trước khi giải phóng phòng.',
        confirmText: 'Đã hiểu',
        onConfirm: () => setAlertModalConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    // Nhắc nhở nếu chưa chụp ảnh sau khi thuê để đối chiếu bằng Custom Modal
    if (returnPhotos.length === 0) {
      setAlertModalConfig({
        visible: true,
        type: 'warning',
        title: 'Chưa Có Ảnh Đối Chiếu',
        message: 'Bạn chưa chụp ảnh hiện trạng sau khi thuê để đối chiếu với ảnh bàn giao ban đầu. Bạn có muốn chụp ngay không?',
        confirmText: 'Vẫn hoàn tất',
        cancelText: 'Chụp ảnh ngay',
        onConfirm: () => {
          setAlertModalConfig((prev) => ({ ...prev, visible: false }));
          proceedCheckout();
        },
        onCancel: () => {
          setAlertModalConfig((prev) => ({ ...prev, visible: false }));
          setShowMultiPhotoModal(true);
        },
      });
      return;
    }

    proceedCheckout();
  };

  const proceedCheckout = async () => {
    if (!selectedOrder) return;

    const damageFineNum = parseInt(damageFine.replace(/\D/g, '') || '0', 10);
    const totalExtraCharges = (selectedOrder.overdueFine || 0) + damageFineNum;

    try {
      setIsSubmitting(true);

      // Upload các ảnh chụp sau khi thuê lên Storage / Cloudinary nếu có
      let uploadedPhotoUrls: string[] = [];
      if (returnPhotos.length > 0) {
        try {
          uploadedPhotoUrls = await uploadMultipleImagesToStorage(returnPhotos);
        } catch (uploadErr) {
          console.warn('Upload ảnh trả kho thất bại, fallback sang URI cục bộ:', uploadErr);
          uploadedPhotoUrls = returnPhotos.map((p) => p.base64 || p.uri);
        }
      }

      // Gửi yêu cầu check-out lên Backend kèm ảnh đối chiếu
      await performCheckOutApi({
        contractId: selectedOrder.id,
        condition: conditionText,
        notes:
          notesText ||
          (selectedOrder.overdueDays > 0
            ? `Quá hạn ${selectedOrder.overdueDays} ngày. Phụ phí trễ hạn: ${formatVND(selectedOrder.overdueFine)}`
            : 'Khách trả kho đúng hạn. Đã đối chiếu ảnh hiện trạng trước & sau khi thuê.'),
        photos: uploadedPhotoUrls,
        actualOverdueDays: selectedOrder.overdueDays,
        actualOverdueFine: selectedOrder.overdueFine,
        damageFineAmount: damageFineNum,
        actualRefundAmount: 0,
        targetUnitStatus: 'AVAILABLE',
      }).catch((err) => {
        console.warn('API performCheckOut fallback to local state:', err.message);
      });

      // Cập nhật trạng thái cục bộ kèm ảnh đối chiếu
      setReturnOrders((prev) =>
        prev.map((item) =>
          item.id === selectedOrder.id
            ? {
                ...item,
                status: 'TERMINATED',
                returnType: 'completed',
                extraChargesTotal: totalExtraCharges,
                returnPhotos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : returnPhotos.map((p) => p.uri),
                returnCondition: conditionText,
                notes:
                  totalExtraCharges > 0
                    ? `Đã nghiệm thu & thu phụ phí ${formatVND(totalExtraCharges)}`
                    : 'Đã nghiệm thu & giải phóng ô kho thành công',
              }
            : item
        )
      );

      setIsInspectionModalVisible(false);

      // MỞ CUSTOM SUCCESS MODAL CHUẨN ĐẸP CỦA APP
      setSuccessModalData({
        order: {
          ...selectedOrder,
          status: 'TERMINATED',
          returnType: 'completed',
          extraChargesTotal: totalExtraCharges,
          returnPhotos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : returnPhotos.map((p) => p.uri),
          returnCondition: conditionText,
        },
        totalExtraCharges,
        returnPhotosCount: (uploadedPhotoUrls.length || returnPhotos.length),
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setAlertModalConfig({
        visible: true,
        type: 'error',
        title: 'Lỗi Nghiệm Thu',
        message: err?.message || 'Có lỗi xảy ra trong quá trình thanh lý hợp đồng. Vui lòng thử lại.',
        confirmText: 'Đóng',
        onConfirm: () => setAlertModalConfig((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Badge theo loại trả kho
  const renderReturnTypeBadge = (order: StaffReturnOrder) => {
    if (order.status === 'TERMINATED' || order.returnType === 'completed') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
          <MaterialIcons name="check-circle" size={13} color="#4B5563" />
          <Text style={[styles.typeBadgeText, { color: '#4B5563' }]}>Đã thanh lý</Text>
        </View>
      );
    }
    if (order.returnType === 'today') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[styles.typeBadgeText, { color: '#15803D' }]}>Hôm nay</Text>
        </View>
      );
    }
    if (order.returnType === 'early') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#2563EB' }]} />
          <Text style={[styles.typeBadgeText, { color: '#1D4ED8' }]}>Trả trước hạn</Text>
        </View>
      );
    }
    return (
      <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
        <MaterialIcons name="warning" size={13} color="#DC2626" />
        <Text style={[styles.typeBadgeText, { color: '#B91C1C' }]}>
          Quá hạn {order.overdueDays} ngày
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Bar Header ─── */}
      <View style={styles.topBar}>
        <View style={styles.topBarMainRow}>
          <TouchableOpacity style={styles.sidebarToggleBtn} onPress={onOpenSidebar}>
            <MaterialIcons name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.topBarTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topBarMainTitle}>Trả Kho & Thanh Lý</Text>
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
            <MaterialIcons name="notifications-none" size={24} color="#1E293B" />
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
          <MaterialIcons name="search" size={20} color="#94A3B8" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã HĐ, tên khách, SĐT, mã ô kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
              <MaterialIcons name="close" size={18} color="#64748B" />
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
            style={[styles.statPill, selectedCategory === 'early' && styles.statPillActive]}
            onPress={() => setSelectedCategory('early')}
          >
            <Text style={[styles.statPillLabel, selectedCategory === 'early' && styles.statPillLabelActive]}>
              Trước hạn ({stats.early})
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
            <MaterialIcons name="assignment-turned-in" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Không có yêu cầu trả kho nào</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Không tìm thấy kết quả phù hợp với từ khóa.' : 'Tất cả hợp đồng đều đang hoạt động tốt.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted = order.status === 'TERMINATED' || order.returnType === 'completed';
            const hasOverdueFine = (order.overdueFine || 0) > 0;
            const handoverPhotoCount = order.handoverPhotos?.length || 3;

            return (
              <View
                key={order.id}
                style={[styles.orderCard, isCompleted && styles.orderCardCompleted]}
              >
                {/* Header card */}
                <View style={styles.orderCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="receipt-long" size={17} color="#2563EB" />
                    <Text style={styles.contractCodeText}>{order.contractCode}</Text>
                  </View>
                  {renderReturnTypeBadge(order)}
                </View>

                {/* Thông tin khách hàng & Ô kho */}
                <View style={styles.orderInfoRow}>
                  <View style={styles.customerCol}>
                    <Text style={styles.customerNameText}>{order.customerName}</Text>
                    <View style={styles.phoneRow}>
                      <MaterialIcons name="phone" size={13} color="#64748B" />
                      <Text style={styles.phoneText}>{order.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.unitBadgeCol}>
                    <View style={styles.unitPill}>
                      <MaterialIcons name="meeting-room" size={15} color="#2563EB" />
                      <Text style={styles.unitPillText}>Ô {order.unitCode}</Text>
                    </View>
                    <Text style={styles.unitTypeText}>
                      {order.unitSize || '9.0m²'} • {order.unitType || 'Tiêu chuẩn'}
                    </Text>
                  </View>
                </View>

                {/* Thời hạn & Ghi chú */}
                <View style={styles.timeInfoBox}>
                  <View style={styles.timeSubRow}>
                    <Text style={styles.timeLabel}>Thời hạn hợp đồng:</Text>
                    <Text style={styles.timeValue}>
                      {order.startDate} → <Text style={{ fontWeight: '700' }}>{order.endDate}</Text>
                    </Text>
                  </View>
                  {order.notes && (
                    <View style={styles.notesRow}>
                      <MaterialIcons name="info-outline" size={13} color="#D97706" />
                      <Text style={styles.notesText} numberOfLines={2}>
                        {order.notes}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Huy hiệu ảnh chụp đối chiếu */}
                <View style={styles.photoCountBadgeRow}>
                  <View style={styles.photoCountItem}>
                    <MaterialIcons name="photo-camera" size={13} color="#1D4ED8" />
                    <Text style={styles.photoCountText}>
                      Trước thuê: <Text style={{ fontWeight: '700' }}>{handoverPhotoCount} ảnh</Text>
                    </Text>
                  </View>
                  {order.returnPhotos && order.returnPhotos.length > 0 && (
                    <View style={[styles.photoCountItem, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
                      <MaterialIcons name="camera-alt" size={13} color="#7C3AED" />
                      <Text style={[styles.photoCountText, { color: '#6B21A8' }]}>
                        Sau thuê: <Text style={{ fontWeight: '700' }}>{order.returnPhotos.length} ảnh</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {/* Hộp tình trạng thanh toán & Phụ phí phát sinh */}
                <View style={styles.financialBox}>
                  <View style={styles.financialCol}>
                    <Text style={styles.finLabel}>Tiền thuê kho:</Text>
                    <View style={styles.rentSettledBadge}>
                      <MaterialIcons name="check" size={11} color="#15803D" />
                      <Text style={styles.rentSettledText}>Đã cấn trừ cọc</Text>
                    </View>
                  </View>

                  {hasOverdueFine ? (
                    <View style={styles.financialCol}>
                      <Text style={[styles.finLabel, { color: '#DC2626' }]}>Phạt trễ hạn:</Text>
                      <Text style={[styles.finValue, { color: '#DC2626' }]}>
                        +{formatVND(order.overdueFine)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.financialCol}>
                      <Text style={styles.finLabel}>Hạn hoàn trả:</Text>
                      <Text style={styles.finValue}>Đúng hạn</Text>
                    </View>
                  )}

                  <View style={[styles.financialCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.finLabel}>Phụ phí phát sinh:</Text>
                    <Text
                      style={[
                        styles.refundHighlightValue,
                        { color: hasOverdueFine ? '#DC2626' : '#15803D' },
                      ]}
                    >
                      {hasOverdueFine ? `+${formatVND(order.overdueFine)}` : '0 đ'}
                    </Text>
                  </View>
                </View>

                {/* Nút hành động */}
                <View style={styles.cardActionRow}>
                  {isCompleted ? (
                    <TouchableOpacity
                      style={styles.viewCompletedBtn}
                      onPress={() => handleOpenInspection(order, true)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="visibility" size={16} color="#15803D" />
                      <Text style={styles.viewCompletedBtnText}>Xem biên bản & ảnh đối chiếu</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.inspectionBtn}
                      onPress={() => handleOpenInspection(order, false)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="fact-check" size={16} color="#FFFFFF" />
                      <Text style={styles.inspectionBtnText}>Nghiệm thu & Đối chiếu kho →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL NGHIỆM THU TRẢ KHO & ĐỐI CHIẾU HIỆN TRẠNG ─── */}
      <Modal
        visible={isInspectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsInspectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isViewingCompleted ? 'Biên Bản Nghiệm Thu & Ảnh Đối Chiếu' : 'Biên Bản Nghiệm Thu & Trả Kho'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedOrder?.contractCode} • Ô {selectedOrder?.unitCode}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsInspectionModalVisible(false)}
                style={styles.closeBtn}
              >
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Thông tin đối chiếu */}
              <View style={styles.inspectionSummaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Khách hàng:</Text>
                  <Text style={styles.summaryValue}>{selectedOrder?.customerName}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Số điện thoại:</Text>
                  <Text style={styles.summaryValue}>{selectedOrder?.phone}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Phân loại trả kho:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrder?.returnType === 'today'
                      ? 'Đúng hạn hôm nay'
                      : selectedOrder?.returnType === 'early'
                      ? 'Trả trước hạn'
                      : selectedOrder?.returnType === 'completed'
                      ? 'Đã hoàn tất thanh lý'
                      : `Quá hạn ${selectedOrder?.overdueDays} ngày`}
                  </Text>
                </View>
              </View>

              {/* Checklist kiểm tra hiện trường */}
              <Text style={styles.sectionTitle}>1. Kiểm tra hiện trường ô kho</Text>
              <TouchableOpacity
                style={styles.checklistItem}
                onPress={() => !isViewingCompleted && setItemsCleared(!itemsCleared)}
                activeOpacity={isViewingCompleted ? 1 : 0.7}
              >
                <MaterialIcons
                  name={itemsCleared ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={itemsCleared ? '#15803D' : '#94A3B8'}
                />
                <Text style={styles.checklistText}>
                  Khách đã dọn sạch toàn bộ đồ đạc khỏi ô kho (không để lại rác/đồ cũ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checklistItem}
                onPress={() => !isViewingCompleted && setSmartLockChecked(!smartLockChecked)}
                activeOpacity={isViewingCompleted ? 1 : 0.7}
              >
                <MaterialIcons
                  name={smartLockChecked ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={smartLockChecked ? '#15803D' : '#94A3B8'}
                />
                <Text style={styles.checklistText}>
                  Khóa thông minh Smart PIN nguyên vẹn, sẵn sàng thu hồi mã truy cập
                </Text>
              </TouchableOpacity>

              {/* ============================================================== */}
              {/* PHẦN 2: ĐỐI CHIẾU ẢNH HIỆN TRẠNG KHO TRƯỚC VÀ SAU KHI THUÊ     */}
              {/* ============================================================== */}
              <View style={styles.comparisonSectionCard}>
                <View style={styles.comparisonHeaderRow}>
                  <View style={styles.comparisonIconBox}>
                    <MaterialIcons name="compare" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.comparisonTitle}>2. Đối Chiếu Hiện Trạng Ô Kho</Text>
                    <Text style={styles.comparisonSubtitle}>
                      So sánh ảnh bàn giao ban đầu vs ảnh nghiệm thu trả kho hiện tại
                    </Text>
                  </View>
                </View>

                {/* --- A. ẢNH TRƯỚC KHI THUÊ (LÚC BÀN GIAO KHO) --- */}
                <View style={styles.subPhotoBlock}>
                  <View style={styles.subPhotoHeaderRow}>
                    <View style={styles.beforeBadge}>
                      <MaterialIcons name="history" size={13} color="#1D4ED8" />
                      <Text style={styles.beforeBadgeText}>TRƯỚC KHI THUÊ (LÚC BÀN GIAO)</Text>
                    </View>
                    <Text style={styles.subPhotoDateText}>
                      {selectedOrder?.handoverDate || selectedOrder?.startDate || '28/09/2026'}
                    </Text>
                  </View>

                  <View style={styles.handoverConditionBox}>
                    <MaterialIcons name="verified-user" size={14} color="#2563EB" />
                    <Text style={styles.handoverConditionText}>
                      <Text style={{ fontWeight: '700' }}>Tình trạng lúc bàn giao:</Text> {handoverCondition}
                    </Text>
                  </View>

                  {/* Danh sách ảnh chụp trước khi thuê */}
                  {handoverPhotos.length === 0 ? (
                    <View style={styles.emptyPhotoNotice}>
                      <Text style={styles.emptyPhotoText}>Chưa có ảnh bàn giao lưu trữ trong hệ thống</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                      {handoverPhotos.map((url, idx) => (
                        <TouchableOpacity
                          key={`before-${idx}`}
                          style={styles.photoThumbCard}
                          activeOpacity={0.85}
                          onPress={() => setPreviewImage(url)}
                        >
                          <Image source={{ uri: url }} style={styles.photoThumbnail} resizeMode="cover" />
                          <View style={styles.photoIndexBadge}>
                            <Text style={styles.photoIndexText}>Trước #{idx + 1}</Text>
                          </View>
                          <View style={styles.zoomIconOverlay}>
                            <MaterialIcons name="zoom-in" size={15} color="#FFFFFF" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Mũi tên chỉ dẫn đối chiếu */}
                <View style={styles.comparisonDividerRow}>
                  <View style={styles.comparisonLine} />
                  <View style={styles.comparisonArrowBadge}>
                    <MaterialIcons name="swap-vert" size={16} color="#2563EB" />
                    <Text style={styles.comparisonArrowText}>ĐỐI CHIẾU VỚI HIỆN TRẠNG TRẢ KHO</Text>
                  </View>
                  <View style={styles.comparisonLine} />
                </View>

                {/* --- B. ẢNH SAU KHI THUÊ (LÚC TRẢ KHO - ĐỐI CHIẾU) --- */}
                <View style={styles.subPhotoBlock}>
                  <View style={styles.subPhotoHeaderRow}>
                    <View style={styles.afterBadge}>
                      <MaterialIcons name="camera-alt" size={13} color="#7C3AED" />
                      <Text style={styles.afterBadgeText}>SAU KHI THUÊ</Text>
                    </View>
                    <Text style={styles.afterCountText}>
                      Đã chụp:{' '}
                      <Text style={{ fontWeight: '700', color: '#7C3AED' }}>{returnPhotos.length} ảnh</Text>
                    </Text>
                  </View>

                  {/* Nút chụp ảnh & chọn nhiều ảnh cùng 1 lần (chỉ hiện khi chưa thanh lý) */}
                  {!isViewingCompleted && (
                    <View style={{ gap: 8, marginBottom: 10 }}>
                      <View style={styles.actionPhotoRow}>
                        <TouchableOpacity
                          style={[styles.captureBtn, isCapturing && { opacity: 0.6 }]}
                          onPress={handleCapturePhoto}
                          disabled={isCapturing}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                          <Text style={styles.captureBtnText}>Chụp Ảnh Mới</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.galleryBtn, isCapturing && { opacity: 0.6 }]}
                          onPress={handlePickMultiplePhotos}
                          disabled={isCapturing}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="photo-library" size={16} color="#1D4ED8" />
                          <Text style={[styles.galleryBtnText, { color: '#1D4ED8', fontWeight: '700' }]}>
                            Chọn Nhiều Ảnh
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Nút mở Custom Modal chọn ảnh theo thiết kế app */}
                      <TouchableOpacity
                        style={styles.customModalLaunchBtn}
                        onPress={() => setShowMultiPhotoModal(true)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.customModalIconCircle}>
                          <MaterialIcons name="auto-awesome" size={16} color="#7C3AED" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.customModalBtnTitle}>Bộ Chọn Ảnh Nghiệm Thu Nâng Cao</Text>
                          <Text style={styles.customModalBtnSub}>Chọn 1 lần nhiều ảnh • Thư viện máy & Góc kho chuẩn</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="#7C3AED" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Danh sách ảnh sau khi thuê */}
                  {returnPhotos.length === 0 ? (
                    <View style={styles.emptyReturnPhotoDashed}>
                      <MaterialIcons name="add-a-photo" size={32} color="#94A3B8" />
                      <Text style={styles.emptyReturnPhotoTitle}>Chưa chụp ảnh đối chiếu trả kho</Text>
                      <Text style={styles.emptyReturnPhotoSub}>
                        Hãy chụp ảnh cửa kho, sàn nhà, vách tường và ổ khóa để đối chiếu với ảnh trước khi thuê.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                      {returnPhotos.map((photo, idx) => (
                        <View key={photo.id || `after-${idx}`} style={styles.photoThumbCard}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setPreviewImage(photo.uri)}
                            style={{ flex: 1 }}
                          >
                            <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} resizeMode="cover" />
                            <View style={[styles.photoIndexBadge, { backgroundColor: '#7C3AED' }]}>
                              <Text style={styles.photoIndexText}>Sau #{idx + 1}</Text>
                            </View>
                            <View style={styles.zoomIconOverlay}>
                              <MaterialIcons name="zoom-in" size={15} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                          {/* Nút xóa ảnh (chỉ khi đang nghiệm thu) */}
                          {!isViewingCompleted && (
                            <TouchableOpacity
                              style={styles.deletePhotoBtn}
                              onPress={() => handleDeletePhoto(photo.id)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialIcons name="close" size={12} color="#FFFFFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Đánh giá hiện trạng kho */}
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>3. Ghi nhận tình trạng ô kho</Text>
              <TextInput
                style={styles.inspectionInput}
                value={conditionText}
                onChangeText={setConditionText}
                editable={!isViewingCompleted}
                placeholder="Ghi nhận hiện trạng tường, sàn, cửa kho sau đối chiếu..."
                multiline
              />

              {/* Phí bồi thường hư hại (nếu có) */}
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>4. Phụ phí phát sinh (nếu có)</Text>
              <View style={styles.damageRow}>
                <Text style={styles.damageLabel}>Phí hư hại / vệ sinh phát sinh (VNĐ):</Text>
                <TextInput
                  style={styles.damageInput}
                  keyboardType="numeric"
                  value={damageFine}
                  onChangeText={setDamageFine}
                  editable={!isViewingCompleted}
                  placeholder="0"
                />
              </View>

              {/* Quyết toán phụ phí phát sinh */}
              <View style={styles.settlementCard}>
                <Text style={styles.settlementTitle}>Quyết Toán Phụ Phí Trả Kho</Text>

                <View style={styles.settleRow}>
                  <Text style={styles.settleLabel}>Tiền thuê hợp đồng:</Text>
                  <Text style={[styles.settleVal, { color: '#15803D' }]}>Đã cấn trừ cọc & thu đủ</Text>
                </View>

                {(selectedOrder?.overdueFine || 0) > 0 && (
                  <View style={styles.settleRow}>
                    <Text style={[styles.settleLabel, { color: '#DC2626' }]}>
                      Phạt trễ hạn ({selectedOrder?.overdueDays} ngày):
                    </Text>
                    <Text style={[styles.settleVal, { color: '#DC2626' }]}>
                      +{formatVND(selectedOrder?.overdueFine || 0)}
                    </Text>
                  </View>
                )}

                {parseInt(damageFine.replace(/\D/g, '') || '0', 10) > 0 && (
                  <View style={styles.settleRow}>
                    <Text style={[styles.settleLabel, { color: '#DC2626' }]}>Phí hư hại / vệ sinh:</Text>
                    <Text style={[styles.settleVal, { color: '#DC2626' }]}>
                      +{formatVND(parseInt(damageFine.replace(/\D/g, '') || '0', 10))}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                {(() => {
                  const damageNum = parseInt(damageFine.replace(/\D/g, '') || '0', 10);
                  const totalExtra = (selectedOrder?.overdueFine || 0) + damageNum;

                  return (
                    <View style={styles.settleRowTotal}>
                      <Text style={styles.totalLabel}>TỔNG PHỤ PHÍ THU THÊM:</Text>
                      <Text
                        style={[
                          styles.totalVal,
                          { color: totalExtra > 0 ? '#DC2626' : '#15803D' },
                        ]}
                      >
                        {totalExtra > 0 ? `+${formatVND(totalExtra)}` : '0 đ '}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Ghi chú thêm */}
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Ghi chú biên bản</Text>
              <TextInput
                style={styles.notesInput}
                value={notesText}
                onChangeText={setNotesText}
                editable={!isViewingCompleted}
                placeholder="Ghi chú thêm về hiện trạng hoặc phương thức thu phụ phí..."
              />
            </ScrollView>

            {/* Footer Nút bấm */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsInspectionModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelModalBtnText}>{isViewingCompleted ? 'Đóng' : 'Hủy'}</Text>
              </TouchableOpacity>

              {!isViewingCompleted && (
                <TouchableOpacity
                  style={[styles.confirmCheckoutBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleConfirmCheckout}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmCheckoutBtnText}>XÁC NHẬN TRẢ KHO</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL PHÓNG TO ẢNH ĐỐI CHIẾU (LIGHTBOX) ─── */}
      {previewImage && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.lightboxBackdrop}>
            <View style={styles.lightboxHeader}>
              <Text style={styles.lightboxTitle}>Ảnh Chi Tiết Hiện Trạng Kho</Text>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setPreviewImage(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.lightboxImageWrap}>
              <Image
                source={{ uri: previewImage }}
                style={styles.lightboxImg}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
      {/* ─── CUSTOM MODAL CHỌN NHIỀU ẢNH (ĐÚNG THIẾT KẾ APP) ─── */}
      <MultiPhotoPickerModal
        visible={showMultiPhotoModal}
        onClose={() => setShowMultiPhotoModal(false)}
        unitCode={selectedOrder?.unitCode}
        onPhotosSelected={handlePhotosFromCustomModal}
        existingPhotosCount={returnPhotos.length}
      />

      {/* ─── CUSTOM SUCCESS NOTIFICATION MODAL (THAY THẾ MODAL MẶC ĐỊNH ANDROID) ─── */}
      <InspectionSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        order={successModalData.order}
        totalExtraCharges={successModalData.totalExtraCharges}
        returnPhotosCount={successModalData.returnPhotosCount}
        onViewReportAgain={() => {
          if (successModalData.order) {
            handleOpenInspection(successModalData.order, true);
          }
        }}
      />

      {/* ─── CUSTOM ALERT / WARNING / ERROR DIALOG CHUẨN APP ─── */}
      <CustomAlertModal
        visible={alertModalConfig.visible}
        type={alertModalConfig.type}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        confirmText={alertModalConfig.confirmText}
        cancelText={alertModalConfig.cancelText}
        onConfirm={alertModalConfig.onConfirm}
        onCancel={alertModalConfig.onCancel}
        onClose={() => setAlertModalConfig((prev) => ({ ...prev, visible: false }))}
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
  orderCard: {
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
  orderCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.95,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contractCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  customerCol: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
  },
  unitBadgeCol: {
    alignItems: 'flex-end',
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  unitPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  unitTypeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  timeInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  timeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  timeValue: {
    fontSize: 12,
    color: '#334155',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: '#B45309',
    flex: 1,
  },
  photoCountBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  photoCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  photoCountText: {
    fontSize: 11,
    color: '#1E40AF',
  },
  financialBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  financialCol: {
    alignItems: 'flex-start',
  },
  finLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  finValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  rentSettledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginTop: 2,
  },
  rentSettledText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  refundHighlightValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  cardActionRow: {
    marginTop: 12,
  },
  inspectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  inspectionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewCompletedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  viewCompletedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  customModalLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 10,
  },
  customModalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customModalBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
  },
  customModalBtnSub: {
    fontSize: 10,
    color: '#9333EA',
    marginTop: 1,
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
  inspectionSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checklistText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },

  // ─── KHỐI ĐỐI CHIẾU ẢNH HIỆN TRẠNG ───
  comparisonSectionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    marginBottom: 10,
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  comparisonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  comparisonSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  subPhotoBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subPhotoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  beforeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  beforeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },
  subPhotoDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  handoverConditionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    padding: 8,
    gap: 6,
    marginBottom: 10,
  },
  handoverConditionText: {
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
    flex: 1,
  },
  photoScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  photoThumbCard: {
    position: 'relative',
    width: 105,
    height: 105,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoIndexBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  photoIndexText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoomIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  emptyPhotoNotice: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  emptyPhotoText: {
    fontSize: 11,
    color: '#64748B',
  },
  comparisonDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  comparisonLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  comparisonArrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginHorizontal: 8,
    gap: 4,
  },
  comparisonArrowText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  afterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  afterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  afterCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionPhotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  captureBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyReturnPhotoDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  emptyReturnPhotoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  emptyReturnPhotoSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── PHỤ PHÍ & GHI CHÚ ───
  inspectionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    minHeight: 50,
  },
  damageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
  },
  damageLabel: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  damageInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 100,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  settlementCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  settlementTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  settleLabel: {
    fontSize: 12,
    color: '#475569',
  },
  settleVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  settleRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmCheckoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  confirmCheckoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── LIGHTBOX MODAL ───
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lightboxCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  lightboxImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxImg: {
    width: '100%',
    height: '85%',
  },
});
