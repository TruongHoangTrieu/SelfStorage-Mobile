import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffReturnOrder } from '../../types/handover';
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  pickMultiplePhotosFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';
import { performCheckOutApi } from '../../api';
import { formatVND } from '../../utils/formatters';

interface SimpleReturnInspectionModalProps {
  visible: boolean;
  onClose: () => void;
  order: StaffReturnOrder | null;
  onSuccess: (updatedOrder: StaffReturnOrder) => void;
}

export default function SimpleReturnInspectionModal({
  visible,
  onClose,
  order,
  onSuccess,
}: SimpleReturnInspectionModalProps) {
  const [itemsCleared, setItemsCleared] = useState<boolean>(true);
  const [smartLockChecked, setSmartLockChecked] = useState<boolean>(true);
  const [conditionText, setConditionText] = useState<string>(
    'Kho sạch sẽ, nguyên vẹn không trầy xước'
  );
  const [damageFine, setDamageFine] = useState<string>('0');
  const [returnPhotos, setReturnPhotos] = useState<CapturedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      setItemsCleared(true);
      setSmartLockChecked(true);
      setConditionText('Kho sạch sẽ, nguyên vẹn không trầy xước');
      setDamageFine('0');
      setReturnPhotos([]);
    }
  }, [order]);

  if (!order) return null;

  const isCompleted = order.status === 'TERMINATED' || order.returnType === 'completed';

  // Chụp ảnh bằng camera
  const handleCapturePhoto = async () => {
    try {
      setIsCapturing(true);
      const photo = await takePhotoWithCamera();
      if (photo) {
        setReturnPhotos((prev) => [photo, ...prev]);
      }
    } catch (err: any) {
      console.warn('Lỗi chụp ảnh:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickGallery = async () => {
    try {
      setIsCapturing(true);
      const photos = await pickMultiplePhotosFromGallery();
      if (photos && photos.length > 0) {
        setReturnPhotos((prev) => [...prev, ...photos]);
      }
    } catch (err: any) {
      console.warn('Lỗi chọn ảnh:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setReturnPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Xác nhận trả kho & thanh lý
  const handleConfirmCheckout = async () => {
    try {
      setIsSubmitting(true);

      const damageFineNum = parseInt(damageFine.replace(/\D/g, '') || '0', 10);
      let uploadedPhotoUrls: string[] = [];

      if (returnPhotos.length > 0) {
        try {
          uploadedPhotoUrls = await uploadMultipleImagesToStorage(returnPhotos);
        } catch (uploadErr) {
          uploadedPhotoUrls = returnPhotos.map((p) => p.base64 || p.uri);
        }
      }

      // Gửi yêu cầu check-out lên Backend
      await performCheckOutApi({
        contractId: order.id,
        condition: conditionText,
        notes: `Nghiệm thu trả kho hoàn tất. Phụ phí phát sinh: ${formatVND(damageFineNum)}`,
        photos: uploadedPhotoUrls,
        actualOverdueDays: order.overdueDays || 0,
        actualOverdueFine: order.overdueFine || 0,
        damageFineAmount: damageFineNum,
        actualRefundAmount: 0,
        targetUnitStatus: 'AVAILABLE',
      }).catch((err) => {
        console.warn('API performCheckOut fallback:', err.message);
      });

      const updatedOrder: StaffReturnOrder = {
        ...order,
        status: 'TERMINATED',
        returnType: 'completed',
        extraChargesTotal: damageFineNum + (order.overdueFine || 0),
        returnPhotos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : returnPhotos.map((p) => p.uri),
        returnCondition: conditionText,
      };

      onSuccess(updatedOrder);
      onClose();

      if (Platform.OS === 'web') {
        window.alert(`Nghiệm thu trả kho ${order.unitCode} thành công!`);
      } else {
        Alert.alert('Thành công', `Nghiệm thu trả kho ${order.unitCode} thành công!`);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể hoàn tất nghiệm thu trả kho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header ngắn gọn */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Nghiệm Thu Trả Kho</Text>
              <Text style={styles.modalSubtitle}>
                {order.contractCode} • Ô #{order.unitCode}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Thông tin khách hàng ngắn gọn 1 dòng */}
            <View style={styles.customerBriefRow}>
              <MaterialIcons name="person" size={16} color="#EA580C" />
              <Text style={styles.customerBriefText}>
                {order.customerName} • {order.phone}
              </Text>
            </View>

            {/* Checklist kiểm tra hiện trường nhanh (2 nút toggle đơn giản) */}
            <Text style={styles.fieldLabel}>KIỂM TRA HIỆN TRƯỜNG</Text>
            <View style={styles.checklistRow}>
              <TouchableOpacity
                style={[styles.checkPill, itemsCleared && styles.checkPillActive]}
                onPress={() => !isCompleted && setItemsCleared(!itemsCleared)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={itemsCleared ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={itemsCleared ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.checkPillText, itemsCleared && styles.checkPillTextActive]}>
                  Đã dọn sạch đồ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkPill, smartLockChecked && styles.checkPillActive]}
                onPress={() => !isCompleted && setSmartLockChecked(!smartLockChecked)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={smartLockChecked ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={smartLockChecked ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.checkPillText, smartLockChecked && styles.checkPillTextActive]}>
                  Khóa nguyên vẹn
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chụp & Chọn ảnh hiện trạng trả kho */}
            <View style={styles.photoHeaderRow}>
              <Text style={styles.fieldLabel}>ẢNH HIỆN TRẠNG TRẢ KHO</Text>
              <Text style={styles.photoCountText}>{returnPhotos.length} ảnh</Text>
            </View>

            {!isCompleted && (
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={handleCapturePhoto}
                  disabled={isCapturing}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                  <Text style={styles.photoBtnText}>Chụp ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoBtn, styles.photoBtnOutline]}
                  onPress={handlePickGallery}
                  disabled={isCapturing}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="photo-library" size={16} color="#EA580C" />
                  <Text style={[styles.photoBtnText, { color: '#EA580C' }]}>Thư viện</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Danh sách ảnh đã chụp */}
            {returnPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
                {returnPhotos.map((photo, idx) => (
                  <View key={photo.id || idx} style={styles.thumbWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.thumbImg} resizeMode="cover" />
                    {!isCompleted && (
                      <TouchableOpacity
                        style={styles.thumbDeleteBtn}
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

            {/* Tình trạng ô kho */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>TÌNH TRẠNG Ô KHO</Text>
            <TextInput
              style={styles.inputBox}
              value={conditionText}
              onChangeText={setConditionText}
              editable={!isCompleted}
              placeholder="Ghi nhận hiện trạng cửa kho, sàn, vách..."
            />

            {/* Phụ phí phát sinh nếu có */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>PHỤ PHÍ PHÁT SINH (VNĐ)</Text>
            <TextInput
              style={styles.inputBox}
              keyboardType="numeric"
              value={damageFine}
              onChangeText={setDamageFine}
              editable={!isCompleted}
              placeholder="0 đ"
            />
          </ScrollView>

          {/* Footer nút hành động */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>{isCompleted ? 'Đóng' : 'Hủy'}</Text>
            </TouchableOpacity>

            {!isCompleted && (
              <TouchableOpacity
                style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleConfirmCheckout}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Xác Nhận Trả Kho</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    marginTop: 10,
  },
  customerBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 10,
  },
  customerBriefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },

  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  checklistRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  checkPillTextActive: {
    color: '#FFFFFF',
  },

  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EA580C',
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoBtnOutline: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  photoBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  photoThumbList: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  thumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },

  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#EA580C',
  },
  confirmBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
