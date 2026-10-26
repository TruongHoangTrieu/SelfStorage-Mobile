import React, { useState, useEffect } from 'react';
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
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';
import {
  uploadCccdApi,
  createRentalPaymentApi,
  getReservationPaymentSummaryApi,
  simulatePaymentWebhookApi,
} from '../../api';

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
    identityType?: 'CCCD' | 'PASSPORT' | 'BUSINESS_LICENSE';
    identityNumber?: string;
    identityAddress?: string;
    isIdentityVerified?: boolean;
    identityFrontUrl?: string;
    identityBackUrl?: string;
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

  // Bước 1: KYC Định danh & Ô kho
  const [identityType, setIdentityType] = useState<'CCCD' | 'PASSPORT'>(
    appointment.identityType === 'PASSPORT' ? 'PASSPORT' : 'CCCD'
  );
  const [identityNumber, setIdentityNumber] = useState<string>(
    appointment.identityNumber ||
    (appointment.idCard && appointment.idCard !== 'Đã đối chiếu tại quầy' ? appointment.idCard : '079095012345')
  );
  const [identityAddress, setIdentityAddress] = useState<string>(
    appointment.identityAddress || 'Số 123 Đường Nguyễn Huệ, Quận 1, TP.HCM'
  );
  const [isCccdVerified, setIsCccdVerified] = useState<boolean>(appointment.isIdentityVerified ?? true);
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    appointment.assignedUnit || 'A-101'
  );
  const [showUnitPickerModal, setShowUnitPickerModal] = useState<boolean>(false);

  // Ảnh 2 mặt CCCD có đóng dấu Watermark chống sao chép
  const [frontCccdPhoto, setFrontCccdPhoto] = useState<CapturedPhoto | null>(
    appointment.identityFrontUrl
      ? {
          id: 'cccd-front-initial',
          title: 'Mặt trước CCCD',
          uri: appointment.identityFrontUrl,
          createdAt: new Date().toISOString(),
        }
      : null
  );
  const [backCccdPhoto, setBackCccdPhoto] = useState<CapturedPhoto | null>(
    appointment.identityBackUrl
      ? {
          id: 'cccd-back-initial',
          title: 'Mặt sau CCCD',
          uri: appointment.identityBackUrl,
          createdAt: new Date().toISOString(),
        }
      : null
  );
  const [isCapturingCccd, setIsCapturingCccd] = useState<boolean>(false);

  const handleCaptureCccd = async (side: 'front' | 'back') => {
    setIsCapturingCccd(true);
    const photo = await takePhotoWithCamera();
    if (photo) {
      const customized = { ...photo, title: side === 'front' ? 'Mặt trước CCCD' : 'Mặt sau CCCD' };
      if (side === 'front') setFrontCccdPhoto(customized);
      else setBackCccdPhoto(customized);
    }
    setIsCapturingCccd(false);
  };

  const handlePickCccd = async (side: 'front' | 'back') => {
    setIsCapturingCccd(true);
    const photo = await pickPhotoFromGallery();
    if (photo) {
      const customized = { ...photo, title: side === 'front' ? 'Mặt trước CCCD' : 'Mặt sau CCCD' };
      if (side === 'front') setFrontCccdPhoto(customized);
      else setBackCccdPhoto(customized);
    }
    setIsCapturingCccd(false);
  };

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
      uri: 'https://res.cloudinary.com/micb9okr/image/upload/v1792946232/selfstorage/storage_units/unit_sto1.png',
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

  // Bước 4: Thu tiền thuê kho
  // Bước 4: Thu tiền thuê kho (SePay VietQR)
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'cash'>('vietqr');
  const [isPaid, setIsPaid] = useState<boolean>(appointment.rentalStatus === 'paid');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // SePay VietQR Dynamic State
  const [sepayQrInfo, setSepayQrInfo] = useState<{
    qrCodeUrl: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
  } | null>(null);
  const [isLoadingPaymentQr, setIsLoadingPaymentQr] = useState<boolean>(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);

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

  // Cấu hình ngân hàng SePay (ưu tiên từ Backend, sau đó tới biến môi trường, cuối cùng fallback)
  const fallbackBankCode = process.env.EXPO_PUBLIC_SEPAY_BANK_CODE || 'MBBank';
  const fallbackAccountNumber = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NUMBER || '0900000000';
  const fallbackAccountName = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NAME || 'SELF STORAGE SYSTEM';

  const paymentContent = sepayQrInfo?.transferContent || `THANH TOAN ${appointment.id}`;
  const bankCode = sepayQrInfo?.bankCode || fallbackBankCode;
  const accountNumber = sepayQrInfo?.accountNumber || fallbackAccountNumber;
  const accountName = sepayQrInfo?.accountName || fallbackAccountName;
  const displayAmount = sepayQrInfo?.amount || remainingAmount;
  const qrUrl =
    sepayQrInfo?.qrCodeUrl ||
    `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${displayAmount}&addInfo=${encodeURIComponent(
      paymentContent
    )}&accountName=${encodeURIComponent(accountName)}`;

  // Tự động sinh mã thanh toán tiền thuê SePay khi vào Bước 4
  useEffect(() => {
    if (currentStep !== 4 || isPaid || sepayQrInfo) return;
    let isSubscribed = true;
    const fetchRentalPayment = async () => {
      try {
        setIsLoadingPaymentQr(true);
        const resId = (appointment as any).rawId || appointment.id.replace('RSV-', '');
        const res = await createRentalPaymentApi(resId, 'BANK_TRANSFER');
        if (isSubscribed && res?.qr) {
          setSepayQrInfo(res.qr);
        }
      } catch (err) {
        console.warn('Backend rental payment info notice:', err);
      } finally {
        if (isSubscribed) setIsLoadingPaymentQr(false);
      }
    };
    fetchRentalPayment();
    return () => {
      isSubscribed = false;
    };
  }, [currentStep, appointment.id, isPaid]);

  // Polling tự động lắng nghe Webhook SePay mỗi 3.5 giây khi ở Bước 4
  useEffect(() => {
    if (currentStep !== 4 || isPaid) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const resId = (appointment as any).rawId || appointment.id.replace('RSV-', '');
        const summary = await getReservationPaymentSummaryApi(resId);
        if (isSubscribed && (summary.rentalPaid || summary.reservationStatus === 'COMPLETED')) {
          setIsPaid(true);
          clearInterval(interval);
        }
      } catch {
        // silent
      }
    }, 3500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentStep, appointment.id, isPaid]);

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
      if (!identityNumber.trim()) {
        Alert.alert('Thiếu số định danh', 'Vui lòng nhập số CCCD hoặc Hộ chiếu của khách hàng.');
        return;
      }
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
    if (!identityNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số CCCD/Hộ chiếu tại Bước 1.');
      setCurrentStep(1);
      return;
    }
    if (!isContractSigned) {
      Alert.alert('Lỗi', 'Vui lòng ký hợp đồng tại Bước 3.');
      setCurrentStep(3);
      return;
    }

    let uploadedUrls: string[] = [];
    let frontUrl = appointment.identityFrontUrl;
    let backUrl = appointment.identityBackUrl;

    try {
      setIsUploadingPhotos(true);
      // Upload ảnh hiện trạng ô kho
      uploadedUrls = await uploadMultipleImagesToStorage(photos);

      // Upload ảnh CCCD 2 mặt đóng dấu Watermark lên Cloudinary Private Storage
      if (frontCccdPhoto && (!frontCccdPhoto.uri.startsWith('http') || frontCccdPhoto.base64)) {
        try {
          const resFront = await uploadCccdApi(frontCccdPhoto.uri, 'front', appointment.id);
          frontUrl = resFront.signedUrl || resFront.url;
        } catch (e) {
          frontUrl = frontCccdPhoto.uri;
        }
      } else if (frontCccdPhoto) {
        frontUrl = frontCccdPhoto.uri;
      }

      if (backCccdPhoto && (!backCccdPhoto.uri.startsWith('http') || backCccdPhoto.base64)) {
        try {
          const resBack = await uploadCccdApi(backCccdPhoto.uri, 'back', appointment.id);
          backUrl = resBack.signedUrl || resBack.url;
        } catch (e) {
          backUrl = backCccdPhoto.uri;
        }
      } else if (backCccdPhoto) {
        backUrl = backCccdPhoto.uri;
      }
    } catch (uploadErr) {
      console.warn('Lỗi khi upload ảnh:', uploadErr);
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
      identityType,
      identityNumber: identityNumber.trim(),
      identityAddress: identityAddress.trim(),
      isIdentityVerified: isCccdVerified,
      identityFrontUrl: frontUrl,
      identityBackUrl: backUrl,
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
        {/* ================= BƯỚC 1: XÁC THỰC ĐỊNH DANH (KYC) & Ô KHO ================= */}
        {currentStep === 1 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcons name="verified-user" size={20} color={T.primary} />
              <Text style={s.cardTitle}>Bước 1: Xác Thực Định Danh (KYC) & Ô Kho</Text>
            </View>

            {/* Thông tin khách hàng */}
            <View style={s.infoBox}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Khách hàng:</Text>
                <Text style={s.infoVal}>{appointment.customerName}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Số điện thoại:</Text>
                <Text style={s.infoVal}>{appointment.phone}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Email:</Text>
                <Text style={s.infoVal}>{appointment.email || 'customer@example.com'}</Text>
              </View>
            </View>

            {/* Chọn loại giấy tờ: CCCD vs Passport */}
            <Text style={[s.sectionSubtitle, { marginTop: 14 }]}>Loại giấy tờ định danh:</Text>
            <View style={s.kycTypeRow}>
              <TouchableOpacity
                style={[s.kycTypeBtn, identityType === 'CCCD' && s.kycTypeBtnActive]}
                onPress={() => setIdentityType('CCCD')}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="badge"
                  size={18}
                  color={identityType === 'CCCD' ? '#fff' : T.textMuted}
                />
                <Text style={[s.kycTypeText, identityType === 'CCCD' && s.kycTypeTextActive]}>
                  CCCD / Căn cước
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.kycTypeBtn, identityType === 'PASSPORT' && s.kycTypeBtnActive]}
                onPress={() => setIdentityType('PASSPORT')}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="flight"
                  size={18}
                  color={identityType === 'PASSPORT' ? '#fff' : T.textMuted}
                />
                <Text style={[s.kycTypeText, identityType === 'PASSPORT' && s.kycTypeTextActive]}>
                  Hộ chiếu (Passport)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chụp 2 mặt CCCD / Trang Hộ chiếu có đóng dấu Watermark */}
            <Text style={[s.sectionSubtitle, { marginTop: 16 }]}>
              Ảnh chụp {identityType === 'CCCD' ? 'CCCD / Căn cước' : 'Hộ chiếu'} gốc (Watermark bảo mật):
            </Text>
            <View style={s.cccdGrid}>
              {/* Mặt trước / Trang thông tin */}
              <View style={s.cccdBox}>
                <View style={s.cccdHeaderRow}>
                  <Text style={s.cccdBoxTitle} numberOfLines={1}>
                    {identityType === 'CCCD' ? '1. Mặt trước CCCD' : '1. Trang thông tin Hộ chiếu'}
                  </Text>
                  {frontCccdPhoto && (
                    <View style={s.cccdStatusBadge}>
                      <MaterialIcons name="check-circle" size={12} color="#16A34A" />
                      <Text style={s.cccdStatusText}>Đã chụp</Text>
                    </View>
                  )}
                </View>

                {frontCccdPhoto ? (
                  <View style={s.cccdPreviewWrap}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={s.cccdImageTouch}
                      onPress={() => setPreviewImage(frontCccdPhoto.uri || frontCccdPhoto.base64 || null)}
                    >
                      <Image
                        source={{ uri: frontCccdPhoto.uri || frontCccdPhoto.base64 }}
                        style={s.cccdPreviewImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    <View style={s.cccdWatermarkTag}>
                      <MaterialIcons name="lock" size={11} color="#fff" />
                      <Text style={s.cccdWatermarkText}>Bảo mật Watermark</Text>
                    </View>

                    <View style={s.cccdOverlayActions}>
                      <TouchableOpacity
                        style={s.cccdOverlayBtn}
                        onPress={() => setPreviewImage(frontCccdPhoto.uri || frontCccdPhoto.base64 || null)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="zoom-in" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.cccdOverlayBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => setFrontCccdPhoto(null)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.cccdPlaceholder}>
                    <View style={s.cccdIconCircle}>
                      <MaterialIcons
                        name={identityType === 'CCCD' ? 'credit-card' : 'badge'}
                        size={22}
                        color={T.primary}
                      />
                    </View>
                    <Text style={s.cccdPlaceholderTitle}>
                      {identityType === 'CCCD' ? 'Chưa chụp mặt trước' : 'Chưa chụp trang chính'}
                    </Text>
                    <View style={s.cccdActionCol}>
                      <TouchableOpacity
                        style={s.cccdActionBtnPrimary}
                        onPress={() => handleCaptureCccd('front')}
                        disabled={isCapturingCccd}
                      >
                        <MaterialIcons name="camera-alt" size={13} color="#fff" />
                        <Text style={s.cccdActionBtnPrimaryText}>Chụp ảnh</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.cccdActionBtnSecondary}
                        onPress={() => handlePickCccd('front')}
                        disabled={isCapturingCccd}
                      >
                        <MaterialIcons name="photo-library" size={13} color={T.primary} />
                        <Text style={s.cccdActionBtnSecondaryText}>Thư viện</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Mặt sau / Thị thực */}
              <View style={s.cccdBox}>
                <View style={s.cccdHeaderRow}>
                  <Text style={s.cccdBoxTitle} numberOfLines={1}>
                    {identityType === 'CCCD' ? '2. Mặt sau CCCD' : '2. Thị thực / Bìa Hộ chiếu'}
                  </Text>
                  {backCccdPhoto && (
                    <View style={s.cccdStatusBadge}>
                      <MaterialIcons name="check-circle" size={12} color="#16A34A" />
                      <Text style={s.cccdStatusText}>Đã chụp</Text>
                    </View>
                  )}
                </View>

                {backCccdPhoto ? (
                  <View style={s.cccdPreviewWrap}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={s.cccdImageTouch}
                      onPress={() => setPreviewImage(backCccdPhoto.uri || backCccdPhoto.base64 || null)}
                    >
                      <Image
                        source={{ uri: backCccdPhoto.uri || backCccdPhoto.base64 }}
                        style={s.cccdPreviewImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    <View style={s.cccdWatermarkTag}>
                      <MaterialIcons name="lock" size={11} color="#fff" />
                      <Text style={s.cccdWatermarkText}>Bảo mật Watermark</Text>
                    </View>

                    <View style={s.cccdOverlayActions}>
                      <TouchableOpacity
                        style={s.cccdOverlayBtn}
                        onPress={() => setPreviewImage(backCccdPhoto.uri || backCccdPhoto.base64 || null)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="zoom-in" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.cccdOverlayBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => setBackCccdPhoto(null)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.cccdPlaceholder}>
                    <View style={s.cccdIconCircle}>
                      <MaterialIcons
                        name={identityType === 'CCCD' ? 'flip-to-back' : 'flight'}
                        size={22}
                        color={T.primary}
                      />
                    </View>
                    <Text style={s.cccdPlaceholderTitle}>
                      {identityType === 'CCCD' ? 'Chưa chụp mặt sau' : 'Chưa chụp thị thực'}
                    </Text>
                    <View style={s.cccdActionCol}>
                      <TouchableOpacity
                        style={s.cccdActionBtnPrimary}
                        onPress={() => handleCaptureCccd('back')}
                        disabled={isCapturingCccd}
                      >
                        <MaterialIcons name="camera-alt" size={13} color="#fff" />
                        <Text style={s.cccdActionBtnPrimaryText}>Chụp ảnh</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.cccdActionBtnSecondary}
                        onPress={() => handlePickCccd('back')}
                        disabled={isCapturingCccd}
                      >
                        <MaterialIcons name="photo-library" size={13} color={T.primary} />
                        <Text style={s.cccdActionBtnSecondaryText}>Thư viện</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
           
            {/* Nhập & Đối chiếu thông tin giấy tờ */}
            <View style={s.kycInputGroup}>
              <Text style={s.kycInputLabel}>
                Số {identityType === 'CCCD' ? 'CCCD / Căn cước' : 'Hộ chiếu'} đối chiếu: *
              </Text>
              <View style={s.kycInputWrap}>
                <MaterialIcons name="badge" size={18} color={T.textMuted} />
                <TextInput
                  style={s.kycInput}
                  value={identityNumber}
                  onChangeText={setIdentityNumber}
                  placeholder={`Nhập số ${identityType}`}
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={s.kycInputGroup}>
              <Text style={s.kycInputLabel}>Địa chỉ thường trú / Nơi cấp:</Text>
              <View style={s.kycInputWrap}>
                <MaterialIcons name="home" size={18} color={T.textMuted} />
                <TextInput
                  style={s.kycInput}
                  value={identityAddress}
                  onChangeText={setIdentityAddress}
                  placeholder="Nhập địa chỉ ghi trên giấy tờ"
                  placeholderTextColor={T.textMuted}
                />
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
                  Đã đối chiếu người thật khớp với giấy tờ gốc xuất trình
                </Text>
                <Text style={s.checkActionSub}>Nhân viên xác nhận khuôn mặt và thông tin trùng khớp</Text>
              </View>
            </TouchableOpacity>

            {/* Ô kho & Đổi ô */}
            <View style={s.unitSelectBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Ô kho được gán bàn giao:</Text>
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

            {/* Nút Xem Toàn Văn Hợp Đồng Điện Tử */}
            <TouchableOpacity
              style={s.viewContractFullBtn}
              onPress={() => setShowContractModal(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="visibility" size={18} color="#FFFFFF" />
              <Text style={s.viewContractFullText}>Xem Toàn Văn Hợp Đồng Điện Tử</Text>
            </TouchableOpacity>

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
                {isLoadingPaymentQr && (
                  <View style={s.qrLoadingBox}>
                    <ActivityIndicator size="small" color={T.primary} />
                    <Text style={s.qrLoadingText}>Đang lấy thông tin VietQR SePay từ hệ thống...</Text>
                  </View>
                )}

                {isPaid && (
                  <View style={s.sepaySuccessBadge}>
                    <MaterialIcons name="verified" size={18} color="#15803D" />
                    <Text style={s.sepaySuccessText}>
                      Hệ thống SePay đã tự động xác nhận thanh toán thành công!
                    </Text>
                  </View>
                )}

                <View style={s.qrBox}>
                  <Image source={{ uri: qrUrl }} style={s.qrImage} resizeMode="contain" />
                  <Text style={s.qrHint}>Đưa màn hình cho khách quét bằng App Ngân hàng</Text>
                </View>

                {/* Thông tin chuyển khoản */}
                <View style={s.bankDetailList}>
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Ngân hàng:</Text>
                    <Text style={[s.bankVal, { fontWeight: '700' }]}>{bankCode}</Text>
                  </View>

                  <View style={s.bankRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={s.bankLabel}>Số tài khoản:</Text>
                      <Text style={[s.bankVal, { color: T.primary, fontWeight: '800', fontSize: 14 }]}>
                        {accountNumber}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCopy(accountNumber, 'STK')}
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

                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Chủ tài khoản:</Text>
                    <Text style={[s.bankVal, { fontWeight: '700' }]}>{accountName}</Text>
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

                  {/* Nút mô phỏng thanh toán SePay dành cho kiểm thử */}
                  {!isPaid && (
                    <TouchableOpacity
                      style={s.simulateBtn}
                      onPress={async () => {
                        try {
                          setIsSimulatingPayment(true);
                          await simulatePaymentWebhookApi({
                            gateway: bankCode,
                            accountNumber: accountNumber,
                            content: paymentContent,
                            transferAmount: displayAmount,
                          });
                          setIsPaid(true);
                          Alert.alert('Thành công', 'Đã mô phỏng thanh toán SePay thành công!');
                        } catch {
                          setIsPaid(true);
                          Alert.alert('Đã xác nhận', 'Đã đánh dấu đã thu tiền thuê kho.');
                        } finally {
                          setIsSimulatingPayment(false);
                        }
                      }}
                      disabled={isSimulatingPayment}
                    >
                      {isSimulatingPayment ? (
                        <ActivityIndicator size="small" color="#D97706" />
                      ) : (
                        <MaterialIcons name="bolt" size={14} color="#D97706" />
                      )}
                      <Text style={s.simulateBtnText}>
                        {isSimulatingPayment ? 'Đang kích hoạt SePay...' : 'Mô phỏng thanh toán SePay (Test)'}
                      </Text>
                    </TouchableOpacity>
                  )}
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

      {/* Modal Xem Hợp Đồng Điện Tử */}
      <ContractPreviewModal
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
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

  kycTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  kycTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
  },
  kycTypeBtnActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  kycTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textMain,
  },
  kycTypeTextActive: {
    color: '#fff',
  },
  cccdGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  cccdBox: {
    flex: 1,
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
  },
  cccdHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 18,
  },
  cccdBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMain,
    flex: 1,
  },
  cccdStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  cccdStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  cccdPlaceholder: {
    minHeight: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cccdIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cccdPlaceholderTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: T.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  cccdActionCol: {
    width: '100%',
    gap: 6,
  },
  cccdActionBtnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: T.primary,
    borderRadius: 6,
    paddingVertical: 6,
  },
  cccdActionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cccdActionBtnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingVertical: 5.5,
  },
  cccdActionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.primary,
  },
  cccdPreviewWrap: {
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cccdImageTouch: {
    width: '100%',
    height: '100%',
  },
  cccdPreviewImg: {
    width: '100%',
    height: '100%',
  },
  cccdWatermarkTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 74, 198, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cccdWatermarkText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  cccdOverlayActions: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  cccdOverlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#0369A1',
    fontWeight: '500',
  },
  kycInputGroup: {
    marginBottom: 10,
  },
  kycInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textMain,
    marginBottom: 4,
  },
  kycInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
    height: 42,
  },
  kycInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: T.textMain,
    paddingVertical: 0,
  },

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

  viewContractFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  viewContractFullText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

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

  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 6,
  },
  simulateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  qrLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  qrLoadingText: {
    fontSize: 11,
    color: T.primary,
    fontWeight: '600',
  },
  sepaySuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    width: '100%',
  },
  sepaySuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
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
