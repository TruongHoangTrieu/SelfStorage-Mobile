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

export type ReturnCategory = 'all' | 'today' | 'early' | 'overdue' | 'completed';

export interface StaffReturnOrder {
  id: string; // contractId
  contractCode: string;
  customerName: string;
  phone: string;
  email?: string;
  unitCode: string;
  unitType?: string;
  unitSize?: string;
  facilityName?: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'OVERDUE' | 'TERMINATED' | 'EXPIRED';
  returnType: 'today' | 'early' | 'overdue' | 'completed';
  depositAmount: number; // Tiền cọc ban đầu (đã cấn trừ trực tiếp vào tiền thuê phòng khi nhận kho)
  unpaidFees: number;
  overdueDays: number;
  overdueFine: number;
  extraChargesTotal: number; // Phụ phí phát sinh khi trả kho (quá hạn, hư hại)
  estimatedRefund?: number;
  notes?: string;
  handoverPhotos?: string[]; // Ảnh hiện trạng khi bàn giao kho (trước khi thuê)
  handoverCondition?: string; // Tình trạng ô kho lúc bàn giao
  handoverDate?: string;
  returnPhotos?: string[]; // Ảnh chụp nghiệm thu lúc trả kho (sau khi thuê - để đối chiếu)
  returnCondition?: string;
}


export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'UNIT' | 'LOCK' | 'ACCESS_CODE' | 'PAYMENT' | 'STORED_ITEMS' | 'LOST_KEY' | 'DAMAGE' | 'CLEANING' | 'OTHER';

export interface TicketLog {
  id: string;
  userId: string;
  note: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    role?: string;
  };
}

export interface StaffSupportTicket {
  id: string;
  requestCode: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  unitCode?: string;
  unitId?: string | number;
  facilityId: string | number;
  facilityName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  photos?: string[];
  createdAt: string;
  resolvedAt?: string;
  logs?: TicketLog[];
}
