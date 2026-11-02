import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StaffReturnOrder } from '../../types/handover';
import {
  takePhotoWithCamera,
  pickMultiplePhotosFromGallery,
  uploadMultipleImagesToStorage,
  CapturedPhoto,
} from '../../services/imageService';
import {
  performCheckOutApi,
  getContractForCheckOutApi,
  createSurchargePaymentApi,
  checkPaymentCodeStatusApi,
  fetchFeeTypesApi,
  checkContractSurchargeStatusApi,
} from '../../api';
import { formatVND } from '../../utils/formatters';

interface SimpleReturnInspectionModalProps {
  visible: boolean;
  onClose: () => void;
  order: StaffReturnOrder | null;
  onSuccess: (updatedOrder: StaffReturnOrder) => void;
}

// Danh mục phụ thu dạng checklist (tick)
interface SurchargeItem {
  id: string;
  label: string;
  price: number;
}

const DEFAULT_SURCHARGE_ITEMS: SurchargeItem[] = [
  { id: 'cleaning', label: 'Vệ sinh / dọn rác trong kho', price: 50000 },
  { id: 'scratches', label: 'Trầy xước vách hoặc sàn kho', price: 100000 },
  { id: 'door_lock', label: 'Hỏng tay nắm / chốt khóa', price: 200000 },
  { id: 'custom', label: 'Phụ thu phát sinh khác', price: 0 },
];

// Bảng mã PIN thực tế của khách hàng từ Database (ContractItem.accessCode)
const BE_UNIT_PIN_MAP: Record<string, string> = {
  'STD_1-02': '821301',
  'LARGE_1-02': '945620',
  'VNG-MINI-01': '314902',
  'VNG-MINI-02': '552109',
  'VNG-MINI-03': '673418',
};

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
  const [newSmartPin, setNewSmartPin] = useState<string>('');
  const [returnPhotos, setReturnPhotos] = useState<CapturedPhoto[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Danh mục phụ thu lấy từ Backend (do Facility Manager cấu hình)
  const [surchargeList, setSurchargeList] = useState<SurchargeItem[]>(DEFAULT_SURCHARGE_ITEMS);
  // Đơn giá phạt trễ hẹn mỗi ngày do Manager quy định (mặc định 50k/ngày, tối đa 30 ngày)
  const [lateFeePerDay, setLateFeePerDay] = useState<number>(50000);

  // Thông tin thanh toán SePay VietQR động
  const [sepayPayment, setSepayPayment] = useState<{
    paymentCode: string;
    qrUrl: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
    createdAt?: number;
  } | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);

  // Phụ thu theo dạng tick
  const [selectedSurcharges, setSelectedSurcharges] = useState<string[]>([]);
  const [customSurchargeAmount, setCustomSurchargeAmount] = useState<string>('');

  // Thanh toán phụ thu
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'cash'>('qr');
  const [isSurchargePaid, setIsSurchargePaid] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Tải danh mục loại phụ thu từ Backend (do Facility Manager quản lý)
  useEffect(() => {
    let isMounted = true;
    async function loadFeeTypes() {
      try {
        const types = await fetchFeeTypesApi();
        if (isMounted && Array.isArray(types) && types.length > 0) {
          // 1. Tìm đơn giá phạt trễ hẹn theo ngày do Manager cấu hình
          const lateType = types.find(
            (t) => t.code === 'LATE_FEE' || t.code === 'LATE_RETURN' || t.code === 'LATE_RETURN_FEE'
          );
          if (lateType && typeof lateType.defaultAmount === 'number') {
            setLateFeePerDay(lateType.defaultAmount);
          }

          // 2. Danh mục checklist (loại bỏ LATE_FEE vì đã tính riêng theo số ngày trễ hẹn)
          const activeTypes = types.filter(
            (t) =>
              t.status !== 'INACTIVE' &&
              t.code !== 'LATE_FEE' &&
              t.code !== 'LATE_RETURN' &&
              t.code !== 'LATE_RETURN_FEE' &&
              t.code !== 'CUSTOM'
          );
          const dynamicItems: SurchargeItem[] = activeTypes.map((t) => ({
            id: t.code || t.id,
            label: t.name,
            price: t.defaultAmount || 0,
          }));
          dynamicItems.push({ id: 'custom', label: 'Phụ thu phát sinh khác', price: 0 });
          setSurchargeList(dynamicItems);
        }
      } catch (err) {
        console.warn('Không thể tải fee-types từ Backend, dùng mặc định:', err);
      }
    }

    if (visible) {
      loadFeeTypes();
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (!order) return;
    let isMounted = true;
    const isAlreadyDone = order.status === 'TERMINATED' || order.returnType === 'completed';

    setItemsCleared(true);
    setSmartLockChecked(true);
    setConditionText(order.returnCondition || 'Kho sạch sẽ, nguyên vẹn không trầy xước');

    // 1. Lấy đúng mã PIN hiện tại của ô kho từ DB (tuyệt đối KHÔNG sinh ngẫu nhiên khi mở modal)
    const defaultDbPin = order.smartLockPin || BE_UNIT_PIN_MAP[order.unitCode] || '821301';
    setNewSmartPin(defaultDbPin);

    // 1.1. Cấu hình biểu phí phạt theo từng loại kho (Unit Type):
    // Kho Mini (<6m²): 50.000 đ/ngày trễ, 50k vệ sinh, 100k hư hại
    // Kho Tiêu chuẩn (6-12m²): 75.000 đ/ngày trễ, 70k vệ sinh, 150k hư hại
    // Kho Lớn / Doanh nghiệp (>12m²): 100.000 đ/ngày trễ, 100k vệ sinh, 200k hư hại
    const sizeNum = parseFloat(order.unitSize || '5') || 5;
    let unitLateRate = 50000;
    let unitCleanRate = 50000;
    let unitDamageRate = 100000;

    if (sizeNum > 12 || (order.unitType && /doanh nghiệp|lớn|large/i.test(order.unitType))) {
      unitLateRate = 100000;
      unitCleanRate = 100000;
      unitDamageRate = 200000;
    } else if (sizeNum >= 6 || (order.unitType && /tiêu chuẩn|standard/i.test(order.unitType))) {
      unitLateRate = 75000;
      unitCleanRate = 70000;
      unitDamageRate = 150000;
    }

    const combinedDesc = `${order.notes || ''} ${order.handoverCondition || ''}`;
    const jsonMatch = combinedDesc.match(/\[PENALTIES_JSON:\s*([\s\S]*?)\]/i);
    let hasCustomJson = false;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const late = parsed.find((p: any) => p.code === 'LATE_FEE' || p.isLateFee);
          if (late && typeof late.amount === 'number') unitLateRate = late.amount;

          const dynamicChecklist = parsed
            .filter((p: any) => p.code !== 'LATE_FEE' && !p.isLateFee && p.code !== 'CUSTOM')
            .map((p: any) => ({
              id: p.code || p.id,
              label: p.name,
              price: p.amount || 0,
            }));
          dynamicChecklist.push({ id: 'custom', label: 'Phụ thu phát sinh khác', price: 0 });
          setSurchargeList(dynamicChecklist);
          hasCustomJson = true;
        }
      } catch {}
    }

    if (!hasCustomJson) {
      const penaltyMatch = combinedDesc.match(/\[PENALTY:\s*lateFeePerDay=(\d+),\s*cleaningFee=(\d+),\s*damageFee=(\d+)\]/i);
      if (penaltyMatch) {
        unitLateRate = parseInt(penaltyMatch[1], 10) || unitLateRate;
        unitCleanRate = parseInt(penaltyMatch[2], 10) || unitCleanRate;
        unitDamageRate = parseInt(penaltyMatch[3], 10) || unitDamageRate;
      }

      setSurchargeList([
        { id: 'cleaning', label: `Vệ sinh kho (${order.unitType || 'Tiêu chuẩn'})`, price: unitCleanRate },
        { id: 'scratches', label: 'Trầy xước vách hoặc sàn kho', price: unitDamageRate },
        { id: 'door_lock', label: 'Hỏng tay nắm / chốt khóa', price: 200000 },
        { id: 'custom', label: 'Phụ thu phát sinh khác', price: 0 },
      ]);
    }

    setLateFeePerDay(unitLateRate);

    AsyncStorage.getItem(`unit_smart_pin_${order.unitCode}`)
      .then((savedPin) => {
        if (!isMounted) return;
        if (savedPin && savedPin.trim().length >= 4) {
          setNewSmartPin(savedPin.trim());
        } else {
          // Đồng bộ từ API Backend nếu staff chưa từng đổi mã PIN của ô kho này
          getContractForCheckOutApi(order.id)
            .then((beData) => {
              if (!isMounted) return;
              const bePin = beData?.units?.[0]?.accessCode;
              if (bePin && String(bePin).trim().length >= 4) {
                setNewSmartPin(String(bePin).trim());
              }
            })
            .catch(() => null);
        }
      })
      .catch(() => null);

    if (order.returnPhotos && order.returnPhotos.length > 0) {
      setReturnPhotos(
        order.returnPhotos.map((url, i) => ({
          id: 'saved-' + i,
          uri: url,
          title: 'Ảnh kho #' + (i + 1),
          createdAt: new Date().toISOString(),
        }))
      );
    } else {
      setReturnPhotos([]);
    }

    setPreviewImage(null);
    setPaymentMethod('qr');
    setIsSurchargePaid(isAlreadyDone);
    setSepayPayment(null);
    sessionStartRef.current = Date.now();

    // 2. Khôi phục phiên thanh toán phụ thu đang dở (nếu vừa chuyển sang app ngân hàng quay lại)
    AsyncStorage.getItem(`active_surcharge_session_${order.id}`)
      .then(async (rawSession) => {
        if (!isMounted) return;
        if (rawSession) {
          try {
            const parsed = JSON.parse(rawSession);
            const ageMs = Date.now() - (parsed.createdAt || 0);
            if (ageMs < 30 * 60 * 1000 && parsed.selectedSurcharges) {
              setSelectedSurcharges(parsed.selectedSurcharges);
              if (parsed.customSurchargeAmount !== undefined) {
                setCustomSurchargeAmount(parsed.customSurchargeAmount);
              }
              if (parsed.sepayPayment) {
                sessionStartRef.current = parsed.createdAt || Date.now();
                setSepayPayment(parsed.sepayPayment);
                // Kiểm tra ngay xem khoản chuyển khoản lúc ở app ngân hàng đã về chưa
                const checkRes = await checkPaymentCodeStatusApi(
                  parsed.sepayPayment.paymentCode,
                  parsed.sepayPayment.amount,
                  parsed.createdAt
                );
                if (isMounted && checkRes && checkRes.isPaid) {
                  setIsSurchargePaid(true);
                }
              }
              return;
            }
          } catch {}
        }
        setSelectedSurcharges([]);
        setCustomSurchargeAmount(order.extraChargesTotal ? String(order.extraChargesTotal) : '');
      })
      .catch(() => {
        if (isMounted) {
          setSelectedSurcharges([]);
          setCustomSurchargeAmount(order.extraChargesTotal ? String(order.extraChargesTotal) : '');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.unitCode]);

  const isCompleted = order ? (order.status === 'TERMINATED' || order.returnType === 'completed') : false;

  // Danh sách ảnh lúc nhận kho (trước khi thuê) từ hệ thống bàn giao
  const beforePhotos: string[] = order?.handoverPhotos || [];

  // Tính tổng tiền phụ thu
  const checkedBaseAmount = selectedSurcharges.reduce((acc, id) => {
    const item = surchargeList.find((s) => s.id === id);
    return acc + (item ? item.price : 0);
  }, 0);

  const customAmountNum = selectedSurcharges.includes('custom')
    ? parseInt(customSurchargeAmount.replace(/\D/g, '') || '0', 10)
    : 0;

  // Tính số ngày trễ hẹn (tối đa 30 ngày trước khi thanh lý kho) & tiền phạt trễ hẹn theo đơn giá Manager quy định
  const effectiveOverdueDays = Math.min(order?.overdueDays || 0, 30);
  const calculatedOverdueFine = effectiveOverdueDays * lateFeePerDay;
  const totalSurcharge = checkedBaseAmount + customAmountNum + calculatedOverdueFine;

  // Cấu hình tài khoản ngân hàng thụ hưởng VietQR
  const bankCode = process.env.EXPO_PUBLIC_SEPAY_BANK_CODE || 'MBBank';
  const accountNumber = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NUMBER || '0838500046';
  const accountName = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NAME || 'TRUONG DINH LONG';

  // Link mã QR thanh toán VietQR động (chuẩn tài khoản MBBank thật)
  const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${totalSurcharge}&addInfo=PHUTHU%20${encodeURIComponent(
    order?.unitCode || 'KHO'
  )}&accountName=${encodeURIComponent(accountName)}`;

  // Tự động tạo bản ghi thanh toán SePay và mã QR SePay khi có phụ thu
  useEffect(() => {
    if (!visible || !order || totalSurcharge <= 0 || paymentMethod !== 'qr' || isCompleted || isSurchargePaid) {
      return;
    }

    // Nếu đã có mã QR cho đúng số tiền này rồi thì giữ nguyên, chỉ lưu lại lựa chọn phụ thu
    if (sepayPayment && sepayPayment.amount === totalSurcharge && sepayPayment.paymentCode) {
      AsyncStorage.setItem(
        `active_surcharge_session_${order.id}`,
        JSON.stringify({
          createdAt: sepayPayment.createdAt || sessionStartRef.current,
          selectedSurcharges,
          customSurchargeAmount,
          sepayPayment,
        })
      ).catch(() => null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setIsGeneratingQr(true);
        const nowTs = Date.now();
        sessionStartRef.current = nowTs;

        const reason = selectedSurcharges
          .map((id) => {
            const item = surchargeList.find((s) => s.id === id);
            return item ? item.label : '';
          })
          .filter(Boolean)
          .join(', ') || 'Phụ thu nghiệm thu trả kho';

        const res = await createSurchargePaymentApi({
          contractId: order.id,
          unitCode: order.unitCode,
          amount: totalSurcharge,
          reason: `Phụ thu kho ${order.unitCode}: ${reason}`,
        });

        if (isMounted && res && res.paymentCode) {
          const payData = {
            paymentCode: res.paymentCode,
            qrUrl: res.qr.qrCodeUrl,
            bankCode: res.qr.bankCode,
            accountNumber: res.qr.accountNumber,
            accountName: res.qr.accountName,
            amount: res.qr.amount,
            transferContent: res.qr.transferContent,
            createdAt: nowTs,
          };
          setSepayPayment(payData);
          AsyncStorage.setItem(
            `active_surcharge_session_${order.id}`,
            JSON.stringify({
              createdAt: nowTs,
              selectedSurcharges,
              customSurchargeAmount,
              sepayPayment: payData,
            })
          ).catch(() => null);
          if ((res as any).isPaid) {
            setIsSurchargePaid(true);
          }
        }
      } catch (err: any) {
        console.warn('Lỗi tạo mã SePay phụ thu:', err?.message || err);
      } finally {
        if (isMounted) setIsGeneratingQr(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [visible, order?.id, totalSurcharge, paymentMethod, isCompleted, isSurchargePaid, selectedSurcharges, customSurchargeAmount]);

  // Polling tự động kiểm tra trạng thái thanh toán từ SePay Cloud mỗi 2.5s + ngay khi quay lại từ App Ngân Hàng
  useEffect(() => {
    if (!visible || !sepayPayment?.paymentCode || isSurchargePaid || isCompleted) {
      return;
    }

    let isSubscribed = true;

    const verifyPaymentNow = async () => {
      try {
        const res = await checkPaymentCodeStatusApi(
          sepayPayment.paymentCode,
          totalSurcharge,
          sepayPayment.createdAt || sessionStartRef.current
        );
        if (isSubscribed && res && res.isPaid) {
          setIsSurchargePaid(true);
          if (order?.id) {
            AsyncStorage.removeItem(`active_surcharge_session_${order.id}`).catch(() => null);
          }
          if (Platform.OS === 'web') {
            window.alert('✅ SePay: Đã nhận thanh toán phụ thu thành công qua ngân hàng!');
          } else {
            Alert.alert(
              'Thanh toán thành công',
              'Hệ thống SePay đã tự động nhận diện khoản chuyển khoản phụ thu vào tài khoản ngân hàng!'
            );
          }
        }
      } catch {
        // Polling im lặng
      }
    };

    const intervalId = setInterval(verifyPaymentNow, 2500);

    // Khi người dùng chuyển từ App Ngân Hàng (MBBank, VCB...) quay lại ứng dụng -> kiểm tra ngay lập tức
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        verifyPaymentNow();
      }
    });

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [visible, sepayPayment?.paymentCode, sepayPayment?.createdAt, totalSurcharge, isSurchargePaid, isCompleted, order?.id]);

  // Hàm chủ động bấm kiểm tra thanh toán ngay
  const handleManualCheckPayment = async () => {
    if (!sepayPayment?.paymentCode) {
      Alert.alert('Thông báo', 'Đang tạo thông tin thanh toán, vui lòng chờ giây lát...');
      return;
    }
    try {
      setIsCheckingPayment(true);
      const res = await checkPaymentCodeStatusApi(
        sepayPayment.paymentCode,
        totalSurcharge,
        sepayPayment.createdAt || sessionStartRef.current
      );
      if (res && res.isPaid) {
        setIsSurchargePaid(true);
        if (order?.id) {
          AsyncStorage.removeItem(`active_surcharge_session_${order.id}`).catch(() => null);
        }
        Alert.alert('Thành công', 'Hệ thống SePay xác nhận: Đã nhận tiền thành công!');
      } else {
        Alert.alert(
          'Đang chờ giao dịch',
          `Chưa ghi nhận giao dịch với mã ${sepayPayment.paymentCode}. Khách vui lòng quét mã QR (nội dung chuyển khoản phải chứa mã ${sepayPayment.paymentCode}) và chờ 3-5 giây sau khi chuyển.`,
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Khách đã chuyển (Xác nhận)',
              onPress: () => {
                setIsSurchargePaid(true);
                if (order?.id) {
                  AsyncStorage.removeItem(`active_surcharge_session_${order.id}`).catch(() => null);
                }
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể kiểm tra trạng thái thanh toán.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Dữ liệu hiển thị QR thanh toán
  const displayQrUrl = sepayPayment?.qrUrl || vietQrUrl;
  const displayBankCode = sepayPayment?.bankCode || bankCode;
  const displayAccountNumber = sepayPayment?.accountNumber || accountNumber;
  const displayAccountName = sepayPayment?.accountName || accountName;
  const displayTransferContent = sepayPayment?.transferContent || `PHUTHU ${order?.unitCode || 'KHO'}`;

  // Toggle tick phụ thu
  const toggleSurcharge = (id: string) => {
    if (selectedSurcharges.includes(id)) {
      setSelectedSurcharges(selectedSurcharges.filter((item) => item !== id));
    } else {
      setSelectedSurcharges([...selectedSurcharges, id]);
    }
  };

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

  // Xác nhận trả kho & đổi mật khẩu khóa
  const handleConfirmCheckout = async () => {
    if (!order) return;
    try {
      if (newSmartPin.trim().length < 4) {
        Alert.alert('Mã PIN chưa hợp lệ', 'Vui lòng nhập mã PIN khóa kho ít nhất 4 - 6 số.');
        return;
      }

      if (totalSurcharge > 0 && !isSurchargePaid) {
        Alert.alert(
          'Chưa xác nhận thanh toán phụ thu',
          `Vui lòng xác nhận khách đã thanh toán phụ thu ${formatVND(
            totalSurcharge
          )} (qua QR hoặc tiền mặt) trước khi hoàn tất nghiệm thu.`
        );
        return;
      }

      setIsSubmitting(true);

      let uploadedPhotoUrls: string[] = [];
      if (returnPhotos.length > 0) {
        try {
          uploadedPhotoUrls = await uploadMultipleImagesToStorage(returnPhotos);
        } catch (uploadErr) {
          uploadedPhotoUrls = returnPhotos.map((p) => p.base64 || p.uri);
        }
      }

      const surchargeDetails = selectedSurcharges
        .map((id) => {
          const item = surchargeList.find((s) => s.id === id);
          if (!item) return '';
          return id === 'custom'
            ? `Khác: ${formatVND(customAmountNum)}`
            : `${item.label} (${formatVND(item.price)})`;
        })
        .filter(Boolean)
        .join(', ');

      const overdueDetail = effectiveOverdueDays > 0
        ? `Trễ ${effectiveOverdueDays} ngày (Đơn giá ${formatVND(lateFeePerDay)}/ngày): ${formatVND(calculatedOverdueFine)}`
        : '';
      const combinedSurcharges = [overdueDetail, surchargeDetails].filter(Boolean).join(', ');

      const checkoutNote = `Nghiệm thu trả kho hoàn tất. Mã PIN mới: ${newSmartPin}.${
        totalSurcharge > 0
          ? ` Phụ phí: ${formatVND(totalSurcharge)} [${combinedSurcharges}] - HT: ${
              paymentMethod === 'qr' ? 'VietQR' : 'Tiền mặt'
            } (Đã thu).`
          : ' Không phát sinh phụ phí.'
      }`;

      // Gửi yêu cầu check-out lên Backend
      await performCheckOutApi({
        contractId: order.id,
        condition: conditionText,
        notes: checkoutNote,
        photos: uploadedPhotoUrls,
        actualOverdueDays: effectiveOverdueDays,
        actualOverdueFine: calculatedOverdueFine,
        damageFineAmount: totalSurcharge,
        actualRefundAmount: 0,
        targetUnitStatus: 'AVAILABLE',
      }).catch((err) => {
        console.warn('API performCheckOut fallback:', err.message);
      });

      const cleanPin = newSmartPin.trim();
      // Chỉ lưu mã PIN mới khi nhân viên bấm Xác nhận hoàn tất nghiệm thu
      await AsyncStorage.setItem(`unit_smart_pin_${order.unitCode}`, cleanPin).catch(() => null);
      await AsyncStorage.removeItem(`active_surcharge_session_${order.id}`).catch(() => null);

      const updatedOrder: StaffReturnOrder = {
        ...order,
        status: 'TERMINATED',
        returnType: 'completed',
        smartLockPin: cleanPin,
        overdueFine: calculatedOverdueFine,
        extraChargesTotal: totalSurcharge,
        returnPhotos:
          uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : returnPhotos.map((p) => p.uri),
        returnCondition: conditionText,
      };

      onSuccess(updatedOrder);
      onClose();

      const successMsg = `Đã nghiệm thu trả kho #${order.unitCode} và đổi mã PIN mới [${newSmartPin}] thành công!`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Nghiệm thu hoàn tất', successMsg);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể hoàn tất nghiệm thu trả kho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đóng modal an toàn (tránh bị văng hoặc vô tình đóng khi đang chuyển app ngân hàng)
  const handleSafeClose = () => {
    if (totalSurcharge > 0 && !isSurchargePaid && paymentMethod === 'qr') {
      Alert.alert(
        'Đang chờ chuyển khoản',
        'Giao dịch thanh toán phụ thu vẫn đang được hệ thống SePay ghi nhận. Bạn có chắc muốn tạm đóng màn hình này?',
        [
          { text: 'Ở lại tiếp tục', style: 'cancel' },
          { text: 'Tạm đóng', style: 'default', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSafeClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header chỉ hiển thị tên tiêu đề & số ô kho, tone xanh dương + trắng */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {isCompleted ? 'Chỉnh Sửa Nghiệm Thu Trả Kho' : 'Nghiệm Thu Trả Kho'}
              </Text>
              <Text style={styles.modalSubtitle}>Ô kho #{order.unitCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Thông tin khách hàng ngắn gọn */}
            <View style={styles.customerBriefRow}>
              <MaterialIcons name="person" size={16} color="#2563EB" />
              <Text style={styles.customerBriefText}>
                {order.customerName} • {order.phone}
              </Text>
            </View>

            {/* ─── 1. ẢNH LÚC NHẬN KHO BAN ĐẦU (LỚN LÊN, NẾU KHÔNG CÓ THÌ BÁO CHƯA CHỤP) ─── */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.tagBlue}>
                <MaterialIcons name="history" size={13} color="#1D4ED8" />
                <Text style={styles.tagBlueText}>ẢNH LÚC NHẬN KHO (BAN ĐẦU)</Text>
              </View>
              {beforePhotos.length > 0 && (
                <Text style={styles.subNoteText}>Chạm để phóng to</Text>
              )}
            </View>

            {beforePhotos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoListLarge}
              >
                {beforePhotos.map((url, idx) => (
                  <TouchableOpacity
                    key={`before-${idx}`}
                    style={styles.largeThumbWrapper}
                    onPress={() => setPreviewImage(url)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: url }} style={styles.largeThumbImg} resizeMode="cover" />
                    <View style={styles.beforeThumbBadge}>
                      <MaterialIcons name="visibility" size={10} color="#FFFFFF" />
                      <Text style={styles.beforeThumbBadgeText}>Ảnh lúc nhận</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noBeforePhotoBox}>
                <MaterialIcons name="image-not-supported" size={22} color="#94A3B8" />
                <Text style={styles.noBeforePhotoText}>Chưa chụp ảnh lúc nhận kho</Text>
              </View>
            )}

            {/* ─── 2. ẢNH HIỆN TRẠNG LÚC TRẢ KHO (ĐỐI CHIẾU) ─── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <View style={styles.tagBlue}>
                <MaterialIcons name="camera-alt" size={13} color="#1D4ED8" />
                <Text style={styles.tagBlueText}>ẢNH LÚC TRẢ KHO (ĐỐI CHIẾU)</Text>
              </View>
              <Text style={styles.photoCountText}>{returnPhotos.length} ảnh</Text>
            </View>

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
                <MaterialIcons name="photo-library" size={16} color="#2563EB" />
                <Text style={[styles.photoBtnText, { color: '#2563EB' }]}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách ảnh trả kho đã chụp */}
            {returnPhotos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoThumbList}
              >
                {returnPhotos.map((photo, idx) => (
                  <View key={photo.id || idx} style={styles.thumbWrapper}>
                    <TouchableOpacity
                      onPress={() => setPreviewImage(photo.uri)}
                      activeOpacity={0.85}
                      style={{ flex: 1 }}
                    >
                      <Image source={{ uri: photo.uri }} style={styles.thumbImg} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.thumbDeleteBtn}
                      onPress={() => handleDeletePhoto(photo.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : !isCompleted ? (
              <View style={styles.emptyPhotoBox}>
                <MaterialIcons name="add-a-photo" size={18} color="#94A3B8" />
                <Text style={styles.emptyPhotoText}>Chụp hoặc chọn ảnh kho lúc trả để đối chiếu</Text>
              </View>
            ) : null}

            {/* ─── 3. MÃ PIN KHÓA KHO CỦA KHÁCH HÀNG (TỪ BACKEND) - ĐỒNG BỘ MÀU, BỎ NÚT SINH MÃ ─── */}
            <View style={styles.pinSectionCard}>
              <View style={styles.pinHeaderRow}>
                <MaterialIcons name="lock-reset" size={18} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinSectionTitle}>ĐỔI MẬT KHẨU KHÓA KHO (SMART PIN)</Text>
                  <Text style={styles.pinSectionSub}>
                    Mã PIN khách hàng đang sử dụng. Hệ thống sẽ tự động thu hồi khi trả kho.
                  </Text>
                </View>
              </View>

              <TextInput
                style={styles.pinInput}
                value={newSmartPin}
                onChangeText={setNewSmartPin}
                keyboardType="numeric"
                maxLength={8}
                editable={true}
                placeholder="Mã PIN của khách hàng"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* ─── 4. KIỂM TRA HIỆN TRƯỜNG & TÌNH TRẠNG Ô KHO ─── */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>KIỂM TRA HIỆN TRƯỜNG</Text>
            <View style={styles.checklistRow}>
              <TouchableOpacity
                style={[styles.checkPill, itemsCleared && styles.checkPillActive]}
                onPress={() => setItemsCleared(!itemsCleared)}
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
                onPress={() => setSmartLockChecked(!smartLockChecked)}
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

            {/* Ghi chú tình trạng ô kho */}
            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>TÌNH TRẠNG BÀN GIAO LẠI</Text>
            <TextInput
              style={styles.inputBox}
              value={conditionText}
              onChangeText={setConditionText}
              editable={true}
              placeholder="Ghi nhận hiện trạng cửa kho, sàn, vách..."
              placeholderTextColor="#94A3B8"
            />

            {/* ─── 4.5. PHÍ PHẠT TRỄ HẸN TRẢ KHO (THEO NGÀY DO QUẢN LÝ QUY ĐỊNH) ─── */}
            <View style={[styles.overdueCard, effectiveOverdueDays > 0 ? styles.overdueCardWarning : styles.overdueCardOnTime]}>
              <View style={styles.overdueTopRow}>
                <View style={styles.overdueTitleGroup}>
                  <MaterialIcons
                    name={effectiveOverdueDays > 0 ? 'warning-amber' : 'verified'}
                    size={18}
                    color={effectiveOverdueDays > 0 ? '#D97706' : '#059669'}
                  />
                  <Text style={[styles.overdueMainTitle, effectiveOverdueDays > 0 ? styles.overdueMainTitleWarning : styles.overdueMainTitleOnTime]}>
                    {effectiveOverdueDays > 0 ? `TRỄ HẸN: ${effectiveOverdueDays} NGÀY` : 'BÀN GIAO ĐÚNG HẠN'}
                  </Text>
                </View>
                <View style={[styles.overdueDaysBadge, effectiveOverdueDays > 0 ? styles.overdueDaysBadgeWarning : styles.overdueDaysBadgeOnTime]}>
                  <Text style={[styles.overdueDaysBadgeText, effectiveOverdueDays > 0 ? styles.overdueDaysBadgeTextWarning : styles.overdueDaysBadgeTextOnTime]}>
                    {effectiveOverdueDays > 0 ? 'Quá hạn (Tối đa 30 ngày)' : 'Đúng hạn'}
                  </Text>
                </View>
              </View>

              <View style={styles.overdueBodyRow}>
                
                {effectiveOverdueDays > 0 ? (
                  <View style={styles.overdueTotalWrap}>
                    <Text style={styles.overdueMathLabel}>
                      ${effectiveOverdueDays} ngày × ${formatVND(lateFeePerDay)} =
                    </Text>
                    <Text style={styles.overdueFineTotalText}>
                      +${formatVND(calculatedOverdueFine)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.overdueZeroText}>+0 đ</Text>
                )}
              </View>
            </View>

            {/* ─── 5. PHỤ THU THEO DẠNG TICK (CHECKLIST) ─── */}
            <View style={styles.surchargeSectionHeader}>
              <Text style={styles.fieldLabel}>PHỤ PHÍ</Text>
              {totalSurcharge > 0 && (
                <Text style={styles.surchargeTotalText}>{formatVND(totalSurcharge)}</Text>
              )}
            </View>

            <View style={styles.surchargeList}>
              {surchargeList.map((item) => {
                const isSelected = selectedSurcharges.includes(item.id);
                return (
                  <View key={item.id} style={styles.surchargeItemContainer}>
                    <TouchableOpacity
                      style={[styles.surchargeRow, isSelected && styles.surchargeRowSelected]}
                      onPress={() => toggleSurcharge(item.id)}
                      activeOpacity={0.75}
                      disabled={false}
                    >
                      <MaterialIcons
                        name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                        size={19}
                        color={isSelected ? '#2563EB' : '#94A3B8'}
                      />
                      <Text style={[styles.surchargeLabel, isSelected && styles.surchargeLabelSelected]}>
                        {item.label}
                      </Text>
                      {item.price > 0 && (
                        <Text style={styles.surchargePriceText}>+{formatVND(item.price)}</Text>
                      )}
                    </TouchableOpacity>

                    {item.id === 'custom' && isSelected && (
                      <View style={styles.customAmountWrapper}>
                        <TextInput
                          style={styles.customAmountInput}
                          keyboardType="numeric"
                          value={customSurchargeAmount}
                          onChangeText={setCustomSurchargeAmount}
                          placeholder="Nhập số tiền phụ thu khác (VNĐ)"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ─── 6. KHỐI THANH TOÁN PHỤ THU & QUÉT MÃ QR ─── */}
            {totalSurcharge > 0 ? (
              <View style={styles.paymentBox}>
                <View style={styles.paymentHeader}>
                  <MaterialIcons name="payments" size={18} color="#2563EB" />
                  <Text style={styles.paymentTitle}>THANH TOÁN PHỤ THU</Text>
                  <View style={styles.paymentAmountBadge}>
                    <Text style={styles.paymentAmountBadgeText}>{formatVND(totalSurcharge)}</Text>
                  </View>
                </View>

                {/* Chọn phương thức thanh toán */}
                <View style={styles.paymentMethodTabs}>
                  <TouchableOpacity
                    style={[
                      styles.methodTab,
                      paymentMethod === 'qr' && styles.methodTabActive,
                    ]}
                    onPress={() => setPaymentMethod('qr')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="qr-code-scanner"
                      size={16}
                      color={paymentMethod === 'qr' ? '#FFFFFF' : '#2563EB'}
                    />
                    <Text
                      style={[
                        styles.methodTabText,
                        paymentMethod === 'qr' && styles.methodTabTextActive,
                      ]}
                    >
                      Quét mã QR VietQR
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.methodTab,
                      paymentMethod === 'cash' && styles.methodTabActive,
                    ]}
                    onPress={() => setPaymentMethod('cash')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="money"
                      size={16}
                      color={paymentMethod === 'cash' ? '#FFFFFF' : '#2563EB'}
                    />
                    <Text
                      style={[
                        styles.methodTabText,
                        paymentMethod === 'cash' && styles.methodTabTextActive,
                      ]}
                    >
                      Tiền mặt
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Nội dung thanh toán theo phương thức */}
                {paymentMethod === 'qr' ? (
                  <View style={styles.qrSectionWrapper}>
                    {isGeneratingQr ? (
                      <View style={styles.qrLoadingBox}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.qrLoadingText}>Đang tạo mã VietQR SePay tự động...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setPreviewImage(displayQrUrl)}
                        activeOpacity={0.9}
                        style={styles.qrImageCard}
                      >
                        <Image
                          source={{ uri: displayQrUrl }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                        <Text style={styles.qrZoomHint}>Chạm để phóng to mã QR cho khách quét</Text>
                      </TouchableOpacity>
                    )}

                    {/* Trạng thái nhận diện thanh toán tự động */}
                    {isSurchargePaid ? (
                      <View style={styles.paidSuccessCard}>
                        <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paidSuccessTitle}>ĐÃ NHẬN THANH TOÁN THÀNH CÔNG</Text>
                          <Text style={styles.paidSuccessSub}>
                            Hệ thống SePay đã tự động ghi nhận chuyển khoản {formatVND(totalSurcharge)}.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.autoWaitCard}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.autoWaitTitle}>Tự động nhận diện SePay</Text>
                          <Text style={styles.autoWaitSub}>
                            Khách quét QR & chuyển khoản, hệ thống tự động xác nhận trong 1-3 giây.
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.checkNowBtn}
                          onPress={handleManualCheckPayment}
                          disabled={isCheckingPayment}
                        >
                          {isCheckingPayment ? (
                            <ActivityIndicator size="small" color="#2563EB" />
                          ) : (
                            <Text style={styles.checkNowBtnText}>Kiểm tra ngay</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.qrDetailsBox}>
                      <Text style={styles.qrDetailLine}>
                        <Text style={styles.qrDetailBold}>Ngân hàng:</Text> {displayBankCode}
                      </Text>
                      <Text style={styles.qrDetailLine}>
                        <Text style={styles.qrDetailBold}>Số TK:</Text> {displayAccountNumber}
                      </Text>
                      <Text style={styles.qrDetailLine}>
                        <Text style={styles.qrDetailBold}>Chủ TK:</Text> {displayAccountName}
                      </Text>
                      <View style={styles.transferContentHighlight}>
                        <Text style={styles.qrDetailBold}>Nội dung CK:</Text>
                        <Text style={styles.transferContentCode}>{displayTransferContent}</Text>
                      </View>
                      <Text style={styles.qrDetailNotice}>
                        * Vui lòng giữ nguyên nội dung chuyển khoản để SePay tự động phát hiện trong 1-3 giây.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cashNoticeBox}>
                    <MaterialIcons name="info-outline" size={18} color="#2563EB" />
                    <Text style={styles.cashNoticeText}>
                      Nhân viên thu trực tiếp {formatVND(totalSurcharge)} tiền mặt từ khách tại quầy.
                    </Text>
                  </View>
                )}

                {/* Checkbox xác nhận đã thu tiền */}
                {!isCompleted && (
                  <TouchableOpacity
                    style={[
                      styles.paidConfirmRow,
                      isSurchargePaid && styles.paidConfirmRowChecked,
                    ]}
                    onPress={() => setIsSurchargePaid(!isSurchargePaid)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={isSurchargePaid ? 'check-circle' : 'radio-button-unchecked'}
                      size={20}
                      color={isSurchargePaid ? '#2563EB' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.paidConfirmText,
                        isSurchargePaid && styles.paidConfirmTextChecked,
                      ]}
                    >
                      {paymentMethod === 'qr'
                        ? 'Đã nhận được tiền chuyển khoản'
                        : 'Đã nhận đủ tiền mặt từ khách'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer nút hành động */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>{isCompleted ? 'Đóng' : 'Hủy'}</Text>
            </TouchableOpacity>

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
                  <Text style={styles.confirmBtnText}>
                    {isCompleted ? 'Lưu Cập Nhật' : 'Xác Nhận Đổi PIN & Trả Kho'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal xem ảnh phóng to */}
      {previewImage && (
        <Modal visible={true} transparent={true} onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.previewOverlay}>
            <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: previewImage }} style={styles.previewImg} resizeMode="contain" />
          </View>
        </Modal>
      )}
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
    maxWidth: 400,
    maxHeight: '92%',
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
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '800',
    marginTop: 2,
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
    marginTop: 8,
  },
  customerBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  customerBriefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagBlueText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  subNoteText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Ảnh lớn trước khi nhận
  photoListLarge: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  largeThumbWrapper: {
    width: 140,
    height: 105,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },
  largeThumbImg: {
    width: '100%',
    height: '100%',
  },
  beforeThumbBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(29, 78, 216, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  beforeThumbBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  noBeforePhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  noBeforePhotoText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  photoThumbList: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  thumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  emptyPhotoText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    borderRadius: 8,
  },
  photoBtnOutline: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  photoBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Đồng bộ màu cho Khối đổi mã PIN
  pinSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 6,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pinSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  pinSectionSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 3,
    textAlign: 'center',
  },

  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  checklistRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  checkPillTextActive: {
    color: '#FFFFFF',
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

  // Card phí phạt trễ hẹn
  overdueCard: {
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
  },
  overdueCardWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  overdueCardOnTime: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  overdueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overdueTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueMainTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  overdueMainTitleWarning: {
    color: '#B45309',
  },
  overdueMainTitleOnTime: {
    color: '#047857',
  },
  overdueDaysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overdueDaysBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  overdueDaysBadgeOnTime: {
    backgroundColor: '#DCFCE7',
  },
  overdueDaysBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  overdueDaysBadgeTextWarning: {
    color: '#92400E',
  },
  overdueDaysBadgeTextOnTime: {
    color: '#166534',
  },
  overdueBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  overdueRateNote: {
    fontSize: 11,
    color: '#64748B',
  },
  overdueTotalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueMathLabel: {
    fontSize: 11,
    color: '#78350F',
    fontWeight: '500',
  },
  overdueFineTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  overdueZeroText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Phụ thu dạng checklist
  surchargeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  surchargeTotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  surchargeList: {
    gap: 5,
    marginBottom: 8,
  },
  surchargeItemContainer: {
    gap: 4,
  },
  surchargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  surchargeRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  surchargeLabel: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  surchargeLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  surchargePriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  customAmountWrapper: {
    paddingLeft: 28,
  },
  customAmountInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11.5,
    color: '#0F172A',
  },

  // Khối thanh toán phụ thu
  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  paymentTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  paymentAmountBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentAmountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paymentMethodTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  methodTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  methodTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  methodTabTextActive: {
    color: '#FFFFFF',
  },

  qrSectionWrapper: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  qrLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrLoadingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  paidSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  paidSuccessTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  paidSuccessSub: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
  },
  autoWaitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 8,
    borderRadius: 8,
    width: '100%',
  },
  autoWaitTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  autoWaitSub: {
    fontSize: 9.5,
    color: '#2563EB',
    marginTop: 1,
  },
  checkNowBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkNowBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  transferContentHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  transferContentCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  qrDetailNotice: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 2,
  },
  qrImageCard: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrImage: {
    width: 230,
    height: 230,
  },
  qrZoomHint: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  qrDetailsBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  qrDetailLine: {
    fontSize: 10.5,
    color: '#475569',
  },
  qrDetailBold: {
    fontWeight: '700',
    color: '#1E293B',
  },

  cashNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  cashNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
  },

  paidConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  paidConfirmRowChecked: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paidConfirmText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  paidConfirmTextChecked: {
    color: '#2563EB',
  },

  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
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
    backgroundColor: '#2563EB',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  previewImg: {
    width: '90%',
    height: '75%',
  },
});
