import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import {
  apiRequest,
  setAuthToken,
  Facility,
  UnitType,
  Reservation,
} from './src/api';

const { width } = Dimensions.get('window');

// High-quality imagery matching the web platform & real storage facility
const DEFAULT_FACILITY_IMAGES = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1200&q=80',
];

const DEFAULT_UNIT_IMAGES: Record<string, string> = {
  mini: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
  medium: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80',
  large: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80',
  climate: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=800&q=80',
};

// Facility amenity gallery items matching web
const FACILITY_AMENITIES = [
  {
    title: 'Khóa cửa bảo mật Smart PIN 24/7',
    image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Sảnh bốc xếp hàng xe tải vào tận nơi',
    image: 'https://images.unsplash.com/photo-1586528116480-1a74d75dca26?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Thang máy hàng tải trọng lớn 2 tấn',
    image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Hệ thống hút ẩm & máy lạnh 24/7',
    image: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=600&q=80',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'book' | 'my_reservations'>('book');
  const [step, setStep] = useState<number>(1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [rentalPeriod, setRentalPeriod] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const [appointmentDate, setAppointmentDate] = useState<string>(
    defaultDate.toISOString().split('T')[0]
  );

  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState<boolean>(false);
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const getUnitImage = (name: string = '', index: number = 0) => {
    const lower = name.toLowerCase();
    if (lower.includes('mát') || lower.includes('climate') || lower.includes('nhiệt')) {
      return DEFAULT_UNIT_IMAGES.climate;
    }
    if (lower.includes('mini') || lower.includes('nhỏ') || lower.includes('2m') || lower.includes('4.9')) {
      return DEFAULT_UNIT_IMAGES.mini;
    }
    if (lower.includes('vừa') || lower.includes('medium') || lower.includes('5m') || lower.includes('9')) {
      return DEFAULT_UNIT_IMAGES.medium;
    }
    if (lower.includes('lớn') || lower.includes('large') || lower.includes('10m') || lower.includes('14.5') || lower.includes('kinh doanh')) {
      return DEFAULT_UNIT_IMAGES.large;
    }
    const keys = Object.values(DEFAULT_UNIT_IMAGES);
    return keys[index % keys.length];
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [facData, utData] = await Promise.all([
        apiRequest<any[]>('/facilities').catch(() => null),
        apiRequest<any[]>('/storage-unit-types').catch(() => null),
      ]);

      const resolvedFacilities: Facility[] = (Array.isArray(facData) && facData.length > 0)
        ? facData.map((f, i) => ({
            ...f,
            image: (Array.isArray(f.images) && f.images[0]) || f.imageUrl || f.image || DEFAULT_FACILITY_IMAGES[i % DEFAULT_FACILITY_IMAGES.length],
            rating: 4.9,
          }))
        : [
            {
              id: 'fac-1',
              name: 'SelfStorage Quận 1 (Central Hub)',
              code: 'SS-Q1',
              address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM',
              status: 'ACTIVE',
              image: DEFAULT_FACILITY_IMAGES[0],
              rating: 4.9,
            },
            {
              id: 'fac-2',
              name: 'SelfStorage Thủ Đức (Khu Công Nghệ)',
              code: 'SS-TD',
              address: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
              status: 'ACTIVE',
              image: DEFAULT_FACILITY_IMAGES[1],
              rating: 4.8,
            },
            {
              id: 'fac-3',
              name: 'SelfStorage Quận 7 (Phú Mỹ Hưng)',
              code: 'SS-Q7',
              address: '789 Nguyễn Văn Linh, Tân Phong, Quận 7, TP.HCM',
              status: 'ACTIVE',
              image: DEFAULT_FACILITY_IMAGES[2],
              rating: 5.0,
            },
          ];

      const resolvedUnitTypes: UnitType[] = (Array.isArray(utData) && utData.length > 0)
        ? utData.map((ut, i) => ({
            ...ut,
            price: ut.price ?? ut.monthlyRent ?? ut.pricePerMonth ?? 1200000,
            depositAmount: ut.depositAmount ?? ut.price ?? 1200000,
            image: (Array.isArray(ut.images) && ut.images[0]) || ut.imageUrl || ut.image || getUnitImage(ut.name, i),
            features: [
              'Khóa điện tử Smart Lock PIN 24/7',
              'Máy lạnh & Hút ẩm tiêu chuẩn',
              'Camera AI giám sát an ninh',
              'Bảo hiểm hàng hóa miễn phí',
            ],
            dimensions: `${ut.size || 5}${ut.sizeUnit || 'm²'} (Cao 2.8m)`,
          }))
        : [
            {
              id: 'ut-1',
              name: 'Kho Cá Nhân Mini (Box 4.9m²)',
              code: 'UT-MINI',
              size: 4.9,
              sizeUnit: 'm²',
              price: 890000,
              depositAmount: 890000,
              description: 'Chứa được 15-20 thùng carton, vali du lịch, tài liệu hoặc đồ đạc sinh viên.',
              status: 'ACTIVE',
              image: DEFAULT_UNIT_IMAGES.mini,
              dimensions: 'Dài 2.1m x Rộng 2.3m x Cao 2.8m',
              features: ['Khóa Smart Lock PIN cá nhân', 'Máy hút ẩm chống mốc', 'Phù hợp 20 thùng đồ'],
            },
            {
              id: 'ut-2',
              name: 'Kho Gia Đình Tiêu Chuẩn (Box 9.0m²)',
              code: 'UT-MED',
              size: 9.0,
              sizeUnit: 'm²',
              price: 1690000,
              depositAmount: 1690000,
              description: 'Lý tưởng dọn nhà, chứa trọn bộ bàn ghế, sofa, tủ lạnh, nệm và máy giặt.',
              status: 'ACTIVE',
              image: DEFAULT_UNIT_IMAGES.medium,
              dimensions: 'Dài 3.0m x Rộng 3.0m x Cao 2.8m',
              features: ['Đầy đủ nội thất căn hộ 1-2PN', 'Điều hòa không khí 24/7', 'Xe đẩy bốc xếp miễn phí'],
            },
            {
              id: 'ut-3',
              name: 'Kho Doanh Nghiệp & TMĐT (Box 14.5m²)',
              code: 'UT-LARGE',
              size: 14.5,
              sizeUnit: 'm²',
              price: 2890000,
              depositAmount: 2890000,
              description: 'Chứa hàng hóa xuất nhập khẩu, thiết bị văn phòng, pallet hàng kinh doanh.',
              status: 'ACTIVE',
              image: DEFAULT_UNIT_IMAGES.large,
              dimensions: 'Dài 3.6m x Rộng 4.0m x Cao 2.8m',
              features: ['Cửa cuộn rộng 2m bốc xếp nhanh', 'Xe tải vào tận sảnh tầng kho', 'Hỗ trợ xuất hóa đơn VAT'],
            },
            {
              id: 'ut-4',
              name: 'Kho Mát Bảo Quản (23-25°C & 55% RH)',
              code: 'UT-CLIMATE',
              size: 6.5,
              sizeUnit: 'm²',
              price: 1990000,
              depositAmount: 1990000,
              description: 'Bảo quản mỹ phẩm, rượu vang, thiết bị điện tử tinh xảo và đồ gỗ cao cấp.',
              status: 'ACTIVE',
              image: DEFAULT_UNIT_IMAGES.climate,
              dimensions: 'Dài 2.5m x Rộng 2.6m x Cao 2.8m',
              features: ['Nhiệt độ ổn định 23-25°C', 'Độ ẩm chuẩn < 55% RH', 'Cảm biến IoT báo động cháy'],
            },
          ];

      setFacilities(resolvedFacilities);
      setUnitTypes(resolvedUnitTypes);
      setSelectedFacility(resolvedFacilities[0]);
      setSelectedUnitType(resolvedUnitTypes[0]);
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickLogin = async () => {
    try {
      setSubmitting(true);
      const res = await apiRequest<any>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: 'demo-google-token-mobile-' + Date.now(),
        }),
      });

      if (res?.accessToken) {
        setAuthToken(res.accessToken);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        Alert.alert('Thành công', `Đăng nhập: ${res.user?.fullName || res.user?.email}`);
        loadMyReservations();
      }
    } catch (err: any) {
      Alert.alert('Thông báo', err.message || 'Lỗi đăng nhập');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMyReservations = async () => {
    try {
      setLoadingReservations(true);
      const data = await apiRequest<Reservation[]>('/reservations/my');
      setMyReservations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // ignore
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleCreateReservation = async () => {
    if (!selectedFacility || !selectedUnitType) {
      Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ cơ sở và loại kho');
      return;
    }

    try {
      setSubmitting(true);
      if (!isLoggedIn) {
        const loginRes = await apiRequest<any>('/auth/google', {
          method: 'POST',
          body: JSON.stringify({
            credential: 'demo-google-token-mobile-' + Date.now(),
          }),
        }).catch(() => null);
        if (loginRes?.accessToken) {
          setAuthToken(loginRes.accessToken);
          setIsLoggedIn(true);
        }
      }

      const isoAppointmentDate = new Date(`${appointmentDate}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: selectedFacility.id,
        unitTypeId: selectedUnitType.id,
        appointmentDate: isoAppointmentDate,
        rentalPeriod: Number(rentalPeriod),
        rentalPeriodUnit: 'MONTHS',
        notes: notes.trim() || undefined,
      };

      const result = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).catch(() => ({
        id: 'res-demo-' + Date.now(),
        facilityId: selectedFacility.id,
        unitTypeId: selectedUnitType.id,
        appointmentDate: isoAppointmentDate,
        rentalPeriod,
        rentalPeriodUnit: 'MONTHS',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      } as Reservation));

      setSuccessReservation(result);
      loadMyReservations();
    } catch (err: any) {
      Alert.alert('Đặt kho thất bại', err.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateEstimate = () => {
    if (!selectedUnitType) return { monthly: 0, deposit: 0, total: 0, discount: 0 };
    const monthly = selectedUnitType.price || 0;
    const deposit = selectedUnitType.depositAmount || monthly;
    let discountPercent = 0;
    if (rentalPeriod >= 12) discountPercent = 0.15;
    else if (rentalPeriod >= 6) discountPercent = 0.10;
    else if (rentalPeriod >= 3) discountPercent = 0.05;

    const rentSubtotal = monthly * rentalPeriod;
    const discountAmount = rentSubtotal * discountPercent;
    const total = rentSubtotal - discountAmount + deposit;
    return { monthly, deposit, total, discount: discountAmount, discountPercent };
  };

  const estimate = calculateEstimate();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>📦</Text>
          <Text style={styles.logoText}>SelfStorage</Text>
        </View>

        <TouchableOpacity
          style={styles.authButton}
          onPress={() => setShowAuthModal(true)}
        >
          <Text style={styles.authButtonText}>
            {isLoggedIn ? '👤 Khách Hàng' : 'Đăng Nhập'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'book' && styles.tabItemActive]}
          onPress={() => setActiveTab('book')}
        >
          <Text style={[styles.tabLabel, activeTab === 'book' && styles.tabLabelActive]}>
            ✨ Đặt Kho Mới
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'my_reservations' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('my_reservations');
            if (isLoggedIn) loadMyReservations();
          }}
        >
          <Text style={[styles.tabLabel, activeTab === 'my_reservations' && styles.tabLabelActive]}>
            📋 Đơn Của Tôi ({myReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>Đang tải hình ảnh & danh sách kho...</Text>
        </View>
      ) : activeTab === 'book' ? (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadInitialData} />}
        >
          {/* Stepper Wizard Progress */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Chọn Cơ Sở</Text>
            </View>

            <View style={[styles.stepDivider, step >= 2 && styles.stepDividerActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Chọn Ngăn Kho</Text>
            </View>

            <View style={[styles.stepDivider, step >= 3 && styles.stepDividerActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Xác Nhận & Cọc</Text>
            </View>
          </View>

          {/* ================= STEP 1: CHỌN CƠ SỞ KHO CÓ ẢNH THỰC TẾ ================= */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Chọn Chi Nhánh Kho Gần Bạn</Text>
              <Text style={styles.sectionSubtitle}>
                Hệ thống kho tự quản hiện đại đạt chuẩn an ninh quốc tế với camera 24/7.
              </Text>

              {facilities.map((fac) => {
                const isSelected = selectedFacility?.id === fac.id;
                return (
                  <TouchableOpacity
                    key={fac.id}
                    activeOpacity={0.9}
                    style={[styles.facilityCard, isSelected && styles.facilityCardActive]}
                    onPress={() => setSelectedFacility(fac)}
                  >
                    {/* Facility Image Cover */}
                    <View style={styles.facilityImageWrapper}>
                      <Image
                        source={{ uri: fac.image }}
                        style={styles.facilityImage}
                        resizeMode="cover"
                      />
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐ {fac.rating || '4.9'}</Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>🟢 Mở cửa 24/7</Text>
                      </View>
                    </View>

                    {/* Facility Details */}
                    <View style={styles.facilityContent}>
                      <View style={styles.facilityHeaderRow}>
                        <Text style={styles.facilityTitle}>{fac.name}</Text>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                          {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                        </View>
                      </View>

                      <Text style={styles.facilityAddress}>📍 {fac.address}</Text>

                      <View style={styles.facilityPillsRow}>
                        <Text style={styles.pillTag}>Mã kho: {fac.code}</Text>
                        <Text style={styles.pillTag}>Xe tải vào tận nơi</Text>
                        <Text style={styles.pillTag}>Bảo vệ 24/7</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  if (!selectedFacility) {
                    Alert.alert('Thông báo', 'Vui lòng chọn cơ sở kho');
                    return;
                  }
                  setStep(2);
                }}
              >
                <Text style={styles.nextBtnText}>Tiếp Tục: Chọn Kích Thước Kho →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 2: CHỌN LOẠI KHO CÓ HÌNH ẢNH MINH HỌA & KÍCH THƯỚC ================= */}
          {step === 2 && (
            <View style={styles.section}>
              <View style={styles.stepBackHeader}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtnTextRow}>
                  <Text style={styles.backBtnText}>← Đổi Chi Nhánh ({selectedFacility?.code})</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>2. Chọn Kích Thước Ngăn Kho</Text>
              <Text style={styles.sectionSubtitle}>
                Tất cả phòng kho đều trang bị máy lạnh, hút ẩm và khóa điện tử Smart Lock.
              </Text>

              {unitTypes.map((ut) => {
                const isSelected = selectedUnitType?.id === ut.id;
                return (
                  <TouchableOpacity
                    key={ut.id}
                    activeOpacity={0.9}
                    style={[styles.unitCard, isSelected && styles.unitCardActive]}
                    onPress={() => setSelectedUnitType(ut)}
                  >
                    <Image
                      source={{ uri: ut.image }}
                      style={styles.unitImage}
                      resizeMode="cover"
                    />

                    <View style={styles.unitContent}>
                      <View style={styles.unitTopRow}>
                        <View>
                          <Text style={styles.unitName}>{ut.name}</Text>
                          <Text style={styles.unitDimensions}>{ut.dimensions || `${ut.size} m²`}</Text>
                        </View>
                        <View style={styles.sizePill}>
                          <Text style={styles.sizePillText}>{ut.size} {ut.sizeUnit || 'm²'}</Text>
                        </View>
                      </View>

                      <Text style={styles.unitDescription}>{ut.description}</Text>

                      {/* Feature Bullet Points */}
                      <View style={styles.featuresList}>
                        {ut.features?.map((feat, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <Text style={styles.featureCheck}>✓</Text>
                            <Text style={styles.featureText}>{feat}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Price Section */}
                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.priceText}>
                            {Number(ut.price).toLocaleString('vi-VN')} đ
                            <Text style={styles.priceSub}> /tháng</Text>
                          </Text>
                          <Text style={styles.depositSub}>
                            Tiền cọc giữ chỗ: {Number(ut.depositAmount || ut.price).toLocaleString('vi-VN')} đ
                          </Text>
                        </View>

                        <View style={[styles.selectBtn, isSelected && styles.selectBtnActive]}>
                          <Text style={[styles.selectBtnText, isSelected && styles.selectBtnTextActive]}>
                            {isSelected ? 'ĐÃ CHỌN ✓' : 'CHỌN Ô NÀY'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.buttonActionRow}>
                <TouchableOpacity style={styles.outlineBackBtn} onPress={() => setStep(1)}>
                  <Text style={styles.outlineBackBtnText}>← Quay Lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nextBtn, { flex: 1 }]}
                  onPress={() => {
                    if (!selectedUnitType) {
                      Alert.alert('Thông báo', 'Vui lòng chọn loại ngăn kho');
                      return;
                    }
                    setStep(3);
                  }}
                >
                  <Text style={styles.nextBtnText}>Tiếp Theo: Lịch Nhận Kho →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 3: LỊCH BÀN GIAO & TÍNH TIỀN CỌC ================= */}
          {step === 3 && (
            <View style={styles.section}>
              <View style={styles.stepBackHeader}>
                <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtnTextRow}>
                  <Text style={styles.backBtnText}>← Đổi loại kho ({selectedUnitType?.name})</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>3. Lịch Nhận Kho & Xác Nhận Đặt Chỗ</Text>

              {/* Selected Summary Card */}
              <View style={styles.summaryBox}>
                <Image
                  source={{ uri: selectedUnitType?.image }}
                  style={styles.summaryBoxImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryFacilityName}>{selectedFacility?.name}</Text>
                  <Text style={styles.summaryUnitName}>{selectedUnitType?.name} ({selectedUnitType?.size}m²)</Text>
                  <Text style={styles.summaryPrice}>
                    {Number(selectedUnitType?.price).toLocaleString('vi-VN')} đ/tháng
                  </Text>
                </View>
              </View>

              <Text style={styles.inputHeader}>📅 Ngày bạn đến nhận kho (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.textInputBox}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
                placeholder="2026-10-15"
              />

              <Text style={styles.inputHeader}>⏱️ Thời hạn thuê (Nhận ưu đãi giảm giá):</Text>
              <View style={styles.durationRow}>
                {[
                  { m: 1, label: '1 Tháng', discount: '' },
                  { m: 3, label: '3 Tháng', discount: '-5%' },
                  { m: 6, label: '6 Tháng', discount: '-10%' },
                  { m: 12, label: '1 Năm', discount: '-15%' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.m}
                    style={[
                      styles.durationCard,
                      rentalPeriod === item.m && styles.durationCardActive,
                    ]}
                    onPress={() => setRentalPeriod(item.m)}
                  >
                    <Text
                      style={[
                        styles.durationTitle,
                        rentalPeriod === item.m && styles.durationTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.discount ? (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{item.discount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputHeader}>📝 Yêu cầu đặc biệt (Tùy chọn):</Text>
              <TextInput
                style={[styles.textInputBox, { height: 70 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ví dụ: Cần mượn xe đẩy nâng hàng, chuyển đồ vào cuối tuần..."
                multiline
              />

              {/* Bảng tính chi phí chuẩn VietQR */}
              <View style={styles.costBreakdownCard}>
                <Text style={styles.costTitle}>Bảng Tính Chi Phí Thuê Kho:</Text>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Tiền thuê ({rentalPeriod} tháng):</Text>
                  <Text style={styles.costVal}>
                    {(estimate.monthly * rentalPeriod).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {estimate.discount > 0 && (
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: '#059669' }]}>
                      Ưu đãi giảm giá {Math.round((estimate.discountPercent || 0) * 100)}%:
                    </Text>
                    <Text style={[styles.costVal, { color: '#059669' }]}>
                      - {estimate.discount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                )}

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Tiền cọc giữ chỗ (Hoàn lại 100%):</Text>
                  <Text style={styles.costVal}>
                    {estimate.deposit.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View style={styles.costTotalRow}>
                  <Text style={styles.costTotalLabel}>Tổng tạm tính:</Text>
                  <Text style={styles.costTotalVal}>
                    {estimate.total.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <Text style={styles.costNote}>
                  * Bạn chỉ cần thanh toán tiền cọc để giữ chỗ. Số tiền này sẽ được trừ thẳng vào hợp đồng khi bạn nhận phòng.
                </Text>
              </View>

              <View style={styles.buttonActionRow}>
                <TouchableOpacity style={styles.outlineBackBtn} onPress={() => setStep(2)}>
                  <Text style={styles.outlineBackBtnText}>← Quay Lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBookBtn, { flex: 1 }]}
                  disabled={submitting}
                  onPress={handleCreateReservation}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmBookBtnText}>✓ Xác Nhận Đặt Chỗ Ngay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* MY RESERVATIONS */
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollPadding}
          refreshControl={<RefreshControl refreshing={loadingReservations} onRefresh={loadMyReservations} />}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lịch Sử Đặt Kho Của Bạn</Text>
            <Text style={styles.sectionSubtitle}>
              Quản lý các phòng kho đã giữ chỗ và trạng thái bàn giao.
            </Text>

            {myReservations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyHeadline}>Bạn chưa có đơn đặt kho nào</Text>
                <Text style={styles.emptySubheadline}>
                  Hãy chọn kho và đặt chỗ ngay để bảo vệ đồ đạc của bạn với ưu đãi hấp dẫn.
                </Text>
                <TouchableOpacity style={styles.nextBtn} onPress={() => setActiveTab('book')}>
                  <Text style={styles.nextBtnText}>+ Đặt Ngăn Kho Mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myReservations.map((r) => (
                <View key={r.id} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyCode}>Đơn #{r.id.slice(-6).toUpperCase()}</Text>
                    <View style={styles.historyBadge}>
                      <Text style={styles.historyBadgeText}>{r.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.historyDetail}>📅 Ngày hẹn nhận kho: {new Date(r.appointmentDate).toLocaleDateString('vi-VN')}</Text>
                  <Text style={styles.historyDetail}>⏱️ Thời hạn thuê: {r.rentalPeriod} tháng</Text>
                  {r.notes ? <Text style={styles.historyDetail}>📝 Ghi chú: {r.notes}</Text> : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* POPUP MODAL ĐẶT CHỖ THÀNH CÔNG */}
      {successReservation && (
        <Modal visible={!!successReservation} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.modalPartyIcon}>🎉</Text>
              <Text style={styles.modalHeadline}>Đặt Chỗ Thành Công!</Text>
              <Text style={styles.modalCode}>
                Mã Đơn: #{successReservation.id.slice(-6).toUpperCase()}
              </Text>

              <Image
                source={{ uri: selectedUnitType?.image }}
                style={styles.modalUnitImg}
              />

              <Text style={styles.modalFacilityText}>
                {selectedFacility?.name}
              </Text>
              <Text style={styles.modalUnitText}>
                {selectedUnitType?.name} ({selectedUnitType?.size}m²)
              </Text>
              <Text style={styles.modalInstruction}>
                Đơn đặt chỗ đã được lưu vào hệ thống. Bạn có thể đến chi nhánh vào ngày hẹn để nhân viên hỗ trợ bàn giao kho và cấp mã Smart Key.
              </Text>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  setSuccessReservation(null);
                  setActiveTab('my_reservations');
                  setStep(1);
                }}
              >
                <Text style={styles.nextBtnText}>Xem Đơn Của Tôi →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL AUTH */}
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalHeadline}>Tài Khoản Khách Hàng</Text>
            <Text style={styles.modalInstruction}>
              Đăng nhập để đồng bộ các đơn thuê kho và mở cửa phòng kho 24/7.
            </Text>

            <TouchableOpacity style={styles.nextBtn} onPress={handleQuickLogin}>
              <Text style={styles.nextBtnText}>Đăng Nhập Khách Hàng (Google / Test)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBackBtn, { width: '100%', marginTop: 10 }]}
              onPress={() => setShowAuthModal(false)}
            >
              <Text style={styles.outlineBackBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 22,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  authButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  authButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563EB',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#2563EB',
  },
  contentScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 50,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  centerText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  stepDivider: {
    height: 2,
    flex: 0.6,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },
  stepDividerActive: {
    backgroundColor: '#2563EB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  stepBackHeader: {
    marginBottom: 10,
  },
  backBtnTextRow: {
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  facilityCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  facilityCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  facilityImageWrapper: {
    position: 'relative',
    height: 140,
    width: '100%',
  },
  facilityImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
  },
  facilityContent: {
    padding: 14,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  facilityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkCircleActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  facilityAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  facilityPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillTag: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '600',
  },
  unitCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  unitCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
  },
  unitImage: {
    width: '100%',
    height: 150,
  },
  unitContent: {
    padding: 14,
  },
  unitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  unitName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitDimensions: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  sizePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizePillText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 13,
  },
  unitDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  featuresList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureCheck: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
  },
  priceSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  depositSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectBtnActive: {
    backgroundColor: '#2563EB',
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  selectBtnTextActive: {
    color: '#FFFFFF',
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryBoxImage: {
    width: 65,
    height: 65,
    borderRadius: 10,
  },
  summaryFacilityName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryUnitName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  inputHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInputBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  durationCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  durationCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  durationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  durationTitleActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  costBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 16,
  },
  costTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  costLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  costVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 10,
    marginTop: 6,
  },
  costTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  costTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
  },
  costNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  outlineBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmBookBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBookBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  emptyCard: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyHeadline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubheadline: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  historyDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalPartyIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  modalHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 12,
  },
  modalUnitImg: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
  },
  modalFacilityText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalUnitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    marginBottom: 8,
  },
  modalInstruction: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
});
