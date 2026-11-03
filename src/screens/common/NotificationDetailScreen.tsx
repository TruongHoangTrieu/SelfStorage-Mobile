import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AppNotification, getNotificationDetailApi } from '../../api';
import { formatVND, formatVietnameseDate } from '../../utils/formatters';

interface NotificationDetailScreenProps {
  notificationId: string;
  initialData?: AppNotification | null;
  onBack: () => void;
  onNavigateRelated?: (target: { tab: string; subTab?: string; entityId?: string }) => void;
  role?: 'customer' | 'staff';
}

function getNotificationVisuals(type?: string) {
  const t = (type || '').toUpperCase();
  switch (t) {
    case 'PAYMENT':
      return {
        icon: 'payment' as const,
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        tag: 'GIAO DỊCH',
      };
    case 'RESERVATION':
      return {
        icon: 'lock-clock' as const,
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#fed7aa',
        tag: 'ĐẶT CHỖ',
      };
    case 'ACCESS':
      return {
        icon: 'key' as const,
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        tag: 'TRUY CẬP',
      };
    case 'RENEWAL':
      return {
        icon: 'autorenew' as const,
        color: '#db2777',
        bg: '#fdf2f8',
        border: '#fbcfe8',
        tag: 'GIA HẠN',
      };
    case 'SUPPORT':
      return {
        icon: 'support-agent' as const,
        color: '#7c3aed',
        bg: '#f5f3ff',
        border: '#ddd6fe',
        tag: 'HỖ TRỢ',
      };
    case 'CONTRACT':
      return {
        icon: 'description' as const,
        color: '#0284c7',
        bg: '#f0f9ff',
        border: '#bae6fd',
        tag: 'HỢP ĐỒNG',
      };
    default:
      return {
        icon: 'notifications' as const,
        color: '#475569',
        bg: '#f8fafc',
        border: '#e2e8f0',
        tag: 'HỆ THỐNG',
      };
  }
}

function formatDetailTime(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

export default function NotificationDetailScreen({
  notificationId,
  initialData,
  onBack,
  onNavigateRelated,
  role = 'customer',
}: NotificationDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24));

  const [loading, setLoading] = useState<boolean>(!initialData);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloudApiPending, setIsCloudApiPending] = useState<boolean>(false);
  const [notification, setNotification] = useState<(AppNotification & { relatedEntity?: any }) | null>(
    (initialData as any) || null
  );

  useEffect(() => {
    if (initialData && !notification) {
      setNotification(initialData as any);
    }
  }, [initialData]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!notification && !initialData) {
      setLoading(true);
    }
    setError(null);
    setIsCloudApiPending(false);

    try {
      const res = await getNotificationDetailApi(notificationId);
      setNotification(res);
    } catch (err: any) {
      const msg = err?.message || '';
      // Nếu đã có initialData trong bộ nhớ, không chặn màn hình bằng lỗi đỏ
      if (initialData || notification) {
        setIsCloudApiPending(true);
      } else {
        const friendlyMsg = msg.includes('Cannot GET')
          ? 'Máy chủ Backend đang khởi động lại hoặc chưa cập nhật tuyến đường chi tiết thông báo.'
          : (msg || 'Không thể lấy thông tin chi tiết thông báo từ máy chủ.');
        setError(friendlyMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (notificationId) {
      loadData();
    }
  }, [notificationId]);

  const visuals = getNotificationVisuals(notification?.type || notification?.entityType);
  const entity = notification?.relatedEntity;

  const handleRelatedAction = () => {
    if (!onNavigateRelated) return;
    const type = String(notification?.type || notification?.entityType || '').toUpperCase();

    if (role === 'staff') {
      if (type.includes('SUPPORT')) {
        onNavigateRelated({ tab: 'support' });
      } else if (type.includes('CHECKOUT')) {
        onNavigateRelated({ tab: 'checkout' });
      } else if (type.includes('RESERVATION') || type.includes('HANDOVER')) {
        onNavigateRelated({ tab: 'queue' });
      } else {
        onNavigateRelated({ tab: 'dashboard' });
      }
      return;
    }

    // Role customer
    if (type.includes('PAYMENT')) {
      onNavigateRelated({ tab: 'my_units', subTab: 'payments' });
    } else if (type.includes('SUPPORT')) {
      onNavigateRelated({ tab: 'my_units', subTab: 'support' });
    } else if (type.includes('CONTRACT') || type.includes('RENEWAL')) {
      onNavigateRelated({ tab: 'my_units', subTab: 'documents' });
    } else if (type.includes('ACCESS')) {
      onNavigateRelated({ tab: 'my_units', subTab: 'access' });
    } else if (type.includes('RESERVATION')) {
      onNavigateRelated({ tab: 'my_units', subTab: 'my_units' });
    } else {
      onNavigateRelated({ tab: 'my_units' });
    }
  };

  return (
    <View style={s.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Wrapper with Safe Area Inset Padding */}
      <View style={[s.headerWrapper, { paddingTop: topInset }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="arrow-back-ios" size={18} color="#1e293b" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerSubtitle}>TRUNG TÂM THÔNG BÁO</Text>
            <Text style={s.headerTitle} numberOfLines={1}>Chi Tiết Thông Báo</Text>
          </View>
          <TouchableOpacity onPress={() => loadData(true)} style={s.refreshBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="refresh" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Đang tải chi tiết thông báo từ máy chủ...</Text>
        </View>
      ) : error && !notification ? (
        <View style={s.centerBox}>
          <View style={s.errorIconCircle}>
            <MaterialIcons name="error-outline" size={36} color="#ef4444" />
          </View>
          <Text style={s.errorTitle}>Lỗi nạp dữ liệu</Text>
          <Text style={s.errorSub}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => loadData()} activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={16} color="#ffffff" />
            <Text style={s.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : notification ? (
        <ScrollView
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
        >
          {/* Notice if cloud backend hasn't been deployed yet */}
          {isCloudApiPending && (
            <View style={s.fallbackBanner}>
              <MaterialIcons name="cloud-queue" size={18} color="#0369a1" />
              <Text style={s.fallbackBannerText}>
                Máy chủ Cloud (Render) đang cập nhật phiên bản mới. Đang hiển thị dữ liệu thông báo từ phiên làm việc hiện tại.
              </Text>
            </View>
          )}

          {/* Main Info Card */}
          <View style={s.card}>
            {/* Meta Row */}
            <View style={s.metaRow}>
              <View style={[s.badgeTag, { backgroundColor: visuals.bg, borderColor: visuals.border }]}>
                <MaterialIcons name={visuals.icon} size={14} color={visuals.color} style={{ marginRight: 4 }} />
                <Text style={[s.badgeTagText, { color: visuals.color }]}>{visuals.tag}</Text>
              </View>

              <View style={s.readStatus}>
                <View style={[s.statusDot, { backgroundColor: notification.isRead ? '#10b981' : '#2563eb' }]} />
                <Text style={[s.statusText, { color: notification.isRead ? '#10b981' : '#2563eb' }]}>
                  {notification.isRead ? 'Đã xem' : 'Mới'}
                </Text>
              </View>
            </View>

            {/* Notification Title */}
            <Text style={s.title}>{notification.title}</Text>

            {/* Time */}
            <View style={s.timeRow}>
              <MaterialIcons name="schedule" size={14} color="#94a3b8" />
              <Text style={s.timeText}>{formatDetailTime(notification.createdAt)}</Text>
            </View>

            {/* Notification Message */}
            <View style={s.bodyBox}>
              <Text style={s.bodyText}>{notification.body}</Text>
            </View>

            {/* Entity Reference Code (if present) */}
            {Boolean(notification.entityId) && (
              <View style={s.refRow}>
                <Text style={s.refLabel}>Mã định danh liên kết:</Text>
                <Text style={s.refCode}>{notification.entityId}</Text>
              </View>
            )}
          </View>

          {/* Related Entity Data Section (Live from API) */}
          {entity ? (
            <View style={s.entitySection}>
              <View style={s.sectionHeader}>
                <MaterialIcons name="dns" size={18} color="#1e293b" />
                <Text style={s.sectionTitle}>Thông Tin Đối Tượng Liên Quan</Text>
              </View>

              {/* PAYMENT DATA */}
              {entity.paymentCode || entity.amount !== undefined ? (
                <View style={s.entityCard}>
                  <View style={s.entityCardHeader}>
                    <Text style={s.entityCardType}>HÓA ĐƠN & GIAO DỊCH</Text>
                    <View
                      style={[
                        s.entityStatusBadge,
                        {
                          backgroundColor:
                            entity.status === 'COMPLETED'
                              ? '#dcfce7'
                              : entity.status === 'PENDING'
                              ? '#fef3c7'
                              : '#fee2e2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.entityStatusText,
                          {
                            color:
                              entity.status === 'COMPLETED'
                                ? '#166534'
                                : entity.status === 'PENDING'
                                ? '#92400e'
                                : '#991b1b',
                          },
                        ]}
                      >
                        {entity.status === 'COMPLETED'
                          ? 'Đã Thanh Toán'
                          : entity.status === 'PENDING'
                          ? 'Chờ Thanh Toán'
                          : 'Thất Bại'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Mã giao dịch:</Text>
                    <Text style={s.infoValueBold}>{entity.paymentCode || entity.id}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Số tiền:</Text>
                    <Text style={[s.infoValueBold, { color: '#16a34a', fontSize: 16 }]}>
                      {formatVND(entity.amount)}
                    </Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Loại thanh toán:</Text>
                    <Text style={s.infoValue}>
                      {entity.paymentType === 'DEPOSIT'
                        ? 'Tiền cọc bảo đảm'
                        : entity.paymentType === 'RENTAL' || entity.paymentType === 'FIRST_MONTH'
                        ? 'Tiền thuê kỳ đầu'
                        : entity.paymentType === 'RENEWAL'
                        ? 'Gia hạn hợp đồng'
                        : entity.paymentType === 'EXTRA_CHARGE'
                        ? 'Phí phát sinh / dịch vụ phụ trợ'
                        : entity.paymentType || 'Thanh toán'}
                    </Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Phương thức:</Text>
                    <Text style={s.infoValue}>
                      {entity.paymentMethod === 'SEPAY_QR' || entity.paymentMethod === 'VNPAY'
                        ? 'Cổng thanh toán tự động (VietQR / Chuyển khoản)'
                        : entity.paymentMethod === 'CASH'
                        ? 'Tiền mặt tại quầy cơ sở'
                        : entity.paymentMethod || 'Chuyển khoản'}
                    </Text>
                  </View>

                  {entity.paidAt && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Thời gian thanh toán:</Text>
                      <Text style={s.infoValue}>{formatDetailTime(entity.paidAt)}</Text>
                    </View>
                  )}

                  {entity.transactionReference && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Mã tham chiếu ngân hàng:</Text>
                      <Text style={s.infoValue}>{entity.transactionReference}</Text>
                    </View>
                  )}

                  {/* Connected Reservation or Contract */}
                  {entity.reservation && (
                    <View style={s.subEntityBox}>
                      <Text style={s.subEntityTitle}>Đơn Đặt Chỗ Gốc</Text>
                      <Text style={s.subEntityText}>
                        Mã đơn: #{entity.reservation.reservationCode}
                      </Text>
                      {entity.reservation.facility && (
                        <Text style={s.subEntityText}>
                          Cơ sở: {entity.reservation.facility.name}
                        </Text>
                      )}
                    </View>
                  )}

                  {entity.contract && (
                    <View style={s.subEntityBox}>
                      <Text style={s.subEntityTitle}>Hợp Đồng Thuê Kho</Text>
                      <Text style={s.subEntityText}>
                        Mã HĐ: #{entity.contract.contractCode}
                      </Text>
                      {entity.contract.contractItems?.length > 0 && (
                        <Text style={s.subEntityText}>
                          Buồng kho: {entity.contract.contractItems.map((ci: any) => ci.unit?.unitCode).filter(Boolean).join(', ')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {/* SUPPORT REQUEST DATA */}
              {entity.requestCode || entity.subject ? (
                <View style={s.entityCard}>
                  <View style={s.entityCardHeader}>
                    <Text style={s.entityCardType}>PHIẾU YÊU CẦU HỖ TRỢ</Text>
                    <View
                      style={[
                        s.entityStatusBadge,
                        {
                          backgroundColor:
                            entity.status === 'RESOLVED' || entity.status === 'CLOSED'
                              ? '#dcfce7'
                              : entity.status === 'IN_PROGRESS'
                              ? '#eff6ff'
                              : '#fef3c7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.entityStatusText,
                          {
                            color:
                              entity.status === 'RESOLVED' || entity.status === 'CLOSED'
                                ? '#166534'
                                : entity.status === 'IN_PROGRESS'
                                ? '#1d4ed8'
                                : '#92400e',
                          },
                        ]}
                      >
                        {entity.status === 'OPEN'
                          ? 'Mới Tiếp Nhận'
                          : entity.status === 'IN_PROGRESS'
                          ? 'Đang Xử Lý'
                          : entity.status === 'RESOLVED'
                          ? 'Đã Giải Quyết'
                          : 'Đã Đóng'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Mã phiếu:</Text>
                    <Text style={s.infoValueBold}>#{entity.requestCode || entity.id}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Tiêu đề:</Text>
                    <Text style={s.infoValueBold}>{entity.subject}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Phân loại:</Text>
                    <Text style={s.infoValue}>{entity.category || 'Hỗ trợ chung'}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Mức độ ưu tiên:</Text>
                    <Text style={s.infoValue}>{entity.priority || 'Trung bình'}</Text>
                  </View>

                  {entity.facility && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Cơ sở kho:</Text>
                      <Text style={s.infoValue}>{entity.facility.name}</Text>
                    </View>
                  )}

                  {entity.description && (
                    <View style={s.subEntityBox}>
                      <Text style={s.subEntityTitle}>Nội Dung Khách Hàng Phản Ánh</Text>
                      <Text style={s.subEntityText}>{entity.description}</Text>
                    </View>
                  )}

                  {entity.logs && entity.logs.length > 0 && (
                    <View style={s.subEntityBox}>
                      <Text style={s.subEntityTitle}>Nhật Ký Phản Hồi Từ Kỹ Thuật Viên</Text>
                      {entity.logs.slice(0, 3).map((l: any, idx: number) => (
                        <View key={idx} style={{ marginTop: 6, paddingBottom: 6, borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: '#e2e8f0' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>
                            {l.user?.fullName || 'Bộ phận kỹ thuật'} ({formatDetailTime(l.createdAt)})
                          </Text>
                          <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{l.message || l.notes}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {/* RESERVATION DATA */}
              {entity.reservationCode ? (
                <View style={s.entityCard}>
                  <View style={s.entityCardHeader}>
                    <Text style={s.entityCardType}>ĐƠN ĐẶT TRƯỚC KHO</Text>
                    <View style={[s.entityStatusBadge, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[s.entityStatusText, { color: '#92400e' }]}>
                        {entity.status}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Mã đặt chỗ:</Text>
                    <Text style={s.infoValueBold}>#{entity.reservationCode}</Text>
                  </View>

                  {entity.facility && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Cơ sở:</Text>
                      <Text style={s.infoValue}>{entity.facility.name}</Text>
                    </View>
                  )}

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Thời gian thuê:</Text>
                    <Text style={s.infoValue}>{entity.rentalPeriod} {entity.rentalPeriodUnit || 'tháng'}</Text>
                  </View>

                  {entity.appointmentDate && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Lịch hẹn nhận kho:</Text>
                      <Text style={s.infoValue}>{formatDetailTime(entity.appointmentDate)}</Text>
                    </View>
                  )}

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Tổng cọc / phí:</Text>
                    <Text style={[s.infoValueBold, { color: '#16a34a' }]}>{formatVND(entity.totalAmount)}</Text>
                  </View>
                </View>
              ) : null}

              {/* CONTRACT DATA */}
              {entity.contractCode ? (
                <View style={s.entityCard}>
                  <View style={s.entityCardHeader}>
                    <Text style={s.entityCardType}>HỢP ĐỒNG THUÊ KHO</Text>
                    <View style={[s.entityStatusBadge, { backgroundColor: '#eff6ff' }]}>
                      <Text style={[s.entityStatusText, { color: '#1d4ed8' }]}>
                        {entity.status}
                      </Text>
                    </View>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Mã hợp đồng:</Text>
                    <Text style={s.infoValueBold}>#{entity.contractCode}</Text>
                  </View>

                  {entity.startDate && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Ngày bắt đầu:</Text>
                      <Text style={s.infoValue}>{formatVietnameseDate(entity.startDate)}</Text>
                    </View>
                  )}

                  {entity.endDate && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Ngày kết thúc:</Text>
                      <Text style={s.infoValue}>{formatVietnameseDate(entity.endDate)}</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : notification.entityId ? (
            <View style={s.entitySection}>
              <View style={s.sectionHeader}>
                <MaterialIcons name="info-outline" size={18} color="#64748b" />
                <Text style={s.sectionTitle}>Đối Tượng Tham Chiếu</Text>
              </View>
              <View style={s.entityCard}>
                <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 19 }}>
                  Thông báo này được liên kết với mã tham chiếu #{notification.entityId}. Bạn có thể bấm vào nút bên dưới để mở giao diện quản lý liên quan.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={s.actionRow}>
            {onNavigateRelated && (
              <TouchableOpacity
                style={s.primaryActionBtn}
                onPress={handleRelatedAction}
                activeOpacity={0.85}
              >
                <Text style={s.primaryActionText}>
                  {notification.type === 'PAYMENT'
                    ? 'Xem Trong Lịch Sử Thanh Toán'
                    : notification.type === 'SUPPORT'
                    ? 'Xem Trong Phiếu Hỗ Trợ'
                    : notification.type === 'CONTRACT' || notification.type === 'RENEWAL'
                    ? 'Xem Hồ Sơ Hợp Đồng'
                    : notification.type === 'ACCESS'
                    ? 'Quản Lý Mã PIN Buồng Kho'
                    : role === 'staff'
                    ? 'Đến Bảng Điều Khiển Xử Lý'
                    : 'Đến Mục Quản Lý Liên Quan'}
                </Text>
                <MaterialIcons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.secondaryActionBtn} onPress={onBack} activeOpacity={0.8}>
              <Text style={s.secondaryActionText}>Quay Lại Danh Sách</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  fallbackBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 17,
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  readStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  bodyBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bodyText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  refLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  refCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  entitySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  entityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  entityCardType: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  entityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entityStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 12.5,
    color: '#1e293b',
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  subEntityBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
  },
  subEntityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  subEntityText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  actionRow: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
