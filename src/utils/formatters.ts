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

export function formatVietnameseDate(isoDateString?: string): string {
  if (!isoDateString) return '';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoDateString;
  }
}
