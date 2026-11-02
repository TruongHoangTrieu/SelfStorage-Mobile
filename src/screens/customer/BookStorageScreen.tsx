import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  Animated,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Facility, UnitType, Reservation, apiRequest, getAuthToken, loginCustomerApi } from "../../api";
import CustomerBottomNavBar, {
  CustomerTabType,
} from "../../components/customer/CustomerBottomNavBar";
import {
  Props,
  StorageDisplayItem,
  T,
  FACILITY_PHOTOS,
  DISTRICT_COORDINATES,
  calculateHaversineKm,
  extractDistrict,
  formatVND,
} from "./booking/bookingTypes";
import Step1ExploreAndDetail from "./booking/steps/Step1ExploreAndDetail";
import Step2ContractConfig from "./booking/steps/Step2ContractConfig";
import Step3VietQRPayment from "./booking/steps/Step3VietQRPayment";
import Step4BookingSuccess from "./booking/steps/Step4BookingSuccess";

export type { StorageDisplayItem };

export default function BookStorageScreen({
  facilities,
  unitTypes,
  loading,
  onReservationCreated,
  onViewMyReservations,
  onNavigateTab,
  activeBottomTab = "search",
  onOpenLogin,
  onLogout,
  currentUser,
  initialSelectedUnit,
  onClearInitialSelectedUnit,
  onOpenNotifications,
  unreadNotifCount = 0,
  onOpenAiAssistant,
  triggerOpenBranchPicker,
}: Props) {
  // Navigation Flow: step 1 = explore, step 2 = schedule/contract, step 3 = VietQR deposit payment, step 4 = success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [showBranchSelectModal, setShowBranchSelectModal] = useState<boolean>(false);

  useEffect(() => {
    if (triggerOpenBranchPicker) {
      setShowBranchSelectModal(true);
    }
  }, [triggerOpenBranchPicker]);

  // Mở Google Maps / Apple Maps chỉ đường đến cơ sở kho
  const handleOpenDirections = (address: string, title: string) => {
    const query = encodeURIComponent(`${title}, ${address}, TP. Hồ Chí Minh`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  // Selected Facility State
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const [facilityDistrictFilter, setFacilityDistrictFilter] = useState("ALL");

  // Floating Toast thông báo tự tắt sau 3 giây
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-16)).current;
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -16,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Vị trí GPS thật của khách hàng
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted" && isMounted) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords && isMounted) {
            setUserLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });
          }
        }
      } catch (err) {
        // Fallback im lặng nếu không có quyền GPS
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Districts for Filter Chips
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      const d = extractDistrict(f.address || "", f.name || "");
      if (d && d.toUpperCase() !== "ALL") set.add(d);
    });
    return Array.from(set);
  }, [facilities]);

  // Category & Unit Selection States
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "personal" | "family" | "business"
  >("all");

  const [selectedUnit, setSelectedUnit] = useState<StorageDisplayItem | null>(null);
  const [pendingUnitToBookAfterLogin, setPendingUnitToBookAfterLogin] =
    useState<StorageDisplayItem | null>(null);

  useEffect(() => {
    if (currentUser && pendingUnitToBookAfterLogin) {
      setSelectedUnit(pendingUnitToBookAfterLogin);
      setCurrentStep(2);
      setPendingUnitToBookAfterLogin(null);
    }
  }, [currentUser, pendingUnitToBookAfterLogin]);

  // Step 2 Form States
  const [moveInDateStr, setMoveInDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState("09:00 - 10:00");
  const [rentalTermMonths, setRentalTermMonths] = useState<1 | 3 | 6 | 12>(6);
  const [contractNotes, setContractNotes] = useState("");

  // SePay VietQR Deposit States (Step 3)
  const [qrData, setQrData] = useState<{
    qrCodeUrl: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
  } | null>(null);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(900); // 15 mins (900s)
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState(false);
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  // Submitting & Reservation result
  const [submitting, setSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Active Bottom Tab
  const [currentBottomTab, setCurrentBottomTab] = useState<CustomerTabType>(
    activeBottomTab || "search"
  );

  const [activeFilterPill, setActiveFilterPill] = useState<
    "for-you" | "personal" | "family" | "business" | "ac"
  >("for-you");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(["feat-1"]));

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Map API data -> display items
  const storageItems: StorageDisplayItem[] = useMemo(() => {
    if (!unitTypes || unitTypes.length === 0) return [];

    return unitTypes.map((ut) => {
      const fac = facilities?.find(
        (f) => String(f.id) === String((ut as any).facilityId)
      );
      const size = Number(ut.size) || 0;
      const category: StorageDisplayItem["category"] =
        size <= 3 ? "personal" : size <= 9 ? "family" : "business";

      const available =
        (ut as any).availableUnits ?? (ut as any).availableCount;

      const badgeStatus =
        available === undefined
          ? "Đang cập nhật"
          : available > 0
          ? `Còn ${available} kho trống`
          : "Tạm hết phòng";

      const utImage =
        Array.isArray((ut as any).images) && (ut as any).images.length > 0
          ? (ut as any).images[0]
          : ut.image || "";

      const facImage =
        Array.isArray((fac as any)?.images) && (fac as any).images.length > 0
          ? (fac as any).images[0]
          : (fac as any)?.image || "";

      return {
        id: `item-${ut.id}`,
        facilityId: fac?.id ?? (ut as any).facilityId,
        unitTypeId: ut.id,
        facilityName: fac?.name ?? "",
        locationText: fac?.address ?? "",
        title: ut.name,
        unitCode: `#${fac?.code ?? "FAC"}-${(ut as any).code ?? String(ut.id).slice(-4).toUpperCase()}`,
        floorText: `Sơ đồ buồng kho ${fac?.name ?? ""}`.trim(),
        image: utImage || facImage,
        blueprintImage: (ut as any).blueprintImage || "",
        badgeStatus,
        badgeDiscount: (ut as any).promotionLabel,
        floorArea: `${size} ${ut.sizeUnit || "m²"}`.trim(),
        volume: "",
        dimensions: (ut as any).dimensions || "",
        capacity: ut.description ?? "",
        features: ((ut as any).features as string[]) ?? [],
        originalPrice: (ut as any).originalPrice,
        monthlyBasePrice: Number(ut.price) || 0,
        depositAmount: Number(ut.depositAmount) || Number(ut.price) || 0,
        category,
        amenities: [],
      };
    });
  }, [unitTypes, facilities]);

  // Initial unit selection if opened from external navigation
  useEffect(() => {
    if (initialSelectedUnit && storageItems.length > 0) {
      const match = storageItems.find(
        (i) =>
          String(i.unitTypeId) === String(initialSelectedUnit.id) ||
          String(i.id) === String(initialSelectedUnit.id)
      );
      if (match) {
        setSelectedUnit(match);
        const parentFac = facilities.find(
          (f) => String(f.id) === String(match.facilityId)
        );
        if (parentFac) setSelectedFacility(parentFac);
      }
      onClearInitialSelectedUnit?.();
    }
  }, [initialSelectedUnit, storageItems, facilities, onClearInitialSelectedUnit]);

  // Calculations for Step 2
  const calc = useMemo(() => {
    if (!selectedUnit) {
      return {
        ratePerMonth: 0,
        discountPct: 0,
        grossRent: 0,
        discountSavings: 0,
        totalRent: 0,
        depositAmount: 0,
      };
    }
    const baseRate = selectedUnit.monthlyBasePrice;
    const discountPct = 0;
    const ratePerMonth = baseRate;
    const grossRent = baseRate * rentalTermMonths;
    const totalRent = baseRate * rentalTermMonths;
    const discountSavings = 0;
    const depositAmount = Number(selectedUnit.depositAmount) || baseRate;

    return {
      ratePerMonth,
      discountPct,
      grossRent,
      discountSavings,
      totalRent,
      depositAmount,
    };
  }, [selectedUnit, rentalTermMonths]);

  // Dynamic Facilities mapping
  const dynamicFacilities = useMemo(() => {
    const list = facilities.map((fac, idx) => {
      const facUnits = unitTypes.filter(
        (ut) => String((ut as any).facilityId) === String(fac.id)
      );
      const validPrices = facUnits
        .map((u) => Number(u.price) || 0)
        .filter((p) => p > 0);
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const district = extractDistrict(fac.address || "", fac.name || "");
      const facImg =
        (Array.isArray((fac as any).images) && (fac as any).images[0]) ||
        (fac as any).image ||
        FACILITY_PHOTOS[idx % FACILITY_PHOTOS.length];
      const availableCount =
        (fac as any).availableUnits ??
        (fac as any)._count?.storageUnits ??
        facUnits.reduce(
          (acc, u) => acc + (Number((u as any).availableUnits) || 0),
          0
        );

      let badge = "Đang hoạt động";
      let badgeType: "white" | "amber" = "white";
      if (availableCount === 1) {
        badge = "Sắp hết (Còn 1)";
        badgeType = "amber";
      } else if (availableCount > 0) {
        badge = `Còn ${availableCount} buồng`;
      }

      const hasPersonal = facUnits.some((u) => Number(u.size) <= 3);
      const hasFamily = facUnits.some(
        (u) => Number(u.size) > 3 && Number(u.size) <= 9
      );
      const hasBusiness = facUnits.some((u) => Number(u.size) > 9);
      const hasAC =
        facUnits.some((u) =>
          ((u as any).features || []).some(
            (f: string) =>
              typeof f === "string" &&
              (f.toLowerCase().includes("lạnh") ||
                f.toLowerCase().includes("ac"))
          )
        ) || (fac.address || "").toLowerCase().includes("máy lạnh");

      return {
        id: `fac-${fac.id}`,
        facility: fac,
        title: fac.name,
        price: minPrice > 0 ? formatVND(minPrice) : "Liên hệ",
        priceUnit: minPrice > 0 ? "/tháng" : "",
        location: fac.address || district || "TP. Hồ Chí Minh",
        district,
        badge,
        badgeType,
        image: facImg,
        availableCount,
        unitTypesCount: facUnits.length,
        tag: facUnits.length > 0 ? `${facUnits.length} loại kho` : "Cho thuê",
        tagType: hasBusiness ? ("business" as const) : ("primary" as const),
        hasPersonal,
        hasFamily,
        hasBusiness,
        hasAC,
        lat: (fac as any).lat || DISTRICT_COORDINATES[district]?.lat || 10.8031,
        lng: (fac as any).lng || DISTRICT_COORDINATES[district]?.lng || 10.7456,
      };
    });

    const withDistance = list.map((item) => {
      let realKm: number | null = null;
      if (userLocation) {
        realKm = calculateHaversineKm(userLocation.lat, userLocation.lng, item.lat, item.lng);
      }
      return {
        ...item,
        realDistanceKm: realKm !== null ? realKm.toFixed(1) : null,
        rawDistanceNum: realKm !== null ? realKm : 99999,
      };
    });

    if (userLocation) {
      withDistance.sort((a, b) => a.rawDistanceNum - b.rawDistanceNum);
    }

    return withDistance.map((item, idx) => ({
      ...item,
      isNearest: userLocation ? idx === 0 : false,
    }));
  }, [facilities, unitTypes, userLocation]);

  const selectedFacilityDistance = useMemo(() => {
    if (!selectedFacility || !Array.isArray(dynamicFacilities)) return null;
    const match = dynamicFacilities?.find(
      (f) => String(f.id) === String(selectedFacility?.id)
    );
    return match?.realDistanceKm ? `${match.realDistanceKm} km` : null;
  }, [selectedFacility, dynamicFacilities]);

  const selectedFacilityPhoto = useMemo(() => {
    if (!selectedFacility) return FACILITY_PHOTOS[0];
    if (
      Array.isArray((selectedFacility as any).images) &&
      (selectedFacility as any).images.length > 0
    ) {
      return (selectedFacility as any).images[0];
    }
    if ((selectedFacility as any).image) {
      return (selectedFacility as any).image;
    }
    const idx =
      Math.abs(
        selectedFacility?.id ? String(selectedFacility?.id).charCodeAt(0) : 0
      ) % FACILITY_PHOTOS.length;
    return FACILITY_PHOTOS[idx];
  }, [selectedFacility]);

  const filteredDynamicFacilities = useMemo(() => {
    return dynamicFacilities.filter((item) => {
      if (facilityDistrictFilter !== "ALL" && item.district !== facilityDistrictFilter)
        return false;
      if (activeFilterPill === "personal" && !item.hasPersonal && item.unitTypesCount > 0)
        return false;
      if (activeFilterPill === "family" && !item.hasFamily && item.unitTypesCount > 0)
        return false;
      if (activeFilterPill === "business" && !item.hasBusiness && item.unitTypesCount > 0)
        return false;
      if (activeFilterPill === "ac" && !item.hasAC && item.unitTypesCount > 0)
        return false;

      if (facilitySearchQuery.trim()) {
        const q = facilitySearchQuery.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dynamicFacilities, facilityDistrictFilter, activeFilterPill, facilitySearchQuery]);

  // Handler: Select a unit to book
  const handleSelectUnitToBook = (unit: StorageDisplayItem) => {
    if (!currentUser) {
      setPendingUnitToBookAfterLogin(unit);
      if (onOpenLogin) {
        onOpenLogin("Vui lòng đăng nhập để tiến hành đặt kho");
      } else {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Vui lòng đăng nhập tài khoản để đặt giữ chỗ buồng kho."
        );
      }
      return;
    }
    setSelectedUnit(unit);
    setCurrentStep(2);
  };

  // Step 2 -> Step 3: Tạo đơn giữ chỗ & mã VietQR
  const handleSignContract = async () => {
    if (!currentUser) {
      if (onOpenLogin) {
        onOpenLogin("Phiên làm việc hết hạn, vui lòng đăng nhập lại");
      } else {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Vui lòng đăng nhập tài khoản để tạo hợp đồng giữ chỗ buồng kho."
        );
      }
      return;
    }
    if (!selectedUnit) {
      Alert.alert("Lỗi", "Chưa chọn buồng kho.");
      return;
    }
    try {
      setSubmitting(true);
      if (!getAuthToken()) {
        await loginCustomerApi().catch(() => null);
      }

      const isoDate = new Date(`${moveInDateStr}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: selectedUnit.facilityId,
        unitTypeId: selectedUnit.unitTypeId,
        appointmentDate: isoDate,
        rentalPeriod: rentalTermMonths,
        rentalPeriodUnit: "MONTHS",
        notes: contractNotes.trim() || undefined,
      };

      const resResult = await apiRequest<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const resId = resResult.id;
      setConfirmedReservation(resResult);

      const payResult = await apiRequest<any>("/payments/deposit", {
        method: "POST",
        body: JSON.stringify({
          reservationId: resId,
          paymentMethod: "BANK_TRANSFER",
        }),
      });

      if (!payResult?.qr?.qrCodeUrl) {
        throw new Error(
          "Backend không trả về mã QR thanh toán. Vui lòng liên hệ bộ phận hỗ trợ."
        );
      }

      setQrData(payResult.qr);
      setIsDepositPaid(false);
      setCurrentStep(3);
    } catch (err: any) {
      Alert.alert(
        "Đặt giữ chỗ thất bại",
        err.message || "Vui lòng thử lại sau"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 15-minute countdown timer khi ở Step 3
  useEffect(() => {
    if (currentStep !== 3) return;
    setPaymentTimeLeft(900);
    const timer = setInterval(() => {
      setPaymentTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep]);

  // Polling xác nhận tiền cọc SePay mỗi 3 giây
  useEffect(() => {
    if (currentStep !== 3 || !confirmedReservation?.id || isDepositPaid) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const summary = await apiRequest<any>(
          `/payments/reservations/${confirmedReservation.id}/summary`
        );
        if (!isSubscribed) return;
        if (
          summary?.depositPaid ||
          summary?.reservationStatus === "CONFIRMED"
        ) {
          clearInterval(interval);
          setIsDepositPaid(true);
          setCurrentStep(4);
          if (confirmedReservation) {
            onReservationCreated(confirmedReservation);
          }
        }
      } catch {
        // silent
      }
    }, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentStep, confirmedReservation?.id, isDepositPaid]);

  const copyToClipboard = (text: string, label: string) => {
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(text);
    }
    Alert.alert("Đã sao chép", `Đã sao chép ${label}: ${text}`);
  };

  const handleCheckPaymentStatus = async () => {
    if (!confirmedReservation?.id) return;
    try {
      setCheckingPayment(true);
      const summary = await apiRequest<any>(
        `/payments/reservations/${confirmedReservation.id}/summary`
      );
      if (summary?.depositPaid || summary?.reservationStatus === "CONFIRMED") {
        setIsDepositPaid(true);
        setCurrentStep(4);
        if (confirmedReservation) {
          onReservationCreated(confirmedReservation);
        }
        Alert.alert(
          "Thành công",
          "Hệ thống đã nhận được tiền cọc. Ô kho đã được giữ chỗ!"
        );
      } else {
        Alert.alert(
          "Chờ xác nhận",
          "Hệ thống đang chờ giao dịch chuyển khoản. Vui lòng chuyển khoản đúng nội dung và thử lại sau 30 giây."
        );
      }
    } catch (err: any) {
      Alert.alert("Thông báo", err.message || "Đang kiểm tra giao dịch...");
    } finally {
      setCheckingPayment(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancelReservation = () => {
    if (!confirmedReservation?.id) {
      setCurrentStep(1);
      setQrData(null);
      return;
    }

    Alert.alert(
      "Hủy đơn giữ chỗ",
      "Bạn có chắc chắn muốn hủy đơn giữ chỗ này không? Buồng kho sẽ được mở lại ngay cho khách hàng khác.",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Xác nhận hủy",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingReservation(true);
              await apiRequest(`/reservations/${confirmedReservation.id}/cancel`, {
                method: "POST",
                body: JSON.stringify({ reason: "Khách hàng hủy trên app" }),
              });
              setConfirmedReservation(null);
              setQrData(null);
              setCurrentStep(1);
              showToast("Đã hủy đơn giữ chỗ thành công");
            } catch (err: any) {
              Alert.alert("Lỗi", err?.message || "Không thể hủy đơn đặt chỗ lúc này");
            } finally {
              setCancellingReservation(false);
            }
          },
        },
      ]
    );
  };

  const handleTabPress = (tab: CustomerTabType) => {
    setCurrentBottomTab(tab);
    if (tab === "book-new") {
      setShowBranchSelectModal(true);
      return;
    }
    onNavigateTab?.(tab);
  };

  return (
    <View style={s.outerWrapper}>
      <View style={s.mobileContainer}>
        {/* STEP 1: Khám phá cơ sở & Chi tiết cơ sở */}
        {currentStep === 1 && (
          <Step1ExploreAndDetail
            facilities={facilities}
            loading={loading}
            dynamicFacilities={dynamicFacilities}
            filteredDynamicFacilities={filteredDynamicFacilities}
            storageItems={storageItems}
            selectedFacility={selectedFacility}
            setSelectedFacility={setSelectedFacility}
            selectedFacilityPhoto={selectedFacilityPhoto}
            selectedFacilityDistance={selectedFacilityDistance}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            onSelectUnitToBook={handleSelectUnitToBook}
            handleOpenDirections={handleOpenDirections}
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onOpenNotifications={onOpenNotifications}
            unreadNotifCount={unreadNotifCount}
            onOpenAiAssistant={onOpenAiAssistant}
            onNavigateTab={onNavigateTab}
            availableDistricts={availableDistricts}
            facilityDistrictFilter={facilityDistrictFilter}
            setFacilityDistrictFilter={setFacilityDistrictFilter}
            facilitySearchQuery={facilitySearchQuery}
            setFacilitySearchQuery={setFacilitySearchQuery}
            activeFilterPill={activeFilterPill}
            setActiveFilterPill={setActiveFilterPill}
            favoriteIds={favoriteIds}
            toggleFavorite={toggleFavorite}
            onViewMyReservations={onViewMyReservations}
          />
        )}

        {/* STEP 2: Cấu hình kỳ hạn thuê & Hợp đồng */}
        {currentStep === 2 && selectedUnit && (
          <Step2ContractConfig
            selectedUnit={selectedUnit}
            rentalTermMonths={rentalTermMonths}
            setRentalTermMonths={setRentalTermMonths}
            moveInDateStr={moveInDateStr}
            setMoveInDateStr={setMoveInDateStr}
            calc={calc}
            submitting={submitting}
            handleSignContract={handleSignContract}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {/* STEP 3: Thanh toán cọc giữ chỗ VietQR */}
        {currentStep === 3 && (
          <Step3VietQRPayment
            qrData={qrData}
            paymentTimeLeft={paymentTimeLeft}
            formatCountdown={formatCountdown}
            copyToClipboard={copyToClipboard}
            checkingPayment={checkingPayment}
            handleCheckPaymentStatus={handleCheckPaymentStatus}
            onBack={() => setCurrentStep(2)}
            onCancelReservation={handleCancelReservation}
            cancellingReservation={cancellingReservation}
          />
        )}

        {/* STEP 4: Đã đặt giữ chỗ thành công */}
        {currentStep === 4 && selectedUnit && (
          <Step4BookingSuccess
            selectedUnit={selectedUnit}
            confirmedReservation={confirmedReservation}
            depositAmount={qrData?.amount || calc.depositAmount}
            moveInDateStr={moveInDateStr}
            appointmentTimeSlot={appointmentTimeSlot}
            rentalTermMonths={rentalTermMonths}
            onNavigateToMyReservations={() => {
              onNavigateTab?.("my-storage");
              onViewMyReservations();
            }}
            onBookAnother={() => {
              setCurrentStep(1);
              setConfirmedReservation(null);
              setQrData(null);
              setSelectedUnit(null);
            }}
          />
        )}

        {/* Thanh Bottom Nav chính khi đang ở trang khám phá cơ sở (chưa chọn chi nhánh) */}
        {!selectedFacility && currentStep === 1 && (
          <CustomerBottomNavBar
            activeTab={currentBottomTab}
            onSelectTab={handleTabPress}
          />
        )}

        {/* MODAL / BOTTOM SHEET: CHỌN CHI NHÁNH THUÊ KHO NHANH */}
        <Modal
          visible={showBranchSelectModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBranchSelectModal(false)}
        >
          <View style={s.modalOverlay}>
            <TouchableOpacity
              style={s.modalBackdropDismiss}
              activeOpacity={1}
              onPress={() => setShowBranchSelectModal(false)}
            />
            <View style={s.modalSheetContainer}>
              {/* Thanh kéo trang trí */}
              <View style={s.modalDragHandle} />

              {/* Header của Sheet */}
              <View style={s.modalHeader}>
                <View style={s.modalHeaderLeft}>
                  <View style={s.modalHeaderIconBadge}>
                    <MaterialIcons name="storefront" size={22} color="#1d4ed8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>Chọn Cơ Sở Thuê Kho</Text>
                    <Text style={s.modalSubtitle}>
                      Chọn chi nhánh gần bạn để xem buồng kho còn trống
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setShowBranchSelectModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Danh sách các chi nhánh cơ sở kho */}
              <ScrollView
                style={s.modalBranchList}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {dynamicFacilities.map((facItem) => (
                  <TouchableOpacity
                    key={facItem.id}
                    style={s.branchCard}
                    activeOpacity={0.88}
                    onPress={() => {
                      setSelectedFacility(facItem.facility);
                      setCurrentStep(1);
                      setShowBranchSelectModal(false);
                    }}
                  >
                    <Image
                      source={{ uri: facItem.image }}
                      style={s.branchCardImg}
                      resizeMode="cover"
                    />
                    <View style={s.branchCardInfo}>
                      <View style={s.branchCardTopRow}>
                        <Text style={s.branchCardTitle} numberOfLines={1}>
                          {facItem.title}
                        </Text>
                        {facItem.isNearest && (
                          <View style={s.nearestBadge}>
                            <Text style={s.nearestBadgeText}>Gần nhất</Text>
                          </View>
                        )}
                      </View>

                      <View style={s.branchCardLocRow}>
                        <MaterialIcons name="location-on" size={13} color="#64748b" />
                        <Text style={s.branchCardLocText} numberOfLines={1}>
                          {facItem.location}
                        </Text>
                      </View>

                      <View style={s.branchCardMetaRow}>
                        {facItem.realDistanceKm && (
                          <View style={s.metaPill}>
                            <Text style={s.metaPillText}>{facItem.realDistanceKm} km</Text>
                          </View>
                        )}
                        <View style={s.metaPillGreen}>
                          <Text style={s.metaPillGreenText}>
                            {facItem.availableCount > 0 ? `Còn ${facItem.availableCount} buồng` : 'Đang hoạt động'}
                          </Text>
                        </View>
                        
                      </View>
                    </View>


                  </TouchableOpacity>
                ))}
              </ScrollView>
              
            </View>
          </View>
        </Modal>

        {/* Toast thông báo nổi */}
        {toastMessage && (
          <Animated.View
            style={[
              s.topToastContainer,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <View style={s.topToastContent}>
              <Text style={s.topToastText}>{toastMessage}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: "#f7f9fd",
    alignItems: "center",
  },
  mobileContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  topToastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 36,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  topToastContent: {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  topToastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalSheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBranchList: {
    maxHeight: 420,
  },
  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  branchCardImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  branchCardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  branchCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  branchCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  nearestBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nearestBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  branchCardLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  branchCardLocText: {
    fontSize: 11.5,
    color: "#64748b",
    flex: 1,
  },
  branchCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaPill: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  metaPillGreen: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaPillGreenText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  branchCardPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    marginLeft: "auto",
  },
  branchCardPriceUnit: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
  },
  branchCardArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooterHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalFooterHintText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
});
