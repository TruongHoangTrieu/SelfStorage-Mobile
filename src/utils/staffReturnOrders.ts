import { StaffReturnOrder } from '../types/handover';

/**
 * Một đơn trả kho chỉ được coi là "đã trả kho" khi nhân viên đã nghiệm thu
 * (hợp đồng đã TERMINATED) hoặc dữ liệu trả về đánh dấu completed.
 * Khách chỉ gửi yêu cầu (returnRequestedAt) thì vẫn là "chờ nghiệm thu".
 */
export function isReturnOrderCompleted(order: StaffReturnOrder): boolean {
  return (
    order.status === 'TERMINATED' ||
    order.status === 'COMPLETED' ||
    order.returnType === 'completed'
  );
}

/**
 * Khách đã gửi yêu cầu trả kho nhưng nhân viên chưa nghiệm thu.
 */
export function isReturnOrderPendingInspection(order: StaffReturnOrder): boolean {
  return Boolean(order.returnRequestedAt) && !isReturnOrderCompleted(order);
}

/**
 * Chuyển danh sách hợp đồng từ Backend thành danh sách đơn trả kho cho nhân viên.
 * Dùng chung cho màn "Lịch nhận & trả kho" và "Hàng đợi trả kho" để trạng thái
 * luôn nhất quán: chỉ TERMINATED mới là đã trả kho.
 */
export function mapContractsToReturnOrders(
  contracts: any[],
  facilityName: string,
  facilityId?: string | number | null
): StaffReturnOrder[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetFacilityId =
    facilityId !== undefined && facilityId !== null && String(facilityId).trim() !== ''
      ? String(facilityId)
      : null;

  return contracts
    .filter((item: any) => {
      // Lớp bảo vệ phía client: nhân viên chỉ thấy hợp đồng thuộc đúng chi nhánh mình.
      if (targetFacilityId) {
        const contractFacilityIds = (item.contractItems || [])
          .map(
            (ci: any) =>
              ci?.unit?.facility?.id || ci?.unit?.facilityId || ci?.facilityId || item?.reservation?.facilityId
          )
          .filter(Boolean)
          .map((id: any) => String(id));
        if (contractFacilityIds.length > 0 && !contractFacilityIds.includes(targetFacilityId)) {
          return false;
        }
      }

      if (item.status === 'TERMINATED' || item.status === 'COMPLETED') return true;
      // Chỉ hiển thị đơn trả kho khi khách hàng đã thực sự gửi yêu cầu / đặt lịch trả kho
      return Boolean(item.returnRequestedAt || item.returnDate);
    })
    .map((item: any) => {
      const firstUnitItem = item.contractItems?.[0];
      const endDateObj = item.endDate ? new Date(item.endDate) : new Date();
      const endDateTime = endDateObj.getTime();

      let returnType: StaffReturnOrder['returnType'] = 'today';
      let overdueDays = 0;
      let overdueFine = 0;

      if (item.status === 'TERMINATED' || item.status === 'COMPLETED') {
        returnType = 'completed';
      } else if (item.status === 'OVERDUE' || endDateTime < startOfToday) {
        returnType = 'overdue';
        const diffDays = Math.ceil((startOfToday - endDateTime) / 86400000);
        overdueDays = Math.max(1, diffDays);
        overdueFine = overdueDays * 50000;
      } else if (endDateTime >= startOfToday && endDateTime <= startOfToday + 86400000) {
        returnType = 'today';
      } else {
        returnType = 'early';
      }

      const existingPhotos =
        Array.isArray(firstUnitItem?.handoverRecords?.[0]?.photos)
          ? firstUnitItem.handoverRecords[0].photos
          : [];

      return {
        id: item.id,
        contractCode: item.contractCode,
        customerName: item.customer?.fullName || 'Khách hàng',
        phone: item.customer?.phone || '0908123456',
        email: item.customer?.email || 'customer@example.com',
        unitCode: firstUnitItem?.unit?.unitNumber || 'A-101',
        smartLockPin: firstUnitItem?.accessCode || '821301',
        unitType: firstUnitItem?.unit?.unitType?.name || 'Kho Tiêu Chuẩn',
        unitSize: `${firstUnitItem?.unit?.unitType?.size || 9.0}m²`,
        facilityName: item.reservation?.facility?.name || facilityName,
        startDate: item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '01/10/2026',
        endDate: item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN') : '31/10/2026',
        returnDate: item.returnDate
          ? new Date(item.returnDate).toLocaleDateString('vi-VN')
          : undefined,
        returnTimeSlot: item.returnTimeSlot || undefined,
        returnRequestedAt: item.returnRequestedAt || undefined,
        status: item.status,
        returnType,
        monthlyRent: Number(firstUnitItem?.rentalPrice || 0),
        depositAmount: firstUnitItem?.depositAmount || 1000000,
        unpaidFees: 0,
        overdueDays,
        overdueFine,
        extraChargesTotal: overdueFine,
        notes: item.terms || undefined,
        handoverPhotos: existingPhotos,
        handoverCondition: firstUnitItem?.handoverRecords?.[0]?.condition || 'Kho sạch sẽ, nguyên vẹn.',
      };
    });
}
