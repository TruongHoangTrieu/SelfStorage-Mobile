import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Clipboard,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckInAppointment, AvailableUnit } from '../../types/handover';
import ContractPreviewModal from '../../components/staff/ContractPreviewModal';
import PrintReceiptModal from '../../components/staff/PrintReceiptModal';
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';

interface HandoverDetailScreenProps {
  appointment: CheckInAppointment;
  availableUnits: AvailableUnit[];
  onBackToQueue: () => void;
  onCompleteHandover: (updatedData: {
    appointmentId: string;
    unitCode: string;
    condition: string;
    notes?: string;
    photos?: string[];
  }) => void;
  isSubmitting?: boolean;
}

// Design Tokens đồng bộ với User & Web
const T = {
  primary: '#004ac6',
  primaryContainer: '#2563eb',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLow: '#F1F5F9',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textMuted: '#64748B',
  emerald: '#10B981',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  emeraldText: '#047857',
  amber: '#F59E0B',
  amberBg: '#FFFBEB',
  amberBorder: '#FDE68A',
  amberText: '#B45309',
};

function parseCurrency(val?: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = val.toString().match(/([\d.]+)\s*đ/);
  if (match) return parseInt(match[1].replace(/\./g, ''), 10) || 0;
  const digitsOnly = val.toString().replace(/[^\d]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export default function HandoverDetailScreen({
  appointment,
  availableUnits,
  onBackToQueue,
  onCompleteHandover,
  isSubmitting = false,
}: HandoverDetailScreenProps) {
  // Stepper State 1 -> 5 (giống hệt luồng Web)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Bước 1: CCCD & Ô kho
  const [isCccdVerified, setIsCccdVerified] = useState<boolean>(true);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    appointment.assignedUnit || 'A-101'
  );
  const [showUnitPickerModal, setShowUnitPickerModal] = useState<boolean>(false);

  // Bước 2: Hiện trạng ô kho & Chụp ảnh
  const [photos, setPhotos] = useState<CapturedPhoto[]>([
    {
      id: 'photo-1',
      title: 'Cửa & Khóa',
      uri: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=400&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'photo-2',
      title: 'Trong kho',
      uri: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'photo-3',
      title: 'Hành lang',
      uri: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState<boolean>(false);

  const handleCapturePhoto = async () => {
    setIsCapturing(true);
    const photo = await takePhotoWithCamera();
    if (photo) {
      setPhotos((prev) => [photo, ...prev]);
    }
    setIsCapturing(false);
  };

  const handlePickPhoto = async () => {
    setIsCapturing(true);
    const photo = await pickPhotoFromGallery();
    if (photo) {
      setPhotos((prev) => [photo, ...prev]);
    }
    setIsCapturing(false);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const [condition, setCondition] = useState<string>(
    'Kho sạch sẽ, không mùi, đèn sáng, ổ khóa Smart Lock PIN hoạt động tốt'
  );
  const [checklist, setChecklist] = useState({
    lockTested: true,
    lightingChecked: true,
    cleanlinessChecked: true,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Bước 3: Hợp đồng thuê
  const [isContractSigned, setIsContractSigned] = useState<boolean>(false);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Bước 4: Thu tiền thuê kho
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'cash'>('vietqr');
  const [isPaid, setIsPaid] = useState<boolean>(appointment.rentalStatus === 'paid');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bước 5: Cấp mã PIN Smart Lock
  const [accessPin, setAccessPin] = useState<string>(
    appointment.accessPin || Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [customRfid, setCustomRfid] = useState<string>(
    appointment.rfidCard || `RFID-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [customNotes, setCustomNotes] = useState<string>(appointment.specialNotes || '');

  // Tính toán tiền tệ
  const durationMonths = appointment.durationMonths || 1;
  const monthlyRentNum = parseCurrency(appointment.monthlyRent);
  const depositNum = parseCurrency(appointment.depositAmount);
  const discountPercent =
    durationMonths >= 12 ? 15 : durationMonths >= 6 ? 10 : durationMonths >= 3 ? 5 : 0;
  const rawTotal = monthlyRentNum * durationMonths;
  const discountAmount = Math.round(rawTotal * (discountPercent / 100));
  const totalRent = rawTotal - discountAmount;
  const remainingAmount = Math.max(0, totalRent - depositNum);

  // QR Code URL chuẩn hóa
  const paymentContent = `THANH TOAN ${appointment.id}`;
  const qrUrl = `https://img.vietqr.io/image/MB-0900000000-compact2.png?amount=${remainingAmount}&addInfo=${encodeURIComponent(
    paymentContent
  )}&accountName=${encodeURIComponent('SELFSTORAGE VN')}`;

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateRandomPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setAccessPin(pin);
  };

  const handleSelectStep = (targetStep: number) => {
    if (targetStep === currentStep) return;
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    // Chuyển tới các bước sau: Bắt buộc phải hoàn thành tuần tự
    if (!isCccdVerified) {
      Alert.alert('Chưa hoàn tất Bước 1', 'Vui lòng xác nhận đối chiếu CCCD trước khi chuyển bước.');
      return;
    }
    if (targetStep >= 3 && photos.length === 0) {
      Alert.alert('Chưa có ảnh hiện trạng', 'Vui lòng chụp hoặc chọn ít nhất 1 ảnh hiện trạng ô kho tại Bước 2.');
      return;
    }
    if (targetStep >= 4 && !isContractSigned) {
      Alert.alert('Chưa ký hợp đồng', 'Vui lòng xác nhận khách đã ký hợp đồng tại Bước 3.');
      return;
    }
    if (targetStep >= 5 && !isPaid) {
      Alert.alert('Chưa thanh toán', 'Vui lòng xác nhận đã thu tiền thuê kho tại Bước 4 trước khi cấp PIN.');
      return;
    }
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!isCccdVerified) {
        Alert.alert('Chưa đối chiếu CCCD', 'Vui lòng xác nhận đối chiếu CCCD gốc của khách hàng.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (photos.length === 0) {
        Alert.alert('Chưa có ảnh hiện trạng', 'Vui lòng chụp hoặc chọn ít nhất 1 ảnh hiện trạng ô kho trước khi sang Bước 3.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!isContractSigned) {
        Alert.alert('Chưa ký hợp đồng', 'Vui lòng xác nhận khách hàng đã ký hợp đồng thuê kho.');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!isPaid) {
        Alert.alert(
          'Chưa xác nhận thanh toán',
          'Vui lòng xác nhận khách hàng đã thanh toán tiền thuê còn lại trước khi cấp PIN bàn giao kho.',
          [
            { text: 'Kiểm tra lại', style: 'cancel' },
            {
              text: 'Xác nhận đã thu & Tiếp tục',
              onPress: () => {
                setIsPaid(true);
                setCurrentStep(5);
              },
            },
          ]
        );
        return;
      }
      setCurrentStep(5);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBackToQueue();
    }
  };

  const handleFinish = async () => {
    if (!isCccdVerified) {
      Alert.alert('Lỗi', 'Vui lòng đối chiếu CCCD tại Bước 1.');
      setCurrentStep(1);
      return;
    }
    if (!isContractSigned) {
      Alert.alert('Lỗi', 'Vui lòng ký hợp đồng tại Bước 3.');
      setCurrentStep(3);
      return;
    }

    let uploadedUrls: string[] = [];
    try {
      setIsUploadingPhotos(true);
      // Upload ảnh lên Cloudinary CDN nếu có cấu hình (hoặc fallback Base64 / URI)
      uploadedUrls = await uploadMultipleImagesToStorage(photos);
    } catch (uploadErr) {
      console.warn('Lỗi khi upload ảnh hiện trạng:', uploadErr);
      uploadedUrls = photos.map((p) => p.base64 || p.uri);
    } finally {
      setIsUploadingPhotos(false);
    }

    onCompleteHandover({
      appointmentId: appointment.id,
      unitCode: selectedUnitCode,
      condition,
      notes: customNotes,
      photos: uploadedUrls,
    });
  };

  const steps = [
    { num: 1, title: 'CCCD & Kho' },
    { num: 2, title: 'Hiện trạng' },
    { num: 3, title: 'Hợp đồng' },
    { num: 4, title: 'Thu tiền' },
    { num: 5, title: 'Cấp PIN' },
  ];

  return (
    <View style={s.container}>
      {/* ─── Top Bar ─── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={onBackToQueue}>
          <MaterialIcons name="arrow-back" size={22} color={T.textMain} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.topTitle}>Bàn Giao: {appointment.customerName}</Text>
          <Text style={s.topSub}>
            Đơn #{appointment.id.slice(-6).toUpperCase()} • Ô #{selectedUnitCode}
          </Text>
        </View>
        <TouchableOpacity style={s.printQuickBtn} onPress={() => setShowPrintModal(true)}>
          <MaterialIcons name="print" size={18} color={T.primary} />
          <Text style={s.printQuickText}>In</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Stepper Progress Bar (5 bước) ─── */}
      <View style={s.stepperBar}>
        {steps.map((st) => {
          const isActive = currentStep === st.num;
          const isDone = currentStep > st.num;
          return (
            <TouchableOpacity
              key={st.num}
              style={[
                s.stepItem,
                isActive && s.stepItemActive,
                isDone && s.stepItemDone,
              ]}
              onPress={() => handleSelectStep(st.num)}
            >
              <View
                style={[
                  s.stepCircle,
                  isActive && s.stepCircleActive,
                  isDone && s.stepCircleDone,
                ]}
              >
                {isDone ? (
                  <MaterialIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text
                    style={[
                      s.stepNumText,
                      isActive && { color: '#fff' },
                      isDone && { color: '#fff' },
                    ]}
                  >
                    {st.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  s.stepLabel,
                  isActive && s.stepLabelActive,
                  isDone && s.stepLabelDone,
                ]}
                numberOfLines={1}
              >
                {st.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Nội Dung Từng Bước ─── */}
      <ScrollView contentContainerStyle={s.contentScroll} showsVerticalScrollIndicator={false}>
        {/* ================= BƯỚC 1: CCCD & Ô KHO ================= */}
        {currentStep === 1 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="verified-user" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 1: Đối Chiếu CCCD & Ô Kho</Text>
            </View>

            {/* Thông tin khách */}
            <View style={s.infoBox}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Khách hàng:</Text>
                <Text style={s.infoVal}>{appointment.customerName}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Số CCCD/Hộ chiếu:</Text>
                <Text style={[s.infoVal, { color: T.primary, fontWeight: '700' }]}>
                  {appointment.idCard || '079095012345'}
                </Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Số điện thoại:</Text>
                <Text style={s.infoVal}>{appointment.phone}</Text>
              </View>
            </View>

            {/* Checkbox đối chiếu CCCD */}
            <TouchableOpacity
              style={[s.checkActionBox, isCccdVerified && s.checkActionBoxActive]}
              onPress={() => setIsCccdVerified(!isCccdVerified)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isCccdVerified ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={isCccdVerified ? T.primary : T.textMuted}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.checkActionTitle}>
                  Đã đối chiếu thông tin với CCCD/Hộ chiếu gốc
                </Text>
                <Text style={s.checkActionSub}>Khách xuất trình giấy tờ trùng khớp thông tin</Text>
              </View>
            </TouchableOpacity>

            {/* Ô kho & Đổi ô */}
            <View style={s.unitSelectBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Ô kho được gán:</Text>
                <Text style={s.unitSelectVal}>
                  Ô #{selectedUnitCode} • {appointment.unitType}
                </Text>
              </View>
              <TouchableOpacity
                style={s.changeUnitBtn}
                onPress={() => setShowUnitPickerModal(true)}
              >
                <Text style={s.changeUnitBtnText}>Đổi ô</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= BƯỚC 2: HIỆN TRẠNG KHO ================= */}
        {currentStep === 2 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="camera-alt" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 2: Hiện Trạng Ô Kho #{selectedUnitCode}</Text>
            </View>

            {/* Nút chụp ảnh Camera & Chọn Thư viện */}
            <View style={s.photoActionRow}>
              <TouchableOpacity
                style={s.cameraBtn}
                onPress={handleCapturePhoto}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <MaterialIcons name="photo-camera" size={18} color="#fff" />
                <Text style={s.cameraBtnText}>Chụp Ảnh Kho Mới</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.galleryBtn}
                onPress={handlePickPhoto}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <MaterialIcons name="photo-library" size={18} color={T.primary} />
                <Text style={s.galleryBtnText}>Chọn Từ Thư Viện</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách ảnh hiện trạng (Có thể cuộn ngang hoặc dạng lưới) */}
            <Text style={s.sectionSubtitle}>
              Ảnh kiểm tra trước bàn giao ({photos.length} ảnh):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
                {photos.map((p) => (
                  <View key={p.id} style={s.photoCard}>
                    <TouchableOpacity
                      style={s.photoThumbWrap}
                      onPress={() => setPreviewImage(p.uri)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: p.uri }} style={s.photoImg} />
                      <Text style={s.photoTag} numberOfLines={1}>{p.title}</Text>
                    </TouchableOpacity>

                    {/* Nút xóa ảnh */}
                    <TouchableOpacity
                      style={s.photoDeleteBtn}
                      onPress={() => handleDeletePhoto(p.id)}
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Checklist kiểm tra */}
            <View style={s.checklistCard}>
              {[
                { key: 'lockTested', label: 'Khóa Smart PIN hoạt động tốt' },
                { key: 'lightingChecked', label: 'Đèn chiếu sáng ổn định' },
                { key: 'cleanlinessChecked', label: 'Kho sạch sẽ, không mùi' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={s.checklistItem}
                  onPress={() =>
                    setChecklist({
                      ...checklist,
                      [item.key]: !checklist[item.key as keyof typeof checklist],
                    })
                  }
                >
                  <MaterialIcons
                    name={
                      checklist[item.key as keyof typeof checklist]
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={checklist[item.key as keyof typeof checklist] ? T.primary : T.textMuted}
                  />
                  <Text style={s.checklistText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mô tả hiện trạng */}
            <Text style={[s.sectionSubtitle, { marginTop: 12 }]}>Mô tả ghi vào biên bản:</Text>
            <TextInput
              style={s.inputBox}
              value={condition}
              onChangeText={setCondition}
              placeholder="Tình trạng kho..."
            />
          </View>
        )}

        {/* ================= BƯỚC 3: HỢP ĐỒNG THUÊ ================= */}
        {currentStep === 3 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="description" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 3: Hợp Đồng Thuê Kho</Text>
            </View>

            {/* Bảng tóm tắt điều khoản hợp đồng dạng lưới 2x2 thông thoáng */}
            <View style={s.contractCardBox}>
              <View style={s.contractHeaderBadge}>
                <MaterialIcons name="folder-shared" size={15} color={T.primary} />
                <Text style={s.contractHeaderBadgeText}>
                  Hồ sơ hợp đồng điện tử • Ô #{selectedUnitCode}
                </Text>
              </View>

              {/* Hàng 1 */}
              <View style={s.contractGridRow}>
                <View style={s.contractGridItem}>
                  <Text style={s.contractGridLabel}>THỜI HẠN THUÊ</Text>
                  <Text style={s.contractGridVal}>{durationMonths} tháng</Text>
                </View>
                <View style={[s.contractGridItem, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
                  <Text style={s.contractGridLabel}>NGÀY BẮT ĐẦU</Text>
                  <Text style={s.contractGridVal}>{appointment.startDate || 'Hôm nay'}</Text>
                </View>
              </View>

              <View style={s.contractGridDivider} />

              {/* Hàng 2 */}
              <View style={s.contractGridRow}>
                <View style={s.contractGridItem}>
                  <Text style={s.contractGridLabel}>GIÁ THUÊ THÁNG</Text>
                  <Text style={[s.contractGridVal, { color: T.primary, fontWeight: '800' }]}>
                    {appointment.monthlyRent}
                  </Text>
                </View>
                <View style={[s.contractGridItem, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
                  <Text style={s.contractGridLabel}>TIỀN ĐẶT CỌC</Text>
                  <Text style={[s.contractGridVal, { color: T.emeraldText, fontWeight: '800' }]}>
                    {appointment.depositAmount || formatVND(depositNum)}
                  </Text>
                </View>
              </View>
            </View>

            {/* 2 nút Xem & In hợp đồng */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.contractActionBtn}
                onPress={() => setShowContractModal(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="article" size={17} color={T.primary} />
                <Text style={s.contractActionText}>Xem Hợp Đồng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.contractActionBtn, s.contractActionBtnPrint]}
                onPress={() => setShowPrintModal(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="print" size={17} color="#334155" />
                <Text style={[s.contractActionText, { color: '#334155' }]}>In Hợp Đồng Giấy</Text>
              </TouchableOpacity>
            </View>

            {/* Checkbox xác nhận ký hợp đồng */}
            <TouchableOpacity
              style={[s.signedBox, isContractSigned && s.signedBoxActive]}
              onPress={() => setIsContractSigned(!isContractSigned)}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isContractSigned ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isContractSigned ? T.emeraldText : '#94A3B8'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.signedTitle, isContractSigned && { color: T.emeraldText }]}>
                  {isContractSigned
                    ? '✓ Đã xác nhận ký hợp đồng'
                    : 'Xác nhận khách hàng đã ký hợp đồng'}
                </Text>
                <Text style={s.signedSub}>Hợp đồng đã có đủ chữ ký và lưu trữ vào hồ sơ</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= BƯỚC 4: THU TIỀN THUÊ KHO (VIETQR) ================= */}
        {currentStep === 4 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="payment" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 4: Quyết Toán Tiền Thuê Kho</Text>
            </View>

            {/* Bảng số tiền */}
            <View style={s.priceBox}>
              <View style={s.priceCol}>
                <Text style={s.priceLabel}>Tiền thuê ({durationMonths}T)</Text>
                <Text style={s.priceVal}>{formatVND(totalRent)}</Text>
              </View>
              <View style={s.priceCol}>
                <Text style={s.priceLabel}>Đã cọc</Text>
                <Text style={[s.priceVal, { color: T.emeraldText }]}>
                  {appointment.depositAmount || formatVND(depositNum)}
                </Text>
              </View>
              <View style={[s.priceCol, { borderRightWidth: 0, backgroundColor: T.amberBg }]}>
                <Text style={[s.priceLabel, { color: T.amberText, fontWeight: '700' }]}>
                  CẦN THU
                </Text>
                <Text style={[s.priceVal, { color: T.amberText, fontWeight: '800' }]}>
                  {formatVND(remainingAmount)}
                </Text>
              </View>
            </View>

            {/* Chọn hình thức */}
            <View style={s.payMethodRow}>
              <TouchableOpacity
                style={[s.payMethodBtn, paymentMethod === 'vietqr' && s.payMethodBtnActive]}
                onPress={() => setPaymentMethod('vietqr')}
              >
                <MaterialIcons
                  name="qr-code-scanner"
                  size={18}
                  color={paymentMethod === 'vietqr' ? T.primary : T.textMuted}
                />
                <Text
                  style={[
                    s.payMethodText,
                    paymentMethod === 'vietqr' && s.payMethodTextActive,
                  ]}
                >
                  VietQR SePay
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.payMethodBtn, paymentMethod === 'cash' && s.payMethodBtnActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <MaterialIcons
                  name="attach-money"
                  size={18}
                  color={paymentMethod === 'cash' ? T.primary : T.textMuted}
                />
                <Text
                  style={[
                    s.payMethodText,
                    paymentMethod === 'cash' && s.payMethodTextActive,
                  ]}
                >
                  Tiền mặt tại quầy
                </Text>
              </TouchableOpacity>
            </View>

            {/* HIỂN THỊ MÃ VIETQR TRỰC TIẾP */}
            {paymentMethod === 'vietqr' && (
              <View style={s.qrWrapper}>
                <View style={s.qrBox}>
                  <Image source={{ uri: qrUrl }} style={s.qrImage} resizeMode="contain" />
                  <Text style={s.qrHint}>Đưa màn hình cho khách quét bằng App Ngân hàng</Text>
                </View>

                {/* Thông tin chuyển khoản */}
                <View style={s.bankDetailList}>
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Ngân hàng:</Text>
                    <Text style={s.bankVal}>MBBank (Quân Đội)</Text>
                  </View>

                  <View style={s.bankRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={s.bankLabel}>Số tài khoản:</Text>
                      <Text style={[s.bankVal, { color: T.primary, fontWeight: '700' }]}>
                        0900000000
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCopy('0900000000', 'STK')}
                      style={s.copyBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={copiedField === 'STK' ? 'check' : 'content-copy'}
                        size={12}
                        color={T.primary}
                      />
                      <Text style={s.copyBtnText}>
                        {copiedField === 'STK' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Khung nội dung chuyển khoản riêng biệt, không bị lồi ra ngoài */}
                  <View style={s.contentHighlightBox}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={s.contentBoxLabel}>Nội dung CK (bắt buộc):</Text>
                      <Text style={s.contentBoxValue} numberOfLines={2}>
                        {paymentContent}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCopy(paymentContent, 'ND')}
                      style={s.copyBtnLarge}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={copiedField === 'ND' ? 'check' : 'content-copy'}
                        size={13}
                        color="#fff"
                      />
                      <Text style={s.copyBtnLargeText}>
                        {copiedField === 'ND' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Tab Tiền mặt */}
            {paymentMethod === 'cash' && (
              <View style={s.cashBox}>
                <MaterialIcons name="payments" size={36} color={T.emeraldText} />
                <Text style={s.cashTitle}>Thu tiền mặt trực tiếp tại quầy</Text>
                <Text style={s.cashAmount}>{formatVND(remainingAmount)}</Text>
                <Text style={s.cashSub}>Kiểm đếm đủ tiền trước khi xác nhận bên dưới</Text>
              </View>
            )}

            {/* Nút xác nhận đã thu tiền */}
            <TouchableOpacity
              style={[s.paidToggleBtn, isPaid && s.paidToggleBtnDone]}
              onPress={() => setIsPaid(!isPaid)}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isPaid ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
                color="#fff"
              />
              <Text style={s.paidToggleText}>
                {isPaid
                  ? `✓ ĐÃ THU ĐỦ TIỀN THUÊ `
                  : ` XÁC NHẬN ĐÃ THU TIỀN `}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= BƯỚC 5: CẤP MÃ PIN SMART LOCK ================= */}
        {currentStep === 5 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="lock" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 5: Cấp PIN & Kích Hoạt Kho #{selectedUnitCode}</Text>
            </View>

            {/* Mã PIN 6 số */}
            <View style={s.pinSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.sectionSubtitle}>Mã PIN Smart Lock (6 số):</Text>
                <TouchableOpacity onPress={handleGenerateRandomPin} style={s.genPinBtn}>
                  <MaterialIcons name="refresh" size={14} color={T.primary} />
                  <Text style={s.genPinText}>Sinh mã ngẫu nhiên</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={s.pinInput}
                value={accessPin}
                onChangeText={setAccessPin}
                keyboardType="numeric"
                maxLength={6}
                placeholder="6 số PIN"
              />
            </View>

            {/* Mã RFID phụ */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.sectionSubtitle}>Mã thẻ từ RFID phụ (tùy chọn):</Text>
              <TextInput
                style={s.inputBox}
                value={customRfid}
                onChangeText={setCustomRfid}
                placeholder="Quẹt thẻ hoặc nhập mã RFID..."
              />
            </View>

            {/* Ghi chú */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.sectionSubtitle}>Ghi chú dặn dò:</Text>
              <TextInput
                style={s.inputBox}
                value={customNotes}
                onChangeText={setCustomNotes}
                placeholder="VD: Đã hướng dẫn khách sử dụng ứng dụng mở khóa..."
              />
            </View>

            {/* Tóm tắt hoàn tất */}
            <View style={s.finishSummaryBox}>
              <View style={s.finishRow}>
                <MaterialIcons name="check" size={16} color={T.emeraldText} />
                <Text style={s.finishText}>CCCD: Đã kiểm tra trùng khớp</Text>
              </View>
              <View style={s.finishRow}>
                <MaterialIcons name="check" size={16} color={T.emeraldText} />
                <Text style={s.finishText}>Hợp đồng: Đã ký kết hợp lệ</Text>
              </View>
              <View style={s.finishRow}>
                <MaterialIcons
                  name={isPaid ? 'check' : 'schedule'}
                  size={16}
                  color={isPaid ? T.emeraldText : T.amberText}
                />
                <Text style={[s.finishText, !isPaid && { color: T.amberText }]}>
                  {isPaid ? 'Tiền thuê: Đã thu đủ' : 'Tiền thuê: Ghi nợ thu sau'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom Navigation Bar ─── */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.navPrevBtn} onPress={handlePrev}>
          <MaterialIcons name="arrow-back" size={16} color={T.textMain} />
          <Text style={s.navPrevText}>{currentStep === 1 ? 'Hàng đợi' : 'Quay lại'}</Text>
        </TouchableOpacity>

        <Text style={s.stepCountText}>Bước {currentStep} / 5</Text>

        {currentStep < 5 ? (
          <TouchableOpacity style={s.navNextBtn} onPress={handleNext}>
            <Text style={s.navNextText}>Tiếp tục</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.finishBtn, (isSubmitting || isUploadingPhotos) && { opacity: 0.7 }]}
            onPress={handleFinish}
            disabled={isSubmitting || isUploadingPhotos}
          >
            {isSubmitting || isUploadingPhotos ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.finishBtnText}>
                  {isUploadingPhotos ? 'Đang tải ảnh...' : 'Đang xử lý...'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.finishBtnText}>Hoàn Tất & Cấp PIN</Text>
                <MaterialIcons name="check-circle" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Modal Đổi Ô Kho ─── */}
      <Modal visible={showUnitPickerModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Chọn ô kho thay thế</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {availableUnits.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[s.modalUnitItem, u.code === selectedUnitCode && s.modalUnitItemActive]}
                  onPress={() => {
                    setSelectedUnitCode(u.code);
                    setShowUnitPickerModal(false);
                  }}
                >
                  <Text style={s.modalUnitCode}>Ô #{u.code}</Text>
                  <Text style={s.modalUnitType}>{u.type} (Tầng {u.floor})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => setShowUnitPickerModal(false)}
            >
              <Text style={s.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Lightbox Xem Ảnh ─── */}
      {previewImage && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={s.lightboxBackdrop}
            onPress={() => setPreviewImage(null)}
            activeOpacity={1}
          >
            <Image source={{ uri: previewImage }} style={s.lightboxImg} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}

      {/* Modals Hợp Đồng & In */}
      <ContractPreviewModal
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
        appointment={appointment}
        assignedUnitCode={selectedUnitCode}
      />
      <PrintReceiptModal
        visible={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        appointment={appointment}
        assignedUnitCode={selectedUnitCode}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 15, fontWeight: '800', color: T.textMain },
  topSub: { fontSize: 12, color: T.textMuted },
  printQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  printQuickText: { fontSize: 12, fontWeight: '700', color: T.primary },

  stepperBar: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepItemActive: { backgroundColor: '#EFF6FF' },
  stepItemDone: { backgroundColor: '#F0FDF4' },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stepCircleActive: { backgroundColor: T.primary },
  stepCircleDone: { backgroundColor: T.emerald },
  stepNumText: { fontSize: 10, fontWeight: '800', color: T.textMuted },
  stepLabel: { fontSize: 10, color: T.textMuted, fontWeight: '600' },
  stepLabelActive: { color: T.primary, fontWeight: '800' },
  stepLabelDone: { color: T.emeraldText, fontWeight: '700' },

  contentScroll: { padding: 14, paddingBottom: 24 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: T.textMain },

  infoBox: {
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: T.textMuted },
  infoVal: { fontSize: 12, fontWeight: '600', color: T.textMain },

  checkActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  checkActionBoxActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  checkActionTitle: { fontSize: 12, fontWeight: '700', color: T.textMain },
  checkActionSub: { fontSize: 11, color: T.textMuted, marginTop: 2 },

  unitSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  unitSelectVal: { fontSize: 13, fontWeight: '800', color: T.primary, marginTop: 2 },
  changeUnitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeUnitBtnText: { fontSize: 12, fontWeight: '700', color: T.primary },

  sectionSubtitle: { fontSize: 12, fontWeight: '700', color: T.textMain, marginBottom: 8 },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cameraBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 10,
  },
  galleryBtnText: { color: T.primary, fontSize: 12, fontWeight: '700' },
  photoCard: {
    width: 105,
    height: 95,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
  },
  photoThumbWrap: { width: '100%', height: '100%' },
  photoImg: { width: '100%', height: '100%' },
  photoTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 9,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    fontWeight: '600',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checklistCard: {
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistText: { fontSize: 12, color: T.textMain, fontWeight: '600' },
  inputBox: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: T.textMain,
  },

  contractCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  contractHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  contractHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.primary,
  },
  contractGridRow: {
    flexDirection: 'row',
  },
  contractGridItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  contractGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contractGridVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  contractGridDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contractActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 11,
    borderRadius: 12,
  },
  contractActionBtnPrint: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  contractActionText: { fontSize: 11.5, fontWeight: '700', color: T.primary },

  signedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  signedBoxActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  signedTitle: { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  signedSub: { fontSize: 11, color: '#64748B', marginTop: 2 },

  priceBox: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceLow,
  },
  priceCol: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: T.border,
  },
  priceLabel: { fontSize: 10, color: T.textMuted },
  priceVal: { fontSize: 12, fontWeight: '700', color: T.textMain, marginTop: 2 },
  payMethodRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  payMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceLow,
  },
  payMethodBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: T.primary,
  },
  payMethodText: { fontSize: 11, fontWeight: '600', color: T.textMuted },
  payMethodTextActive: { color: T.primary, fontWeight: '800' },

  qrWrapper: { marginTop: 12, alignItems: 'center' },
  qrBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    width: '100%',
  },
  qrImage: { width: 180, height: 180 },
  qrHint: { fontSize: 10, color: T.textMuted, marginTop: 6 },
  bankDetailList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bankLabel: { fontSize: 11, color: T.textMuted, marginBottom: 2 },
  bankVal: { fontSize: 12, fontWeight: '700', color: T.textMain },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexShrink: 0,
  },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: T.primary },

  contentHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 10,
    marginTop: 2,
  },
  contentBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  contentBoxValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 0,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  copyBtnLargeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cashBox: {
    backgroundColor: T.emeraldBg,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: T.emeraldBorder,
  },
  cashTitle: { fontSize: 13, color: T.emeraldText, fontWeight: '700', marginTop: 4 },
  cashAmount: { fontSize: 20, fontWeight: '900', color: T.emeraldText, marginTop: 4 },
  cashSub: { fontSize: 11, color: T.emeraldText, opacity: 0.85, marginTop: 4, textAlign: 'center' },
  paidToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#475569',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  paidToggleBtnDone: {
    backgroundColor: T.emerald,
    shadowColor: T.emerald,
    shadowOpacity: 0.25,
  },
  paidToggleText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  pinSection: { marginTop: 4 },
  genPinBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  genPinText: { fontSize: 11, fontWeight: '700', color: T.primary },
  pinInput: {
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 10,
    color: T.textMain,
  },
  finishSummaryBox: {
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    gap: 4,
  },
  finishRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  finishText: { fontSize: 11, color: T.textMain, fontWeight: '600' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  navPrevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.surfaceLow,
  },
  navPrevText: { fontSize: 12, fontWeight: '700', color: T.textMain },
  stepCountText: { fontSize: 12, fontWeight: '700', color: T.textMuted },
  navNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.primary,
  },
  navNextText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.primary,
  },
  finishBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10, color: T.textMain },
  modalUnitItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  modalUnitItemActive: { backgroundColor: '#EFF6FF' },
  modalUnitCode: { fontSize: 13, fontWeight: '700', color: T.primary },
  modalUnitType: { fontSize: 11, color: T.textMuted },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 12, fontWeight: '700', color: T.textMain },

  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxImg: { width: '100%', height: '80%' },
});
