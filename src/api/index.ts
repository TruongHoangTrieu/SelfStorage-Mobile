/**
 * API Client config for Mobile App
 */
export const API_BASE_URL = 'https://selfstorage-be-1.onrender.com/api';

export interface Facility {
  id: string;
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
  id: string;
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

export interface AvailabilityResult {
  available: boolean;
  availableUnitsCount: number;
  unitType: UnitType;
  estimatedPrice: {
    monthlyRent: number;
    deposit: number;
    totalInitialPayment: number;
    rentalPeriod: number;
    rentalPeriodUnit: string;
  };
}

export interface Reservation {
  id: string;
  facilityId: string;
  unitTypeId: string;
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
}
