import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import {
  apiRequest,
  setAuthToken,
  getAuthToken,
  loginStaffApi,
  loginCustomerApi,
  fetchStaffReservationsApi,
  getReservationForCheckInApi,
  getAvailableUnitsApi,
  performCheckInApi,
  fetchMyContractsApi,
  changeSmartLockPinApi,
  createSupportRequestApi,
  fetchMySupportRequestsApi,
  Facility,
  UnitType,
  Reservation,
} from './src/api';
import {
  CheckInAppointment,
  AvailableUnit,
  StaffTab,
  FlowStep,
} from './src/types/handover';
import {
  CURRENT_STAFF_USER,
  INITIAL_APPOINTMENTS,
  INITIAL_AVAILABLE_UNITS,
} from './src/data/mockStaffData';
import {
  CustomerTab,
  CustomerRentedUnit,
  GuestAccessCode,
  UnitSupportTicket,
} from './src/types/customerStorage';
import {
  CURRENT_CUSTOMER_USER,
  INITIAL_RENTED_UNITS,
} from './src/data/mockCustomerStorageData';
import { formatVND, formatVietnameseDate } from './src/utils/formatters';

// Sub-components cho Phân hệ Nhân viên (Luồng 2)
import StaffSidebar from './src/components/staff/StaffSidebar';
import CheckInQueueScreen from './src/screens/staff/CheckInQueueScreen';
import HandoverDetailScreen from './src/screens/staff/HandoverDetailScreen';
import HandoverSuccessScreen from './src/screens/staff/HandoverSuccessScreen';
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import UnitMapScreen from './src/screens/staff/UnitMapScreen';
import StaffSettingsScreen from './src/screens/staff/StaffSettingsScreen';
import PrintReceiptModal from './src/components/staff/PrintReceiptModal';

// Sub-components cho Phân hệ Khách hàng (Luồng 3)
import CustomerSidebar from './src/components/customer/CustomerSidebar';
import MyUnitsDashboardScreen from './src/screens/customer/MyUnitsDashboardScreen';
import UnitDetailManageScreen from './src/screens/customer/UnitDetailManageScreen';
import CreateGuestPinModal from './src/components/customer/CreateGuestPinModal';
import RenewContractModal from './src/components/customer/RenewContractModal';
import UpgradeUnitModal from './src/components/customer/UpgradeUnitModal';
import ReportIssueModal from './src/components/customer/ReportIssueModal';
import ChangePinModal from './src/components/customer/ChangePinModal';
import {
  CustomerPaymentsScreen,
  CustomerAccessScreen,
  CustomerDocumentsScreen,
  CustomerSupportScreen,
  CustomerProfileScreen,
} from './src/screens/customer/CustomerPortalSubScreens';
import BookStorageScreen from './src/screens/customer/BookStorageScreen';
import LoginScreen from './src/screens/auth/LoginScreen';

// Helper format khung giờ
function formatSlotTime(isoString?: string): string {
  if (!isoString) return '09:00 SA';
  try {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const period = hours >= 12 ? 'CH' : 'SA';
    hours = hours % 12 || 12;
    return `${('0' + hours).slice(-2)}:${minutes} ${period}`;
  } catch {
    return '09:00 SA';
  }
}

// Hình ảnh kho thực tế chất lượng cao
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

export default function App() {
  // ================= CHẾ ĐỘ ỨNG DỤNG (CUSTOMER vs STAFF) =================
  const [appMode, setAppMode] = useState<'customer' | 'staff'>('customer'); // Mặc định mở Customer Portal để dev trực tiếp trang Đặt kho

  // ================= STATE CHO CỔNG NHÂN VIÊN (LUỒNG 2) =================
  const [staffTab, setStaffTab] = useState<StaffTab>('queue');
  const [flowStep, setFlowStep] = useState<FlowStep>('queue');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<CheckInAppointment[]>(INITIAL_APPOINTMENTS);
  const [availableUnits, setAvailableUnits] = useState<AvailableUnit[]>(INITIAL_AVAILABLE_UNITS);
  const [selectedAppointment, setSelectedAppointment] = useState<CheckInAppointment | null>(
    INITIAL_APPOINTMENTS[0]
  );
  const [isStaffLoading, setIsStaffLoading] = useState<boolean>(false);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState<boolean>(false);
  const [showQuickPrintModal, setShowQuickPrintModal] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // ================= STATE CHO PHÂN HỆ KHÁCH HÀNG (LUỒNG 3 - QUẢN LÝ Ô KHO) =================
  const [customerNavTab, setCustomerNavTab] = useState<CustomerTab>('my_units');
  const [customerFlowStep, setCustomerFlowStep] = useState<'dashboard' | 'detail'>('dashboard');
  const [isCustomerSidebarVisible, setIsCustomerSidebarVisible] = useState<boolean>(false);
  const [rentedUnits, setRentedUnits] = useState<CustomerRentedUnit[]>(INITIAL_RENTED_UNITS);
  const [selectedRentedUnit, setSelectedRentedUnit] = useState<CustomerRentedUnit | null>(
    INITIAL_RENTED_UNITS[0]
  );
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(false);

  // Modals nghiệp vụ Luồng 3
  const [showGuestPinModal, setShowGuestPinModal] = useState<boolean>(false);
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState<boolean>(false);
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);

  // State đặt kho (Luồng 1) & đơn cũ & Luồng 3
  const [customerTab, setCustomerTab] = useState<'my_units' | 'book' | 'my_reservations'>('book');
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // ================= KHỞI TẠO SESSION & TẢI DỮ LIỆU TỪ BACKEND =================
  const loadStaffData = useCallback(async () => {
    try {
      setIsStaffLoading(true);

      // 1. Tự động xác thực tài khoản Staff với Backend để lấy JWT token
      await loginStaffApi('staff@selfstorage.vn', '123456').catch(() => null);

      // 2. Gọi song song API lấy Đơn hẹn (`GET /reservations`) và Ô kho (`GET /storage-units`)
      const [resData, unitsData] = await Promise.all([
        fetchStaffReservationsApi(1).catch(() => null),
        getAvailableUnitsApi(1).catch(() => null),
      ]);

      // Xử lý danh sách đơn hẹn từ Backend
      const rawReservations = Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData) ? resData : null);
      if (rawReservations && rawReservations.length > 0) {
        setBackendConnected(true);
        const mappedAppointments: CheckInAppointment[] = rawReservations.map((item: any) => {
          const firstItem = item.items?.[0];
          const backendStatus = String(item.status || '').toUpperCase();
          let appStatus: CheckInAppointment['status'] = 'pending';
          if (backendStatus === 'COMPLETED') appStatus = 'completed';
          else if (backendStatus === 'CONFIRMED') appStatus = 'confirmed';
          else if (backendStatus === 'IN_PROGRESS') appStatus = 'in_progress';
          else if (backendStatus === 'CANCELLED') appStatus = 'cancelled';

          return {
            id: item.reservationCode || `RSV-${item.id}`,
            rawId: item.id,
            facilityId: item.facilityId,
            facilityName: item.facility?.name || 'Trụ sở chính Thủ Đức',
            customerName: item.customer?.fullName || 'Khách hàng',
            phone: item.customer?.phone || '0908123456',
            email: item.customer?.email || 'customer@example.com',
            idCard: item.customer?.idCard || 'Đã đối chiếu tại quầy',
            slotTime: formatSlotTime(item.appointmentDate),
            timeCategory: new Date(item.appointmentDate).getHours() >= 12 ? 'afternoon' : 'morning',
            unitType: firstItem?.unitType?.name || 'Kho Cá Nhân Mini',
            unitTypeId: firstItem?.unitTypeId || 1,
            unitSize: `${firstItem?.unitType?.size || 4.9}m² (Tiêu chuẩn)`,
            unitId: firstItem?.unitId || 1,
            assignedUnit: firstItem?.unit?.unitNumber || 'A-101',
            preferredFloor: firstItem?.unit?.floor || 'Tầng 1',
            status: appStatus,
            depositStatus: 'paid',
            depositAmount: formatVND(firstItem?.depositAmount || item.totalAmount || 890000),
            monthlyRent: formatVND(firstItem?.price || 890000) + '/tháng',
            startDate: formatVietnameseDate(item.appointmentDate),
            durationMonths: item.rentalPeriod || 1,
            purpose: 'Lưu trữ tài liệu và đồ đạc',
            specialNotes: item.notes || undefined,
            accessPin: item.rentalContract?.contractItems?.[0]?.accessCode || item.rentalContract?.accessCodes?.[0]?.code || undefined,
            contractCode: item.rentalContract?.contractCode || undefined,
          };
        });

        setAppointments(mappedAppointments);
        if (mappedAppointments.length > 0 && !selectedAppointment) {
          setSelectedAppointment(mappedAppointments[0]);
        }
      }

      // Xử lý danh sách ô kho từ Backend
      if (Array.isArray(unitsData) && unitsData.length > 0) {
        const mappedUnits: AvailableUnit[] = unitsData.map((u: any) => ({
          id: String(u.id),
          rawId: u.id,
          code: u.unitNumber,
          type: u.unitType?.name || 'Kho tiêu chuẩn',
          size: `${u.unitType?.size || 5}m²`,
          floor: u.floor || 'Tầng 1',
          zone: 'Khu A',
          features: u.condition || 'Khóa Smart PIN 24/7',
          status: u.status === 'AVAILABLE' ? 'vacant' : 'occupied',
        }));
        setAvailableUnits(mappedUnits);
      }
    } catch (err: any) {
      console.warn('Backend loadStaffData notice:', err.message);
    } finally {
      setIsStaffLoading(false);
    }
  }, [selectedAppointment]);

  // ================= TẢI HỢP ĐỒNG & Ô KHO THUÊ CỦA KHÁCH HÀNG (LUỒNG 3) =================
  const loadCustomerContracts = useCallback(async () => {
    try {
      setIsCustomerLoading(true);
      // Tự động xác thực tài khoản Customer (nguyen.hai) nếu cần
      await loginCustomerApi('hai.nguyen@example.com', '123456').catch(() => null);
      const [contracts, supportRes] = await Promise.all([
        fetchMyContractsApi().catch(() => null),
        fetchMySupportRequestsApi().catch(() => null),
      ]);
      const rawTickets = Array.isArray(supportRes?.data) ? supportRes.data : [];
      if (Array.isArray(contracts) && contracts.length > 0) {
        const mappedUnits: CustomerRentedUnit[] = [];
        contracts.forEach((c) => {
          (c.contractItems || []).forEach((ci: any) => {
            const startD = formatVietnameseDate(c.startDate);
            const endD = formatVietnameseDate(c.endDate);
            const totalMs = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
            const totalDays = Math.max(1, Math.round(totalMs / (1000 * 3600 * 24)));
            const remMs = new Date(c.endDate).getTime() - Date.now();
            const daysRemaining = Math.max(0, Math.ceil(remMs / (1000 * 3600 * 24)));

            let status: CustomerRentedUnit['status'] = 'active';
            let statusLabel = 'Đang hoạt động';
            if (daysRemaining <= 0) {
              status = 'overdue';
              statusLabel = 'Quá hạn';
            } else if (daysRemaining <= 7) {
              status = 'expiring_soon';
              statusLabel = `Sắp hết hạn (Còn ${daysRemaining} ngày)`;
            }

            const unitItem: CustomerRentedUnit = {
              id: `rented-${ci.id}`,
              contractId: c.id,
              contractItemId: ci.id,
              contractCode: c.contractCode,
              unitId: ci.unitId,
              unitCode: ci.unit?.unitNumber || 'A-101',
              unitName: ci.unit?.unitType?.name || 'Kho Cá Nhân Mini',
              size: `${ci.unit?.unitType?.size || 4.9}m²`,
              dimensions: `${ci.unit?.unitType?.size || 4.9}m² Tiêu chuẩn`,
              features: ['Khóa Smart PIN 24/7', 'Camera AI giám sát', 'Kiểm soát nhiệt độ'],
              facilityId: ci.unit?.facility?.id || 1,
              facilityName: ci.unit?.facility?.name || 'SelfStorage Thủ Đức',
              facilityAddress: ci.unit?.facility?.address || '456 Võ Văn Ngân, TP. Thủ Đức',
              floor: ci.unit?.floor || 'Tầng 1',
              zone: `Khu ${ci.unit?.unitNumber?.[0] || 'A'}`,
              mapPositionSnippet: {
                floorLabel: ci.unit?.floor || 'Tầng 1',
                zoneLabel: `Khu ${ci.unit?.unitNumber?.[0] || 'A'}`,
                corridor: `Hành lang ${ci.unit?.unitNumber?.[0] || 'A'}-01`,
              },
              status,
              statusLabel,
              startDate: startD,
              endDate: endD,
              nextPaymentDate: endD,
              daysRemaining,
              totalDays,
              monthlyRent: Number(ci.rentalPrice) || 890000,
              monthlyRentFormatted: formatVND(Number(ci.rentalPrice) || 890000) + '/tháng',
              depositAmount: Number(ci.depositAmount) || 890000,
              depositFormatted: formatVND(Number(ci.depositAmount) || 890000),
              totalPaid: Array.isArray(c.payments) && c.payments.length > 0
                ? c.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
                : Number(ci.rentalPrice || 890000) + Number(ci.depositAmount || 890000),
              totalPaidFormatted: formatVND(
                Array.isArray(c.payments) && c.payments.length > 0
                  ? c.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
                  : Number(ci.rentalPrice || 890000) + Number(ci.depositAmount || 890000)
              ),
              currentBalance: 0,
              currentBalanceFormatted: '0 đ (Đã thanh toán đủ)',
              masterPin: ci.accessCode || '597599',
              isPinVisible: false,
              smartLockStatus: 'LOCKED',
              lastUnlockedAt: 'Hôm nay lúc 09:30',
              guestAccessCodes: Array.isArray(ci.guestAccessCodes) && ci.guestAccessCodes.length > 0
                ? ci.guestAccessCodes.map((g: any) => ({
                    id: String(g.id),
                    guestName: g.guestName,
                    pinCode: g.pinCode,
                    validFrom: formatVietnameseDate(g.validFrom),
                    validTo: formatVietnameseDate(g.validTo),
                    usageType: g.usageType,
                    status: g.status,
                    purpose: g.purpose,
                    createdAt: formatVietnameseDate(g.createdAt),
                  }))
                : [],
              payments: Array.isArray(c.payments) && c.payments.length > 0
                ? c.payments.map((p: any) => ({
                    id: String(p.id),
                    paymentCode: p.paymentCode,
                    amount: Number(p.amount),
                    type: p.paymentType,
                    typeLabel: p.paymentType === 'DEPOSIT' ? 'Tiền cọc bảo đảm' : p.paymentType === 'RENTAL' ? 'Tiền thuê kho' : 'Gia hạn thuê kho',
                    status: p.status,
                    paidAt: p.paidAt ? formatVietnameseDate(p.paidAt) : startD,
                    method: p.paymentMethod || 'SEPAY_QR',
                    periodDescription: p.transactionReference || `Thanh toán hợp đồng ${c.contractCode}`,
                  }))
                : [
                    {
                      id: `p-${c.id}-1`,
                      paymentCode: `PAY-${c.contractCode.slice(-6)}-DEP`,
                      amount: Number(ci.depositAmount || 890000),
                      type: 'DEPOSIT',
                      typeLabel: 'Tiền cọc bảo đảm',
                      status: 'PAID',
                      paidAt: startD,
                      method: 'SEPAY_QR',
                      periodDescription: 'Cọc hoàn trả khi thanh lý hợp đồng',
                    },
                    {
                      id: `p-${c.id}-2`,
                      paymentCode: `PAY-${c.contractCode.slice(-6)}-RENT`,
                      amount: Number(ci.rentalPrice || 890000),
                      type: 'RENTAL',
                      typeLabel: 'Tiền thuê kỳ đầu',
                      status: 'PAID',
                      paidAt: startD,
                      method: 'SEPAY_QR',
                      periodDescription: `Kỳ thuê: ${startD} - ${endD}`,
                    },
                  ],
              supportTickets: rawTickets
                .filter((t: any) => !t.contractItemId || t.contractItemId === ci.id)
                .map((t: any) => ({
                  id: String(t.id),
                  requestCode: t.requestCode,
                  category: t.category,
                  categoryLabel: t.category === 'LOCK' ? '🔐 Khóa Smart PIN' : '🛠️ ' + t.category,
                  subject: t.subject,
                  description: t.description,
                  status: t.status,
                  priority: t.priority,
                  createdAt: formatVietnameseDate(t.createdAt),
                  resolvedAt: t.resolvedAt ? formatVietnameseDate(t.resolvedAt) : undefined,
                })),
              storedItems: Array.isArray(ci.storedItems)
                ? ci.storedItems.map((si: any) => ({
                    id: String(si.id),
                    name: si.name,
                    category: si.category || 'Tài sản',
                    quantity: si.quantity || 1,
                    unit: 'Kiện',
                    addedAt: formatVietnameseDate(si.createdAt),
                  }))
                : [],
            };
            mappedUnits.push(unitItem);
          });
        });

        if (mappedUnits.length > 0) {
          setRentedUnits(mappedUnits);
          setSelectedRentedUnit(mappedUnits[0]);
        }
      }
    } catch (err: any) {
      console.warn('loadCustomerContracts notice:', err.message);
    } finally {
      setIsCustomerLoading(false);
    }
  }, []);

  // Handler tạo mã khách tạm thời
  const handleGuestPinCreated = (newCode: GuestAccessCode) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      guestAccessCodes: [newCode, ...selectedRentedUnit.guestAccessCodes],
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // Handler gia hạn hợp đồng thành công
  const handleRenewSuccess = (extendedMonths: number, newEndDate: string) => {
    if (!selectedRentedUnit) return;
    const parts = newEndDate.split('/');
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const remMs = new Date(y, m, d).getTime() - Date.now();
    const newDaysRemaining = Math.max(0, Math.ceil(remMs / (1000 * 3600 * 24)));

    const updated: CustomerRentedUnit = {
      ...selectedRentedUnit,
      endDate: newEndDate,
      nextPaymentDate: newEndDate,
      daysRemaining: newDaysRemaining,
      status: 'active',
      statusLabel: 'Đang hoạt động',
      payments: [
        {
          id: `pay-renew-${Date.now()}`,
          paymentCode: `PAY-${selectedRentedUnit.contractCode.slice(-6)}-REN`,
          amount: selectedRentedUnit.monthlyRent * extendedMonths,
          type: 'RENEWAL',
          typeLabel: `Gia hạn hợp đồng +${extendedMonths} tháng`,
          status: 'PAID',
          paidAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
          method: 'SEPAY_QR',
          periodDescription: `Gia hạn thêm ${extendedMonths} tháng đến ${newEndDate}`,
        },
        ...selectedRentedUnit.payments,
      ],
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // Handler tạo phiếu hỗ trợ sự cố
  const handleTicketCreated = (newTicket: UnitSupportTicket) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      supportTickets: [newTicket, ...selectedRentedUnit.supportTickets],
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  // Handler đổi mã PIN Smart Lock
  const handlePinChanged = (newPin: string) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      masterPin: newPin,
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  useEffect(() => {
    loadStaffData();
    loadCustomerData();
    loadCustomerContracts();
  }, [loadStaffData, loadCustomerContracts]);

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

  const loadCustomerData = async () => {
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
              id: 1,
              name: 'SelfStorage Thủ Đức (Trụ sở Võ Nguyên Giáp)',
              code: 'SS-TD',
              address: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
              status: 'ACTIVE',
              image: DEFAULT_FACILITY_IMAGES[1],
              rating: 4.9,
            },
            {
              id: 3,
              name: 'SelfStorage Quận 1 (Central Hub)',
              code: 'SS-Q1',
              address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM',
              status: 'ACTIVE',
              image: DEFAULT_FACILITY_IMAGES[0],
              rating: 4.9,
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
              id: 1,
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
              id: 2,
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
              id: 3,
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
              features: ['Cửa cuốn rộng 2m bốc xếp nhanh', 'Xe tải vào tận sảnh tầng kho', 'Hỗ trợ xuất hóa đơn VAT'],
            },
          ];

      setFacilities(resolvedFacilities);
      setUnitTypes(resolvedUnitTypes);
      setSelectedFacility(resolvedFacilities[0]);
      setSelectedUnitType(resolvedUnitTypes[0]);
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu khách:', err.message);
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

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    if (user.role === 'FACILITY_STAFF' || user.role === 'ADMIN' || user.email?.includes('staff')) {
      setAppMode('staff');
      loadStaffData();
    } else {
      setAppMode('customer');
      loadCustomerContracts();
      loadMyReservations();
    }
  };

  const loadMyReservations = async () => {
    try {
      setLoadingReservations(true);
      const data = await apiRequest<Reservation[]>('/reservations/my');
      setMyReservations(Array.isArray(data) ? data : []);
    } catch {
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
      const isoAppointmentDate = new Date(`${appointmentDate}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: Number(selectedFacility.id),
        unitTypeId: Number(selectedUnitType.id),
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
      loadStaffData(); // Cập nhật hàng đợi staff
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

  // ================= XỬ LÝ NGHIỆP VỤ LUỒNG 2: BẮT ĐẦU VÀ HOÀN TẤT BÀN GIAO =================
  const handleStartHandover = async (app: CheckInAppointment) => {
    try {
      // 1. [ Bắt đầu nhận kho ]: Gọi API Backend lấy chi tiết đơn đặt chỗ nếu có ID số
      let activeApp = { ...app, status: 'in_progress' as const };
      if (app.rawId) {
        const detail = await getReservationForCheckInApi(app.rawId).catch(() => null);
        if (detail) {
          const firstItem = detail.items?.[0];
          activeApp = {
            ...activeApp,
            customerName: detail.customer?.fullName || activeApp.customerName,
            phone: detail.customer?.phone || activeApp.phone,
            email: detail.customer?.email || activeApp.email,
            assignedUnit: firstItem?.unit?.unitNumber || activeApp.assignedUnit,
            unitType: firstItem?.unitType?.name || activeApp.unitType,
            unitSize: `${firstItem?.unitType?.size || 4.9}m²`,
            depositAmount: formatVND(firstItem?.depositAmount || activeApp.depositAmount),
          };
        }
      }

      setAppointments((prev) =>
        prev.map((item) => (item.id === app.id ? activeApp : item))
      );
      setSelectedAppointment(activeApp);
      setFlowStep('handover');
    } catch (err: any) {
      Alert.alert('Thông báo', err.message || 'Chuyển sang màn hình bàn giao');
      setSelectedAppointment({ ...app, status: 'in_progress' });
      setFlowStep('handover');
    }
  };

  const handleCompleteHandover = async (updatedData: {
    appointmentId: string;
    unitCode: string;
    condition: string;
    notes?: string;
  }) => {
    setIsSubmittingHandover(true);
    try {
      const app =
        appointments.find((a) => a.id === updatedData.appointmentId) ||
        selectedAppointment;
      if (!app) {
        throw new Error('Không tìm thấy thông tin cuộc hẹn để bàn giao');
      }

      let generatedContract = '';
      let generatedPin = '';

      // Tự động đảm bảo JWT Token hợp lệ cho Staff
      if (!getAuthToken()) {
        await loginStaffApi('staff@selfstorage.vn', '123456').catch(() => null);
      }

      // Gọi API atomic check-in chính thức của Backend (POST /handovers/check-in)
      if (app.rawId) {
        try {
          const checkInResponse = await performCheckInApi({
            reservationId: app.rawId,
            condition: updatedData.condition,
            notes: updatedData.notes,
            unitCode: updatedData.unitCode,
          });

          if (checkInResponse?.contract) {
            generatedContract = checkInResponse.contract.contractCode;
            generatedPin =
              checkInResponse.contractItems?.[0]?.accessCode ||
              checkInResponse.accessCodes?.[0]?.code ||
              '682914';
          }
        } catch (apiErr: any) {
          console.warn('Backend performCheckInApi notice:', apiErr.message);
          // Nếu backend trả về đã check in rồi thì tiếp tục hiển thị trạng thái hoàn tất
          if (!apiErr.message?.includes('already been checked in')) {
            throw apiErr;
          }
        }
      }

      // Fallback code nếu chưa kết nối server
      if (!generatedContract) {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        generatedContract = `CON-${datePart}-${randomPart}`;
        generatedPin = app.accessPin || Math.floor(100000 + Math.random() * 900000).toString();
      }

      // [ Hoàn tất bàn giao ]: Cập nhật trạng thái ô kho thành ĐANG THUÊ (Occupied) và đơn hàng thành HOÀN TẤT
      const completedRecord: CheckInAppointment = {
        ...app,
        assignedUnit: updatedData.unitCode,
        status: 'completed',
        contractCode: generatedContract,
        accessPin: generatedPin,
        completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setAppointments((prev) =>
        prev.map((item) => (item.id === app.id ? completedRecord : item))
      );

      // Cập nhật ô kho sang OCCUPIED trong availableUnits
      setAvailableUnits((prev) =>
        prev.map((u) => (u.code === updatedData.unitCode ? { ...u, status: 'occupied' } : u))
      );

      setSelectedAppointment(completedRecord);

      // Chuyển sang Trang C: Hoàn tất bàn giao
      setFlowStep('success');

      // Tự động tải lại dữ liệu từ backend để đồng bộ
      loadStaffData();
    } catch (err: any) {
      console.error('Handover complete error:', err);
      const errMsg = err.message || 'Không thể hoàn tất bàn giao. Vui lòng thử lại.';
      if (Platform.OS === 'web') {
        window.alert(`Lỗi bàn giao: ${errMsg}`);
      } else {
        Alert.alert('Lỗi bàn giao', errMsg);
      }
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const estimate = calculateEstimate();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ================= GIAO DIỆN PHÂN HỆ CỔNG NHÂN VIÊN (STAFF PORTAL - LUỒNG 2) ================= */}
      {appMode === 'staff' ? (
        <View style={{ flex: 1 }}>
          {/* Thanh Sidebar (Drawer) 6 mục */}
          <StaffSidebar
            visible={isSidebarVisible}
            onClose={() => setIsSidebarVisible(false)}
            activeTab={staffTab}
            onSelectTab={(tab) => {
              setStaffTab(tab);
              if (tab === 'queue') setFlowStep('queue');
            }}
            currentUser={CURRENT_STAFF_USER}
            pendingCount={appointments.filter((a) => a.status === 'pending' || a.status === 'arrived').length}
            onSwitchToCustomer={() => setAppMode('customer')}
          />

          {/* Render Nội Dung Staff Theo Tab & FlowStep */}
          {staffTab === 'queue' ? (
            flowStep === 'queue' ? (
              /* TRANG A: Hàng đợi Nhận kho trong ngày */
              <CheckInQueueScreen
                appointments={appointments}
                onStartHandover={handleStartHandover}
                onRefresh={loadStaffData}
                isRefreshing={isStaffLoading}
                onOpenSidebar={() => setIsSidebarVisible(true)}
                facilityName={CURRENT_STAFF_USER.facilityName}
              />
            ) : flowStep === 'handover' && selectedAppointment ? (
              /* TRANG B: Xác thực khách hàng & Bàn giao kho */
              <HandoverDetailScreen
                appointment={selectedAppointment}
                availableUnits={availableUnits}
                onBackToQueue={() => setFlowStep('queue')}
                onCompleteHandover={handleCompleteHandover}
                isSubmitting={isSubmittingHandover}
              />
            ) : flowStep === 'success' && selectedAppointment ? (
              /* TRANG C: Hoàn tất Bàn giao */
              <HandoverSuccessScreen
                appointment={selectedAppointment}
                assignedUnitCode={selectedAppointment.assignedUnit}
                contractCode={selectedAppointment.contractCode}
                accessPin={selectedAppointment.accessPin}
                onBackToQueue={() => {
                  setFlowStep('queue');
                  setStaffTab('queue');
                  loadStaffData();
                }}
                onPrintAgain={() => setShowQuickPrintModal(true)}
              />
            ) : (
              <CheckInQueueScreen
                appointments={appointments}
                onStartHandover={handleStartHandover}
                onRefresh={loadStaffData}
                isRefreshing={isStaffLoading}
                onOpenSidebar={() => setIsSidebarVisible(true)}
                facilityName={CURRENT_STAFF_USER.facilityName}
              />
            )
          ) : staffTab === 'dashboard' ? (
            /* TAB 1: Bảng điều khiển (Tổng quan hôm nay) */
            <StaffDashboardScreen
              appointments={appointments}
              onGoToQueue={() => {
                setStaffTab('queue');
                setFlowStep('queue');
              }}
              onOpenSidebar={() => setIsSidebarVisible(true)}
              facilityName={CURRENT_STAFF_USER.facilityName}
            />
          ) : staffTab === 'facility' ? (
            /* TAB 4: Sơ đồ cơ sở & Trạng thái ô kho */
            <UnitMapScreen
              availableUnits={availableUnits}
              onOpenSidebar={() => setIsSidebarVisible(true)}
              facilityName={CURRENT_STAFF_USER.facilityName}
            />
          ) : staffTab === 'settings' ? (
            /* TAB 6: Cài đặt nhân viên */
            <StaffSettingsScreen
              currentUser={CURRENT_STAFF_USER}
              onOpenSidebar={() => setIsSidebarVisible(true)}
              onSwitchToCustomer={() => setAppMode('customer')}
            />
          ) : (
            /* Các tab khác: Checkout / Support */
            <View style={styles.otherTabContainer}>
              <View style={styles.otherTabTopBar}>
                <TouchableOpacity
                  style={styles.menuIconBtn}
                  onPress={() => setIsSidebarVisible(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 20 }}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.otherTabTitle}>
                  {staffTab === 'checkout' ? '📤 TRẢ KHO / THANH LÝ' : '🛠️ HỖ TRỢ & SỰ CỐ'}
                </Text>
              </View>
              <View style={styles.otherTabBody}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>
                  {staffTab === 'checkout' ? '📤' : '🛠️'}
                </Text>
                <Text style={styles.otherTabHeadline}>
                  {staffTab === 'checkout'
                    ? 'Phân hệ Trả kho & Nghiệm thu hoàn cọc'
                    : 'Phân hệ Xử lý sự cố tại chỗ (Ticket)'}
                </Text>
                <Text style={styles.otherTabDesc}>
                  Tính năng đang kết nối với hệ thống Backend. Bạn có thể chuyển sang Hàng Đợi Nhận Kho (Luồng 2) để tiếp tục thao tác.
                </Text>
                <TouchableOpacity
                  style={styles.backToQueueActionBtn}
                  onPress={() => {
                    setStaffTab('queue');
                    setFlowStep('queue');
                  }}
                >
                  <Text style={styles.backToQueueActionText}>Vào Hàng Đợi Nhận Kho (Luồng 2) →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Print Modal khi in lại ở Trang C */}
          {selectedAppointment && (
            <PrintReceiptModal
              visible={showQuickPrintModal}
              onClose={() => setShowQuickPrintModal(false)}
              appointment={selectedAppointment}
              assignedUnitCode={selectedAppointment.assignedUnit}
            />
          )}
        </View>
      ) : (
        /* ================= GIAO DIỆN PHÂN HỆ KHÁCH HÀNG (CUSTOMER PORTAL) ================= */
        <View style={{ flex: 1 }}>
          {/* Thanh Sidebar (Drawer) Cổng Khách Hàng */}
          <CustomerSidebar
            visible={isCustomerSidebarVisible}
            onClose={() => setIsCustomerSidebarVisible(false)}
            activeTab={customerNavTab}
            onSelectTab={(tab) => {
              setCustomerNavTab(tab);
              setIsCustomerSidebarVisible(false);
              if (tab === 'my_units') {
                setCustomerTab('my_units');
                setCustomerFlowStep('dashboard');
              } else {
                setCustomerTab('my_units');
              }
            }}
            rentedUnitsCount={rentedUnits.length}
            onSwitchToStaff={() => {
              setIsCustomerSidebarVisible(false);
              setAppMode('staff');
            }}
          />

          {/* Top Bar Khách Hàng & Tabs (ẩn khi ở trang Book để giao diện full screen theo thiết kế mới) */}
          {customerTab !== 'book' && (
            <>
              <View style={styles.navBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    style={styles.customerMenuBtn}
                    onPress={() => setIsCustomerSidebarVisible(true)}
                  >
                    <Text style={{ color: '#fff', fontSize: 20 }}>☰</Text>
                  </TouchableOpacity>
                  <View style={styles.logoBadge}>
                    <Text style={styles.logoIcon}>📦</Text>
                    <Text style={styles.logoText}>SelfStorage</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.switchStaffBtn}
                    onPress={() => setAppMode('staff')}
                  >
                    <Text style={styles.switchStaffText}>👔 Cổng Nhân Viên</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.authButton}
                    onPress={() => setShowAuthModal(true)}
                  >
                    <Text style={styles.authButtonText}>
                      {isLoggedIn ? '👤 Khách' : 'Đăng Nhập'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tabItem, customerTab === 'my_units' && styles.tabItemActive]}
                  onPress={() => {
                    setCustomerTab('my_units');
                    setCustomerNavTab('my_units');
                  }}
                >
                  <Text style={[styles.tabLabel, customerTab === 'my_units' && styles.tabLabelActive]}>
                    🏠 Ô Kho Của Tôi ({rentedUnits.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, customerTab === 'book' && styles.tabItemActive]}
                  onPress={() => setCustomerTab('book')}
                >
                  <Text style={[styles.tabLabel, customerTab === 'book' && styles.tabLabelActive]}>
                    ✨ Đặt Kho Mới
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, customerTab === 'my_reservations' && styles.tabItemActive]}
                  onPress={() => {
                    setCustomerTab('my_reservations');
                    if (isLoggedIn) loadMyReservations();
                  }}
                >
                  <Text style={[styles.tabLabel, customerTab === 'my_reservations' && styles.tabLabelActive]}>
                    📋 Đơn Của Tôi ({myReservations.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Nội dung theo Tab chính */}
          {customerTab === 'my_units' ? (
            customerNavTab === 'my_units' ? (
              customerFlowStep === 'dashboard' ? (
                /* TRANG A: Bảng điều khiển Ô kho của tôi (Unit Cards Grid) */
                <MyUnitsDashboardScreen
                  units={rentedUnits}
                  onViewDetail={(unit) => {
                    setSelectedRentedUnit(unit);
                    setCustomerFlowStep('detail');
                  }}
                  onOpenGuestPin={(unit) => {
                    setSelectedRentedUnit(unit);
                    setShowGuestPinModal(true);
                  }}
                  onOpenRenew={(unit) => {
                    setSelectedRentedUnit(unit);
                    setShowRenewModal(true);
                  }}
                  onOpenReportIssue={(unit) => {
                    setSelectedRentedUnit(unit);
                    setShowReportIssueModal(true);
                  }}
                  onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
                  onRefresh={loadCustomerContracts}
                  isRefreshing={isCustomerLoading}
                  customerName={CURRENT_CUSTOMER_USER.fullName}
                />
              ) : selectedRentedUnit ? (
                /* TRANG B: Chi tiết & Quản lý Ô kho */
                <UnitDetailManageScreen
                  unit={selectedRentedUnit}
                  onBackToDashboard={() => setCustomerFlowStep('dashboard')}
                  onOpenGuestPinModal={() => setShowGuestPinModal(true)}
                  onOpenRenewModal={() => setShowRenewModal(true)}
                  onOpenUpgradeModal={() => setShowUpgradeModal(true)}
                  onOpenReportIssueModal={() => setShowReportIssueModal(true)}
                  onOpenChangePinModal={() => setShowChangePinModal(true)}
                />
              ) : null
            ) : customerNavTab === 'payments' ? (
              /* TAB 2: Thanh toán & Hóa đơn */
              <CustomerPaymentsScreen
                units={rentedUnits}
                onBackToUnits={() => {
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                }}
                onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
              />
            ) : customerNavTab === 'access' ? (
              /* TAB 3: Truy cập & Bảo mật */
              <CustomerAccessScreen
                units={rentedUnits}
                onBackToUnits={() => {
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                }}
                onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
                onOpenGuestPin={(u) => {
                  setSelectedRentedUnit(u);
                  setShowGuestPinModal(true);
                }}
                onOpenChangePin={(u) => {
                  setSelectedRentedUnit(u);
                  setShowChangePinModal(true);
                }}
              />
            ) : customerNavTab === 'documents' ? (
              /* TAB 4: Tài liệu & Hợp đồng */
              <CustomerDocumentsScreen
                units={rentedUnits}
                onBackToUnits={() => {
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                }}
                onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
              />
            ) : customerNavTab === 'support' ? (
              /* TAB 5: Hỗ trợ & Trợ giúp */
              <CustomerSupportScreen
                units={rentedUnits}
                onBackToUnits={() => {
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                }}
                onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
                onOpenReportIssue={(u) => {
                  setSelectedRentedUnit(u);
                  setShowReportIssueModal(true);
                }}
              />
            ) : (
              /* TAB 6: Hồ sơ & Cài đặt */
              <CustomerProfileScreen
                currentUser={CURRENT_CUSTOMER_USER}
                onBackToUnits={() => {
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                }}
                onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
                onSwitchToStaff={() => setAppMode('staff')}
              />
            )
          ) : customerTab === 'book' ? (
            <BookStorageScreen
              facilities={facilities}
              unitTypes={unitTypes}
              loading={loading}
              refreshing={refreshing}
              onRefresh={loadCustomerData}
              onReservationCreated={() => {
                loadMyReservations();
                loadStaffData();
              }}
              onViewMyReservations={() => setCustomerTab('my_reservations')}
              onSwitchToStaff={() => setAppMode('staff')}
              onOpenLogin={() => setShowAuthModal(true)}
              currentUser={currentUser}
              activeBottomTab="search"
              onNavigateTab={(tab) => {
                if (tab === 'search') {
                  setCustomerTab('book');
                } else if (tab === 'my-storage') {
                  setCustomerTab('my_units');
                  setCustomerNavTab('my_units');
                  setCustomerFlowStep('dashboard');
                } else if (tab === 'digital-key') {
                  setCustomerTab('my_units');
                  setCustomerNavTab('access');
                } else if (tab === 'support') {
                  setCustomerTab('my_units');
                  setCustomerNavTab('support');
                }
              }}
            />
          ) : loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.centerText}>Đang tải danh sách kho...</Text>
            </View>
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
                    <TouchableOpacity style={styles.nextBtn} onPress={() => setCustomerTab('book')}>
                      <Text style={styles.nextBtnText}>+ Đặt Ngăn Kho Mới</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  myReservations.map((r) => (
                    <View key={r.id} style={styles.historyCard}>
                      <View style={styles.historyTopRow}>
                        <Text style={styles.historyCode}>Đơn #{String(r.id).slice(-6).toUpperCase()}</Text>
                        <View style={styles.historyBadge}>
                          <Text style={styles.historyBadgeText}>{r.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.historyDetail}>📅 Ngày hẹn: {new Date(r.appointmentDate).toLocaleDateString('vi-VN')}</Text>
                      <Text style={styles.historyDetail}>⏱️ Thời hạn thuê: {r.rentalPeriod} tháng</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* ================= CÁC MODAL NGHIỆP VỤ LUỒNG 3 ================= */}
          {selectedRentedUnit && (
            <>
              {/* Modal 1: Tạo Mã Khách Tạm Thời */}
              <CreateGuestPinModal
                visible={showGuestPinModal}
                onClose={() => setShowGuestPinModal(false)}
                unit={selectedRentedUnit}
                onCreated={handleGuestPinCreated}
              />

              {/* Modal 2: Gia Hạn Hợp Đồng */}
              <RenewContractModal
                visible={showRenewModal}
                onClose={() => setShowRenewModal(false)}
                unit={selectedRentedUnit}
                onRenewSuccess={handleRenewSuccess}
              />

              {/* Modal 3: Nâng Cấp / Hạ Cấp Ô Kho */}
              <UpgradeUnitModal
                visible={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                unit={selectedRentedUnit}
                onRequestSubmitted={(targetTypeName) => {
                  setShowUpgradeModal(false);
                  if (Platform.OS === 'web') {
                    window.alert(
                      `Yêu cầu đổi sang kho "${targetTypeName}" đã được ghi nhận. CSKH sẽ liên hệ với bạn trong 30 phút.`
                    );
                  }
                }}
              />

              {/* Modal 4: Báo Cáo Sự Cố */}
              <ReportIssueModal
                visible={showReportIssueModal}
                onClose={() => setShowReportIssueModal(false)}
                unit={selectedRentedUnit}
                onTicketCreated={handleTicketCreated}
              />

              {/* Modal 5: Đổi Mã PIN Smart Lock */}
              <ChangePinModal
                visible={showChangePinModal}
                onClose={() => setShowChangePinModal(false)}
                unit={selectedRentedUnit}
                onPinChanged={handlePinChanged}
              />
            </>
          )}

          {/* MODAL AUTH */}
          <Modal visible={showAuthModal} transparent={false} animationType="slide">
            <LoginScreen
              onClose={() => setShowAuthModal(false)}
              onLoginSuccess={handleLoginSuccess}
            />
          </Modal>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  customerMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  switchStaffBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  switchStaffText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  authButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  authButtonText: {
    color: '#38BDF8',
    fontSize: 11,
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
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563EB',
  },
  tabLabel: {
    fontSize: 13,
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
    padding: 14,
    paddingBottom: 40,
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
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    fontSize: 11,
  },
  stepLabel: {
    fontSize: 10,
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
    marginBottom: 16,
  },
  stepDividerActive: {
    backgroundColor: '#2563EB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  facilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  facilityCardActive: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  facilityImageWrapper: {
    height: 120,
    position: 'relative',
  },
  facilityImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '700',
  },
  facilityContent: {
    padding: 12,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  facilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  facilityAddress: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  facilityPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepBackHeader: {
    marginBottom: 8,
  },
  backBtnTextRow: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  unitCardActive: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  unitImage: {
    width: '100%',
    height: 110,
  },
  unitContent: {
    padding: 12,
  },
  unitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitDimensions: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  sizePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sizePillText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  unitDescription: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  featuresList: {
    gap: 4,
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureCheck: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 11,
  },
  featureText: {
    fontSize: 11,
    color: '#334155',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '400',
  },
  depositSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  selectBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectBtnActive: {
    backgroundColor: '#2563EB',
  },
  selectBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  selectBtnTextActive: {
    color: '#FFFFFF',
  },
  buttonActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  outlineBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  outlineBackBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryBoxImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  summaryFacilityName: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryUnitName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  inputHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  textInputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  durationCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
  },
  durationCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  durationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  durationTitleActive: {
    color: '#2563EB',
  },
  discountBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  costBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  costTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  costVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 6,
  },
  costTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  costTotalVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
  confirmBookBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyHeadline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  historyDetail: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalPartyIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  modalHeadline: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 10,
  },
  modalInstruction: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  otherTabContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  otherTabTopBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherTabTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  otherTabBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otherTabHeadline: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  otherTabDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  backToQueueActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  backToQueueActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
