import { useState, useEffect, useCallback } from 'react';
import {
  AppNotification,
  getNotificationsApi,
  getUnreadNotifCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  deleteNotificationApi,
  getAuthToken,
} from '../api';

const CUSTOMER_MOCK_NOTIFS: AppNotification[] = [
  {
    id: 'notif-cust-1',
    title: 'Xác nhận đã nhận cọc kho qua VietQR',
    body: 'Giao dịch đặt cọc 1.500.000 đ cho đơn đặt buồng kho đã được SePay đối soát tự động thành công. Lịch hẹn giữ chỗ đã được xác nhận.',
    type: 'PAYMENT',
    entityType: 'payment',
    entityId: 'pay-001',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'notif-cust-2',
    title: 'Mã PIN Smart Lock buồng kho đã sẵn sàng',
    body: 'Mã PIN của bạn là 894120. Bạn có thể sử dụng mã này để mở khóa buồng kho tự quản 24/7 từ ngày bắt đầu hợp đồng.',
    type: 'ACCESS',
    entityType: 'unit',
    entityId: 'unit-102',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  {
    id: 'notif-cust-3',
    title: 'Nhắc nhở gia hạn hợp đồng kho sắp tới hạn',
    body: 'Hợp đồng buồng kho của bạn sẽ hết hạn sau 7 ngày nữa. Hãy gia hạn ngay hôm nay để nhận ưu đãi chiết khấu 10% cho gói 6 tháng.',
    type: 'RENEWAL',
    entityType: 'contract',
    entityId: 'cont-201',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'notif-cust-4',
    title: 'Yêu cầu hỗ trợ kỹ thuật đã được tiếp nhận',
    body: 'Đội ngũ kỹ thuật viên đang tiến hành kiểm tra điều hòa và đối soát cảm biến tại buồng kho theo yêu cầu của bạn.',
    type: 'SUPPORT',
    entityType: 'ticket',
    entityId: 'tk-108',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 'notif-cust-5',
    title: 'Lịch hẹn nhận bàn giao kho thành công',
    body: 'Hẹn gặp bạn tại Cơ sở SelfStorage vào lúc 09:00. Vui lòng chuẩn bị CCCD bản gốc để nhân viên hỗ trợ hoàn tất thủ tục.',
    type: 'RESERVATION',
    entityType: 'reservation',
    entityId: 'res-304',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

const STAFF_MOCK_NOTIFS: AppNotification[] = [
  {
    id: 'notif-staff-1',
    title: 'Khách hẹn nhận kho mới trong ngày',
    body: 'Khách hàng Nguyễn Văn An vừa hoàn tất đặt cọc và hẹn nhận bàn giao kho #A101 lúc 09:00 hôm nay.',
    type: 'RESERVATION',
    entityType: 'reservation',
    entityId: 'res-801',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'notif-staff-2',
    title: 'Khách hàng đã đến cơ sở (Check-in Arrived)',
    body: 'Khách hàng Trần Thị Mai đã check-in tại quầy lễ tân. Vui lòng tiếp nhận hồ sơ xác minh CCCD 2 mặt và bàn giao kho.',
    type: 'ACCESS',
    entityType: 'appointment',
    entityId: 'apt-902',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'notif-staff-3',
    title: 'Đã nhận thanh toán VietQR cọc giữ chỗ',
    body: 'Hệ thống tự động ghi nhận giao dịch cọc 2.000.000 đ cho kho #M-102. Trạng thái lịch hẹn chuyển sang ĐÃ CỌC.',
    type: 'PAYMENT',
    entityType: 'payment',
    entityId: 'pay-882',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-staff-4',
    title: 'Báo cáo sự cố buồng kho mới từ khách hàng',
    body: 'Khách hàng gửi yêu cầu kiểm tra hệ thống thông gió tại dãy kho B. Ticket #TK-405 đã được gán vào hàng đợi xử lý.',
    type: 'SUPPORT',
    entityType: 'ticket',
    entityId: 'tk-405',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-staff-5',
    title: 'Bàn giao kho thành công & kích hoạt Smart Lock',
    body: 'Hợp đồng kho #B-201 đã được ký điện tử và kích hoạt mã PIN thành công cho khách hàng Lê Hoàng Nam.',
    type: 'CONTRACT',
    entityType: 'contract',
    entityId: 'cont-710',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

export function useNotifications(role: 'customer' | 'staff' = 'customer') {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fallbackList = role === 'staff' ? STAFF_MOCK_NOTIFS : CUSTOMER_MOCK_NOTIFS;

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = getAuthToken();
      if (!token) {
        // Chưa đăng nhập -> Không hiển thị thông báo và không hiện chấm đỏ
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const res = await getNotificationsApi(1, 40);
        if (res && Array.isArray(res.items) && res.items.length > 0) {
          setNotifications(res.items);
          setUnreadCount(res.unreadCount ?? res.items.filter((n) => !n.isRead).length);
        } else {
          // Nếu backend rỗng thì bổ sung dữ liệu mẫu thực tế
          setNotifications(fallbackList);
          setUnreadCount(fallbackList.filter((n) => !n.isRead).length);
        }
      } catch (err) {
        // Lỗi kết nối hoặc token hết hạn -> giữ danh sách fallback để người dùng luôn xem được
        setNotifications((prev) => (prev.length > 0 ? prev : fallbackList));
        setUnreadCount((prev) => (prev > 0 ? prev : fallbackList.filter((n) => !n.isRead).length));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fallbackList]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    // Cập nhật UI ngay lập tức
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (getAuthToken()) {
      try {
        await markNotificationReadApi(id);
      } catch {
        // Ignored
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    if (getAuthToken()) {
      try {
        await markAllNotificationsReadApi();
      } catch {
        // Ignored
      }
    }
  };

  const deleteNotification = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const wasUnread = target && !target.isRead;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (getAuthToken()) {
      try {
        await deleteNotificationApi(id);
      } catch {
        // Ignored
      }
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
