import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Linking,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Facility } from "../../../../api";
import { CustomerTabType } from "../../../../components/customer/CustomerBottomNavBar";
import {
  StorageDisplayItem,
  T,
  formatVND,
  extractDistrict,
} from "../bookingTypes";

interface Step1Props {
  loading?: boolean;
  facilities: Facility[];
  dynamicFacilities: any[];
  filteredDynamicFacilities: any[];
  storageItems: StorageDisplayItem[];
  selectedFacility: Facility | null;
  setSelectedFacility: (fac: Facility | null) => void;
  selectedFacilityPhoto: string;
  selectedFacilityDistance: string | null;
  selectedCategory: "all" | "personal" | "family" | "business";
  setSelectedCategory: (cat: "all" | "personal" | "family" | "business") => void;
  selectedUnit: StorageDisplayItem | null;
  setSelectedUnit: (unit: StorageDisplayItem | null) => void;
  onSelectUnitToBook: (unit: StorageDisplayItem) => void;
  handleOpenDirections: (address: string, title: string) => void;
  currentUser: any;
  onOpenLogin?: (reason?: string) => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
  onOpenAiAssistant?: (prompt?: string) => void;
  onNavigateTab?: (tab: CustomerTabType) => void;
  onViewMyReservations?: () => void;
  availableDistricts: string[];
  facilityDistrictFilter: string;
  setFacilityDistrictFilter: (d: string) => void;
  facilitySearchQuery: string;
  setFacilitySearchQuery: (q: string) => void;
  activeFilterPill: any;
  setActiveFilterPill: (pill: any) => void;
  favoriteIds: Set<string>;
  toggleFavorite: (id: string) => void;
}


// ─── Modern Skeleton Loading Placeholder for Explore ──────────────────────
function ExploreSkeleton() {
  const pulseAnim = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={s.skeletonWrapper}>
      {/* Banner Skeleton */}
      <Animated.View style={[s.skeletonHeroBanner, { opacity: pulseAnim }]} />

      {/* District Chips Skeleton */}
      <View style={s.skeletonChipsRow}>
        <Animated.View style={[s.skeletonChip, { width: 72, opacity: pulseAnim }]} />
        <Animated.View style={[s.skeletonChip, { width: 96, opacity: pulseAnim }]} />
        <Animated.View style={[s.skeletonChip, { width: 84, opacity: pulseAnim }]} />
        <Animated.View style={[s.skeletonChip, { width: 104, opacity: pulseAnim }]} />
      </View>

      {/* Section Header Skeleton */}
      <View style={s.skeletonHeaderRow}>
        <Animated.View style={[s.skeletonBar, { width: 140, height: 18, opacity: pulseAnim }]} />
        <Animated.View style={[s.skeletonBar, { width: 60, height: 14, opacity: pulseAnim }]} />
      </View>

      {/* Facility Cards Skeleton */}
      {[1, 2, 3].map((idx) => (
        <View key={idx} style={s.skeletonCard}>
          <Animated.View style={[s.skeletonCardImage, { opacity: pulseAnim }]} />
          <View style={s.skeletonCardBody}>
            <Animated.View style={[s.skeletonBar, { width: "70%", height: 18, marginBottom: 8, opacity: pulseAnim }]} />
            <Animated.View style={[s.skeletonBar, { width: "90%", height: 13, marginBottom: 14, opacity: pulseAnim }]} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Animated.View style={[s.skeletonBar, { width: 90, height: 24, borderRadius: 6, opacity: pulseAnim }]} />
              <Animated.View style={[s.skeletonBar, { width: 80, height: 32, borderRadius: 8, opacity: pulseAnim }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Step1ExploreAndDetail({
  facilities,
  dynamicFacilities,
  filteredDynamicFacilities,
  storageItems,
  selectedFacility,
  setSelectedFacility,
  selectedFacilityPhoto,
  selectedFacilityDistance,
  selectedCategory,
  setSelectedCategory,
  selectedUnit,
  setSelectedUnit,
  onSelectUnitToBook,
  handleOpenDirections,
  currentUser,
  onOpenLogin,
  onOpenNotifications,
  unreadNotifCount = 0,
  onOpenAiAssistant,
  onNavigateTab,
  onViewMyReservations,
  availableDistricts,
  facilityDistrictFilter,
  setFacilityDistrictFilter,
  facilitySearchQuery,
  setFacilitySearchQuery,
  activeFilterPill,
  setActiveFilterPill,
  favoriteIds,
  toggleFavorite,
  loading = false,
}: Step1Props) {
  const facilityHeroImage = selectedFacilityPhoto;
  const [selectedDistrictFilter, setSelectedDistrictFilter] = React.useState<string>("all");

  const filteredItems = storageItems.filter((item) => {
    if (selectedFacility && String(item.facilityId) !== String(selectedFacility.id)) {
      return false;
    }
    return true;
  });

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          selectedFacility ? { paddingBottom: 120 } : null,
        ]}
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
                        style={[s.avatarWrap, !currentUser && s.avatarWrapUnauth]}
                        activeOpacity={0.8}
                        onPress={() => onOpenLogin?.()}
                      >
                        <MaterialIcons
                          name={currentUser ? "person" : "person-outline"}
                          size={24}
                          color={currentUser ? T.primary : "#475569"}
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <MaterialIcons name="location-on" size={13} color={T.primary} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: T.primary }}>
                            TP. Hồ Chí Minh
                          </Text>
                        </View>
                        {currentUser ? (
                          <Text
                            style={s.greetingName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {currentUser?.fullName || currentUser?.email?.split("@")[0]}
                          </Text>
                        ) : (
                          <TouchableOpacity
                            onPress={() => onOpenLogin?.()}
                            activeOpacity={0.7}
                            style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 }}
                          >
                            <Text style={s.loginPromptText}>Đăng nhập / Đăng ký</Text>
                            <MaterialIcons name="chevron-right" size={15} color="#2563eb" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={s.greetingRight}>
                      <TouchableOpacity
                        style={s.iconCircleBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (!currentUser && onOpenLogin) {
                            onOpenLogin("Vui lòng đăng nhập để gửi yêu cầu hỗ trợ kỹ thuật");
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
                          if (!currentUser) {
                            if (onOpenLogin) {
                              onOpenLogin("Vui lòng đăng nhập để xem thông báo");
                            } else if (onOpenNotifications) {
                              onOpenNotifications();
                            }
                            return;
                          }
                          if (onOpenNotifications) {
                            onOpenNotifications();
                          } else {
                            onViewMyReservations?.();
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

                  {/* 3. SEARCH BAR TÍCH HỢP AI TÍNH CỠ KHO */}
                  <View style={s.searchSection}>
                    <View style={s.searchBarPill}>
                      <MaterialIcons
                        name="search"
                        size={20}
                        color={T.outline}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={s.searchInputStitch}
                        placeholder="Tìm theo quận: Thủ Đức, Q7..."
                        placeholderTextColor={T.outline}
                        value={facilitySearchQuery}
                        onChangeText={setFacilitySearchQuery}
                      />
                      {facilitySearchQuery ? (
                        <TouchableOpacity
                          style={{ paddingHorizontal: 6 }}
                          onPress={() => setFacilitySearchQuery("")}
                        >
                          <MaterialIcons name="close" size={18} color={T.outline} />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={s.aiSearchActionBtn}
                        activeOpacity={0.85}
                        accessibilityLabel="Tính cỡ kho AI"
                        onPress={() => {
                          if (onOpenAiAssistant) {
                            onOpenAiAssistant("Tôi muốn tính cỡ kho phù hợp cho đồ đạc của mình");
                          }
                        }}
                      >
                        <MaterialIcons name="calculate" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {loading ? (
                    <ExploreSkeleton />
                  ) : (
                    <>
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
                        <View style={s.heroTagBadge}>
                          <MaterialIcons name="security" size={13} color="#ffffff" />
                          <Text style={s.heroTagText}>Kho tự quản thông minh 24/7</Text>
                        </View>
                        <Text style={s.heroTitle}>Lưu trữ an toàn & riêng biệt</Text>
                        <Text style={s.heroSubtitle}>
                          Đặt phòng trực tuyến, máy lạnh 23-25°C, tự do ra vào bằng mã PIN
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
                          <Text style={s.heroCtaText}>Khám phá buồng kho trống</Text>
                          <MaterialIcons
                            name="arrow-forward"
                            size={15}
                            color={T.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 6. SECTION KHO NỔI BẬT & CAROUSEL (Dữ liệu động từ Backend) */}
                  <View style={s.featuredSection}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Hệ Thống Cơ Sở Kho </Text>
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
                      <View style={s.featuredVerticalList}>
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


                              </View>

                              <View style={s.featuredCardBody}>
                                <Text
                                  style={s.featuredCardTitle}
                                  numberOfLines={1}
                                >
                                  {card.title}
                                </Text>

                                <View style={s.featuredLocationRow}>
                                  <MaterialIcons
                                    name="location-on"
                                    size={14}
                                    color={T.outline}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    style={s.featuredLocationText}
                                    numberOfLines={1}
                                  >
                                    {card.location}
                                  </Text>
                                </View>

                                <View style={s.featuredBottomActionRow}>
                                  {/* Bên trái: Tag buồng kho & Đang hoạt động */}
                                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
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
                                    <View style={s.activeStatusPill}>
                                      <View style={s.activeStatusDot} />
                                      <Text style={s.activeStatusText}>Hoạt động</Text>
                                    </View>
                                  </View>

                                  {/* Bên phải: Nút Chỉ đường & Chọn kho */}
                                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                                    <TouchableOpacity
                                      style={s.directionsBtn}
                                      activeOpacity={0.7}
                                      onPress={() => handleOpenDirections(card.location, card.title)}
                                      accessibilityLabel="Chỉ đường"
                                    >
                                      <MaterialIcons name="directions" size={15} color="#475569" />
                                    </TouchableOpacity>

                                    <View style={s.chooseFacilityBtn}>
                                      <Text style={s.chooseFacilityBtnText}>Chọn kho</Text>
                                      <MaterialIcons name="chevron-right" size={14} color="#ffffff" />
                                    </View>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* 7. RECOMMENDED / NEARBY LISTING (Dữ liệu động từ Backend) */}
                  <View style={s.nearbySection}>
                    <View style={s.sectionHeaderRow}>
                      <View>
                        <Text style={s.sectionHeaderTitle}>Gợi ý gần bạn</Text>
                        <Text style={{ fontSize: 11, color: "#737686", marginTop: 2 }}>
                          Kho tự quản tại các quận thuận tiện giao thông
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setFacilitySearchQuery("");
                          setSelectedDistrictFilter("all");
                        }}
                      >
                        <Text style={s.sectionHeaderSort}>
                          Tất cả ({dynamicFacilities.length})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Hàng Chip lọc nhanh theo Quận (Đề xuất 2) */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.districtChipsScroll}
                    >
                      <TouchableOpacity
                        style={[
                          s.districtChip,
                          selectedDistrictFilter === "all" && s.districtChipActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedDistrictFilter("all")}
                      >
                        <Text
                          style={[
                            s.districtChipText,
                            selectedDistrictFilter === "all" && s.districtChipTextActive,
                          ]}
                        >
                          Tất cả khu vực
                        </Text>
                      </TouchableOpacity>
                      {availableDistricts.map((dst) => (
                        <TouchableOpacity
                          key={dst}
                          style={[
                            s.districtChip,
                            selectedDistrictFilter === dst && s.districtChipActive,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setSelectedDistrictFilter(dst)}
                        >
                          <Text
                            style={[
                              s.districtChipText,
                              selectedDistrictFilter === dst && s.districtChipTextActive,
                            ]}
                          >
                            {dst}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Danh sách thẻ kho có đo khoảng cách km và nút chỉ đường */}
                    <View style={s.nearbyListWrap}>
                      {dynamicFacilities.length === 0 ? (
                        <View style={s.emptyFeaturedCard}>
                          <Text style={s.emptyFeaturedSub}>
                            Đang tải dữ liệu cơ sở kho từ hệ thống...
                          </Text>
                        </View>
                      ) : (
                        dynamicFacilities
                          .filter((item) => {
                            if (selectedDistrictFilter !== "all" && item.district !== selectedDistrictFilter) {
                              return false;
                            }
                            if (facilitySearchQuery.trim()) {
                              const q = facilitySearchQuery.toLowerCase().trim();
                              return (
                                item.title.toLowerCase().includes(q) ||
                                item.location.toLowerCase().includes(q) ||
                                (item.district && item.district.toLowerCase().includes(q))
                              );
                            }
                            return true;
                          })
                          .map((rec) => (
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

                                {/* Badge Khoảng cách: GPS thật hoặc fallback Tên Quận */}
                                <View style={s.distanceBadgeRow}>
                                  {rec.isNearest ? (
                                    <View style={s.nearestTag}>
                                      <MaterialIcons name="navigation" size={11} color="#16a34a" />
                                      <Text style={s.nearestTagText}>Gần bạn nhất</Text>
                                    </View>
                                  ) : null}
                                  {rec.realDistanceKm ? (
                                    <View style={s.kmPill}>
                                      <MaterialIcons name="near-me" size={11} color="#2563eb" />
                                      <Text style={s.kmPillText}>Cách bạn {rec.realDistanceKm} km</Text>
                                    </View>
                                  ) : (
                                    <View style={[s.kmPill, { backgroundColor: "#f1f5f9" }]}>
                                      <MaterialIcons name="place" size={11} color="#475569" />
                                      <Text style={[s.kmPillText, { color: "#475569" }]}>{rec.district || "TP. Hồ Chí Minh"}</Text>
                                    </View>
                                  )}
                                </View>

                                <View style={s.nearbyDistanceRow}>
                                  <MaterialIcons
                                    name="location-on"
                                    size={13}
                                    color={T.outline}
                                    style={{ marginRight: 3 }}
                                  />
                                  <Text
                                    style={s.nearbyDistanceText}
                                    numberOfLines={1}
                                  >
                                    {rec.location}
                                  </Text>
                                </View>

                                <View style={s.nearbyBottomRow}>
                                  {/* Bên trái: Thông tin số buồng còn trống */}
                                  <View style={s.unitAvailableTag}>
                                    <MaterialIcons name="check-circle" size={12} color="#16a34a" />
                                    <Text style={s.unitAvailableText}>{rec.tag || "Còn buồng trống"}</Text>
                                  </View>

                                  <View style={s.nearbyActionsCluster}>
                                    {/* Nút Chỉ đường */}
                                    <TouchableOpacity
                                      style={s.directionsBtn}
                                      activeOpacity={0.7}
                                      onPress={() => handleOpenDirections(rec.location, rec.title)}
                                      accessibilityLabel="Chỉ đường"
                                    >
                                      <MaterialIcons name="directions" size={15} color="#475569" />
                                    </TouchableOpacity>

                                    {/* Nút Chọn kho */}
                                    <TouchableOpacity
                                      style={s.nearbyActionBtn}
                                      activeOpacity={0.8}
                                      onPress={() => setSelectedFacility(rec.facility)}
                                    >
                                      <Text style={s.nearbyActionBtnText}>
                                        Chọn kho
                                      </Text>
                                      <MaterialIcons name="chevron-right" size={14} color="#ffffff" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))
                      )}
                    </View>
                  </View>

                  {/* 8. QUY TRÌNH THUÊ KHO 4 BƯỚC KHÉP KÍN (TỪ FE) */}
                  <View style={s.homeExtraSection}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Quy trình thuê kho 4 bước</Text>
                    </View>
                    <View style={s.stepsFlowContainer}>
                      <View style={s.stepFlowCard}>
                        <View style={s.stepFlowNumBadge}>
                          <Text style={s.stepFlowNumText}>01</Text>
                        </View>
                        <View style={s.stepFlowContent}>
                          <Text style={s.stepFlowTitle}>Chọn cơ sở & kích thước</Text>
                          <Text style={s.stepFlowDesc}>Khám phá kho trống, xem diện tích từ 1 - 25m² và bảng giá niêm yết.</Text>
                        </View>
                      </View>

                      <View style={s.stepFlowCard}>
                        <View style={[s.stepFlowNumBadge, { backgroundColor: "#ea580c" }]}>
                          <Text style={s.stepFlowNumText}>02</Text>
                        </View>
                        <View style={s.stepFlowContent}>
                          <Text style={s.stepFlowTitle}>Đặt cọc VietQR tự động</Text>
                          <Text style={s.stepFlowDesc}>Thanh toán cọc giữ chỗ chuẩn VietQR, xác nhận phòng tức thì 100% online.</Text>
                        </View>
                      </View>

                      <View style={s.stepFlowCard}>
                        <View style={[s.stepFlowNumBadge, { backgroundColor: "#16a34a" }]}>
                          <Text style={s.stepFlowNumText}>03</Text>
                        </View>
                        <View style={s.stepFlowContent}>
                          <Text style={s.stepFlowTitle}>Check-in & nhận mã PIN</Text>
                          <Text style={s.stepFlowDesc}>Đến kho nhận bàn giao phòng, cấp mã khóa thông minh Smart Key riêng.</Text>
                        </View>
                      </View>

                      <View style={s.stepFlowCard}>
                        <View style={[s.stepFlowNumBadge, { backgroundColor: "#4f46e5" }]}>
                          <Text style={s.stepFlowNumText}>04</Text>
                        </View>
                        <View style={s.stepFlowContent}>
                          <Text style={s.stepFlowTitle}>Tự do ra vào 24/7</Text>
                          <Text style={s.stepFlowDesc}>Mở cửa bằng mã PIN bất kỳ lúc nào, kể cả ban đêm hoặc ngày nghỉ lễ.</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 9. NHU CẦU LƯU TRỮ PHỔ BIẾN (USE CASES TỪ FE) */}
                  <View style={s.homeExtraSection}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Nhu cầu lưu trữ phổ biến</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                      <View style={s.useCaseCard}>
                        <View style={[s.useCaseIconWrap, { backgroundColor: "#eff6ff" }]}>
                          <MaterialIcons name="home-work" size={24} color="#2563eb" />
                        </View>
                        <Text style={s.useCaseTitle}>Gia đình dọn nhà / Sửa nhà</Text>
                        <Text style={s.useCaseDesc}>Lưu trữ tạm sofa, nệm, tủ quần áo, đồ gia dụng trong phòng kho riêng máy lạnh chống ẩm mốc.</Text>
                      </View>

                      <View style={s.useCaseCard}>
                        <View style={[s.useCaseIconWrap, { backgroundColor: "#fef3c7" }]}>
                          <MaterialIcons name="storefront" size={24} color="#d97706" />
                        </View>
                        <Text style={s.useCaseTitle}>Hàng kinh doanh & E-com</Text>
                        <Text style={s.useCaseDesc}>Kho trung chuyển cho shop online, xuất nhập hàng linh hoạt 24/7 với xe đẩy hàng có sẵn.</Text>
                      </View>

                      <View style={s.useCaseCard}>
                        <View style={[s.useCaseIconWrap, { backgroundColor: "#dcfce7" }]}>
                          <MaterialIcons name="inventory-2" size={24} color="#16a34a" />
                        </View>
                        <Text style={s.useCaseTitle}>Đồ cá nhân & Bộ sưu tập</Text>
                        <Text style={s.useCaseDesc}>Bảo quản giày hiếm, mô hình anime, tranh ảnh và tài liệu công ty với camera bảo mật đa tầng.</Text>
                      </View>
                    </ScrollView>
                  </View>

                  {/* 10. ĐÁNH GIÁ THỰC TẾ 4.9⭐ (SOCIAL PROOF TỪ FE) */}
                  <View style={[s.homeExtraSection, { marginBottom: 24 }]}>
                    <View style={s.sectionHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Khách hàng đánh giá</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <MaterialIcons name="star" size={16} color="#eab308" />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#131b2e" }}>4.9 / 5.0</Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 20, gap: 10 }}>
                      <View style={s.reviewCard}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={[s.reviewAvatarWrap, { backgroundColor: "#2563eb" }]}>
                              <Text style={s.reviewAvatarText}>H</Text>
                            </View>
                            <View>
                              <Text style={s.reviewName}>Trương Huỳnh Hiếu</Text>
                              <Text style={s.reviewRole}>Thuê kho cá nhân - Google Review</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: "row" }}>
                            {[1, 2, 3, 4, 5].map((st) => (
                              <MaterialIcons key={st} name="star" size={14} color="#eab308" />
                            ))}
                          </View>
                        </View>
                        <Text style={s.reviewComment}>
                          "Quy trình đặt kho và thanh toán cọc qua QR rất nhanh gọn. Mở cửa bằng mã PIN 24/7 cực kỳ tiện lợi!"
                        </Text>
                      </View>

                      <View style={s.reviewCard}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={[s.reviewAvatarWrap, { backgroundColor: "#ea580c" }]}>
                              <Text style={s.reviewAvatarText}>P</Text>
                            </View>
                            <View>
                              <Text style={s.reviewName}>Phúc Lê</Text>
                              <Text style={s.reviewRole}>Chủ shop online - Google Review</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: "row" }}>
                            {[1, 2, 3, 4, 5].map((st) => (
                              <MaterialIcons key={st} name="star" size={14} color="#eab308" />
                            ))}
                          </View>
                        </View>
                        <Text style={s.reviewComment}>
                          "Kho máy lạnh sạch sẽ, xuất nhập hàng lúc nào cũng được. Quản lý buồng kho trên điện thoại rất rõ ràng."
                        </Text>
                      </View>
                    </View>
                  </View>
                    </>
                  )}
                </View>
              ) : (
                /* ========================================================= */
                /* GIAO DIỆN CHI TIẾT CƠ SỞ KHO CHUẨN PROPERTY DETAIL       */
                /* ========================================================= */
                <View style={{ backgroundColor: "#ffffff" }}>
                  {/* 1. HERO IMAGE HEADER TRÀN VIỀN (FULL-BLEED) */}
                  <View style={s.propDetailHeroWrap}>
                    <Image
                      source={{ uri: facilityHeroImage }}
                      style={s.propDetailHeroImg}
                      resizeMode="cover"
                    />
                    <View style={s.propDetailHeroGradient} />

                    {/* Floating Top Controls */}
                    <View style={s.propDetailFloatingHeader}>
                      <TouchableOpacity
                        style={s.propDetailCircleBtn}
                        onPress={() => setSelectedFacility(null)}
                        activeOpacity={0.85}
                        accessibilityLabel="Quay lại"
                      >
                        <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
                      </TouchableOpacity>

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                          style={s.propDetailCircleBtn}
                          onPress={() => handleOpenDirections(selectedFacility?.address || "", selectedFacility?.name)}
                          activeOpacity={0.85}
                          accessibilityLabel="Chỉ đường"
                        >
                          <MaterialIcons name="directions" size={20} color="#2563eb" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.propDetailCircleBtn}
                          onPress={() => Linking.openURL("tel:19006868")}
                          activeOpacity={0.85}
                          accessibilityLabel="Gọi hotline"
                        >
                          <MaterialIcons name="phone" size={18} color="#059669" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    
                  </View>

                  {/* 2. BODY CONTENT CHI TIẾT CƠ SỞ */}
                  <View style={s.propDetailBody}>
                    {/* Tên cơ sở kho */}
                    <Text style={s.propDetailTitle}>{selectedFacility?.name}</Text>

                    {/* Địa chỉ cơ sở */}
                    <View style={s.propDetailLocationRow}>
                      <MaterialIcons name="place" size={16} color="#64748b" style={{ marginRight: 4, marginTop: 1 }} />
                      <Text style={s.propDetailAddress} numberOfLines={2}>
                        {selectedFacility?.address || extractDistrict(selectedFacility?.address || "", selectedFacility?.name) || "TP. Hồ Chí Minh"}
                      </Text>
                    </View>

                    {/* Badges trạng thái & khoảng cách GPS */}
                    <View style={s.propDetailBadgesRow}>
                      <View style={s.propDetailGreenBadge}>
                        <MaterialIcons name="check-circle" size={12} color="#15803d" style={{ marginRight: 4 }} />
                        <Text style={s.propDetailGreenBadgeText}>Mở cửa 24/7</Text>
                      </View>

                      {selectedFacilityDistance ? (
                        <View style={s.propDetailBlueBadge}>
                          <MaterialIcons name="near-me" size={12} color="#2563eb" style={{ marginRight: 4 }} />
                          <Text style={s.propDetailBlueBadgeText}>Cách bạn {selectedFacilityDistance}</Text>
                        </View>
                      ) : (
                        <View style={s.propDetailBlueBadge}>
                          <MaterialIcons name="location-city" size={12} color="#2563eb" style={{ marginRight: 4 }} />
                          <Text style={s.propDetailBlueBadgeText}>TP. Hồ Chí Minh</Text>
                        </View>
                      )}

                      <View style={s.propDetailPurpleBadge}>
                        <MaterialIcons name="verified-user" size={12} color="#7c3aed" style={{ marginRight: 4 }} />
                        <Text style={s.propDetailPurpleBadgeText}>Bảo vệ 24/7</Text>
                      </View>
                    </View>

                    {/* 3. TIỆN ÍCH CỐT LÕI (CHIP PILLS GỐC) */}
                    <View style={s.propDetailSpecsGrid}>
                      <View style={s.propDetailSpecPill}>
                        <MaterialIcons name="access-time" size={16} color="#1e293b" />
                        <Text style={s.propDetailSpecPillText}>Ra vào 24/7</Text>
                      </View>
                      <View style={s.propDetailSpecPill}>
                        <MaterialIcons name="ac-unit" size={16} color="#1e293b" />
                        <Text style={s.propDetailSpecPillText}>Máy lạnh 25°C</Text>
                      </View>
                      <View style={s.propDetailSpecPill}>
                        <MaterialIcons name="videocam" size={16} color="#1e293b" />
                        <Text style={s.propDetailSpecPillText}>Camera AI 24/7</Text>
                      </View>
                      <View style={s.propDetailSpecPill}>
                        <MaterialIcons name="local-shipping" size={16} color="#1e293b" />
                        <Text style={s.propDetailSpecPillText}>Bãi xe tải</Text>
                      </View>
                    </View>

                    {/* 4. MÔ TẢ CHI TIẾT */}
                    {selectedFacility?.description ? (
                      <View style={s.propDetailSection}>
                        <Text style={s.propDetailSectionTitle}>Mô tả chi tiết</Text>
                        <Text style={s.propDetailDescText}>
                          {selectedFacility.description}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {/* Danh sách các loại kho đang còn trống */}
                  <View style={s.mainListSection}>
                    <View style={s.unitListHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={s.livePulseDot} />
                        <Text style={s.unitListSectionTitle}>Chọn loại kho phù hợp</Text>
                      </View>
                      <View style={s.unitCountBadge}>
                        <Text style={s.unitCountBadgeText}>{filteredItems.length} loại khả dụng</Text>
                      </View>
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
                          Cơ sở này hiện tại chưa có loại kho phù hợp với bộ lọc. Bạn có thể chọn chi nhánh khác hoặc đặt lại bộ lọc.
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
                      filteredItems.map((item) => {
                        const isOutOfStock = Boolean(item.badgeStatus?.includes("hết"));
                        const isSelected = !isOutOfStock && selectedUnit?.id === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              s.fullSpecCard,
                              isSelected && s.fullSpecCardActive,
                              isOutOfStock && s.fullSpecCardDisabled,
                            ]}
                            onPress={() => {
                              if (!isOutOfStock) {
                                setSelectedUnit(isSelected ? null : item);
                              }
                            }}
                            disabled={isOutOfStock}
                            activeOpacity={0.88}
                          >
                            {/* 1. Hàng Tiêu Đề: Huy hiệu diện tích + Tên buồng kho (1 dòng) + Radio */}
                            <View style={s.fullSpecHeaderRow}>
                              <View style={s.fullSpecTitleGroup}>
                                <View style={[s.fullSpecAreaBadge, isSelected && s.fullSpecAreaBadgeActive]}>
                                  <Text style={s.fullSpecAreaBadgeText}>{item.floorArea}</Text>
                                </View>
                                <Text
                                  style={[s.fullSpecTitle, isSelected && s.fullSpecTitleActive]}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {item.title}
                                </Text>
                              </View>

                              
                            </View>

                            {/* 2. Hàng Thông Số: Trạng thái buồng và tiền cọc thực tế từ API */}
                            <View style={s.fullSpecMetricsRow}>
                              <View style={[s.fullSpecStatusPill, isOutOfStock && s.fullSpecStatusPillRed]}>
                                <View style={[s.fullSpecStatusDot, isOutOfStock && s.fullSpecStatusDotRed]} />
                                <Text style={[s.fullSpecStatusText, isOutOfStock && s.fullSpecStatusTextRed]}>
                                  {item.badgeStatus}
                                </Text>
                              </View>

                              {item.depositAmount > 0 ? (
                                <View style={s.fullSpecMetricPill}>
                                  <MaterialIcons name="shield" size={13} color="#475569" style={{ marginRight: 3 }} />
                                  <Text style={s.fullSpecMetricText}>Cọc: {formatVND(item.depositAmount)}</Text>
                                </View>
                              ) : null}
                            </View>

                            {/* 3. Sức Chứa / Mô Tả Thực Tế Từ DB (Chỉ hiển thị khi có dữ liệu) */}
                            {item.capacity ? (
                              <View style={s.fullSpecCapacityBox}>
                                <MaterialIcons name="inventory-2" size={15} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
                                <Text style={s.fullSpecCapacityText}>
                                  {item.capacity}
                                </Text>
                              </View>
                            ) : null}

                            {/* 4. Hàng Đáy: Giá thuê & Nút chọn (Ẩn hoàn toàn nút chọn khi tạm hết phòng) */}
                            <View style={s.fullSpecFooterRow}>
                              <View>
                                <Text style={s.fullSpecPriceLabel}>Giá thuê linh hoạt</Text>
                                <View style={s.fullSpecPriceRow}>
                                  <Text style={s.fullSpecPriceAmount}>{formatVND(item.monthlyBasePrice)}</Text>
                                  <Text style={s.fullSpecPricePeriod}>/tháng</Text>
                                </View>
                              </View>

                              {!isOutOfStock ? (
                                <TouchableOpacity
                                  style={[s.fullSpecActionBtn, isSelected && s.fullSpecActionBtnActive]}
                                  onPress={() => onSelectUnitToBook(item)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[s.fullSpecActionBtnText, isSelected && s.fullSpecActionBtnTextActive]}>
                                    {isSelected ? "Đặt kho này" : "Chọn kho"}
                                  </Text>
                                  <MaterialIcons
                                    name="arrow-forward"
                                    size={13}
                                    color={isSelected ? "#ffffff" : "#2563eb"}
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })
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

      {/* Sticky Bottom Bar for Facility Detail */}
      {selectedFacility && (
        <View style={s.detailStickyBottomBar}>
            <TouchableOpacity
              style={s.detailIconCircleAction}
              onPress={() => handleOpenDirections(selectedFacility?.address || "", selectedFacility?.name)}
              accessibilityLabel="Chỉ đường"
              activeOpacity={0.7}
            >
              <MaterialIcons name="directions" size={22} color="#2563eb" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.detailIconCircleAction, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}
              onPress={() => Linking.openURL("tel:19006868")}
              accessibilityLabel="Gọi tư vấn"
              activeOpacity={0.7}
            >
              <MaterialIcons name="phone" size={20} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.detailPrimaryCtaBtn,
                (!selectedUnit || selectedUnit.badgeStatus?.includes("hết")) &&
                  !filteredItems.some((it) => !it.badgeStatus?.includes("hết")) && {
                    opacity: 0.5,
                  },
              ]}
              onPress={() => {
                const target =
                  selectedUnit && !selectedUnit.badgeStatus?.includes("hết")
                    ? selectedUnit
                    : filteredItems.find((it) => !it.badgeStatus?.includes("hết"));
                if (target) {
                  onSelectUnitToBook(target);
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={s.detailPrimaryCtaText}>Thuê kho ngay</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
      )}
    </View>
  );
}

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
    position: "relative",
  },
  topToastContainer: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "center",
  },
  topToastContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
  },
  topToastLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  topToastIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  topToastText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#f8fafc",
    flex: 1,
  },
  topToastLoginBtn: {
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  topToastLoginBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60a5fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },

  // ─── Home New Sections Styles (Synced with FE) ────────────────────────
  heroTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 4,
  },
  heroTagText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  keySpecsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  keySpecPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.5)",
    gap: 8,
  },
  keySpecVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#131b2e",
  },
  keySpecLabel: {
    fontSize: 10,
    color: "#737686",
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#131b2e",
    textAlign: "center",
  },
  homeExtraSection: {
    marginTop: 18,
  },
  stepsFlowContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  stepFlowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
    gap: 12,
  },
  stepFlowNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepFlowNumText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  stepFlowContent: {
    flex: 1,
  },
  stepFlowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#131b2e",
    marginBottom: 2,
  },
  stepFlowDesc: {
    fontSize: 11,
    color: "#737686",
    lineHeight: 15,
  },
  useCaseCard: {
    width: 220,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
  },
  useCaseIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  useCaseTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#131b2e",
    marginBottom: 4,
  },
  useCaseDesc: {
    fontSize: 11,
    color: "#737686",
    lineHeight: 16,
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.4)",
  },
  reviewAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
  },
  reviewName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#131b2e",
  },
  reviewRole: {
    fontSize: 10,
    color: "#737686",
  },
  reviewComment: {
    fontSize: 12,
    color: "#434655",
    lineHeight: 17,
    fontStyle: "italic",
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
    paddingTop: Platform.OS === "ios" ? 48 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 28),
    paddingBottom: 8,
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarWrapUnauth: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  loginPromptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
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
  aiSearchActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
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
  featuredVerticalList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  featuredCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.45)",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredImageWrap: {
    position: "relative",
    width: "100%",
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#eff4ff",
  },
  featuredBottomActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  activeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16a34a",
  },
  unitAvailableTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  unitAvailableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  chooseFacilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    gap: 2,
  },
  chooseFacilityBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
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
    paddingBottom: 8,
  },
  nearbyListWrap: {
    gap: 12,
  },
  districtChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 10,
  },
  districtChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.6)",
  },
  districtChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  districtChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  districtChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  distanceBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    marginBottom: 3,
  },
  nearestTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  nearestTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  kmPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  kmPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563eb",
  },
  directionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  nearbyActionsCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  nearbyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    gap: 2,
  },
  nearbyActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  loadWrap: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingLogo: {
    width: 260,
    height: 76,
  },
  // ─── STYLES CHO CHI TIẾT CƠ SỞ KHO (CHUẨN PROPERTY DETAIL) ───────────────
  propDetailHeroWrap: {
    width: "100%",
    height: 250,
    position: "relative",
    backgroundColor: "#0f172a",
  },
  propDetailHeroImg: {
    width: "100%",
    height: "100%",
  },
  propDetailHeroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.15)",
  },
  propDetailFloatingHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 28),
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  propDetailCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  propDetailPhotoBadge: {
    position: "absolute",
    bottom: 12,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  propDetailPhotoBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  propDetailBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  propDetailTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    lineHeight: 28,
  },
  propDetailLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  propDetailAddress: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
    lineHeight: 18,
  },
  propDetailBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  propDetailGreenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  propDetailGreenBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  propDetailBlueBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  propDetailBlueBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  propDetailPurpleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  propDetailPurpleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c3aed",
  },
  propDetailSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  propDetailSpecPill: {
    flex: 1,
    minWidth: "46%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  propDetailSpecPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  propDetailSection: {
    marginBottom: 12,
  },
  propDetailSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  propDetailDescText: {
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 22,
  },
  detailStickyBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
  },
  detailIconCircleAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  detailPrimaryCtaBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  detailPrimaryCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
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
  
  // Compact Horizontal Unit Cards
  
  emptyStateWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.onSurface,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyStateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },

  
  // Skeleton Loading Styles
  skeletonWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletonHeroBanner: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    marginBottom: 16,
  },
  skeletonChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    overflow: "hidden",
  },
  skeletonChip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e2e8f0",
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonCardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#e2e8f0",
  },
  skeletonCardBody: {
    padding: 14,
  },
  skeletonBar: {
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
  },

  
  unitListHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  unitListSectionTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  unitCountBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  unitCountBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },

  
  // Full Spec Unit Cards (No image, 100% full text)
  fullSpecCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  fullSpecCardDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    opacity: 0.65,
  },
  fullSpecCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#f8faff",
  },
  fullSpecHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  fullSpecTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  fullSpecAreaBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  fullSpecAreaBadgeActive: {
    backgroundColor: "#2563eb",
  },
  fullSpecAreaBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  fullSpecTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  fullSpecTitleActive: {
    color: "#1d4ed8",
  },
  fullSpecRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fullSpecRadioActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  fullSpecMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  fullSpecMetricPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fullSpecMetricText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  fullSpecStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  fullSpecStatusPillRed: {
    backgroundColor: "#fef2f2",
  },
  fullSpecStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  fullSpecStatusDotRed: {
    backgroundColor: "#ef4444",
  },
  fullSpecStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  fullSpecStatusTextRed: {
    color: "#dc2626",
  },
  fullSpecCapacityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 12,
  },
  fullSpecCapacityText: {
    flex: 1,
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 19,
    flexWrap: "wrap",
  },
  fullSpecFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  fullSpecPriceLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },
  fullSpecPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  fullSpecPriceAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  fullSpecPricePeriod: {
    fontSize: 11,
    color: "#64748b",
  },
  fullSpecActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  fullSpecActionBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  fullSpecActionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2563eb",
  },
  fullSpecActionBtnTextActive: {
    color: "#ffffff",
  },

  compactUnitCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  compactUnitCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#f8faff",
  },
  compactUnitThumbWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f1f5f9",
  },
  compactUnitThumbImg: {
    width: "100%",
    height: "100%",
  },
  compactUnitThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  compactUnitAreaBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  compactUnitAreaBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  compactUnitInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  compactUnitHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactUnitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 6,
  },
  compactUnitTitleActive: {
    color: "#1d4ed8",
  },
  compactUnitRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  compactUnitRadioActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  compactUnitSpecsWrap: {
    marginVertical: 3,
    gap: 2,
  },
  compactUnitSpecRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactUnitSpecText: {
    fontSize: 11,
    color: "#64748b",
    flex: 1,
  },
  compactUnitFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 2,
  },
  compactUnitPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  compactUnitPriceAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  compactUnitPricePeriod: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  compactUnitStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  compactUnitStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10b981",
  },
  compactUnitStatusText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
  },
  compactUnitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  compactUnitBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  compactUnitBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  compactUnitBtnTextActive: {
    color: "#ffffff",
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

  
});
