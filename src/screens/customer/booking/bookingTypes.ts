import { Facility, UnitType, Reservation } from "../../../api";
import { CustomerTabType } from "../../../components/customer/CustomerBottomNavBar";

// ─── Stitch & Tailwind Design System Color Palette ─────────────────────────
export const T = {
  bg: "#f7f9fd",
  onSurface: "#131b2e",
  onSurfaceVariant: "#434655",
  primary: "#1d4ed8",
  primaryContainer: "#131b2e",
  inverseSurface: "#283044",
  onPrimary: "#ffffff",
  secondary: "#1d4ed8",
  secondaryBrand: "#2563eb",
  secondaryContainer: "#2563eb",
  secondaryFixed: "#dbe1ff",
  onSecondaryFixed: "#00174b",
  surfaceLowest: "#ffffff",
  surfaceLow: "#f2f3ff",
  surfaceContainerLow: "#f2f3ff",
  surfaceContainer: "#eaedff",
  surfaceContainerHigh: "#dae2fd",
  outline: "#737686",
  outlineVariant: "#c3c6d7",
  green: "#22c55e",
  amber: "#f59e0b",
  blue: "#1d4ed8",
};

export interface Props {
  facilities: Facility[];
  unitTypes: UnitType[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onReservationCreated: (reservation: Reservation) => void;
  onViewMyReservations: () => void;
  onNavigateTab?: (tab: CustomerTabType) => void;
  activeBottomTab?: CustomerTabType;
  onOpenLogin?: (reason?: string) => void;
  onLogout?: () => void;
  currentUser?: any;
  initialSelectedUnit?: any;
  onClearInitialSelectedUnit?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifCount?: number;
  onOpenAiAssistant?: (prompt?: string) => void;
}

export interface StorageDisplayItem {
  id: string;
  facilityId: number | string;
  unitTypeId: number | string;
  facilityName: string;
  locationText: string;
  title: string;
  unitCode: string;
  floorText: string;
  image: string;
  blueprintImage: string;
  badgeStatus: string;
  badgeDiscount?: string;
  floorArea: string;
  volume: string;
  dimensions: string;
  capacity: string;
  features: string[];
  originalPrice?: number;
  monthlyBasePrice: number;
  depositAmount: number;
  category: "personal" | "family" | "business";
  amenities: string[];
}

export const FACILITY_PHOTOS = [
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565118531796-763e5082d113?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1549194388-f61be84a6e9e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
];

// Tọa độ GPS chuẩn các khu vực kho tại TP. Hồ Chí Minh
export const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "TP. Thủ Đức": { lat: 10.8031, lng: 106.7456 },
  "Quận 1": { lat: 10.7915, lng: 106.6912 },
  "Quận 7": { lat: 10.7328, lng: 106.7321 },
  "Q. Bình Thạnh": { lat: 10.8021, lng: 106.7118 },
  "Quận 6": { lat: 10.7482, lng: 106.6352 },
  "Quận 9": { lat: 10.8428, lng: 106.7954 },
};

// Công thức Haversine đo khoảng cách hình cầu chuẩn xác (đơn vị: km)
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function extractDistrict(address: string, name: string = ""): string {
  const text = `${name} ${address}`.toLowerCase();
  if (
    text.includes("thủ đức") ||
    text.includes("thu duc") ||
    text.includes("an phú") ||
    text.includes("võ nguyên giáp") ||
    text.includes("vo nguyen giap") ||
    text.includes("thảo điền") ||
    text.includes("thao dien")
  )
    return "TP. Thủ Đức";
  if (
    text.includes("quận 1") ||
    text.includes("q. 1") ||
    text.includes("q1") ||
    text.includes("bến nghé") ||
    text.includes("nguyễn huệ")
  )
    return "Quận 1";
  if (
    text.includes("quận 7") ||
    text.includes("q. 7") ||
    text.includes("q7") ||
    text.includes("trần trọng cung") ||
    text.includes("tân phú") ||
    text.includes("nam long")
  )
    return "Quận 7";
  if (
    text.includes("bình thạnh") ||
    text.includes("binh thanh") ||
    text.includes("landmark")
  )
    return "Q. Bình Thạnh";
  if (
    text.includes("quận 6") ||
    text.includes("q. 6") ||
    text.includes("q6") ||
    text.includes("centre mall")
  )
    return "Quận 6";
  if (text.includes("quận 9") || text.includes("q. 9") || text.includes("q9"))
    return "Quận 9";
  return "Khu Vực Khác";
}

export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

