export interface CheckInAppointment {
  id: string; // Mã hiển thị (vd "SS-BK-2026-8910" hoặc "RSV-20261013-A1B2C3")
  rawId?: number; // ID số nguyên trong database Backend
  facilityId?: number;
  facilityName?: string;
  facilityAddress?: string;
  customerName: string;
  phone: string;
  email: string;
  idCard: string;
  identityType?: 'CCCD' | 'PASSPORT' | 'BUSINESS_LICENSE';
  identityNumber?: string;
  maskedIdentityNumber?: string;
  identityAddress?: string;
  isIdentityVerified?: boolean;
  identityFrontUrl?: string;
  identityBackUrl?: string;
  slotTime: string; // "09:00 SA", "10:00 SA"
  timeCategory: 'morning' | 'afternoon';
  unitType: string;
  unitTypeId?: number;
  unitSize: string;
  unitId?: number;
  assignedUnit: string;
  preferredFloor: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  depositStatus: 'paid' | 'unpaid';
  depositAmount: string;
  rentalStatus?: 'paid' | 'unpaid';
  monthlyRent: string;
  startDate: string;
  durationMonths: number;
  purpose: string;
  specialNotes?: string;
  accessPin?: string;
  rfidCard?: string;
  contractCode?: string;
  completedAt?: string;
  cancelReason?: string;
  rescheduledAt?: string;
}

export interface AvailableUnit {
  id: string;
  rawId?: number;
  code: string;
  type: string;
  size: string;
  floor: string;
  zone: string;
  features: string;
  status: 'vacant' | 'occupied' | 'maintenance';
}

export interface StaffUser {
  id: string | number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  facilityId?: string | number;
  facilityName?: string;
}

export type StaffTab = 
  | 'queue'      // Hàng đợi nhận kho (Luồng 2 đang hoạt động)
  | 'dashboard'  // Bảng điều khiển (Tổng quan hôm nay)
  | 'checkout'   // Trả kho / Thanh lý
  | 'facility'   // Sơ đồ cơ sở / Trạng thái ô kho
  | 'support'    // Hỗ trợ & Sự cố
  | 'settings';  // Cài đặt

export type FlowStep = 'queue' | 'handover' | 'success';
