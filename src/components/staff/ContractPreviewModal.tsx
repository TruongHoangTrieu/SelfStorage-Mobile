import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckInAppointment } from '../../types/handover';

interface ContractPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  appointment?: CheckInAppointment | null;
  assignedUnitCode?: string;
}

export default function ContractPreviewModal({
  visible,
  onClose,
  appointment,
  assignedUnitCode,
}: ContractPreviewModalProps) {
  if (!appointment) return null;

  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = String(today.getFullYear());

  const finalUnit = assignedUnitCode || appointment.assignedUnit || 'A-101';
  const cleanId = (appointment.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const contractNumber = appointment.contractCode || `SS-HĐ-${cleanId}/${yearStr}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.headerTitleRow}>
                <MaterialIcons name="description" size={20} color="#1D4ED8" />
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  HỢP ĐỒNG CHO THUÊ KHO BÃI
                </Text>
              </View>
              <Text style={styles.modalHeaderSub}>
                Mẫu số 01/HĐ-TK • {contractNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Contract Content (Đúng mẫu pháp lý chuẩn như trên Web FE) */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollPadding}
            showsVerticalScrollIndicator={true}
          >
            {/* Paper Document */}
            <View style={styles.paperSheet}>
              {/* 1. Quốc hiệu & Tiêu ngữ */}
              <View style={styles.nationalHeader}>
                <Text style={styles.countryName}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                <Text style={styles.motto}>Độc lập – Tự do – Hạnh phúc</Text>
                <Text style={styles.decorLine}>----------------o0o----------------</Text>
              </View>

              {/* 2. Tiêu đề Hợp đồng */}
              <View style={styles.titleSection}>
                <Text style={styles.contractMainTitle}>
                  HỢP ĐỒNG CHO THUÊ NHÀ XƯỞNG VÀ KHO BÃI
                </Text>
                <Text style={styles.contractCodeNumber}>Số: {contractNumber}</Text>
                <Text style={styles.dateLocationText}>
                  Hôm nay, ngày {dayStr} tháng {monthStr} năm {yearStr}, tại Trụ sở Ban Quản lý Cơ sở Kho Tự Quản SelfStorage:
                </Text>
                <Text style={styles.addressLocationText}>
                  Địa điểm ký kết: {appointment.facilityAddress || 'Cơ sở kho tự quản SelfStorage'}
                </Text>
              </View>

              <Text style={styles.introLeadText}>
                Chúng tôi gồm có các bên dưới đây:
              </Text>

              {/* 3. BÊN CHO THUÊ (BÊN A) */}
              <View style={styles.partyBox}>
                <Text style={styles.partyBoxTitle}>
                  BÊN CHO THUÊ NHÀ XƯỞNG VÀ KHO BÃI (GỌI TẮT LÀ BÊN A):
                </Text>
                <View style={styles.partyInfoList}>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Tên tổ chức: </Text>
                    <Text style={styles.boldText}>CÔNG TY CỔ PHẦN DỊCH VỤ LƯU TRỮ VÀ KHO TỰ QUẢN SELFSTORAGE VIỆT NAM</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Địa chỉ trụ sở chính: </Text>
                    Tòa nhà Landmark 81, 720A Điện Biên Phủ, P. 22, Q. Bình Thạnh
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Giấy phép ĐKKD số: </Text>
                    <Text style={styles.boldText}>0316899988</Text> (Sở KH&ĐT cấp)
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Mã số thuế: </Text>
                    <Text style={styles.boldText}>0316899988</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Người đại diện: </Text>
                    <Text style={styles.boldText}>Ban Quản Lý Cơ Sở Kho Bãi</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Chức vụ: </Text>
                    Đại diện vận hành & Bàn giao
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Điện thoại hotline: </Text>
                    <Text style={styles.boldText}>1900 6868</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Email: </Text>
                    contact@selfstorage.vn
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Tài khoản thanh toán: </Text>
                    <Text style={styles.boldText}>0900000000</Text> tại Ngân hàng TMCP Quân Đội (MBBank)
                  </Text>
                </View>
              </View>

              {/* 4. BÊN THUÊ KHO (BÊN B) */}
              <View style={styles.partyBox}>
                <Text style={styles.partyBoxTitle}>
                  BÊN THUÊ NHÀ XƯỞNG VÀ KHO BÃI (GỌI TẮT LÀ BÊN B):
                </Text>
                <View style={styles.partyInfoList}>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Họ và tên khách hàng: </Text>
                    <Text style={styles.boldText}>{appointment.customerName}</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Mã đặt chỗ / Hồ sơ: </Text>
                    <Text style={styles.boldText}>{appointment.contractCode || appointment.id}</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Số điện thoại: </Text>
                    <Text style={styles.boldText}>{appointment.phone}</Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>CCCD / Hộ chiếu: </Text>
                    <Text style={styles.boldText}>
                      {appointment.identityNumber || appointment.idCard || 'Đã đối chiếu thực tế tại quầy'}
                    </Text>
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Thư điện tử (Email): </Text>
                    {appointment.email || 'Chưa cung cấp'}
                  </Text>
                  <Text style={styles.infoLine}>
                    <Text style={styles.label}>Địa chỉ liên hệ: </Text>
                    {appointment.facilityAddress || 'Việt Nam'}
                  </Text>
                </View>
              </View>

              <Text style={styles.agreementLeadText}>
                Sau khi cùng nhau bàn bạc, thỏa thuận trên tinh thần tự nguyện, bình đẳng và tuân thủ quy định pháp luật, hai Bên thống nhất ký kết Hợp đồng cho thuê nhà xưởng và kho bãi với các điều khoản chi tiết sau đây:
              </Text>

              {/* 5. CÁC ĐIỀU KHOẢN HỢP ĐỒNG */}
              <View style={styles.articlesContainer}>
                {/* ĐIỀU 1 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 1. ĐỐI TƯỢNG VÀ NỘI DUNG HỢP ĐỒNG</Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>1.1. </Text>
                    Bên A đồng ý cho thuê và Bên B đồng ý thuê phần diện tích kho bãi tự quản mang mã định danh duy nhất: <Text style={styles.boldText}>Ô #{finalUnit}</Text>, bố trí tại <Text style={styles.boldText}>{appointment.preferredFloor || 'Tầng 1'}</Text>, thuộc cơ sở <Text style={styles.boldText}>{appointment.facilityName || 'Cơ sở chính'}</Text> (Địa chỉ: {appointment.facilityAddress || 'Hệ thống kho SelfStorage'}).
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>1.2. </Text>
                    Quy cách ngăn kho: Loại hình {appointment.unitType}, diện tích sử dụng <Text style={styles.boldText}>{appointment.unitSize}</Text>, chiều cao trần 2.8m. Kết cấu ngăn vách tiêu chuẩn chịu lực, bề mặt khô ráo, trang bị hệ thống thông gió/điều hòa nhiệt độ & độ ẩm tự động, hệ thống PCCC đạt chuẩn và camera AI an ninh giám sát 24/7.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>1.3. Mục đích sử dụng: </Text>
                    {appointment.purpose || 'Lưu trữ đồ đạc cá nhân và hàng hóa hợp pháp'}. Bên B cam kết chỉ sử dụng kho cho mục đích lưu giữ đồ đạc, tài sản và hàng hóa hợp pháp. Tuyệt đối không lưu trữ hàng cấm, vũ khí, chất cháy nổ, hóa chất độc hại, động vật sống hoặc các chất bị cấm theo quy định của pháp luật Việt Nam.
                  </Text>
                </View>

                {/* ĐIỀU 2 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 2. THỜI HẠN CỦA HỢP ĐỒNG VÀ GIA HẠN</Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>2.1. </Text>
                    Thời hạn thuê kho là <Text style={styles.boldText}>{appointment.durationMonths || 1} tháng</Text>, bắt đầu tính từ ngày <Text style={styles.boldText}>{appointment.startDate || 'Hôm nay'}</Text> đến hết ngày kết thúc hợp đồng theo biên lai thanh toán.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>2.2. </Text>
                    Khi hết hạn hợp đồng, tùy theo nhu cầu thực tế hai Bên có thể thỏa thuận ký gia hạn hợp đồng hoặc gia hạn tự động thông qua Cổng quản lý khách hàng (Customer Portal).
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>2.3. </Text>
                    Trường hợp một trong hai bên có nhu cầu chấm dứt hợp đồng trước thời hạn thì phải thông báo bằng văn bản hoặc thông báo trên ứng dụng cho bên kia biết trước ít nhất <Text style={styles.boldText}>30 ngày</Text>.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>2.4. </Text>
                    Trong trường hợp hợp đồng kết thúc, Bên A có trách nhiệm hoàn lại tiền đặt cọc cho Bên B sau khi đã khấu trừ các khoản phí hợp lệ; Bên B có trách nhiệm dọn sạch tài sản và bàn giao ngăn kho nguyên trạng.
                  </Text>
                </View>

                {/* ĐIỀU 3 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 3. GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>3.1. Giá thuê kho: </Text>
                    <Text style={[styles.boldText, { color: '#1D4ED8' }]}>{appointment.monthlyRent}</Text> (Đã bao gồm thuế GTGT 10%, phí an ninh giám sát 24/7 và phí quản lý bảo trì cơ sở).
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>3.2. Tiền đặt cọc bảo đảm: </Text>
                    <Text style={[styles.boldText, { color: '#15803D' }]}>{appointment.depositAmount}</Text> (Tương đương 100% tiền đặt cọc quy định). Bên B đã hoàn tất thanh toán khoản tiền cọc này qua cổng thanh toán trực tuyến.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>3.3. Phương thức thanh toán: </Text>
                    Thanh toán chuyển khoản tự động qua hệ thống mã VietQR/SePay hoặc thẻ tín dụng. Kỳ thanh toán vào ngày đầu mỗi chu kỳ thuê. Bên A có trách nhiệm xuất hóa đơn điện tử VAT hợp pháp cho Bên B.
                  </Text>
                </View>

                {/* ĐIỀU 4 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 4. QUẢN LÝ KHÓA THÔNG MINH (SMART LOCK IOT) & TRUY CẬP</Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>4.1. </Text>
                    Ngăn kho được trang bị khóa điện tử thông minh Keypad Smart Lock. Bên B được quyền ra vào cơ sở và mở khóa kho 24/7 bằng mã số điện tử cá nhân hoặc Thẻ từ RFID.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>4.2. Mã số mở khóa ban đầu: </Text>
                    <Text style={[styles.boldText, styles.pinHighlight]}>{appointment.accessPin || '682914'}</Text>. Bên B có toàn quyền chủ động tự thay đổi mã số này trên ứng dụng bất kỳ lúc nào.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>4.3. </Text>
                    Bên B có nghĩa vụ tự bảo mật mã khóa của mình. Bên A không giữ chìa khóa dự phòng và không can thiệp vào bên trong kho của Bên B trừ trường hợp khẩn cấp về an toàn PCCC hoặc theo yêu cầu bằng văn bản của cơ quan pháp luật có thẩm quyền.
                  </Text>
                </View>

                {/* ĐIỀU 5 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 5. TRÁCH NHIỆM VÀ NGHĨA VỤ CỦA HAI BÊN</Text>
                  <Text style={styles.subClauseTitle}>5.1. Trách nhiệm của Bên A:</Text>
                  <Text style={styles.bulletParagraph}>• Cam kết bảo đảm quyền sử dụng trọn vẹn, hợp pháp của ngăn kho cho Bên B trong suốt thời hạn thuê.</Text>
                  <Text style={styles.bulletParagraph}>• Bàn giao ngăn kho sạch sẽ, hệ thống khóa thông minh và cơ sở vật chất hoạt động tốt ngay sau khi ký hợp đồng (kèm Biên bản bàn giao và hình ảnh hiện trạng đính kèm).</Text>
                  <Text style={styles.bulletParagraph}>• Chịu trách nhiệm bảo trì hệ thống hạ tầng chung, hệ thống điện chiếu sáng, an ninh và PCCC của tòa nhà.</Text>

                  <Text style={[styles.subClauseTitle, { marginTop: 8 }]}>5.2. Trách nhiệm của Bên B:</Text>
                  <Text style={styles.bulletParagraph}>• Sử dụng kho đúng mục đích thuê, tuân thủ nội quy kho bãi và các quy định an toàn PCCC hiện hành.</Text>
                  <Text style={styles.bulletParagraph}>• Thanh toán tiền thuê kho đầy đủ và đúng hạn đã thỏa thuận.</Text>
                  <Text style={styles.bulletParagraph}>• Chịu trách nhiệm về tính hợp pháp của mọi tài sản, hàng hóa do mình đưa vào lưu giữ trong kho.</Text>
                  <Text style={styles.bulletParagraph}>• Bồi thường nếu làm hư hỏng thiết bị, kết cấu cửa kho hoặc cơ sở vật chất của Bên A do lỗi chủ quan.</Text>
                </View>

                {/* ĐIỀU 6 */}
                <View style={styles.articleBlock}>
                  <Text style={styles.articleTitle}>Điều 6. CAM KẾT CHUNG VÀ GIẢI QUYẾT TRANH CHẤP</Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>6.1. </Text>
                    Hai bên cam kết thực hiện đúng mọi điều khoản đã thỏa thuận trong hợp đồng. Nếu có tranh chấp phát sinh, hai bên sẽ ưu tiên giải quyết thông qua thương lượng, hòa giải trên tinh thần hợp tác.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>6.2. </Text>
                    Trong trường hợp không tự thương lượng giải quyết được, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền. Quyết định của Tòa án là phán quyết cuối cùng mà hai bên có nghĩa vụ chấp hành.
                  </Text>
                  <Text style={styles.paragraph}>
                    <Text style={styles.clauseNum}>6.3. </Text>
                    Hợp đồng này được lập thành 02 bản bằng tiếng Việt (hoặc bản điện tử có chữ ký số xác thực), có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ thực hiện.
                  </Text>
                </View>
              </View>

              {/* 6. CHỮ KÝ 2 BÊN */}
              <View style={styles.signatureSection}>
                <View style={styles.signatureRow}>
                  <View style={styles.signColumn}>
                    <Text style={styles.signRoleTitle}>ĐẠI DIỆN BÊN A</Text>
                    <Text style={styles.signRoleSubtitle}>(Ký, đóng dấu hoặc Chữ ký số)</Text>
                    <View style={styles.stampBox}>
                      <Text style={styles.stampVerified}>✓ ĐÃ KÝ SỐ</Text>
                      <Text style={styles.stampCompany}>CÔNG TY CP SELFSTORAGE VN</Text>
                      <Text style={styles.stampTime}>MST: 0316899988</Text>
                    </View>
                  </View>

                  <View style={styles.signColumn}>
                    <Text style={styles.signRoleTitle}>ĐẠI DIỆN BÊN B</Text>
                    <Text style={styles.signRoleSubtitle}>(Ký và ghi rõ họ tên)</Text>
                    <View style={styles.stampBox}>
                      <Text style={styles.signCustomerName}>{appointment.customerName}</Text>
                      <Text style={styles.signCustomerPhone}>SĐT: {appointment.phone}</Text>
                      <Text style={styles.stampTime}>Ngày ký: {dayStr}/{monthStr}/{yearStr}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeFullBtnText}>Đóng bản xem hợp đồng</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalContainer: {
    width: '100%',
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollPadding: {
    padding: 12,
    paddingBottom: 24,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  nationalHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  countryName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  motto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 2,
  },
  decorLine: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 2,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  contractMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
    textAlign: 'center',
    lineHeight: 22,
  },
  contractCodeNumber: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '800',
    marginTop: 4,
  },
  dateLocationText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  addressLocationText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  introLeadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  partyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyBoxTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  partyInfoList: {
    gap: 4,
  },
  infoLine: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  label: {
    color: '#64748B',
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  agreementLeadText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginVertical: 10,
    lineHeight: 16,
  },
  articlesContainer: {
    gap: 12,
  },
  articleBlock: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  articleTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 17,
    marginBottom: 6,
    textAlign: 'justify',
  },
  clauseNum: {
    fontWeight: '800',
    color: '#0F172A',
  },
  subClauseTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 4,
  },
  bulletParagraph: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 4,
    paddingLeft: 6,
  },
  pinHighlight: {
    color: '#1D4ED8',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
  },
  signatureSection: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginTop: 16,
    paddingTop: 14,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  signColumn: {
    flex: 1,
    alignItems: 'center',
  },
  signRoleTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  signRoleSubtitle: {
    fontSize: 9,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  stampBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  stampVerified: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    marginBottom: 2,
  },
  stampCompany: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  stampTime: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  signCustomerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  signCustomerPhone: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  footerRow: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  closeFullBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
