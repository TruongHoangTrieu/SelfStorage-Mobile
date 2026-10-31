import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Reservation } from "../../../../api";
import { StorageDisplayItem, T, formatVND } from "../bookingTypes";

interface Step4Props {
  selectedUnit: StorageDisplayItem;
  confirmedReservation: Reservation | null;
  depositAmount: number;
  moveInDateStr: string;
  appointmentTimeSlot: string;
  rentalTermMonths: number;
  onNavigateToMyReservations: () => void;
  onBookAnother: () => void;
}

export default function Step4BookingSuccess({
  selectedUnit,
  confirmedReservation,
  depositAmount,
  moveInDateStr,
  appointmentTimeSlot,
  rentalTermMonths,
  onNavigateToMyReservations,
  onBookAnother,
}: Step4Props) {
  return (
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
          <View style={s.depositSuccessHeader}>
            <MaterialIcons name="check-circle" size={18} color={T.green} />
            <Text style={s.depositSuccessTitle}>
              ĐÃ THANH TOÁN TIỀN CỌC GIỮ CHỖ
            </Text>
          </View>
          <Text style={s.depositSuccessAmount}>
            {formatVND(depositAmount)}
          </Text>
          <Text style={s.depositSuccessSub}>
            Biên nhận cọc đã được lưu vào hệ thống. Buồng kho đã được khóa giữ chỗ cho bạn.
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
              {formatVND(depositAmount)}
            </Text>
          </View>
        </View>

        {/* Instruction Note */}
        <View style={s.instructionCard}>
          <MaterialIcons name="info-outline" size={20} color={T.blue} />
          <Text style={s.instructionText}>
            Vui lòng mang theo CCCD/VNeID đến chi nhánh vào ngày hẹn để nhân viên hỗ trợ đối chiếu, bàn giao ô kho thực tế và cấp mã mở khóa Smart Key 24/7.
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={s.manageBookingBtn}
          onPress={onNavigateToMyReservations}
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
          onPress={onBookAnother}
          activeOpacity={0.8}
        >
          <Text style={s.bookAnotherBtnText}>
            Đặt Thêm Buồng Kho Khác
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  depositSuccessHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
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
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: "100%",
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
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
    fontSize: 13,
    fontWeight: "700",
    color: T.onSurfaceVariant,
  },
});

