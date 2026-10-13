/**
 * Định nghĩa Type cho Phân hệ Khách hàng: Luồng 3 - Quản lý Ô kho đã Thuê
 */

export type CustomerTab =
  | 'my_units'     // 🏠 Ô kho của tôi (Luồng 3)
  | 'payments'     // 💳 Thanh toán & Hóa đơn (Luồng 4)
  | 'access'       // 🔑 Truy cập & Bảo mật (Quản lý mã/thẻ)
  | 'documents'    // 📄 Tài liệu & Hợp đồng
  | 'support'      // 🎧 Hỗ trợ & Trợ giúp (Luồng 7)
  | 'profile';     // 👤 Hồ sơ & Cài đặt

export type UnitRentalStatus = 'active' | 'expiring_soon' | 'overdue' | 'terminated';

export interface GuestAccessCode {
  id: string;
  guestName: string;
  pinCode: string;
  validFrom: string;
  validTo: string;
  usageType: 'one_time' | 'multi_time';
  status: 'active' | 'expired' | 'revoked';
  purpose?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentCode: string;
  amount: number;
  type: 'DEPOSIT' | 'RENTAL' | 'RENEWAL';
  typeLabel: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  paidAt: string;
  method: 'SEPAY_QR' | 'BANK_TRANSFER' | 'CASH';
  periodDescription: string;
}

export interface UnitSupportTicket {
  id: string;
  requestCode: string;
  category: string;
  categoryLabel: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface CustomerUser {
  id: string | number;
  fullName: string;
  email: string;
  phone: string;
  avatar: string;
  membershipTier: string;
  joinedDate?: string;
}

export interface StoredInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedValue?: string;
  notes?: string;
  addedAt: string;
}

export interface CustomerRentedUnit {
  id: string;                  // Unit ID hoặc mã định danh
  contractId: number;          // ID hợp đồng trong DB
  contractCode: string;        // Mã hợp đồng: CON-20261013-XXXXXX
  unitId: number;              // ID ngăn kho vật lý
  unitCode: string;            // Ví dụ: A-101, B-205, C-302, CL-401
  unitName: string;            // Ví dụ: Kho Cá Nhân Mini
  size: string;                // Ví dụ: 4.9m² (2.1 x 2.3m)
  dimensions?: string;         // Ví dụ: 2.1m x 2.3m x 2.8m
  features: string[];          // Ví dụ: ['Khóa Smart PIN 24/7', 'Camera AI', 'Kiểm soát độ ẩm']
  
  // Vị trí trong cơ sở kho
  facilityId: number;
  facilityName: string;
  facilityAddress: string;
  floor: string;               // Tầng 1, Tầng 2, Tầng 3
  zone: string;                // Khu A, Khu B, Khu C, Khu Mát
  mapPositionSnippet: {
    floorLabel: string;
    zoneLabel: string;
    corridor: string;
  };

  // Trạng thái hợp đồng & thời hạn
  status: UnitRentalStatus;
  statusLabel: string;
  startDate: string;           // 13/10/2026
  endDate: string;             // 13/04/2027
  nextPaymentDate: string;     // Ngày thanh toán tiếp theo
  daysRemaining: number;       // Số ngày còn lại
  totalDays: number;           // Tổng số ngày trong kỳ hạn
  
  // Tài chính
  monthlyRent: number;         // 890000
  monthlyRentFormatted: string;// 890.000 đ/tháng
  depositAmount: number;       // 890000
  depositFormatted: string;    // 890.000 đ
  totalPaid: number;           // Tổng tiền đã thanh toán
  totalPaidFormatted: string;  // 1.780.000 đ
  currentBalance: number;      // 0 (Không nợ)
  currentBalanceFormatted: string;

  // Khóa thông minh (Smart Lock)
  masterPin: string;           // Mã PIN chính: 597599
  isPinVisible?: boolean;
  smartLockStatus: 'LOCKED' | 'UNLOCKED' | 'OFFLINE';
  lastUnlockedAt?: string;

  // Dữ liệu chi tiết cho Trang B
  guestAccessCodes: GuestAccessCode[];
  payments: PaymentRecord[];
  supportTickets: UnitSupportTicket[];
  storedItems: StoredInventoryItem[];
}
