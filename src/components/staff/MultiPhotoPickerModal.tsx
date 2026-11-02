import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  takePhotoWithCamera,
  pickMultiplePhotosFromGallery,
  CapturedPhoto,
} from '../../services/imageService';

// Danh sách ảnh mẫu kiểm tra hiện trạng chuẩn của kho tự quản SelfStorage
const STANDARD_INSPECTION_PRESETS = [
  {
    id: 'preset-door',
    title: 'Cửa & Khóa Smart PIN',
    tag: 'Cửa kho',
    uri: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=600&auto=format&fit=crop&q=80',
    desc: 'Cửa trượt/cuốn & ổ khóa bàn phím số',
  },
  {
    id: 'preset-inside',
    title: 'Toàn cảnh bên trong kho',
    tag: 'Trong kho',
    uri: 'https://res.cloudinary.com/micb9okr/image/upload/v1792946232/selfstorage/storage_units/unit_sto1.png',
    desc: 'Lòng kho sạch sẽ, đã dọn hết đồ',
  },
  {
    id: 'preset-floor',
    title: 'Sàn kho & Góc tường',
    tag: 'Sàn nhà',
    uri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    desc: 'Mặt sàn xi măng phẳng, không vết nứt',
  },
  {
    id: 'preset-wall',
    title: 'Vách ngăn & Đèn trần',
    tag: 'Vách tường',
    uri: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&auto=format&fit=crop&q=80',
    desc: 'Vách kim loại nguyên vẹn, đèn chiếu sáng tốt',
  },
];

interface MultiPhotoPickerModalProps {
  visible: boolean;
  onClose: () => void;
  unitCode?: string;
  onPhotosSelected: (photos: CapturedPhoto[]) => void;
  existingPhotosCount?: number;
}

export default function MultiPhotoPickerModal({
  visible,
  onClose,
  unitCode = 'STD-01',
  onPhotosSelected,
  existingPhotosCount = 0,
}: MultiPhotoPickerModalProps) {
  const [selectedPendingPhotos, setSelectedPendingPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset khi mở modal
  const handleOpen = () => {
    setSelectedPendingPhotos([]);
    setSelectedPresetIds(new Set());
  };

  // 1. Chụp ảnh camera
  const handleCaptureFromCamera = async () => {
    setIsLoading(true);
    try {
      const photo = await takePhotoWithCamera();
      if (photo) {
        setSelectedPendingPhotos((prev) => [...prev, photo]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi Camera', err.message || 'Không thể mở máy ảnh.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Chọn NHIỀU ẢNH cùng một lúc từ Thư viện thiết bị
  const handlePickMultipleFromGallery = async () => {
    setIsLoading(true);
    try {
      const photos = await pickMultiplePhotosFromGallery(15);
      if (photos && photos.length > 0) {
        setSelectedPendingPhotos((prev) => [...prev, ...photos]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi Thư Viện', err.message || 'Không thể chọn nhiều ảnh.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Tích chọn / Bỏ chọn ảnh mẫu tiêu chuẩn
  const togglePresetPhoto = (preset: typeof STANDARD_INSPECTION_PRESETS[0]) => {
    setSelectedPresetIds((prev) => {
      const next = new Set(prev);
      if (next.has(preset.id)) {
        next.delete(preset.id);
        // Xóa khỏi pending
        setSelectedPendingPhotos((curr) => curr.filter((p) => p.id !== preset.id));
      } else {
        next.add(preset.id);
        // Thêm vào pending
        const newPhoto: CapturedPhoto = {
          id: preset.id,
          uri: preset.uri,
          title: preset.title,
          createdAt: new Date().toISOString(),
        };
        setSelectedPendingPhotos((curr) => [...curr, newPhoto]);
      }
      return next;
    });
  };

  // Xóa ảnh khỏi danh sách chờ thêm
  const handleRemovePending = (id: string) => {
    setSelectedPendingPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPresetIds.has(id)) {
      setSelectedPresetIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Xác nhận thêm tất cả ảnh đã chọn
  const handleConfirmAdd = () => {
    if (selectedPendingPhotos.length === 0) {
      Alert.alert('Chưa chọn ảnh', 'Vui lòng chụp hoặc chọn ít nhất 1 ảnh trước khi xác nhận.');
      return;
    }

    onPhotosSelected(selectedPendingPhotos);
    handleOpen();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header Modal */}
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="add-photo-alternate" size={24} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Thêm Ảnh Đối Chiếu Trả Kho</Text>
              <Text style={styles.headerSubtitle}>
                Ô kho #{unitCode} • Chọn 1 lần nhiều ảnh nhanh chóng
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Phương thức 1: Tải ảnh từ thiết bị */}
            <Text style={styles.sectionTitle}>1. Tải ảnh từ thiết bị của bạn</Text>
            <View style={styles.actionCardsRow}>
              {/* Nút 1: Chọn nhiều ảnh từ Thư viện */}
              <TouchableOpacity
                style={[styles.primaryActionCard, isLoading && { opacity: 0.6 }]}
                onPress={handlePickMultipleFromGallery}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconCirclePrimary}>
                  <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.primaryActionTitle}>Chọn Nhiều Ảnh</Text>
                <Text style={styles.primaryActionSub}>Thư viện máy (1 lần nhiều ảnh)</Text>
                <View style={styles.multiSelectBadge}>
                  <Text style={styles.multiSelectBadgeText}>Đa chọn (Multi-pick)</Text>
                </View>
              </TouchableOpacity>

              {/* Nút 2: Chụp ảnh camera trực tiếp */}
              <TouchableOpacity
                style={[styles.secondaryActionCard, isLoading && { opacity: 0.6 }]}
                onPress={handleCaptureFromCamera}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconCircleSecondary}>
                  <MaterialIcons name="photo-camera" size={24} color="#1D4ED8" />
                </View>
                <Text style={styles.secondaryActionTitle}>Chụp Máy Ảnh</Text>
                <Text style={styles.secondaryActionSub}>Chụp trực tiếp góc kho</Text>
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>Camera HD</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Đang xử lý ảnh...</Text>
              </View>
            )}

            {/* Phương thức 2: Chọn từ bộ ảnh góc chụp kho tiêu chuẩn */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>2. Hoặc chọn nhanh ảnh góc kho chuẩn</Text>
              <Text style={styles.sectionHint}>Chạm để chọn nhiều ảnh</Text>
            </View>

            <View style={styles.presetGrid}>
              {STANDARD_INSPECTION_PRESETS.map((preset) => {
                const isSelected = selectedPresetIds.has(preset.id);
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                    onPress={() => togglePresetPhoto(preset)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: preset.uri }} style={styles.presetImage} resizeMode="cover" />
                    <View style={styles.presetOverlay}>
                      <View
                        style={[
                          styles.checkboxCircle,
                          isSelected && styles.checkboxCircleSelected,
                        ]}
                      >
                        {isSelected ? (
                          <MaterialIcons name="check" size={13} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <View style={styles.presetTag}>
                        <Text style={styles.presetTagText}>{preset.tag}</Text>
                      </View>
                    </View>
                    <View style={styles.presetBody}>
                      <Text style={styles.presetTitle} numberOfLines={1}>
                        {preset.title}
                      </Text>
                      <Text style={styles.presetDesc} numberOfLines={1}>
                        {preset.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Danh sách ảnh đã chọn chuẩn bị thêm */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>3. Danh sách ảnh chuẩn bị thêm</Text>
              <View style={styles.selectedCountBadge}>
                <Text style={styles.selectedCountText}>
                  Đã chọn: {selectedPendingPhotos.length} ảnh
                </Text>
              </View>
            </View>

            {selectedPendingPhotos.length === 0 ? (
              <View style={styles.emptyPendingBox}>
                <MaterialIcons name="image" size={32} color="#CBD5E1" />
                <Text style={styles.emptyPendingText}>
                  Chưa có ảnh nào được chọn. Hãy chọn nhiều ảnh từ thư viện hoặc chạm vào các góc kho chuẩn ở trên.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingScroll}>
                {selectedPendingPhotos.map((photo, idx) => (
                  <View key={photo.id || `pending-${idx}`} style={styles.pendingThumbCard}>
                    <Image source={{ uri: photo.uri }} style={styles.pendingThumbImg} resizeMode="cover" />
                    <View style={styles.pendingIndexBadge}>
                      <Text style={styles.pendingIndexText}>#{idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.pendingDeleteBtn}
                      onPress={() => handleRemovePending(photo.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </ScrollView>

          {/* Footer Modal */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                selectedPendingPhotos.length === 0 && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmAdd}
              disabled={selectedPendingPhotos.length === 0}
              activeOpacity={0.85}
            >
              <MaterialIcons name="done-all" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                XÁC NHẬN THÊM ({selectedPendingPhotos.length}) ẢNH
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
    maxWidth: 500,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionCard: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconCirclePrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryActionSub: {
    fontSize: 10,
    color: '#DBEAFE',
    marginTop: 2,
    textAlign: 'center',
  },
  multiSelectBadge: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  multiSelectBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircleSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  secondaryActionSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  cameraBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  cameraBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  presetCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  presetImage: {
    width: '100%',
    height: 85,
  },
  presetOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  presetTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presetTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetBody: {
    padding: 8,
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  selectedCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  emptyPendingBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyPendingText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  pendingScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  pendingThumbCard: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pendingThumbImg: {
    width: '100%',
    height: '100%',
  },
  pendingIndexBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pendingIndexText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pendingDeleteBtn: {
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

