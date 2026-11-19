import { CheckInAppointment } from '../types/handover';

export interface CheckInEligibilityResult {
  allowed: boolean;
  reason?: string;
  isTooEarly?: boolean;
  isLateWarning?: boolean;
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
 * Kiểm tra quy định nhận kho (đồng bộ Web FE):
 * - Cho nhận kho trước giờ hẹn tối đa 1 tiếng (60 phút).
 * - Trễ từ > 15 phút đến <= 24 giờ: Vẫn cho nhận kho (cảnh báo trễ hẹn, hỗ trợ dời lịch).
 * - Trễ quá 24 giờ (> 1440 phút): Khóa nhận kho, yêu cầu liên hệ khách dời lịch hoặc báo vắng giải phóng kho.
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
      reason: 'Đơn đặt chỗ đã quá hạn nhận kho (> 24 giờ)',
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

  // 2. Trễ quá 24 giờ (1440 phút) -> Khóa nhận kho, đồng bộ Web FE
  if (diffMinutes > 1440) {
    return {
      allowed: false,
      isTooLate: true,
      diffMinutes,
      reason: 'Đơn trễ quá 24 giờ (Quá hạn). Nút nhận kho đã bị khóa. Vui lòng liên hệ khách để dời lịch hẹn hoặc báo vắng giải phóng kho.',
    };
  }

  // 3. Quá giờ hẹn (> 15 phút) -> Khóa nhận kho, yêu cầu dời lịch hoặc báo vắng
  if (diffMinutes > 15) {
    return {
      allowed: false,
      isLateWarning: true,
      diffMinutes,
      reason: 'Đơn đã quá giờ hẹn nhận kho. Vui lòng bấm "Dời lịch" sang khung giờ mới hoặc "Báo vắng" để giải phóng kho.',
    };
  }

  // 4. Trong khung giờ hợp lệ
  return { allowed: true, diffMinutes };
}

