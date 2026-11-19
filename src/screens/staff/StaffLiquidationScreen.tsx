import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchStaffLiquidationsApi, completeLiquidationApi } from '../../api';
import { formatVND } from '../../utils/formatters';
import {
  takePhotoWithCamera,
  pickMultiplePhotosFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';

interface StaffLiquidationScreenProps {
  facilityId?: string | number;
  facilityName?: string;
  onOpenSidebar: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export default function StaffLiquidationScreen({
  facilityId,
  facilityName = 'Kho Tự Quản',
  onOpenSidebar,
  onOpenNotifications,
  unreadNotifCount = 0,
}: StaffLiquidationScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Form xử lý thanh lý
  const [condition, setCondition] = useState<string>(
    'Đã kiểm kê, đóng gói đồ đạc tồn kho và niêm phong thu hồi ngăn kho'
  );
  const [notes, setNotes] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [unitCondition, setUnitCondition] = useState<'AVAILABLE' | 'UNDER_MAINTENANCE'>('AVAILABLE');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadLiquidations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStaffLiquidationsApi(facilityId);
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadLiquidations();
  }, [loadLiquidations]);

  const openLiquidationModal = (item: any) => {
    setSelectedItem(item);
    setCondition(
      item.liquidationCondition ||
        'Đã kiểm kê, đóng gói đồ đạc tồn kho và niêm phong thu hồi ngăn kho'
    );
    setNotes(item.liquidationNotes || '');
    setNewPin(item.liquidationNewPin || '');
    setUnitCondition('AVAILABLE');
    setPhotos(
      Array.isArray(item.liquidationPhotos)
        ? item.liquidationPhotos.map((uri: string, idx: number) => ({
            id: `saved-${idx}`,
            uri,
            title: `Ảnh thanh lý #${idx + 1}`,
            createdAt: new Date().toISOString(),
          }))
        : []
    );
  };

  const handleCapturePhoto = async () => {
    try {
      setIsCapturing(true);
      const photo = await takePhotoWithCamera();
      if (photo) setPhotos((prev) => [photo, ...prev]);
    } catch {
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickGallery = async () => {
    try {
      setIsCapturing(true);
      const picked = await pickMultiplePhotosFromGallery();
      if (picked && picked.length > 0) setPhotos((prev) => [...prev, ...picked]);
    } catch {
    } finally {
      setIsCapturing(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedItem) return;
    const cleanPin = newPin.trim();
    const oldPin = selectedItem.contract?.contractItems?.[0]?.accessCode || '';
    if (!/^\d{6}$/.test(cleanPin)) {
      Alert.alert('Thiếu mã PIN', 'Vui lòng nhập hoặc tạo mã PIN mới gồm đúng 6 chữ số.');
      return;
    }
    if (oldPin && cleanPin === oldPin) {
      Alert.alert('PIN trùng mã cũ', `Mã PIN mới không được trùng với mã PIN cũ (${oldPin}).`);
      return;
    }
    if (!condition.trim()) {
      Alert.alert('Thiếu mô tả', 'Vui lòng nhập hiện trạng kiểm kê đồ đạc tồn kho.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (photos.length > 0) {
        try {
          uploadedUrls = await uploadMultipleImagesToStorage(photos);
        } catch {
          uploadedUrls = photos.map((p) => p.uri).filter(Boolean);
        }
      }

      await completeLiquidationApi(selectedItem.id, {
        condition: condition.trim(),
        notes: notes.trim() || undefined,
        photos: uploadedUrls,
        newAccessCode: cleanPin,
        unitCondition,
      });

      setSelectedItem(null);
      await loadLiquidations();
      const msg = 'Đã hoàn tất thanh lý kho quá hạn, tịch thu cọc và giải phóng ô kho!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Thanh lý hoàn tất', msg);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể hoàn tất thanh lý kho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = items.filter((i) => i.liquidationStatus === 'REQUESTED').length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Thanh Lý Kho ({pendingCount} chờ)</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>
          {onOpenNotifications && (
            <TouchableOpacity style={styles.iconBtn} onPress={onOpenNotifications} activeOpacity={0.7}>
              <MaterialIcons name="notifications-none" size={22} color="#0F172A" />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadLiquidations();
            }}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#DC2626" />
            <Text style={styles.centerText}>Đang tải đơn thanh lý kho...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <MaterialIcons name="gavel" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có đơn thanh lý kho</Text>
            <Text style={styles.centerText}>
              Khi Quản lý yêu cầu thanh lý kho quá hạn, đơn sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const unitItem = item.contract?.contractItems?.[0];
            const unitNum = unitItem?.unit?.unitNumber || 'KHO';
            const isDone = item.liquidationStatus === 'COMPLETED';
            const deposit = Number(unitItem?.depositAmount || 0);
            const fine = Number(item.overdueFee || 0);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isDone && styles.cardDone]}
                onPress={() => openLiquidationModal(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.contractCode}>{item.contract?.contractCode}</Text>
                  <View style={[styles.badge, isDone ? styles.badgeDone : styles.badgePending]}>
                    <Text style={[styles.badgeText, isDone ? styles.badgeTextDone : styles.badgeTextPending]}>
                      {isDone ? 'Đã thanh lý' : 'Chờ thanh lý'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customerName}>{item.contract?.customer?.fullName || 'Khách hàng'}</Text>
                <Text style={styles.unitLine}>
                  Ô #{unitNum} · Quá {item.overdueDays ?? 0} ngày · Phạt {formatVND(fine)}
                </Text>
                <Text style={styles.depositLine}>
                  Cọc tịch thu: {formatVND(deposit)} (Không hoàn cọc)
                </Text>
                <View style={[styles.actionBtn, isDone && styles.actionBtnDone]}>
                  <Text style={[styles.actionBtnText, isDone && styles.actionBtnTextDone]}>
                    {isDone ? 'Xem Biên Bản Thanh Lý' : 'Thực Hiện Thanh Lý Kho'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedItem)} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Biên Bản Thanh Lý Kho</Text>
                <Text style={styles.modalSub}>
                  Ô #{selectedItem?.contract?.contractItems?.[0]?.unit?.unitNumber} ·{' '}
                  {selectedItem?.contract?.contractCode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.iconBtn}>
                <MaterialIcons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {(() => {
                if (!selectedItem) return null;
                const unitItem = selectedItem.contract?.contractItems?.[0];
                const deposit = Number(unitItem?.depositAmount || 0);
                const fine = Number(selectedItem.overdueFee || 0);
                const debt = Math.max(0, fine - deposit);
                const isDone = selectedItem.liquidationStatus === 'COMPLETED';

                return (
                  <View style={{ gap: 14, paddingBottom: 20 }}>
                    <View style={styles.financeBox}>
                      <Text style={styles.financeTitle}>ĐỐI SOÁT TÀI CHÍNH THANH LÝ</Text>
                      <Text style={styles.financeRow}>• Quá hạn: {selectedItem.overdueDays ?? 0} ngày</Text>
                      <Text style={styles.financeRow}>• Phạt quá hạn lũy tiến: {formatVND(fine)}</Text>
                      <Text style={styles.financeRow}>• Tiền cọc tịch thu/cấn trừ: {formatVND(deposit)}</Text>
                      <Text style={[styles.financeRow, { color: '#DC2626', fontWeight: '800' }]}>
                        • Hoàn cọc cho khách: 0 đ (Còn nợ thêm: {formatVND(debt)})
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.fieldLabel}>Ảnh kiểm kê đồ đạc tồn kho ({photos.length})</Text>
                      {!isDone && (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                          <TouchableOpacity style={styles.photoBtn} onPress={handleCapturePhoto} disabled={isCapturing}>
                            <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                            <Text style={styles.photoBtnText}>Chụp ảnh</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.photoBtn, styles.photoBtnOutline]}
                            onPress={handlePickGallery}
                            disabled={isCapturing}
                          >
                            <MaterialIcons name="photo-library" size={16} color="#DC2626" />
                            <Text style={[styles.photoBtnText, { color: '#DC2626' }]}>Thư viện</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {photos.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {photos.map((p) => (
                              <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} />
                            ))}
                          </View>
                        </ScrollView>
                      )}
                    </View>

                    <View>
                      <Text style={styles.fieldLabel}>Đổi mã PIN Smart Lock mới (6 chữ số)</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, fontWeight: '800', letterSpacing: 2 }]}
                          value={newPin}
                          editable={!isDone}
                          keyboardType="numeric"
                          maxLength={6}
                          onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                          placeholder="Nhập 6 số mới"
                        />
                        {!isDone && (
                          <TouchableOpacity
                            style={styles.randomBtn}
                            onPress={() => {
                              const oldPin = unitItem?.accessCode;
                              let rand = '';
                              do {
                                rand = Math.floor(100000 + Math.random() * 900000).toString();
                              } while (rand === oldPin);
                              setNewPin(rand);
                            }}
                          >
                            <Text style={styles.randomBtnText}>Tạo ngẫu nhiên</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View>
                      <Text style={styles.fieldLabel}>Hiện trạng kiểm kê tài sản tồn</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
                        multiline
                        editable={!isDone}
                        value={condition}
                        onChangeText={setCondition}
                      />
                    </View>

                    <View>
                      <Text style={styles.fieldLabel}>Trạng thái ô kho sau thanh lý</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['AVAILABLE', 'UNDER_MAINTENANCE'] as const).map((st) => (
                          <TouchableOpacity
                            key={st}
                            disabled={isDone}
                            style={[styles.statusChip, unitCondition === st && styles.statusChipActive]}
                            onPress={() => setUnitCondition(st)}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                unitCondition === st && styles.statusChipTextActive,
                              ]}
                            >
                              {st === 'AVAILABLE' ? 'Sẵn sàng (AVAILABLE)' : 'Cần bảo trì / dọn'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {!isDone && (
                      <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleComplete}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.submitBtnText}>
                          {isSubmitting ? 'Đang xử lý...' : 'Hoàn Tất Thanh Lý & Giải Phóng Kho'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  notifBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  centerBox: { paddingVertical: 56, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  centerText: { fontSize: 12, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardDone: { borderColor: '#E2E8F0', opacity: 0.9 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contractCode: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgePending: { backgroundColor: '#FEE2E2' },
  badgeDone: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextPending: { color: '#B91C1C' },
  badgeTextDone: { color: '#15803D' },
  customerName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  unitLine: { fontSize: 12, color: '#475569', marginTop: 4, fontWeight: '600' },
  depositLine: { fontSize: 11.5, color: '#B91C1C', marginTop: 2, fontWeight: '700' },
  actionBtn: {
    marginTop: 12,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnDone: { backgroundColor: '#F1F5F9' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  actionBtnTextDone: { color: '#0F172A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  financeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  financeTitle: { fontSize: 11, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  financeRow: { fontSize: 12.5, color: '#1E293B', fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  photoBtnOutline: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  photoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  thumb: { width: 76, height: 76, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  randomBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  randomBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  statusChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  statusChipText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  statusChipTextActive: { color: '#FFFFFF' },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
});
