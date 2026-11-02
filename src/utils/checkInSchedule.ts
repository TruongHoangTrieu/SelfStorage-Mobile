import { CheckInAppointment } from '../types/handover';

export interface CheckInEligibilityResult {
  allowed: boolean;
  reason?: string;
  isTooEarly?: boolean;
  isTooLate?: boolean;
  diffMinutes?: number;
}

/**
 * Phân giải thời gian cuộc hẹn nhận kho chính xác
 */
export function parseAppointmentDateTime(app: CheckInAppointment | any): Date | null {
  if (!app) return null;

  // 1. Thử ISO string từ Backend
  const rawIso =
    app.appointmentDateRaw ||
    app.appointmentDate ||
    app.rawCheckIn?.appointmentDateRaw ||
    app.rawCheckIn?.appointmentDate;
  if (rawIso) {
    const d = new Date(rawIso);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Phân giải từ startDate và slotTime
  const dateStr = app.startDate || app.rawCheckIn?.startDate;
  const timeStr = app.slotTime || app.rawCheckIn?.slotTime;
  if (!dateStr) return null;

  let day = 0,
    month = 0,
    year = 0;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map((p: string) => parseInt(p, 10));
    if (parts.length === 3) {
      day = parts[0];
      month = parts[1] - 1;
      year = parts[2];
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map((p: string) => parseInt(p, 10));
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
      } else {
        day = parts[0];
        month = parts[1] - 1;
        year = parts[2];
      }
    }
  }

  if (year === 0 || day === 0) return null;

  let hour = 9,
    minute = 0;
  if (timeStr) {
    const upper = timeStr.toUpperCase();
    const isPM =
      upper.includes('PM') ||
      upper.includes('CH') ||
      upper.includes('CHIỀU') ||
      upper.includes('TỐI');
    const isAM = upper.includes('AM') || upper.includes('SA') || upper.includes('SÁNG');
    const m = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      hour = parseInt(m[1], 10);
      minute = parseInt(m[2], 10);
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
    }
  }

  const d = new Date(year, month, day, hour, minute, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Kiểm tra quy định nhận kho trên Mobile:
 * - Cho nhận kho trước giờ hẹn tối đa 1 tiếng (60 phút).
 * - Cho nhận kho trễ nhất 3 tiếng (180 phút).
 * - Trước hoặc sau khung giờ đó: Nút nhận kho bị xám và không nhận được.
 */
export function checkCheckInEligibility(app?: CheckInAppointment | any): CheckInEligibilityResult {
  if (!app) return { allowed: false, reason: 'Không có dữ liệu cuộc hẹn' };

  if (app.status === 'completed') {
    return { allowed: false, reason: 'Đơn đã hoàn tất thủ tục bàn giao' };
  }
  if (app.status === 'cancelled') {
    return { allowed: false, reason: 'Đơn đặt chỗ đã bị hủy' };
  }
  if (app.status === 'expired') {
    return {
      allowed: false,
      isTooLate: true,
      reason: 'Đơn đặt chỗ đã quá hạn nhận kho (> 3 tiếng)',
    };
  }

  // Đang trong tiến trình bàn giao (in_progress) thì cho phép tiếp tục
  if (app.status === 'in_progress') {
    return { allowed: true };
  }

  const apptDate = parseAppointmentDateTime(app);
  if (!apptDate) {
    return { allowed: true };
  }

  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - apptDate.getTime()) / (60 * 1000));

  // 1. Trước giờ hẹn hơn 1 tiếng (60 phút) -> Nút xám, chưa được nhận
  if (diffMinutes < -60) {
    const minsLeft = Math.abs(diffMinutes) - 60;
    let hint = `${minsLeft} phút nữa`;
    if (minsLeft >= 60) {
      const h = Math.floor(minsLeft / 60);
      const m = minsLeft % 60;
      hint = m > 0 ? `${h} tiếng ${m} phút nữa` : `${h} tiếng nữa`;
    }
    return {
      allowed: false,
      isTooEarly: true,
      diffMinutes,
      reason: `Chưa tới khung giờ nhận kho. Thủ tục nhận kho chỉ mở trước giờ hẹn tối đa 1 tiếng (còn ${hint}).`,
    };
  }

  // 2. Trễ quá 3 tiếng (180 phút) -> Nút xám, không được nhận
  if (diffMinutes > 180) {
    return {
      allowed: false,
      isTooLate: true,
      diffMinutes,
      reason: 'Đã quá hạn nhận kho (quá 3 tiếng so với lịch hẹn). Vui lòng liên hệ Quản lý để phê duyệt mở lại.',
    };
  }

  // 3. Trong khung giờ hợp lệ: Từ trước 1 tiếng đến trễ tối đa 3 tiếng
  return { allowed: true, diffMinutes };
}

