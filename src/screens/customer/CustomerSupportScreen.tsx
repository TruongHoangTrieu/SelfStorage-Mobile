import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomerRentedUnit } from '../../types/customerStorage';
import CustomerBottomNavBar, { CustomerTabType } from '../../components/customer/CustomerBottomNavBar';
import {
  fetchMySupportRequestsApi,
  createSupportRequestApi,
  addTicketNoteApi,
} from '../../api';
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  CapturedPhoto,
} from '../../services/imageService';

// Design Tokens (Đồng bộ nhận diện Stitch xanh dương & nền sáng)
const T = {
  primary: '#1d4ed8',
  primaryContainer: '#2563eb',
  bg: '#f7f9fd',
  surface: '#ffffff',
  surfaceLow: '#f1f5f9',
  border: '#e2e8f0',
  textMain: '#131b2e',
  textMuted: '#64748b',
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  emeraldText: '#047857',
  amberBg: '#fffbeb',
  amberText: '#b45309',
  blueBg: '#eff6ff',
  blueText: '#1d4ed8',
};

interface CustomerSupportScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits?: () => void;
  onOpenSidebar?: () => void;
  onOpenReportIssue?: (unit: CustomerRentedUnit) => void;
  onOpenLogin?: () => void;
  currentUser?: any;
  onNavigateBottomTab?: (tab: CustomerTabType) => void;
}

export default function CustomerSupportScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
  onOpenReportIssue,
  onOpenLogin,
  currentUser,
  onNavigateBottomTab,
}: CustomerSupportScreenProps) {
  // Trạng thái phiếu hỗ trợ từ Backend
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Modal tạo phiếu mới
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    units[0]?.unitCode || ''
  );
  const [category, setCategory] = useState<string>('LOCK');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('HIGH');
  const [supportPhotos, setSupportPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCapturePhoto = async () => {
    setIsCapturingPhoto(true);
    const photo = await takePhotoWithCamera();
    if (photo) setSupportPhotos((prev) => [...prev, photo]);
    setIsCapturingPhoto(false);
  };

  const handlePickPhoto = async () => {
    setIsCapturingPhoto(true);
    const photo = await pickPhotoFromGallery();
    if (photo) setSupportPhotos((prev) => [...prev, photo]);
    setIsCapturingPhoto(false);
  };

  const handleRemovePhoto = (id: string) => {
    setSupportPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Modal chi tiết phiếu & phản hồi
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Tải danh sách phiếu
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMySupportRequestsApi();
      if (Array.isArray(data)) {
        setTickets(data);
      }
    } catch (err: any) {
      console.warn('Load tickets notice:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Tạo phiếu mới
  const handleCreateTicket = async () => {
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả sự cố.');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedUnit = units.find((u) => u.unitCode === selectedUnitCode) || units[0];
      await createSupportRequestApi({
        facilityId: matchedUnit?.facilityId || '6ac4ea732f3017f8106ae7a6',
        contractItemId: matchedUnit?.contractItemId,
        category,
        subject: subject.trim() || `Sự cố ô kho #${selectedUnitCode || 'Chung'}`,
        description: description.trim(),
        priority,
        photos: supportPhotos.map((p) => p.base64 || p.uri),
      });

      setShowCreateModal(false);
      setSubject('');
      setDescription('');
      setSupportPhotos([]);
      Alert.alert('Thành công', 'Đã gửi phiếu hỗ trợ. Kỹ thuật viên sẽ xử lý sớm nhất!');
      loadTickets();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo phiếu hỗ trợ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi phản hồi vào phiếu
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setIsSendingReply(true);
    try {
      await addTicketNoteApi(selectedTicket.id, replyText.trim());
      setReplyText('');
      // Cập nhật log cục bộ
      setSelectedTicket((prev: any) => ({
        ...prev,
        notes: [
          ...(prev?.notes || []),
          {
            content: replyText.trim(),
            author: 'Khách hàng',
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      loadTickets();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi phản hồi.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'RESOLVED' || s === 'CLOSED') {
      return { label: 'Đã xử lý', bg: T.emeraldBg, color: T.emeraldText };
    }
    if (s === 'IN_PROGRESS' || s === 'PROCESSING') {
      return { label: 'Đang xử lý', bg: T.blueBg, color: T.blueText };
    }
    return { label: 'Mới tiếp nhận', bg: T.amberBg, color: T.amberText };
  };

  const categories = [
    { id: 'LOCK', label: '🔐 Khóa PIN' },
    { id: 'UNIT', label: '💡 Thiết bị kho' },
    { id: 'DAMAGE', label: '🌧️ Thấm dột' },
    { id: 'OTHER', label: '❓ Khác' },
  ];

  const faqs = [
    {
      q: 'Mở cửa kho như thế nào?',
      a: 'Vào mục "Kho của tôi", lấy mã PIN 6 số rồi bấm trên bàn phím khóa điện tử Smart Lock kèm phím # để mở chốt an toàn.',
    },
    {
      q: 'Có thể chia sẻ mã mở cửa cho người thân hoặc nhân viên?',
      a: 'Hoàn toàn được. Tại trang "Kho của tôi", bạn chọn "Tạo PIN Khách" để cấp mã tạm thời có hạn dùng cho người giao nhận hàng.',
    },
    {
      q: 'Kho tự quản mở cửa vào các khung giờ nào?',
      a: 'Toàn bộ cơ sở SelfStorage mở cửa 24/7/365. Hệ thống an ninh, camera AI và điều hòa bảo quản luôn hoạt động liên tục.',
    },
    {
      q: 'Làm gì khi quên mã PIN hoặc khóa báo pin yếu?',
      a: 'Bạn có thể xem mã PIN trực tiếp trên màn hình "Kho của tôi" hoặc bấm nút "Gửi Yêu Cầu Hỗ Trợ" / gọi Tổng đài 1900 6868 để kỹ thuật viên mở chốt khẩn cấp.',
    },
  ];

  return (
    <View style={s.container}>
      {/* ─── Top Header Đồng bộ Logo Web ─── */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onOpenSidebar && (
            <TouchableOpacity onPress={onOpenSidebar} style={s.iconBtn}>
              <MaterialIcons name="menu" size={24} color={T.textMain} />
            </TouchableOpacity>
          )}
          <Image
            source={require('../../../assets/logo.png')}
            style={s.topLogoImg}
            resizeMode="contain"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={loadTickets} style={s.iconBtn}>
            <MaterialIcons name="refresh" size={22} color={isLoading ? T.primary : T.textMuted} />
          </TouchableOpacity>
          {onOpenLogin && (
            <TouchableOpacity
              style={s.loginHeaderBtn}
              onPress={onOpenLogin}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={currentUser ? 'account-circle' : 'person-outline'}
                size={16}
                color={currentUser ? T.primary : T.textMain}
              />
              <Text style={s.loginHeaderText} numberOfLines={1}>
                {currentUser
                  ? currentUser.fullName
                    ? currentUser.fullName.split(' ').slice(-1)[0]
                    : 'Tài khoản'
                  : 'Đăng nhập'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.contentScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadTickets} />}
      >
        {/* ─── Hero Banner CSKH ─── */}
        <View style={s.heroBanner}>
          <View style={s.heroBannerContent}>
            <View style={s.heroTag}>
              <MaterialIcons name="headset-mic" size={13} color="#ffffff" />
              <Text style={s.heroTagText}>TRUNG TÂM CSKH 24/7</Text>
            </View>
            <Text style={s.heroTitle}>Hỗ Trợ & Khiếu Nại Kỹ Thuật</Text>
            <Text style={s.heroDesc}>
              Đội ngũ kỹ thuật túc trực 24/7 xử lý sự cố mở khoá PIN, điều hòa buồng kho và giải đáp hợp đồng.
            </Text>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.88}
            >
              <MaterialIcons name="add-circle" size={18} color="#ffffff" />
              <Text style={s.createBtnText}>Gửi Yêu Cầu Hỗ Trợ Mới</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2 Kênh Liên Hệ Nhanh ─── */}
        <View style={s.contactRow}>
          <TouchableOpacity
            style={s.contactBtn}
            onPress={() => Linking.openURL('tel:19006868')}
            activeOpacity={0.8}
          >
            <View style={s.contactIconWrapPhone}>
              <MaterialIcons name="phone" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactLabel}>Hotline Khẩn Cấp</Text>
              <Text style={s.contactVal}>1900 6868</Text>
              <Text style={s.contactSub}>Miễn phí 24/7</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.contactBtn}
            onPress={() => Linking.openURL('https://zalo.me')}
            activeOpacity={0.8}
          >
            <View style={s.contactIconWrapChat}>
              <MaterialIcons name="chat" size={20} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactLabel}>Kỹ Thuật Viên</Text>
              <Text style={s.contactVal}>Chat Zalo Trực Tuyến</Text>
              <Text style={s.contactSub}>Phản hồi tức thì</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Danh sách Phiếu Của Bạn ─── */}
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="receipt-long" size={18} color={T.primary} />
            <Text style={s.sectionTitle}>Phiếu Hỗ Trợ Của Bạn</Text>
          </View>
          <View style={s.ticketCountBadge}>
            <Text style={s.ticketCountText}>{tickets.length} phiếu</Text>
          </View>
        </View>

        {tickets.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconCircle}>
              <MaterialIcons name="support-agent" size={32} color={T.primary} />
            </View>
            <Text style={s.emptyTitle}>Chưa có yêu cầu hỗ trợ nào</Text>
            <Text style={s.emptySub}>
              Khi cần trợ giúp về khóa PIN, thiết bị buồng kho hoặc hợp đồng, bấm nút gửi yêu cầu phía trên.
            </Text>
          </View>
        ) : (
          tickets.map((t) => {
            const badge = getStatusBadge(t.status);
            return (
              <TouchableOpacity
                key={t.id}
                style={s.ticketCard}
                onPress={() => setSelectedTicket(t)}
                activeOpacity={0.8}
              >
                <View style={s.ticketCardTop}>
                  <View style={s.ticketCodePill}>
                    <Text style={s.ticketCode}>#{t.requestCode || t.id.slice(-8).toUpperCase()}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={s.ticketSubject} numberOfLines={1}>
                  {t.subject || t.title || 'Yêu cầu hỗ trợ buồng kho'}
                </Text>
                <Text style={s.ticketDesc} numberOfLines={2}>
                  {t.description}
                </Text>

                <View style={s.ticketFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="schedule" size={13} color={T.textMuted} />
                    <Text style={s.ticketTime}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                    </Text>
                  </View>
                  <Text style={s.viewDetailText}>Chi tiết & Phản hồi →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ─── FAQ Accordions Hiện Đại ─── */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="help-outline" size={18} color={T.primary} />
            <Text style={s.sectionTitle}>Câu Hỏi Thường Gặp (FAQ)</Text>
          </View>
        </View>

        <View style={s.faqList}>
          {faqs.map((f, idx) => {
            const isExpanded = expandedFaqIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={s.faqItem}
                onPress={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                activeOpacity={0.85}
              >
                <View style={s.faqHeaderRow}>
                  <Text style={s.faqQ}>{f.q}</Text>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={T.textMuted}
                  />
                </View>
                {isExpanded && (
                  <Text style={s.faqA}>{f.a}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ─── Bottom Navigation ─── */}
      <CustomerBottomNavBar
        activeTab="support"
        onSelectTab={(tab) => {
          if (onNavigateBottomTab) onNavigateBottomTab(tab);
          else if (tab === 'my-storage' && onBackToUnits) onBackToUnits();
        }}
      />

      {/* ─── Modal Tạo Phiếu Mới ─── */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Tạo Phiếu Hỗ Trợ</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialIcons name="close" size={22} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Chọn loại sự cố */}
            <Text style={s.modalLabel}>Loại sự cố:</Text>
            <View style={s.categoryRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.categoryChip, category === c.id && s.categoryChipActive]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text
                    style={[s.categoryChipText, category === c.id && s.categoryChipTextActive]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tiêu đề */}
            <Text style={s.modalLabel}>Tiêu đề:</Text>
            <TextInput
              style={s.modalInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="VD: Không mở được khóa, kẹt chốt..."
            />

            {/* Mô tả chi tiết */}
            <Text style={s.modalLabel}>Mô tả chi tiết:</Text>
            <TextInput
              style={[s.modalInput, { height: 75, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Mô tả cụ thể vấn đề bạn gặp phải..."
            />

            {/* Đính kèm ảnh sự cố */}
            <Text style={s.modalLabel}>Ảnh chụp sự cố (nếu có):</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={s.photoAttachBtn}
                onPress={handleCapturePhoto}
                disabled={isCapturingPhoto}
              >
                <MaterialIcons name="photo-camera" size={16} color={T.primary} />
                <Text style={s.photoAttachText}>Chụp ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.photoAttachBtn}
                onPress={handlePickPhoto}
                disabled={isCapturingPhoto}
              >
                <MaterialIcons name="photo-library" size={16} color={T.primary} />
                <Text style={s.photoAttachText}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            {supportPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {supportPhotos.map((p) => (
                    <View key={p.id} style={s.photoPreviewCard}>
                      <Image source={{ uri: p.uri }} style={{ width: 55, height: 55, borderRadius: 8 }} />
                      <TouchableOpacity
                        style={s.photoRemoveBtn}
                        onPress={() => handleRemovePhoto(p.id)}
                      >
                        <MaterialIcons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Nút gửi */}
            <TouchableOpacity
              style={[s.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleCreateTicket}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.modalSubmitText}>Gửi Phiếu Hỗ Trợ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Xem Chi Tiết & Phản Hồi ─── */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>
                  {selectedTicket?.requestCode || selectedTicket?.id?.slice(-8).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, color: T.textMuted }}>
                  {selectedTicket?.subject || 'Chi tiết sự cố'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <MaterialIcons name="close" size={22} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {/* Nội dung phản ánh ban đầu */}
              <View style={s.detailBox}>
                <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>
                  Nội dung yêu cầu:
                </Text>
                <Text style={{ fontSize: 13, color: T.textMain }}>
                  {selectedTicket?.description}
                </Text>
              </View>

              {/* Trao đổi / Phản hồi */}
              <Text style={[s.modalLabel, { marginTop: 12 }]}>Lịch sử trao đổi:</Text>
              {(!selectedTicket?.notes || selectedTicket.notes.length === 0) ? (
                <Text style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic', padding: 8 }}>
                  Chưa có tin nhắn phản hồi mới từ nhân viên.
                </Text>
              ) : (
                selectedTicket.notes.map((n: any, idx: number) => (
                  <View key={idx} style={s.noteItem}>
                    <Text style={s.noteAuthor}>{n.author || 'Kỹ thuật viên'}:</Text>
                    <Text style={s.noteContent}>{n.content || n.note}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Ô gửi tin nhắn */}
            <View style={s.replyBox}>
              <TextInput
                style={s.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Nhập nội dung phản hồi..."
              />
              <TouchableOpacity
                style={s.replySendBtn}
                onPress={handleSendReply}
                disabled={isSendingReply}
              >
                {isSendingReply ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  topLogoImg: {
    height: 48,
    width: 180,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: T.surfaceLow,
  },
  loginHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  loginHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
  },

  contentScroll: { padding: 16, paddingBottom: 110 },

  /* Hero Banner */
  heroBanner: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBannerContent: {
    padding: 18,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 12,
    color: '#DBEAFE',
    lineHeight: 18,
    marginBottom: 14,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: { color: T.primary, fontSize: 13, fontWeight: '800' },

  /* Contact Row */
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contactIconWrapPhone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconWrapChat: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: { fontSize: 11, color: T.textMuted },
  contactVal: { fontSize: 13, fontWeight: '800', color: T.textMain, marginTop: 1 },
  contactSub: { fontSize: 10, color: T.textMuted, marginTop: 1 },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.textMain },
  ticketCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ticketCountText: { fontSize: 11, fontWeight: '700', color: T.primary },

  /* Empty Box */
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: T.textMain },
  emptySub: { fontSize: 12, color: T.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18, paddingHorizontal: 12 },

  /* Ticket Cards */
  ticketCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  ticketCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketCodePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketCode: { fontSize: 11, fontWeight: '800', color: T.textMain },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: { fontSize: 14, fontWeight: '800', color: T.textMain, marginBottom: 4 },
  ticketDesc: { fontSize: 12, color: T.textMuted, lineHeight: 18 },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.surfaceLow,
  },
  ticketTime: { fontSize: 11, color: T.textMuted },
  viewDetailText: { fontSize: 11, fontWeight: '800', color: T.primary },

  /* FAQs */
  faqList: { gap: 8 },
  faqItem: {
    backgroundColor: T.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '700', color: T.textMain, lineHeight: 18 },
  faqA: { fontSize: 12, color: T.textMuted, lineHeight: 18, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: T.textMain },
  modalLabel: { fontSize: 12, fontWeight: '700', color: T.textMain, marginTop: 10, marginBottom: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
  },
  categoryChipActive: { backgroundColor: '#EFF6FF', borderColor: T.primary },
  categoryChipText: { fontSize: 11, color: T.textMuted, fontWeight: '600' },
  categoryChipTextActive: { color: T.primary, fontWeight: '800' },
  modalInput: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: T.textMain,
  },
  modalSubmitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  detailBox: {
    backgroundColor: T.surfaceLow,
    borderRadius: 10,
    padding: 10,
  },
  noteItem: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  noteAuthor: { fontSize: 10, fontWeight: '700', color: T.primary, marginBottom: 2 },
  noteContent: { fontSize: 12, color: T.textMain },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  replyInput: {
    flex: 1,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: T.textMain,
  },
  replySendBtn: {
    backgroundColor: T.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAttachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
  },
  photoAttachText: { fontSize: 11, fontWeight: '700', color: T.primary },
  photoPreviewCard: {
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
