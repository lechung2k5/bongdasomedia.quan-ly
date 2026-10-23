// Utility tính toán khoảng cách, ETA và cảnh báo nguy cơ đi muộn
// Quy định chuẩn BÓNG ĐÁ SỐ MEDIA: Nhân viên bắt buộc phải có mặt tại sân trước 30 phút trước giờ bóng lăn.

export interface EtaEvaluation {
  distanceKm: number;          // Khoảng cách ước tính đường bộ (km)
  travelMinutes: number;       // Thời gian di chuyển xe máy (phút)
  totalNeededMinutes: number;  // Thời gian di chuyển + 5 phút dự phòng (phút)
  deadlineTime: Date;          // Hạn chót có mặt: start_time - 30 phút
  estimatedArrivalTime: Date;  // Thời điểm dự kiến tới sân: Now + totalNeededMinutes
  marginMinutes: number;       // Số phút dôi dư (âm = trễ hạn 30p)
  lateMinutes: number;         // Số phút trễ so với hạn chót 30p (nếu > 0)
  riskLevel: 'SAFE_ARRIVED' | 'ON_TIME' | 'WARNING_RUSH' | 'CRITICAL_LATE';
  message: string;
}

/**
 * Tính khoảng cách đại vòng (Haversine) giữa 2 tọa độ (km)
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Đánh giá nguy cơ đi muộn của nhân viên đối với một ca làm việc
 * @param userLat Tọa độ vĩ độ của nhân viên
 * @param userLng Tọa độ kinh độ của nhân viên
 * @param venueLat Tọa độ vĩ độ của sân bóng
 * @param venueLng Tọa độ kinh độ của sân bóng
 * @param matchStartTime Thời gian bắt đầu trận đấu / giờ bóng lăn
 * @param hasArrived Đã check-in có mặt tại sân chưa
 */
export function evaluateStaffPunctuality(
  userLat: number | null | undefined,
  userLng: number | null | undefined,
  venueLat: number | null | undefined,
  venueLng: number | null | undefined,
  matchStartTime: string | Date,
  hasArrived: boolean = false
): EtaEvaluation | null {
  if (!matchStartTime) return null;

  const startTime = typeof matchStartTime === 'string' ? new Date(matchStartTime) : matchStartTime;
  if (isNaN(startTime.getTime())) return null;

  const now = new Date();

  // Hạn chót: 30 phút trước giờ bóng lăn
  const deadlineTime = new Date(startTime.getTime() - 30 * 60 * 1000);

  // Nếu đã tới sân hoặc không có tọa độ
  if (hasArrived) {
    return {
      distanceKm: 0,
      travelMinutes: 0,
      totalNeededMinutes: 0,
      deadlineTime,
      estimatedArrivalTime: now,
      marginMinutes: Math.round((deadlineTime.getTime() - now.getTime()) / 60000),
      lateMinutes: 0,
      riskLevel: 'SAFE_ARRIVED',
      message: '✓ Đã có mặt an toàn tại sân',
    };
  }

  // Tọa độ mặc định trung tâm TP.HCM nếu chưa cập nhật
  const uLat = userLat ?? 10.78;
  const uLng = userLng ?? 106.65;
  const vLat = venueLat ?? 10.75;
  const vLng = venueLng ?? 106.60;

  // Tính khoảng cách đường chim bay
  const crowDistance = calculateHaversineDistance(uLat, uLng, vLat, vLng);

  // Khoảng cách thực tế đường bộ nội thành TP.HCM (hệ số vòng vèo ~1.35)
  const distanceKm = Math.round(crowDistance * 1.35 * 10) / 10;

  // Nếu khoảng cách rất gần (< 0.25 km = 250m) coi như đã đến nơi
  if (crowDistance < 0.25) {
    return {
      distanceKm,
      travelMinutes: 0,
      totalNeededMinutes: 0,
      deadlineTime,
      estimatedArrivalTime: now,
      marginMinutes: Math.round((deadlineTime.getTime() - now.getTime()) / 60000),
      lateMinutes: 0,
      riskLevel: 'SAFE_ARRIVED',
      message: '✓ Đang ở rất gần sân (< 250m)',
    };
  }

  // Vận tốc xe máy trung bình nội thành TP.HCM: 25 km/h
  const travelMinutes = Math.max(5, Math.ceil((distanceKm / 25) * 60));
  // 5 phút dự phòng tìm lối vào sân, gửi xe và dắt xe
  const totalNeededMinutes = travelMinutes + 5;

  // Thời điểm dự kiến tới nơi
  const estimatedArrivalTime = new Date(now.getTime() + totalNeededMinutes * 60 * 1000);

  // Chênh lệch phút so với hạn chót
  const marginMinutes = Math.round((deadlineTime.getTime() - estimatedArrivalTime.getTime()) / 60000);
  const lateMinutes = marginMinutes < 0 ? Math.abs(marginMinutes) : 0;

  let riskLevel: EtaEvaluation['riskLevel'] = 'ON_TIME';
  let message = '';

  if (marginMinutes < 0) {
    riskLevel = 'CRITICAL_LATE';
    message = `🚨 NGUY CƠ ĐI MUỘN! Dự kiến tới lúc ${estimatedArrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, trễ ${lateMinutes} phút so với hạn 30p trước giờ bóng lăn!`;
  } else if (marginMinutes <= 15) {
    riskLevel = 'WARNING_RUSH';
    message = `⚠️ CẦN XUẤT PHÁT NGAY! Chỉ còn ${marginMinutes} phút dôi dư trước hạn chót có mặt (${deadlineTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).`;
  } else {
    riskLevel = 'ON_TIME';
    message = `✓ Đang đúng tiến độ (còn ${marginMinutes} phút dôi dư).`;
  }

  return {
    distanceKm,
    travelMinutes,
    totalNeededMinutes,
    deadlineTime,
    estimatedArrivalTime,
    marginMinutes,
    lateMinutes,
    riskLevel,
    message,
  };
}
