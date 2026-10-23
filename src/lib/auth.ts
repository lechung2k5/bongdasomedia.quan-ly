import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import prisma from './prisma';

export interface AuthUser {
  id: number;
  name: string;
  phone?: string | null;
  address_district?: string | null;
  role: 'ADMIN' | 'STAFF' | 'FREELANCER';
  skills?: string | null;
  avatar_url?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  operational_status: 'IDLE' | 'MOVING' | 'WORKING';
  current_lat?: number | null;
  current_lng?: number | null;
}

export const SESSION_COOKIE_NAME = 'bongdaso_session_token';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

/**
 * Trích xuất tên thiết bị thân thiện từ User-Agent
 */
export function parseDeviceName(userAgent: string | null): string {
  if (!userAgent) return 'Thiết bị không rõ';
  if (/iPhone/i.test(userAgent)) return 'Apple iPhone';
  if (/iPad/i.test(userAgent)) return 'Apple iPad';
  if (/Android/i.test(userAgent)) return 'Thiết bị Android';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Máy tính Mac';
  if (/Windows/i.test(userAgent)) return 'Máy tính Windows';
  return 'Trình duyệt Web';
}

/**
 * Tạo Session mới khi Đăng nhập:
 * - ADMIN: Cho phép đăng nhập trên nhiều thiết bị cùng lúc (không hủy session cũ).
 * - STAFF / FREELANCER: Chỉ cho phép 1 thiết bị tại một thời điểm (vô hiệu hóa toàn bộ session cũ).
 * - Thời hạn phiên: 7 ngày.
 */
export async function createSession(userId: number, req?: Request): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Nếu là Nhân viên / Freelancer: HỦY TOÀN BỘ CÁC SESSION CŨ ĐANG HOẠT ĐỘNG
  if (user.role !== 'ADMIN') {
    await prisma.session.updateMany({
      where: {
        user_id: user.id,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });
  }

  // Sinh Session Token ngẫu nhiên 64 ký tự an toàn
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  // Lấy User-Agent và IP
  let userAgent = 'Unknown Browser';
  let ipAddress = '127.0.0.1';

  if (req) {
    userAgent = req.headers.get('user-agent') || userAgent;
    ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || ipAddress;
  } else {
    try {
      const headerList = await headers();
      userAgent = headerList.get('user-agent') || userAgent;
      ipAddress = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip') || ipAddress;
    } catch {
      // Ignored if outside request context
    }
  }

  const deviceName = parseDeviceName(userAgent);

  // Lưu Session mới vào Database
  await prisma.session.create({
    data: {
      session_token: sessionToken,
      user_id: user.id,
      user_agent: userAgent,
      device_name: deviceName,
      ip_address: ipAddress,
      is_active: true,
      expires_at: expiresAt,
    },
  });

  // Gán Cookie httpOnly 7 ngày
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return sessionToken;
}

/**
 * Lấy thông tin User hiện tại từ Session Cookie.
 * - Kiểm tra session_token trong DB.
 * - Nếu không tồn tại, hoặc is_active === false (đã bị văng), hoặc hết hạn 7 ngày -> return null.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { session_token: token },
      include: { user: true },
    });

    if (!session) {
      // Token giả mạo hoặc đã bị xóa
      return null;
    }

    // Kiểm tra hết hạn 7 ngày
    if (new Date() > session.expires_at) {
      // Vô hiệu hóa
      await prisma.session.update({
        where: { id: session.id },
        data: { is_active: false },
      }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Kiểm tra xem session có bị thu hồi (văng ra) không
    if (!session.is_active) {
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      address_district: user.address_district,
      role: user.role,
      skills: user.skills,
      avatar_url: user.avatar_url,
      status: user.status,
      operational_status: user.operational_status,
      current_lat: user.current_lat,
      current_lng: user.current_lng,
    };
  } catch (error) {
    console.error('Error fetching current user from session:', error);
    return null;
  }
}

/**
 * Kiểm tra trạng thái Session hiện tại dành cho Client Polling/Heartbeat:
 * Trả về mã lỗi 'SESSION_REVOKED' nếu tài khoản nhân viên bị văng do đăng nhập trên thiết bị khác!
 */
export async function verifyCurrentSession(): Promise<{
  valid: boolean;
  code?: 'NO_SESSION' | 'SESSION_EXPIRED' | 'SESSION_REVOKED';
  user?: AuthUser;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return { valid: false, code: 'NO_SESSION' };
    }

    const session = await prisma.session.findUnique({
      where: { session_token: token },
      include: { user: true },
    });

    if (!session) {
      return { valid: false, code: 'NO_SESSION' };
    }

    if (new Date() > session.expires_at) {
      return { valid: false, code: 'SESSION_EXPIRED' };
    }

    if (!session.is_active) {
      // ĐẶC BIỆT: Session bị thu hồi vì nhân viên vừa đăng nhập trên máy khác!
      return { valid: false, code: 'SESSION_REVOKED' };
    }

    const user = session.user;
    return {
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        address_district: user.address_district,
        role: user.role,
        skills: user.skills,
        avatar_url: user.avatar_url,
        status: user.status,
        operational_status: user.operational_status,
        current_lat: user.current_lat,
        current_lng: user.current_lng,
      },
    };
  } catch {
    return { valid: false, code: 'NO_SESSION' };
  }
}

/**
 * Đăng xuất: Vô hiệu hóa session trong DB và xóa cookie
 */
export async function clearSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.updateMany({
        where: { session_token: token },
        data: { is_active: false },
      }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (e) {
    console.error('Error clearing session:', e);
  }
}

/**
 * Dành cho Dev / Switch User (tạo session nhanh cho user được chọn)
 */
export async function setSessionUserId(userId: number, req?: Request) {
  return await createSession(userId, req);
}
