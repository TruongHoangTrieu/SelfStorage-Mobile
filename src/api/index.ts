import AsyncStorage from '@react-native-async-storage/async-storage';
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
  description?: string;
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

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
  try {
    storedToken =
      window.localStorage.getItem('@selfstorage_token') ||
      window.localStorage.getItem('token') ||
      null;
  } catch {}
}

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

  let token = storedToken;
  if (!token) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        token =
          window.localStorage.getItem('@selfstorage_token') ||
          window.localStorage.getItem('token') ||
          null;
        if (token) storedToken = token;
      } catch {}
    } else {
      try {
        token = await AsyncStorage.getItem('@selfstorage_token');
        if (token) storedToken = token;
      } catch {}
    }
  }

  if (headers['Authorization'] === '') {
    delete headers['Authorization'];
  } else if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. Thử gọi URL chính
  try {
    const url = `${PRIMARY_API_BASE_URL}${endpoint}`;
    const resolvedCredentials: RequestCredentials =
      options.credentials ?? (Platform.OS === 'web' ? 'include' : 'omit');
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: resolvedCredentials,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message || data?.error || `Yêu cầu thất bại (${response.status})`;
      const httpError: any = new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      httpError.status = response.status;
      httpError.isHttpError = response.status < 500;
      throw httpError;
    }

    return data as T;
  } catch (err: any) {
    // Nếu lỗi là lỗi nghiệp vụ HTTP 4xx từ server chính, ném thẳng lỗi về UI, không gọi fallback localhost
    if (err?.isHttpError) {
      throw err;
    }
    // 2. Thử sang URL dự phòng nếu URL chính không kết nối được (Network error hoặc 5xx)
    try {
      const fallbackUrl = `${FALLBACK_API_BASE_URL}${endpoint}`;
      const res = await fetch(fallbackUrl, {
        ...options,
        headers,
        credentials: options.credentials ?? (Platform.OS === 'web' ? 'include' : 'omit'),
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
  identityType?: 'CCCD' | 'PASSPORT' | 'BUSINESS_LICENSE';
  identityNumber?: string;
  identityAddress?: string;
  isIdentityVerified?: boolean;
  identityFrontUrl?: string;
  identityBackUrl?: string;
  customerSignature?: string;
}) {
  // Chỉ gửi các trường thuộc CheckInDto hợp lệ
  const cleanBody: any = {
    reservationId: String(payload.reservationId),
    condition: payload.condition,
    ...(payload.customerSignature ? { customerSignature: payload.customerSignature } : {}),
  };
  if (payload.notes) cleanBody.notes = payload.notes;
  if (payload.photos && Array.isArray(payload.photos) && payload.photos.length > 0) {
    cleanBody.photos = payload.photos;
  }
  if (payload.identityType) cleanBody.identityType = payload.identityType;
  if (payload.identityNumber) cleanBody.identityNumber = payload.identityNumber.trim();
  if (payload.identityAddress) cleanBody.identityAddress = payload.identityAddress.trim();
  if (typeof payload.isIdentityVerified === 'boolean') {
    cleanBody.isIdentityVerified = payload.isIdentityVerified;
  }
  if (payload.identityFrontUrl) cleanBody.identityFrontUrl = payload.identityFrontUrl;
  if (payload.identityBackUrl) cleanBody.identityBackUrl = payload.identityBackUrl;

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
 * Tải ảnh CCCD/Hộ chiếu lên Cloudinary Authenticated Storage có đóng dấu Watermark (POST /handovers/upload-cccd)
 */
export async function uploadCccdApi(
  photoUri: string,
  side: 'front' | 'back',
  reservationCode?: string,
  base64?: string
): Promise<{ url: string; signedUrl: string; public_id: string; expiresAt: number }> {
  const orderCode = (reservationCode || 'CHECKIN').replace(/[^a-zA-Z0-9\-_]/g, '');
  const sideText = side === 'back' ? 'MAT SAU' : 'MAT TRUOC';
  const now = new Date();
  const nowStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const watermarkText = `SELFSTORAGE - HO SO NHAN KHO ${orderCode} - ${nowStr} - ${sideText}`;
  const rawBase64 = base64 || (photoUri?.startsWith('data:') ? photoUri : undefined);

  // 1. Thử qua Backend endpoint /handovers/upload-cccd trước
  try {
    if (rawBase64) {
      const beRes = await apiRequest<{ url: string; signedUrl: string; public_id: string; expiresAt: number }>(
        '/handovers/upload-cccd',
        {
          method: 'POST',
          body: JSON.stringify({
            base64: rawBase64,
            side,
            reservationCode,
          }),
        }
      );
      if (beRes?.url && beRes.url.startsWith('http')) {
        return beRes;
      }
    }
  } catch {
    // Nếu Backend trên Render chưa cập nhật route base64, chuyển ngay sang Bước 2 (Upload trực tiếp Cloudinary + Watermark)
  }

  // 2. Upload trực tiếp lên Cloudinary thư mục selfstorage/cccd và gắn bộ lọc đóng dấu Watermark
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'micb9okr';
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'selfstorage_uploads';
    const data = new FormData();

    if (rawBase64) {
      const formatted = rawBase64.startsWith('data:')
        ? rawBase64
        : `data:image/jpeg;base64,${rawBase64}`;
      data.append('file', formatted);
    } else {
      const uriParts = (photoUri || '').split('.');
      const fileType = uriParts[uriParts.length - 1] || 'jpg';
      data.append('file', {
        uri: photoUri,
        name: `cccd_${side}_${Date.now()}.${fileType}`,
        type: `image/${fileType.toLowerCase() === 'png' ? 'png' : 'jpeg'}`,
      } as any);
    }

    data.append('upload_preset', uploadPreset);
    data.append('folder', 'selfstorage/cccd');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: data,
    });
    const json = await res.json();

    if (json?.secure_url) {
      const transformSegment = `w_1200,c_limit,q_auto/l_text:Arial_36_bold:${encodeURIComponent(
        watermarkText
      )},co_rgb:ffffff,b_rgb:dc2626,o_70,a_-22,g_center`;
      const watermarkedUrl = json.secure_url.replace(
        '/image/upload/',
        `/image/upload/${transformSegment}/`
      );
      const expiresAt = Math.floor(Date.now() / 1000) + 300;
      return {
        url: watermarkedUrl,
        signedUrl: `${watermarkedUrl}?expiresAt=${expiresAt}`,
        public_id: json.public_id || `selfstorage/cccd/cccd_${side}_${Date.now()}`,
        expiresAt,
      };
    }
  } catch (err: any) {
    console.warn('Lỗi upload CCCD trực tiếp lên Cloudinary:', err?.message || err);
  }

  return {
    url: photoUri,
    signedUrl: photoUri,
    public_id: `offline-cccd-${Date.now()}`,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}

/**
 * Ghi nhận Audit Log truy vết và giải mã CCCD (POST /handovers/log-cccd-access)
 */
export async function logCccdAccessApi(contractOrResId: string, reason: string): Promise<{
  success: boolean;
  decryptedNumber: string | null;
  maskedNumber: string | null;
  identityNumber?: string | null;
  identityFrontUrl?: string | null;
  identityBackUrl?: string | null;
}> {
  return apiRequest('/handovers/log-cccd-access', {
    method: 'POST',
    body: JSON.stringify({
      reservationId: contractOrResId,
      contractId: contractOrResId,
      action: 'VIEW_UNMASKED_CCCD',
      reason,
    }),
  });
}

/**
 * Lấy danh sách hợp đồng cho nhân viên / cơ sở kho (GET /contracts)
 */
export async function fetchStaffContractsApi(facilityId?: number | string, status?: string) {
  let endpoint = '/contracts';
  const queryParts: string[] = [];
  if (facilityId) queryParts.push('facilityId=' + encodeURIComponent(String(facilityId)));
  if (status) queryParts.push('status=' + encodeURIComponent(status));
  if (queryParts.length > 0) endpoint += '?' + queryParts.join('&');
  return apiRequest<any[]>(endpoint);
}

/**
 * Tra cứu thông tin hợp đồng để nhân viên chuẩn bị Check-out & Nghiệm thu (GET /handovers/contracts/:id/check-out)
 */
export async function getContractForCheckOutApi(contractId: string) {
  return apiRequest<any>('/handovers/contracts/' + contractId + '/check-out');
}

/**
 * Thực hiện Check-out & Bàn giao hoàn trả kho (POST /handovers/check-out)
 */
export interface CheckOutPayload {
  contractId: string;
  condition: string;
  notes?: string;
  photos?: any[];
  damageFee?: number;
  cleaningFee?: number;
  refundDeposit?: boolean;
  refundAmount?: number;
  unitCondition?: 'AVAILABLE' | 'UNDER_MAINTENANCE';
  customerSignature?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  newAccessCode?: string;
  // Legacy fields for backward compatibility
  actualOverdueDays?: number;
  actualOverdueFine?: number;
  unpaidExtraChargesDeducted?: number;
  damageFineAmount?: number;
  actualRefundAmount?: number;
  targetUnitStatus?: 'AVAILABLE' | 'UNDER_MAINTENANCE';
}

export async function fetchOverduePolicyApi() {
  const res = await apiRequest<any>('/operations/policies?policyType=OVERDUE', {
    method: 'GET',
  });
  const list = Array.isArray(res) ? res : res?.data || [];
  const pol = list[0];
  const val = pol?.value || {};
  const liquidationThresholdDays = Number(
    val.liquidationThresholdDays ?? val.gracePeriodDays ?? val.grace_period_days ?? 7
  );
  return {
    liquidationThresholdDays,
    gracePeriodDays: liquidationThresholdDays,
    dailyFinePercent: Number(val.dailyFinePercent ?? val.daily_fine_rate ?? 1.5),
  };
}

export async function performCheckOutApi(payload: CheckOutPayload) {
  const coreBody = {
    contractId: payload.contractId,
    condition: payload.condition,
    notes: payload.notes || '',
    photos: payload.photos || [],
    damageFee: payload.damageFee ?? payload.damageFineAmount ?? 0,
    cleaningFee: payload.cleaningFee ?? 0,
    refundDeposit: payload.refundDeposit ?? true,
    refundAmount: payload.refundAmount ?? payload.actualRefundAmount ?? 0,
    unitCondition: payload.unitCondition ?? payload.targetUnitStatus ?? 'AVAILABLE',
    customerSignature: payload.customerSignature || undefined,
  };
  const extendedBody = {
    ...coreBody,
    actualOverdueDays: payload.actualOverdueDays,
    actualOverdueFine: payload.actualOverdueFine,
    paymentMethod: payload.paymentMethod || 'CASH',
    newAccessCode: payload.newAccessCode || undefined,
  };
  try {
    return await apiRequest<any>('/handovers/check-out', {
      method: 'POST',
      body: JSON.stringify(extendedBody),
    });
  } catch (err: any) {
    // Tương thích ngược với Backend chưa cập nhật DTO các field mở rộng
    if (err?.status === 400 && String(err?.message || '').includes('should not exist')) {
      return apiRequest<any>('/handovers/check-out', {
        method: 'POST',
        body: JSON.stringify(coreBody),
      });
    }
    throw err;
  }
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
export async function changeSmartLockPinApi(
  contractId: number | string,
  unitId: number | string,
  newPin: string
) {
  return apiRequest<any>(
    `/contracts/${encodeURIComponent(String(contractId))}/units/${encodeURIComponent(String(unitId))}/smart-lock/change-pin`,
    {
      method: 'POST',
      body: JSON.stringify({ newPin }),
    }
  );
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
 * Lấy danh sách yêu cầu hỗ trợ sự cố cho nhân viên / cơ sở (GET /support/requests)
 */
export async function fetchStaffSupportRequestsApi(facilityId?: string | number, status?: string, page = 1, limit = 20) {
  let endpoint = `/support/requests?page=${page}&limit=${limit}`;
  if (facilityId) endpoint += `&facilityId=${encodeURIComponent(String(facilityId))}`;
  if (status && status !== 'all') endpoint += `&status=${encodeURIComponent(status)}`;
  return apiRequest<{ data: any[]; meta: any }>(endpoint);
}

/**
 * Xem chi tiết yêu cầu hỗ trợ kèm toàn bộ nhật ký (GET /support/requests/:id)
 */
export async function getSupportRequestDetailApi(id: string) {
  return apiRequest<any>(`/support/requests/${id}`);
}

/**
 * Cập nhật tiến độ xử lý và trạng thái sự cố (PATCH /support/requests/:id/progress)
 */
export async function updateTicketProgressApi(id: string, status: string, note?: string, photos?: string[]) {
  const effectiveNote = note?.trim() || `Cập nhật trạng thái sang ${status}`;
  return apiRequest<any>(`/support/requests/${id}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note: effectiveNote, photos }),
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
  contractId: number | string,
  extendedMonths: number,
  paymentMethod = 'SEPAY_QR',
  paymentCode?: string,
) {
  return apiRequest<any>(`/contracts/${contractId}/renew`, {
    method: 'POST',
    body: JSON.stringify({ extendedMonths, paymentMethod, paymentCode }),
  });
}

/**
 * Khách hàng gửi yêu cầu trả kho kèm ngày & khung giờ bàn giao (POST /contracts/:id/return-request)
 */
export interface ReturnRequestPayload {
  returnDate: string; // ISO date: YYYY-MM-DD
  returnTimeSlot: string; // "10:00 - 11:00"
}

export async function submitReturnRequestApi(
  contractId: number | string,
  payload: ReturnRequestPayload,
) {
  return apiRequest<any>(
    `/contracts/${encodeURIComponent(String(contractId))}/return-request`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
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

/**
 * ==========================================================
 * CÁC HÀM GỌI API CHO TRỢ LÝ AI (3 KỸ NĂNG & ML MODELS)
 * ==========================================================
 */

export interface AiItem {
  item: string;
  catalog_name?: string;
  quantity: number;
  unit_volume_m3?: number;
  total_volume_m3?: number;
  estimated?: boolean;
  stackable?: boolean;
  note?: string | null;
}

export interface AiSuggestedUnit {
  unit_id: string;
  unit_number: string;
  unit_type_id?: string;
  unit_type_name?: string;
  facility_name?: string;
  size_m2?: number;
  volume_m3?: number;
  price_per_month?: number;
  deposit_amount?: number;
}

export interface AiChatData {
  items?: AiItem[];
  total_raw_volume_m3?: number;
  required_volume_m3?: number;
  suggested_units?: AiSuggestedUnit[];
  method?: string;
  confidence?: number;
  out_of_scope?: boolean;
  [key: string]: unknown;
}

export interface AiChatResponse {
  conversation_id: string;
  intent: 'size_advice' | 'search_policy' | 'recommend_package' | 'get_live_data' | 'out_of_scope' | 'fallback' | string;
  reply: string;
  data?: AiChatData;
  sources?: string[];
  model_version?: string;
}

/**
 * Gửi tin nhắn đến Trợ lý AI (hỗ trợ cả khách vãng lai và đã đăng nhập)
 */
export async function sendAiChatApi(
  message: string,
  options?: {
    conversationId?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    facilityId?: string;
  }
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversationId: options?.conversationId,
      history: options?.history,
      facilityId: options?.facilityId,
    }),
  });
}

/**
 * Kiểm tra trạng thái AI Service
 */
export async function checkAiHealthApi(): Promise<any> {
  return apiRequest<any>('/ai/health', {
    method: 'GET',
  });
}

// ─── NOTIFICATIONS API ────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type:
    | 'RESERVATION'
    | 'PAYMENT'
    | 'CONTRACT'
    | 'ACCESS'
    | 'SUPPORT'
    | 'RENEWAL'
    | 'SYSTEM'
    | string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

/**
 * Lấy danh sách thông báo người dùng (có phân trang & lọc theo trạng thái đọc)
 */
export async function getNotificationsApi(
  page = 1,
  limit = 20,
  isRead?: boolean,
  type?: string
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (typeof isRead === 'boolean') {
    params.append('isRead', String(isRead));
  }
  if (type) {
    params.append('type', type);
  }
  return apiRequest<NotificationsResponse>(`/notifications?${params.toString()}`);
}

/**
 * Lấy số lượng thông báo chưa đọc
 */
export async function getUnreadNotifCountApi(): Promise<{ unreadCount: number }> {
  return apiRequest<{ unreadCount: number }>('/notifications/unread-count');
}

/**
 * Đánh dấu toàn bộ thông báo là đã đọc
 */
export async function markAllNotificationsReadApi(): Promise<{ count: number }> {
  return apiRequest<{ count: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

/**
 * Đánh dấu 1 thông báo cụ thể là đã đọc
 */
export async function getNotificationDetailApi(id: string): Promise<AppNotification & { relatedEntity?: any }> {
  return apiRequest<AppNotification & { relatedEntity?: any }>(`/notifications/${id}`);
}

export async function markNotificationReadApi(id: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * Xóa 1 thông báo
 */
export async function deleteNotificationApi(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Tạo yêu cầu thanh toán tiền thuê còn lại sau cọc (Flow 2: Rental Payment)
 */
export async function createRentalPaymentApi(
  reservationId: string | number,
  paymentMethod: 'BANK_TRANSFER' | 'CASH' = 'BANK_TRANSFER'
) {
  return apiRequest<{
    payment: any;
    qr: {
      qrCodeUrl: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
      amount: number;
      transferContent: string;
    };
    reservation: any;
  }>('/payments/rental', {
    method: 'POST',
    body: JSON.stringify({
      reservationId: String(reservationId),
      paymentMethod,
    }),
  });
}

/**
 * Lấy tóm tắt tình trạng thanh toán của đơn giữ chỗ (Kiểm tra cọc & tiền thuê)
 */
export async function getReservationPaymentSummaryApi(reservationId: string | number) {
  return apiRequest<{
    reservationId: string;
    totalAmount: number;
    depositAmount: number;
    depositPaid: boolean;
    rentalAmount: number;
    rentalPaid: boolean;
    remainingAmountToPay: number;
    reservationStatus: string;
  }>(`/payments/reservations/${reservationId}/summary`);
}

/**
 * Mô phỏng thanh toán SePay Webhook (hỗ trợ kiểm thử tức thì)
 */
export async function simulatePaymentWebhookApi(payload: {
  id?: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string;
  content: string;
  transferType?: string;
  transferAmount: number;
  accumulated?: number;
  subAccount?: string;
  referenceCode?: string;
  description?: string;
}) {
  return apiRequest<any>('/payments/sepay/webhook', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


let staffPaymentLookupToken: string | null = null;

/**
 * Lấy JWT Token nhân viên riêng biệt chỉ dùng để tra cứu danh sách giao dịch SePay,
 * TUYỆT ĐỐI KHÔNG ghi đè setAuthToken của khách hàng đang đăng nhập.
 */
async function getStaffTokenForPaymentLookup(forceRefresh = false): Promise<string | null> {
  if (staffPaymentLookupToken && !forceRefresh) {
    return staffPaymentLookupToken;
  }
  try {
    // credentials: 'omit' để cookie phiên đăng nhập hiện tại (ví dụ staff An Phú hoặc khách) không bao giờ bị ghi đè sang Võ Nguyên Giáp
    const res = await apiRequest<{ accessToken?: string; token?: string }>('/auth/login', {
      method: 'POST',
      credentials: 'omit',
      headers: { Authorization: '' },
      body: JSON.stringify({ email: 'staff@selfstorage.vn', password: '123456' }),
    });
    const token = res?.accessToken || res?.token || null;
    if (token) {
      staffPaymentLookupToken = token;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Lấy danh sách các giao dịch thanh toán gần nhất từ hệ thống (hỗ trợ cả Render Cloud & Local)
 */
export async function fetchRecentSystemPaymentsApi(limit = 50): Promise<any[]> {
  try {
    // Nếu đang có token nhân viên (ví dụ staff An Phú), ưu tiên gọi trực tiếp bằng token hiện tại trước
    const currentToken = getAuthToken();
    if (currentToken) {
      const directRes = await apiRequest<any>(`/payments?limit=${limit}`).catch(() => null);
      const directList = Array.isArray(directRes?.data)
        ? directRes.data
        : Array.isArray(directRes)
        ? directRes
        : null;
      if (directList) {
        return directList;
      }
    }

    const staffToken = await getStaffTokenForPaymentLookup(false);
    const headers: Record<string, string> = staffToken
      ? { Authorization: `Bearer ${staffToken}` }
      : {};
    const res = await apiRequest<any>(`/payments?limit=${limit}`, {
      headers,
      credentials: 'omit',
    });
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  } catch {
    const refreshedToken = await getStaffTokenForPaymentLookup(true);
    const headers: Record<string, string> = refreshedToken
      ? { Authorization: `Bearer ${refreshedToken}` }
      : {};
    const res = await apiRequest<any>(`/payments?limit=${limit}`, {
      headers,
      credentials: 'omit',
    }).catch(() => null);
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  }
}

/**
 * Tạo phiên thanh toán gia hạn hợp đồng (Đăng ký Payment PENDING trên Database & lấy mã VietQR)
 */
export async function createRenewalPaymentSessionApi(payload: {
  contractId: string | number;
  unitCode: string;
  amount: number;
  months: number;
}) {
  const bankCode = process.env.EXPO_PUBLIC_SEPAY_BANK_CODE || 'MBBank';
  const accountNumber = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NUMBER || '0838500046';
  const accountName = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NAME || 'TRUONG DINH LONG';

  // 1. Gọi trực tiếp API Backend để tạo bản ghi Payment PENDING trên MongoDB
  try {
    const res = await apiRequest<{
      payment: any;
      qr: {
        qrCodeUrl: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        transferContent: string;
      };
      paymentCode: string;
    }>('/payments/surcharge', {
      method: 'POST',
      body: JSON.stringify({
        contractId: String(payload.contractId),
        unitCode: payload.unitCode,
        amount: payload.amount,
        reason: `Gia hạn hợp đồng kho #${payload.unitCode} thêm ${payload.months} tháng`,
      }),
    });

    if (res?.paymentCode) {
      const code = res.paymentCode;
      const qrUrl =
        res.qr?.qrCodeUrl ||
        `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${payload.amount}&addInfo=${encodeURIComponent(
          code
        )}&accountName=${encodeURIComponent(accountName)}`;

      return {
        paymentCode: code,
        qrCodeUrl: qrUrl,
        bankName: res.qr?.bankCode || bankCode,
        accountNumber: res.qr?.accountNumber || accountNumber,
        accountName: res.qr?.accountName || accountName,
        transferContent: code,
        amount: payload.amount,
      };
    }
  } catch (err: any) {
    console.warn('createRenewalPaymentSessionApi backend fallback notice:', err?.message);
  }

  // 2. Dự phòng: Tạo mã PAYSUR duy nhất
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  const fallbackCode = `PAYSUR${timestampSuffix}${randomSuffix}`;
  const qrCodeUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${payload.amount}&addInfo=${encodeURIComponent(
    fallbackCode
  )}&accountName=${encodeURIComponent(accountName)}`;

  return {
    paymentCode: fallbackCode,
    qrCodeUrl,
    bankName: bankCode,
    accountNumber,
    accountName,
    transferContent: fallbackCode,
    amount: payload.amount,
  };
}

/**
 * Tra cứu trạng thái thanh toán theo paymentCode (Polling SePay Webhook trực tiếp trên Cloud DB)
 */

/**
 * Tạo yêu cầu thanh toán phụ thu (Surcharge) cho nhân viên
 */
export async function createSurchargePaymentApi(payload: {
  contractId?: string;
  reservationId?: string;
  unitCode?: string;
  amount: number;
  reason?: string;
}) {
  const bankCode = process.env.EXPO_PUBLIC_SEPAY_BANK_CODE || 'MBBank';
  const accountNumber = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NUMBER || '0838500046';
  const accountName = process.env.EXPO_PUBLIC_SEPAY_ACCOUNT_NAME || 'TRUONG DINH LONG';

  try {
    const res = await apiRequest<{
      payment: any;
      qr: {
        qrCodeUrl: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        transferContent: string;
      };
      paymentCode: string;
    }>('/payments/surcharge', {
      method: 'POST',
      body: JSON.stringify({
        contractId: payload.contractId,
        unitCode: payload.unitCode,
        amount: payload.amount,
        reason: payload.reason || `Phụ thu đơn #${payload.unitCode || 'UNIT'}`,
      }),
    });

    if (res?.paymentCode) {
      return res;
    }
  } catch (err: any) {
    console.warn('createSurchargePaymentApi fallback:', err?.message);
  }

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  const fallbackCode = `PAYSUR${timestampSuffix}${randomSuffix}`;
  const qrCodeUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${payload.amount}&addInfo=${encodeURIComponent(
    fallbackCode
  )}&accountName=${encodeURIComponent(accountName)}`;

  return {
    payment: {
      paymentCode: fallbackCode,
      amount: payload.amount,
      status: 'PENDING',
    },
    qr: {
      qrCodeUrl,
      bankCode,
      accountNumber,
      accountName,
      amount: payload.amount,
      transferContent: fallbackCode,
    },
    paymentCode: fallbackCode,
  };
}

export async function checkPaymentCodeStatusApi(
  paymentCode: string,
  expectedAmount?: number,
  sinceTimestamp?: number
) {
  const cleanCode = paymentCode.trim().toUpperCase();

  // 1. Kiểm tra trực tiếp qua API trạng thái công khai của backend
  try {
    const directRes = await apiRequest<any>(`/payments/code/${encodeURIComponent(cleanCode)}/status`);
    if (directRes && (directRes.isPaid || directRes.status === 'PAID')) {
      if (sinceTimestamp && directRes.paidAt) {
        const paidTime = new Date(directRes.paidAt).getTime();
        // Cho phép dung sai 5 giây độ lệch đồng hồ máy chủ
        if (paidTime < sinceTimestamp - 5000) {
          // Giao dịch thanh toán cũ từ phiên trước, không tính vào phiên này
          return {
            paymentCode: cleanCode,
            status: 'PENDING',
            isPaid: false,
            amount: expectedAmount || 0,
          };
        }
      }
      return {
        paymentCode: directRes.paymentCode || cleanCode,
        status: 'PAID',
        isPaid: true,
        amount: Number(directRes.amount || expectedAmount || 0),
        paidAt: directRes.paidAt || new Date().toISOString(),
      };
    }
  } catch {
    // Tiếp tục kiểm tra danh sách hệ thống nếu direct check gặp lỗi
  }

  const recentPayments = await fetchRecentSystemPaymentsApi(30);

  // 1. Khớp chính xác theo mã paymentCode đã tạo trên QR
  let matched = recentPayments.find(
    (p: any) =>
      String(p?.paymentCode || '').trim().toUpperCase() === cleanCode &&
      String(p?.status || '').toUpperCase() === 'PAID'
  );

  // Nếu có sinceTimestamp, loại trừ các giao dịch cũ đã thanh toán trước khi mở phiên QR
  if (matched && sinceTimestamp) {
    const paidTime = new Date(matched.paidAt || matched.updatedAt || matched.createdAt || 0).getTime();
    if (paidTime < sinceTimestamp - 5000) {
      matched = null;
    }
  }

  if (matched) {
    return {
      paymentCode: matched.paymentCode || cleanCode,
      status: 'PAID',
      isPaid: true,
      amount: Number(matched.amount || expectedAmount || 0),
      paidAt: matched.paidAt || matched.updatedAt || new Date().toISOString(),
    };
  }

  return {
    paymentCode: cleanCode,
    status: 'PENDING',
    isPaid: false,
    amount: expectedAmount || 0,
  };
}

/**
 * Tra cứu giao dịch phụ thu SePay mới nhất của một hợp đồng
 */
export async function checkContractSurchargeStatusApi(contractId: string) {
  const recentPayments = await fetchRecentSystemPaymentsApi(30);
  const matched = recentPayments.find(
    (p: any) =>
      String(p?.contractId || '') === String(contractId) &&
      String(p?.status || '').toUpperCase() === 'PAID'
  );
  if (!matched) return null;
  return {
    paymentCode: matched.paymentCode,
    status: matched.status,
    isPaid: true,
    amount: Number(matched.amount || 0),
    paidAt: matched.paidAt,
    createdAt: matched.createdAt,
  };
}

/**
 * Lấy danh mục các loại phụ thu do Facility Manager thiết lập
 */
export async function fetchFeeTypesApi() {
  return apiRequest<
    Array<{
      id: string;
      name: string;
      code: string;
      description?: string;
      defaultAmount: number;
      status: 'ACTIVE' | 'INACTIVE';
    }>
  >('/operations/fee-types');
}

/**
 * Dời lịch hẹn nhận kho (PATCH /reservations/:id) - Đồng bộ Web FE
 */
export async function rescheduleReservationApi(
  reservationId: string | number,
  newAppointmentDate: string,
  notes?: string,
) {
  const rawId =
    typeof reservationId === 'string' && reservationId.startsWith('RSV-')
      ? reservationId.replace('RSV-', '')
      : reservationId;

  return apiRequest<any>(`/reservations/${rawId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      appointmentDate: newAppointmentDate,
      notes: notes || undefined,
    }),
  });
}

/**
 * Báo vắng mặt / Hủy đơn và giải phóng ô kho (POST /reservations/:id/cancel)
 */
export async function cancelReservationApi(
  reservationId: string | number,
  reason: string,
) {
  const rawId =
    typeof reservationId === 'string' && reservationId.startsWith('RSV-')
      ? reservationId.replace('RSV-', '')
      : reservationId;

  return apiRequest<any>(`/reservations/${rawId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      reason: reason || 'Khách không đến quá thời hạn quy định',
    }),
  });
}
