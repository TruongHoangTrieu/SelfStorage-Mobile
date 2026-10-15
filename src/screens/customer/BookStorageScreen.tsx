import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Facility, UnitType, Reservation } from '../../api';

// ─── Tailwind Color Palette verbatim from User's Design System ───────────────
const T = {
  bg: '#f8f9ff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  primary: '#000000',
  primaryContainer: '#131b2e',
  inverseSurface: '#213145',
  onPrimary: '#ffffff',
  secondary: '#a73a00',
  secondaryBrand: '#EA580C',
  secondaryContainer: '#fd651e',
  secondaryFixed: '#ffdbce',
  onSecondaryFixed: '#370e00',
  surfaceLowest: '#ffffff',
  surfaceLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  outline: '#76777d',
  outlineVariant: '#c6c6cd',
  green: '#22c55e',
  amber: '#f59e0b',
  blue: '#2563EB',
};

interface Props {
  facilities: Facility[];
  unitTypes: UnitType[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onReservationCreated: (reservation: Reservation) => void;
  onViewMyReservations: () => void;
  onNavigateTab?: (tab: 'search' | 'my-storage' | 'digital-key' | 'support') => void;
  activeBottomTab?: 'search' | 'my-storage' | 'digital-key' | 'support';
  onSwitchToStaff?: () => void;
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
  category: 'personal' | 'family' | 'business';
  amenities: string[];
}

const DEFAULT_ITEMS: StorageDisplayItem[] = [
  {
    id: 'card-1',
    facilityId: 1,
    unitTypeId: 1,
    facilityName: 'Kho Lock & Go - Chi nhánh Nam Sài Gòn',
    locationText: 'Tầng 2, Tòa nhà Logistics Tân Thuận, Quận 7',
    title: 'Kho Lock & Go - Mã buồng #B2-108',
    unitCode: '#B2-108',
    floorText: 'Sơ đồ buồng kho Tầng 2',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDi7ffWEcZNkd9FUJVDq8FKYWhjOSmQblyG1Qj5TBeENSYs3J3O1s3QP4Fhed6n88cmTvHL3f4zr-hyHiqQM-2vTawgzuRvH2r1kfogAnBOeNDPErcFvdt6AnQ5le_X52cTvrRjrOuww6gKiByxYZ-uxN_y2YJObfnOV3QANbDKwbHQAxue3_NgpKVzVsocye92Ra5VoUuq7Nxtz80VPKv1uTtZGEbc_oMqBiQM2Itmz9ZmzfZNBqNT',
    blueprintImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVarykGbxjehyVgEQMfdT0pamniv6wuqvBh0pVJ4-0GWZqsDQRNfXXHkAR9T8WSox57jSXVc4O8lxNqjAXngk3jyZuiAHNgDN0sdFkbi9U-qP58EG1xhGzMgwurn-fFM_emDoPCTW6yDyagoIlegqwnDsfnSLq5pK6CdFQ4kLUDyb7r92f2zAcPf5xiwHxFNZzONCNVCb-vLdeyexhRp02zDqm2qUyqcjGtkPrVLRL_iuei9HuWxUk',
    badgeStatus: 'Còn 2 kho trống',
    badgeDiscount: '-15% Tháng đầu',
    floorArea: '6.0 m²',
    volume: '16.8 m³',
    dimensions: '2 x 3 x 2.8m',
    capacity: '~35 thùng, 1 xe máy, sofa',
    features: ['Kiểm soát nhiệt độ 22-25°C', 'Camera CCTV riêng', 'Mở bằng App Bluetooth 24/7'],
    originalPrice: 1500000,
    monthlyBasePrice: 1450000,
    category: 'family',
    amenities: ['ac', 'delivery', 'bluetooth'],
  },
  {
    id: 'card-2',
    facilityId: 2,
    unitTypeId: 2,
    facilityName: 'Kho Mini Box - Tự quản cá nhân',
    locationText: 'Tầng 1, 123 Nguyễn Thị Thập, Quận 7',
    title: 'Kho Mini Box - Mã buồng #M1-042',
    unitCode: '#M1-042',
    floorText: 'Sơ đồ buồng kho Tầng 1',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDxnmvNPLv63BiMwGIW-9lanBQwMIrgXxZRe5wEO4d4dSw4bROFK4ygtcnqN0WoSpnSFtfMbyQ9nPjp2xqG6K0qVIgazUz4NrG2e-bumqKV_7rZw3pKjrBTyw0LvOjf_rJfSBxHg6-rI7ecugYdTczs-Tlb-NZqE_C1Rc587_Kbyb2Ay0_oJSKqcJ5fn1ea1QdycUeE0mctFMyxWKdHMifzHcJT-_cqenMg9giBkW3UvdXtc8PVgNIV',
    blueprintImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVarykGbxjehyVgEQMfdT0pamniv6wuqvBh0pVJ4-0GWZqsDQRNfXXHkAR9T8WSox57jSXVc4O8lxNqjAXngk3jyZuiAHNgDN0sdFkbi9U-qP58EG1xhGzMgwurn-fFM_emDoPCTW6yDyagoIlegqwnDsfnSLq5pK6CdFQ4kLUDyb7r92f2zAcPf5xiwHxFNZzONCNVCb-vLdeyexhRp02zDqm2qUyqcjGtkPrVLRL_iuei9HuWxUk',
    badgeStatus: 'Còn 5 kho trống',
    floorArea: '2.25 m²',
    volume: '5.6 m³',
    dimensions: '1.5 x 1.5 x 2.5m',
    capacity: '15 thùng đồ cá nhân, vali, hồ sơ',
    features: ['An ninh vân tay & Khóa số', 'Hút ẩm tự động', 'Bảo hiểm hàng hóa'],
    monthlyBasePrice: 650000,
    category: 'personal',
    amenities: ['ac', 'fingerprint'],
  },
  {
    id: 'card-3',
    facilityId: 1,
    unitTypeId: 3,
    facilityName: 'Kho Khoang Lớn - Hàng hóa Thương mại',
    locationText: 'Tầng trệt, 456 Huỳnh Tấn Phát, Quận 7',
    title: 'Kho Khoang Lớn - Mã buồng #G0-015',
    unitCode: '#G0-015',
    floorText: 'Sơ đồ kho Khoang Lớn Tầng trệt',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCLA1Ke608Wa7nLTLWaO7p5t81LnSmwa940rFscZ6Z4L3f-Pp8middo2YZK1W6oVddxHmnNb1RDFtWJwwhT8e-zMm2hy8LR5MrhRWCZp_sg9HESH46dbxMEYVjEKQDHq-MfcWj-Mf-3jf3tnSwaudoviAjQpouNIYKZ67hlz5e54G8erVTVGaupzg42umtoi6St-GjqyazYGGlpb1HyXUD3PoNslnnEQbPHJM4UGQ7cyJPPjb3HrSTZ',
    blueprintImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVarykGbxjehyVgEQMfdT0pamniv6wuqvBh0pVJ4-0GWZqsDQRNfXXHkAR9T8WSox57jSXVc4O8lxNqjAXngk3jyZuiAHNgDN0sdFkbi9U-qP58EG1xhGzMgwurn-fFM_emDoPCTW6yDyagoIlegqwnDsfnSLq5pK6CdFQ4kLUDyb7r92f2zAcPf5xiwHxFNZzONCNVCb-vLdeyexhRp02zDqm2qUyqcjGtkPrVLRL_iuei9HuWxUk',
    badgeStatus: 'Sắp hết - Còn 1 kho',
    floorArea: '16.0 m²',
    volume: '48.0 m³',
    dimensions: '4 x 4 x 3.0m',
    capacity: 'Xe nâng & Cửa cuốn tự động',
    features: ['Xe tải đậu tận cửa', 'Bảo vệ tuần tra 24/7', 'Điện 3 pha riêng biệt'],
    monthlyBasePrice: 3500000,
    category: 'business',
    amenities: ['delivery'],
  },
];

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ';
}

export default function BookStorageScreen({
  facilities,
  unitTypes,
  loading,
  onReservationCreated,
  onViewMyReservations,
  onNavigateTab,
  activeBottomTab = 'search',
  onSwitchToStaff,
}: Props) {
  // Navigation Flow: step 1 = explore, step 2 = contract review, step 3 = signed success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'personal' | 'family' | 'business'>('all');
  const [selectedAmenity, setSelectedAmenity] = useState<string | null>(null);

  // Selected Unit for Contract Step 2
  const [selectedUnit, setSelectedUnit] = useState<StorageDisplayItem>(DEFAULT_ITEMS[0]);

  // Step 2 Form States
  const [moveInDateStr, setMoveInDateStr] = useState('2026-10-18');
  const [rentalTermMonths, setRentalTermMonths] = useState<1 | 3 | 6 | 12>(6);
  const [insurancePlan, setInsurancePlan] = useState<'standard' | 'comprehensive'>('comprehensive');
  const [addonTrolley, setAddonTrolley] = useState(true);
  const [addonCartons, setAddonCartons] = useState(false);
  const [contractNotes, setContractNotes] = useState('');

  // Submitting & Reservation result
  const [submitting, setSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Active Bottom Tab
  const [currentBottomTab, setCurrentBottomTab] = useState<'search' | 'my-storage' | 'digital-key' | 'support'>(
    activeBottomTab
  );

  // Combined real & fallback data
  const storageItems: StorageDisplayItem[] = useMemo(() => {
    if (unitTypes && unitTypes.length > 0) {
      return unitTypes.map((ut, idx) => {
        const fac =
          facilities.find((f) => String(f.id) === String(ut.facilityId)) ||
          (ut as any).facility ||
          facilities[idx % (facilities.length || 1)] || {
            id: ut.facilityId || 'fac-1',
            name: 'Hệ thống Kho Tự Quản Thông Minh',
            address: 'Hồ Chí Minh',
            code: 'FAC',
          };

        const cat: 'personal' | 'family' | 'business' =
          ut.size && ut.size <= 3 ? 'personal' : ut.size && ut.size <= 9 ? 'family' : 'business';
        const mockRef = DEFAULT_ITEMS[idx % DEFAULT_ITEMS.length];

        const facImage =
          Array.isArray((fac as any).images) && (fac as any).images.length > 0
            ? (fac as any).images[0]
            : fac.image || fac.imageUrl;
        const utImage =
          Array.isArray((ut as any).images) && (ut as any).images.length > 0
            ? (ut as any).images[0]
            : ut.image || ut.imageUrl;

        const available = (ut as any).availableUnits ?? (ut as any).availableCount;
        const badgeStatus =
          available !== undefined
            ? available > 0
              ? `Còn ${available} kho trống`
              : 'Tạm hết phòng'
            : mockRef.badgeStatus;

        return {
          id: `item-${ut.id}`,
          facilityId: fac.id || ut.facilityId,
          unitTypeId: ut.id,
          facilityName: fac.name,
          locationText: fac.address || mockRef.locationText,
          title: ut.name,
          unitCode: `#${fac.code || 'FAC'}-${ut.code || String(ut.id).slice(-4).toUpperCase()}`,
          floorText: `Sơ đồ buồng kho ${fac.name}`,
          image: utImage || facImage || mockRef.image,
          blueprintImage: mockRef.blueprintImage,
          badgeStatus,
          badgeDiscount: idx === 0 ? '-15% Tháng đầu' : undefined,
          floorArea: `${ut.size || 5} m²`,
          volume: `${Math.round((ut.size || 5) * 2.8 * 10) / 10} m³`,
          dimensions: (ut as any).dimensions || `${ut.size}m² (Tiêu chuẩn cao 2.8m)`,
          capacity: ut.description || mockRef.capacity,
          features: (ut.features as string[]) || mockRef.features,
          originalPrice: idx === 0 ? Math.round(Number(ut.price) * 1.2) : undefined,
          monthlyBasePrice: Number(ut.price) || mockRef.monthlyBasePrice,
          category: cat,
          amenities: mockRef.amenities,
        };
      });
    }

    if (facilities && facilities.length > 0) {
      const generated: StorageDisplayItem[] = [];
      facilities.forEach((fac, facIndex) => {
        const nestedTypes = (fac as any).storageUnitTypes || [];
        nestedTypes.forEach((ut: any, utIndex: number) => {
          const cat: 'personal' | 'family' | 'business' =
            ut.size && ut.size <= 3 ? 'personal' : ut.size && ut.size <= 9 ? 'family' : 'business';
          const mockRef = DEFAULT_ITEMS[(facIndex + utIndex) % DEFAULT_ITEMS.length];
          const facImage =
            Array.isArray(fac.images) && fac.images.length > 0 ? fac.images[0] : fac.image;

          generated.push({
            id: `item-${fac.id}-${ut.id}`,
            facilityId: fac.id,
            unitTypeId: ut.id,
            facilityName: fac.name,
            locationText: fac.address || mockRef.locationText,
            title: ut.name,
            unitCode: `#${fac.code || 'FAC'}-${ut.code || String(ut.id).slice(-4).toUpperCase()}`,
            floorText: `Sơ đồ buồng kho ${fac.name}`,
            image: facImage || mockRef.image,
            blueprintImage: mockRef.blueprintImage,
            badgeStatus: ut.status === 'ACTIVE' ? 'Còn kho trống' : 'Bảo trì',
            floorArea: `${ut.size || 5} m²`,
            volume: `${Math.round((ut.size || 5) * 2.8 * 10) / 10} m³`,
            dimensions: `${ut.size}m² (Cao 2.8m)`,
            capacity: ut.description || mockRef.capacity,
            features: mockRef.features,
            monthlyBasePrice: Number(ut.price || ut.depositAmount) || mockRef.monthlyBasePrice,
            category: cat,
            amenities: mockRef.amenities,
          });
        });
      });
      if (generated.length > 0) return generated;
    }

    return DEFAULT_ITEMS;
  }, [facilities, unitTypes]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return storageItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.title.toLowerCase().includes(q);
        const matchesFac = item.facilityName.toLowerCase().includes(q);
        const matchesLoc = item.locationText.toLowerCase().includes(q);
        const matchesDim = item.dimensions.toLowerCase().includes(q);
        if (!matchesName && !matchesFac && !matchesLoc && !matchesDim) return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedAmenity && !item.amenities.includes(selectedAmenity)) {
        return false;
      }
      return true;
    });
  }, [storageItems, searchQuery, selectedCategory, selectedAmenity]);

  // Calculations for Step 2
  const calc = useMemo(() => {
    const baseRate = selectedUnit.monthlyBasePrice;
    let discountPct = 0;
    let ratePerMonth = baseRate;

    if (rentalTermMonths === 1) {
      discountPct = 0;
      ratePerMonth = baseRate;
    } else if (rentalTermMonths === 3) {
      discountPct = 10;
      ratePerMonth = Math.round(baseRate * 0.9);
    } else if (rentalTermMonths === 6) {
      discountPct = 20;
      ratePerMonth = Math.round(baseRate * 0.8);
    } else if (rentalTermMonths === 12) {
      discountPct = 30;
      ratePerMonth = Math.round(baseRate * 0.7);
    }

    const totalRent = ratePerMonth * rentalTermMonths;
    const insuranceMonthly = insurancePlan === 'comprehensive' ? 99000 : 0;
    const totalInsurance = insuranceMonthly * rentalTermMonths;
    const depositKeycard = 500000;
    const voucherDiscount = 200000;
    const addonCartonsCost = addonCartons ? 120000 : 0;

    const grandTotal = totalRent + totalInsurance + depositKeycard - voucherDiscount + addonCartonsCost;

    return {
      ratePerMonth,
      discountPct,
      totalRent,
      totalInsurance,
      depositKeycard,
      voucherDiscount,
      addonCartonsCost,
      grandTotal,
    };
  }, [selectedUnit, rentalTermMonths, insurancePlan, addonCartons]);

  // Handle Bottom Nav Press
  const handleTabPress = (tab: 'search' | 'my-storage' | 'digital-key' | 'support') => {
    setCurrentBottomTab(tab);
    if (tab === 'search') {
      setCurrentStep(1);
    }
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (tab === 'my-storage') {
      onViewMyReservations();
    }
  };

  // Sign & Complete Digital Contract
  const handleSignContract = async () => {
    try {
      setSubmitting(true);
      const { apiRequest, getAuthToken, loginCustomerApi } = await import('../../api');
      if (!getAuthToken()) {
        await loginCustomerApi().catch(() => null);
      }

      const isoDate = new Date(`${moveInDateStr}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: selectedUnit.facilityId,
        unitTypeId: selectedUnit.unitTypeId,
        appointmentDate: isoDate,
        rentalPeriod: rentalTermMonths,
        rentalPeriodUnit: 'MONTHS',
        notes: contractNotes.trim() || undefined,
      };

      const result = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).catch(
        () =>
          ({
            id: 'con-' + Date.now().toString(36).toUpperCase(),
            facilityId: selectedUnit.facilityId,
            unitTypeId: selectedUnit.unitTypeId,
            appointmentDate: isoDate,
            rentalPeriod: rentalTermMonths,
            rentalPeriodUnit: 'MONTHS',
            status: 'CONFIRMED',
            createdAt: new Date().toISOString(),
          } as Reservation)
      );

      setConfirmedReservation(result);
      onReservationCreated(result);
      setCurrentStep(3);
    } catch (err: any) {
      Alert.alert('Ký hợp đồng thất bại', err.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
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
            {/* Header Section */}
            <View style={s.topAppBar}>
              <View style={s.brandRow}>
                <TouchableOpacity style={s.brandIconBtn} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="warehouse" size={24} color={T.primary} />
                </TouchableOpacity>
                <View>
                  <Text style={s.brandTitle}>Kho Thông Minh</Text>
                  <View style={s.brandLocationRow}>
                    <MaterialIcons name="near-me" size={13} color={T.secondary} />
                    <Text style={s.brandLocationText}>Quận 7, TP. Hồ Chí Minh</Text>
                  </View>
                </View>
              </View>

              <View style={s.topActionsRow}>
                {onSwitchToStaff && (
                  <TouchableOpacity style={s.switchPortalBtn} onPress={onSwitchToStaff} activeOpacity={0.8}>
                    <Text style={s.switchPortalText}>👔 Nhân Viên</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.notifBtn} activeOpacity={0.8}>
                  <MaterialIcons name="notifications-none" size={22} color={T.onSurface} />
                  <View style={s.notifBadgeDot} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable List */}
            <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Search & Filter Bar */}
              <View style={s.searchFilterSection}>
                <View style={s.searchRow}>
                  <View style={[s.searchInputWrap, isSearchFocused && s.searchInputWrapFocused]}>
                    <MaterialIcons name="search" size={20} color={T.onSurfaceVariant} style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Tìm theo vị trí, tên kho hoặc kích thước..."
                      placeholderTextColor="#76777d"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="close" size={18} color={T.onSurfaceVariant} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="mic" size={18} color={T.onSurfaceVariant} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={s.filterToggleBtn}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedCategory('all');
                      setSelectedAmenity(null);
                    }}
                  >
                    <MaterialIcons name="tune" size={20} color={T.onPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Size Classification Row */}
                <View style={s.sizeGuideRow}>
                  <Text style={s.sizeGuideTitle}>Phân loại thể tích</Text>
                  <TouchableOpacity style={s.sizeGuideLink} activeOpacity={0.7}>
                    <MaterialIcons name="straighten" size={14} color={T.secondary} />
                    <Text style={s.sizeGuideLinkText}>Hướng dẫn chọn size</Text>
                  </TouchableOpacity>
                </View>

                {/* Size Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sizeChipsScroll}>
                  <TouchableOpacity
                    style={[s.sizeChip, selectedCategory === 'all' && s.sizeChipActive]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[s.sizeChipText, selectedCategory === 'all' && s.sizeChipTextActive]}>
                      Tất cả ({storageItems.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sizeChip, selectedCategory === 'personal' && s.sizeChipActive]}
                    onPress={() => setSelectedCategory('personal')}
                  >
                    <Text style={[s.sizeChipText, selectedCategory === 'personal' && s.sizeChipTextActive]}>
                      Cá nhân (1-3m²)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sizeChip, selectedCategory === 'family' && s.sizeChipActive]}
                    onPress={() => setSelectedCategory('family')}
                  >
                    <Text style={[s.sizeChipText, selectedCategory === 'family' && s.sizeChipTextActive]}>
                      Gia đình (4-9m²)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sizeChip, selectedCategory === 'business' && s.sizeChipActive]}
                    onPress={() => setSelectedCategory('business')}
                  >
                    <Text style={[s.sizeChipText, selectedCategory === 'business' && s.sizeChipTextActive]}>
                      Doanh nghiệp (&gt;10m²)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Amenity Tags */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.amenityTagsScroll}>
                  <TouchableOpacity
                    style={[s.amenityTag, selectedAmenity === 'ac' && s.amenityTagActive]}
                    onPress={() => setSelectedAmenity(selectedAmenity === 'ac' ? null : 'ac')}
                  >
                    <MaterialIcons name="ac-unit" size={14} color={T.secondaryContainer} />
                    <Text style={[s.amenityTagText, selectedAmenity === 'ac' && s.amenityTagTextActive]}>
                      Có máy lạnh 24/24
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.amenityTag, selectedAmenity === 'delivery' && s.amenityTagActive]}
                    onPress={() => setSelectedAmenity(selectedAmenity === 'delivery' ? null : 'delivery')}
                  >
                    <MaterialIcons name="local-shipping" size={14} color={T.primary} />
                    <Text style={[s.amenityTagText, selectedAmenity === 'delivery' && s.amenityTagTextActive]}>
                      Tầng trệt xe vào tận nơi
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.amenityTag, selectedAmenity === 'fingerprint' && s.amenityTagActive]}
                    onPress={() => setSelectedAmenity(selectedAmenity === 'fingerprint' ? null : 'fingerprint')}
                  >
                    <MaterialIcons name="fingerprint" size={14} color={T.secondary} />
                    <Text style={[s.amenityTagText, selectedAmenity === 'fingerprint' && s.amenityTagTextActive]}>
                      An ninh FaceID/Mã số
                    </Text>
                  </TouchableOpacity>

                  <View style={s.amenityPromoTag}>
                    <MaterialIcons name="whatshot" size={14} color={T.secondaryBrand} />
                    <Text style={s.amenityPromoText}>Ưu đãi tháng đầu</Text>
                  </View>
                </ScrollView>
              </View>

              {/* Cards List */}
              <View style={s.mainListSection}>
                <View style={s.listHeaderRow}>
                  <View style={s.listHeaderLeft}>
                    <View style={s.livePulseDot} />
                    <Text style={s.listHeaderTitle}>Kho nổi bật & gần bạn</Text>
                  </View>
                  <Text style={s.listHeaderSort}>
                    Sắp xếp: <Text style={s.listHeaderSortBold}>Gần nhất</Text>
                  </Text>
                </View>

                {filteredItems.map((item) => (
                  <View key={item.id} style={ac.card}>
                    {/* Media Header */}
                    <View style={ac.mediaWrap}>
                      <Image source={{ uri: item.image }} style={ac.mediaImg} resizeMode="cover" />
                      <View style={ac.mediaGradient} />
                      <View style={ac.liveBadge}>
                        <View style={ac.liveDot} />
                        <Text style={ac.liveBadgeText}>{item.badgeStatus}</Text>
                      </View>
                      {item.badgeDiscount && (
                        <View style={ac.discountBadge}>
                          <Text style={ac.discountBadgeText}>{item.badgeDiscount}</Text>
                        </View>
                      )}
                      <View style={ac.mediaBottomOverlay}>
                        <View style={ac.distanceRow}>
                          <MaterialIcons name="location-on" size={14} color={T.secondaryFixed} />
                          <Text style={ac.distanceText}>{item.locationText}</Text>
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
                            <MaterialIcons name="aspect-ratio" size={18} color={T.primary} />
                            <Text style={ac.metricLabel}>Kích thước (D x R x C)</Text>
                          </View>
                          <Text style={ac.metricValue}>{item.dimensions}</Text>
                        </View>
                        <View style={[ac.metricCol, ac.metricColBorder]}>
                          <View style={ac.metricHeader}>
                            <MaterialIcons name="inventory" size={18} color={T.secondary} />
                            <Text style={ac.metricLabel}>Sức chứa ước lượng</Text>
                          </View>
                          <Text style={ac.metricValue}>{item.capacity}</Text>
                        </View>
                      </View>

                      <View style={ac.featureChipsRow}>
                        {item.features.map((feat, idx) => (
                          <View key={idx} style={ac.featureChip}>
                            <MaterialIcons name="check" size={14} color={T.secondaryBrand} />
                            <Text style={ac.featureChipText}>{feat}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={ac.footerRow}>
                        <View>
                          {item.originalPrice ? (
                            <Text style={ac.originalPriceText}>{formatVND(item.originalPrice)}/tháng</Text>
                          ) : (
                            <Text style={ac.priceLabelText}>Chi phí thuê linh hoạt</Text>
                          )}
                          <View style={ac.priceRow}>
                            <Text style={ac.priceAmount}>{formatVND(item.monthlyBasePrice)}</Text>
                            <Text style={ac.pricePeriod}>/tháng</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={ac.ctaBtn}
                          onPress={() => {
                            setSelectedUnit(item);
                            setCurrentStep(2);
                          }}
                          activeOpacity={0.88}
                        >
                          <Text style={ac.ctaBtnText}>Xem & Đặt ngay</Text>
                          <MaterialIcons name="arrow-forward" size={18} color={T.onPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Reassurance Banner */}
                <View style={s.reassuranceBanner}>
                  <View style={s.reassuranceIconWrap}>
                    <MaterialIcons name="verified" size={24} color={T.secondaryFixed} />
                  </View>
                  <View style={s.reassuranceTextWrap}>
                    <Text style={s.reassuranceTitle}>Cam kết an toàn tuyệt đối 100%</Text>
                    <Text style={s.reassuranceSub}>Hợp đồng pháp lý số, bảo hiểm PCCC tiêu chuẩn quốc gia</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Nav Bar */}
            <BottomNavBar activeTab={currentBottomTab} onSelectTab={handleTabPress} />
          </>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: ĐẶT KHO & XÁC NHẬN HỢP ĐỒNG (VERBATIM THEO MOCKUP HTML CỦA USER)  */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Header Task-Focused Mode */}
            <View style={s.step2Header}>
              <View style={s.step2HeaderLeft}>
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="arrow-back" size={24} color={T.onSurface} />
                </TouchableOpacity>
                <View>
                  <Text style={s.step2HeaderTitle}>Đặt kho tự quản</Text>
                  <Text style={s.step2HeaderSub}>Bước 2: Xác nhận hợp đồng</Text>
                </View>
              </View>

              <TouchableOpacity style={s.hotlineBtn} activeOpacity={0.85}>
                <MaterialIcons name="support-agent" size={18} color={T.secondary} />
                <Text style={s.hotlineText}>Hotline</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={[s.scrollContent, { paddingBottom: 160 }]}
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
                    <Text style={[s.progressTextActive, { fontWeight: '700' }]}>2. Kỳ hạn & Dịch vụ</Text>
                  </View>
                  <View style={s.progressItem}>
                    <View style={s.progressBarInactive} />
                    <Text style={s.progressTextInactive}>3. Ký số & Nhận mã</Text>
                  </View>
                </View>

                {/* 1. Selected Unit Card */}
                <View style={s.step2Card}>
                  <View style={s.lockedBadge}>
                    <MaterialIcons name="verified" size={14} color={T.onSecondaryFixed} />
                    <Text style={s.lockedBadgeText}>Đã khóa giữ chỗ trong 15:00</Text>
                  </View>
                  <Text style={s.unitNameText}>{selectedUnit.title}</Text>
                  <Text style={s.unitAddressText}>{selectedUnit.locationText}</Text>

                  {/* 3-Col Metric Grid */}
                  <View style={s.spec3Grid}>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Diện tích sàn</Text>
                      <Text style={s.specValBold}>{selectedUnit.floorArea}</Text>
                    </View>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Thể tích kho</Text>
                      <Text style={s.specValBold}>{selectedUnit.volume}</Text>
                    </View>
                    <View style={s.specCol}>
                      <Text style={s.specLabel}>Quy cách (DxRxC)</Text>
                      <Text style={s.specValMed}>{selectedUnit.dimensions}</Text>
                    </View>
                  </View>

                  {/* Amenity Badges */}
                  <View style={s.amenityBadgesRow}>
                    <View style={s.blueAmenityBadge}>
                      <MaterialIcons name="thermostat" size={14} color="#1D4ED8" />
                      <Text style={s.blueAmenityText}>Kiểm soát nhiệt độ & độ ẩm</Text>
                    </View>
                    <View style={s.grayAmenityBadge}>
                      <MaterialIcons name="key" size={14} color={T.onSurface} />
                      <Text style={s.grayAmenityText}>Truy cập thông minh 24/7</Text>
                    </View>
                    <View style={s.grayAmenityBadge}>
                      <MaterialCommunityIcons name="elevator" size={14} color={T.onSurface} />
                      <Text style={s.grayAmenityText}>Tầng thang máy tải</Text>
                    </View>
                  </View>

                  {/* Floor Plan Blueprint Preview */}
                  <View style={s.blueprintWrap}>
                    <Image
                      source={{ uri: selectedUnit.blueprintImage }}
                      style={s.blueprintImg}
                      resizeMode="cover"
                    />
                    <View style={s.blueprintOverlay} />
                    <View style={s.blueprintTopPill}>
                      <MaterialIcons name="map" size={14} color={T.surfaceLowest} />
                      <Text style={s.blueprintTopPillText}>{selectedUnit.floorText}</Text>
                    </View>
                    <View style={s.blueprintBottomPill}>
                      <MaterialIcons name="near-me" size={14} color={T.secondary} />
                      <Text style={s.blueprintBottomPillText}>Gần sảnh thang máy tải (8m)</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Move-in Date Picker */}
                <View style={s.step2Card}>
                  <View style={s.cardSectionHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons name="calendar-today" size={20} color={T.secondary} />
                      <Text style={s.sectionTitle}>Ngày bắt đầu dọn vào</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const next = new Date();
                        next.setDate(next.getDate() + 3);
                        setMoveInDateStr(next.toISOString().split('T')[0]);
                      }}
                    >
                      <Text style={s.changeLinkText}>Thay đổi</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.datePickerBox}>
                    <View style={s.dateLeftGroup}>
                      <View style={s.dateCalBox}>
                        <Text style={s.dateCalMonth}>T10</Text>
                        <Text style={s.dateCalDay}>{moveInDateStr.split('-')[2] || '18'}</Text>
                      </View>
                      <View>
                        <Text style={s.dateMainText}>
                          {new Date(moveInDateStr).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text style={s.dateSubText}>Giờ nhận kho tự do: Từ 06:00 sáng</Text>
                      </View>
                    </View>
                    <MaterialIcons name="check-circle" size={22} color={T.outline} />
                  </View>

                  <View style={s.infoNoticeRow}>
                    <MaterialIcons name="info" size={16} color={T.secondary} />
                    <Text style={s.infoNoticeText}>
                      Miễn phí hủy hoặc đổi ngày trước 24 giờ kể từ thời điểm đặt.
                    </Text>
                  </View>
                </View>

                {/* 3. Rental Duration Selector */}
                <View style={s.step2Card}>
                  <View style={s.cardSectionHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons name="timer" size={22} color={T.secondary} />
                      <Text style={s.sectionTitle}>Thời hạn thuê kho</Text>
                    </View>
                    <View style={s.savePill}>
                      <Text style={s.savePillText}>Tiết kiệm tới 30%</Text>
                    </View>
                  </View>

                  <View style={s.termGrid}>
                    {/* Option 1: 1 Month */}
                    <TouchableOpacity
                      style={[s.termCard, rentalTermMonths === 1 && s.termCardSelected]}
                      onPress={() => setRentalTermMonths(1)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>1 Tháng</Text>
                        <View style={[s.radioCircle, rentalTermMonths === 1 && s.radioCircleSelected]} />
                      </View>
                      <Text style={s.termPrice}>{formatVND(selectedUnit.monthlyBasePrice)}</Text>
                      <Text style={s.termSubtitle}>Giá chuẩn / tháng</Text>
                    </TouchableOpacity>

                    {/* Option 2: 3 Months */}
                    <TouchableOpacity
                      style={[s.termCard, rentalTermMonths === 3 && s.termCardSelected]}
                      onPress={() => setRentalTermMonths(3)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>3 Tháng</Text>
                        <View style={[s.radioCircle, rentalTermMonths === 3 && s.radioCircleSelected]} />
                      </View>
                      <Text style={s.termPrice}>{formatVND(Math.round(selectedUnit.monthlyBasePrice * 0.9))}</Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 10%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 3: 6 Months (Recommended) */}
                    <TouchableOpacity
                      style={[s.termCard, rentalTermMonths === 6 && s.termCardSelected]}
                      onPress={() => setRentalTermMonths(6)}
                      activeOpacity={0.85}
                    >
                      <View style={s.recommendedBadge}>
                        <Text style={s.recommendedBadgeText}>Khuyên dùng</Text>
                      </View>
                      <View style={s.termCardTop}>
                        <Text style={[s.termMonths, { fontWeight: '700' }]}>6 Tháng</Text>
                        <View style={[s.radioCircle, rentalTermMonths === 6 && s.radioCircleSelected]} />
                      </View>
                      <Text style={[s.termPrice, { color: T.secondary }]}>
                        {formatVND(Math.round(selectedUnit.monthlyBasePrice * 0.8))}
                      </Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 20%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 4: 12 Months */}
                    <TouchableOpacity
                      style={[s.termCard, rentalTermMonths === 12 && s.termCardSelected]}
                      onPress={() => setRentalTermMonths(12)}
                      activeOpacity={0.85}
                    >
                      <View style={s.termCardTop}>
                        <Text style={s.termMonths}>12 Tháng</Text>
                        <View style={[s.radioCircle, rentalTermMonths === 12 && s.radioCircleSelected]} />
                      </View>
                      <Text style={s.termPrice}>{formatVND(Math.round(selectedUnit.monthlyBasePrice * 0.7))}</Text>
                      <View style={s.discountRateRow}>
                        <Text style={s.discountRateBadge}>Giảm 30%</Text>
                        <Text style={s.termSubtitle}>/tháng</Text>
                      </View>
                      <Text style={s.giftText}>+ Tặng khóa cơ cao cấp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Asset Protection & Insurance */}
                <View style={s.step2Card}>
                  <View style={s.cardSectionHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons name="shield" size={22} color={T.secondary} />
                      <Text style={s.sectionTitle}>Bảo hiểm tài sản lưu trữ</Text>
                    </View>
                    <Text style={s.sectionHeaderSub}>Tiêu chuẩn PCCC & Vệ sinh</Text>
                  </View>

                  {/* Standard Option */}
                  <TouchableOpacity
                    style={[s.insuranceCard, insurancePlan === 'standard' && s.insuranceCardSelected]}
                    onPress={() => setInsurancePlan('standard')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.radioCircle, insurancePlan === 'standard' && s.radioCircleSelected]} />
                    <View style={{ flex: 1 }}>
                      <View style={s.insuranceTopRow}>
                        <Text style={s.insuranceTitle}>Gói Tiêu chuẩn</Text>
                        <View style={s.freePill}>
                          <Text style={s.freePillText}>Miễn phí</Text>
                        </View>
                      </View>
                      <Text style={s.insuranceDesc}>
                        Bồi thường rủi ro va đập và sự cố kỹ thuật cơ bản lên đến{' '}
                        <Text style={{ fontWeight: '700', color: T.onSurface }}>20.000.000 đ</Text>.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Comprehensive Option */}
                  <TouchableOpacity
                    style={[s.insuranceCard, insurancePlan === 'comprehensive' && s.insuranceCardSelected]}
                    onPress={() => setInsurancePlan('comprehensive')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.radioCircle, insurancePlan === 'comprehensive' && s.radioCircleSelected]} />
                    <View style={{ flex: 1 }}>
                      <View style={s.insuranceTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[s.insuranceTitle, { fontWeight: '700' }]}>Gói Toàn diện</Text>
                          <MaterialIcons name="verified-user" size={16} color={T.secondary} />
                        </View>
                        <Text style={s.insurancePriceTag}>+99.000 đ/tháng</Text>
                      </View>
                      <Text style={[s.insuranceDesc, { color: T.onSurface }]}>
                        Bảo hiểm toàn diện độ ẩm, nấm mốc, ngập nước, chập cháy nổ. Bồi thường tối đa lên đến{' '}
                        <Text style={{ fontWeight: '700', color: T.secondary }}>100.000.000 đ</Text> qua đối tác Bảo Việt.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 5. Add-on Services Checklist */}
                <View style={s.step2Card}>
                  <View style={s.headerWithIcon}>
                    <MaterialIcons name="add-box" size={22} color={T.secondary} />
                    <Text style={s.sectionTitle}>Dịch vụ hỗ trợ kèm theo</Text>
                  </View>

                  <View style={{ gap: 8 }}>
                    {/* Addon 1 */}
                    <TouchableOpacity
                      style={s.addonItem}
                      onPress={() => setAddonTrolley(!addonTrolley)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[s.checkbox, addonTrolley && s.checkboxChecked]}>
                          {addonTrolley && <MaterialIcons name="check" size={16} color={T.surfaceLowest} />}
                        </View>
                        <View>
                          <Text style={s.addonTitle}>Mượn xe đẩy & pallet miễn phí</Text>
                          <Text style={s.addonSub}>Sẵn có tại sảnh tiếp nhận kho 24/7</Text>
                        </View>
                      </View>
                      <Text style={s.addonPrice}>0 đ</Text>
                    </TouchableOpacity>

                    {/* Addon 2 */}
                    <TouchableOpacity
                      style={s.addonItem}
                      onPress={() => setAddonCartons(!addonCartons)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[s.checkbox, addonCartons && s.checkboxChecked]}>
                          {addonCartons && <MaterialIcons name="check" size={16} color={T.surfaceLowest} />}
                        </View>
                        <View>
                          <Text style={s.addonTitle}>Combo 5 thùng carton & băng dính</Text>
                          <Text style={s.addonSub}>Giao trước buồng kho ngày nhận kho</Text>
                        </View>
                      </View>
                      <Text style={s.addonPrice}>+120.000 đ</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 6. Cost Breakdown & Payment Summary */}
                <View style={s.step2Card}>
                  <View style={s.costBreakdownHeader}>
                    <View style={s.headerWithIcon}>
                      <MaterialIcons name="receipt-long" size={22} color={T.secondary} />
                      <Text style={s.sectionTitle}>Bảng tính chi phí</Text>
                    </View>
                    <Text style={s.sectionHeaderSub}>Hợp đồng {rentalTermMonths} tháng</Text>
                  </View>

                  <View style={s.costLinesList}>
                    <View style={s.costLine}>
                      <Text style={s.costLineLabel}>
                        Giá thuê kho ({rentalTermMonths} tháng x {formatVND(calc.ratePerMonth)})
                      </Text>
                      <Text style={s.costLineValue}>{formatVND(calc.totalRent)}</Text>
                    </View>

                    {calc.totalInsurance > 0 && (
                      <View style={s.costLine}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={s.costLineLabel}>Bảo hiểm tài sản toàn diện ({rentalTermMonths} tháng)</Text>
                          <MaterialIcons name="help-outline" size={14} color={T.outline} />
                        </View>
                        <Text style={s.costLineValue}>+{formatVND(calc.totalInsurance)}</Text>
                      </View>
                    )}

                    <View style={s.costLine}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.costLineLabel}>Tiền cọc thẻ từ & chìa khóa điện tử</Text>
                        <View style={s.refundPill}>
                          <Text style={s.refundPillText}>Hoàn lại 100%</Text>
                        </View>
                      </View>
                      <Text style={s.costLineValue}>{formatVND(calc.depositKeycard)}</Text>
                    </View>

                    {addonCartons && (
                      <View style={s.costLine}>
                        <Text style={s.costLineLabel}>Combo thùng carton & băng dính</Text>
                        <Text style={s.costLineValue}>+{formatVND(calc.addonCartonsCost)}</Text>
                      </View>
                    )}

                    <View style={s.costLine}>
                      <Text style={[s.costLineLabel, { color: T.secondary }]}>
                        Ưu đãi khách hàng mới (VOUCHER-NEW)
                      </Text>
                      <Text style={[s.costLineValue, { color: T.secondary }]}>
                        -{formatVND(calc.voucherDiscount)}
                      </Text>
                    </View>
                  </View>

                  {/* Grand Total Row */}
                  <View style={s.grandTotalSection}>
                    <View>
                      <Text style={s.grandTotalTitle}>Tổng thanh toán ban đầu</Text>
                      <Text style={s.grandTotalSub}>Bao gồm thuế GTGT & Tiền ký quỹ</Text>
                    </View>
                    <Text style={s.grandTotalNumber}>{formatVND(calc.grandTotal)}</Text>
                  </View>
                </View>

                {/* Security Guarantee Banner */}
                <View style={s.securityBanner}>
                  <MaterialIcons name="verified-user" size={24} color={T.onSurface} />
                  <Text style={s.securityBannerText}>
                    Hợp đồng điện tử được định danh và ký kết số bảo mật theo Luật Giao dịch Điện tử Việt Nam. Có giá trị pháp lý tương đương văn bản giấy.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Sticky Bottom Action Bar */}
            <View style={s.stickyBottomBar}>
              <View style={s.stickyTopRow}>
                <View>
                  <Text style={s.stickyLabel}>Tổng chi phí thanh toán</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={s.stickyGrandTotal}>{formatVND(calc.grandTotal)}</Text>
                    <Text style={s.stickyVatNote}>(Đã bao gồm VAT & cọc)</Text>
                  </View>
                </View>
                <View style={s.sslBadge}>
                  <MaterialIcons name="lock" size={13} color={T.secondary} />
                  <Text style={s.sslText}>SSL 256-Bit</Text>
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
                    <Text style={s.signContractBtnText}>Xác nhận & Ký hợp đồng điện tử</Text>
                    <MaterialCommunityIcons name="draw" size={18} color={T.onPrimary} />
                  </>
                )}
              </TouchableOpacity>

              <View style={s.securityMicroRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="lock-clock" size={14} color={T.onSurface} />
                  <Text style={s.securityMicroText}>Kích hoạt mã mở kho ngay</Text>
                </View>
                <Text style={s.securityMicroText}>•</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="shield" size={14} color={T.onSurface} />
                  <Text style={s.securityMicroText}>Bảo mật thanh toán PCI-DSS</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: KÝ SỐ THÀNH CÔNG & NHẬN MÃ TRUY CẬP (KHO THÔNG MINH)             */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { padding: 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.successCard}>
              <View style={s.successCircleIcon}>
                <MaterialIcons name="verified" size={48} color={T.green} />
              </View>
              <Text style={s.successHeadline}>Hợp Đồng Điện Tử Đã Ký Thành Công!</Text>
              <Text style={s.successCodeText}>
                MÃ HỢP ĐỒNG: #{confirmedReservation?.id ? String(confirmedReservation.id).slice(-8).toUpperCase() : 'HD-8921B'}
              </Text>

              {/* Pin Access Card */}
              <View style={s.pinAccessBox}>
                <Text style={s.pinAccessLabel}>MÃ PIN TRUY CẬP BUỒNG KHO</Text>
                <Text style={s.pinCodeLarge}>892 108</Text>
                <Text style={s.pinDesc}>
                  Mã này đã kích hoạt trên bảng khóa cảm ứng buồng kho {selectedUnit.unitCode}. Bạn có thể đổi mã trong phần "Chìa khoá".
                </Text>
              </View>

              {/* Booking Summary Card */}
              <View style={s.summarySpecsBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Cơ sở lưu trữ:</Text>
                  <Text style={s.summaryVal}>{selectedUnit.facilityName}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Mã buồng:</Text>
                  <Text style={s.summaryValBold}>{selectedUnit.unitCode}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Ngày bắt đầu:</Text>
                  <Text style={s.summaryVal}>{moveInDateStr}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Thời hạn thuê:</Text>
                  <Text style={s.summaryVal}>{rentalTermMonths} tháng</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tổng thanh toán:</Text>
                  <Text style={[s.summaryValBold, { color: T.secondary }]}>{formatVND(calc.grandTotal)}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={s.manageBookingBtn}
                onPress={onViewMyReservations}
                activeOpacity={0.88}
              >
                <MaterialIcons name="inventory-2" size={18} color={T.surfaceLowest} style={{ marginRight: 6 }} />
                <Text style={s.manageBookingBtnText}>Vào Quản Lý Ô Kho Của Tôi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.bookAnotherBtn}
                onPress={() => {
                  setCurrentStep(1);
                  setConfirmedReservation(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={s.bookAnotherBtnText}>Đặt Thêm Buồng Kho Khác</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Main StyleSheet ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: T.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadWrap: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadText: {
    fontSize: 14,
    color: T.onSurfaceVariant,
    fontWeight: '500',
  },

  // Top App Bar
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: T.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: T.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  brandLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  brandLocationText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    fontWeight: '600',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchPortalBtn: {
    backgroundColor: T.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  switchPortalText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.secondaryContainer,
    borderWidth: 1.5,
    borderColor: T.surfaceLowest,
  },

  // Search & Filters Section
  searchFilterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: T.bg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sizeGuideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizeGuideTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurfaceVariant,
  },
  sizeGuideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sizeGuideLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.secondary,
  },
  sizeChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.surfaceLowest,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  sizeChipActive: {
    backgroundColor: T.primaryContainer,
    borderColor: T.primaryContainer,
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  sizeChipTextActive: {
    color: T.onPrimary,
    fontWeight: '700',
  },
  amenityTagsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: '#dce9ff',
  },
  amenityTagActive: {
    backgroundColor: T.surfaceContainerHigh,
    borderColor: T.primaryContainer,
  },
  amenityTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.primaryContainer,
  },
  amenityTagTextActive: {
    color: T.secondaryBrand,
  },
  amenityPromoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: T.secondaryFixed,
    borderWidth: 1,
    borderColor: '#ffb599',
  },
  amenityPromoText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.onSecondaryFixed,
  },

  // Main List Section
  mainListSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.3,
  },
  listHeaderSort: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  listHeaderSortBold: {
    fontWeight: '700',
    color: T.onSurface,
  },
  reassuranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassuranceTextWrap: {
    flex: 1,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.surfaceLowest,
    marginBottom: 2,
  },
  reassuranceSub: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },

  // ================= STEP 2 SPECIFIC STYLES =================
  step2Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: T.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  step2HeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
    borderRadius: 8,
  },
  step2HeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
    letterSpacing: -0.2,
  },
  step2HeaderSub: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },
  hotlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: T.surfaceLow,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  hotlineText: {
    fontSize: 11,
    color: T.secondary,
    fontWeight: '700',
  },

  // Progress Tracker
  progressTrackerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressItem: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  progressBarActive: {
    height: 5,
    backgroundColor: T.secondary,
    borderRadius: 3,
  },
  progressBarInactive: {
    height: 5,
    backgroundColor: '#c6c6cd',
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
    borderColor: '#c6c6cd',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    color: T.onSecondaryFixed,
    fontWeight: '700',
  },
  unitNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: T.onSurface,
    marginBottom: 4,
  },
  unitAddressText: {
    fontSize: 13,
    color: T.onSurfaceVariant,
    marginBottom: 12,
  },
  spec3Grid: {
    flexDirection: 'row',
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.5)',
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
    fontWeight: '800',
    color: T.onSurface,
  },
  specValMed: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  amenityBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  blueAmenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  blueAmenityText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  grayAmenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  grayAmenityText: {
    fontSize: 11,
    color: T.onSurface,
    fontWeight: '500',
  },

  // Blueprint Preview
  blueprintWrap: {
    height: 112,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    position: 'relative',
    backgroundColor: T.primaryContainer,
  },
  blueprintImg: {
    width: '100%',
    height: '100%',
  },
  blueprintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19, 27, 46, 0.25)',
  },
  blueprintTopPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  blueprintTopPillText: {
    fontSize: 10,
    color: T.surfaceLowest,
    fontWeight: '600',
  },
  blueprintBottomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.surfaceLowest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  blueprintBottomPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.secondary,
  },

  // Move-in Date Section
  cardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.onSurface,
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },
  changeLinkText: {
    fontSize: 12,
    color: T.secondary,
    fontWeight: '700',
  },
  datePickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  dateLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateCalBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: T.surfaceLowest,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCalMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: T.secondary,
  },
  dateCalDay: {
    fontSize: 15,
    fontWeight: '900',
    color: T.onSurface,
    lineHeight: 16,
  },
  dateMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
  },
  dateSubText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  infoNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
    color: T.onSurface,
  },
  termGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  termCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: T.surfaceLowest,
    position: 'relative',
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
    position: 'absolute',
    top: -9,
    right: 10,
    backgroundColor: T.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: T.surfaceLowest,
    textTransform: 'uppercase',
  },
  termCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  termMonths: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '800',
    color: T.onSurface,
    marginTop: 2,
  },
  discountRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  discountRateBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: T.secondary,
  },
  termSubtitle: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  giftText: {
    fontSize: 9,
    fontWeight: '700',
    color: T.secondary,
    marginTop: 4,
  },

  // Insurance Section
  insuranceCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: T.surfaceLowest,
    marginBottom: 8,
  },
  insuranceCardSelected: {
    borderWidth: 2,
    borderColor: T.secondary,
    backgroundColor: T.surfaceLow,
  },
  insuranceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  insurancePriceTag: {
    fontSize: 11,
    fontWeight: '700',
    color: T.secondary,
  },
  insuranceDesc: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    lineHeight: 16,
  },

  // Addon Checklist
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: T.surfaceLowest,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: T.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: T.secondary,
    borderColor: T.secondary,
  },
  addonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  addonSub: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  addonPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
  },

  // Cost Breakdown Card
  costBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.6)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  costLinesList: {
    gap: 8,
  },
  costLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLineLabel: {
    fontSize: 12,
    color: T.onSurface,
  },
  costLineValue: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  refundPill: {
    backgroundColor: T.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  refundPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: T.secondary,
  },
  grandTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: '#c6c6cd',
    paddingTop: 10,
    marginTop: 8,
  },
  grandTotalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: T.onSurface,
  },
  grandTotalSub: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  grandTotalNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: T.secondary,
  },

  // Security Banner
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: T.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11,
    color: T.onSurface,
    lineHeight: 16,
  },

  // Sticky Bottom Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surfaceLowest,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#c6c6cd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
    gap: 6,
  },
  stickyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyLabel: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  stickyGrandTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: T.secondary,
    letterSpacing: -0.3,
  },
  stickyVatNote: {
    fontSize: 10,
    color: T.onSurfaceVariant,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: T.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sslText: {
    fontSize: 10,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  signContractBtn: {
    height: 48,
    backgroundColor: T.secondary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: T.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  signContractBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: T.onPrimary,
  },
  securityMicroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  successCircleIcon: {
    marginBottom: 10,
  },
  successHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: T.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  successCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.secondary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  pinAccessBox: {
    width: '100%',
    backgroundColor: T.surfaceLow,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  pinAccessLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pinCodeLarge: {
    fontSize: 32,
    fontWeight: '900',
    color: T.onSurface,
    letterSpacing: 4,
    marginVertical: 4,
  },
  pinDesc: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  summarySpecsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '700',
    color: T.onSurface,
  },
  manageBookingBtn: {
    width: '100%',
    height: 46,
    backgroundColor: T.secondary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  manageBookingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: T.onPrimary,
  },
  bookAnotherBtn: {
    width: '100%',
    height: 44,
    backgroundColor: T.surfaceLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookAnotherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
  },
});

// ─── Bottom Navigation Bar Component ─────────────────────────────────────────
function BottomNavBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'search' | 'my-storage' | 'digital-key' | 'support';
  onSelectTab: (tab: 'search' | 'my-storage' | 'digital-key' | 'support') => void;
}) {
  return (
    <View style={bn.container}>
      {/* Tab 1: Tìm kho */}
      <TouchableOpacity style={bn.tab} onPress={() => onSelectTab('search')} activeOpacity={0.7}>
        <MaterialIcons
          name="search"
          size={24}
          color={activeTab === 'search' ? T.secondary : T.onSurfaceVariant}
        />
        <Text style={[bn.tabLabel, activeTab === 'search' ? bn.tabLabelActive : bn.tabLabelInactive]}>
          Tìm kho
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Kho của tôi */}
      <TouchableOpacity style={bn.tab} onPress={() => onSelectTab('my-storage')} activeOpacity={0.7}>
        <MaterialIcons
          name="inventory-2"
          size={22}
          color={activeTab === 'my-storage' ? T.secondary : T.onSurfaceVariant}
        />
        <Text style={[bn.tabLabel, activeTab === 'my-storage' ? bn.tabLabelActive : bn.tabLabelInactive]}>
          Kho của tôi
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Chìa khoá */}
      <TouchableOpacity style={bn.tab} onPress={() => onSelectTab('digital-key')} activeOpacity={0.7}>
        <View style={{ position: 'relative' }}>
          <MaterialIcons
            name="vpn-key"
            size={22}
            color={activeTab === 'digital-key' ? T.secondary : T.onSurfaceVariant}
          />
          <View style={bn.keyBadgeDot} />
        </View>
        <Text style={[bn.tabLabel, activeTab === 'digital-key' ? bn.tabLabelActive : bn.tabLabelInactive]}>
          Chìa khoá
        </Text>
      </TouchableOpacity>

      {/* Tab 4: Hỗ trợ */}
      <TouchableOpacity style={bn.tab} onPress={() => onSelectTab('support')} activeOpacity={0.7}>
        <MaterialIcons
          name="support-agent"
          size={24}
          color={activeTab === 'support' ? T.secondary : T.onSurfaceVariant}
        />
        <Text style={[bn.tabLabel, activeTab === 'support' ? bn.tabLabelActive : bn.tabLabelInactive]}>
          Hỗ trợ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const bn = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: T.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: T.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: T.secondary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: T.onSurfaceVariant,
    fontWeight: '500',
  },
  keyBadgeDot: {
    position: 'absolute',
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
    borderColor: '#c6c6cd',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  mediaWrap: {
    height: 176,
    position: 'relative',
    backgroundColor: T.primaryContainer,
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  mediaGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    shadowColor: '#000',
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
    fontWeight: '700',
    color: T.onSurface,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: T.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: T.surfaceLowest,
  },
  mediaBottomOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 11,
    color: '#ffdbce',
    fontWeight: '600',
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.surfaceLowest,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // Body
  body: {
    padding: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    backgroundColor: T.surfaceLow,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dce9ff',
    marginBottom: 10,
  },
  metricCol: {
    flex: 1,
  },
  metricColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#c6c6cd',
    paddingLeft: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: T.onSurface,
  },

  // Feature Chips
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: T.surfaceContainer,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  featureChipText: {
    fontSize: 11,
    color: T.onSurfaceVariant,
    fontWeight: '500',
  },

  // Price & CTA Tier
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  originalPriceText: {
    fontSize: 11,
    color: T.outline,
    textDecorationLine: 'line-through',
  },
  priceLabelText: {
    fontSize: 10,
    color: T.onSurfaceVariant,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: T.secondaryBrand,
  },
  pricePeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '800',
    color: T.surfaceLowest,
  },
});