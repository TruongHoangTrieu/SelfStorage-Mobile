/**
 * API Client config for Mobile App
 */
export const API_BASE_URL = 'http://localhost:5000/api';
export const CLOUD_API_BASE_URL = 'https://selfstorage-be-1.onrender.com/api';

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

  // Thử gọi local backend trước (http://localhost:5000/api)
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message || data?.error || `Yêu cầu thất bại (${response.status})`;
      throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    }

    return data as T;
  } catch (err: any) {
    // Nếu kết nối local thất bại, thử sang cloud backend
    if (err?.message?.indexOf('Failed to fetch') !== -1 || err?.message?.indexOf('Network request failed') !== -1) {
      try {
        const cloudUrl = `${CLOUD_API_BASE_URL}${endpoint}`;
        const res = await fetch(cloudUrl, {
          ...options,
          headers,
        });
        const cloudData = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errorMsg =
            cloudData?.message || cloudData?.error || `Yêu cầu thất bại (${res.status})`;
          throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
        }
        return cloudData as T;
      } catch {
        throw err;
      }
    }
    throw err;
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
export async function fetchStaffReservationsApi(facilityId?: number) {
  let endpoint = '/reservations?limit=50';
  if (facilityId) endpoint += `&facilityId=${facilityId}`;
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
export async function getAvailableUnitsApi(facilityId = 1) {
  return apiRequest<any>(`/storage-units?facilityId=${facilityId}`);
}

/**
 * Kích hoạt bàn giao kho & hợp đồng (POST /handovers/check-in)
 */
export async function performCheckInApi(payload: {
  reservationId: number;
  condition: string;
  notes?: string;
  photos?: any[];
  unitCode?: string;
}) {
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
    body: JSON.stringify(payload),
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
export async function loginCustomerApi(email = 'hai.nguyen@example.com', password = '123456') {
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
  facilityId: number;
  contractItemId?: number;
  category: string;
  subject: string;
  description: string;
  priority?: string;
  photos?: any[];
}) {
  return apiRequest<any>('/support/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Lấy danh sách phiếu yêu cầu hỗ trợ của khách hàng (GET /support/requests)
 */
export async function fetchMySupportRequestsApi() {
  return apiRequest<{ data: any[]; meta: any }>('/support/requests');
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
