import { Platform } from 'react-native';

export const CLOUD_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://selfstorage-be-1.onrender.com/api';
export const LOCAL_API_BASE_URL = 'http://localhost:5000/api';

// Mặc định luôn sử dụng Backend Cloud đã deploy trên Render trên cả Mobile và Web
export const PRIMARY_API_BASE_URL = CLOUD_API_BASE_URL;
export const FALLBACK_API_BASE_URL = LOCAL_API_BASE_URL;

export const API_BASE_URL = PRIMARY_API_BASE_URL;

export interface Facility {
  id: string | number;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  status: string;
  operatingHours?: string;
  image?: string;
  imageUrl?: string;
  rating?: number;
}

export interface UnitType {
  id: string | number;
  name: string;
  code: string;
  size: number;
  sizeUnit: string;
  price: number;
  depositAmount: number;
  description?: string;
  status: string;
  image?: string;
  imageUrl?: string;
  features?: string[];
  dimensions?: string;
}

export interface Reservation {
  id: string | number;
  facilityId: string | number;
  unitTypeId: string | number;
  appointmentDate: string;
  rentalPeriod: number;
  rentalPeriodUnit: string;
  status: string;
  notes?: string;
  createdAt: string;
  facility?: Facility;
  unitType?: UnitType;
}

let storedToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  storedToken = token;
};

export const getAuthToken = () => storedToken;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string>),
  };

  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  // 1. Thử gọi URL chính
  try {
    const url = `${PRIMARY_API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message || data?.error || `Yêu cầu thất bại (${response.status})`;
      throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    }

    return data as T;
  } catch (err: any) {
    // 2. Thử sang URL dự phòng nếu URL chính không kết nối được
    try {
      const fallbackUrl = `${FALLBACK_API_BASE_URL}${endpoint}`;
      const res = await fetch(fallbackUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
      const fallbackData = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg =
          fallbackData?.message || fallbackData?.error || `Yêu cầu thất bại (${res.status})`;
        throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }
      return fallbackData as T;
    } catch (fallbackErr: any) {
      if (Platform.OS === 'web' && (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError')) {
        throw new Error(
          'Không thể kết nối Backend qua cổng 5000. Vui lòng mở terminal chạy "node proxy.js" (hoặc npm run proxy) để chuyển tiếp API không bị chặn CORS trên trình duyệt.'
        );
      }
      throw err;
    }
  }
}

/**
 * ==========================================================
 * CÁC HÀM GỌI API CHUYÊN BIỆT CHO LUỒNG 2 (CHECK-IN & HANDOVER)
 * ==========================================================
 */

/**
 * Đăng nhập tài khoản nhân viên cơ sở để lấy JWT accessToken
 */
export async function loginStaffApi(email = 'staff@selfstorage.vn', password = '123456') {
  const res = await apiRequest<{ accessToken: string; user?: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res?.accessToken) {
    setAuthToken(res.accessToken);
  }
  return res;
}

/**
 * Lấy danh sách đơn đặt chỗ từ Backend cho hàng đợi nhận kho
 */
export async function fetchStaffReservationsApi(facilityId?: number | string) {
  let endpoint = '/reservations?limit=50';
  if (facilityId) endpoint += `&facilityId=${encodeURIComponent(String(facilityId))}`;
  return apiRequest<any>(endpoint);
}

/**
 * Tra cứu chi tiết đơn đặt chỗ để chuẩn bị bàn giao (GET /handovers/reservations/:id)
 */
export async function getReservationForCheckInApi(reservationId: number) {
  return apiRequest<any>(`/handovers/reservations/${reservationId}`);
}

/**
 * Lấy danh sách ô kho vật lý (GET /storage-units)
 */
export async function getAvailableUnitsApi(facilityId?: number | string) {
  let endpoint = '/storage-units';
  if (facilityId) endpoint += `?facilityId=${encodeURIComponent(String(facilityId))}`;
  return apiRequest<any>(endpoint);
}

/**
 * Kích hoạt bàn giao kho & hợp đồng (POST /handovers/check-in)
 */
export async function performCheckInApi(payload: {
  reservationId: string | number;
  condition: string;
  notes?: string;
  photos?: any[];
  unitCode?: string;
}) {
  // Chỉ gửi các trường thuộc CheckInDto hợp lệ (reservationId, condition, notes, photos)
  // để tránh lỗi "property unitCode should not exist" của NestJS ValidationPipe
  const cleanBody: any = {
    reservationId: String(payload.reservationId),
    condition: payload.condition,
  };
  if (payload.notes) cleanBody.notes = payload.notes;
  if (payload.photos && Array.isArray(payload.photos) && payload.photos.length > 0) {
    cleanBody.photos = payload.photos;
  }

  return apiRequest<{
    message: string;
    contract: {
      id: number;
      contractCode: string;
      startDate: string;
      endDate: string;
      status: string;
      monthlyRent: any;
      depositAmount: any;
    };
    contractItems?: {
      id: number;
      unitId: number;
      unitNumber: string;
      rentalPrice?: any;
      depositAmount?: any;
      accessCode?: string;
      accessCodeStatus?: string;
      status?: string;
    }[];
    accessCodes?: {
      id: number;
      code: string;
      unitId: number;
      type: string;
      validFrom: string;
      validTo: string;
    }[];
    handoverRecords: {
      id: number;
      unitId: number;
      type: string;
      condition: string;
      notes?: string;
      handoverDate: string;
    }[];
  }>('/handovers/check-in', {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
}

/**
 * ==========================================================
 * CÁC HÀM GỌI API CHO LUỒNG 3 (QUẢN LÝ Ô KHO ĐÃ THUÊ - CUSTOMER)
 * ==========================================================
 */

/**
 * Đăng nhập tài khoản khách hàng để lấy JWT Token
 */
export async function loginCustomerApi(email = 'customer@selfstorage.vn', password = '123456') {
  const res = await apiRequest<{ accessToken?: string; token?: string; user?: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res?.accessToken || res?.token;
  if (token) {
    setAuthToken(token);
  }
  return res;
}

/**
 * Lấy danh sách hợp đồng và các ô kho khách hàng đang thuê (GET /contracts/my-contracts)
 */
export async function fetchMyContractsApi() {
  return apiRequest<any[]>('/contracts/my-contracts');
}

/**
 * Đổi mã PIN Smart Lock của ô kho (POST /contracts/:contractId/units/:unitId/smart-lock/change-pin)
 */
export async function changeSmartLockPinApi(contractId: number, unitId: number, newPin: string) {
  return apiRequest<any>(`/contracts/${contractId}/units/${unitId}/smart-lock/change-pin`, {
    method: 'POST',
    body: JSON.stringify({ newPin }),
  });
}

/**
 * Gửi yêu cầu hỗ trợ sự cố ô kho (POST /support/requests)
 */
export async function createSupportRequestApi(payload: {
  facilityId: string | number;
  contractItemId?: string | number;
  category: string;
  subject: string;
  description: string;
  priority?: string;
  photos?: any[];
}) {
  let facilityIdStr = String(payload.facilityId || '');
  if (!facilityIdStr || facilityIdStr === '1' || facilityIdStr.length < 10) {
    facilityIdStr = '6ac4ea732f3017f8106ae7a6'; // Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp
  }

  const body: any = {
    facilityId: facilityIdStr,
    category: payload.category || 'OTHER',
    subject: payload.subject,
    description: payload.description,
    priority: payload.priority || 'MEDIUM',
    photos: payload.photos || [],
  };

  if (payload.contractItemId) {
    const cid = String(payload.contractItemId);
    if (cid.length === 24) {
      body.contractItemId = cid;
    }
  }

  return apiRequest<any>('/support/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Lấy danh sách phiếu yêu cầu hỗ trợ của khách hàng (GET /support/requests)
 */
export async function fetchMySupportRequestsApi() {
  return apiRequest<{ data: any[]; meta: any }>('/support/requests');
}

/**
 * Thêm ghi chú/phản hồi vào phiếu hỗ trợ (POST /support/requests/:id/notes)
 */
export async function addTicketNoteApi(ticketId: string, note: string) {
  return apiRequest<any>(`/support/requests/${ticketId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

/**
 * Tạo mã khách tạm thời (POST /contracts/:contractId/units/:unitId/guest-codes)
 */
export async function createGuestCodeApi(
  contractId: number,
  unitId: number,
  payload: {
    guestName: string;
    pinCode: string;
    durationOption: '2h' | '24h' | '3d';
    usageType?: string;
    purpose?: string;
  },
) {
  return apiRequest<any>(`/contracts/${contractId}/units/${unitId}/guest-codes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Gia hạn hợp đồng thuê kho (POST /contracts/:id/renew)
 */
export async function renewContractApi(
  contractId: number,
  extendedMonths: number,
  paymentMethod = 'SEPAY_QR',
) {
  return apiRequest<any>(`/contracts/${contractId}/renew`, {
    method: 'POST',
    body: JSON.stringify({ extendedMonths, paymentMethod }),
  });
}

/**
 * Lấy danh sách đồ đạc lưu trong ngăn kho (GET /contracts/:contractId/units/:unitId/items)
 */
export async function fetchStoredItemsApi(contractId: number | string, unitId: number | string) {
  return apiRequest<any[]>(`/contracts/${contractId}/units/${unitId}/items`);
}

/**
 * Thêm món đồ mới vào ngăn kho (POST /contracts/:contractId/units/:unitId/items)
 */
export async function createStoredItemApi(
  contractId: number | string,
  unitId: number | string,
  payload: {
    name: string;
    quantity: number;
    category?: string;
    description?: string;
    photoUrl?: string;
  }
) {
  return apiRequest<any>(`/contracts/${contractId}/units/${unitId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Xóa món đồ khỏi kho khi đã mang ra (DELETE /contracts/items/:itemId)
 */
export async function deleteStoredItemApi(itemId: number | string) {
  return apiRequest<any>(`/contracts/items/${itemId}`, {
    method: 'DELETE',
  });
}
