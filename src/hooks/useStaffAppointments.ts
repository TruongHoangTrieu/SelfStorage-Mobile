import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import {
  getAuthToken,
  loginStaffApi,
  fetchStaffReservationsApi,
  getReservationForCheckInApi,
  getAvailableUnitsApi,
  performCheckInApi,
} from '../api';
import {
  CheckInAppointment,
  AvailableUnit,
  StaffTab,
  FlowStep,
} from '../types/handover';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_AVAILABLE_UNITS,
} from '../data/mockStaffData';
import { formatSlotTime } from '../data/mockCustomerData';
import { formatVND, formatVietnameseDate } from '../utils/formatters';

export function useStaffAppointments(staffFacilityId?: number | string) {
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

  const loadStaffData = useCallback(async () => {
    try {
      setIsStaffLoading(true);

      // 1. Chỉ xác thực tài khoản Staff demo nếu chưa có JWT token trong phiên
      const existingToken = getAuthToken();
      if (!existingToken) {
        await loginStaffApi('staff@selfstorage.vn', '123456').catch(() => null);
      }

      // 2. Gọi song song API lấy Đơn hẹn (`GET /reservations`) và Ô kho (`GET /storage-units`) theo cơ sở nhân viên
      const [resData, unitsData] = await Promise.all([
        fetchStaffReservationsApi(staffFacilityId).catch(() => null),
        getAvailableUnitsApi(staffFacilityId).catch(() => null),
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
          else if (backendStatus === 'EXPIRED') appStatus = 'expired';

          return {
            id: item.reservationCode || `RSV-${item.id}`,
            rawId: item.id,
            facilityId: item.facilityId,
            facilityName: item.facility?.name || 'Cơ sở phân công',
            customerName: item.customer?.fullName || 'Khách hàng',
            phone: item.customer?.phone || '0908123456',
            email: item.customer?.email || 'customer@example.com',
            idCard: item.customer?.maskedIdentityNumber || item.customer?.identityNumber || item.customer?.idCard || 'Đã đối chiếu tại quầy',
            identityType: item.customer?.identityType || 'CCCD',
            identityNumber: item.customer?.identityNumber || '',
            maskedIdentityNumber: item.customer?.maskedIdentityNumber || '',
            identityAddress: item.customer?.identityAddress || item.customer?.address || '',
            isIdentityVerified: item.customer?.isIdentityVerified ?? true,
            identityFrontUrl: item.customer?.identityFrontUrl || undefined,
            identityBackUrl: item.customer?.identityBackUrl || undefined,
            slotTime: formatSlotTime(item.appointmentDate),
            timeCategory: new Date(item.appointmentDate).getHours() >= 12 ? 'afternoon' : 'morning',
            unitType: firstItem?.unitType?.name || 'Kho Cá Nhân Mini',
            unitTypeId: firstItem?.unitTypeId || 1,
            unitSize: `${firstItem?.unitType?.size || 4.9}m² (Tiêu chuẩn)`,
            unitId: firstItem?.unitId || 1,
            assignedUnit: firstItem?.unit?.unitNumber || 'A-101',
            status: appStatus,
            depositStatus: (() => {
              const paidDeposit = Array.isArray(item.payments)
                ? item.payments.find((p: any) => p.paymentType === 'DEPOSIT' && p.status === 'PAID')
                : undefined;
              if (paidDeposit) return 'paid';
              if (backendStatus === 'CONFIRMED' || backendStatus === 'IN_PROGRESS' || backendStatus === 'COMPLETED') {
                return 'paid';
              }
              return 'unpaid';
            })(),
            rentalStatus: (() => {
              const paidRental = Array.isArray(item.payments)
                ? item.payments.find((p: any) => p.paymentType === 'RENTAL' && p.status === 'PAID')
                : undefined;
              return paidRental ? 'paid' : 'unpaid';
            })(),
            depositAmount: formatVND(firstItem?.depositAmount || item.totalAmount || 890000),
            monthlyRent: formatVND(firstItem?.price || 890000) + '/tháng',
            startDate: formatVietnameseDate(item.appointmentDate),
            durationMonths: item.rentalPeriod || 1,
            purpose: 'Lưu trữ tài liệu và đồ đạc',
            specialNotes: item.notes || undefined,
            accessPin: item.rentalContract?.contractItems?.[0]?.accessCode || item.rentalContract?.accessCodes?.[0]?.code || undefined,
            contractCode: item.rentalContract?.contractCode || undefined,
          };
        })
        .filter((app: CheckInAppointment) => {
          // Nhân viên CHỈ tiếp nhận những khách hàng đã thanh toán cọc thành công
          return app.depositStatus === 'paid';
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
  }, [selectedAppointment, staffFacilityId]);

  const handleStartHandover = async (app: CheckInAppointment) => {
    // Chặn tuyệt đối không cho bàn giao đơn đã bị hủy hoặc hết hạn
    if (app.status === 'cancelled' || app.status === 'expired') {
      Alert.alert(
        'Đơn không thể nhận kho',
        `Đơn đặt chỗ #${app.id} đã bị hủy hoặc quá hạn nhận kho. Không thể thực hiện thủ tục nhận kho cho đơn này.`,
        [{ text: 'Đã hiểu' }]
      );
      return;
    }
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
    photos?: string[];
    identityType?: 'CCCD' | 'PASSPORT' | 'BUSINESS_LICENSE';
    identityNumber?: string;
    identityAddress?: string;
    isIdentityVerified?: boolean;
    identityFrontUrl?: string;
    identityBackUrl?: string;
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
            photos: updatedData.photos,
            identityType: updatedData.identityType,
            identityNumber: updatedData.identityNumber,
            identityAddress: updatedData.identityAddress,
            isIdentityVerified: updatedData.isIdentityVerified,
            identityFrontUrl: updatedData.identityFrontUrl,
            identityBackUrl: updatedData.identityBackUrl,
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

  return {
    staffTab,
    setStaffTab,
    flowStep,
    setFlowStep,
    isSidebarVisible,
    setIsSidebarVisible,
    appointments,
    setAppointments,
    availableUnits,
    setAvailableUnits,
    selectedAppointment,
    setSelectedAppointment,
    isStaffLoading,
    isSubmittingHandover,
    showQuickPrintModal,
    setShowQuickPrintModal,
    backendConnected,
    loadStaffData,
    handleStartHandover,
    handleCompleteHandover,
  };
}
