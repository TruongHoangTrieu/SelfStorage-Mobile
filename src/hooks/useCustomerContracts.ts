// src/hooks/useCustomerContracts.ts
import { useState, useCallback } from 'react';
import {
  loginCustomerApi,
  fetchMyContractsApi,
  fetchMySupportRequestsApi,
} from '../api';
import {
  CustomerTab,
  CustomerRentedUnit,
  GuestAccessCode,
  UnitSupportTicket,
} from '../types/customerStorage';
import { INITIAL_RENTED_UNITS } from '../data/mockCustomerStorageData';
import { formatVND, formatVietnameseDate } from '../utils/formatters';

export function useCustomerContracts() {
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

  const loadCustomerContracts = useCallback(async () => {
    try {
      setIsCustomerLoading(true);
      await loginCustomerApi('customer@selfstorage.vn', '123456').catch(() => null);
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

              // ✅ SỬA 1: Bỏ fallback PIN giả
              masterPin: ci.accessCode || '',

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
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
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

  // ✅ SỬA 2: Đồng bộ masterPin vào cả 2 state
  const handlePinChanged = (newPin: string) => {
    if (!selectedRentedUnit) return;
    const updated = {
      ...selectedRentedUnit,
      masterPin: newPin,
    };
    setSelectedRentedUnit(updated);
    setRentedUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
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
    loadCustomerContracts,
    handleGuestPinCreated,
    handleRenewSuccess,
    handleTicketCreated,
    handlePinChanged,
  };
}