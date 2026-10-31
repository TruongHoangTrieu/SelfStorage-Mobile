import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { T, formatVND } from "../bookingTypes";

interface Step3Props {
  qrData: {
    qrCodeUrl: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
  } | null;
  paymentTimeLeft: number;
  formatCountdown: (seconds: number) => string;
  copyToClipboard: (text: string, label: string) => void;
  checkingPayment: boolean;
  handleCheckPaymentStatus: () => void;
  onBack: () => void;
}

export default function Step3VietQRPayment({
  qrData,
  paymentTimeLeft,
  formatCountdown,
  copyToClipboard,
  checkingPayment,
  handleCheckPaymentStatus,
  onBack,
}: Step3Props) {
  return (
    <View style={{ flex: 1, position: "relative" }}>
      {/* Header */}
      <View style={s.step2Header}>
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
              LƯU Ý: Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự động xác nhận và giữ chỗ kho ngay lập tức.
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
    paddingVertical: 12,
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
  qrPendingBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  signContractBtn: {
    backgroundColor: T.secondary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signContractBtnText: {
    color: T.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
});

