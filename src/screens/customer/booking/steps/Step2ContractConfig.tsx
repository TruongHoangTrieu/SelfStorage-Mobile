import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { StorageDisplayItem, T, formatVND, calculateRentalDates } from "../bookingTypes";

interface Step2Props {
  selectedUnit: StorageDisplayItem;
  rentalTermMonths: 1 | 3 | 6 | 12;
  setRentalTermMonths: (months: 1 | 3 | 6 | 12) => void;
  moveInDateStr: string;
  setMoveInDateStr: (date: string) => void;
  calc: {
    ratePerMonth: number;
    discountPct: number;
    grossRent: number;
    discountSavings: number;
    totalRent: number;
    depositAmount: number;
  };
  submitting: boolean;
  handleSignContract: () => void;
  onBack: () => void;
}

export default function Step2ContractConfig({
  selectedUnit,
  rentalTermMonths,
  setRentalTermMonths,
  moveInDateStr,
  setMoveInDateStr,
  calc,
  submitting,
  handleSignContract,
  onBack,
}: Step2Props) {
  const insets = useSafeAreaInsets();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const rentalDates = useMemo(() => {
    return calculateRentalDates(moveInDateStr, rentalTermMonths);
  }, [moveInDateStr, rentalTermMonths]);

  const remainingAtCheckIn = Math.max(0, calc.totalRent - calc.depositAmount);

  const minMoveInDate = new Date();
  minMoveInDate.setDate(minMoveInDate.getDate() + 1);

  const handleDateValueChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setMoveInDateStr(selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

  return (
    <View style={{ flex: 1, position: "relative" }}>
      {/* Header Task-Focused Mode */}
      <View
        style={[
          s.step2Header,
          {
            paddingTop: Math.max(
              insets.top + 6,
              Platform.OS === "ios" ? 48 : 14
            ),
          },
        ]}
      >
        <View style={s.step2HeaderLeft}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={onBack}
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
            <Text style={s.unitNameText}>{selectedUnit.title}</Text>
            <Text style={s.unitAddressText}>
              {selectedUnit.locationText || "TP. Hồ Chí Minh"}
            </Text>

            {/* 3-Col Metric Grid: 100% Real API Data */}
            <View style={s.spec3Grid}>
              <View style={s.specCol}>
                <Text style={s.specLabel}>Diện tích sàn</Text>
                <Text style={s.specValBold}>
                  {selectedUnit.floorArea}
                </Text>
              </View>
              <View style={s.specCol}>
                <Text style={s.specLabel}>Tiền đặt cọc</Text>
                <Text style={s.specValBold}>
                  {formatVND(selectedUnit.depositAmount)}
                </Text>
              </View>
              <View style={s.specCol}>
                <Text style={s.specLabel}>Tình trạng</Text>
                <Text style={s.specValMed}>
                  {selectedUnit.badgeStatus}
                </Text>
              </View>
            </View>

            {/* Amenity Badges */}
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
          </View>

          {/* 2. Move-in Date Picker */}
          <TouchableOpacity
            style={[
              s.datePickerBox,
              showDatePicker && Platform.OS === "ios" && { borderColor: T.secondary, borderWidth: 1.5 },
            ]}
            onPress={() => setShowDatePicker((prev) => !prev)}
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
              name={showDatePicker ? "expand-less" : "edit-calendar"}
              size={22}
              color={T.secondary}
            />
          </TouchableOpacity>

          {showDatePicker && (
            Platform.OS === "ios" ? (
              <View style={s.inlineCalendarCard}>
                <View style={s.inlineCalendarHeader}>
                  <Text style={s.inlineCalendarTitle}>Chọn ngày nhận kho</Text>
                  <TouchableOpacity
                    style={s.inlineCalendarDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.inlineCalendarDoneText}>Xong</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={new Date(moveInDateStr)}
                  mode="date"
                  display="inline"
                  minimumDate={minMoveInDate}
                  onValueChange={handleDateValueChange}
                  onDismiss={handleDateDismiss}
                  locale="vi-VN"
                  themeVariant="light"
                  accentColor={T.secondary}
                />
              </View>
            ) : (
              <DateTimePicker
                value={new Date(moveInDateStr)}
                mode="date"
                display="default"
                minimumDate={minMoveInDate}
                onValueChange={handleDateValueChange}
                onDismiss={handleDateDismiss}
                locale="vi-VN"
              />
            )
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
                <Text style={s.termSubtitle}>Giá thuê / tháng</Text>
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
                  {formatVND(selectedUnit.monthlyBasePrice)}
                </Text>
                <Text style={s.termSubtitle}>Giá thuê / tháng</Text>
              </TouchableOpacity>

              {/* Option 3: 6 Months */}
              <TouchableOpacity
                style={[
                  s.termCard,
                  rentalTermMonths === 6 && s.termCardSelected,
                ]}
                onPress={() => setRentalTermMonths(6)}
                activeOpacity={0.85}
              >
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
                <Text style={s.termPrice}>
                  {formatVND(selectedUnit.monthlyBasePrice)}
                </Text>
                <Text style={s.termSubtitle}>Giá thuê / tháng</Text>
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
                  {formatVND(selectedUnit.monthlyBasePrice)}
                </Text>
                <Text style={s.termSubtitle}>Giá thuê / tháng</Text>
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

            {/* Date range box */}
            {rentalDates && (
              <View style={s.dateRangeBox}>
                <View style={s.dateRangeRow}>
                  <Text style={s.dateRangeLabel}>Ngày bắt đầu:</Text>
                  <Text style={s.dateRangeValue}>{rentalDates.startDateFormatted}</Text>
                </View>
                <View style={s.dateRangeDivider} />
                <View style={s.dateRangeRow}>
                  <Text style={s.dateRangeEndLabel}>Ngày kết thúc:</Text>
                  <Text style={s.dateRangeEndValue}>
                    {rentalDates.endDateFormatted} • 23:59
                  </Text>
                </View>
              </View>
            )}

            {/* Price lines */}
            <View style={s.costLinesList}>
              <View style={s.costLine}>
                <Text style={s.costLineLabel}>Giá thuê cơ bản:</Text>
                <Text style={s.costLineValue}>
                  {formatVND(selectedUnit.monthlyBasePrice)} / tháng
                </Text>
              </View>

              <View style={s.costLine}>
                <Text style={s.costLineLabel}>Thời gian thuê:</Text>
                <Text style={s.costLineValue}>
                  {rentalTermMonths} Tháng
                </Text>
              </View>

              <View
                style={[
                  s.costLine,
                  {
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#f1f5f9",
                  },
                ]}
              >
                <Text style={[s.costLineLabel, { fontWeight: "700", color: T.onSurface }]}>
                  Tổng tiền thuê ({rentalTermMonths} tháng):
                </Text>
                <Text
                  style={[
                    s.costLineValue,
                    { fontWeight: "800", color: T.secondary, fontSize: 15 },
                  ]}
                >
                  {formatVND(calc.totalRent)}
                </Text>
              </View>
            </View>

            {/* Deposit Box (Orange/Amber) */}
            <View style={s.depositOrangeBox}>
              <View style={s.depositOrangeTop}>
                <Text style={s.depositOrangeTitle}>
                  Tiền Cọc Giữ Chỗ (Nộp ngay):
                </Text>
                <Text style={s.depositOrangeAmount}>
                  {formatVND(calc.depositAmount)}
                </Text>
              </View>
              <View style={s.depositOrangeNoteRow}>
                <MaterialIcons name="check" size={14} color="#15803d" />
                <Text style={s.depositOrangeNoteText}>
                  Khấu trừ 100% vào tiền thuê khi ký hợp đồng nhận phòng
                </Text>
              </View>
            </View>

            {/* Remaining amount at check-in */}
            {remainingAtCheckIn === 0 ? (
              <View style={s.checkInZeroBox}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialIcons name="check-circle" size={15} color="#16a34a" />
                    <Text style={s.checkInZeroTitle}>
                      Thanh toán khi nhận kho: 0 đ
                    </Text>
                  </View>
                  <Text style={s.checkInZeroSub}>
                    Đã thanh toán trọn gói tháng đầu • Không phát sinh thêm phí
                  </Text>
                </View>
                <Text style={s.checkInZeroAmount}>0 đ</Text>
              </View>
            ) : (
              <View style={s.checkInRemainingBox}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.checkInRemainingTitle}>
                    Còn lại thanh toán khi nhận kho:
                  </Text>
                  <Text style={s.checkInRemainingSub}>
                    (Tổng tiền thuê - Tiền cọc đã nộp)
                  </Text>
                </View>
                <Text style={s.checkInRemainingAmount}>
                  {formatVND(remainingAtCheckIn)}
                </Text>
              </View>
            )}

            {/* Non-refundable disclaimer note */}
            <Text style={s.disclaimerText}>
              * Tiền cọc giữ chỗ được trừ trực tiếp vào tiền thuê khi ký hợp đồng và không hoàn lại nếu quý khách hủy đơn.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[s.stickyBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
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
            <Text style={s.signContractBtnText}>
              Xác nhận & Đặt cọc giữ kho
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  step2Header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  step2HeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  step2HeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.onSurface,
  },
  step2HeaderSub: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    marginTop: 1,
  },
  hotlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  hotlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.secondary,
  },
  progressTrackerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  progressItem: {
    flex: 1,
    gap: 4,
  },
  progressBarActive: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.secondary,
  },
  progressBarInactive: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
  },
  progressTextActive: {
    fontSize: 11,
    fontWeight: "600",
    color: T.secondary,
  },
  progressTextInactive: {
    fontSize: 11,
    color: T.outline,
  },
  step2Card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  lockedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.onSecondaryFixed,
  },
  unitNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: T.onSurface,
    marginBottom: 2,
  },
  unitAddressText: {
    fontSize: 12,
    color: T.onSurfaceVariant,
    marginBottom: 14,
  },
  spec3Grid: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 10,
  },
  specCol: {
    flex: 1,
    alignItems: "center",
  },
  specLabel: {
    fontSize: 10,
    color: T.outline,
    marginBottom: 2,
  },
  specValBold: {
    fontSize: 13,
    fontWeight: "800",
    color: T.onSurface,
  },
  specValMed: {
    fontSize: 11,
    fontWeight: "600",
    color: T.onSurface,
  },
  amenityBadgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  blueAmenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  grayAmenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  blueAmenityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  grayAmenityText: {
    fontSize: 11,
    fontWeight: "500",
    color: T.onSurface,
  },
  datePickerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inlineCalendarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginTop: -4,
  },
  inlineCalendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 6,
  },
  inlineCalendarTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.onSurface,
  },
  inlineCalendarDoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
  },
  inlineCalendarDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.secondary,
  },
  dateLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateCalBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  dateCalMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  dateCalDay: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1d4ed8",
    lineHeight: 18,
  },
  dateMainText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.onSurface,
  },
  dateSubText: {
    fontSize: 11,
    color: T.outline,
    marginTop: 1,
  },
  cardSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: T.onSurface,
  },
  savePill: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b45309",
  },
  termGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  termCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  termCardSelected: {
    borderColor: T.secondary,
    backgroundColor: "#f0f7ff",
  },
  termCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  termMonths: {
    fontSize: 13,
    fontWeight: "600",
    color: T.onSurface,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
  },
  radioCircleSelected: {
    borderColor: T.secondary,
    borderWidth: 5,
    backgroundColor: "#ffffff",
  },
  termPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: T.onSurface,
  },
  termSubtitle: {
    fontSize: 10,
    color: T.outline,
  },
  discountRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  discountRateBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recommendedBadge: {
    position: "absolute",
    top: -9,
    right: 8,
    backgroundColor: T.secondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  costBreakdownHeader: {
    marginBottom: 12,
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: T.outline,
    marginTop: 2,
    marginLeft: 30,
  },
  costLinesList: {
    gap: 8,
  },
  costLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLineLabel: {
    fontSize: 12,
    color: T.onSurfaceVariant,
  },
  costLineValue: {
    fontSize: 12,
    color: T.onSurface,
  },
  dateRangeBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginBottom: 12,
    gap: 6,
  },
  dateRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateRangeLabel: {
    fontSize: 12,
    color: "#475569",
  },
  dateRangeValue: {
    fontSize: 12,
    fontWeight: "700",
    color: T.onSurface,
  },
  dateRangeDivider: {
    height: 1,
    backgroundColor: "#dbeafe",
  },
  dateRangeEndLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e40af",
  },
  dateRangeEndValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  depositOrangeBox: {
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginTop: 10,
    gap: 4,
  },
  depositOrangeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  depositOrangeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7c2d12",
  },
  depositOrangeAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ea580c",
  },
  depositOrangeNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  depositOrangeNoteText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#15803d",
    flex: 1,
  },
  checkInZeroBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  checkInZeroTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065f46",
  },
  checkInZeroSub: {
    fontSize: 9.5,
    color: "#047857",
    marginTop: 2,
  },
  checkInZeroAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#047857",
  },
  checkInRemainingBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  checkInRemainingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  checkInRemainingSub: {
    fontSize: 9.5,
    color: "#64748b",
    marginTop: 2,
  },
  checkInRemainingAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: T.onSurface,
  },
  disclaimerText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 14,
    fontStyle: "italic",
  },
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stickyLabel: {
    fontSize: 11,
    color: T.outline,
  },
  stickyGrandTotal: {
    fontSize: 20,
    fontWeight: "900",
  },
  sslBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sslText: {
    fontSize: 10,
    fontWeight: "700",
    color: T.secondary,
  },
  signContractBtn: {
    backgroundColor: T.secondary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signContractBtnText: {
    color: T.onPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
});

