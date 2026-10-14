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
  Modal,
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

interface StorageDisplayItem {
  id: string;
  facilityId: number | string;
  unitTypeId: number | string;
  facilityName: string;
  locationText: string;
  title: string;
  image: string;
  badgeStatus: string;
  badgeDiscount?: string;
  dimensions: string;
  capacity: string;
  features: string[];
  originalPrice?: number;
  price: number;
  category: 'personal' | 'family' | 'business';
  amenities: string[];
}

const DEFAULT_ITEMS: StorageDisplayItem[] = [
  {
    id: 'card-1',
    facilityId: 1,
    unitTypeId: 1,
    facilityName: 'Kho Lock & Go - Chi nhánh Nam Sài Gòn',
    locationText: 'Cách bạn 1.8 km - Q.7, TP.HCM',
    title: 'Kho Lock & Go - Chi nhánh Nam Sài Gòn',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDi7ffWEcZNkd9FUJVDq8FKYWhjOSmQblyG1Qj5TBeENSYs3J3O1s3QP4Fhed6n88cmTvHL3f4zr-hyHiqQM-2vTawgzuRvH2r1kfogAnBOeNDPErcFvdt6AnQ5le_X52cTvrRjrOuww6gKiByxYZ-uxN_y2YJObfnOV3QANbDKwbHQAxue3_NgpKVzVsocye92Ra5VoUuq7Nxtz80VPKv1uTtZGEbc_oMqBiQM2Itmz9ZmzfZNBqNT',
    badgeStatus: 'Còn 2 kho trống',
    badgeDiscount: '-15% Tháng đầu',
    dimensions: '3m x 2m x 2.8m (6m² / ~16.8m³)',
    capacity: '~35 thùng, 1 xe máy, sofa',
    features: ['Kiểm soát nhiệt độ 22-25°C', 'Camera CCTV riêng', 'Mở bằng App Bluetooth 24/7'],
    originalPrice: 1500000,
    price: 1250000,
    category: 'family',
    amenities: ['ac', 'delivery', 'bluetooth'],
  },
  {
    id: 'card-2',
    facilityId: 2,
    unitTypeId: 2,
    facilityName: 'Kho Mini Box - Tự quản cá nhân',
    locationText: 'Cách bạn 3.2 km - Nguyễn Thị Thập',
    title: 'Kho Mini Box - Tự quản cá nhân',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDxnmvNPLv63BiMwGIW-9lanBQwMIrgXxZRe5wEO4d4dSw4bROFK4ygtcnqN0WoSpnSFtfMbyQ9nPjp2xqG6K0qVIgazUz4NrG2e-bumqKV_7rZw3pKjrBTyw0LvOjf_rJfSBxHg6-rI7ecugYdTczs-Tlb-NZqE_C1Rc587_Kbyb2Ay0_oJSKqcJ5fn1ea1QdycUeE0mctFMyxWKdHMifzHcJT-_cqenMg9giBkW3UvdXtc8PVgNIV',
    badgeStatus: 'Còn 5 kho trống',
    dimensions: '1.5m x 1.5m x 2.5m (2.25m² / ~5.6m³)',
    capacity: '15 thùng đồ cá nhân, vali, hồ sơ',
    features: ['An ninh vân tay & Khóa số', 'Hút ẩm tự động', 'Bảo hiểm hàng hóa'],
    price: 590000,
    category: 'personal',
    amenities: ['ac', 'fingerprint'],
  },
  {
    id: 'card-3',
    facilityId: 1,
    unitTypeId: 3,
    facilityName: 'Kho Khoang Lớn - Hàng hóa Thương mại',
    locationText: 'Cách bạn 4.1 km - Huỳnh Tấn Phát',
    title: 'Kho Khoang Lớn - Hàng hóa Thương mại',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCLA1Ke608Wa7nLTLWaO7p5t81LnSmwa940rFscZ6Z4L3f-Pp8middo2YZK1W6oVddxHmnNb1RDFtWJwwhT8e-zMm2hy8LR5MrhRWCZp_sg9HESH46dbxMEYVjEKQDHq-MfcWj-Mf-3jf3tnSwaudoviAjQpouNIYKZ67hlz5e54G8erVTVGaupzg42umtoi6St-GjqyazYGGlpb1HyXUD3PoNslnnEQbPHJM4UGQ7cyJPPjb3HrSTZ',
    badgeStatus: 'Sắp hết - Còn 1 kho',
    dimensions: '4m x 4m (16m² / ~48m³)',
    capacity: 'Xe nâng & Cửa cuốn tự động',
    features: ['Xe tải đậu tận cửa', 'Bảo vệ tuần tra 24/7', 'Điện 3 pha riêng biệt'],
    price: 3200000,
    category: 'business',
    amenities: ['delivery'],
  },
];

const DURATION_OPTIONS = [
  { months: 1, label: '1 Tháng', discount: 0, tag: '' },
  { months: 3, label: '3 Tháng', discount: 5, tag: '-5%' },
  { months: 6, label: '6 Tháng', discount: 10, tag: '-10%' },
  { months: 12, label: '12 Tháng', discount: 15, tag: '-15%' },
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
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'personal' | 'family' | 'business'>('all');
  const [selectedAmenity, setSelectedAmenity] = useState<string | null>(null);

  // Active Bottom Tab
  const [currentBottomTab, setCurrentBottomTab] = useState<'search' | 'my-storage' | 'digital-key' | 'support'>(
    activeBottomTab
  );

  // Booking Modal States
  const [selectedItem, setSelectedItem] = useState<StorageDisplayItem | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [rentalPeriod, setRentalPeriod] = useState(1);
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const [appointmentDate, setAppointmentDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null);

  // Generate storage items
  const storageItems: StorageDisplayItem[] = useMemo(() => {
    if (facilities.length > 0 && unitTypes.length > 0) {
      const generated: StorageDisplayItem[] = [];
      facilities.forEach((fac, facIndex) => {
        unitTypes.forEach((ut, utIndex) => {
          const cat: 'personal' | 'family' | 'business' =
            ut.size && ut.size <= 3 ? 'personal' : ut.size && ut.size <= 9 ? 'family' : 'business';
          const mockRef = DEFAULT_ITEMS[(facIndex + utIndex) % DEFAULT_ITEMS.length];

          generated.push({
            id: `item-${fac.id}-${ut.id}`,
            facilityId: fac.id,
            unitTypeId: ut.id,
            facilityName: fac.name,
            locationText: fac.address || mockRef.locationText,
            title: `${ut.name} - ${fac.name}`,
            image: ut.image || fac.image || mockRef.image,
            badgeStatus: (ut as any).availableCount ? `Còn ${(ut as any).availableCount} kho trống` : mockRef.badgeStatus,
            badgeDiscount: utIndex === 0 ? '-15% Tháng đầu' : undefined,
            dimensions: (ut as any).dimensions || `${ut.size || 6}m² (D x R x C tiêu chuẩn)`,
            capacity: (ut as any).capacity || mockRef.capacity,
            features: (ut.features as string[]) || mockRef.features,
            originalPrice: utIndex === 0 ? Math.round(Number(ut.price) * 1.2) : undefined,
            price: Number(ut.price) || mockRef.price,
            category: cat,
            amenities: mockRef.amenities,
          });
        });
      });
      return generated;
    }
    return DEFAULT_ITEMS;
  }, [facilities, unitTypes]);

  // Filter items
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

  const handleTabPress = (tab: 'search' | 'my-storage' | 'digital-key' | 'support') => {
    setCurrentBottomTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (tab === 'my-storage') {
      onViewMyReservations();
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const { apiRequest } = await import('../../api');
      const isoDate = new Date(`${appointmentDate}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: Number(selectedItem.facilityId) || 1,
        unitTypeId: Number(selectedItem.unitTypeId) || 1,
        appointmentDate: isoDate,
        rentalPeriod: Number(rentalPeriod),
        rentalPeriodUnit: 'MONTHS',
        notes: notes.trim() || undefined,
      };

      const result = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).catch(
        () =>
          ({
            id: 'res-demo-' + Date.now(),
            facilityId: selectedItem.facilityId,
            unitTypeId: selectedItem.unitTypeId,
            appointmentDate: isoDate,
            rentalPeriod,
            rentalPeriodUnit: 'MONTHS',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          } as Reservation)
      );

      setShowBookingModal(false);
      setSuccessReservation(result);
      onReservationCreated(result);
    } catch (err: any) {
      Alert.alert('Đặt kho thất bại', err.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator color={T.secondaryContainer} size="large" />
        <Text style={s.loadText}>Đang tải dữ liệu kho tự quản...</Text>
      </View>
    );
  }

  return (
    <View style={s.outerWrapper}>
      <View style={s.mobileContainer}>
        {/* ==================== TOP APP BAR ==================== */}
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

        {/* ==================== MAIN CONTENT SCROLL ==================== */}
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ==================== SEARCH & SMART FILTERS ==================== */}
          <View style={s.searchFilterSection}>
            {/* Smart Search Bar */}
            <View style={s.searchRow}>
              <View style={[s.searchInputWrap, isSearchFocused && s.searchInputWrapFocused]}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color={T.onSurfaceVariant}
                  style={{ marginRight: 8 }}
                />
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
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={18} color={T.onSurfaceVariant} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="mic" size={18} color={T.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Advanced Filter Toggle Button */}
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

            {/* Size Classification Header & Guide Link */}
            <View style={s.sizeGuideRow}>
              <Text style={s.sizeGuideTitle}>Phân loại thể tích</Text>
              <TouchableOpacity style={s.sizeGuideLink} activeOpacity={0.7}>
                <MaterialIcons name="straighten" size={14} color={T.secondary} />
                <Text style={s.sizeGuideLinkText}>Hướng dẫn chọn size</Text>
              </TouchableOpacity>
            </View>

            {/* Size Filter Chips (Horizontal Scrollable Strip) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.sizeChipsScroll}
            >
              <TouchableOpacity
                style={[s.sizeChip, selectedCategory === 'all' && s.sizeChipActive]}
                onPress={() => setSelectedCategory('all')}
                activeOpacity={0.8}
              >
                <Text style={[s.sizeChipText, selectedCategory === 'all' && s.sizeChipTextActive]}>
                  Tất cả ({storageItems.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.sizeChip, selectedCategory === 'personal' && s.sizeChipActive]}
                onPress={() => setSelectedCategory('personal')}
                activeOpacity={0.8}
              >
                <Text style={[s.sizeChipText, selectedCategory === 'personal' && s.sizeChipTextActive]}>
                  Cá nhân (1-3m²)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.sizeChip, selectedCategory === 'family' && s.sizeChipActive]}
                onPress={() => setSelectedCategory('family')}
                activeOpacity={0.8}
              >
                <Text style={[s.sizeChipText, selectedCategory === 'family' && s.sizeChipTextActive]}>
                  Gia đình (4-9m²)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.sizeChip, selectedCategory === 'business' && s.sizeChipActive]}
                onPress={() => setSelectedCategory('business')}
                activeOpacity={0.8}
              >
                <Text style={[s.sizeChipText, selectedCategory === 'business' && s.sizeChipTextActive]}>
                  Doanh nghiệp (&gt;10m²)
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Rapid Amenity Tags Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.amenityTagsScroll}
            >
              <TouchableOpacity
                style={[s.amenityTag, selectedAmenity === 'ac' && s.amenityTagActive]}
                onPress={() => setSelectedAmenity(selectedAmenity === 'ac' ? null : 'ac')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="ac-unit" size={14} color={T.secondaryContainer} />
                <Text style={[s.amenityTagText, selectedAmenity === 'ac' && s.amenityTagTextActive]}>
                  Có máy lạnh 24/24
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.amenityTag, selectedAmenity === 'delivery' && s.amenityTagActive]}
                onPress={() => setSelectedAmenity(selectedAmenity === 'delivery' ? null : 'delivery')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="local-shipping" size={14} color={T.primary} />
                <Text style={[s.amenityTagText, selectedAmenity === 'delivery' && s.amenityTagTextActive]}>
                  Tầng trệt xe vào tận nơi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.amenityTag, selectedAmenity === 'fingerprint' && s.amenityTagActive]}
                onPress={() => setSelectedAmenity(selectedAmenity === 'fingerprint' ? null : 'fingerprint')}
                activeOpacity={0.8}
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

          {/* ==================== SUCCESS BANNER ==================== */}
          {successReservation && (
            <View style={s.successBox}>
              <View style={s.successBadge}>
                <Text style={s.successBadgeText}>ĐÃ XÁC NHẬN</Text>
              </View>
              <Text style={s.successTitle}>Đặt kho thành công!</Text>
              <Text style={s.successCode}>
                Mã đặt chỗ: #{String(successReservation.id).slice(-6).toUpperCase()}
              </Text>
              <Text style={s.successDesc}>
                Yêu cầu đặt kho của bạn đã được ghi nhận. Hệ thống sẽ cấp mã PIN tự động mở cửa vào ngày hẹn.
              </Text>
              <View style={s.successActions}>
                <TouchableOpacity
                  style={s.successPrimaryBtn}
                  onPress={onViewMyReservations}
                  activeOpacity={0.85}
                >
                  <Text style={s.successPrimaryText}>Xem đơn đặt chỗ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.successSecondaryBtn}
                  onPress={() => setSuccessReservation(null)}
                  activeOpacity={0.8}
                >
                  <Text style={s.successSecondaryText}>Đặt thêm kho</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ==================== STORAGE UNIT CARDS LIST ==================== */}
          <View style={s.mainListSection}>
            {/* Header Summary */}
            <View style={s.listHeaderRow}>
              <View style={s.listHeaderLeft}>
                <View style={s.livePulseDot} />
                <Text style={s.listHeaderTitle}>Kho nổi bật & gần bạn</Text>
              </View>
              <Text style={s.listHeaderSort}>
                Sắp xếp: <Text style={s.listHeaderSortBold}>Gần nhất</Text>
              </Text>
            </View>

            {/* Cards Loop */}
            {filteredItems.length === 0 ? (
              <View style={s.emptyWrap}>
                <MaterialCommunityIcons name="package-variant" size={40} color={T.outline} />
                <Text style={s.emptyTitle}>Không tìm thấy kho phù hợp</Text>
                <Text style={s.emptySub}>Thử thay đổi từ khóa hoặc bộ lọc thể tích kho.</Text>
                <TouchableOpacity
                  style={s.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedAmenity(null);
                  }}
                >
                  <Text style={s.resetFilterBtnText}>Đặt lại bộ lọc</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredItems.map((item) => (
                <ArticleStorageCard
                  key={item.id}
                  item={item}
                  onBookNow={() => {
                    setSelectedItem(item);
                    setShowBookingModal(true);
                  }}
                />
              ))
            )}

            {/* Tactical Reassurance Micro-banner */}
            <View style={s.reassuranceBanner}>
              <View style={s.reassuranceIconWrap}>
                <MaterialIcons name="verified" size={24} color={T.secondaryFixed} />
              </View>
              <View style={s.reassuranceTextWrap}>
                <Text style={s.reassuranceTitle}>Cam kết an toàn tuyệt đối 100%</Text>
                <Text style={s.reassuranceSub}>
                  Hợp đồng pháp lý số, bảo hiểm PCCC tiêu chuẩn quốc gia
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ==================== BOTTOM NAVIGATION BAR ==================== */}
        <BottomNavBar activeTab={currentBottomTab} onSelectTab={handleTabPress} />
      </View>

      {/* ==================== BOOKING MODAL SHEET ==================== */}
      {selectedItem && (
        <BookingDetailModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          item={selectedItem}
          rentalPeriod={rentalPeriod}
          setRentalPeriod={setRentalPeriod}
          appointmentDate={appointmentDate}
          setAppointmentDate={setAppointmentDate}
          notes={notes}
          setNotes={setNotes}
          onConfirm={handleConfirmReservation}
          submitting={submitting}
        />
      )}
    </View>
  );
}

// ─── Article Storage Card Component ─────────────────────────────────────────
function ArticleStorageCard({
  item,
  onBookNow,
}: {
  item: StorageDisplayItem;
  onBookNow: () => void;
}) {
  const isAmber = item.badgeStatus.includes('Sắp hết');

  return (
    <View style={ac.card}>
      {/* Media Header & Dynamic Badges */}
      <View style={ac.mediaWrap}>
        <Image source={{ uri: item.image }} style={ac.mediaImg} resizeMode="cover" />
        <View style={ac.mediaGradient} />

        {/* Live Availability Badge */}
        <View style={ac.liveBadge}>
          <View style={[ac.liveDot, isAmber && { backgroundColor: T.amber }]} />
          <Text style={ac.liveBadgeText}>{item.badgeStatus}</Text>
        </View>

        {/* Discount Badge */}
        {item.badgeDiscount && (
          <View style={ac.discountBadge}>
            <Text style={ac.discountBadgeText}>{item.badgeDiscount}</Text>
          </View>
        )}

        {/* Distance & Title Overlay */}
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

      {/* Unit Metrics & Body */}
      <View style={ac.body}>
        {/* Dimensions Metric Pill Grid */}
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

        {/* Facility Feature Chips */}
        <View style={ac.featureChipsRow}>
          {item.features.map((feat, idx) => {
            const isTemp = feat.includes('nhiệt độ');
            const isBlue = feat.includes('Bluetooth');
            const isCam = feat.includes('Camera');

            return (
              <View key={idx} style={ac.featureChip}>
                {isTemp ? (
                  <MaterialIcons name="device-thermostat" size={14} color="#2563eb" />
                ) : isCam ? (
                  <MaterialIcons name="videocam" size={14} color={T.onSurface} />
                ) : isBlue ? (
                  <MaterialIcons name="bluetooth" size={14} color={T.secondary} />
                ) : (
                  <MaterialIcons name="check" size={14} color={T.secondaryBrand} />
                )}
                <Text style={ac.featureChipText}>{feat}</Text>
              </View>
            );
          })}
        </View>

        {/* Price and CTA Conversion Tier */}
        <View style={ac.footerRow}>
          <View>
            {item.originalPrice ? (
              <Text style={ac.originalPriceText}>{formatVND(item.originalPrice)}/tháng</Text>
            ) : (
              <Text style={ac.priceLabelText}>Chi phí thuê linh hoạt</Text>
            )}
            <View style={ac.priceRow}>
              <Text style={ac.priceAmount}>{formatVND(item.price)}</Text>
              <Text style={ac.pricePeriod}>/tháng</Text>
            </View>
          </View>

          <TouchableOpacity style={ac.ctaBtn} onPress={onBookNow} activeOpacity={0.88}>
            <Text style={ac.ctaBtnText}>Xem & Đặt ngay</Text>
            <MaterialIcons name="arrow-forward" size={18} color={T.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab('search')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="search"
          size={24}
          color={activeTab === 'search' ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === 'search' ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Tìm kho
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Kho của tôi */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab('my-storage')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="inventory-2"
          size={22}
          color={activeTab === 'my-storage' ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === 'my-storage' ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Kho của tôi
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Chìa khoá */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab('digital-key')}
        activeOpacity={0.7}
      >
        <View style={{ position: 'relative' }}>
          <MaterialIcons
            name="vpn-key"
            size={22}
            color={activeTab === 'digital-key' ? T.secondary : T.onSurfaceVariant}
          />
          <View style={bn.keyBadgeDot} />
        </View>
        <Text
          style={[
            bn.tabLabel,
            activeTab === 'digital-key' ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Chìa khoá
        </Text>
      </TouchableOpacity>

      {/* Tab 4: Hỗ trợ */}
      <TouchableOpacity
        style={bn.tab}
        onPress={() => onSelectTab('support')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="support-agent"
          size={24}
          color={activeTab === 'support' ? T.secondary : T.onSurfaceVariant}
        />
        <Text
          style={[
            bn.tabLabel,
            activeTab === 'support' ? bn.tabLabelActive : bn.tabLabelInactive,
          ]}
        >
          Hỗ trợ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Booking Detail Modal ───────────────────────────────────────────────────
function BookingDetailModal({
  visible,
  onClose,
  item,
  rentalPeriod,
  setRentalPeriod,
  appointmentDate,
  setAppointmentDate,
  notes,
  setNotes,
  onConfirm,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  item: StorageDisplayItem;
  rentalPeriod: number;
  setRentalPeriod: (n: number) => void;
  appointmentDate: string;
  setAppointmentDate: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const opt = DURATION_OPTIONS.find((d) => d.months === rentalPeriod) || DURATION_OPTIONS[0];
  const baseCost = item.price * rentalPeriod;
  const discountAmount = Math.round(baseCost * (opt.discount / 100));
  const deposit = item.price;
  const total = baseCost - discountAmount + deposit;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={bm.backdrop}>
        <View style={bm.sheet}>
          {/* Header */}
          <View style={bm.header}>
            <View>
              <Text style={bm.headerOverline}>XÁC NHẬN THUÊ KHO</Text>
              <Text style={bm.headerTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <TouchableOpacity style={bm.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={18} color={T.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={bm.body} showsVerticalScrollIndicator={false}>
            {/* Quick Summary Pill */}
            <View style={bm.summaryPill}>
              <Image source={{ uri: item.image }} style={bm.summaryThumb} />
              <View style={{ flex: 1 }}>
                <Text style={bm.summaryFacility}>{item.facilityName}</Text>
                <Text style={bm.summaryDim}>{item.dimensions}</Text>
                <Text style={bm.summaryPrice}>{formatVND(item.price)}/tháng</Text>
              </View>
            </View>

            {/* Select Duration */}
            <Text style={bm.sectionLabel}>Chọn kỳ hạn thuê:</Text>
            <View style={bm.durGrid}>
              {DURATION_OPTIONS.map((d) => {
                const active = rentalPeriod === d.months;
                return (
                  <TouchableOpacity
                    key={d.months}
                    style={[bm.durCard, active && bm.durCardActive]}
                    onPress={() => setRentalPeriod(d.months)}
                    activeOpacity={0.8}
                  >
                    <Text style={[bm.durTitle, active && bm.durTitleActive]}>{d.label}</Text>
                    {d.discount > 0 ? (
                      <Text style={[bm.durDiscount, active && bm.durDiscountActive]}>{d.tag}</Text>
                    ) : (
                      <Text style={bm.durRegular}>Chuẩn</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Appointment Date */}
            <Text style={bm.sectionLabel}>Ngày hẹn nhận kho:</Text>
            <TextInput
              style={bm.input}
              value={appointmentDate}
              onChangeText={setAppointmentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={T.outline}
            />

            {/* Notes */}
            <Text style={bm.sectionLabel}>Ghi chú (Tùy chọn):</Text>
            <TextInput
              style={bm.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Hỗ trợ xe tải, giờ đến dự kiến..."
              placeholderTextColor={T.outline}
              multiline
              numberOfLines={2}
            />

            {/* Cost Breakdown */}
            <View style={bm.costCard}>
              <Text style={bm.costTitle}>Chi tiết thanh toán</Text>
              <View style={bm.costRow}>
                <Text style={bm.costLabel}>Phí thuê ({rentalPeriod} tháng)</Text>
                <Text style={bm.costVal}>{formatVND(baseCost)}</Text>
              </View>
              {opt.discount > 0 && (
                <View style={bm.costRow}>
                  <Text style={[bm.costLabel, { color: T.secondaryBrand }]}>
                    Chiết khấu kỳ hạn ({opt.discount}%)
                  </Text>
                  <Text style={[bm.costVal, { color: T.secondaryBrand }]}>
                    -{formatVND(discountAmount)}
                  </Text>
                </View>
              )}
              <View style={bm.costRow}>
                <Text style={bm.costLabel}>Tiền đặt cọc (Hoàn 100%)</Text>
                <Text style={bm.costVal}>{formatVND(deposit)}</Text>
              </View>
              <View style={bm.costDivider} />
              <View style={bm.totalRow}>
                <Text style={bm.totalLabel}>Tổng thanh toán ban đầu:</Text>
                <Text style={bm.totalVal}>{formatVND(total)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={bm.footer}>
            <TouchableOpacity style={bm.cancelBtn} onPress={onClose}>
              <Text style={bm.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bm.confirmBtn, submitting && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color={T.surfaceLowest} size="small" />
              ) : (
                <Text style={bm.confirmBtnText}>Xác nhận đặt ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

  // Search & Filters
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

  // Size Guide Row
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

  // Size Chips Scroll
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

  // Amenity Tags Scroll
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

  // Empty Wrap
  emptyWrap: {
    padding: 32,
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.onSurface, marginTop: 8 },
  emptySub: { fontSize: 12, color: T.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  resetFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.primaryContainer,
  },
  resetFilterBtnText: { color: T.onPrimary, fontSize: 12, fontWeight: '600' },

  // Reassurance Micro-banner
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

  // Success Box
  successBox: {
    margin: 16,
    padding: 20,
    backgroundColor: T.surfaceLowest,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  successBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  successBadgeText: { fontSize: 10, fontWeight: '800', color: T.blue },
  successTitle: { fontSize: 18, fontWeight: '800', color: T.onSurface, marginBottom: 4 },
  successCode: { fontSize: 12, fontWeight: '600', color: T.onSurfaceVariant, marginBottom: 10 },
  successDesc: { fontSize: 12, color: T.onSurfaceVariant, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  successActions: { flexDirection: 'row', gap: 10, width: '100%' },
  successPrimaryBtn: {
    flex: 1,
    backgroundColor: T.secondaryContainer,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  successPrimaryText: { color: T.surfaceLowest, fontSize: 13, fontWeight: '700' },
  successSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  successSecondaryText: { color: T.onSurface, fontSize: 13, fontWeight: '600' },
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

// ─── Bottom Navigation Bar Styles ───────────────────────────────────────────
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

// ─── Modal Styles ──────────────────────────────────────────────────────────
const bm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.surfaceLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: T.secondaryBrand,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.onSurface,
    maxWidth: 260,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 16,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surfaceLow,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dce9ff',
    marginBottom: 16,
  },
  summaryThumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  summaryFacility: {
    fontSize: 11,
    color: T.onSurfaceVariant,
  },
  summaryDim: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
    marginTop: 1,
  },
  summaryPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: T.secondaryBrand,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
    marginBottom: 8,
  },
  durGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  durCardActive: {
    backgroundColor: '#fff7ed',
    borderColor: T.secondaryBrand,
    borderWidth: 1.5,
  },
  durTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
  },
  durTitleActive: {
    color: T.secondaryBrand,
  },
  durDiscount: {
    fontSize: 10,
    fontWeight: '700',
    color: T.secondaryBrand,
    marginTop: 2,
  },
  durDiscountActive: {
    color: T.secondaryBrand,
  },
  durRegular: {
    fontSize: 10,
    color: T.outline,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: T.onSurface,
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    fontSize: 12,
    color: T.onSurface,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  costCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  costTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.onSurface,
    marginBottom: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  costLabel: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  costVal: {
    fontSize: 12,
    fontWeight: '600',
    color: T.onSurface,
  },
  costDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurface,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: T.secondaryBrand,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: T.secondaryContainer,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.surfaceLowest,
  },
});