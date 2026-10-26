import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppNotification } from '../../api';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  role?: 'customer' | 'staff';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return 'Gần đây';
  }
}

function getNotificationVisuals(type: string) {
  const t = (type || '').toUpperCase();
  switch (t) {
    case 'PAYMENT':
      return {
        icon: 'payments' as const,
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        tag: 'THANH TOÁN',
      };
    case 'ACCESS':
      return {
        icon: 'vpn-key' as const,
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        tag: 'MÃ PIN & KHÓA',
      };
    case 'RESERVATION':
      return {
        icon: 'event-available' as const,
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        tag: 'ĐẶT GIỮ CHỖ',
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

export default function NotificationsModal({
  visible,
  onClose,
  notifications,
  unreadCount,
  isLoading,
  isRefreshing,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  role = 'customer',
}: NotificationsModalProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'payment' | 'access' | 'support'>('all');

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'unread') return !n.isRead;
      if (activeFilter === 'payment') return n.type === 'PAYMENT';
      if (activeFilter === 'access') return n.type === 'ACCESS';
      if (activeFilter === 'support') return n.type === 'SUPPORT';
      return true;
    });
  }, [notifications, activeFilter]);

  const handleCardPress = (item: AppNotification) => {
    if (!item.isRead) {
      onMarkAsRead(item.id);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={s.safeArea}>
        {/* Top Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back-ios" size={18} color="#1e293b" />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <View style={s.headerTitleRow}>
              <Text style={s.headerTitle}>Thông Báo</Text>
              {unreadCount > 0 && (
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.headerSubTitle}>
              {role === 'staff' ? 'Cổng Nhân viên vận hành cơ sở' : 'Cổng Khách hàng SelfStorage 24/7'}
            </Text>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity onPress={onMarkAllAsRead} style={s.readAllBtn} activeOpacity={0.75}>
              <MaterialIcons name="done-all" size={16} color="#2563eb" />
              <Text style={s.readAllText}>Đã đọc</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Filter Chips Bar */}
        <View style={s.filtersWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
            <TouchableOpacity
              style={[s.filterChip, activeFilter === 'all' && s.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[s.filterChipText, activeFilter === 'all' && s.filterChipTextActive]}>
                Tất cả ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.filterChip, activeFilter === 'unread' && s.filterChipActive]}
              onPress={() => setActiveFilter('unread')}
            >
              <View style={s.filterWithDot}>
                {unreadCount > 0 && <View style={s.chipUnreadDot} />}
                <Text style={[s.filterChipText, activeFilter === 'unread' && s.filterChipTextActive]}>
                  Chưa đọc ({unreadCount})
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.filterChip, activeFilter === 'payment' && s.filterChipActive]}
              onPress={() => setActiveFilter('payment')}
            >
              <Text style={[s.filterChipText, activeFilter === 'payment' && s.filterChipTextActive]}>
                💳 Giao dịch & Cọc
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.filterChip, activeFilter === 'access' && s.filterChipActive]}
              onPress={() => setActiveFilter('access')}
            >
              <Text style={[s.filterChipText, activeFilter === 'access' && s.filterChipTextActive]}>
                🔑 Mã PIN & Cửa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.filterChip, activeFilter === 'support' && s.filterChipActive]}
              onPress={() => setActiveFilter('support')}
            >
              <Text style={[s.filterChipText, activeFilter === 'support' && s.filterChipTextActive]}>
                🎧 Hỗ trợ sự cố
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Notification Cards List */}
        <ScrollView
          style={s.listScroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
        >
          {filteredNotifs.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}>
                <MaterialIcons name="notifications-none" size={40} color="#94a3b8" />
              </View>
              <Text style={s.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={s.emptySub}>
                {activeFilter === 'unread'
                  ? 'Tuyệt vời! Bạn đã đọc toàn bộ thông báo.'
                  : 'Mọi cập nhật về cọc kho, mã PIN và lịch hẹn sẽ được thông báo ngay tại đây.'}
              </Text>
              <TouchableOpacity style={s.emptyRefreshBtn} onPress={onRefresh}>
                <MaterialIcons name="refresh" size={16} color="#2563eb" />
                <Text style={s.emptyRefreshText}>Làm mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredNotifs.map((item) => {
              const visual = getNotificationVisuals(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.notifCard, !item.isRead && s.notifCardUnread]}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={0.85}
                >
                  <View style={[s.iconBox, { backgroundColor: visual.bg, borderColor: visual.border }]}>
                    <MaterialIcons name={visual.icon} size={22} color={visual.color} />
                  </View>

                  <View style={s.cardBody}>
                    <View style={s.cardMetaRow}>
                      <View style={[s.tagBadge, { backgroundColor: visual.bg }]}>
                        <Text style={[s.tagBadgeText, { color: visual.color }]}>{visual.tag}</Text>
                      </View>
                      <Text style={s.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                      {!item.isRead && <View style={s.unreadDot} />}
                    </View>

                    <Text style={[s.cardTitle, !item.isRead && s.cardTitleUnread]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={s.cardMessage}>{item.body}</Text>

                    <View style={s.cardFooter}>
                      {!item.isRead ? (
                        <TouchableOpacity
                          style={s.markReadMiniBtn}
                          onPress={() => onMarkAsRead(item.id)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="check" size={14} color="#2563eb" />
                          <Text style={s.markReadMiniText}>Đánh dấu đã đọc</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={s.readIndicator}>
                          <MaterialIcons name="check-circle" size={13} color="#94a3b8" />
                          <Text style={s.readIndicatorText}>Đã đọc</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => onDeleteNotification(item.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  readAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  filtersWrap: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifCardUnread: {
    backgroundColor: '#f8faff',
    borderColor: '#bfdbfe',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardBody: {
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 19,
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: '#0f172a',
  },
  cardMessage: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  markReadMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  markReadMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readIndicatorText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  emptyRefreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
});
