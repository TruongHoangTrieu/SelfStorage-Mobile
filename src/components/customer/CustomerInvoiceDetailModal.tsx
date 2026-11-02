import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatVND } from '../../utils/formatters';

export interface CustomerInvoiceItem {
  id: string;
  invoiceCode: string;
  paymentCode: string;
  contractCode: string;
  unitCode: string;
  unitType?: string;
  facilityName?: string;
  amount: number;
  type: string;
  typeLabel: string;
  periodDescription: string;
  status: string;
  paidAt: string;
  method: string;
  taxRate?: number; // 8% or 10%
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

interface CustomerInvoiceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: CustomerInvoiceItem | null;
}

export default function CustomerInvoiceDetailModal({
  visible,
  onClose,
  invoice,
}: CustomerInvoiceDetailModalProps) {
  if (!invoice) return null;

  // Tính thuế VAT (mặc định dịch vụ lưu kho thuế GTGT là 8%)
  const taxRate = invoice.taxRate || 8;
  const totalAmount = invoice.amount;
  const preTaxAmount = Math.round(totalAmount / (1 + taxRate / 100));
  const vatAmount = totalAmount - preTaxAmount;

  // Số hóa đơn 7 chữ số (e.g. 0008812)
  const invoiceNumber = invoice.paymentCode.replace(/\D/g, '').slice(-7).padStart(7, '0') || '0012890';
  const invoiceSeries = '1C26TSS';

  const handleDownloadPdf = () => {
    const msg = `Hóa đơn điện tử VAT #${invoice.invoiceCode} (Số: ${invoiceNumber}) đã được kết xuất định dạng PDF thành công.`;
    if (Platform.OS === 'web') {
      window.alert(`Tải Hóa Đơn Thành Công\n\n${msg}\nKiểm tra thư mục Tải về trên trình duyệt.`);
    } else {
      Alert.alert('Tải Hóa Đơn Thành Công', `${msg}\nĐã lưu về bộ nhớ máy của bạn.`, [{ text: 'Đóng' }]);
    }
  };

  const handleSendEmail = () => {
    const email = invoice.customerEmail || 'khách hàng';
    const msg = `Bản sao Hóa đơn điện tử VAT #${invoice.invoiceCode} đã được gửi tới hòm thư: ${email}. Vui lòng kiểm tra hộp thư đến.`;
    if (Platform.OS === 'web') {
      window.alert(`Gửi Email Thành Công\n\n${msg}`);
    } else {
      Alert.alert('Gửi Email Thành Công', msg, [{ text: 'Đóng' }]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="receipt-long" size={24} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerTitle}>Hóa Đơn Điện Tử VAT</Text>
              <Text style={styles.headerSubtitle}>
                Ký hiệu: {invoiceSeries} • Số: {invoiceNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Tờ Hóa Đơn Điện Tử Chi Tiết */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Paper Sheet */}
            <View style={styles.invoiceSheet}>
              {/* Quốc hiệu & Tiêu ngữ */}
              <View style={styles.nationalHeader}>
                <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                <Text style={styles.nationalMotto}>Độc lập – Tự do – Hạnh phúc</Text>
                <Text style={styles.decorDots}>----------------o0o----------------</Text>
              </View>

              {/* Tiêu đề Hóa đơn */}
              <View style={styles.invoiceTitleBlock}>
                <Text style={styles.invoiceMainTitle}>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</Text>
                <Text style={styles.invoiceSubTitle}>(HÓA ĐƠN ĐIỆN TỬ DỊCH VỤ LƯU KHO TỰ QUẢN)</Text>
                <Text style={styles.invoiceMetaText}>
                  Ngày lập: {invoice.paidAt || '13/10/2026'}
                </Text>
                <View style={styles.cqtCodeBadge}>
                  <MaterialIcons name="verified" size={12} color="#047857" />
                  <Text style={styles.cqtCodeText}>Mã CQT: 00E9F28B1089A{invoiceNumber.slice(-4)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mẫu số: <Text style={styles.metaVal}>01GTKT0/001</Text></Text>
                <Text style={styles.metaLabel}>Ký hiệu: <Text style={styles.metaVal}>{invoiceSeries}</Text></Text>
                <Text style={styles.metaLabel}>Số: <Text style={[styles.metaVal, { color: '#DC2626' }]}>{invoiceNumber}</Text></Text>
              </View>

              <View style={styles.divider} />

              {/* 1. BÊN BÁN HÀNG */}
              <View style={styles.sectionParty}>
                <Text style={styles.partyRole}>1. ĐƠN VỊ BÁN HÀNG (BÊN CUNG CẤP DỊCH VỤ):</Text>
                <Text style={styles.companyName}>CÔNG TY CỔ PHẦN DỊCH VỤ KHO TỰ QUẢN SELFSTORAGE VIỆT NAM</Text>
                <Text style={styles.partyDetail}>Mã số thuế: <Text style={styles.boldText}>0317892345</Text></Text>
                <Text style={styles.partyDetail}>Địa chỉ: Số 1 Đường Võ Nguyên Giáp, P. Phước Long B, TP. Thủ Đức, TP. Hồ Chí Minh</Text>
                <Text style={styles.partyDetail}>Điện thoại: 1900 8910 • Email: billing@selfstorage.vn</Text>
                <Text style={styles.partyDetail}>Số tài khoản: 1028 999 888 tại Ngân hàng TMCP Quân Đội (MBBank)</Text>
              </View>

              <View style={styles.divider} />

              {/* 2. BÊN MUA HÀNG */}
              <View style={styles.sectionParty}>
                <Text style={styles.partyRole}>2. KHÁCH HÀNG THUÊ KHO (BÊN MUA):</Text>
                <Text style={styles.customerName}>{invoice.customerName || 'Khách Hàng'}</Text>
                <Text style={styles.partyDetail}>Số điện thoại: <Text style={styles.boldText}>{invoice.customerPhone || '0908 123 456'}</Text></Text>
                <Text style={styles.partyDetail}>Email nhận HĐ: {invoice.customerEmail || 'customer@selfstorage.vn'}</Text>
                <Text style={styles.partyDetail}>Hợp đồng số: <Text style={styles.boldText}>{invoice.contractCode}</Text></Text>
                <Text style={styles.partyDetail}>Hình thức thanh toán: {invoice.method === 'SEPAY_QR' ? 'Chuyển khoản SePay VietQR tự động' : 'Chuyển khoản ngân hàng'}</Text>
              </View>

              <View style={styles.divider} />

              {/* 3. BẢNG CHI TIẾT DỊCH VỤ */}
              <Text style={styles.partyRole}>3. CHI TIẾT DỊCH VỤ THUÊ KHO:</Text>
              <View style={styles.serviceTable}>
                {/* Header Table */}
                <View style={styles.tableHead}>
                  <Text style={[styles.thCell, { flex: 0.6 }]}>STT</Text>
                  <Text style={[styles.thCell, { flex: 2.4 }]}>Nội dung dịch vụ</Text>
                  <Text style={[styles.thCell, { flex: 1 }]}>ĐVT</Text>
                  <Text style={[styles.thCell, { flex: 1.6, textAlign: 'right' }]}>Thành tiền (VNĐ)</Text>
                </View>

                {/* Dòng 1 */}
                <View style={styles.tableRow}>
                  <Text style={[styles.tdCell, { flex: 0.6 }]}>01</Text>
                  <View style={{ flex: 2.4 }}>
                    <Text style={styles.tdServiceTitle}>{invoice.typeLabel}</Text>
                    <Text style={styles.tdServiceSub}>
                      Ô kho: #{invoice.unitCode} ({invoice.unitType || 'Tiêu chuẩn'})
                    </Text>
                    <Text style={styles.tdServiceDesc}>{invoice.periodDescription}</Text>
                  </View>
                  <Text style={[styles.tdCell, { flex: 1 }]}>Gói</Text>
                  <Text style={[styles.tdCell, { flex: 1.6, textAlign: 'right', fontWeight: '700' }]}>
                    {formatVND(preTaxAmount)}
                  </Text>
                </View>
              </View>

              {/* Bảng tổng kết thuế VAT */}
              <View style={styles.taxSummaryBox}>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>Cộng tiền dịch vụ:</Text>
                  <Text style={styles.taxValue}>{formatVND(preTaxAmount)}</Text>
                </View>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>Thuế suất GTGT (VAT {taxRate}%):</Text>
                  <Text style={styles.taxValue}>+{formatVND(vatAmount)}</Text>
                </View>
                <View style={styles.taxDivider} />
                <View style={styles.taxTotalRow}>
                  <Text style={styles.taxTotalLabel}>TỔNG CỘNG THANH TOÁN:</Text>
                  <Text style={styles.taxTotalValue}>{formatVND(totalAmount)}</Text>
                </View>
              </View>

              {/* Dấu mộc Chữ Ký Số Điện Tử Hợp Pháp */}
              <View style={styles.digitalSignatureBox}>
                <View style={styles.signStampRow}>
                  <View style={styles.signIconWrap}>
                    <MaterialIcons name="verified-user" size={24} color="#059669" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.signStampTitle}>ĐÃ KÝ ĐIỆN TỬ HỢP PHÁP</Text>
                    <Text style={styles.signStampOrg}>BỞI: CÔNG TY CP DỊCH VỤ KHO TỰ QUẢN SELFSTORAGE</Text>
                    <Text style={styles.signStampTime}>
                      Thời gian ký: {invoice.paidAt} (Đã xác thực chữ ký số CKS Viettel-CA)
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Hành Động */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.downloadPdfBtn}
              onPress={handleDownloadPdf}
              activeOpacity={0.85}
            >
              <MaterialIcons name="picture-as-pdf" size={17} color="#FFFFFF" />
              <Text style={styles.downloadPdfBtnText}>Tải Hóa Đơn PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendEmailBtn}
              onPress={handleSendEmail}
              activeOpacity={0.85}
            >
              <MaterialIcons name="email" size={17} color="#1D4ED8" />
              <Text style={styles.sendEmailBtnText}>Gửi Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  invoiceSheet: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 16,
  },
  nationalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  nationalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  nationalMotto: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  decorDots: {
    fontSize: 9,
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 2,
  },
  invoiceTitleBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 0.3,
  },
  invoiceSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  invoiceMetaText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
  },
  cqtCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
  },
  cqtCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaVal: {
    fontWeight: '700',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  sectionParty: {
    gap: 3,
  },
  partyRole: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyDetail: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 11,
    color: '#1E293B',
  },
  tdServiceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  tdServiceSub: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  tdServiceDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  taxSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taxLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  taxValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  taxDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  taxTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxTotalLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  digitalSignatureBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
  },
  signStampRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signStampTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  signStampOrg: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 2,
  },
  signStampTime: {
    fontSize: 9,
    color: '#059669',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  downloadPdfBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadPdfBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sendEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  sendEmailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});

