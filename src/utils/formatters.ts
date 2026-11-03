export function formatVND(amount: number | string): string {
  if (typeof amount === 'string') {
    const digits = amount.replace(/[^\d]/g, '');
    const num = parseInt(digits, 10);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function parseVND(val?: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const digitsOnly = val.toString().replace(/[^\d]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

export function formatVietnameseDate(isoDateString?: string | Date): string {
  if (!isoDateString) return '';
  try {
    if (typeof isoDateString === 'string') {
      const trimmed = isoDateString.trim();
      // Nếu là chuỗi ISO ngày (YYYY-MM-DD...)
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        // Nếu là ngày thuần hoặc có mốc cuối ngày (23:59:59... từ endDate hợp đồng),
        // lấy trực tiếp ngày tháng năm gốc để tránh việc múi giờ UTC+7 đẩy sang rạng sáng ngày tiếp theo
        if (!trimmed.includes('T') || trimmed.includes('T23:59:59') || trimmed.includes('23:59:59')) {
          const parts = trimmed.slice(0, 10).split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
    }
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return String(isoDateString);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(isoDateString);
  }
}
