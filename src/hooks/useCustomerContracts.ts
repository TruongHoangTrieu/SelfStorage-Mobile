// src/hooks/useCustomerContracts.ts
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginCustomerApi,
  fetchMyContractsApi,
  fetchMySupportRequestsApi,
  getAuthToken,
  setAuthToken,
} from '../api';
import {
  CustomerTab,
  CustomerRentedUnit,
  GuestAccessCode,
  UnitSupportTicket,
} from '../types/customerStorage';
import { INITIAL_RENTED_UNITS } from '../data/mockCustomerStorageData';
import { formatVND, formatVietnameseDate } from '../utils/formatters';

export const CACHED_UNITS_KEY = '@selfstorage_cached_customer_units';

export function useCustomerContracts() {
  const [customerNavTab, setCustomerNavTab] = useState<CustomerTab>('my_units');
  const [customerFlowStep, setCustomerFlowStep] = useState<'dashboard' | 'detail'>('dashboard');
  const [isCustomerSidebarVisible, setIsCustomerSidebarVisible] = useState<boolean>(false);
  const [rentedUnits, setRentedUnits] = useState<CustomerRentedUnit[]>(INITIAL_RENTED_UNITS);
  const [selectedRentedUnit, setSelectedRentedUnit] = useState<CustomerRentedUnit | null>(
    INITIAL_RENTED_UNITS[0]
  );
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(false);

  // Modals nghiệp vụ
  const [showGuestPinModal, setShowGuestPinModal] = useState<boolean>(false);
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState<boolean>(false);
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);

  // Khôi phục ngay danh sách kho từ bộ nhớ đệm khi ứng dụng reload (tránh bị mất kho khi reload Expo)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cachedStr = await AsyncStorage.getItem(CACHED_UNITS_KEY);
        if (cachedStr && mounted) {
          const cached = JSON.parse(cachedStr);
          if (Array.isArray(cached) && cached.length > 0) {
            setRentedUnits(cached);
            setSelectedRentedUnit((prev) => prev || cached[0]);
          }
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadCustomerContracts = useCallback(async () => {
    try {
      setIsCustomerLoading(true);
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('@selfstorage_token');
        if (token) {
          setAuthToken(token);
        }
      }

      if (!token) {
        // Nếu chưa có token, giữ nguyên cache hiện tại, không xóa trắng danh sách
        setIsCustomerLoading(false);
        return;
      }

      const [contracts, supportRes] = await Promise.all([
        fetchMyContractsApi().catch(() => null),
        fetchMySupportRequestsApi().catch(() => null),
      ]);
      const rawTickets = Array.isArray(supportRes?.data) ? supportRes.data : [];
      if (Array.isArray(contracts) && contracts.length > 0) {
        const mappedUnits: CustomerRentedUnit[] = [];
        for (const c of contracts) {
          for (const ci of (c.contractItems || [])) {
            const startD = formatVietnameseDate(c.startDate);
            const endD = formatVietnameseDate(c.endDate);
            const totalMs = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
            const totalDays = Math.max(1, Math.round(totalMs / (1000 * 3600 * 24)));
            const remMs = new Date(c.endDate).getTime() - Date.now();
            const daysRemaining = Math.max(0, Math.ceil(remMs / (1000 * 3600 * 24)));

            let status: CustomerRentedUnit['status'] = 'active';
            let statusLabel = 'Đang hoạt động';

            // Kiểm tra xem đơn này đã được khách gửi yêu cầu trả kho hay chưa
            const returnReqStr = await AsyncStorage.getItem(
              `@selfstorage_return_req_${c.id}`
            ).catch(() => null);

            let storedReturnReq: any = null;
            if (returnReqStr) {
              try {
                storedReturnReq = JSON.parse(returnReqStr);
              } catch {
                storedReturnReq = null;
              }
            }

            // Nhân viên đã nghiệm thu xong -> hợp đồng TERMINATED/COMPLETED mới là "đã trả kho".
            // Ưu tiên trạng thái Backend trước yêu cầu lưu cục bộ để không kẹt ở "chờ nghiệm thu".
            if (c.status === 'TERMINATED' || c.status === 'COMPLETED') {
              status = 'terminated' as any;
              statusLabel = 'Đã thanh lý trả kho';
              AsyncStorage.removeItem(`@selfstorage_return_req_${c.id}`).catch(() => null);
            } else if (returnReqStr || c.returnRequestedAt) {
              status = 'checking_out' as any;
              statusLabel = 'Chờ nghiệm thu trả kho';
            } else if (daysRemaining <= 0 || c.status === 'OVERDUE') {
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
              returnDate: c.returnDate
                ? formatVietnameseDate(c.returnDate)
                : storedReturnReq?.returnDate || undefined,
              returnTimeSlot: c.returnTimeSlot || storedReturnReq?.returnTimeSlot || undefined,
              returnRequestedAt:
                c.returnRequestedAt ||
                (storedReturnReq?.requestedAt
                  ? new Date(storedReturnReq.requestedAt).toISOString()
                  : undefined),
              monthlyRent: Number(ci.rentalPrice) || 890000,
              monthlyRentFormatted: formatVND(Number(ci.rentalPrice) || 890000) + '/tháng',
              depositAmount: Number(ci.depositAmount) || 890000,
              depositFormatted: formatVND(Number(ci.depositAmount) || 890000),
              totalPaid: Number(ci.rentalPrice) * 3,
              totalPaidFormatted: formatVND(Number(ci.rentalPrice) * 3),
              currentBalance: 0,
              currentBalanceFormatted: '0 đ (Đã thanh toán)',
              masterPin: ci.accessCode || '821301',
              smartLockStatus: 'LOCKED',
              guestAccessCodes: [],
              payments: (c.payments || []).map((p: any) => ({
                id: p.id,
                paymentCode: p.paymentCode || `PAY-${p.id}`,
                amount: p.amount,
                type: 'PERIODIC_RENT',
                typeLabel: 'Tiền thuê định kỳ',
                status: p.status,
                paidAt: formatVietnameseDate(p.createdAt),
                method: p.paymentMethod || 'SEPAY_QR',
                periodDescription: `Kỳ thuê kho ${ci.unit?.unitNumber || ''}`,
              })),
              supportTickets: rawTickets
                .filter(
                  (t: any) =>
                    String(t.contractItemId) === String(ci.id) ||
                    String(t.contractId) === String(c.id)
                )
                .map((t: any) => ({
                  id: t.id,
                  requestCode: t.ticketCode || `SUP-${t.id.slice(-6)}`,
                  subject: t.subject,
                  description: t.description,
                  category: t.category || 'OTHER',
                  categoryLabel: t.categoryLabel || 'Yêu cầu kỹ thuật',
                  priority: t.priority || 'MEDIUM',
                  status: t.status,
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
          }
        }

        if (mappedUnits.length > 0) {
          setRentedUnits(mappedUnits);
          await AsyncStorage.setItem(CACHED_UNITS_KEY, JSON.stringify(mappedUnits)).catch(() => null);
          setSelectedRentedUnit((prev) => {
            if (prev) {
              const matched = mappedUnits.find(
                (u) =>
                  u.id === prev.id ||
                  (u.contractId &&
                    String(u.contractId) === String(prev.contractId) &&
                    u.unitCode === prev.unitCode)
              );
              if (matched) return matched;
            }
            return mappedUnits[0];
          });
        }
      }
    } catch (err: any) {
      console.warn('loadCustomerContracts notice:', err?.message);
    } finally {
      setIsCustomerLoading(false);
    }
  }, []);

  const handleGuestPinCreated = (newCode: GuestAccessCode) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      guestAccessCodes: [newCode, ...selectedRentedUnit.guestAccessCodes],
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

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
    setRentedUnits((prev) => {
      const nextList = prev.map((u) => (u.id === updated.id ? updated : u));
      AsyncStorage.setItem(CACHED_UNITS_KEY, JSON.stringify(nextList)).catch(() => null);
      return nextList;
    });
  };

  const handleReturnSuccess = (checkoutDate: string, timeSlot: string) => {
    if (!selectedRentedUnit) return;
    const updated: CustomerRentedUnit = {
      ...selectedRentedUnit,
      status: 'checking_out',
      statusLabel: 'Chờ nghiệm thu trả kho',
      returnDate: checkoutDate,
      returnTimeSlot: timeSlot,
      returnRequestedAt: new Date().toISOString(),
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => {
      const nextList = prev.map((u) => (u.id === updated.id ? updated : u));
      AsyncStorage.setItem(CACHED_UNITS_KEY, JSON.stringify(nextList)).catch(() => null);
      return nextList;
    });
  };

  const handleTicketCreated = (newTicket: UnitSupportTicket) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      supportTickets: [newTicket, ...selectedRentedUnit.supportTickets],
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handlePinChanged = (newPin: string) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      masterPin: newPin,
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => {
      const nextList = prev.map((u) => (u.id === updated.id ? updated : u));
      AsyncStorage.setItem(CACHED_UNITS_KEY, JSON.stringify(nextList)).catch(() => null);
      return nextList;
    });
  };

  return {
    customerNavTab,
    setCustomerNavTab,
    customerFlowStep,
    setCustomerFlowStep,
    isCustomerSidebarVisible,
    setIsCustomerSidebarVisible,
    rentedUnits,
    setRentedUnits,
    selectedRentedUnit,
    setSelectedRentedUnit,
    isCustomerLoading,
    showGuestPinModal,
    setShowGuestPinModal,
    showRenewModal,
    setShowRenewModal,
    showUpgradeModal,
    setShowUpgradeModal,
    showReportIssueModal,
    setShowReportIssueModal,
    showChangePinModal,
    setShowChangePinModal,
    showReturnModal,
    setShowReturnModal,
    loadCustomerContracts,
    handleGuestPinCreated,
    handleRenewSuccess,
    handleReturnSuccess,
    handleTicketCreated,
    handlePinChanged,
  };
}
