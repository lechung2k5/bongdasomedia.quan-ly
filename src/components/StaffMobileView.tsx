'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Package,
  Navigation,
  User as UserIcon,
  CheckCircle,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Play,
  Square,
  Sparkles,
  Phone,
  RefreshCw,
  Layers,
  ChevronRight,
  Truck,
  Camera,
  CheckSquare,
  Battery,
  BatteryCharging,
  Upload,
  CheckCircle2,
  FileText,
  X,
  Image as ImageIcon,
  Users,
  LogOut,
  Edit3,
  Lock,
  Key,
  Power,
  AlertTriangle,
} from 'lucide-react';
import LiveMap from './LiveMap';
import { getDutyLabel, getUserRoleBadge } from './AdminView';
import { compressImage } from '@/lib/imageCompression';
import { handleAvatarError, resolveAvatarUrl, resolveMediaUrl, handleMediaError } from '@/lib/avatarHelper';
import UserProfileModal from './UserProfileModal';
import { evaluateStaffPunctuality, EtaEvaluation } from '@/lib/etaCalculator';
import { useRealtimeSync, notifyLocalTabs } from '@/lib/useRealtimeSync';

interface StaffMobileViewProps {
  currentUser: any;
  onRefreshUser?: () => void;
  onLogout?: () => void;
}

export default function StaffMobileView({ currentUser, onRefreshUser, onLogout }: StaffMobileViewProps) {
  // 1. Ưu tiên tab Lịch của tôi lên đầu theo yêu cầu
  const [activeTab, setActiveTab] = useState<'schedule' | 'gear' | 'tracking' | 'profile'>('schedule');
  const [myJobsData, setMyJobsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // S3 Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security'>('profile');

  // Modal: Chụp ảnh lấy đồ lên xe (Check-in kho)
  const [checkOutModalAlloc, setCheckOutModalAlloc] = useState<any | null>(null);
  const [checkOutPhotoFile, setCheckOutPhotoFile] = useState<File | null>(null);
  const [checkOutPhotoPreview, setCheckOutPhotoPreview] = useState<string | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState<string>('');
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);

  // Modal: Trả đồ về văn phòng / kho (Check-out đồ & Kiểm kê)
  const [checkInModalAlloc, setCheckInModalAlloc] = useState<any | null>(null);
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null);
  const [checkInPhotoPreview, setCheckInPhotoPreview] = useState<string | null>(null);
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [checkedEquipments, setCheckedEquipments] = useState<{ [id: number]: boolean }>({});
  const [returnLocationType, setReturnLocationType] = useState<'WAREHOUSE' | 'STADIUM' | 'KEEP' | 'OTHER'>('WAREHOUSE');
  const [returnLocationCustom, setReturnLocationCustom] = useState<string>('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Modal: Check-in lấy đồ theo Job (Chụp 1 ảnh tổng thể tất cả đồ trên xe)
  const [batchCheckInModalJob, setBatchCheckInModalJob] = useState<{ job: any; assignments: any[] } | null>(null);
  const [batchPhotoFile, setBatchPhotoFile] = useState<File | null>(null);
  const [batchPhotoPreview, setBatchPhotoPreview] = useState<string | null>(null);
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [isSubmittingBatchCheckIn, setIsSubmittingBatchCheckIn] = useState(false);

  // Lightbox Preview Photo Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Bật/Tắt ứng dụng & chia sẻ vị trí GPS
  const [isAppActive, setIsAppActive] = useState<boolean>(currentUser?.is_app_active !== false);
  const [isTogglingApp, setIsTogglingApp] = useState(false);
  const [showFinishedShiftModal, setShowFinishedShiftModal] = useState(false);

  // Đồng bộ trạng thái app khi currentUser thay đổi
  useEffect(() => {
    if (currentUser && currentUser.is_app_active !== undefined) {
      setIsAppActive(currentUser.is_app_active !== false);
    }
  }, [currentUser?.is_app_active]);

  // GPS Tracking State (Tối ưu tiết kiệm pin & độ chính xác cao)
  const [isTrackingActive, setIsTrackingActive] = useState(currentUser?.operational_status === 'MOVING');
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number }>({
    lat: currentUser?.current_lat || 10.7700,
    lng: currentUser?.current_lng || 106.6300,
  });
  const [gpsSimulationActive, setGpsSimulationActive] = useState(false);
  const [lastGpsSyncTime, setLastGpsSyncTime] = useState<string | null>(null);

  // Mới: Kiểm tra môi trường & quyền GPS
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isNonHttps, setIsNonHttps] = useState(false);
  const [gpsPermissionState, setGpsPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [gpsErrorText, setGpsErrorText] = useState<string | null>(null);
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsDiagnosticInfo, setGpsDiagnosticInfo] = useState<{
    code?: number;
    message?: string;
    protocol?: string;
    host?: string;
    isHttps?: boolean;
    isInApp?: boolean;
  } | null>(null);
  const [showGpsDiagnosticsModal, setShowGpsDiagnosticsModal] = useState(false);
  const lastGpsPushTimeRef = useRef<number>(0);

  // Payout action loading
  const [payoutLoadingId, setPayoutLoadingId] = useState<number | string | null>(null);

  // Phát hiện môi trường HTTP không bảo mật hoặc In-App browser (Zalo/Messenger)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Kiểm tra HTTPS (Bắt buộc cho Geolocation trên Mobile Browser)
      if (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setIsNonHttps(true);
      }

      // 2. Kiểm tra In-App Browser (Zalo, Messenger, Facebook, TikTok...)
      const ua = navigator.userAgent || '';
      if (/FBAN|FBAV|Instagram|Line|Zalo|TikTok|MicroMessenger/i.test(ua)) {
        setIsInAppBrowser(true);
      }

      // 3. Theo dõi trạng thái quyền Geolocation qua Permissions API (nếu browser hỗ trợ)
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((perm) => {
            setGpsPermissionState(perm.state as any);
            perm.onchange = () => {
              setGpsPermissionState(perm.state as any);
            };
          })
          .catch(() => {});
      }
    }
  }, []);

  // Hàm chuyển đổi trạng thái Bật / Tắt App
  const handleToggleAppActive = async (targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !isAppActive;
    setIsTogglingApp(true);
    try {
      const res = await fetch('/api/users/app-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          is_app_active: nextState,
        }),
      });

      if (res.ok) {
        setIsAppActive(nextState);
        setStatusMessage(
          nextState
            ? '🟢 Đã BẬT ứng dụng! GPS đang được chia sẻ với quản lý điều phối.'
            : '⚪ Đã TẮT ứng dụng! Đã dừng chia sẻ vị trí để bạn nghỉ ngơi.'
        );
        if (!nextState) {
          setGpsSimulationActive(false);
        } else {
          // Khi bật app, chủ động xin quyền vị trí ngay
          requestLocationPermissionAndPush(true);
        }
        if (onRefreshUser) onRefreshUser();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (e) {
      console.error(e);
      alert('Không thể kết nối máy chủ');
    } finally {
      setIsTogglingApp(false);
    }
  };

  // Tải dữ liệu ca làm, đồ cần mang, đồng nghiệp và thống kê thù lao
  const fetchMyData = async () => {
    try {
      const res = await fetch(`/api/staff/my-jobs?userId=${currentUser?.id}`);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        setMyJobsData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE + BroadcastChannel + Tab visibility)
  useRealtimeSync(fetchMyData);

  useEffect(() => {
    fetchMyData();
  }, [currentUser?.id]);

  // Cập nhật vị trí GPS lên Server (CHỈ GỬI KHI ỨNG DỤNG ĐANG BẬT)
  const pushLocationUpdate = async (
    lat: number,
    lng: number,
    operational_status?: string,
    force = false
  ) => {
    if (!isAppActive) {
      console.log('App is inactive, skipping GPS push to server.');
      return;
    }

    const now = Date.now();
    // Throttle tối thiểu 6 giây giữa 2 lần POST lên server (tránh spam network khi xe chạy)
    if (!force && now - lastGpsPushTimeRef.current < 6000) {
      setCurrentCoord({ lat, lng });
      return;
    }
    lastGpsPushTimeRef.current = now;

    try {
      const res = await fetch('/api/users/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          lat,
          lng,
          operational_status,
        }),
      });
      const data = await res.json();
      if (data.app_disabled) {
        setIsAppActive(false);
        return;
      }
      setCurrentCoord({ lat, lng });
      setLastGpsSyncTime(new Date().toLocaleTimeString('vi-VN'));
      if (onRefreshUser) onRefreshUser();
    } catch (e) {
      console.error('Failed to push location:', e);
    }
  };

  // Hàm chủ động yêu cầu quyền truy cập GPS từ trình duyệt (Có tự động fallback Wifi/Cell nếu GPS vệ tinh timeout khi ở trong nhà)
  const requestLocationPermissionAndPush = (force = false, targetStatus?: string) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      const msg = 'Trình duyệt của bạn không hỗ trợ định vị GPS.';
      setGpsErrorText(msg);
      if (force) setStatusMessage(`❌ ${msg}`);
      return;
    }

    setIsRequestingGps(true);
    setGpsErrorText(null);

    const onGpsSuccess = (pos: GeolocationPosition) => {
      setIsRequestingGps(false);
      setGpsPermissionState('granted');
      setGpsErrorText(null);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentCoord({ lat, lng });
      pushLocationUpdate(lat, lng, targetStatus || currentUser?.operational_status, true);
      if (force) {
        setStatusMessage('✓ Đã đồng bộ tọa độ GPS mới nhất thành công!');
      }
    };

    const onGpsError = (err: GeolocationPositionError) => {
      setIsRequestingGps(false);
      console.warn('Geolocation error:', err);

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isInApp = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|Line|Zalo|TikTok|MicroMessenger/i.test(navigator.userAgent || '');

      setGpsDiagnosticInfo({
        code: err.code,
        message: err.message,
        protocol: typeof window !== 'undefined' ? window.location.protocol : '',
        host: typeof window !== 'undefined' ? window.location.host : '',
        isHttps: isHttps || isLocalhost,
        isInApp,
      });

      let errDesc = '';
      if (err.code === 1) { // PERMISSION_DENIED
        setGpsPermissionState('denied');
        if (!isHttps && !isLocalhost) {
          errDesc = 'Trình duyệt chặn GPS do web đang chạy qua HTTP. Cần cài đặt HTTPS cho domain.';
        } else if (isInApp) {
          errDesc = 'Trình duyệt Zalo/Messenger chặn quyền GPS. Vui lòng mở bằng Safari/Chrome.';
        } else {
          errDesc = 'Quyền vị trí bị chặn. Vui lòng bật lại trong Cài đặt Safari/Chrome trên điện thoại.';
        }
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        errDesc = 'Không có tín hiệu vị trí. Hãy bật GPS (Vị trí) trong cài đặt điện thoại.';
      } else if (err.code === 3) { // TIMEOUT
        errDesc = 'Hết thời gian chờ GPS (do đang ở trong nhà hoặc sóng yếu). Vui lòng thử lại.';
      } else {
        errDesc = err.message || 'Không thể lấy tọa độ từ trình duyệt';
      }

      setGpsErrorText(errDesc);
      if (force) {
        setStatusMessage(`❌ ${errDesc}`);
        setShowGpsDiagnosticsModal(true);
      }
    };

    // Bước 1: Gọi với enableHighAccuracy: false, timeout 25s để điện thoại lập tức hiện popup xin quyền và lấy toạ độ nhanh
    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      (err) => {
        // Bước 2: Nếu lỗi do Timeout (code 3) hoặc Không có tín hiệu (code 2), thử lại với maximumAge 5 phút
        if (err.code === 2 || err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            onGpsSuccess,
            onGpsError,
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
          );
        } else {
          onGpsError(err);
        }
      },
      { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
    );
  };

  // CHỦ ĐỘNG XIN QUYỀN VỊ TRÍ NGAY KHI VÀO ỨNG DỤNG (Nếu app đang bật)
  useEffect(() => {
    if (!isAppActive) return;
    // Gọi ngay getCurrentPosition để trình duyệt bật prompt hỏi quyền lúc người dùng vừa vào trang
    requestLocationPermissionAndPush(false);
  }, [isAppActive]);

  // THEO DÕI VỊ TRÍ LIÊN TỤC KHI ĐANG DI CHUYỂN (MOVING)
  // Sử dụng watchPosition + Screen Wake Lock để giữ GPS active trên đường
  useEffect(() => {
    if (!isAppActive || currentUser?.operational_status !== 'MOVING' || gpsSimulationActive) return;

    let watchId: number | null = null;
    let wakeLockSentinel: any = null;

    // Giữ màn hình sáng nếu trình duyệt hỗ trợ (tránh iOS/Android đóng băng JavaScript khi xe chạy)
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch((e: any) => console.log('Wake Lock notice:', e));
    }

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      // 1. Lấy vị trí ngay lập tức lúc bắt đầu di chuyển
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pushLocationUpdate(pos.coords.latitude, pos.coords.longitude, 'MOVING', true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );

      // 2. Lắng nghe thay đổi tọa độ liên tục theo thời gian thực (watchPosition)
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          pushLocationUpdate(pos.coords.latitude, pos.coords.longitude, 'MOVING');
        },
        (err) => console.warn('watchPosition warning:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 8000 }
      );
    }

    // 3. Dự phòng 1 interval mỗi 20 giây đề phòng thiết bị dừng tại chỗ đèn đỏ
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            pushLocationUpdate(pos.coords.latitude, pos.coords.longitude, 'MOVING');
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
      }
    }, 20000);

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(interval);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isAppActive, currentUser?.operational_status, gpsSimulationActive]);

  // Thay đổi trạng thái tác nghiệp nhanh (IDLE / MOVING / WORKING)
  const handleSetOperationalStatus = async (status: 'IDLE' | 'MOVING' | 'WORKING') => {
    try {
      if (status === 'MOVING' && !isAppActive) {
        setIsAppActive(true);
      }

      if (status === 'MOVING' && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            pushLocationUpdate(pos.coords.latitude, pos.coords.longitude, status, true);
          },
          () => {
            pushLocationUpdate(currentCoord.lat, currentCoord.lng, status, true);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        await pushLocationUpdate(currentCoord.lat, currentCoord.lng, status, true);
      }

      if (status === 'MOVING') {
        setStatusMessage('🛵 Đã bật trạng thái: ĐANG DI CHUYỂN! Tọa độ GPS đang được gửi liên tục tới quản lý.');
      } else if (status === 'IDLE') {
        setStatusMessage('⚪ Đã chuyển trạng thái: SẴN SÀNG / NGHỈ NGƠI.');
      } else {
        setStatusMessage('📍 Đã chuyển trạng thái: ĐANG TÁC NGHIỆP TẠI SÂN.');
      }

      fetchMyData();
      notifyLocalTabs();
      if (onRefreshUser) onRefreshUser();
    } catch (e) {
      console.error('Error changing operational status:', e);
    }
  };

  // Handle Manual GPS Refresh (Tiết kiệm pin)
  const handleManualGpsRefresh = () => {
    if (!isAppActive) {
      alert('Ứng dụng hiện đang TẮT. Vui lòng bấm BẬT APP để chia sẻ tọa độ GPS với quản lý.');
      return;
    }
    requestLocationPermissionAndPush(true, currentUser?.operational_status);
  };

  // Handle Staff Avatar Upload directly to AWS S3
  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, 600, 600, 0.7);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('targetType', 'user');
      formData.append('targetId', currentUser?.id?.toString());

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStatusMessage('✓ Cập nhật ảnh đại diện thành công!');
        if (onRefreshUser) onRefreshUser();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi tải ảnh đại diện');
      }
    } catch (e) {
      console.error(e);
      alert('Không thể kết nối máy chủ để tải ảnh');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 1. CHECK-IN LẤY ĐỒ TẠI KHO: Nén ảnh client-side, upload AWS S3, lưu ghi chú
  const handleConfirmCheckOutWithPhoto = async () => {
    if (!checkOutModalAlloc) return;
    setIsSubmittingCheckOut(true);

    try {
      let uploadedPhotoUrl: string | null = null;

      if (checkOutPhotoFile) {
        // Nén ảnh client-side xuống 1280px, quality 0.65 -> chỉ còn 100-200KB
        const compressed = await compressImage(checkOutPhotoFile, 1280, 1280, 0.65);
        const formData = new FormData();
        formData.append('file', compressed);

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedPhotoUrl = upData.url;
        } else {
          alert('Lỗi khi tải ảnh đồ lên máy chủ');
          setIsSubmittingCheckOut(false);
          return;
        }
      }

      const res = await fetch(`/api/allocations/${checkOutModalAlloc.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: uploadedPhotoUrl,
          notes: checkOutNotes || checkOutModalAlloc.handover_notes,
        }),
      });

      if (res.ok) {
        setStatusMessage('✓ Đã lấy đồ lên xe thành công! Bắt đầu di chuyển đến sân.');
        setCheckOutModalAlloc(null);
        setCheckOutPhotoFile(null);
        setCheckOutPhotoPreview(null);
        setCheckOutNotes('');
        fetchMyData();
        notifyLocalTabs();
        if (onRefreshUser) onRefreshUser();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xác nhận lấy đồ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  // 1b. CHECK-IN TOÀN BỘ ĐỒ THEO JOB (CHỤP 1 ẢNH TỔNG THỂ)
  const handleBatchCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCheckInModalJob) return;
    if (!batchPhotoFile && !batchPhotoPreview) {
      alert('Vui lòng chụp 1 ảnh tổng thể đồ đã xếp lên xe/balo!');
      return;
    }

    try {
      setIsSubmittingBatchCheckIn(true);
      let s3PhotoUrl: string | null = null;

      if (batchPhotoFile) {
        // Nén ảnh client-side trước khi upload
        const compressedFile = await compressImage(batchPhotoFile, 1280, 1280, 0.65);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('targetType', 'batch-checkin');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          s3PhotoUrl = uploadData.url;
        } else {
          const err = await uploadRes.json();
          alert(err.error || 'Lỗi khi tải ảnh check-in lên máy chủ');
          setIsSubmittingBatchCheckIn(false);
          return;
        }
      }

      const res = await fetch('/api/allocations/batch-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: batchCheckInModalJob.assignments.map((a: any) => a.id),
          photo_url: s3PhotoUrl,
          notes: batchNotes,
        }),
      });

      if (res.ok) {
        setBatchCheckInModalJob(null);
        setBatchPhotoFile(null);
        setBatchPhotoPreview(null);
        setBatchNotes('');
        setStatusMessage('🛵 Đã check-in lấy đủ đồ lên xe! Trạng thái: Đang di chuyển');
        fetchMyData();
        notifyLocalTabs();
        if (onRefreshUser) onRefreshUser();
      } else {
        const err = await res.json();
        alert(err.error || 'Có lỗi xảy ra khi check-in thiết bị');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi khi thực hiện check-in');
    } finally {
      setIsSubmittingBatchCheckIn(false);
    }
  };

  // 2. CHECK-IN ĐÃ TỚI SÂN BÓNG
  const handleStadiumCheckIn = async (allocationId?: number) => {
    setActionLoading('stadium-checkin');
    try {
      if (allocationId) {
        await fetch(`/api/allocations/${allocationId}/stadium-checkin`, { method: 'POST' });
      }
      await pushLocationUpdate(currentCoord.lat, currentCoord.lng, 'WORKING');
      setStatusMessage('📍 Đã check-in có mặt tại sân bóng! Trạng thái: Đang tác nghiệp.');
      fetchMyData();
      notifyLocalTabs();
      if (onRefreshUser) onRefreshUser();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. KẾT THÚC CA LÀM VIỆC (CHECK-OUT TRẬN ĐẤU)
  const handleFinishMatch = async () => {
    setActionLoading('finish-match');
    try {
      const hasGearToReturn = transportAssignments.some(
        (a: any) => a.check_in_status === 'CONFIRMED' && a.check_out_status !== 'CONFIRMED'
      );
      const nextStatus = hasGearToReturn ? 'MOVING' : 'IDLE';
      await pushLocationUpdate(currentCoord.lat, currentCoord.lng, nextStatus);

      setStatusMessage(
        hasGearToReturn
          ? '✓ Trận đấu kết thúc! Vui lòng chở đồ về văn phòng và kiểm kê bàn giao.'
          : '✓ Ca làm việc kết thúc! Bạn đã hoàn thành nhiệm vụ.'
      );
      // Nếu không có đồ cần trả về, bật modal hỏi tắt app ngay
      if (!hasGearToReturn) {
        setShowFinishedShiftModal(true);
      }
      fetchMyData();
      notifyLocalTabs();
      if (onRefreshUser) onRefreshUser();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. CHECK-OUT ĐỒ (BÀN GIAO / TRẢ ĐỒ VỀ KHO HOẶC ĐỂ LẠI SÂN)
  const handleOpenCheckInModal = (alloc: any) => {
    setCheckInModalAlloc(alloc);
    // Khởi tạo checklist thiết bị
    const initialChecked: { [id: number]: boolean } = {};
    transportAssignments.forEach((a: any) => {
      initialChecked[a.equipment?.id || a.id] = true;
    });
    setCheckedEquipments(initialChecked);
    setCheckInNotes('');
    setCheckInPhotoFile(null);
    setCheckInPhotoPreview(null);
    setReturnLocationType('WAREHOUSE');
    setReturnLocationCustom('');
  };

  const handleConfirmCheckInWithPhoto = async () => {
    if (!checkInModalAlloc) return;

    // Lấy danh sách ID các thiết bị được chọn
    const selectedAssignmentIds = transportAssignments
      .filter((a: any) => checkedEquipments[a.equipment?.id || a.id] !== false)
      .map((a: any) => a.id);

    if (selectedAssignmentIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 thiết bị để bàn giao!');
      return;
    }

    setIsSubmittingCheckIn(true);

    try {
      let uploadedPhotoUrl: string | null = null;

      if (checkInPhotoFile) {
        // Nén ảnh client-side
        const compressed = await compressImage(checkInPhotoFile, 1280, 1280, 0.65);
        const formData = new FormData();
        formData.append('file', compressed);

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedPhotoUrl = upData.url;
        } else {
          alert('Lỗi khi tải ảnh kiểm kê lên máy chủ');
          setIsSubmittingCheckIn(false);
          return;
        }
      }

      // Xây dựng tên vị trí hiển thị
      let finalLocationName = 'Kho văn phòng';
      if (returnLocationType === 'STADIUM') {
        finalLocationName = checkInModalAlloc.job?.location?.name
          ? `Để lại tại sân: ${checkInModalAlloc.job.location.name}`
          : 'Để lại tại sân bóng';
      } else if (returnLocationType === 'KEEP') {
        finalLocationName = returnLocationCustom ? `Nhân viên giữ: ${returnLocationCustom}` : `Nhân viên giữ (${currentUser?.name || 'Nhân sự'})`;
      } else if (returnLocationType === 'OTHER') {
        finalLocationName = returnLocationCustom || 'Nơi khác';
      }

      const res = await fetch(`/api/allocations/${checkInModalAlloc.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: selectedAssignmentIds,
          photo_url: uploadedPhotoUrl,
          notes: checkInNotes,
          return_location_type: returnLocationType,
          return_location_name: finalLocationName,
        }),
      });

      if (res.ok) {
        setStatusMessage(`✓ Đã bàn giao đồ thành công! Vị trí: ${finalLocationName}`);
        setCheckInModalAlloc(null);
        setCheckInPhotoFile(null);
        setCheckInPhotoPreview(null);
        setCheckInNotes('');
        setReturnLocationCustom('');
        fetchMyData();
        notifyLocalTabs();
        if (onRefreshUser) onRefreshUser();
        // Bật Modal hỏi tắt app sau khi bàn giao đồ xong
        setShowFinishedShiftModal(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi bàn giao đồ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // 5. THỐNG KÊ LƯƠNG: TOGGLE ĐÃ NHẬN / CHƯA NHẬN TỪNG TRẬN
  const handleTogglePayout = async (jobStaffId: number, currentStatus: string) => {
    setPayoutLoadingId(jobStaffId);
    try {
      const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
      const res = await fetch('/api/staff/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobStaffId,
          payoutStatus: nextStatus,
        }),
      });

      if (res.ok) {
        fetchMyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật trạng thái lương');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPayoutLoadingId(null);
    }
  };

  // 6. THỐNG KÊ LƯƠNG: NHẬN TOÀN BỘ LƯƠNG CHƯA NHẬN (BULK PAID)
  const handleBulkPayout = async () => {
    if (!confirm('Bạn có muốn đánh dấu ĐÃ NHẬN TOÀN BỘ các khoản thù lao từ những trận đã hoàn thành?')) {
      return;
    }
    setPayoutLoadingId('bulk');
    try {
      const res = await fetch('/api/staff/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          markAllPaid: true,
        }),
      });

      if (res.ok) {
        setStatusMessage('✓ Đã cập nhật đã nhận toàn bộ lương thành công!');
        fetchMyData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật lương');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPayoutLoadingId(null);
    }
  };

  const activeJobStaff = myJobsData?.jobStaffs?.[0];
  const activeJob = activeJobStaff?.job;
  const transportAssignments = myJobsData?.transportAssignments || [];
  const colleagues = myJobsData?.colleagues || [];

  // Tìm người chở đồ của trận đấu hiện tại
  const gearCarrier = activeJob?.equipmentAssignments?.[0]?.transportByUser || null;
  const amICarryingGear = transportAssignments.length > 0;

  // Tự động tính toán nguy cơ đi muộn (quy định: phải tới trước 30 phút trước giờ bóng lăn)
  const punctualityEval = useMemo(() => {
    if (!activeJob || !activeJob.start_time) return null;
    const venueLat = activeJob.location?.latitude;
    const venueLng = activeJob.location?.longitude;
    if (!venueLat || !venueLng) return null;

    const hasStadiumCheckIn = transportAssignments.some(
      (a: any) => a.stadium_check_in_time !== null
    );
    const isWorking = currentUser?.operational_status === 'WORKING';
    return evaluateStaffPunctuality(
      currentCoord.lat,
      currentCoord.lng,
      venueLat,
      venueLng,
      activeJob.start_time,
      hasStadiumCheckIn || isWorking
    );
  }, [activeJob, currentCoord, transportAssignments, currentUser?.operational_status]);

  // GPS Simulation Loop
  useEffect(() => {
    if (!gpsSimulationActive) return;

    const targetLat = activeJob?.location?.latitude || 10.7650;
    const targetLng = activeJob?.location?.longitude || 106.5980;

    const interval = setInterval(() => {
      setCurrentCoord((prev) => {
        const deltaLat = (targetLat - prev.lat) * 0.15;
        const deltaLng = (targetLng - prev.lng) * 0.15;

        const nextLat = prev.lat + deltaLat;
        const nextLng = prev.lng + deltaLng;

        pushLocationUpdate(nextLat, nextLng, 'MOVING');
        return { lat: nextLat, lng: nextLng };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [gpsSimulationActive, activeJob]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 w-full select-none pb-28">
      {/* Mobile Top App Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500 bg-slate-100 shadow-xs shrink-0">
            <img
              src={resolveAvatarUrl(currentUser?.avatar_url)}
              alt={currentUser?.name}
              onError={handleAvatarError}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900">{currentUser?.name}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getUserRoleBadge(currentUser?.role).className}`}>
                {getUserRoleBadge(currentUser?.role).label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentUser?.operational_status === 'MOVING'
                    ? 'bg-amber-500 animate-ping'
                    : currentUser?.operational_status === 'WORKING'
                    ? 'bg-emerald-600'
                    : 'bg-slate-400'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-600">
                {currentUser?.operational_status === 'MOVING'
                  ? 'Đang di chuyển'
                  : currentUser?.operational_status === 'WORKING'
                  ? 'Đang tác nghiệp'
                  : 'Sẵn sàng / Rảnh'}
              </span>
              {currentUser?.address_district && (
                <span className="text-[10px] text-amber-700 font-bold">
                  • 📍 {currentUser.address_district}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <img
            src="/logo/logo_full.png"
            alt="Bóng Đá Số Media"
            className="h-7 w-auto object-contain opacity-90 hidden sm:block"
          />
          <button
            onClick={fetchMyData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner alert if any */}
      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 md:px-8 py-2 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="font-bold text-emerald-700 ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Content - Full width on phone, max-w-4xl responsive on tablet/desktop */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4">
        {/* ================= 0. THANH BẬT / TẮT APP & CHIA SẺ GPS ================= */}
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            isAppActive
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-white shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isAppActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'
              }`}
            />
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>{isAppActive ? '🟢 ỨNG DỤNG ĐANG BẬT' : '⚪ ỨNG DỤNG ĐÃ TẮT'}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isAppActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isAppActive ? 'LIVE GPS' : 'NGOẠI TUYẾN'}
                </span>
              </div>
              <p
                className={`text-[11px] leading-tight mt-0.5 ${
                  isAppActive ? 'text-emerald-800 font-medium' : 'text-slate-400'
                }`}
              >
                {isAppActive
                  ? 'Quản lý đang xem được vị trí GPS trực tiếp của bạn để điều phối ca làm.'
                  : 'Đã dừng chia sẻ vị trí. Quản lý sẽ không thể xem GPS khi bạn tắt app.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggleAppActive()}
            disabled={isTogglingApp}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 ${
              isAppActive
                ? 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isAppActive ? 'Tắt App' : 'Bật App'}</span>
          </button>
        </div>

        {/* ================= CẢNH BÁO MÔI TRƯỜNG & QUYỀN ĐỊNH VỊ GPS ================= */}
        {isNonHttps && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-3.5 text-rose-950 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>CẢNH BÁO BẢO MẬT: CHƯA CÓ CHỨNG CHỈ HTTPS (SSL)</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-snug">
              Trình duyệt di động (Safari/Chrome) bắt buộc phải có kết nối bảo mật <strong>HTTPS</strong> mới cho phép kích hoạt GPS. Do web đang chạy qua HTTP, trình duyệt đã tự động chặn quyền vị trí. Quản trị viên cần cài đặt SSL/HTTPS cho domain.
            </p>
          </div>
        )}

        {isInAppBrowser && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 text-amber-950 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>BẠN ĐANG MỞ LINK TRONG ZALO / MESSENGER</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-snug">
              Trình duyệt nhúng của Zalo/Messenger thường chặn popup xin quyền GPS. Vui lòng bấm vào biểu tượng <strong>"..."</strong> ở góc trên bên phải màn hình → Chọn <strong>"Mở bằng trình duyệt ngoài"</strong> (Safari / Chrome) để quản lý theo dõi được bạn trên bản đồ.
            </p>
          </div>
        )}

        {gpsPermissionState === 'denied' && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-3.5 text-rose-950 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-rose-800">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>QUYỀN VỊ TRÍ ĐANG BỊ TỪ CHỐI</span>
              </div>
              <button
                onClick={() => requestLocationPermissionAndPush(true)}
                disabled={isRequestingGps}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
              >
                {isRequestingGps ? 'Đang thử...' : 'Thử lại'}
              </button>
            </div>
            <p className="text-[11px] text-rose-800 leading-snug">
              Điện thoại đang chặn quyền vị trí của trang web này. Vui lòng bấm vào biểu tượng ổ khóa hoặc <strong>aA</strong> trên thanh địa chỉ trình duyệt → <em>Cài đặt trang web → Vị trí → Cho phép</em>.
            </p>
          </div>
        )}

        {gpsPermissionState !== 'denied' && gpsPermissionState !== 'granted' && !isNonHttps && !isInAppBrowser && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-900 shadow-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold">Chưa cấp quyền vị trí GPS</div>
                <div className="text-[11px] text-blue-700">Cho phép để quản lý theo dõi lộ trình và hỗ trợ điều phối ca làm</div>
              </div>
            </div>
            <button
              onClick={() => requestLocationPermissionAndPush(true)}
              disabled={isRequestingGps}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
            >
              {isRequestingGps ? 'Đang hỏi...' : 'Cấp quyền GPS'}
            </button>
          </div>
        )}

        {/* ================= 0b. CẢNH BÁO NGUY CƠ ĐI MUỘN (TRƯỚC GIỜ BÓNG LĂN 30 PHÚT) ================= */}
        {punctualityEval && punctualityEval.riskLevel === 'CRITICAL_LATE' && (
          <div className="bg-rose-50 border-2 border-rose-500/80 rounded-2xl p-4 text-rose-950 space-y-2 shadow-md animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚨 CẢNH BÁO: BẠN CÓ NGUY CƠ ĐI MUỘN!</span>
              </span>
              <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full">
                Trễ ~{punctualityEval.lateMinutes} phút
              </span>
            </div>
            <p className="text-xs font-medium text-slate-800 leading-relaxed">
              Trận đấu <strong className="text-slate-900">{activeJob?.title}</strong> tại sân{' '}
              <strong className="text-slate-900">{activeJob?.location?.name}</strong> bắt đầu lúc{' '}
              <strong className="text-rose-700">
                {new Date(activeJob?.start_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              .
            </p>
            <div className="bg-white/90 border border-rose-200 rounded-xl p-2.5 text-xs grid grid-cols-3 gap-2 text-center font-bold">
              <div>
                <div className="text-[10px] text-slate-400 font-normal">Quãng đường</div>
                <div className="text-slate-900">{punctualityEval.distanceKm} km</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-normal">Đi xe máy</div>
                <div className="text-slate-900">~{punctualityEval.travelMinutes} phút</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-normal">Hạn chót (-30p)</div>
                <div className="text-rose-600">
                  {punctualityEval.deadlineTime.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <p className="text-[11px] font-bold text-rose-800 text-center">
              ⚠️ Quy định bắt buộc: Phải có mặt tại sân trước 30 phút trước giờ bóng lăn. Bạn cần xuất phát ngay!
            </p>
          </div>
        )}

        {punctualityEval && punctualityEval.riskLevel === 'WARNING_RUSH' && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-amber-900 text-xs font-medium flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Cần xuất phát ngay:</strong> Bạn cách sân {punctualityEval.distanceKm} km (~{punctualityEval.travelMinutes}p). Chỉ còn {punctualityEval.marginMinutes} phút dôi dư trước hạn chót có mặt ({punctualityEval.deadlineTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).
              </span>
            </div>
          </div>
        )}

        {/* ================= TAB 1: LỊCH CỦA TÔI (ƯU TIÊN LÊN ĐẦU) ================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Lịch Ca Làm Của Bạn
                </h2>
                <p className="text-xs text-slate-500">Các trận đấu được phân công tác nghiệp</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {myJobsData?.jobStaffs?.length || 0} ca được gán
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-28 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-28 bg-slate-200 rounded-xl animate-pulse" />
              </div>
            ) : myJobsData?.jobStaffs?.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm">
                <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium">Hiện tại bạn chưa có ca làm việc nào được phân công.</p>
              </div>
            ) : (
              myJobsData.jobStaffs.map((assignment: any) => {
                const job = assignment.job;
                const isOngoing = job.status === 'IN_PROGRESS';
                const isCompleted = job.status === 'COMPLETED';
                const myAllocation = transportAssignments.find((a: any) => a.job?.id === job.id);
                const hasCheckedInStadium = Boolean(myAllocation?.stadium_check_in_time);

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-2xl p-4 border transition-all shadow-sm space-y-3 ${
                      isOngoing
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isOngoing
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : isCompleted
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {isOngoing ? '🔴 ĐANG DIỄN RA' : isCompleted ? '✓ ĐÃ HOÀN THÀNH' : '⏳ SẮP TỚI'}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-amber-700">
                          {assignment.payout_amount?.toLocaleString('vi-VN')} đ
                        </span>
                        <div className="text-[10px] text-slate-500 flex flex-col items-end gap-0.5 mt-0.5">
                          {assignment.payout_status === 'PAID' ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Đã nhận lương
                            </span>
                          ) : (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              ⏳ Chưa nhận tiền
                            </span>
                          )}
                          {assignment.payout_proof_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(assignment.payout_proof_url)}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5 underline cursor-pointer mt-0.5"
                            >
                              <Camera className="w-2.5 h-2.5" />
                              <span>Xem bill CK</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">{job.title}</h3>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          -{' '}
                          {new Date(job.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          ({new Date(job.start_time).toLocaleDateString('vi-VN')})
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-tight font-medium text-slate-700">
                          {job.location?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                        <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          Vai trò của bạn: <strong className="text-blue-800 font-bold">{getDutyLabel(assignment.duty)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* GHI CHÚ TỪ QUẢN LÝ / ADMIN */}
                    {job.notes && (
                      <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-950 space-y-1 shadow-2xs">
                        <span className="font-extrabold flex items-center gap-1.5 text-amber-900 text-xs">
                          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Ghi chú từ Quản lý / Admin:</span>
                        </span>
                        <p className="font-semibold text-slate-800 text-[11px] leading-relaxed bg-white/85 p-2 rounded-lg border border-amber-200/80 whitespace-pre-line">
                          {job.notes}
                        </p>
                      </div>
                    )}

                    {/* THÔNG TIN VẬN CHUYỂN THIẾT BỊ (ĐỒ BẠN CHỞ & ĐỒ ĐỒNG ĐỘI CHỞ) */}
                    {(() => {
                      const allJobEquips = job.equipmentAssignments || [];

                      // 1. Đồ BẢN THÂN MÌNH phụ trách chở
                      const myJobAllocations = allJobEquips.filter(
                        (a: any) => a.transport_by_user_id === currentUser?.id
                      );
                      const myAllocationsFallback = transportAssignments.filter(
                        (a: any) => a.job?.id === job.id
                      );
                      const finalMyAllocations = myJobAllocations.length > 0 ? myJobAllocations : myAllocationsFallback;
                      const hasMyAllocations = finalMyAllocations.length > 0;
                      const allMyCheckedIn = hasMyAllocations && finalMyAllocations.every((a: any) => a.check_in_status === 'CONFIRMED');
                      const myCheckedInPhoto = finalMyAllocations.find((a: any) => a.check_in_photo_url)?.check_in_photo_url;

                      // 2. Đồ ĐỒNG ĐỘI KHÁC cùng ca chở (nếu có nhiều người chở)
                      const otherAllocations = allJobEquips.filter(
                        (a: any) => a.transport_by_user_id && a.transport_by_user_id !== currentUser?.id
                      );
                      const othersByCarrier: { [key: number]: { user: any; items: any[] } } = {};
                      otherAllocations.forEach((ea: any) => {
                        const cId = ea.transport_by_user_id;
                        if (!othersByCarrier[cId]) {
                          othersByCarrier[cId] = {
                            user: ea.transportByUser || { id: cId, name: `Nhân sự #${cId}` },
                            items: [],
                          };
                        }
                        othersByCarrier[cId].items.push(ea);
                      });
                      const otherCarriers = Object.values(othersByCarrier);

                      return (
                        <div className="space-y-2.5">
                          {/* KHUNG 1: ĐỒ BẠN PHỤ TRÁCH CHỞ */}
                          {hasMyAllocations ? (
                            <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3 space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-amber-600" />
                                  <span>🛵 Thiết bị bạn chở ({finalMyAllocations.length} món):</span>
                                </span>
                                {allMyCheckedIn ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ✓ Đã lấy đủ đồ
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full animate-pulse">
                                    ⏳ Cần check-in lấy đồ
                                  </span>
                                )}
                              </div>

                              {/* Danh sách các món đồ CỦA MÌNH */}
                              <div className="space-y-1.5">
                                {finalMyAllocations.map((a: any) => (
                                  <div
                                    key={a.id}
                                    className="bg-white/95 border border-amber-300 p-2 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs"
                                  >
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 min-w-0">
                                      <span>📦</span>
                                      <span className="truncate">{a.equipment?.name}</span>
                                      <span className="text-[10px] text-slate-500 font-normal shrink-0">
                                        [{a.equipment?.category?.name || 'Thiết bị'}]
                                      </span>
                                    </div>
                                    <div className="inline-flex items-center gap-1 text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>Hiện ở: <strong>{a.equipment?.current_location || 'Kho văn phòng'}</strong></span>
                                      {a.equipment?.currentHolder?.name && (
                                        <span className="text-amber-700 font-medium">({a.equipment.currentHolder.name} giữ)</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Ghi chú riêng của món đồ nếu có */}
                              {finalMyAllocations[0]?.handover_notes && finalMyAllocations[0].handover_notes !== job.notes && (
                                <p className="text-[11px] text-amber-950 italic bg-amber-100/70 p-2 rounded-xl border border-amber-200">
                                  💬 <strong>Lưu ý thêm:</strong> {finalMyAllocations[0].handover_notes}
                                </p>
                              )}

                              {/* Ảnh đồ admin chụp sẵn để đối chiếu */}
                              {job.equipment_photo_url && (
                                <div className="bg-white p-2 rounded-xl border border-amber-200 flex items-center gap-2.5">
                                  <img
                                    src={resolveMediaUrl(job.equipment_photo_url)}
                                    alt="Ảnh admin chuẩn bị"
                                    onError={handleMediaError}
                                    onClick={() => setPreviewPhotoUrl(job.equipment_photo_url)}
                                    className="w-12 h-12 rounded-lg object-cover border border-amber-300 cursor-pointer hover:opacity-80 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-slate-900 block">Ảnh đồ admin soạn sẵn</span>
                                    <span className="text-[10px] text-slate-500 block">Bấm vào ảnh để phóng to đối chiếu</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoUrl(job.equipment_photo_url)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 hover:bg-blue-100 shrink-0 cursor-pointer"
                                  >
                                    Xem ảnh
                                  </button>
                                </div>
                              )}

                              {/* NÚT CHECK-IN LẤY ĐỒ CỦA MÌNH */}
                              {!isCompleted && !allMyCheckedIn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatchCheckInModalJob({ job, assignments: finalMyAllocations });
                                    setBatchPhotoFile(null);
                                    setBatchPhotoPreview(null);
                                    setBatchNotes(job.notes || finalMyAllocations[0]?.handover_notes || '');
                                  }}
                                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>📸 CHECK-IN LẤY {finalMyAllocations.length} MÓN ĐỒ BẠN CHỞ (CHỤP 1 ẢNH TỔNG THỂ)</span>
                                </button>
                              )}

                              {/* ĐÃ CHECK-IN: HIỂN THỊ NÚT XEM LẠI ẢNH ĐÃ CHỤP */}
                              {allMyCheckedIn && myCheckedInPhoto && (
                                <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-xs">
                                  <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Đã check-in lấy đủ đồ lên xe</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoUrl(myCheckedInPhoto)}
                                    className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px] cursor-pointer"
                                  >
                                    Xem ảnh đã check-in
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center gap-2 text-xs text-slate-600">
                              <span className="text-base shrink-0">🚶</span>
                              <span className="font-medium">
                                Ca này bạn <strong className="text-slate-900 font-bold">không phải chở thiết bị</strong>. Vui lòng di chuyển thẳng tới sân bóng.
                              </span>
                            </div>
                          )}

                          {/* KHUNG 2: ĐỒ ĐỒNG ĐỘI CÙNG CA CHỞ (NẾU CÓ NGƯỜI KHÁC CŨNG CHỞ ĐỒ) */}
                          {otherCarriers.length > 0 && (
                            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-2">
                              <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span>Đồng đội cùng ca phụ trách chở đồ ({otherAllocations.length} món):</span>
                              </div>
                              <div className="space-y-2">
                                {otherCarriers.map((carrier: any) => {
                                  const allCarrierCheckedIn = carrier.items.every((it: any) => it.check_in_status === 'CONFIRMED');
                                  const carrierPhoto = carrier.items.find((it: any) => it.check_in_photo_url)?.check_in_photo_url;

                                  return (
                                    <div
                                      key={carrier.user?.id}
                                      className="bg-white p-2.5 rounded-xl border border-blue-200 text-xs space-y-1.5 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <img
                                            src={resolveAvatarUrl(carrier.user?.avatar_url)}
                                            onError={handleAvatarError}
                                            alt={carrier.user?.name}
                                            className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
                                          />
                                          <span className="font-extrabold text-slate-900">
                                            {carrier.user?.name}
                                            {carrier.user?.phone && (
                                              <span className="text-[10px] text-slate-500 font-normal ml-1">
                                                ({carrier.user.phone})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        {allCarrierCheckedIn ? (
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                                            ✓ Đã lấy đồ
                                          </span>
                                        ) : (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                            ⏳ Chưa lấy
                                          </span>
                                        )}
                                      </div>

                                      {/* Các món đồng đội này chở */}
                                      <div className="flex flex-wrap gap-1">
                                        {carrier.items.map((it: any) => (
                                          <span
                                            key={it.id}
                                            className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                          >
                                            📦 {it.equipment?.name}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Nút xem ảnh nếu đồng đội này đã check-in */}
                                      {carrierPhoto && (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewPhotoUrl(carrierPhoto)}
                                          className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-1 cursor-pointer pt-0.5"
                                        >
                                          <Camera className="w-3 h-3" />
                                          <span>Xem ảnh đồng đội đã check-in</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Check-in tại sân & Kết thúc ca làm việc */}
                    {!isCompleted && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        {/* 0. NÚT BẮT ĐẦU DI CHUYỂN TỚI SÂN (BẬT GPS LIÊN TỤC) */}
                        {!hasCheckedInStadium && currentUser?.operational_status !== 'WORKING' && (
                          currentUser?.operational_status !== 'MOVING' ? (
                            <button
                              type="button"
                              onClick={() => handleSetOperationalStatus('MOVING')}
                              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>🛵 BẮT ĐẦU DI CHUYỂN TỚI SÂN (BẬT GPS LIVE)</span>
                            </button>
                          ) : (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-amber-900 shadow-2xs">
                              <span className="flex items-center gap-1.5">
                                <Navigation className="w-4 h-4 text-amber-600 animate-bounce" />
                                <span>🛵 Đang di chuyển tới sân (GPS Live liên tục)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSetOperationalStatus('IDLE')}
                                className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-0.5 rounded font-bold cursor-pointer"
                                title="Tạm dừng nếu chưa khởi hành"
                              >
                                Tạm dừng
                              </button>
                            </div>
                          )
                        )}

                        {/* 1. NÚT CHECK-IN ĐÃ TỚI SÂN BÓNG */}
                        {!hasCheckedInStadium && currentUser?.operational_status !== 'WORKING' ? (
                          <button
                            disabled={actionLoading === 'stadium-checkin'}
                            onClick={() => handleStadiumCheckIn(myAllocation?.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>📍 CHECK-IN ĐÃ TỚI SÂN BÓNG</span>
                          </button>
                        ) : (
                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Đã check-in có mặt tại sân bóng</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono">
                              {myAllocation?.stadium_check_in_time
                                ? new Date(myAllocation.stadium_check_in_time).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Đang tác nghiệp'}
                            </span>
                          </div>
                        )}

                        {/* 2. NÚT KẾT THÚC CA LÀM VIỆC */}
                        {currentUser?.operational_status === 'WORKING' && (
                          <button
                            disabled={actionLoading === 'finish-match'}
                            onClick={handleFinishMatch}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                          >
                            <span>🏁 KẾT THÚC CA TÁC NGHIỆP</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Google Maps link button */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        job.location?.name || 'Sân bóng TP HCM'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      Chỉ đường Google Maps tới sân
                    </a>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= TAB 2: ĐỒ CẦN MANG & CHECK-IN/CHECK-OUT ================= */}
        {activeTab === 'gear' && (
          <div className="space-y-4">
            {/* Banner nổi bật đồ cần chở đi */}
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 p-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm mb-1.5">
                <Truck className="w-5 h-5 text-amber-600" />
                <span>HÔM NAY BẠN CẦN MANG THEO:</span>
              </div>
              {transportAssignments.length === 0 ? (
                <p className="text-xs text-slate-600 italic">
                  Hôm nay bạn không có thiết bị nào được chỉ định chở. Hãy di chuyển trực tiếp tới sân!
                </p>
              ) : (
                <ul className="text-xs font-bold text-slate-900 space-y-2 mt-2">
                  {transportAssignments.map((a: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 bg-white/95 p-2.5 rounded-xl border border-amber-200 shadow-xs">
                      {a.equipment?.image_url ? (
                        <img
                          src={resolveMediaUrl(a.equipment.image_url)}
                          alt={a.equipment.name}
                          onError={handleMediaError}
                          className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="font-bold text-slate-900 leading-tight">
                          {a.equipment?.name}{' '}
                          <span className="text-[10px] text-amber-800 font-semibold">[{a.equipment?.category?.name || 'Thiết bị'}]</span>
                        </div>

                        {/* VỊ TRÍ MÓN ĐỒ HIỆN TẠI (LẤY Ở ĐÂU) */}
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                          <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Vị trí đồ hiện tại: <strong>{a.equipment?.current_location || 'Kho văn phòng'}</strong></span>
                          {a.equipment?.currentHolder?.name && (
                            <span className="text-amber-800 font-semibold">({a.equipment.currentHolder.name} giữ)</span>
                          )}
                        </div>

                        {/* ĐỊA ĐIỂM SÂN BÓNG & CHỈ ĐƯỜNG */}
                        <div className="flex items-start justify-between gap-1 text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Chở đến sân: {a.job?.location?.name || a.job?.title}</span>
                            </div>
                            {a.job?.location?.address && (
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                📍 {a.job.location.address}
                              </div>
                            )}
                          </div>
                          {(a.job?.location?.address || a.job?.location?.name) && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                (a.job.location.name ? a.job.location.name + ', ' : '') + (a.job.location.address || 'Hồ Chí Minh')
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 flex items-center gap-0.5 shrink-0 shadow-2xs"
                            >
                              Chỉ đường ↗
                            </a>
                          )}
                        </div>

                        {(a.job?.notes || a.handover_notes) && (
                          <div className="text-[11px] text-rose-700 font-medium">
                            ⚠️ Ghi chú admin: {a.job?.notes || a.handover_notes}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Check-in / Check-out Thiết Bị ({transportAssignments.length})
              </h2>
            </div>

            {loading ? (
              <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
            ) : transportAssignments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm">
                <Package className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium">Bạn hiện không được phân công chở món đồ nào.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transportAssignments.map((alloc: any) => {
                  const isCheckedOut = alloc.check_in_status === 'CONFIRMED';
                  const isReturned = alloc.check_out_status === 'CONFIRMED';
                  const isPending = !isCheckedOut;

                  return (
                    <div
                      key={alloc.id}
                      className={`rounded-2xl p-4 border transition-all shadow-sm space-y-3 ${
                        isCheckedOut && !isReturned
                          ? 'bg-amber-50/70 border-amber-300'
                          : isReturned
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {alloc.equipment?.image_url && (
                        <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={resolveMediaUrl(alloc.equipment.image_url)}
                            alt={alloc.equipment.name}
                            onError={handleMediaError}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 uppercase border border-emerald-200">
                            {alloc.equipment?.category?.name || 'Thiết bị'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{alloc.equipment?.name}</h4>
                          {alloc.equipment?.qr_code && (
                            <span className="text-[11px] font-mono text-amber-800 font-bold">
                              QR: {alloc.equipment.qr_code}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isCheckedOut && !isReturned
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : isReturned
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isCheckedOut && !isReturned ? '📦 ĐANG CHỞ ĐI' : isReturned ? '✓ ĐÃ TRẢ KHO' : '⏳ CHỜ LẤY ĐỒ'}
                        </span>
                      </div>

                      {/* VỊ TRÍ THIẾT BỊ HIỆN TẠI (ĐANG Ở ĐÂU) */}
                      <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-300 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Vị trí món đồ hiện tại: <strong>{alloc.equipment?.current_location || 'Kho văn phòng'}</strong></span>
                          {alloc.equipment?.currentHolder?.name && (
                            <span className="text-[11px] text-amber-800 font-semibold bg-amber-200/70 px-1.5 py-0.2 rounded">
                              (do anh {alloc.equipment.currentHolder.name} giữ)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ĐỊA ĐIỂM SÂN BÓNG & CHỈ ĐƯỜNG */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>Sân thi đấu: {alloc.job?.location?.name || alloc.job?.title}</span>
                            </div>
                            {alloc.job?.location?.address && (
                              <div className="text-[11px] text-slate-600 mt-0.5 flex items-start gap-1">
                                <span className="text-slate-400">📍</span>
                                <span>{alloc.job.location.address}</span>
                              </div>
                            )}
                          </div>
                          {(alloc.job?.location?.name || alloc.job?.location?.address) && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                (alloc.job.location.name ? alloc.job.location.name + ', ' : '') + (alloc.job.location.address || 'Hồ Chí Minh')
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-700 font-bold bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50 shrink-0 shadow-2xs"
                            >
                              Chỉ đường ↗
                            </a>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Trận: <strong className="text-slate-800">{alloc.job?.title}</strong>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        {(alloc.job?.notes || alloc.handover_notes) && (
                          <div className="text-rose-700 font-medium">⚠️ Admin: {alloc.job?.notes || alloc.handover_notes}</div>
                        )}
                        {alloc.check_in_time && (
                          <div className="text-[11px] text-slate-500">
                            Lấy đồ đi: {new Date(alloc.check_in_time).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
                        {alloc.check_in_photo_url && (
                          <div className="pt-1.5 flex items-center gap-2.5 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100">
                            <img
                              src={resolveMediaUrl(alloc.check_in_photo_url)}
                              onError={handleMediaError}
                              alt="Ảnh lúc lên xe"
                              className="w-11 h-11 rounded-lg object-cover border border-blue-200 shadow-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(resolveMediaUrl(alloc.check_in_photo_url), '_blank')}
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-700 block">Ảnh lúc lên xe</span>
                              <a
                                href={resolveMediaUrl(alloc.check_in_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 underline font-semibold flex items-center gap-0.5"
                              >
                                <ImageIcon className="w-3 h-3" /> Xem ảnh gốc
                              </a>
                            </div>
                          </div>
                        )}
                        {alloc.check_out_time && (
                          <div className="text-[11px] text-emerald-700 font-semibold">
                            Đã trả kho: {new Date(alloc.check_out_time).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
                        {alloc.check_out_photo_url && (
                          <div className="pt-1.5 flex items-center gap-2.5 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
                            <img
                              src={resolveMediaUrl(alloc.check_out_photo_url)}
                              onError={handleMediaError}
                              alt="Ảnh kiểm kê trả kho"
                              className="w-11 h-11 rounded-lg object-cover border border-emerald-200 shadow-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(resolveMediaUrl(alloc.check_out_photo_url), '_blank')}
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-emerald-800 block">Ảnh kiểm kê trả kho</span>
                              <a
                                href={resolveMediaUrl(alloc.check_out_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-700 underline font-semibold flex items-center gap-0.5"
                              >
                                <ImageIcon className="w-3 h-3" /> Xem ảnh kiểm kê
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action button 1: Lấy đồ lên xe (Chụp ảnh & nén S3) */}
                      {isPending && (
                        <button
                          onClick={() => {
                            setCheckOutModalAlloc(alloc);
                            setCheckOutNotes(alloc.handover_notes || '');
                          }}
                          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>CHỤP ẢNH ĐỒ LÊN XE & CHECK-IN LẤY ĐỒ</span>
                        </button>
                      )}

                      {/* Action button 2: Trả đồ về văn phòng (Kiểm kê & chụp ảnh S3) */}
                      {isCheckedOut && !isReturned && (
                        <button
                          onClick={() => handleOpenCheckInModal(alloc)}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>KIỂM KÊ & CHỤP ẢNH TRẢ ĐỒ VỀ KHO</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ĐỊNH VỊ GPS (TỐI ƯU PIN NHẤT) ================= */}
        {activeTab === 'tracking' && (
          <div className="space-y-4">
            {/* Thanh chọn nhanh trạng thái của bạn */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Trạng thái hoạt động của bạn</span>
                <span className="text-[10px] text-slate-400 font-normal">Bấm để thay đổi</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetOperationalStatus('IDLE')}
                  className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                    currentUser?.operational_status === 'IDLE'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-base mb-0.5">⚪</div>
                  <div>Sẵn sàng / Rảnh</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetOperationalStatus('MOVING')}
                  className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                    currentUser?.operational_status === 'MOVING'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs animate-pulse'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <div className="text-base mb-0.5">🛵</div>
                  <div>Đang di chuyển</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetOperationalStatus('WORKING')}
                  className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                    currentUser?.operational_status === 'WORKING'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <div className="text-base mb-0.5">📍</div>
                  <div>Đang tác nghiệp</div>
                </button>
              </div>
            </div>

            {/* Banner trạng thái định vị GPS */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>GPS {currentUser?.operational_status === 'MOVING' ? '🟢 Đang truyền Live liên tục' : '⚪ Tạm dừng ngắt pin'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {lastGpsSyncTime ? `Lần đồng bộ cuối: ${lastGpsSyncTime}` : 'Đã sẵn sàng đồng bộ GPS'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleManualGpsRefresh}
                disabled={isRequestingGps}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold shadow-xs hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
              >
                {isRequestingGps ? 'Đang lấy...' : 'Cập nhật ngay'}
              </button>
            </div>

            {gpsErrorText && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5 flex items-center justify-between text-xs text-rose-800 shadow-2xs">
                <span className="truncate pr-2">⚠️ {gpsErrorText}</span>
                <button
                  type="button"
                  onClick={() => setShowGpsDiagnosticsModal(true)}
                  className="underline font-bold text-rose-700 shrink-0 cursor-pointer text-[11px]"
                >
                  Xem hướng dẫn mở
                </button>
              </div>
            )}

            {/* Người chở thiết bị nổi bật (Nếu mình không cần chở đồ) */}
            {!amICarryingGear && gearCarrier && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 shadow-sm space-y-2">
                <div className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <span>ĐỒNG NGHIỆP ĐANG CHỞ THIẾT BỊ:</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={resolveAvatarUrl(gearCarrier.avatar_url)}
                      onError={handleAvatarError}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{gearCarrier.name}</div>
                      <div className="text-[10px] text-slate-500">📍 {gearCarrier.address_district || 'TP.HCM'}</div>
                    </div>
                  </div>
                  {gearCarrier.phone && (
                    <a
                      href={`tel:${gearCarrier.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Gọi</span>
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 italic">
                  Bạn không cần chở đồ ca này. Có thể theo dõi vị trí đồng nghiệp trên bản đồ bên dưới!
                </p>
              </div>
            )}

            {/* Bản đồ radar đồng nghiệp & vị trí sân */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md relative bg-white">
              <LiveMap
                users={[
                  {
                    ...currentUser,
                    current_lat: currentCoord.lat,
                    current_lng: currentCoord.lng,
                    operational_status: currentUser?.operational_status || 'IDLE',
                  },
                  ...colleagues,
                ]}
                jobs={activeJob ? [activeJob] : []}
                className="h-[280px] w-full"
                zoom={13}
                center={[currentCoord.lat, currentCoord.lng]}
              />
            </div>

            {/* Danh sách đồng nghiệp cùng ca tác nghiệp */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Đồng Nghiệp Cùng Ca ({colleagues.length})</span>
                {lastGpsSyncTime && (
                  <span className="text-[10px] font-normal text-slate-500 font-mono">Đồng bộ: {lastGpsSyncTime}</span>
                )}
              </div>

              {colleagues.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">
                  Không có nhân sự khác được phân công cùng ca này.
                </p>
              ) : (
                <div className="space-y-2">
                  {colleagues.map((col: any) => {
                    const isMoving = col.operational_status === 'MOVING';
                    const isWorking = col.operational_status === 'WORKING';

                    return (
                      <div
                        key={col.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolveAvatarUrl(col.avatar_url)}
                            onError={handleAvatarError}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{col.name}</span>
                              {col.transportAssignments?.length > 0 && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                  🛵 Chở đồ
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {isMoving ? (
                                <span className="text-amber-700 font-bold">🛵 Đang trên đường</span>
                              ) : isWorking ? (
                                <span className="text-emerald-700 font-bold">🎥 Đang tại sân</span>
                              ) : (
                                <span>☕ Sẵn sàng</span>
                              )}
                              {col.address_district && ` • ${col.address_district}`}
                            </div>
                          </div>
                        </div>

                        {col.phone && (
                          <a
                            href={`tel:${col.phone}`}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-xs"
                            title="Gọi điện"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Demo GPS Simulation Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span>Mô phỏng xe chạy thử nghiệm</span>
                </div>
                <button
                  onClick={() => {
                    const next = !gpsSimulationActive;
                    setGpsSimulationActive(next);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    gpsSimulationActive
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold animate-pulse'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  {gpsSimulationActive ? 'Đang chạy mô phỏng' : 'Bật Demo GPS'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PROFILE & THỐNG KÊ LƯƠNG ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-emerald-500/30 mb-3 shadow-md group">
                <img
                  src={resolveAvatarUrl(currentUser?.avatar_url)}
                  onError={handleAvatarError}
                  className="w-full h-full object-cover"
                />
                <label
                  title="Tải ảnh đại diện mới"
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white text-[10px] font-bold"
                >
                  {isUploadingAvatar ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-emerald-300 mb-0.5" />
                      <span>Đổi ảnh</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingAvatar}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleAvatarUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="mb-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors border border-slate-200">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isUploadingAvatar ? 'Đang tải...' : 'Đổi ảnh đại diện'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingAvatar}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleAvatarUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              <h3 className="font-extrabold text-slate-900 text-lg">{currentUser?.name}</h3>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${getUserRoleBadge(currentUser?.role).className}`}>
                  {getUserRoleBadge(currentUser?.role).label}
                </span>
                {currentUser?.address_district && (
                  <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                    📍 {currentUser.address_district}
                  </span>
                )}
              </div>
              {currentUser?.skills && (
                <div className="mt-1.5 text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 inline-block">
                  💼 {currentUser.skills}
                </div>
              )}
              <p className="text-xs text-slate-500 font-mono mt-1">📞 {currentUser?.phone}</p>

              {/* Action buttons để tự sửa thông tin & đổi mật khẩu */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalTab('profile');
                    setShowProfileModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sửa hồ sơ & SĐT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalTab('security');
                    setShowProfileModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đổi mật khẩu</span>
                </button>
              </div>
            </div>

            {/* Thống kê thù lao: 4 KPIs rõ ràng */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Thống Kê Thù Lao & Tiền Lương</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Tự động hạch toán</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Tổng thù lao</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-1">
                    {myJobsData?.stats?.totalWageEarned?.toLocaleString('vi-VN') || 0} đ
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Lương thực nhận (Đã làm)</div>
                  <div className="text-base font-black text-emerald-700 font-mono mt-1">
                    {myJobsData?.stats?.completedWageEarned?.toLocaleString('vi-VN') || 0} đ
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-800 uppercase">✓ Lương đã nhận tiền</div>
                  <div className="text-base font-black text-blue-700 font-mono mt-1">
                    {myJobsData?.stats?.paidWageEarned?.toLocaleString('vi-VN') || 0} đ
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-300">
                  <div className="text-[10px] font-bold text-amber-900 uppercase">⏳ Lương còn chưa nhận</div>
                  <div className="text-base font-black text-amber-800 font-mono mt-1">
                    {myJobsData?.stats?.unpaidWageEarned?.toLocaleString('vi-VN') || 0} đ
                  </div>
                </div>
              </div>

              {/* Nút nhận toàn bộ lương chưa nhận */}
              {(myJobsData?.stats?.unpaidWageEarned || 0) > 0 && (
                <button
                  disabled={payoutLoadingId === 'bulk'}
                  onClick={handleBulkPayout}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {payoutLoadingId === 'bulk' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>XÁC NHẬN ĐÃ NHẬN TOÀN BỘ ({myJobsData?.stats?.unpaidWageEarned?.toLocaleString('vi-VN')} đ)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Chi tiết từng trận đấu & Nút chọn đã nhận lương */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lịch Sử Trận Đấu & Tình Trạng Lương
              </div>

              {myJobsData?.jobStaffs?.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">Chưa có lịch sử trận đấu.</p>
              ) : (
                <div className="space-y-2.5">
                  {myJobsData?.jobStaffs?.map((st: any) => {
                    const isPaid = st.payout_status === 'PAID';
                    const isJobCompleted = st.job?.status === 'COMPLETED';

                    return (
                      <div
                        key={st.id}
                        className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                          isPaid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{st.job?.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(st.job?.start_time).toLocaleDateString('vi-VN')} • {st.job?.location?.name}
                            </div>
                            <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                              Vai trò: <strong>{getDutyLabel(st.duty)}</strong>
                            </div>
                            {st.payout_notes && (
                              <div className="text-[10px] text-purple-700 italic mt-0.5">
                                💬 "{st.payout_notes}"
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-slate-900">
                              {st.payout_amount?.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="flex flex-col items-end gap-1 mt-1">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {isPaid ? '✓ ĐÃ NHẬN TIỀN' : '⏳ CHƯA NHẬN'}
                              </span>
                              {st.payout_proof_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(st.payout_proof_url)}
                                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer"
                                  title="Xem ảnh bill chuyển khoản"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Xem bill CK</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nút toggle nhận lương từng trận */}
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            Trạng thái trận: {isJobCompleted ? '✓ Đã xong' : 'Đang xử lý'}
                          </span>
                          <button
                            disabled={payoutLoadingId === st.id}
                            onClick={() => handleTogglePayout(st.id, st.payout_status)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              isPaid
                                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {payoutLoadingId === st.id
                              ? 'Đang lưu...'
                              : isPaid
                              ? 'Đổi sang chưa nhận'
                              : '✓ Đã nhận tiền trận này'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cài đặt tài khoản & Đăng xuất */}
            {onLogout && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tài Khoản & Phiên Đăng Nhập
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Số điện thoại: <strong className="text-slate-900 font-mono">{currentUser?.phone || 'Chưa cập nhật'}</strong></div>
                  <div>Thời hạn phiên: <span className="text-emerald-700 font-bold">Lưu 7 ngày trên thiết bị này</span></div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>ĐĂNG XUẤT KHỎI THIẾT BỊ NÀY</span>
                </button>
              </div>
            )}

            {/* Branded Mobile Staff Footer */}
            <div className="pt-6 pb-2 text-center space-y-2 border-t border-slate-200/80">
              <img
                src="/logo/logo_full.png"
                alt="Bóng Đá Số Media"
                className="h-9 w-auto object-contain mx-auto opacity-80"
              />
              <p className="text-[11px] font-extrabold text-slate-600">
                BÓNG ĐÁ SỐ MEDIA • TRUYỀN THÔNG THỂ THAO
              </p>
              <p className="text-[10px] text-slate-400">
                Hệ thống Tác nghiệp & Điều phối Hiện trường • v2.4.0
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CHỤP ẢNH LẤY ĐỒ LÊN XE (NÉN ẢNH S3) ================= */}
      {checkOutModalAlloc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Chụp Ảnh Đồ Lên Xe & Check-in</span>
              </h3>
              <button
                onClick={() => setCheckOutModalAlloc(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{checkOutModalAlloc.equipment?.name}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Đích đến: {checkOutModalAlloc.job?.location?.name || checkOutModalAlloc.job?.title}
                </div>
              </div>

              {/* Camera Photo Picker */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  1. Chụp lại toàn bộ đồ đã bỏ lên xe *
                </label>
                <div className="space-y-2">
                  {checkOutPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 h-44">
                      <img src={checkOutPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setCheckOutPhotoFile(null);
                          setCheckOutPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-2xl p-6 cursor-pointer hover:bg-emerald-50 transition-colors text-center">
                      <Camera className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="font-bold text-emerald-800 text-xs">Bấm để mở Máy Ảnh chụp đồ</span>
                      <span className="text-[10px] text-emerald-600 mt-0.5">Tự động nén ảnh chất lượng cao để tải nhanh</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCheckOutPhotoFile(file);
                            setCheckOutPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">2. Ghi chú khi nhận đồ</label>
                <input
                  type="text"
                  placeholder="VD: Đã bỏ balo đỏ, cuộn dây, 2 pin lên xe..."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckOutModalAlloc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingCheckOut || !checkOutPhotoFile}
                  onClick={handleConfirmCheckOutWithPhoto}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmittingCheckOut ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isSubmittingCheckOut ? 'Đang nén & lưu...' : 'Xác Nhận Lấy Đồ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRẢ ĐỒ / BÀN GIAO THIẾT BỊ (ĐỂ LẠI SÂN HOẶC VỀ KHO) ================= */}
      {checkInModalAlloc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Kiểm Kê & Bàn Giao Thiết Bị</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Để lại tại sân, mang về kho, hoặc nhân viên tạm giữ
                </p>
              </div>
              <button
                onClick={() => setCheckInModalAlloc(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. Chọn nơi đặt / bàn giao thiết bị */}
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  1. Thiết bị sẽ được để ở đâu? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnLocationType('WAREHOUSE')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      returnLocationType === 'WAREHOUSE'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🏢</span>
                    <span className="text-[11px] mt-1 font-bold">Về Kho Văn Phòng</span>
                    <span className="text-[9px] text-slate-500 font-normal">Chở về cất kho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnLocationType('STADIUM')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      returnLocationType === 'STADIUM'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🏟️</span>
                    <span className="text-[11px] mt-1 font-bold">Để Lại Tại Sân</span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {checkInModalAlloc.job?.location?.name || 'Sân bóng'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnLocationType('KEEP')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      returnLocationType === 'KEEP'
                        ? 'border-purple-500 bg-purple-50/80 text-purple-950 font-bold ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🏠</span>
                    <span className="text-[11px] mt-1 font-bold">NV Tạm Giữ Mang Về</span>
                    <span className="text-[9px] text-slate-500 font-normal">Mai đi ca sớm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnLocationType('OTHER')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      returnLocationType === 'OTHER'
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">📍</span>
                    <span className="text-[11px] mt-1 font-bold">Nơi Khác / Bàn Giao</span>
                    <span className="text-[9px] text-slate-500 font-normal">Gửi người khác</span>
                  </button>
                </div>

                {/* Chi tiết địa điểm nếu là STADIUM, KEEP hoặc OTHER */}
                {returnLocationType === 'STADIUM' && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                    <span>🏟️</span>
                    <span>
                      Vị trí lưu: <strong>{checkInModalAlloc.job?.location?.name || 'Sân bóng'}</strong>
                    </span>
                  </div>
                )}

                {(returnLocationType === 'KEEP' || returnLocationType === 'OTHER') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder={
                        returnLocationType === 'KEEP'
                          ? 'Ghi rõ ai giữ (VD: Mang về nhà riêng Lê Chung, mai ca 6h)...'
                          : 'Nhập vị trí cụ thể (VD: Gửi bảo vệ cổng A, giao cho anh Nhật)...'
                      }
                      value={returnLocationCustom}
                      onChange={(e) => setReturnLocationCustom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 2. Checklist thiết bị bàn giao */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold">
                    2. Thiết bị bàn giao ({transportAssignments.length}):
                  </label>
                  <span className="text-[10px] text-slate-400">Tích chọn đồ</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 max-h-36 overflow-y-auto">
                  {transportAssignments.map((a: any) => {
                    const eqId = a.equipment?.id || a.id;
                    const isChecked = checkedEquipments[eqId] ?? true;

                    return (
                      <label key={eqId} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedEquipments({
                              ...checkedEquipments,
                              [eqId]: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {a.equipment?.name} <span className="text-[10px] text-slate-500">[{a.equipment?.category?.name}]</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Ghi chú cho Admin & Quản lý */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  3. Ghi chú bàn giao cho Admin *
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Đã gửi 2 chân quay ở phòng bảo vệ sân Hoàn Anh, gửi chìa khóa cho bảo vệ ca đêm..."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4. Chụp ảnh kiểm kê / đồ cất giữ */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  4. Chụp ảnh đồ tại nơi cất giữ *
                </label>
                <div className="space-y-2">
                  {checkInPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 h-36">
                      <img src={checkInPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setCheckInPhotoFile(null);
                          setCheckInPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-2xl p-4 cursor-pointer hover:bg-emerald-50 transition-colors text-center">
                      <Camera className="w-6 h-6 text-emerald-600 mb-1" />
                      <span className="font-bold text-emerald-800 text-xs">Mở máy ảnh chụp ảnh bàn giao</span>
                      <span className="text-[10px] text-emerald-600 mt-0.5">Tự động nén ảnh chất lượng cao để tải nhanh</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCheckInPhotoFile(file);
                            setCheckInPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckInModalAlloc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingCheckIn || !checkInPhotoFile}
                  onClick={handleConfirmCheckInWithPhoto}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmittingCheckIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{isSubmittingCheckIn ? 'Đang nén & lưu...' : 'Xác Nhận Bàn Giao'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỤP 1 ẢNH TỔNG THỂ & CHECK-IN LẤY ĐỒ ================= */}
      {batchCheckInModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Check-in Lấy Đồ ({batchCheckInModalJob.assignments.length} Món)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBatchCheckInModalJob(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Thông tin ca đấu */}
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                <div className="font-extrabold text-slate-900 text-xs">{batchCheckInModalJob.job?.title}</div>
                <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{batchCheckInModalJob.job?.location?.name}</span>
                </div>
              </div>

              {/* Danh sách các món đồ cần kiểm tra */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  Các thiết bị bạn cần mang theo:
                </label>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-32 overflow-y-auto space-y-1">
                  {batchCheckInModalJob.assignments.map((a: any, idx: number) => (
                    <div key={a.id} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {a.equipment?.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium bg-slate-200/80 px-1.5 py-0.5 rounded">
                          {a.equipment?.category?.name || 'Thiết bị'}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-800 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Vị trí hiện tại: <strong>{a.equipment?.current_location || 'Kho văn phòng'}</strong></span>
                        {a.equipment?.currentHolder?.name && (
                          <span className="text-amber-700">({a.equipment.currentHolder.name} giữ)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ảnh đồ admin chuẩn bị sẵn (để đối chiếu) */}
              {batchCheckInModalJob.job?.equipment_photo_url && (
                <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200 flex items-center gap-2">
                  <img
                    src={resolveMediaUrl(batchCheckInModalJob.job.equipment_photo_url)}
                    alt="Đồ admin chuẩn bị"
                    onError={handleMediaError}
                    onClick={() => setPreviewPhotoUrl(batchCheckInModalJob.job.equipment_photo_url)}
                    className="w-12 h-12 rounded-lg object-cover border border-blue-300 cursor-pointer hover:opacity-85 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-blue-900 block">Ảnh đồ admin soạn sẵn</span>
                    <span className="text-[10px] text-slate-500">Đối chiếu xem đã đủ phụ kiện trước khi lên xe</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPhotoUrl(batchCheckInModalJob.job.equipment_photo_url)}
                    className="text-[10px] text-blue-700 font-bold underline shrink-0 cursor-pointer"
                  >
                    Phóng to
                  </button>
                </div>
              )}

              {/* Chụp 1 ảnh tổng thể toàn bộ đồ trên xe/balo */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  📸 Chụp 1 ảnh tổng thể tất cả đồ trên xe / balo *:
                </label>
                <div className="space-y-2">
                  {batchPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 h-40">
                      <img src={batchPhotoPreview} alt="Ảnh tổng thể" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setBatchPhotoFile(null);
                          setBatchPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-2xl p-4 cursor-pointer hover:bg-emerald-50 transition-colors text-center">
                      <Camera className="w-7 h-7 text-emerald-600 mb-1" />
                      <span className="font-bold text-emerald-800 text-xs">Mở máy ảnh chụp 1 ảnh tổng thể</span>
                      <span className="text-[10px] text-emerald-600 mt-0.5">Không cần chụp từng món, chỉ cần chụp toàn bộ xe/balo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBatchPhotoFile(file);
                            setBatchPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Ghi chú (tùy chọn):</label>
                <input
                  type="text"
                  placeholder="VD: Đã lấy đủ 4 món, balo đỏ..."
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchCheckInModalJob(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBatchCheckIn || (!batchPhotoFile && !batchPhotoPreview)}
                  onClick={handleBatchCheckInSubmit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isSubmittingBatchCheckIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmittingBatchCheckIn ? 'Đang nén & lưu...' : 'Xác Nhận Đã Lấy Đồ Lên Xe'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX / HIGH-RES PHOTO PREVIEW ================= */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Ảnh Chi Tiết
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center bg-slate-950/80 max-h-[70vh] overflow-auto">
              <img
                src={resolveMediaUrl(previewPhotoUrl)}
                onError={handleMediaError}
                alt="Chi tiết ảnh"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom App Bar Navigation (Tab Bar) - Fixed bottom responsive */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto px-2 flex items-center justify-around">
          {/* TAB 1: LỊCH CỦA TÔI */}
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'schedule' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Lịch Của Tôi</span>
          </button>

          {/* TAB 2: ĐỒ CẦN MANG */}
          <button
            onClick={() => setActiveTab('gear')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'gear' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              {transportAssignments.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {transportAssignments.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Đồ Cần Mang</span>
          </button>

          {/* TAB 3: ĐỊNH VỊ GPS */}
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'tracking' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-5 h-5" />
            <span className="text-[10px]">Định Vị GPS</span>
          </button>

          {/* TAB 4: CÁ NHÂN */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Cá Nhân</span>
          </button>
        </div>
      </div>

      {/* Modal Chỉnh Sửa Hồ Sơ & Đổi Mật Khẩu */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUserUpdated={() => {
          if (onRefreshUser) onRefreshUser();
        }}
        initialTab={profileModalTab}
      />

      {/* Modal Hỏi Tắt App Khi Hoàn Tất Ca Làm Hôm Nay */}
      {showFinishedShiftModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl text-center space-y-4 border border-slate-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl shadow-inner">
              🎉
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Lịch Hôm Nay Đã Xong!</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                Bạn đã hoàn thành ca tác nghiệp hôm nay và kiểm kê đồ an toàn. Bạn có muốn <strong>TẮT APP</strong> (ngừng chia sẻ vị trí GPS) để nghỉ ngơi không?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  await handleToggleAppActive(false);
                  setShowFinishedShiftModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Power className="w-4 h-4 text-rose-400" />
                <span>TẮT APP VÀ NGHỈ NGƠI</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFinishedShiftModal(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Để sau (Vẫn giữ app bật)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hướng Dẫn & Chẩn Đoán Lỗi GPS */}
      {showGpsDiagnosticsModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                  📍
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Chẩn Đoán Lỗi Định Vị GPS</h3>
                  <p className="text-[10px] text-slate-500">Tại sao trình duyệt không lấy được tọa độ?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsDiagnosticsModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin kỹ thuật */}
            <div className="space-y-2 text-xs">
              {/* 1. Kiểm tra HTTPS */}
              <div className={`p-2.5 rounded-xl border ${gpsDiagnosticInfo?.isHttps ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-950 font-bold'}`}>
                <div className="flex items-center justify-between">
                  <span>1. Kết nối bảo mật (HTTPS)</span>
                  <span>{gpsDiagnosticInfo?.isHttps ? '✓ Đạt chuẩn' : '❌ KHÔNG ĐẠT'}</span>
                </div>
                {!gpsDiagnosticInfo?.isHttps && (
                  <p className="text-[11px] text-rose-800 font-normal mt-1 leading-snug">
                    Web đang chạy qua <strong>HTTP</strong> ({gpsDiagnosticInfo?.protocol}//{gpsDiagnosticInfo?.host}). Trình duyệt Safari và Chrome trên điện thoại <strong>CHẶN 100%</strong> tính năng GPS trên HTTP vì lý do an ninh. Cần cài chứng chỉ SSL cho domain.
                  </p>
                )}
              </div>

              {/* 2. Kiểm tra In-App Browser */}
              <div className={`p-2.5 rounded-xl border ${!gpsDiagnosticInfo?.isInApp ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-950 font-bold'}`}>
                <div className="flex items-center justify-between">
                  <span>2. Ứng dụng duyệt web</span>
                  <span>{!gpsDiagnosticInfo?.isInApp ? '✓ Trình duyệt ngoài' : '⚠️ Zalo / Messenger'}</span>
                </div>
                {gpsDiagnosticInfo?.isInApp && (
                  <p className="text-[11px] text-amber-900 font-normal mt-1 leading-snug">
                    Bạn đang mở link bên trong Zalo. Vui lòng bấm dấu <strong>"..."</strong> ở góc trên bên phải → <strong>"Mở bằng trình duyệt ngoài"</strong> (Safari / Chrome).
                  </p>
                )}
              </div>

              {/* 3. Kiểm tra Quyền hệ thống */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">3. Hướng dẫn mở quyền trên điện thoại:</span>
                <div className="text-[11px] text-slate-600 space-y-1.5 leading-snug">
                  <div>
                    <strong className="text-slate-900">📱 Nếu dùng iPhone (Safari):</strong>
                    <ol className="list-decimal pl-4 mt-0.5 space-y-0.5 text-slate-600">
                      <li>Vào <em>Cài đặt máy → Quyền riêng tư & Bảo mật → Dịch vụ định vị</em> → Bật <strong>BẬT</strong>.</li>
                      <li>Kéo xuống chọn <strong>Trang web Safari</strong> → Chọn <em>Khi dùng ứng dụng</em>.</li>
                      <li>Trên Safari bấm vào chữ <strong>aA</strong> ở thanh địa chỉ URL → <em>Cài đặt trang web → Vị trí → Cho phép</em>.</li>
                    </ol>
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <strong className="text-slate-900">🤖 Nếu dùng Android (Chrome):</strong>
                    <ol className="list-decimal pl-4 mt-0.5 space-y-0.5 text-slate-600">
                      <li>Bật <strong>Vị trí / GPS</strong> trên thanh gạt nhanh của điện thoại.</li>
                      <li>Bấm vào biểu tượng ổ khóa / cài đặt cạnh link web → <em>Quyền → Vị trí → Cho phép</em>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowGpsDiagnosticsModal(false);
                  requestLocationPermissionAndPush(true);
                }}
                disabled={isRequestingGps}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isRequestingGps ? 'Đang thử lại...' : 'Thử lại ngay'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGpsDiagnosticsModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
