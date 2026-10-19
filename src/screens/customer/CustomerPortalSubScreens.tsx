import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { CustomerRentedUnit, CustomerUser } from '../../types/customerStorage';
import { formatVND } from '../../utils/formatters';

// ==========================================
// 1. MÀN HÌNH THANH TOÁN & HÓA ĐƠN (LUỒNG 4)
// ==========================================
interface CustomerPaymentsScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar: () => void;
}

export function CustomerPaymentsScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
}: CustomerPaymentsScreenProps) {
  const allPayments = units.flatMap((u) =>
    (u.payments || []).map((p) => ({ ...p, unitCode: u.unitCode, contractCode: u.contractCode }))
  );

  const totalPaid = units.reduce((acc, u) => acc + (u.totalPaid || 0), 0);
  const totalDeposit = units.reduce((acc, u) => acc + (u.depositAmount || 0), 0);

  const handleDownloadInvoice = (code: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Đã xuất hóa đơn điện tử VAT cho giao dịch #${code}. File PDF đã được gửi về email.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>TÀI CHÍNH & HÓA ĐƠN</Text>
          <Text style={styles.headerTitle}>Lịch Sử Thanh Toán</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Metric Cards */}
        <View style={styles.metricGrid}>
          <View style={[styles.metricCard, { borderColor: '#10B981' }]}>
            <Text style={styles.metricLabel}>ĐÃ THANH TOÁN</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>{formatVND(totalPaid)}</Text>
            <Text style={styles.metricNote}>Gồm tiền thuê & cọc</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#3B82F6' }]}>
            <Text style={styles.metricLabel}>TIỀN CỌC ĐANG GIỮ</Text>
            <Text style={[styles.metricValue, { color: '#38BDF8' }]}>{formatVND(totalDeposit)}</Text>
            <Text style={styles.metricNote}>Hoàn trả khi trả kho</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#6366F1' }]}>
            <Text style={styles.metricLabel}>TRẠNG THÁI CƯỚC</Text>
            <Text style={[styles.metricValue, { color: '#818CF8' }]}>0 đ</Text>
            <Text style={styles.metricNote}>Không có nợ quá hạn</Text>
          </View>
        </View>

        {/* Cổng thanh toán SePay QR info */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Tích hợp Cổng SePay QR Tự Động</Text>
            <Text style={styles.infoBannerDesc}>
              Mọi giao dịch thanh toán tiền thuê hoặc gia hạn được gạch nợ tự động trong 3 giây.
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Các Giao Dịch Gần Đây ({allPayments.length})</Text>

        {allPayments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có giao dịch phát sinh</Text>
          </View>
        ) : (
          allPayments.map((p) => (
            <View key={p.id} style={styles.paymentCard}>
              <View style={styles.paymentCardHeader}>
                <View>
                  <Text style={styles.paymentTypeLabel}>{p.typeLabel}</Text>
                  <Text style={styles.paymentSubCode}>
                    HĐ: #{p.contractCode.slice(-6)} • Ô: {p.unitCode} • Mã: {p.paymentCode}
                  </Text>
                </View>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>✓ ĐÃ NỘP</Text>
                </View>
              </View>

              <View style={styles.paymentCardBody}>
                <Text style={styles.paymentAmount}>{formatVND(p.amount)}</Text>
                <Text style={styles.paymentDate}>📅 {p.paidAt}</Text>
              </View>

              <Text style={styles.paymentDesc}>{p.periodDescription}</Text>

              <View style={styles.paymentCardFooter}>
                <Text style={styles.paymentMethodText}>Phương thức: Cổng thanh toán {p.method}</Text>
                <TouchableOpacity
                  style={styles.invoiceBtn}
                  onPress={() => handleDownloadInvoice(p.paymentCode)}
                >
                  <Text style={styles.invoiceBtnText}>📄 Tải HĐ VAT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 2. MÀN HÌNH TRUY CẬP & BẢO MẬT (SMART PIN)
// ==========================================
interface CustomerAccessScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar: () => void;
  onOpenGuestPin: (unit: CustomerRentedUnit) => void;
  onOpenChangePin: (unit: CustomerRentedUnit) => void;
}

export function CustomerAccessScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
  onOpenGuestPin,
  onOpenChangePin,
}: CustomerAccessScreenProps) {
  const [pinVisibility, setPinVisibility] = useState<Record<string, boolean>>({});

  const togglePin = (unitId: string) => {
    setPinVisibility((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>AN NINH & KHÓA ĐIỆN TỬ</Text>
          <Text style={styles.headerTitle}>Truy Cập & Smart Key</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.securityBanner}>
          <Text style={styles.securityBannerIcon}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityBannerTitle}>Bảo Mật Cấp Độ Cao 24/7</Text>
            <Text style={styles.securityBannerDesc}>
              Khóa Smart Lock được kết nối IoT thời gian thực. Mỗi lần mở cửa đều được ghi log bảo vệ tài sản của bạn.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mã PIN Chính Từng Ô Kho ({units.length})</Text>

        {units.map((u) => {
          const isShow = pinVisibility[u.id];
          return (
            <View key={u.id} style={styles.unitAccessCard}>
              <View style={styles.unitAccessHeader}>
                <View>
                  <Text style={styles.unitAccessCode}>Ô {u.unitCode} • {u.unitName}</Text>
                  <Text style={styles.unitAccessLocation}>
                    {u.facilityName} ({u.floor})
                  </Text>
                </View>
                <View style={styles.batteryBadge}>
                  <Text style={styles.batteryBadgeText}>🔋 Pin Khóa 95%</Text>
                </View>
              </View>

              <View style={styles.pinBox}>
                <View>
                  <Text style={styles.pinBoxLabel}>MÃ SMART PIN CHỦ</Text>
                  <Text style={styles.pinBoxNumber}>{isShow ? u.masterPin : '••••••'}</Text>
                </View>
                <TouchableOpacity style={styles.peekBtn} onPress={() => togglePin(u.id)}>
                  <Text style={styles.peekBtnText}>{isShow ? 'Ẩn 🙈' : 'Xem 👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accessActionRow}>
                <TouchableOpacity
                  style={styles.changePinActionBtn}
                  onPress={() => onOpenChangePin(u)}
                >
                  <Text style={styles.changePinActionText}>🔑 Đổi Mã PIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createGuestActionBtn}
                  onPress={() => onOpenGuestPin(u)}
                >
                  <Text style={styles.createGuestActionText}>⏱️ + Tạo Mã Cho Khách</Text>
                </TouchableOpacity>
              </View>

              {/* Danh sách mã khách của ô này */}
              {u.guestAccessCodes && u.guestAccessCodes.length > 0 && (
                <View style={styles.guestCodeSection}>
                  <Text style={styles.guestCodeTitle}>
                    Mã khách đang hiệu lực ({u.guestAccessCodes.length}):
                  </Text>
                  {u.guestAccessCodes.map((g) => (
                    <View key={g.id} style={styles.guestCodeItem}>
                      <View>
                        <Text style={styles.guestCodeName}>👤 {g.guestName}</Text>
                        <Text style={styles.guestCodeExpiry}>Hạn dùng: {g.validTo}</Text>
                      </View>
                      <View style={styles.guestPinBadge}>
                        <Text style={styles.guestPinBadgeText}>{g.pinCode}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 3. MÀN HÌNH TÀI LIỆU & HỢP ĐỒNG
// ==========================================
interface CustomerDocumentsScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar: () => void;
}

export function CustomerDocumentsScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
}: CustomerDocumentsScreenProps) {
  const handleViewDoc = (name: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Đang mở bản xem trước tài liệu "${name}" có chữ ký điện tử.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>HỒ SƠ PHÁP LÝ</Text>
          <Text style={styles.headerTitle}>Tài Liệu & Hợp Đồng</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Hợp Đồng Thuê Kho Điện Tử</Text>

        {units.map((u) => (
          <View key={u.id} style={styles.docCard}>
            <View style={styles.docCardHeader}>
              <Text style={styles.docIcon}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Hợp Đồng Thuê Ô {u.unitCode}</Text>
                <Text style={styles.docCode}>Mã: #{u.contractCode} • {u.unitName}</Text>
                <Text style={styles.docDates}>Thời hạn: {u.startDate} → {u.endDate}</Text>
              </View>
              <View style={styles.signedBadge}>
                <Text style={styles.signedBadgeText}>✓ ĐÃ KÝ SỐ</Text>
              </View>
            </View>

            <View style={styles.docItemList}>
              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Hợp Đồng Điện Tử ${u.contractCode}`)}
              >
                <Text style={styles.docItemText}>📑 Hợp đồng thuê kho tự quản (PDF có dấu)</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Biên Bản Bàn Giao Ô ${u.unitCode}`)}
              >
                <Text style={styles.docItemText}>📋 Biên bản nghiệm thu bàn giao & cấp mã PIN</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docItemRow}
                onPress={() => handleViewDoc(`Chứng Nhận Bảo Hiểm Ô ${u.unitCode}`)}
              >
                <Text style={styles.docItemText}>🛡️ Giấy chứng nhận bảo hiểm tài sản PCCC</Text>
                <Text style={styles.docItemAction}>Xem / Tải →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 4. MÀN HÌNH HỖ TRỢ & TRỢ GIÚP (LUỒNG 7)
// ==========================================
interface CustomerSupportScreenProps {
  units: CustomerRentedUnit[];
  onBackToUnits: () => void;
  onOpenSidebar: () => void;
  onOpenReportIssue: (unit: CustomerRentedUnit) => void;
}

export function CustomerSupportScreen({
  units,
  onBackToUnits,
  onOpenSidebar,
  onOpenReportIssue,
}: CustomerSupportScreenProps) {
  const allTickets = units.flatMap((u) =>
    (u.supportTickets || []).map((t) => ({ ...t, unitCode: u.unitCode }))
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>TRUNG TÂM CSKH 24/7</Text>
          <Text style={styles.headerTitle}>Hỗ Trợ & Sự Cố</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hotline Bar */}
        <View style={styles.hotlineBox}>
          <View style={styles.hotlineLeft}>
            <Text style={styles.hotlineIcon}>📞</Text>
            <View>
              <Text style={styles.hotlineLabel}>ĐƯỜNG DÂY NÓNG KHẨN CẤP (24/7)</Text>
              <Text style={styles.hotlineNumber}>1900 6868</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              if (Platform.OS === 'web') window.alert('Đang kết nối tổng đài viên CSKH 1900 6868...');
            }}
          >
            <Text style={styles.callBtnText}>Gọi Ngay</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Report Issue Button */}
        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => {
            if (units.length > 0) onOpenReportIssue(units[0]);
          }}
        >
          <Text style={styles.newTicketBtnIcon}>🛠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.newTicketBtnTitle}>Tạo Phiếu Báo Cố Mới</Text>
            <Text style={styles.newTicketBtnDesc}>
              Báo kẹt khóa Smart Lock, đèn hỏng, ẩm ướt, yêu cầu kỹ thuật tại chỗ
            </Text>
          </View>
          <Text style={styles.newTicketArrow}>→</Text>
        </TouchableOpacity>

        {/* Tickets List */}
        <Text style={styles.sectionTitle}>Các Phiếu Yêu Cầu Của Bạn ({allTickets.length})</Text>

        {allTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Hiện tại không có sự cố nào đang chờ xử lý.</Text>
          </View>
        ) : (
          allTickets.map((t) => (
            <View key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketCardHeader}>
                <View>
                  <Text style={styles.ticketSubject}>{t.subject}</Text>
                  <Text style={styles.ticketMeta}>
                    Mã #{t.requestCode} • Ô {t.unitCode} • Ngày tạo: {t.createdAt}
                  </Text>
                </View>
                <View
                  style={[
                    styles.ticketStatusBadge,
                    t.status === 'RESOLVED' && { backgroundColor: '#065F46' },
                  ]}
                >
                  <Text style={styles.ticketStatusText}>
                    {t.status === 'RESOLVED' ? '✓ ĐÃ XỬ LÝ' : '⏳ ĐANG XỬ LÝ'}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketDesc}>{t.description}</Text>

              {t.resolutionNotes && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>Kỹ thuật viên phản hồi:</Text>
                  <Text style={styles.resolutionText}>{t.resolutionNotes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ==========================================
// 5. MÀN HÌNH HỒ SƠ & CÀI ĐẶT
// ==========================================
interface CustomerProfileScreenProps {
  currentUser: CustomerUser;
  onBackToUnits: () => void;
  onOpenSidebar: () => void;
}

export function CustomerProfileScreen({
  currentUser,
  onBackToUnits,
  onOpenSidebar,
}: CustomerProfileScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>CÀI ĐẶT TÀI KHOẢN</Text>
          <Text style={styles.headerTitle}>Hồ Sơ Cá Nhân</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToUnits}>
          <Text style={styles.backBtnText}>Ô kho →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: currentUser.avatar }} style={styles.profileAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{currentUser.fullName}</Text>
            <Text style={styles.profileEmail}>{currentUser.email}</Text>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>⭐ {currentUser.membershipTier}</Text>
            </View>
          </View>
        </View>

        {/* Detailed Fields */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldSectionTitle}>Thông Tin Định Danh Khách Hàng</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Số điện thoại:</Text>
            <Text style={styles.fieldValue}>{currentUser.phone}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>CCCD / Hộ chiếu:</Text>
            <Text style={styles.fieldValue}>079095012345 (Đã định danh eKYC)</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Địa chỉ liên hệ:</Text>
            <Text style={styles.fieldValue}>25 Đường Số 7, P. Linh Trung, Thủ Đức</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Ngày gia nhập:</Text>
            <Text style={styles.fieldValue}>{currentUser.joinedDate}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricNote: {
    color: '#64748B',
    fontSize: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0C4A6E',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  infoBannerIcon: {
    fontSize: 24,
  },
  infoBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  infoBannerDesc: {
    color: '#BAE6FD',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  paymentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentTypeLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentSubCode: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paidBadgeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
  },
  paymentCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentAmount: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '900',
  },
  paymentDate: {
    color: '#94A3B8',
    fontSize: 11,
  },
  paymentDesc: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  paymentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  paymentMethodText: {
    color: '#64748B',
    fontSize: 10,
  },
  invoiceBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  invoiceBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#064E3B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  securityBannerIcon: {
    fontSize: 24,
  },
  securityBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  securityBannerDesc: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  unitAccessCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  unitAccessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  unitAccessCode: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  unitAccessLocation: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  batteryBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batteryBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  pinBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinBoxLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  pinBoxNumber: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 2,
  },
  peekBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  peekBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  accessActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  changePinActionBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePinActionText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  createGuestActionBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  createGuestActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  guestCodeSection: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 8,
  },
  guestCodeTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  guestCodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
  },
  guestCodeName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  guestCodeExpiry: {
    color: '#64748B',
    fontSize: 10,
  },
  guestPinBadge: {
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  guestPinBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  docCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIcon: {
    fontSize: 26,
  },
  docTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  docCode: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  docDates: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  signedBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signedBadgeText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '900',
  },
  docItemList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  docItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  docItemText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  docItemAction: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  hotlineBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#831843',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BE185D',
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hotlineIcon: {
    fontSize: 24,
  },
  hotlineLabel: {
    color: '#FBCFE8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hotlineNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  callBtn: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  newTicketBtnIcon: {
    fontSize: 24,
  },
  newTicketBtnTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  newTicketBtnDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  newTicketArrow: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  ticketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketSubject: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  ticketMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  ticketStatusBadge: {
    backgroundColor: '#854D0E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketStatusText: {
    color: '#FEF08A',
    fontSize: 9,
    fontWeight: '800',
  },
  ticketDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  resolutionBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  resolutionLabel: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  resolutionText: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  vipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  vipBadgeText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
  },
  fieldSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  fieldSectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  fieldValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  roleSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
    marginTop: 8,
  },
  roleSwitchIcon: {
    fontSize: 24,
  },
  roleSwitchTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  roleSwitchDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  roleSwitchArrow: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
});
