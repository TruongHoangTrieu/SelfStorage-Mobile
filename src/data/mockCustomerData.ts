import { Facility, UnitType } from '../api';

export function formatSlotTime(isoString?: string): string {
  if (!isoString) return '09:00 SA';
  try {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const period = hours >= 12 ? 'CH' : 'SA';
    hours = hours % 12 || 12;
    return `${('0' + hours).slice(-2)}:${minutes} ${period}`;
  } catch {
    return '09:00 SA';
  }
}

// Hình ảnh kho thực tế chất lượng cao
export const DEFAULT_FACILITY_IMAGES = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1200&q=80',
];

export const DEFAULT_UNIT_IMAGES: Record<string, string> = {
  mini: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
  medium: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80',
  large: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80',
  climate: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=800&q=80',
};

export const getUnitImage = (name: string = '', index: number = 0) => {
  const lower = name.toLowerCase();
  if (lower.includes('mát') || lower.includes('climate') || lower.includes('nhiệt')) {
    return DEFAULT_UNIT_IMAGES.climate;
  }
  if (lower.includes('mini') || lower.includes('nhỏ') || lower.includes('2m') || lower.includes('4.9')) {
    return DEFAULT_UNIT_IMAGES.mini;
  }
  if (lower.includes('vừa') || lower.includes('medium') || lower.includes('5m') || lower.includes('9')) {
    return DEFAULT_UNIT_IMAGES.medium;
  }
  if (lower.includes('lớn') || lower.includes('large') || lower.includes('10m') || lower.includes('14.5') || lower.includes('kinh doanh')) {
    return DEFAULT_UNIT_IMAGES.large;
  }
  const keys = Object.values(DEFAULT_UNIT_IMAGES);
  return keys[index % keys.length];
};

export const FALLBACK_FACILITIES: Facility[] = [
  {
    id: 1,
    name: 'SelfStorage Thủ Đức (Trụ sở Võ Nguyên Giáp)',
    code: 'SS-TD',
    address: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
    status: 'ACTIVE',
    image: DEFAULT_FACILITY_IMAGES[1],
    rating: 4.9,
  },
  {
    id: 3,
    name: 'SelfStorage Quận 1 (Central Hub)',
    code: 'SS-Q1',
    address: '123 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP.HCM',
    status: 'ACTIVE',
    image: DEFAULT_FACILITY_IMAGES[0],
    rating: 4.9,
  },
];

export const FALLBACK_UNIT_TYPES: UnitType[] = [
  {
    id: 1,
    name: 'Kho Cá Nhân Mini (Box 4.9m²)',
    code: 'UT-MINI',
    size: 4.9,
    sizeUnit: 'm²',
    price: 890000,
    depositAmount: 890000,
    description: 'Chứa được 15-20 thùng carton, vali du lịch, tài liệu hoặc đồ đạc sinh viên.',
    status: 'ACTIVE',
    image: DEFAULT_UNIT_IMAGES.mini,
    dimensions: 'Dài 2.1m x Rộng 2.3m x Cao 2.8m',
    features: ['Khóa Smart Lock PIN cá nhân', 'Máy hút ẩm chống mốc', 'Phù hợp 20 thùng đồ'],
  },
  {
    id: 2,
    name: 'Kho Gia Đình Tiêu Chuẩn (Box 9.0m²)',
    code: 'UT-MED',
    size: 9.0,
    sizeUnit: 'm²',
    price: 1690000,
    depositAmount: 1690000,
    description: 'Lý tưởng dọn nhà, chứa trọn bộ bàn ghế, sofa, tủ lạnh, nệm và máy giặt.',
    status: 'ACTIVE',
    image: DEFAULT_UNIT_IMAGES.medium,
    dimensions: 'Dài 3.0m x Rộng 3.0m x Cao 2.8m',
    features: ['Đầy đủ nội thất căn hộ 1-2PN', 'Điều hòa không khí 24/7', 'Xe đẩy bốc xếp miễn phí'],
  },
  {
    id: 3,
    name: 'Kho Doanh Nghiệp & TMĐT (Box 14.5m²)',
    code: 'UT-LARGE',
    size: 14.5,
    sizeUnit: 'm²',
    price: 2890000,
    depositAmount: 2890000,
    description: 'Chứa hàng hóa xuất nhập khẩu, thiết bị văn phòng, pallet hàng kinh doanh.',
    status: 'ACTIVE',
    image: DEFAULT_UNIT_IMAGES.large,
    dimensions: 'Dài 3.6m x Rộng 4.0m x Cao 2.8m',
    features: ['Cửa cuốn rộng 2m bốc xếp nhanh', 'Xe tải vào tận sảnh tầng kho', 'Hỗ trợ xuất hóa đơn VAT'],
  },
];
