import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Facility, UnitType, Reservation } from "../../api";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import CustomerBottomNavBar, {
  CustomerTabType,
} from "../../components/customer/CustomerBottomNavBar";

// ─── Tailwind Color Palette synced with Stitch Design System ────────────────
const T = {
  bg: "#f7f9fd",
  onSurface: "#131b2e",
  onSurfaceVariant: "#434655",
  primary: "#1d4ed8",
  primaryContainer: "#131b2e",
  inverseSurface: "#283044",
  onPrimary: "#ffffff",
  secondary: "#1d4ed8",
  secondaryBrand: "#2563eb",
  secondaryContainer: "#2563eb",
  secondaryFixed: "#dbe1ff",
  onSecondaryFixed: "#00174b",
  surfaceLowest: "#ffffff",
  surfaceLow: "#f2f3ff",
  surfaceContainerLow: "#f2f3ff",
  surfaceContainer: "#eaedff",
  surfaceContainerHigh: "#dae2fd",
  outline: "#737686",
  outlineVariant: "#c3c6d7",
  green: "#22c55e",
  amber: "#f59e0b",
  blue: "#1d4ed8",
};

interface Props {
  facilities: Facility[];
  unitTypes: UnitType[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onReservationCreated: (reservation: Reservation) => void;
  onViewMyReservations: () => void;
  onNavigateTab?: (tab: CustomerTabType) => void;
  activeBottomTab?: CustomerTabType;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  currentUser?: any;
  initialSelectedUnit?: any;
  onClearInitialSelectedUnit?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
}

export interface StorageDisplayItem {
  id: string;
  facilityId: number | string;
  unitTypeId: number | string;
  facilityName: string;
  locationText: string;
  title: string;
  unitCode: string;
  floorText: string;
  image: string;
  blueprintImage: string;
  badgeStatus: string;
  badgeDiscount?: string;
  floorArea: string;
  volume: string;
  dimensions: string;
  capacity: string;
  features: string[];
  originalPrice?: number;
  monthlyBasePrice: number;
  depositAmount: number;
  category: "personal" | "family" | "business";
  amenities: string[];
}

const FACILITY_PHOTOS = [
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565118531796-763e5082d113?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1549194388-f61be84a6e9e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
];

function extractDistrict(address: string, name: string): string {
  const text = `${name} ${address}`.toLowerCase();
  if (
    text.includes("thủ đức") ||
    text.includes("thu duc") ||
    text.includes("an phú") ||
    text.includes("võ nguyên giáp") ||
    text.includes("thảo điền")
  )
    return "TP. Thủ Đức";
  if (
    text.includes("quận 1") ||
    text.includes("q. 1") ||
    text.includes("q1") ||
    text.includes("tân định") ||
    text.includes("nguyễn huệ")
  )
    return "Quận 1";
  if (
    text.includes("quận 7") ||
    text.includes("q. 7") ||
    text.includes("q7") ||
    text.includes("trần trọng cung") ||
    text.includes("tân phú") ||
    text.includes("nam long")
  )
    return "Quận 7";
  if (
    text.includes("bình thạnh") ||
    text.includes("binh thanh") ||
    text.includes("landmark")
  )
    return "Q. Bình Thạnh";
  if (
    text.includes("quận 6") ||
    text.includes("q. 6") ||
    text.includes("q6") ||
    text.includes("centre mall")
  )
    return "Quận 6";
  if (text.includes("quận 9") || text.includes("q. 9") || text.includes("q9"))
    return "Quận 9";
  return "Khu Vực Khác";
}

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

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
}: Props) {
  // Navigation Flow: step 1 = explore, step 2 = schedule/contract, step 3 = VietQR deposit payment, step 4 = success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected Facility State (synced with Web flow: chọn cơ sở -> chọn loại kho)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null,
  );
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const [facilityDistrictFilter, setFacilityDistrictFilter] = useState("ALL");

  // Dynamic Districts for Filter Chips
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      const d = extractDistrict(f.address || "", f.name || "");
      if (d) set.add(d);
    });
    return ["ALL", ...Array.from(set)];
  }, [facilities]);

  // Filtered Facilities List
  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      const dist = extractDistrict(fac.address || "", fac.name || "");
      if (facilityDistrictFilter !== "ALL" && dist !== facilityDistrictFilter) {
        return false;
      }
      if (facilitySearchQuery.trim()) {
        const q = facilitySearchQuery.toLowerCase().trim();
        const matchName = fac.name?.toLowerCase().includes(q);
        const matchAddr = fac.address?.toLowerCase().includes(q);
        const matchDist = dist.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchDist) return false;
      }
      return true;
    });
  }, [facilities, facilityDistrictFilter, facilitySearchQuery]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "personal" | "family" | "business"
  >("all");
  const [selectedAmenity, setSelectedAmenity] = useState<string | null>(null);

  // Selected Unit for Contract Step 2
  const [selectedUnit, setSelectedUnit] = useState<StorageDisplayItem | null>(
    null,
  );
  const [pendingUnitToBookAfterLogin, setPendingUnitToBookAfterLogin] =
    useState<StorageDisplayItem | null>(null);

  // Khi khách hàng đăng nhập thành công sau khi bấm đặt kho, tự động đưa họ vào Bước 2
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
  const [appointmentTimeSlot, setAppointmentTimeSlot] =
    useState("09:00 - 10:00");
  const [rentalTermMonths, setRentalTermMonths] = useState<1 | 3 | 6 | 12>(6);
  const [contractNotes, setContractNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // SePay VietQR Deposit States (Step 3)
  const [qrData, setQrData] = useState<{
    qrCodeUrl: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
  } | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(900); // 15 mins (900s)
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [isDepositPaid, setIsDepositPaid] = useState(false);

  // Submitting & Reservation result
  const [submitting, setSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] =
    useState<Reservation | null>(null);

  // Active Bottom Tab
  const [currentBottomTab, setCurrentBottomTab] = useState<CustomerTabType>(
    activeBottomTab || "search",
  );

  // Category Pill & Favorites States for Stitch Explore UI
  const [activeFilterPill, setActiveFilterPill] = useState<
    "for-you" | "personal" | "family" | "business" | "ac"
  >("for-you");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    new Set(["feat-1"]),
  );

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Map API data → display items (NO fallback mock) ────────────────────
  const storageItems: StorageDisplayItem[] = useMemo(() => {
    if (!unitTypes || unitTypes.length === 0) return [];

    return unitTypes.map((ut) => {
      const fac = facilities.find(
        (f) => String(f.id) === String((ut as any).facilityId),
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
        floorArea: `${size} m²`,
        volume: `${Math.round(size * 2.8 * 10) / 10} m³`,
        dimensions: (ut as any).dimensions || `${size}m² (Cao 2.8m)`,
        capacity: ut.description ?? "",
        features: ((ut as any).features as string[]) ?? [],
        originalPrice: (ut as any).originalPrice,
        monthlyBasePrice: Number(ut.price) || 0,
        depositAmount: Number(ut.depositAmount) || Number(ut.price) || 0,
        category,
        amenities: ((ut as any).amenities as string[]) ?? [],
      };
    });
  }, [facilities, unitTypes]);

  // Xử lý khi người dùng chọn đặt một buồng kho được Trợ lý AI gợi ý
  useEffect(() => {
    if (initialSelectedUnit) {
      // Yêu cầu đăng nhập trước khi vào đặt kho
      if (!currentUser) {
        if (onOpenLogin) {
          onOpenLogin();
        } else {
          Alert.alert(
            "Yêu cầu đăng nhập",
            "Vui lòng đăng nhập tài khoản để đặt giữ chỗ buồng kho."
          );
        }
        return;
      }

      // 1. Tìm hoặc gán cơ sở phù hợp
      const matchedFacility =
        facilities.find(
          (f) =>
            String(f.id) === String(initialSelectedUnit.facility_id) ||
            (initialSelectedUnit.facility_name &&
              f.name
                ?.toLowerCase()
                .includes(initialSelectedUnit.facility_name?.toLowerCase()))
        ) ||
        facilities[0] ||
        null;

      if (matchedFacility) {
        setSelectedFacility(matchedFacility);
      }

      // 2. Tìm hoặc tạo StorageDisplayItem tương ứng
      const matchedItem =
        storageItems.find(
          (si) =>
            String(si.unitTypeId) === String(initialSelectedUnit.unit_type_id) ||
            (initialSelectedUnit.unit_type_name &&
              si.title
                ?.toLowerCase()
                .includes(initialSelectedUnit.unit_type_name?.toLowerCase()))
        ) || storageItems[0];

      if (matchedItem) {
        setSelectedUnit(matchedItem);
        setCurrentStep(2); // Chuyển thẳng sang Bước 2: Đặt chỗ & Lên lịch hẹn
      } else {
        const sizeM2 = Number(initialSelectedUnit.size_m2) || 2.5;
        const price = Number(initialSelectedUnit.price_per_month) || 1500000;
        const fallbackItem: StorageDisplayItem = {
          id: `ai-suggested-${Date.now()}`,
          facilityId: matchedFacility?.id || 1,
          unitTypeId: initialSelectedUnit.unit_type_id || 1,
          facilityName:
            matchedFacility?.name ||
            initialSelectedUnit.facility_name ||
            "SelfStorage Cơ sở chính",
          locationText: matchedFacility?.address || "TP. Hồ Chí Minh",
          title: initialSelectedUnit.unit_type_name || "Kho Vừa (Loại M)",
          unitCode: `#${initialSelectedUnit.unit_number || "M-102"}`,
          floorText: "Sơ đồ buồng kho",
          image:
            "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1200&q=80",
          blueprintImage: "",
          badgeStatus: "Còn phòng",
          floorArea: `${sizeM2} m²`,
          volume: `${initialSelectedUnit.volume_m3 || 6.5} m³`,
          dimensions: `${sizeM2} m² (Cao 2.6m)`,
          capacity: "Phù hợp lưu trữ gia đình, văn phòng",
          features: [
            "Khóa Smart Lock PIN",
            "Camera an ninh 24/7",
            "Điều hòa độ ẩm",
          ],
          monthlyBasePrice: price,
          depositAmount: price,
          category: sizeM2 <= 3 ? "personal" : "family",
          amenities: ["24/7", "CCTV", "AC"],
        };
        setSelectedUnit(fallbackItem);
        setCurrentStep(2);
      }

      if (onClearInitialSelectedUnit) {
        onClearInitialSelectedUnit();
      }
    }
  }, [
    initialSelectedUnit,
    storageItems,
    facilities,
    onClearInitialSelectedUnit,
  ]);

  // Filtered items (belonging to selectedFacility when chosen)
  const filteredItems = useMemo(() => {
    return storageItems.filter((item) => {
      if (
        selectedFacility &&
        String(item.facilityId) !== String(selectedFacility.id)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.title.toLowerCase().includes(q);
        const matchesFac = item.facilityName.toLowerCase().includes(q);
        const matchesLoc = item.locationText.toLowerCase().includes(q);
        const matchesDim = item.dimensions.toLowerCase().includes(q);
        if (!matchesName && !matchesFac && !matchesLoc && !matchesDim)
          return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedAmenity && !item.amenities.includes(selectedAmenity)) {
        return false;
      }
      return true;
    });
  }, [
    storageItems,
    selectedFacility,
    searchQuery,
    selectedCategory,
    selectedAmenity,
  ]);

  //Date select
  const minMoveInDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // sớm nhất là ngày mai
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android: đóng picker sau khi chọn
    if (Platform.OS === "android") setShowDatePicker(false);

    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    if (date) {
      if (date < minMoveInDate) {
        Alert.alert(
          "Ngày không hợp lệ",
          "Ngày dọn vào phải sau hôm nay ít nhất 1 ngày.",
        );
        return;
      }
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setMoveInDateStr(`${yyyy}-${mm}-${dd}`);
    }

    if (Platform.OS === "ios") setShowDatePicker(false);
  };

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
    let discountPct = 0;
    let ratePerMonth = baseRate;

    if (rentalTermMonths === 1) {
      discountPct = 0;
      ratePerMonth = baseRate;
    } else if (rentalTermMonths === 3) {
      discountPct = 5;
      ratePerMonth = Math.round(baseRate * 0.95);
    } else if (rentalTermMonths === 6) {
      discountPct = 10;
      ratePerMonth = Math.round(baseRate * 0.9);
    } else if (rentalTermMonths === 12) {
      discountPct = 15;
      ratePerMonth = Math.round(baseRate * 0.85);
    }

    const grossRent = baseRate * rentalTermMonths;
    const totalRent = ratePerMonth * rentalTermMonths;
    const discountSavings = grossRent - totalRent;
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

  // Handle Bottom Nav Press
  const handleTabPress = (tab: CustomerTabType) => {
    if (tab === "search") {
      setCurrentBottomTab("search");
      setCurrentStep(1);
      setSelectedFacility(null);
      if (onNavigateTab) onNavigateTab("search");
      return;
    }
    // Bắt buộc login khi nhấn qua Kho của tôi hoặc Hỗ trợ
    if ((tab === "my-storage" || tab === "support") && !currentUser) {
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }
    setCurrentBottomTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (tab === "my-storage") {
      onViewMyReservations();
    }
  };

  // ─── Dynamic Facilities mapping strictly from Backend API ─────────────────
  const dynamicFacilities = useMemo(() => {
    return facilities.map((fac, idx) => {
      const facUnits = unitTypes.filter(
        (ut) => String((ut as any).facilityId) === String(fac.id),
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
          0,
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
        (u) => Number(u.size) > 3 && Number(u.size) <= 9,
      );
      const hasBusiness = facUnits.some((u) => Number(u.size) > 9);
      const hasAC =
        facUnits.some((u) =>
          ((u as any).features || []).some(
            (f: string) =>
              typeof f === "string" &&
              (f.toLowerCase().includes("lạnh") ||
                f.toLowerCase().includes("ac")),
          ),
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
        tag: facUnits.length > 0 ? `${facUnits.length} loại buồng` : "Cho thuê",
        tagType: hasBusiness ? ("business" as const) : ("primary" as const),
        hasPersonal,
        hasFamily,
        hasBusiness,
        hasAC,
      };
    });
  }, [facilities, unitTypes]);

  // Filter dynamic facilities based on search query and category filter pill
  const filteredDynamicFacilities = useMemo(() => {
    return dynamicFacilities.filter((item) => {
      if (
        activeFilterPill === "personal" &&
        !item.hasPersonal &&
        item.unitTypesCount > 0
      )
        return false;
      if (
        activeFilterPill === "family" &&
        !item.hasFamily &&
        item.unitTypesCount > 0
      )
        return false;
      if (
        activeFilterPill === "business" &&
        !item.hasBusiness &&
        item.unitTypesCount > 0
      )
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
  }, [dynamicFacilities, activeFilterPill, facilitySearchQuery]);

  // Step 2 -> Step 3: Tạo đơn hẹn và tạo mã VietQR thanh toán cọc giữ chỗ
  const handleSignContract = async () => {
    if (!currentUser) {
      if (onOpenLogin) {
        onOpenLogin();
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
      const { apiRequest, getAuthToken, loginCustomerApi } =
        await import("../../api");
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

      // 1. Tạo đơn đặt giữ chỗ
      const resResult = await apiRequest<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const resId = resResult.id;
      setConfirmedReservation(resResult);

      // 2. Gọi API tạo mã cọc VietQR từ Backend (POST /payments/deposit)
      const payResult = await apiRequest<any>("/payments/deposit", {
        method: "POST",
        body: JSON.stringify({
          reservationId: resId,
          paymentMethod: "BANK_TRANSFER",
        }),
      });

      if (!payResult?.qr?.qrCodeUrl) {
        throw new Error(
          "Backend không trả về mã QR thanh toán. Vui lòng liên hệ bộ phận hỗ trợ.",
        );
      }

      setQrData(payResult.qr);
      setPaymentData(payResult.payment);
      setIsDepositPaid(false);
      setCurrentStep(3);
    } catch (err: any) {
      Alert.alert(
        "Đặt giữ chỗ thất bại",
        err.message || "Vui lòng thử lại sau",
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

  // Polling tự động xác nhận tiền cọc SePay mỗi 3 giây
  useEffect(() => {
    if (currentStep !== 3 || !confirmedReservation?.id || isDepositPaid) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const { apiRequest } = await import("../../api");
        const summary = await apiRequest<any>(
          `/payments/reservations/${confirmedReservation.id}/summary`,
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
      const { apiRequest } = await import("../../api");
      const summary = await apiRequest<any>(
        `/payments/reservations/${confirmedReservation.id}/summary`,
      );
      if (summary?.depositPaid || summary?.reservationStatus === "CONFIRMED") {
        setIsDepositPaid(true);
        setCurrentStep(4);
        if (confirmedReservation) {
          onReservationCreated(confirmedReservation);
        }
        Alert.alert(
          "Thành công",
          "Hệ thống đã nhận được tiền cọc. Ô kho đã được giữ chỗ!",
        );
      } else {
        Alert.alert(
          "Chờ xác nhận",
          "Hệ thống đang chờ giao dịch chuyển khoản. Vui lòng chuyển khoản đúng nội dung và thử lại sau 30 giây.",
        );
      }
    } catch (err: any) {
      Alert.alert("Thông báo", err.message || "Đang kiểm tra giao dịch...");
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!qrData) return;
    try {
      setSimulatingPayment(true);
      const { apiRequest } = await import("../../api");
      const webhookPayload = {
        id: Math.floor(Math.random() * 1000000),
        gateway: qrData.bankCode,
        transactionDate: new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
        accountNumber: qrData.accountNumber,
        code: qrData.transferContent,
        content: `${qrData.transferContent} CK coc`,
        transferType: "in",
        transferAmount: qrData.amount,
      };

      const res = await apiRequest<any>("/payments/sepay/webhook", {
        method: "POST",
        body: JSON.stringify(webhookPayload),
      });

      if (!res?.success) {
        throw new Error("Webhook không xác nhận giao dịch.");
      }

      setIsDepositPaid(true);
      setCurrentStep(4);
      if (confirmedReservation) {
        onReservationCreated(confirmedReservation);
      }
      Alert.alert("Thành công", "Thanh toán cọc giữ chỗ thành công!");
    } catch (err: any) {
      Alert.alert("Mô phỏng thất bại", err.message || "Vui lòng thử lại.");
    } finally {
      setSimulatingPayment(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAuthAction = () => {
    if (currentUser) {
      const confirmLogout = () => {
        onLogout?.();
      };
      if (Platform.OS === "web") {
        if (
          window.confirm(
            "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?",
          )
        ) {
          confirmLogout();
        }
      } else {
        Alert.alert(
          "Đăng xuất",
          `Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${currentUser.fullName || currentUser.email || ""}?`,
          [
            { text: "Hủy", style: "cancel" },
            { text: "Đăng xuất", style: "destructive", onPress: confirmLogout },
          ],
        );
      }
    } else {
      onOpenLogin?.();
    }
  };

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator color={T.secondaryContainer} size="large" />
        <Text style={s.loadText}>Đang tải dữ liệu buồng kho thông minh...</Text>
      </View>
    );
  }

  return (
    <View style={s.outerWrapper}>
      <View style={s.mobileContainer}>
        {/* ========================================================================= */}
        {/* STEP 1: DANH SÁCH BUỒNG KHO & TÌM KIẾM THÔNG MINH                         */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <>
            {selectedFacility && (
              /* Header Section when a facility is selected */
              <View style={s.topAppBar}>
                <View style={s.brandRow}>
                  <TouchableOpacity
                    style={s.brandIconBtn}
                    activeOpacity={0.85}
                    onPress={() => setSelectedFacility(null)}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={24}
                      color={T.primary}
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.brandTitle} numberOfLines={1}>
                      Chọn Loại Kho
                    </Text>
                    <View style={s.brandLocationRow}>
                      <MaterialIcons
                        name="near-me"
                        size={13}
                        color={T.secondary}
                      />
                      <Text style={s.brandLocationText} numberOfLines={1}>
                        {selectedFacility.name || "Cơ sở đã chọn"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={s.topActionsRow}>
                  {(onOpenLogin || onLogout) && (
                    <TouchableOpacity
                      style={[
                        s.loginHeaderBtn,
                        currentUser && s.logoutHeaderBtn,
                      ]}
                      onPress={handleAuthAction}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name={currentUser ? "logout" : "login"}
                        size={16}
                        color={currentUser ? "#DC2626" : T.onSurface}
                      />
                      <Text
                        style={[
                          s.loginHeaderText,
                          currentUser && {
                            color: "#DC2626",
                            fontWeight: "700",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {currentUser ? "Đăng xuất" : "Đăng nhập"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.notifBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (onOpenNotifications) {
                        onOpenNotifications();
                      } else {
                        onViewMyReservations();
                      }
                    }}
                  >
                    <MaterialIcons
                      name="notifications-none"
                      size={22}
                      color={T.onSurface}
                    />
                    {unreadNotifCount > 0 ? (
                      <View style={s.notifBadgeDot}>
                        <Text style={s.notifBadgeCountText}>
                          {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Scrollable Content */}
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!selectedFacility ? (
                /* ========================================================= */
                /* GIAO DIỆN KHÁM PHÁ & TÌM KHO CHUẨN STITCH MOCKUP          */
                /* ========================================================= */
                <View style={s.stitchWrapper}>
                  {/* USER GREETING & HEADER */}
                  <View style={s.greetingHeader}>
                    <View style={s.greetingLeft}>
                      <TouchableOpacity
                        style={s.avatarWrap}
                        activeOpacity={0.8}
                        onPress={onOpenLogin}
                      >
                        <MaterialIcons
                          name="person"
                          size={26}
                          color={T.primary}
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.greetingSub}>
                          {currentUser ? "Xin chào," : "Chào mừng bạn,"}
                        </Text>
                        <Text
                          style={s.greetingName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {currentUser?.fullName ||
                            (currentUser?.email
                              ? currentUser.email.split("@")[0]
                              : "Khách hàng")}
                        </Text>
                      </View>
                    </View>

                    <View style={s.greetingRight}>
                      <TouchableOpacity
                        style={s.iconCircleBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (!currentUser && onOpenLogin) {
                            onOpenLogin();
                            return;
                          }
                          onNavigateTab?.("support");
                        }}
                        accessibilityLabel="Hỗ trợ kỹ thuật"
                      >
                        <MaterialIcons
                          name="headset-mic"
                          size={20}
                          color={T.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.iconCircleBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (onOpenNotifications) {
                            onOpenNotifications();
                          } else {
                            onViewMyReservations();
                          }
                        }}
                        accessibilityLabel="Thông báo"
                      >
                        <MaterialIcons
                          name="notifications-none"
                          size={20}
                          color={T.onSurface}
                        />
                        {unreadNotifCount > 0 ? (
                          <View style={s.iconNotifDot}>
                            <Text style={s.notifBadgeCountText}>
                              {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3. SEARCH BAR */}
                  <View style={s.searchSection}>
                    <View style={s.searchBarPill}>
                      <MaterialIcons
                        name="search"
                        size={22}
                        color={T.outline}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        style={s.searchInputStitch}
                        placeholder="Tìm kiếm kho, vị trí hoặc kích thước..."
                        placeholderTextColor={T.outline}
                        value={facilitySearchQuery}
                        onChangeText={setFacilitySearchQuery}
                      />
                      <TouchableOpacity
                        style={s.filterTuneBtn}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (facilitySearchQuery) setFacilitySearchQuery("");
                        }}
                      >
                        <MaterialIcons
                          name={facilitySearchQuery ? "close" : "tune"}
                          size={21}
                          color={T.onSurface}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 4. PROMO / HERO BANNER */}
                  <View style={s.heroBannerSection}>
                    <View style={s.heroBannerCard}>
                      <Image
                        source={{
                          uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDTmegbtRhqz8lqOMdrwB9WqdWFouB3hjvcrybHx_iTfCG8EFKEqm9fBq6v5AJtmpRTD3TghS-rBqNKFp59sv5QVCcmpueSQgPbSEHkafhmhigvRsQ-q7LHFtcQtdW6EQm32GFiX2BNYQBL2IdVwpe2Hlq8J9d2IUd310qvkhCw7jlsDO71-NB6Mu_YABD91adeEX2sNKkH6BkPTLgGkwlAIxJVrzaH_TnXHUIaWaTpdIUbcNGoCN-_",
                        }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      <View style={s.heroBannerOverlay} />
                      <View style={s.heroBannerContent}>
                        <Text style={s.heroTitle}>Tìm buồng kho lý tưởng</Text>
                        <Text style={s.heroSubtitle}>
                          Không gian an toàn, linh hoạt theo nhu cầu của bạn
                        </Text>
                        <TouchableOpacity
                          style={s.heroCtaBtn}
                          activeOpacity={0.9}
                          onPress={() => {
                            if (facilities.length > 0) {
                              setSelectedFacility(facilities[0]);
                            }
                          }}
                        >
                          <Text style={s.heroCtaText}>Khám phá ngay</Text>
                          <MaterialIcons
                            name="arrow-forward"
                            size={15}
                            color={T.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 5. CATEGORY FILTER PILLS */}
                  <View style={s.categoryPillsSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.categoryPillsScroll}
                    >
                      <TouchableOpacity
                        style={[
                          s.categoryPill,
                          activeFilterPill === "for-you" &&
                            s.categoryPillActive,
                        ]}
                        onPress={() => setActiveFilterPill("for-you")}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="assignment-turned-in"
                          size={17}
                          color={
                            activeFilterPill === "for-you"
                              ? "#ffffff"
                              : T.primary
                          }
                        />
                        <Text
                          style={[
                            s.categoryPillText,
                            activeFilterPill === "for-you" &&
                              s.categoryPillTextActive,
                          ]}
                        >
                          Dành cho bạn
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          s.categoryPill,
                          activeFilterPill === "personal" &&
                            s.categoryPillActive,
                        ]}
                        onPress={() => setActiveFilterPill("personal")}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="inventory-2"
                          size={17}
                          color={
                            activeFilterPill === "personal"
                              ? "#ffffff"
                              : T.primary
                          }
                        />
                        <Text
                          style={[
                            s.categoryPillText,
                            activeFilterPill === "personal" &&
                              s.categoryPillTextActive,
                          ]}
                        >
                          Cá nhân (1-3m²)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          s.categoryPill,
                          activeFilterPill === "family" && s.categoryPillActive,
                        ]}
                        onPress={() => setActiveFilterPill("family")}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="home-work"
                          size={17}
                          color={
                            activeFilterPill === "family"
                              ? "#ffffff"
                              : T.primary
                          }
                        />
                        <Text
                          style={[
                            s.categoryPillText,
                            activeFilterPill === "family" &&
                              s.categoryPillTextActive,
                          ]}
                        >
                          Gia đình (4-9m²)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          s.categoryPill,
                          activeFilterPill === "business" &&
                            s.categoryPillActive,
                        ]}
                        onPress={() => setActiveFilterPill("business")}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="storefront"
                          size={17}
                          color={
                            activeFilterPill === "business"
                              ? "#ffffff"
                              : T.primary
                          }
                        />
                        <Text
                          style={[
                            s.categoryPillText,
                            activeFilterPill === "business" &&
                              s.categoryPillTextActive,
                          ]}
                        >
                          Kho lớn / E-com
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          s.categoryPill,
                          activeFilterPill === "ac" && s.categoryPillActive,
                        ]}
                        onPress={() => setActiveFilterPill("ac")}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="ac-unit"
                          size={17}
                          color={
                            activeFilterPill === "ac" ? "#ffffff" : T.primary
                          }
                        />
                        <Text
                          style={[
                            s.categoryPillText,
                            activeFilterPill === "ac" &&
                              s.categoryPillTextActive,
                          ]}
                        >
                          Máy lạnh 24/7
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  {/* 6. SECTION KHO NỔI BẬT & CAROUSEL (Dữ liệu động từ Backend) */}
                  <View style={s.featuredSection}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Kho nổi bật</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setFacilitySearchQuery("");
                          setActiveFilterPill("for-you");
                        }}
                      >
                        <Text style={s.sectionHeaderAction}>
                          Tất cả ({dynamicFacilities.length})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {filteredDynamicFacilities.length === 0 ? (
                      <View style={s.emptyFeaturedCard}>
                        <MaterialCommunityIcons
                          name="warehouse"
                          size={36}
                          color={T.outline}
                        />
                        <Text style={s.emptyFeaturedTitle}>
                          Không tìm thấy cơ sở kho
                        </Text>
                        <Text style={s.emptyFeaturedSub}>
                          Vui lòng thử tìm kiếm khác hoặc đổi bộ lọc.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.featuredCarouselScroll}
                      >
                        {filteredDynamicFacilities.map((card) => {
                          const isFav = favoriteIds.has(card.id);
                          return (
                            <TouchableOpacity
                              key={card.id}
                              style={s.featuredCard}
                              activeOpacity={0.92}
                              onPress={() => setSelectedFacility(card.facility)}
                            >
                              <View style={s.featuredImageWrap}>
                                <Image
                                  source={{ uri: card.image }}
                                  style={s.featuredImage}
                                  resizeMode="cover"
                                />

                                <View style={s.cardDotsWrap}>
                                  <View style={[s.cardDot, s.cardDotActive]} />
                                  <View style={s.cardDot} />
                                  <View style={s.cardDot} />
                                </View>
                              </View>

                              <View style={s.featuredCardBody}>
                                <Text
                                  style={s.featuredCardTitle}
                                  numberOfLines={1}
                                >
                                  {card.title}
                                </Text>

                                <View style={s.featuredPriceRow}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "baseline",
                                    }}
                                  >
                                    <Text style={s.featuredPriceVal}>
                                      {card.price}
                                    </Text>
                                    {card.priceUnit ? (
                                      <Text style={s.featuredPriceUnit}>
                                        {card.priceUnit}
                                      </Text>
                                    ) : null}
                                  </View>
                                  <View
                                    style={[
                                      s.featuredTagPill,
                                      card.tagType === "business" &&
                                        s.featuredTagBusiness,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        s.featuredTagText,
                                        card.tagType === "business" &&
                                          s.featuredTagBusinessText,
                                      ]}
                                    >
                                      {card.tag}
                                    </Text>
                                  </View>
                                </View>

                                <View style={s.featuredLocationRow}>
                                  <MaterialIcons
                                    name="location-on"
                                    size={15}
                                    color={T.primary}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    style={s.featuredLocationText}
                                    numberOfLines={1}
                                  >
                                    {card.location}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* 7. RECOMMENDED / NEARBY LISTING (Dữ liệu động từ Backend) */}
                  <View style={s.nearbySection}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Gợi ý gần bạn</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setFacilitySearchQuery("");
                          setActiveFilterPill("for-you");
                        }}
                      >
                        <Text style={s.sectionHeaderSort}>
                          Xem tất cả ({dynamicFacilities.length})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={s.nearbyListWrap}>
                      {dynamicFacilities.length === 0 ? (
                        <View style={s.emptyFeaturedCard}>
                          <Text style={s.emptyFeaturedSub}>
                            Đang tải dữ liệu cơ sở kho từ hệ thống...
                          </Text>
                        </View>
                      ) : (
                        dynamicFacilities.map((rec) => (
                          <TouchableOpacity
                            key={rec.id}
                            style={s.nearbyItemCard}
                            activeOpacity={0.9}
                            onPress={() => setSelectedFacility(rec.facility)}
                          >
                            <View style={s.nearbyThumbnailWrap}>
                              <Image
                                source={{ uri: rec.image }}
                                style={s.nearbyThumbnail}
                                resizeMode="cover"
                              />
                              <View style={s.nearbyLiveDot} />
                            </View>

                            <View style={s.nearbyInfoWrap}>
                              <Text style={s.nearbyTitle} numberOfLines={1}>
                                {rec.title}
                              </Text>
                              <View style={s.nearbyDistanceRow}>
                                <MaterialIcons
                                  name="location-on"
                                  size={13}
                                  color={T.primary}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={s.nearbyDistanceText}
                                  numberOfLines={1}
                                >
                                  {rec.location}
                                </Text>
                              </View>

                              <View style={s.nearbyBottomRow}>
                                <Text style={s.nearbyPriceText}>
                                  {rec.price}
                                  {rec.priceUnit ? (
                                    <Text style={s.nearbyPriceUnit}>
                                      {rec.priceUnit}
                                    </Text>
                                  ) : null}
                                </Text>
                                <TouchableOpacity
                                  style={s.nearbyActionBtn}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    setSelectedFacility(rec.facility)
                                  }
                                >
                                  <Text style={s.nearbyActionBtnText}>
                                    Xem ngay
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                /* ========================================================= */
                /* PHẦN 2: GIAO DIỆN CHỌN LOẠI KHO (UNIT TYPES CỦA CƠ SỞ)    */
                /* ========================================================= */
                <View>
                  {/* Active Facility Header Bar */}
                  <View style={s.activeFacilityBar}>
                    <View style={s.activeFacilityInfo}>
                      <View style={s.activeFacilityHeaderRow}>
                        <MaterialIcons
                          name="business"
                          size={18}
                          color={T.blue}
                        />
                        <Text style={s.activeFacilityName} numberOfLines={1}>
                          {selectedFacility.name}
                        </Text>
                      </View>
                      <Text style={s.activeFacilityAddress} numberOfLines={1}>
                        {selectedFacility.address ||
                          extractDistrict(
                            selectedFacility.address || "",
                            selectedFacility.name,
                          )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.changeFacilityBtn}
                      onPress={() => setSelectedFacility(null)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name="swap-horiz"
                        size={16}
                        color={T.blue}
                      />
                      <Text style={s.changeFacilityBtnText}>Đổi cơ sở</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Search & Filter Bar */}
                  <View style={s.searchFilterSection}>
                    <View style={s.searchRow}>
                      <View
                        style={[
                          s.searchInputWrap,
                          isSearchFocused && s.searchInputWrapFocused,
                        ]}
                      >
                        <MaterialIcons
                          name="search"
                          size={20}
                          color={T.onSurfaceVariant}
                          style={{ marginRight: 8 }}
                        />
                        <TextInput
                          style={s.searchInput}
                          placeholder="Tìm buồng kho hoặc kích thước..."
                          placeholderTextColor="#76777d"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setIsSearchFocused(false)}
                        />
                        {searchQuery ? (
                          <TouchableOpacity
                            onPress={() => setSearchQuery("")}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="close"
                              size={18}
                              color={T.onSurfaceVariant}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={s.filterToggleBtn}
                        activeOpacity={0.9}
                        onPress={() => {
                          setSelectedCategory("all");
                          setSelectedAmenity(null);
                        }}
                      >
                        <MaterialIcons
                          name="tune"
                          size={20}
                          color={T.onPrimary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Size Chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.sizeChipsScroll}
                    >
                      <TouchableOpacity
                        style={[
                          s.sizeChip,
                          selectedCategory === "all" && s.sizeChipActive,
                        ]}
                        onPress={() => setSelectedCategory("all")}
                      >
                        <Text
                          style={[
                            s.sizeChipText,
                            selectedCategory === "all" && s.sizeChipTextActive,
                          ]}
                        >
                          Tất cả (
                          {
                            storageItems.filter(
                              (item) =>
                                String(item.facilityId) ===
                                String(selectedFacility.id),
                            ).length
                          }
                          )
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.sizeChip,
                          selectedCategory === "personal" && s.sizeChipActive,
                        ]}
                        onPress={() => setSelectedCategory("personal")}
                      >
                        <Text
                          style={[
                            s.sizeChipText,
                            selectedCategory === "personal" &&
                              s.sizeChipTextActive,
                          ]}
                        >
                          Cá nhân (1-3m²)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.sizeChip,
                          selectedCategory === "family" && s.sizeChipActive,
                        ]}
                        onPress={() => setSelectedCategory("family")}
                      >
                        <Text
                          style={[
                            s.sizeChipText,
                            selectedCategory === "family" &&
                              s.sizeChipTextActive,
                          ]}
                        >
                          Gia đình (4-9m²)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.sizeChip,
                          selectedCategory === "business" && s.sizeChipActive,
                        ]}
                        onPress={() => setSelectedCategory("business")}
                      >
                        <Text
                          style={[
                            s.sizeChipText,
                            selectedCategory === "business" &&
                              s.sizeChipTextActive,
                          ]}
                        >
                          Doanh nghiệp (&gt;10m²)
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  {/* Cards List */}
                  <View style={s.mainListSection}>
                    <View style={s.listHeaderRow}>
                      <View style={s.listHeaderLeft}>
                        <View style={s.livePulseDot} />
                        <Text style={s.listHeaderTitle}>
                          Các buồng kho tại chi nhánh
                        </Text>
                      </View>
                      <Text style={s.listHeaderSort}>
                        Cơ sở:{" "}
                        <Text style={s.listHeaderSortBold}>
                          {extractDistrict(
                            selectedFacility.address || "",
                            selectedFacility.name,
                          )}
                        </Text>
                      </Text>
                    </View>

                    {filteredItems.length === 0 ? (
                      <View style={s.emptyStateWrap}>
                        <MaterialIcons
                          name="inventory-2"
                          size={48}
                          color={T.outline}
                        />
                        <Text style={s.emptyStateTitle}>
                          Chưa có buồng kho khả dụng
                        </Text>
                        <Text style={s.emptyStateSub}>
                          Cơ sở này hiện tại chưa có loại kho phù hợp với bộ
                          lọc. Bạn có thể chọn chi nhánh khác hoặc đặt lại bộ
                          lọc.
                        </Text>
                        <TouchableOpacity
                          style={s.emptyStateBtn}
                          onPress={() => setSelectedFacility(null)}
                        >
                          <Text style={s.emptyStateBtnText}>
                            Chọn chi nhánh khác
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      filteredItems.map((item) => (
                        <View key={item.id} style={ac.card}>
                          {/* Media Header */}
                          <View style={ac.mediaWrap}>
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                style={ac.mediaImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  ac.mediaImg,
                                  {
                                    alignItems: "center",
                                    justifyContent: "center",
                                  },
                                ]}
                              >
                                <MaterialCommunityIcons
                                  name="warehouse"
                                  size={48}
                                  color="#94a3b8"
                                />
                              </View>
                            )}
                            <View style={ac.mediaGradient} />

                            {item.badgeDiscount && (
                              <View style={ac.discountBadge}>
                                <Text style={ac.discountBadgeText}>
                                  {item.badgeDiscount}
                                </Text>
                              </View>
                            )}
                            <View style={ac.mediaBottomOverlay}>
                              <View style={ac.distanceRow}>
                                <MaterialIcons
                                  name="location-on"
                                  size={14}
                                  color={T.secondaryFixed}
                                />
                                <Text style={ac.distanceText} numberOfLines={1}>
                                  {item.locationText}
                                </Text>
                              </View>
                              <Text style={ac.mediaTitle} numberOfLines={2}>
                                {item.title}
                              </Text>
                            </View>
                          </View>

                          {/* Body */}
                          <View style={ac.body}>
                            <View style={ac.metricGrid}>
                              <View style={ac.metricCol}>
                                <View style={ac.metricHeader}>
                                  <MaterialIcons
                                    name="aspect-ratio"
                                    size={18}
                                    color={T.primary}
                                  />
                                  <Text style={ac.metricLabel}>
                                    Kích thước (D x R x C)
                                  </Text>
                                </View>
                                <Text style={ac.metricValue}>
                                  {item.dimensions}
                                </Text>
                              </View>
                              <View style={[ac.metricCol, ac.metricColBorder]}>
                                <View style={ac.metricHeader}>
                                  <MaterialIcons
                                    name="inventory"
                                    size={18}
                                    color={T.secondary}
                                  />
                                  <Text style={ac.metricLabel}>
                                    Sức chứa ước lượng
                                  </Text>
                                </View>
                                <Text style={ac.metricValue} numberOfLines={2}>
                                  {item.capacity || "—"}
                                </Text>
                              </View>
                            </View>

                            {item.features.length > 0 && (
                              <View style={ac.featureChipsRow}>
                                {item.features.map((feat, idx) => (
                                  <View key={idx} style={ac.featureChip}>
                                    <MaterialIcons
                                      name="check"
                                      size={14}
                                      color={T.secondaryBrand}
                                    />
                                    <Text style={ac.featureChipText}>
                                      {feat}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            <View style={ac.footerRow}>
                              <View>
                                {item.originalPrice ? (
                                  <Text style={ac.originalPriceText}>
                                    {formatVND(item.originalPrice)}/tháng
                                  </Text>
                                ) : (
                                  <Text style={ac.priceLabelText}>
                                    Chi phí thuê linh hoạt
                                  </Text>
                                )}
                                <View style={ac.priceRow}>
                                  <Text style={ac.priceAmount}>
                                    {formatVND(item.monthlyBasePrice)}
                                  </Text>
                                  <Text style={ac.pricePeriod}>/tháng</Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={ac.ctaBtn}
                                onPress={() => {
                                  if (!currentUser) {
                                    setPendingUnitToBookAfterLogin(item);
                                    if (onOpenLogin) {
                                      onOpenLogin();
                                    } else {
                                      Alert.alert(
                                        "Yêu cầu đăng nhập",
                                        "Vui lòng đăng nhập tài khoản để đặt giữ chỗ buồng kho."
                                      );
                                    }
                                    return;
                                  }
                                  setSelectedUnit(item);
                                  setCurrentStep(2);
                                }}
                                activeOpacity={0.88}
                              >
                                <Text style={ac.ctaBtnText}>
                                  Xem & Đặt ngay
                                </Text>
                                <MaterialIcons
                                  name="arrow-forward"
                                  size={18}
                                  color={T.onPrimary}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Reassurance Banner */}
                    <View style={s.reassuranceBanner}>
                      <View style={s.reassuranceIconWrap}>
                        <MaterialIcons
                          name="verified"
                          size={24}
                          color={T.secondaryFixed}
                        />
                      </View>
                      <View style={s.reassuranceTextWrap}>
                        <Text style={s.reassuranceTitle}>
                          Cam kết an toàn tuyệt đối 100%
                        </Text>
                        <Text style={s.reassuranceSub}>
                          Hợp đồng pháp lý số, bảo hiểm PCCC tiêu chuẩn quốc gia
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: ĐẶT KHO & XÁC NHẬN HỢP ĐỒNG                                      */}
        {/* ========================================================================= */}
        {currentStep === 2 && selectedUnit && (
          <View style={{ flex: 1, position: "relative" }}>
            {/* Header Task-Focused Mode */}
            <View style={s.step2Header}>
              <View style={s.step2HeaderLeft}>
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={T.onSurface}
                  />
                </TouchableOpacity>
                <View>
                  <Text style={s.step2HeaderTitle}>Đặt kho tự quản</Text>
                  <Text style={s.step2HeaderSub}>
                    Bước 2: Xác nhận hợp đồng
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={s.hotlineBtn} activeOpacity={0.85}>
                <MaterialIcons
                  name="support-agent"
                  size={18}
                  color={T.secondary}
                />
                <Text style={s.hotlineText}>Hotline</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={[s.scrollContent, { paddingBottom: 200 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ padding: 16, gap: 16 }}>
                {/* Progress Tracker Indicator */}
                <View style={s.progressTrackerRow}>
                  <View style={s.progressItem}>
                    <View style={s.progressBarActive} />
                    <Text style={s.progressTextActive}>1. Chọn buồng kho</Text>
                  </View>
                  <View style={s.progressItem}>
                    <View style={s.progressBarActive} />
                    <Text style={[s.progressTextActive, { fontWeight: "700" }]}>
                      2. Kỳ hạn & Dịch vụ
                    </Text>
                  </View>
                  <View style={s.progressItem}>
                    <View style={s.progressBarInactive} />
                    <Text style={s.progressTextInactive}>
                      3. Ký số & Nhận mã
                    </Text>
                  </View>
                </View>

                {/* 1. Selected Unit Card */}
                <View style={s.step2Card}>
                  <View style={s.lockedBadge}>
                    <MaterialIcons
                      name="verified"
                      size={14}
                      color={T.onSecondaryFixed}
                    />
                    <Text style={s.lockedBadgeText}>
                      Đã khóa giữ chỗ trong 15:00
                    </Text>
                  </View>
                  <Text style={s.unitNameText}>{selectedUnit.title}</Text>
                  <Text style={s.unitAddressText}>
                    {selectedUnit.locationText || "—"}
                  </Text>

                  {/* 3-Col Metric Grid */}
                  <View style={s.spec3Grid}>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Diện tích sàn</Text>
                      <Text style={s.specValBold}>
                        {selectedUnit.floorArea}
                      </Text>
                    </View>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Thể tích kho</Text>
                      <Text style={s.specValBold}>{selectedUnit.volume}</Text>
                    </View>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Quy cách (DxRxC)</Text>
                      <Text style={s.specValMed}>
                        {selectedUnit.dimensions}
                      </Text>
                    </View>
                  </View>

                  {/* Amenity Badges — chỉ hiển thị nếu backend trả về features */}
                  {selectedUnit.features.length > 0 && (
                    <View style={s.amenityBadgesRow}>
                      {selectedUnit.features.slice(0, 3).map((feat, idx) => (
                        <View
                          key={idx}
                          style={
                            idx === 0 ? s.blueAmenityBadge : s.grayAmenityBadge
                          }
                        >
                          <MaterialIcons
                            name={idx === 0 ? "thermostat" : "check"}
                            size={14}
                            color={idx === 0 ? "#1D4ED8" : T.onSurface}
                          />
                          <Text
                            style={
                              idx === 0 ? s.blueAmenityText : s.grayAmenityText
                            }
                          >
                            {feat}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Floor Plan Blueprint Preview — chỉ render nếu có ảnh */}
                  {selectedUnit.blueprintImage ? (
                    <View style={s.blueprintWrap}>
                      <Image
                        source={{ uri: selectedUnit.blueprintImage }}
                        style={s.blueprintImg}
                        resizeMode="cover"
                      />
                      <View style={s.blueprintOverlay} />
                      <View style={s.blueprintTopPill}>
                        <MaterialIcons
                          name="map"
                          size={14}
                          color={T.surfaceLowest}
                        />
                        <Text style={s.blueprintTopPillText}>
                          {selectedUnit.floorText}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* 2. Move-in Date Picker */}
                <TouchableOpacity
                  style={s.datePickerBox}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.85}
                >
                  <View style={s.dateLeftGroup}>
                    <View style={s.dateCalBox}>
                      <Text style={s.dateCalMonth}>
                        T{new Date(moveInDateStr).getMonth() + 1}
                      </Text>
                      <Text style={s.dateCalDay}>
                        {moveInDateStr.split("-")[2] || "18"}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.dateMainText}>
                        {new Date(moveInDateStr).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={s.dateSubText}>
                        Giờ nhận kho tự do: Từ 06:00 sáng
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="edit-calendar"
                    size={22}
                    color={T.secondary}
                  />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(moveInDateStr)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={minMoveInDate}
                    onChange={handleDateChange}
                    locale="vi-VN"
                  />
                )}

                {/* 3. Rental Duration Selector */}
                <View style={s.step2Card}>
                  <View style={s.cardSectionHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons
                        name="timer"
                        size={22}
                        color={T.secondary}
                      />
                      <Text style={s.sectionTitle}>Thời hạn thuê kho</Text>
                    </View>
                    <View style={s.savePill}>
                      <Text style={s.savePillText}>Tiết kiệm tới 30%</Text>
                    </View>
                  </View>

                  <View style={s.termGrid}>
                    {/* Option 1: 1 Month */}
                    <TouchableOpacity
                      style={[
                        s.termCard,
                        rentalTermMonths === 1 && s.termCardSelected,
                      ]}
                      onPress={() => setRentalTermMonths(1)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>1 Tháng</Text>
                        <View
                          style={[
                            s.radioCircle,
                            rentalTermMonths === 1 && s.radioCircleSelected,
                          ]}
                        />
                      </View>
                      <Text style={s.termPrice}>
                        {formatVND(selectedUnit.monthlyBasePrice)}
                      </Text>
                      <Text style={s.termSubtitle}>Giá chuẩn / tháng</Text>
                    </TouchableOpacity>

                    {/* Option 2: 3 Months */}
                    <TouchableOpacity
                      style={[
                        s.termCard,
                        rentalTermMonths === 3 && s.termCardSelected,
                      ]}
                      onPress={() => setRentalTermMonths(3)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>3 Tháng</Text>
                        <View
                          style={[
                            s.radioCircle,
                            rentalTermMonths === 3 && s.radioCircleSelected,
                          ]}
                        />
                      </View>
                      <Text style={s.termPrice}>
                        {formatVND(
                          Math.round(selectedUnit.monthlyBasePrice * 0.95),
                        )}
                      </Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 5%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 3: 6 Months (Recommended) */}
                    <TouchableOpacity
                      style={[
                        s.termCard,
                        rentalTermMonths === 6 && s.termCardSelected,
                      ]}
                      onPress={() => setRentalTermMonths(6)}
                      activeOpacity={0.85}
                    >
                      <View style={s.recommendedBadge}>
                        <Text style={s.recommendedBadgeText}>Khuyên dùng</Text>
                      </View>
                      <View style={s.termCardTop}>
                        <Text style={[s.termMonths, { fontWeight: "700" }]}>
                          6 Tháng
                        </Text>
                        <View
                          style={[
                            s.radioCircle,
                            rentalTermMonths === 6 && s.radioCircleSelected,
                          ]}
                        />
                      </View>
                      <Text style={[s.termPrice, { color: T.secondary }]}>
                        {formatVND(
                          Math.round(selectedUnit.monthlyBasePrice * 0.9),
                        )}
                      </Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 10%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 4: 12 Months */}
                    <TouchableOpacity
                      style={[
                        s.termCard,
                        rentalTermMonths === 12 && s.termCardSelected,
                      ]}
                      onPress={() => setRentalTermMonths(12)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>12 Tháng</Text>
                        <View
                          style={[
                            s.radioCircle,
                            rentalTermMonths === 12 && s.radioCircleSelected,
                          ]}
                        />
                      </View>
                      <Text style={s.termPrice}>
                        {formatVND(
                          Math.round(selectedUnit.monthlyBasePrice * 0.85),
                        )}
                      </Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 15%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Cost Breakdown & Payment Summary */}
                <View style={s.step2Card}>
                  <View style={s.costBreakdownHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons
                        name="receipt-long"
                        size={22}
                        color={T.secondary}
                      />
                      <Text style={s.sectionTitle}>
                        Bảng tính chi phí thuê & Tiền cọc
                      </Text>
                    </View>
                    <Text style={s.sectionHeaderSub}>
                      Kỳ hạn {rentalTermMonths} tháng
                    </Text>
                  </View>

                  <View style={s.costLinesList}>
                    <View style={s.costLine}>
                      <Text style={s.costLineLabel}>
                        Tiền thuê kho niêm yết ({rentalTermMonths} tháng x{" "}
                        {formatVND(selectedUnit.monthlyBasePrice)})
                      </Text>
                      <Text style={s.costLineValue}>
                        {formatVND(calc.grossRent)}
                      </Text>
                    </View>

                    {calc.discountPct > 0 && (
                      <View style={s.costLine}>
                        <Text style={[s.costLineLabel, { color: T.secondary }]}>
                          Ưu đãi kỳ hạn ({rentalTermMonths} tháng giảm{" "}
                          {calc.discountPct}%)
                        </Text>
                        <Text
                          style={[
                            s.costLineValue,
                            { color: T.secondary, fontWeight: "700" },
                          ]}
                        >
                          -{formatVND(calc.discountSavings)}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        s.costLine,
                        {
                          paddingTop: 6,
                          borderTopWidth: 1,
                          borderTopColor: "#f1f5f9",
                        },
                      ]}
                    >
                      <Text style={[s.costLineLabel, { fontWeight: "700" }]}>
                        Tổng tiền thuê thực tế ({rentalTermMonths} tháng)
                      </Text>
                      <Text style={[s.costLineValue, { fontWeight: "700" }]}>
                        {formatVND(calc.totalRent)}
                      </Text>
                    </View>

                    <View style={s.costLine}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flex: 1, // ← THÊM
                          flexShrink: 1,
                        }}
                      >
                        <Text
                          style={[
                            s.costLineLabel,
                            { fontWeight: "700", color: T.onSurface },
                          ]}
                        >
                          Tiền cọc giữ chỗ (Hoàn lại 100%)
                        </Text>
                        <View style={s.refundPill}>
                          <Text style={s.refundPillText}>Cọc đảm bảo</Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          s.costLineValue,
                          {
                            fontWeight: "800",
                            color: T.secondary,
                            fontSize: 14,
                          },
                        ]}
                      >
                        {formatVND(calc.depositAmount)}
                      </Text>
                    </View>
                  </View>
                
                </View>
              </View>
            </ScrollView>

            {/* Sticky Bottom Action Bar */}
            <View style={s.stickyBottomBar}>
              <View style={s.stickyTopRow}>
                <View>
                  <Text style={s.stickyLabel}>Tiền cọc thanh toán ngay</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: 6,
                    }}
                  >
                    <Text style={[s.stickyGrandTotal, { color: T.secondary }]}>
                      {formatVND(calc.depositAmount)}
                    </Text>
                  </View>
                </View>
                <View style={s.sslBadge}>
                  <MaterialIcons name="lock" size={13} color={T.secondary} />
                  <Text style={s.sslText}>VietQR 24/7</Text>
                </View>
              </View>

              {/* Action Button CTA */}
              <TouchableOpacity
                style={[s.signContractBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSignContract}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color={T.onPrimary} size="small" />
                ) : (
                  <>
                    <Text style={s.signContractBtnText}>
                      Xác nhận & Đặt cọc giữ kho
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: THANH TOÁN CỌC  SEPAY VIETQR                           */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <View style={{ flex: 1, position: "relative" }}>
            {/* Header */}
            <View style={s.step2Header}>
              <View style={s.step2HeaderLeft}>
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={T.onSurface}
                  />
                </TouchableOpacity>
                <View>
                  <Text style={s.step2HeaderTitle}>Thanh toán Cọc Giữ Chỗ</Text>
                  <Text style={s.step2HeaderSub}>
                    Bước 3: Quét mã SePay VietQR
                  </Text>
                </View>
              </View>
              <View style={s.qrPendingBadge}>
                <Text style={s.qrPendingText}>Chờ thanh toán</Text>
              </View>
            </View>

            <ScrollView
              style={s.scrollView}
              contentContainerStyle={[
                s.scrollContent,
                { padding: 16, paddingBottom: 160 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Countdown Banner */}
              <View style={s.countdownCard}>
                <MaterialIcons name="timer" size={24} color={T.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.countdownTitle}>
                    Thời gian giữ chỗ còn lại:{" "}
                    <Text style={{ fontWeight: "800", color: T.secondary }}>
                      {formatCountdown(paymentTimeLeft)}
                    </Text>
                  </Text>
                  <Text style={s.countdownSub}>
                    Vui lòng hoàn tất chuyển khoản trước khi đơn hết hiệu lực.
                  </Text>
                </View>
              </View>

              {/* VietQR Box */}
              <View style={s.qrCard}>
                <Text style={s.qrCardTitle}>
                  Quét mã VietQR bằng App Ngân Hàng
                </Text>
                <Text style={s.qrCardSub}>
                  Hệ thống SePay tự động xác nhận sau 10 - 30 giây
                </Text>

                <View style={s.qrImageFrame}>
                  {qrData?.qrCodeUrl ? (
                    <Image
                      source={{ uri: qrData.qrCodeUrl }}
                      style={s.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={s.qrPlaceholder}>
                      <ActivityIndicator size="large" color={T.secondary} />
                      <Text
                        style={{ marginTop: 8, fontSize: 13, color: T.outline }}
                      >
                        Đang tạo mã VietQR...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bank Transfer Details Table */}
                {qrData && (
                  <View style={s.bankDetailsList}>
                    <View style={s.bankRow}>
                      <Text style={s.bankRowLabel}>Ngân hàng</Text>
                      <Text style={s.bankRowVal}>{qrData.bankCode}</Text>
                    </View>

                    <View style={s.bankRow}>
                      <Text style={s.bankRowLabel}>Số tài khoản</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={[s.bankRowVal, { fontWeight: "800" }]}>
                          {qrData.accountNumber}
                        </Text>
                        <TouchableOpacity
                          style={s.copyMiniBtn}
                          onPress={() =>
                            copyToClipboard(
                              qrData.accountNumber,
                              "Số tài khoản",
                            )
                          }
                        >
                          <MaterialIcons
                            name="content-copy"
                            size={14}
                            color={T.secondary}
                          />
                          <Text style={s.copyMiniText}>Sao chép</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={s.bankRow}>
                      <Text style={s.bankRowLabel}>Chủ tài khoản</Text>
                      <Text
                        style={[s.bankRowVal, { textTransform: "uppercase" }]}
                      >
                        {qrData.accountName}
                      </Text>
                    </View>

                    <View style={s.bankRow}>
                      <Text style={s.bankRowLabel}>Số tiền cọc</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={[
                            s.bankRowVal,
                            {
                              fontWeight: "800",
                              color: T.secondary,
                              fontSize: 16,
                            },
                          ]}
                        >
                          {formatVND(qrData.amount)}
                        </Text>
                        <TouchableOpacity
                          style={s.copyMiniBtn}
                          onPress={() =>
                            copyToClipboard(String(qrData.amount), "Số tiền")
                          }
                        >
                          <MaterialIcons
                            name="content-copy"
                            size={14}
                            color={T.secondary}
                          />
                          <Text style={s.copyMiniText}>Sao chép</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ paddingTop: 4 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <Text style={s.bankRowLabel}>
                          Nội dung chuyển khoản (bắt buộc)
                        </Text>
                        <TouchableOpacity
                          style={[
                            s.copyMiniBtn,
                            { backgroundColor: "#fee2e2" },
                          ]}
                          onPress={() =>
                            copyToClipboard(
                              qrData.transferContent,
                              "Nội dung chuyển khoản",
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="content-copy"
                            size={14}
                            color="#b91c1c"
                          />
                          <Text style={[s.copyMiniText, { color: "#b91c1c" }]}>
                            Sao chép
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          backgroundColor: "#fef2f2",
                          borderWidth: 1,
                          borderColor: "#fca5a5",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderStyle: "dashed",
                          width: "100%",
                        }}
                      >
                        <Text
                          selectable
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: "#b91c1c",
                            textAlign: "center",
                            letterSpacing: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          {qrData.transferContent}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Content Warning Notice */}
                <View style={s.transferWarningBox}>
                  <MaterialIcons name="info" size={18} color="#b91c1c" />
                  <Text style={s.transferWarningText}>
                    LƯU Ý: Vui lòng nhập chính xác nội dung chuyển khoản để hệ
                    thống tự động xác nhận và giữ chỗ kho ngay lập tức.
                  </Text>
                </View>
              </View>
              
            </ScrollView>

            {/* Sticky Bottom Bar for Step 3 */}
            <View style={s.stickyBottomBar}>
              <TouchableOpacity
                style={[s.signContractBtn, checkingPayment && { opacity: 0.7 }]}
                onPress={handleCheckPaymentStatus}
                disabled={checkingPayment}
                activeOpacity={0.9}
              >
                {checkingPayment ? (
                  <ActivityIndicator color={T.onPrimary} size="small" />
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={T.onPrimary}
                    />
                    <Text style={s.signContractBtnText}>
                      Tôi Đã Chuyển Khoản - Kiểm Tra Trạng Thái
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: T.outline,
                  marginTop: 4,
                }}
              >
                Hệ thống tự động polling kiểm tra biên nhận SePay mỗi 3 giây
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: ĐÃ THANH TOÁN CỌC & GIỮ CHỖ THÀNH CÔNG                            */}
        {/* ========================================================================= */}
        {currentStep === 4 && selectedUnit && (
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { padding: 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.successCard}>
              <View style={s.successCircleIcon}>
                <MaterialIcons name="verified" size={48} color={T.green} />
              </View>
              <Text style={s.successHeadline}>
                Đặt Cọc & Giữ Chỗ Thành Công!
              </Text>
              <Text style={s.successCodeText}>
                MÃ ĐƠN: #
                {(confirmedReservation as any)?.reservationCode ||
                  (confirmedReservation?.id
                    ? String(confirmedReservation.id).slice(-8).toUpperCase()
                    : "RSV-CONFIRMED")}
              </Text>

              {/* Deposit Paid Badge Box */}
              <View style={s.depositSuccessBox}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color={T.green}
                  />
                  <Text style={s.depositSuccessTitle}>
                    ĐÃ THANH TOÁN TIỀN CỌC GIỮ CHỖ
                  </Text>
                </View>
                <Text style={s.depositSuccessAmount}>
                  {formatVND(qrData?.amount || calc.depositAmount)}
                </Text>
                <Text style={s.depositSuccessSub}>
                  Biên nhận cọc đã được lưu vào hệ thống. Buồng kho đã được khóa
                  giữ chỗ cho bạn.
                </Text>
              </View>

              {/* Booking Summary Card */}
              <View style={s.summarySpecsBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Cơ sở lưu trữ:</Text>
                  <Text style={s.summaryVal}>{selectedUnit.facilityName}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Buồng kho:</Text>
                  <Text style={s.summaryValBold}>{selectedUnit.title}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Ngày hẹn dọn đồ:</Text>
                  <Text style={s.summaryVal}>{moveInDateStr}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Khung giờ hẹn:</Text>
                  <Text style={s.summaryVal}>{appointmentTimeSlot}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Thời hạn thuê:</Text>
                  <Text style={s.summaryVal}>{rentalTermMonths} tháng</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tiền cọc đã nộp:</Text>
                  <Text style={[s.summaryValBold, { color: T.green }]}>
                    {formatVND(qrData?.amount || calc.depositAmount)}
                  </Text>
                </View>
              </View>

              {/* Instruction Note */}
              <View style={s.instructionCard}>
                <MaterialIcons name="info-outline" size={20} color={T.blue} />
                <Text style={s.instructionText}>
                  Vui lòng mang theo CCCD/VNeID đến chi nhánh vào ngày hẹn để
                  nhân viên hỗ trợ đối chiếu, bàn giao ô kho thực tế và cấp mã
                  mở khóa Smart Key 24/7.
                </Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={s.manageBookingBtn}
                onPress={onViewMyReservations}
                activeOpacity={0.88}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={18}
                  color={T.surfaceLowest}
                  style={{ marginRight: 6 }}
                />
                <Text style={s.manageBookingBtnText}>
                  Vào Quản Lý Ô Kho Của Tôi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.bookAnotherBtn}
                onPress={() => {
                  setCurrentStep(1);
                  setConfirmedReservation(null);
                  setQrData(null);
                  setSelectedUnit(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={s.bookAnotherBtnText}>
                  Đặt Thêm Buồng Kho Khác
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Customer Bottom Navigation Bar (5 tabs matching Stitch mockup) */}
        <CustomerBottomNavBar
          activeTab={currentBottomTab}
          onSelectTab={handleTabPress}
        />
      </View>
    </View>
  );
}

// ─── Main StyleSheet ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  mobileContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 500,
    backgroundColor: T.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ─── Stitch Explore UI Styles (Matching Web / Stitch Mockup) ──────────────
  stitchWrapper: {
    backgroundColor: "#f7f9fd",
    paddingBottom: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
  },
  emptyFeaturedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
    gap: 6,
  },
  emptyFeaturedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#131b2e",
  },
  emptyFeaturedSub: {
    fontSize: 12,
    color: "#737686",
    textAlign: "center",
  },

  // Greeting & Header
  greetingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dae2fd",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  greetingSub: {
    fontSize: 12,
    color: "#434655",
    fontWeight: "500",
    lineHeight: 14,
  },
  greetingName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  greetingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    position: "relative",
  },
  iconNotifDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1d4ed8",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },

  // Search Bar
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBarPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInputStitch: {
    flex: 1,
    fontSize: 13,
    color: "#131b2e",
    paddingVertical: 0,
  },
  filterTuneBtn: {
    paddingLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Promo / Hero Banner
  heroBannerSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroBannerCard: {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1d4ed8",
    minHeight: 146,
    padding: 18,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  heroBannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 23, 75, 0.72)",
  },
  heroBannerContent: {
    position: "relative",
    zIndex: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(219, 234, 254, 0.9)",
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
    maxWidth: 240,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  heroCtaText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "800",
  },

  // Category Filter Pills
  categoryPillsSection: {
    paddingBottom: 16,
  },
  categoryPillsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: "#131b2e",
    borderColor: "#131b2e",
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#131b2e",
  },
  categoryPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  // Featured Section & Horizontal Carousel
  featuredSection: {
    paddingBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#131b2e",
    letterSpacing: -0.3,
  },
  sectionHeaderAction: {
    fontSize: 13,
    fontWeight: "700",
    color: "#737686",
  },
  sectionHeaderSort: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  featuredCarouselScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  featuredCard: {
    width: 275,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.5)",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  featuredImageWrap: {
    position: "relative",
    width: "100%",
    height: 176,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#eff4ff",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  cardBadgeTopLeft: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#131b2e",
  },
  cardBadgeAmber: {
    backgroundColor: "#f59e0b",
  },
  cardBadgeAmberText: {
    color: "#ffffff",
  },
  cardHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDotsWrap: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  cardDotActive: {
    width: 14,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  featuredCardBody: {
    paddingTop: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 4,
  },
  featuredCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#131b2e",
    lineHeight: 20,
  },
  featuredPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  featuredPriceVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  featuredPriceUnit: {
    fontSize: 12,
    color: "#434655",
    fontWeight: "500",
    marginLeft: 2,
  },
  featuredTagPill: {
    backgroundColor: "rgba(29, 78, 216, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  featuredTagBusiness: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  featuredTagBusinessText: {
    color: "#1e40af",
  },
  featuredLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  featuredLocationText: {
    fontSize: 12,
    color: "#737686",
    flex: 1,
  },

  // Nearby Section
  nearbySection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  nearbyListWrap: {
    gap: 12,
  },
  nearbyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  nearbyThumbnailWrap: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#eff4ff",
  },
  nearbyThumbnail: {
    width: "100%",
    height: "100%",
  },
  nearbyLiveDot: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  nearbyInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  nearbyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#131b2e",
  },
  nearbyDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  nearbyDistanceText: {
    fontSize: 12,
    color: "#737686",
  },
  nearbyBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  nearbyPriceText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  nearbyPriceUnit: {
    fontSize: 11,
    color: "#737686",
    fontWeight: "400",
  },
  nearbyActionBtn: {
    backgroundColor: "rgba(29, 78, 216, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  nearbyActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  loadWrap: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadText: {
    fontSize: 14,
    color: T.onSurfaceVariant,
    fontWeight: "500",
  },

  // Top App Bar
  topAppBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: T.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: T.surfaceContainerHigh,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
    minWidth: 0,
  },
  brandIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  brandLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  brandLocationText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    fontWeight: "600",
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  loginHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.surfaceLowest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    maxWidth: 130,
    flexShrink: 0,
  },
  logoutHeaderBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  loginHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: T.onSurface,
    maxWidth: 85,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifBadgeDot: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  notifBadgeCountText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },

  // Search & Filters Section
  searchFilterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: T.bg,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputWrapFocused: {
    borderColor: T.primaryContainer,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: T.onSurface,
    paddingVertical: 0,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: T.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sizeGuideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sizeGuideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: T.onSurfaceVariant,
  },
  sizeGuideLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sizeGuideLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.secondary,
  },
  sizeChipsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.surfaceLowest,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  sizeChipActive: {
    backgroundColor: T.primaryContainer,
    borderColor: T.primaryContainer,
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: T.onSurface,
  },
  sizeChipTextActive: {
    color: T.onPrimary,
    fontWeight: "700",
  },
  amenityTagsScroll: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: "#dce9ff",
  },
  amenityTagActive: {
    backgroundColor: T.surfaceContainerHigh,
    borderColor: T.primaryContainer,
  },
  amenityTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.primaryContainer,
  },
  amenityTagTextActive: {
    color: T.secondaryBrand,
  },
  amenityPromoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: T.secondaryFixed,
    borderWidth: 1,
    borderColor: "#ffb599",
  },
  amenityPromoText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.onSecondaryFixed,
  },

  // Main List Section
  mainListSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.secondaryContainer,
  },
  listHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  listHeaderSort: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  listHeaderSortBold: {
    fontWeight: "700",
    color: T.onSurface,
  },
  reassuranceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primaryContainer,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  reassuranceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  reassuranceTextWrap: {
    flex: 1,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: T.surfaceLowest,
    marginBottom: 2,
  },
  reassuranceSub: {
    fontSize: 11,
    color: "#cbd5e1",
    lineHeight: 15,
  },

  // ================= STEP 2 SPECIFIC STYLES =================
  step2Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: T.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  step2HeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 8,
  },
  step2HeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.onSurface,
    letterSpacing: -0.2,
  },
  step2HeaderSub: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },
  hotlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  hotlineText: {
    fontSize: 11,
    color: T.secondary,
    fontWeight: "700",
  },

  // Progress Tracker
  progressTrackerRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressItem: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  progressBarActive: {
    height: 5,
    backgroundColor: T.secondary,
    borderRadius: 3,
  },
  progressBarInactive: {
    height: 5,
    backgroundColor: "#c6c6cd",
    borderRadius: 3,
  },
  progressTextActive: {
    fontSize: 11,
    color: T.secondary,
  },
  progressTextInactive: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },

  // Step 2 Cards
  step2Card: {
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    color: T.onSecondaryFixed,
    fontWeight: "700",
  },
  unitNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: T.onSurface,
    marginBottom: 4,
  },
  unitAddressText: {
    fontSize: 13,
    color: T.onSurfaceVariant,
    marginBottom: 12,
  },
  spec3Grid: {
    flexDirection: "row",
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(198,198,205,0.5)",
    marginBottom: 10,
  },
  specCol: {
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    marginBottom: 2,
  },
  specValBold: {
    fontSize: 15,
    fontWeight: "800",
    color: T.onSurface,
  },
  specValMed: {
    fontSize: 12,
    fontWeight: "600",
    color: T.onSurface,
  },
  amenityBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  blueAmenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  blueAmenityText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  grayAmenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  grayAmenityText: {
    fontSize: 11,
    color: T.onSurface,
    fontWeight: "500",
  },

  // Blueprint Preview
  blueprintWrap: {
    height: 112,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#c6c6cd",
    position: "relative",
    backgroundColor: T.primaryContainer,
  },
  blueprintImg: {
    width: "100%",
    height: "100%",
  },
  blueprintOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(19, 27, 46, 0.25)",
  },
  blueprintTopPill: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(19, 27, 46, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  blueprintTopPillText: {
    fontSize: 10,
    color: T.surfaceLowest,
    fontWeight: "600",
  },
  blueprintBottomPill: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.surfaceLowest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  blueprintBottomPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: T.secondary,
  },

  // Move-in Date Section
  cardSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1, // ← THÊM
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: T.onSurface,
    flexShrink: 1, // ← THÊM
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    flexShrink: 0, // ← THÊM
  },
  changeLinkText: {
    fontSize: 12,
    color: T.secondary,
    fontWeight: "700",
  },
  datePickerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  dateLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateCalBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: T.surfaceLowest,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    alignItems: "center",
    justifyContent: "center",
  },
  dateCalMonth: {
    fontSize: 10,
    fontWeight: "800",
    color: T.secondary,
  },
  dateCalDay: {
    fontSize: 15,
    fontWeight: "900",
    color: T.onSurface,
    lineHeight: 16,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: "700",
    color: T.onSurface,
  },
  dateSubText: {
    fontSize: 13,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  infoNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
  },
  infoNoticeText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },

  // Rental Duration Selector
  savePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: T.surfaceContainer,
  },
  savePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: T.onSurface,
  },
  termGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  termCard: {
    width: "48%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    backgroundColor: T.surfaceLowest,
    position: "relative",
  },
  termCardSelected: {
    borderColor: T.secondary,
    borderWidth: 2,
    backgroundColor: T.surfaceLowest,
    shadowColor: T.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendedBadge: {
    position: "absolute",
    top: -9,
    right: 10,
    backgroundColor: T.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: T.surfaceLowest,
    textTransform: "uppercase",
  },
  termCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  termMonths: {
    fontSize: 14,
    fontWeight: "600",
    color: T.onSurface,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.outline,
  },
  radioCircleSelected: {
    borderColor: T.secondary,
    borderWidth: 4,
    backgroundColor: T.surfaceLowest,
  },
  termPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: T.onSurface,
    marginTop: 2,
  },
  discountRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  discountRateBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: T.secondary,
  },
  termSubtitle: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  giftText: {
    fontSize: 9,
    fontWeight: "700",
    color: T.secondary,
    marginTop: 4,
  },

  // Insurance Section
  insuranceCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    backgroundColor: T.surfaceLowest,
    marginBottom: 8,
  },
  insuranceCardSelected: {
    borderWidth: 2,
    borderColor: T.secondary,
    backgroundColor: T.surfaceLow,
  },
  insuranceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  insuranceTitle: {
    fontSize: 13,
    color: T.onSurface,
  },
  freePill: {
    backgroundColor: T.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freePillText: {
    fontSize: 10,
    color: T.onSurface,
    fontWeight: "600",
  },
  insurancePriceTag: {
    fontSize: 11,
    fontWeight: "700",
    color: T.secondary,
  },
  insuranceDesc: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    lineHeight: 16,
  },

  // Addon Checklist
  addonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    backgroundColor: T.surfaceLowest,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: T.outline,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: T.secondary,
    borderColor: T.secondary,
  },
  addonTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: T.onSurface,
  },
  addonSub: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  addonPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: T.onSurface,
  },

  // Cost Breakdown Card
  costBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198,198,205,0.6)",
    paddingBottom: 8,
    marginBottom: 8,
    gap: 8, // ← THÊM
    flexWrap: "wrap", // ← THÊM (cho phép xuống dòng khi hẹp)
  },
  costLinesList: {
    gap: 8,
  },
  costLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  costLineLabel: {
    fontSize: 12,
    color: T.onSurface,
    flex: 1,
    flexShrink: 1, // ← cho phép co lại
  },
  costLineValue: {
    fontSize: 12,
    fontWeight: "600",
    color: T.onSurface,
    flexShrink: 0,
  },
  refundPill: {
    backgroundColor: T.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  refundPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: T.secondary,
  },
  grandTotalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: "#c6c6cd",
    paddingTop: 10,
    marginTop: 8,
  },
  grandTotalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: T.onSurface,
  },
  grandTotalSub: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  grandTotalNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: T.secondary,
  },

  // Security Banner
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11,
    color: T.onSurface,
    lineHeight: 16,
  },

  // Sticky Bottom Bar
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surfaceLowest,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "#c6c6cd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
    gap: 6,
  },
  stickyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stickyLabel: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  stickyGrandTotal: {
    fontSize: 18,
    fontWeight: "900",
    color: T.secondary,
    letterSpacing: -0.3,
  },
  stickyVatNote: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  sslBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sslText: {
    fontSize: 10,
    fontWeight: "600",
    color: T.onSurfaceVariant,
  },
  signContractBtn: {
    height: 48,
    minHeight: 48,
    backgroundColor: T.secondary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: T.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    paddingHorizontal: 16, // ← THÊM: padding để text không sát mép
  },
  signContractBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: T.onPrimary,
    flexShrink: 1, // ← THÊM
    textAlign: "center", // ← THÊM
  },
  securityMicroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 2,
  },
  securityMicroText: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },

  // ================= STEP 3 SUCCESS STYLES =================
  successCard: {
    backgroundColor: T.surfaceLowest,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  successCircleIcon: {
    marginBottom: 10,
  },
  successHeadline: {
    fontSize: 18,
    fontWeight: "800",
    color: T.onSurface,
    textAlign: "center",
    marginBottom: 4,
  },
  successCodeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.secondary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  pinAccessBox: {
    width: "100%",
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  pinAccessLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pinCodeLarge: {
    fontSize: 32,
    fontWeight: "900",
    color: T.onSurface,
    letterSpacing: 4,
    marginVertical: 4,
  },
  pinDesc: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  summarySpecsBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  summaryVal: {
    fontSize: 12,
    color: T.onSurface,
  },
  summaryValBold: {
    fontSize: 12,
    fontWeight: "700",
    color: T.onSurface,
  },
  manageBookingBtn: {
    width: "100%",
    height: 46,
    backgroundColor: T.secondary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  manageBookingBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: T.onPrimary,
  },
  bookAnotherBtn: {
    width: "100%",
    height: 44,
    backgroundColor: T.surfaceLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  bookAnotherBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.onSurface,
  },
  // ─── Step 2 Deposit Highlight Card ───────────────────────────
  depositHighlightCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    marginTop: 12,
  },
  depositHighlightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1d4ed8",
    flexWrap: "wrap",
  },
  depositHighlightAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1d4ed8",
    marginBottom: 4,
  },
  depositHighlightSub: {
    fontSize: 11,
    color: "#1e40af",
    lineHeight: 16,
    flexShrink: 1,
  },
  // ─── Step 3 SePay VietQR Styles ──────────────────────────────
  qrPendingBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  qrPendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
    marginBottom: 14,
  },
  countdownTitle: {
    fontSize: 13,
    color: T.onSurface,
    fontWeight: "600",
    marginBottom: 2,
  },
  countdownSub: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },
  qrCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  qrCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.onSurface,
    textAlign: "center",
    marginBottom: 4,
  },
  qrCardSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 16,
  },
  qrImageFrame: {
    width: 240,
    height: 240,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  bankDetailsList: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
    marginBottom: 12,
  },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  bankRowLabel: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  bankRowVal: {
    fontSize: 13,
    fontWeight: "600",
    color: T.onSurface,
  },
  copyMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  copyMiniText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563eb",
  },
  transferWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fee2e2",
    gap: 8,
    width: "100%",
  },
  transferWarningText: {
    flex: 1,
    fontSize: 11,
    color: "#b91c1c",
    lineHeight: 16,
    fontWeight: "500",
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: T.secondary,
    gap: 6,
    marginBottom: 10,
  },
  simulateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.secondary,
  },
  depositSuccessBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  depositSuccessTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: T.green,
    letterSpacing: 0.5,
  },
  depositSuccessAmount: {
    fontSize: 26,
    fontWeight: "900",
    color: T.green,
    marginBottom: 4,
  },
  depositSuccessSub: {
    fontSize: 12,
    color: "#166534",
    textAlign: "center",
    lineHeight: 17,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 10,
    marginBottom: 16,
    width: "100%",
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  emptyStateWrap: {
    padding: 32,
    alignItems: "center",
    gap: 8,
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.onSurface,
    textAlign: "center",
  },
  emptyStateSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  emptyStateBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.secondary,
  },
  emptyStateBtnText: {
    color: T.onPrimary,
    fontWeight: "700",
    fontSize: 12,
  },

  // ─── Facility Selection Styles ───────────────────────────────────────────
  facilitySection: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  facilityHeroBanner: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  facilityHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  facilityHeroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  facilityHeroBadgeText: {
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  facilityHeroTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  facilityHeroSub: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
  },
  facilityListWrap: {
    marginTop: 4,
  },
  activeFacilityBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  activeFacilityInfo: {
    flex: 1,
    marginRight: 10,
  },
  activeFacilityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  activeFacilityName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  activeFacilityAddress: {
    fontSize: 12,
    color: "#3b82f6",
  },
  changeFacilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  changeFacilityBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
});

// ─── Bottom Navigation Bar Component ─────────────────────────────────────────
function BottomNavBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: "search" | "my-storage" | "support";
  onSelectTab: (tab: "search" | "my-storage" | "support") => void;
}) {
  return (
    <View style={bn.container}>
      {/* Tab 1: Thuê kho */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab("search")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="search"
          size={24}
          color={activeTab === "search" ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === "search" ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Thuê kho
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Kho của tôi */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab("my-storage")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="inventory-2"
          size={22}
          color={activeTab === "my-storage" ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === "my-storage"
              ? bn.tabLabelActive
              : bn.tabLabelInactive,
          ]}
        >
          Kho của tôi
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Hỗ trợ */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab("support")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="support-agent"
          size={24}
          color={activeTab === "support" ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === "support" ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Hỗ trợ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const bn = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    backgroundColor: T.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: T.outlineVariant,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: T.secondary,
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: T.onSurfaceVariant,
    fontWeight: "500",
  },
  keyBadgeDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: T.secondaryContainer,
  },
});

// ─── Article Card Styles ───────────────────────────────────────────────────
const ac = StyleSheet.create({
  card: {
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c6c6cd",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  mediaWrap: {
    height: 176,
    position: "relative",
    backgroundColor: T.primaryContainer,
  },
  mediaImg: {
    width: "100%",
    height: "100%",
  },
  mediaGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(198, 198, 205, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.green,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.onSurface,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: T.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.surfaceLowest,
  },
  mediaBottomOverlay: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 11,
    color: "#bfdbfe",
    fontWeight: "600",
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.surfaceLowest,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // Body
  body: {
    padding: 14,
  },
  metricGrid: {
    flexDirection: "row",
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dce9ff",
    marginBottom: 10,
  },
  metricCol: {
    flex: 1,
  },
  metricColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "#c6c6cd",
    paddingLeft: 10,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: T.onSurfaceVariant,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "700",
    color: T.onSurface,
  },

  // Feature Chips
  featureChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 12,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: "#c6c6cd",
  },
  featureChipText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    fontWeight: "500",
  },

  // Price & CTA Tier
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  originalPriceText: {
    fontSize: 11,
    color: T.outline,
    textDecorationLine: "line-through",
  },
  priceLabelText: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: T.secondaryBrand,
  },
  pricePeriod: {
    fontSize: 11,
    fontWeight: "600",
    color: T.onSurfaceVariant,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: T.secondaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: T.surfaceLowest,
  },
});

// ─── Facility Card Styles ─────────────────────────────────────────────────
const fc = StyleSheet.create({
  card: {
    backgroundColor: T.surfaceLowest,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 160,
    backgroundColor: "#e2e8f0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.15)",
  },
  districtBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  districtBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  availableBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    lineHeight: 22,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  featurePillText: {
    fontSize: 11,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  selectBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
