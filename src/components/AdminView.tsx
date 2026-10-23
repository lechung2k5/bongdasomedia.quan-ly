'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Film,
  Package,
  MapPin,
  DollarSign,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Navigation,
  Check,
  ChevronRight,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Truck,
  Camera,
  Layers,
  Banknote,
  CheckSquare,
  Upload,
  Image as ImageIcon,
  Menu,
  Trash2,
  Edit,
  Edit3,
  Key,
  Lock,
  Wallet,
  Receipt,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import LiveMap from './LiveMap';
import LocationPickerModal from './LocationPickerModal';
import { handleAvatarError, resolveAvatarUrl, resolveMediaUrl, handleMediaError } from '@/lib/avatarHelper';
import { useRealtimeSync, notifyLocalTabs } from '@/lib/useRealtimeSync';

// Dịch các trạng thái Job sang Tiếng Việt
export const getJobStatusBadge = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: '🔴 Đang diễn ra', className: 'bg-emerald-600 text-white font-bold shadow-xs animate-pulse' };
    case 'COMPLETED':
      return { label: '✓ Đã hoàn thành', className: 'bg-slate-100 text-slate-700 font-bold border border-slate-300' };
    case 'ASSIGNED':
      return { label: '⚡ Đã phân công', className: 'bg-blue-100 text-blue-800 font-bold border border-blue-200' };
    case 'PENDING':
      return { label: '⏳ Chờ thực hiện', className: 'bg-amber-100 text-amber-800 font-bold border border-amber-200' };
    case 'CANCELLED':
      return { label: '✕ Đã hủy', className: 'bg-rose-100 text-rose-800 font-bold border border-rose-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 font-bold' };
  }
};

// Dịch vai trò tác nghiệp sang Tiếng Việt
export const getDutyLabel = (duty: string) => {
  switch (duty) {
    case 'VMIX_OPERATOR':
      return 'Kỹ thuật vMix';
    case 'CAMERAMAN':
      return 'Quay phim (Cam)';
    case 'CASTER':
      return 'Bình luận viên (BLV)';
    case 'PHOTOGRAPHER':
      return 'Nhiếp ảnh gia';
    case 'SUPPORT':
      return 'Hỗ trợ kỹ thuật';
    default:
      return duty;
  }
};

// Định mức lương mặc định theo từng vai trò (có thể tùy chỉnh tự do lúc điều phối)
// - Bình luận viên (BLV): 300.000đ / trận
// - Quay phim (Cam): 200.000đ / trận
// - Chụp hình (Photographer): 400.000đ / trận
// - Kỹ thuật vMix: 300.000đ / trận
// - Hỗ trợ kỹ thuật: 200.000đ / trận
export const getDefaultStaffPayout = (duty: string, matchCount: number = 1): number => {
  const matches = Math.max(1, Number(matchCount) || 1);
  switch (duty) {
    case 'CASTER':
      return 300000 * matches;
    case 'CAMERAMAN':
      return 200000 * matches;
    case 'PHOTOGRAPHER':
      return 400000 * matches;
    case 'VMIX_OPERATOR':
      return 300000 * matches;
    case 'SUPPORT':
      return 200000 * matches;
    default:
      return 200000 * matches;
  }
};

// Dịch phân quyền User sang Tiếng Việt
export const getUserRoleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return { label: 'Quản trị viên', className: 'bg-purple-100 text-purple-700 border border-purple-200 font-bold' };
    case 'STAFF':
      return { label: 'Nhân viên chính thức', className: 'bg-blue-100 text-blue-700 border border-blue-200 font-bold' };
    case 'FREELANCER':
      return { label: 'Cộng tác viên (CTV)', className: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold' };
    default:
      return { label: role, className: 'bg-slate-100 text-slate-700 font-bold' };
  }
};

// Dịch trạng thái hiện trường của User sang Tiếng Việt
export const getUserOperationalStatus = (status: string) => {
  switch (status) {
    case 'MOVING':
      return { label: '🛵 Đang di chuyển', className: 'text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200' };
    case 'WORKING':
      return { label: '🎥 Đang tác nghiệp', className: 'text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200' };
    case 'IDLE':
    default:
      return { label: '☕ Sẵn sàng / Rảnh', className: 'text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200' };
  }
};

interface AdminViewProps {
  currentUser: any;
  onRefreshData?: () => void;
}

// 1. Danh sách các loại lịch / gói tác nghiệp phổ biến để chọn nhanh
const SCHEDULE_PRESETS = [
  { id: 'giao_huu_7', name: 'Giao hữu sân 7', defaultPrice: 900000, jobType: 'LIVESTREAM', icon: '⚽' },
  { id: 'giao_huu_5', name: 'Giao hữu sân 5', defaultPrice: 900000, jobType: 'LIVESTREAM', icon: '⚽' },
  { id: 'giai_7', name: 'Giải sân 7', defaultPrice: 750000, jobType: 'LIVESTREAM', icon: '🏆' },
  { id: 'giai_5', name: 'Giải sân 5', defaultPrice: 650000, jobType: 'LIVESTREAM', icon: '🏆' },
  { id: 'giai_futsal', name: 'Giải futsal', defaultPrice: 650000, jobType: 'LIVESTREAM', icon: '⚡' },
  { id: 'giai_11', name: 'Giải sân 11', defaultPrice: 800000, jobType: 'LIVESTREAM', icon: '🏟️' },
  { id: 'giao_huu_11', name: 'Giao hữu sân 11', defaultPrice: 1000000, jobType: 'LIVESTREAM', icon: '⚽' },
  { id: 'su_kien_ngoai_troi', name: 'Sự kiện ngoài trời', defaultPrice: 1500000, jobType: 'LIVESTREAM', icon: '🎪' },
  { id: 'su_kien_trong_nha', name: 'Sự kiện trong nhà', defaultPrice: 1200000, jobType: 'LIVESTREAM', icon: '🏛️' },
  { id: 'design', name: 'Design (Thiết kế)', defaultPrice: 0, isInternal: true, jobType: 'PHOTOSHOOT', icon: '🎨' },
  { id: 'chinh_anh', name: 'Chỉnh ảnh', defaultPrice: 300000, jobType: 'PHOTOSHOOT', icon: '📸' },
  { id: 'edit_video', name: 'Edit video', defaultPrice: 500000, jobType: 'LIVESTREAM', icon: '🎬' },
  { id: 'edit_highlight', name: 'Edit highlight', defaultPrice: 400000, jobType: 'LIVESTREAM', icon: '✂️' },
  { id: 'custom', name: 'Công việc tự nhập...', defaultPrice: 0, jobType: 'LIVESTREAM', icon: '✏️' },
];

export default function AdminView({ currentUser, onRefreshData }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'calendar' | 'jobs' | 'inventory' | 'map' | 'finance' | 'users'
  >('dashboard');

  const [jobs, setJobs] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mobile drawer state
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Modals
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [selectedJobDetail, setSelectedJobDetail] = useState<any | null>(null);

  // Reset Password for staff modal state
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<any | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isSubmittingResetPass, setIsSubmittingResetPass] = useState(false);
  const [resetPassError, setResetPassError] = useState('');

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Create Job Form State với đầy đủ các mục chọn nhanh theo yêu cầu
  const [jobForm, setJobForm] = useState({
    title: '',
    match_type: 'Giao hữu sân 7',
    custom_match_type: '',
    match_count: 1,
    pitch_count: 1,
    camera_count: 1,
    has_photo: false,
    live_price: '900000', // Đơn giá livestream mặc định nhưng sửa được
    photo_fee: '350000', // Phụ thu chụp hình mặc định 350k nhưng sửa được
    location_id: 1 as number | string,
    location_address: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    is_new_location: false,
    new_location_name: '',
    date: todayStr,
    start_time_val: '18:00',
    duration_hours: 1.5,
    price: '900000',
    is_price_custom: false, // Đánh dấu nếu admin tự nhập giá tay
    is_deposited: false,
    deposit_amount: '300000',
    job_type: 'LIVESTREAM',
    notes: '',
    equipment_photo_url: '',
    staff: [] as {
      user_id: number | null;
      is_external?: boolean;
      external_name?: string;
      external_duty?: string;
      duty: string;
      payout_amount: number;
    }[],
    equipment_assignments: [] as {
      equipment_id: number;
      transport_by_user_id: number;
      handover_notes?: string;
    }[],
  });

  // Edit Job Form State
  const [editJobForm, setEditJobForm] = useState<any>({
    title: '',
    match_type: 'Giao hữu sân 7',
    match_count: 1,
    pitch_count: 1,
    camera_count: 1,
    has_photo: false,
    live_price: '900000',
    photo_fee: '350000',
    location_id: 1,
    location_address: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    date: todayStr,
    start_time_val: '18:00',
    duration_hours: 1.5,
    price: '900000',
    is_deposited: false,
    deposit_amount: '0',
    status: 'PENDING',
    notes: '',
    equipment_photo_url: '',
    staff: [] as any[],
    equipment_assignments: [] as any[],
  });

  // Equipment Conflict Warning Modal State
  const [equipConflictWarning, setEquipConflictWarning] = useState<{
    equip: any;
    reason: string;
    onConfirm: () => void;
  } | null>(null);

  // Location Picker Modal State
  const [locationPickerConfig, setLocationPickerConfig] = useState<{
    isOpen: boolean;
    venueName: string;
    initialAddress: string;
    initialLat: number | null;
    initialLng: number | null;
    onConfirm: (data: { address: string; latitude: number | null; longitude: number | null }) => void;
  } | null>(null);
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [savedLocSuccessId, setSavedLocSuccessId] = useState<number | string | null>(null);

  // Lưu vị trí sân bóng trực tiếp vào DB
  const handleSaveLocationToDB = async (locId: number, address: string, lat: number | null, lng: number | null) => {
    if (!locId) return;
    setIsSavingLoc(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: locId,
          address: address ? address.trim() : null,
          latitude: lat,
          longitude: lng,
        }),
      });
      if (res.ok) {
        const updatedLoc = await res.json();
        setLocations((prev) => prev.map((l) => (l.id === updatedLoc.id ? updatedLoc : l)));
        setSavedLocSuccessId(locId);
        setTimeout(() => setSavedLocSuccessId(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi lưu vị trí sân');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối khi lưu vị trí sân');
    } finally {
      setIsSavingLoc(false);
    }
  };

  // Camera Live Capture Modal State
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    onCapture: (file: File) => void;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Edit Equipment Form State
  const [editEquipForm, setEditEquipForm] = useState({
    id: 0,
    name: '',
    category_id: 1,
    qr_code: '',
    status: 'AVAILABLE',
    image_url: '',
    current_location: 'Kho văn phòng',
  });

  // Conflict Checking State
  const [conflictResult, setConflictResult] = useState<{
    hasConflict: boolean;
    conflicts: any[];
  }>({ hasConflict: false, conflicts: [] });
  const [checkingConflict, setCheckingConflict] = useState(false);

  // New Equipment Form State
  const [equipForm, setEquipForm] = useState({
    name: '',
    category_id: 1,
    qr_code: '',
    current_location: 'Kho văn phòng',
  });

  // AWS S3 Upload States
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [equipUploadFile, setEquipUploadFile] = useState<File | null>(null);
  const [equipUploadPreview, setEquipUploadPreview] = useState<string | null>(null);
  const [isEquipUploading, setIsEquipUploading] = useState(false);

  // Batch Equipment Assignment States (Gán cùng lúc)
  const [batchCarrierId, setBatchCarrierId] = useState<number | ''>('');
  const [batchSelectedEquipIds, setBatchSelectedEquipIds] = useState<number[]>([]);
  const [editBatchCarrierId, setEditBatchCarrierId] = useState<number | ''>('');
  const [editBatchSelectedEquipIds, setEditBatchSelectedEquipIds] = useState<number[]>([]);

  // Edit Equipment Photo Upload States
  const [editEquipFile, setEditEquipFile] = useState<File | null>(null);
  const [editEquipPreview, setEditEquipPreview] = useState<string | null>(null);
  const [isEditEquipUploading, setIsEditEquipUploading] = useState(false);

  // Zoom preview modal for check-in / check-out photos
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // User CRUD states (Create, Read, Update, Delete - No password)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    role: 'STAFF',
    address_district: 'Gò Vấp',
    skills: 'Kỹ thuật viên, Quay phim',
    avatar_url: '',
    status: 'ACTIVE',
    operational_status: 'IDLE',
  });
  const [userAvatarFile, setUserAvatarFile] = useState<File | null>(null);
  const [userAvatarPreview, setUserAvatarPreview] = useState<string | null>(null);
  const [isUserSaving, setIsUserSaving] = useState(false);

  const [editUserForm, setEditUserForm] = useState({
    id: 0,
    name: '',
    phone: '',
    role: 'STAFF',
    address_district: 'Gò Vấp',
    skills: '',
    avatar_url: '',
    status: 'ACTIVE',
    operational_status: 'IDLE',
  });
  const [editUserAvatarFile, setEditUserAvatarFile] = useState<File | null>(null);
  const [editUserAvatarPreview, setEditUserAvatarPreview] = useState<string | null>(null);
  const [isEditUserSaving, setIsEditUserSaving] = useState(false);

  // Financial & Staff Payroll states
  const [staffPayrollData, setStaffPayrollData] = useState<any>(null);
  const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'client_payments' | 'staff_payroll' | 'expenses'>('overview');
  const [selectedPayrollStaff, setSelectedPayrollStaff] = useState<any | null>(null);

  // Modal: Thu tiền khách / Xác nhận thanh toán trận đấu
  const [paymentModalJob, setPaymentModalJob] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_status: 'PAID',
    paid_amount: '',
    payment_notes: '',
  });
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal: Chi trả lương nhân sự (Payout)
  const [payoutModalStaff, setPayoutModalStaff] = useState<any | null>(null);
  const [selectedPayoutAssignmentIds, setSelectedPayoutAssignmentIds] = useState<number[]>([]);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [payoutProofPreview, setPayoutProofPreview] = useState<string | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Modal: Thêm giao dịch thu chi / Mua sắm vật tư thiết bị ("mua này mua kia")
  const [txForm, setTxForm] = useState({
    type: 'EXPENSE',
    category: 'EQUIPMENT_PURCHASE',
    amount: '',
    notes: '',
    job_id: '',
    payment_method: 'BANK_TRANSFER',
  });
  const [txReceiptFile, setTxReceiptFile] = useState<File | null>(null);
  const [txReceiptPreview, setTxReceiptPreview] = useState<string | null>(null);
  const [isTxSaving, setIsTxSaving] = useState(false);

  // Inventory filters
  const [invCategoryFilter, setInvCategoryFilter] = useState('ALL');
  const [invStatusFilter, setInvStatusFilter] = useState('ALL');
  const [invSearchQuery, setInvSearchQuery] = useState('');

  // Job filters (All Jobs vs My Assigned Jobs as Admin)
  const [jobFilterMode, setJobFilterMode] = useState<'ALL' | 'MY_JOBS'>('ALL');
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');

  // Fetch all core datasets
  const fetchAllData = async () => {
    try {
      const safeParseJson = async (res: Response) => {
        try {
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      };

      const [jobsRes, equipRes, usersRes, financeRes, locsRes, payrollRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/inventory'),
        fetch('/api/users'),
        fetch('/api/finance'),
        fetch('/api/locations'),
        fetch('/api/finance/payouts'),
      ]);

      const jobsData = await safeParseJson(jobsRes);
      if (jobsData) setJobs(jobsData);

      const invData = await safeParseJson(equipRes);
      if (invData) {
        setEquipments(invData.equipments || []);
        setEquipmentCategories(invData.categories || []);
      }

      const usersData = await safeParseJson(usersRes);
      if (usersData && Array.isArray(usersData)) setUsers(usersData);

      const finData = await safeParseJson(financeRes);
      if (finData) setFinanceData(finData);

      const payrollData = await safeParseJson(payrollRes);
      if (payrollData) setStaffPayrollData(payrollData);

      const locs = await safeParseJson(locsRes);
      if (locs && Array.isArray(locs)) {
        setLocations(locs);
        if (locs.length > 0) {
          setJobForm((prev) => {
            const curId = prev.location_id || locs[0].id;
            const targetLoc = locs.find((l: any) => l.id === Number(curId)) || locs[0];
            return {
              ...prev,
              location_id: targetLoc.id,
              location_address: prev.location_address || targetLoc.address || '',
              location_lat: prev.location_lat !== null ? prev.location_lat : (targetLoc.latitude || null),
              location_lng: prev.location_lng !== null ? prev.location_lng : (targetLoc.longitude || null),
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Cảnh báo nguy cơ nhân sự đi muộn (30 phút trước giờ bóng lăn)
  const [lateWarnings, setLateWarnings] = useState<any[]>([]);

  const fetchLateWarnings = async () => {
    try {
      const res = await fetch('/api/jobs/punctuality-check');
      if (res.ok) {
        const data = await res.json();
        setLateWarnings(data.warnings || []);
      }
    } catch (e) {
      console.warn('Failed to fetch late warnings:', e);
    }
  };

  // Real-time synchronization across all tabs and devices
  useRealtimeSync(fetchAllData);

  useEffect(() => {
    fetchAllData();
    fetchLateWarnings();
    const punctTimer = setInterval(fetchLateWarnings, 30000);
    return () => clearInterval(punctTimer);
  }, []);

  // Poll for live GPS map every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(console.error);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Tính toán thời gian bắt đầu và kết thúc (start_time, end_time)
  const computeStartEndTimes = () => {
    try {
      const [sh, sm] = (jobForm.start_time_val || '18:00').split(':').map(Number);
      const start = new Date(`${jobForm.date || todayStr}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00`);
      const durationMs = (Number(jobForm.duration_hours) || 1.5) * 60 * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);
      return { start, end };
    } catch (e) {
      const now = new Date();
      return { start: now, end: new Date(now.getTime() + 5400000) };
    }
  };

  // Tự động tính toán "Tiền phải thu" và gợi ý Tiêu đề khi loại lịch / số trận / số sân / chụp ảnh thay đổi
  const handleAutoPriceCalculation = (overrides: Partial<typeof jobForm> = {}) => {
    const updated = { ...jobForm, ...overrides };
    const preset = SCHEDULE_PRESETS.find((p) => p.name === updated.match_type);

    // Xử lý riêng gói Design (Thiết kế): Công việc nội bộ, 0đ thu khách, chỉ tính tiền công nhân viên
    if (updated.match_type === 'Design (Thiết kế)') {
      setJobForm((prev) => ({
        ...prev,
        ...overrides,
        match_type: 'Design (Thiết kế)',
        live_price: '0',
        photo_fee: '0',
        has_photo: false,
        price: '0',
        is_deposited: false,
        deposit_amount: '0',
        job_type: 'PHOTOSHOOT',
        title: prev.title === '' || prev.title.includes('-') || prev.title.includes('Design')
          ? 'Thiết kế Đồ họa (Design) - Phân bổ lịch nội bộ'
          : prev.title,
      }));
      return;
    }

    let livePriceVal = updated.live_price;
    // Nếu chuyển preset mà người dùng chưa gõ tay giá live ở lần này, lấy giá preset
    if (overrides.match_type && overrides.live_price === undefined) {
      livePriceVal = preset ? preset.defaultPrice.toString() : '0';
    }

    const unitPrice = parseFloat(livePriceVal) || 0;
    // Tiền gốc live = đơn giá live * số trận * số sân
    const baseAmount = unitPrice * (Number(updated.match_count) || 1) * (Number(updated.pitch_count) || 1);
    // Tiền chụp ảnh phụ thu (mặc định 350k nhưng sửa được)
    const photoAddon = updated.has_photo ? parseFloat(updated.photo_fee) || 350000 : 0;
    const computedTotal = baseAmount + photoAddon;

    let locName = 'Sân bóng';
    let locAddressOverride: { location_address?: string; location_lat?: number | null; location_lng?: number | null } = {};
    if (updated.is_new_location && updated.new_location_name) {
      locName = updated.new_location_name;
    } else {
      const found = locations.find((l) => l.id === Number(updated.location_id));
      if (found) {
        locName = found.name;
        if (overrides.location_id !== undefined && !updated.is_new_location) {
          locAddressOverride = {
            location_address: found.address || '',
            location_lat: found.latitude ?? null,
            location_lng: found.longitude ?? null,
          };
        }
      }
    }

    const typeLabel = updated.match_type === 'Công việc tự nhập...' ? updated.custom_match_type || 'Tác nghiệp' : updated.match_type;
    const autoTitle = `${typeLabel} (${updated.match_count} trận, ${updated.pitch_count} sân) - ${locName}`;

    setJobForm((prev) => {
      const oldCount = Number(prev.match_count) || 1;
      const newCount = Number(updated.match_count) || 1;
      let newStaff = prev.staff;
      if (overrides.match_count !== undefined && oldCount !== newCount) {
        newStaff = prev.staff.map((s) => {
          const oldDefault = getDefaultStaffPayout(s.duty, oldCount);
          if (s.payout_amount === oldDefault || !s.payout_amount) {
            return { ...s, payout_amount: getDefaultStaffPayout(s.duty, newCount) };
          }
          return s;
        });
      }
      return {
        ...prev,
        ...overrides,
        ...locAddressOverride,
        live_price: livePriceVal,
        staff: newStaff,
        title: prev.title === '' || prev.title.includes('-') ? autoTitle : prev.title,
        price: overrides.price !== undefined ? overrides.price : (prev.is_price_custom ? prev.price : computedTotal.toString()),
        job_type: preset?.jobType || (updated.has_photo ? 'BOTH' : 'LIVESTREAM'),
      };
    });
  };

  // Trigger Conflict Check algorithm whenever dates or participants change
  useEffect(() => {
    const { start, end } = computeStartEndTimes();

    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const userIds = jobForm.staff.filter((s) => !s.is_external && s.user_id).map((s) => s.user_id as number);
        const equipmentIds = jobForm.equipment_assignments.map((ea) => ea.equipment_id);

        const res = await fetch('/api/jobs/conflict-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            userIds,
            equipmentIds,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setConflictResult(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingConflict(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [jobForm.date, jobForm.start_time_val, jobForm.duration_hours, jobForm.staff, jobForm.equipment_assignments]);

  // Check if equipment is currently in use or assigned to an active overlapping job
  const checkEquipmentBusy = (equipId: number) => {
    const eq = equipments.find((e) => e.id === equipId);
    if (!eq) return null;

    if (eq.status === 'IN_USE') {
      return `Thiết bị đang được sử dụng (IN_USE) bởi nhân sự khác`;
    }
    if (eq.status === 'MAINTENANCE') {
      return `Thiết bị hiện đang trong trạng thái bảo trì (MAINTENANCE)`;
    }
    if (eq.status === 'BROKEN') {
      return `Thiết bị hiện bị báo hỏng (BROKEN)`;
    }

    const otherJob = jobs.find(
      (j) =>
        j.status !== 'COMPLETED' &&
        j.status !== 'CANCELLED' &&
        (j.equipmentAssignments || []).some((ea: any) => ea.equipment_id === equipId)
    );
    if (otherJob) {
      return `Thiết bị đã được phân công cho ca "${otherJob.title}" (${new Date(otherJob.start_time).toLocaleTimeString('vi-VN')} - ${otherJob.location?.name})`;
    }

    return null;
  };

  // Camera Live Viewfinder Effect
  useEffect(() => {
    setCameraError(null);
    if (!cameraModalConfig?.isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Camera access issue:', err);
          setCameraError('Không thể mở camera tự động (vui lòng cấp quyền camera trình duyệt hoặc bấm nút chụp bên dưới).');
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraModalConfig?.isOpen]);

  const handleSnapCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        if (cameraModalConfig?.onCapture) {
          cameraModalConfig.onCapture(file);
        }
        setCameraModalConfig(null);
      },
      'image/jpeg',
      0.85
    );
  };

  // Handle Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { start, end } = computeStartEndTimes();

      const payload = {
        title: jobForm.title,
        location_id: jobForm.is_new_location ? null : Number(jobForm.location_id),
        new_location_name: jobForm.is_new_location ? jobForm.new_location_name : null,
        location_address: jobForm.location_address || null,
        location_lat: jobForm.location_lat ?? null,
        location_lng: jobForm.location_lng ?? null,
        job_type: jobForm.has_photo ? 'BOTH' : jobForm.job_type,
        match_type: jobForm.match_type === 'Công việc tự nhập...' ? jobForm.custom_match_type : jobForm.match_type,
        match_count: Number(jobForm.match_count) || 1,
        pitch_count: Number(jobForm.pitch_count) || 1,
        camera_count: Number(jobForm.camera_count) || 1,
        has_photo: jobForm.has_photo,
        live_price: parseFloat(jobForm.live_price) || 0,
        photo_fee: parseFloat(jobForm.photo_fee) || 0,
        duration_hours: Number(jobForm.duration_hours) || 1.5,
        is_deposited: jobForm.is_deposited,
        deposit_amount: jobForm.is_deposited ? parseFloat(jobForm.deposit_amount) || 0 : 0,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        price: parseFloat(jobForm.price) || 0,
        notes: jobForm.notes,
        equipment_photo_url: jobForm.equipment_photo_url || null,
        staff: jobForm.staff.map((s) => ({
          user_id: s.is_external ? null : s.user_id,
          external_name: s.is_external ? s.external_name : null,
          external_duty: s.is_external ? s.external_duty : null,
          duty: s.duty,
          payout_amount: parseFloat(s.payout_amount as any) || 0,
        })),
        equipment_assignments: jobForm.equipment_assignments,
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateJobModal(false);
        fetchAllData();
        notifyLocalTabs();
        // Reset form
        setJobForm({
          title: '',
          match_type: 'Giao hữu sân 7',
          custom_match_type: '',
          match_count: 1,
          pitch_count: 1,
          camera_count: 1,
          has_photo: false,
          live_price: '900000',
          photo_fee: '350000',
          location_id: locations[0]?.id || 1,
          location_address: locations[0]?.address || '',
          location_lat: locations[0]?.latitude || null,
          location_lng: locations[0]?.longitude || null,
          is_new_location: false,
          new_location_name: '',
          date: todayStr,
          start_time_val: '18:00',
          duration_hours: 1.5,
          price: '900000',
          is_price_custom: false,
          is_deposited: false,
          deposit_amount: '300000',
          job_type: 'LIVESTREAM',
          notes: '',
          equipment_photo_url: '',
          staff: [],
          equipment_assignments: [],
        });
      } else {
        const err = await res.json();
        alert(err.error || 'Có lỗi xảy ra khi tạo Job');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Job
  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch thi đấu này không? Toàn bộ phân công và dữ liệu trận đấu sẽ bị xóa.')) {
      return;
    }
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedJobDetail?.id === jobId) setSelectedJobDetail(null);
        if (editingJob?.id === jobId) setShowEditJobModal(false);
        fetchAllData();
        notifyLocalTabs();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa Job');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Open Edit Job Modal
  const handleOpenEditJob = (job: any) => {
    setEditingJob(job);
    const startDate = new Date(job.start_time);
    const endDate = new Date(job.end_time);
    const dateStr = startDate.toISOString().split('T')[0];
    const startTimeVal = startDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const durationHrs = Math.max(
      0.5,
      Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 10) / 10
    );

    const curLoc = locations.find((l: any) => l.id === (job.location_id || job.location?.id));

    setEditJobForm({
      title: job.title || '',
      match_type: job.match_type || 'Giao hữu sân 7',
      match_count: job.match_count || 1,
      pitch_count: job.pitch_count || 1,
      camera_count: job.camera_count || 1,
      has_photo: Boolean(job.has_photo),
      live_price: (job.live_price || (job.price ? (job.has_photo ? job.price - (job.photo_fee || 350000) : job.price) : 900000)).toString(),
      photo_fee: (job.photo_fee || 350000).toString(),
      location_id: job.location_id || locations[0]?.id || 1,
      location_address: job.location?.address || curLoc?.address || '',
      location_lat: job.location?.latitude ?? curLoc?.latitude ?? null,
      location_lng: job.location?.longitude ?? curLoc?.longitude ?? null,
      date: dateStr,
      start_time_val: startTimeVal,
      duration_hours: durationHrs,
      price: (job.price || 0).toString(),
      is_deposited: Boolean(job.is_deposited),
      deposit_amount: (job.deposit_amount || 0).toString(),
      status: job.status || 'PENDING',
      notes: job.notes || (job.equipmentAssignments || []).find((ea: any) => ea.handover_notes)?.handover_notes || '',
      equipment_photo_url: job.equipment_photo_url || '',
      staff: (job.staff || []).map((s: any) => ({
        user_id: s.user_id,
        is_external: !s.user_id || Boolean(s.external_name),
        external_name: s.external_name || '',
        external_duty: s.external_duty || '',
        duty: s.duty || 'CAMERAMAN',
        payout_amount: s.payout_amount || 0,
      })),
      equipment_assignments: (job.equipmentAssignments || []).map((ea: any) => ({
        equipment_id: ea.equipment_id,
        transport_by_user_id: ea.transport_by_user_id,
        handover_notes: ea.handover_notes || '',
      })),
    });
    setShowEditJobModal(true);
  };

  // Handle Update Job Submit
  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      const [sh, sm] = (editJobForm.start_time_val || '18:00').split(':').map(Number);
      const start = new Date(`${editJobForm.date}T${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}:00`);
      const durationMs = (Number(editJobForm.duration_hours) || 1.5) * 60 * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);

      const payload = {
        title: editJobForm.title,
        location_id: Number(editJobForm.location_id),
        location_address: editJobForm.location_address || null,
        location_lat: editJobForm.location_lat ?? null,
        location_lng: editJobForm.location_lng ?? null,
        job_type: editJobForm.has_photo ? 'BOTH' : 'LIVESTREAM',
        match_type: editJobForm.match_type,
        match_count: Number(editJobForm.match_count) || 1,
        pitch_count: Number(editJobForm.pitch_count) || 1,
        camera_count: Number(editJobForm.camera_count) || 1,
        has_photo: editJobForm.has_photo,
        live_price: parseFloat(editJobForm.live_price) || 0,
        photo_fee: parseFloat(editJobForm.photo_fee) || 0,
        duration_hours: Number(editJobForm.duration_hours) || 1.5,
        is_deposited: editJobForm.is_deposited,
        deposit_amount: editJobForm.is_deposited ? parseFloat(editJobForm.deposit_amount) || 0 : 0,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        price: parseFloat(editJobForm.price) || 0,
        status: editJobForm.status,
        notes: editJobForm.notes,
        equipment_photo_url: editJobForm.equipment_photo_url || null,
        staff: editJobForm.staff.map((s: any) => ({
          user_id: s.is_external ? null : s.user_id,
          external_name: s.is_external ? s.external_name : null,
          external_duty: s.is_external ? s.external_duty : null,
          duty: s.duty,
          payout_amount: parseFloat(s.payout_amount) || 0,
        })),
        equipment_assignments: editJobForm.equipment_assignments.map((ea: any) => ({
          equipment_id: Number(ea.equipment_id),
          transport_by_user_id: Number(ea.transport_by_user_id),
          handover_notes: ea.handover_notes || null,
        })),
      };

      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEditJobModal(false);
        setEditingJob(null);
        fetchAllData();
        notifyLocalTabs();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật Job');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Equipment
  const handleDeleteEquipment = async (equipId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này khỏi kho không?')) return;
    try {
      const res = await fetch(`/api/inventory?id=${equipId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa thiết bị');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Open Edit Equipment Modal
  const handleOpenEditEquipment = (eq: any) => {
    setEditingEquipment(eq);
    setEditEquipForm({
      id: eq.id,
      name: eq.name || '',
      category_id: eq.category_id || 1,
      qr_code: eq.qr_code || '',
      status: eq.status || 'AVAILABLE',
      image_url: eq.image_url || '',
      current_location: eq.current_location || 'Kho văn phòng',
    });
    setEditEquipFile(null);
    setEditEquipPreview(null);
    setShowEditEquipmentModal(true);
  };

  // Handle Update Equipment (with AWS S3 Upload)
  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditEquipUploading(true);
    try {
      let finalImageUrl = editEquipForm.image_url;

      // Upload to AWS S3 if a new image file is chosen
      if (editEquipFile) {
        const formData = new FormData();
        formData.append('file', editEquipFile);
        formData.append('targetType', 'equipment');
        formData.append('targetId', editEquipForm.id.toString());

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalImageUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh lên máy chủ');
          setIsEditEquipUploading(false);
          return;
        }
      }

      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editEquipForm,
          image_url: finalImageUrl,
        }),
      });

      if (res.ok) {
        setShowEditEquipmentModal(false);
        setEditingEquipment(null);
        setEditEquipFile(null);
        setEditEquipPreview(null);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật thiết bị');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Không thể kết nối cập nhật thiết bị');
    } finally {
      setIsEditEquipUploading(false);
    }
  };

  // Helper chọn nhanh Combo thiết bị (1-Click Kits)
  const handleSelectEquipCombo = (
    comboType: 'live_1cam' | 'live_2cam' | 'photoshoot' | 'all_available' | 'clear',
    isEditModal = false
  ) => {
    if (comboType === 'clear') {
      if (isEditModal) setEditBatchSelectedEquipIds([]);
      else setBatchSelectedEquipIds([]);
      return;
    }

    if (comboType === 'all_available') {
      const availIds = equipments.filter((e) => e.status === 'AVAILABLE').map((e) => e.id);
      if (isEditModal) setEditBatchSelectedEquipIds(availIds);
      else setBatchSelectedEquipIds(availIds);
      return;
    }

    const selected: number[] = [];

    const findByCategory = (catNameKeywords: string[], count = 1) => {
      const matches = equipments.filter((eq) => {
        const catName = eq.category?.name?.toLowerCase() || '';
        return catNameKeywords.some((k) => catName.includes(k.toLowerCase()));
      });
      matches.slice(0, count).forEach((m) => {
        if (!selected.includes(m.id)) selected.push(m.id);
      });
    };

    if (comboType === 'live_1cam') {
      findByCategory(['pc', 'laptop'], 1);
      findByCategory(['máy quay', 'cam'], 1);
      findByCategory(['chân'], 1);
      findByCategory(['loa'], 1);
      findByCategory(['dây'], 1);
    } else if (comboType === 'live_2cam') {
      findByCategory(['pc', 'laptop'], 1);
      findByCategory(['máy quay', 'cam'], 2);
      findByCategory(['chân'], 2);
      findByCategory(['loa'], 1);
      findByCategory(['dây'], 2);
    } else if (comboType === 'photoshoot') {
      findByCategory(['máy quay', 'cam', 'ảnh'], 1);
      findByCategory(['chân'], 1);
      findByCategory(['dây'], 1);
    }

    if (isEditModal) setEditBatchSelectedEquipIds(selected);
    else setBatchSelectedEquipIds(selected);
  };

  // Áp dụng gán hàng loạt thiết bị đã chọn cùng lúc
  const handleApplyBatchEquipments = (isEditModal = false) => {
    const selectedIds = isEditModal ? editBatchSelectedEquipIds : batchSelectedEquipIds;
    if (selectedIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 thiết bị trong danh sách!');
      return;
    }

    const defaultCarrier = users[0]?.id;
    const carrierId = isEditModal
      ? (editBatchCarrierId || editJobForm.staff[0]?.user_id || currentUser?.id || defaultCarrier)
      : (batchCarrierId || jobForm.staff[0]?.user_id || currentUser?.id || defaultCarrier);

    if (!carrierId) {
      alert('Vui lòng chọn nhân sự chở thiết bị!');
      return;
    }

    if (isEditModal) {
      const currentList = [...editJobForm.equipment_assignments];
      selectedIds.forEach((eqId) => {
        if (!currentList.some((ea) => ea.equipment_id === eqId)) {
          currentList.push({
            equipment_id: eqId,
            transport_by_user_id: Number(carrierId),
            handover_notes: '',
          });
        }
      });
      setEditJobForm({ ...editJobForm, equipment_assignments: currentList });
      setEditBatchSelectedEquipIds([]);
    } else {
      const currentList = [...jobForm.equipment_assignments];
      selectedIds.forEach((eqId) => {
        if (!currentList.some((ea) => ea.equipment_id === eqId)) {
          currentList.push({
            equipment_id: eqId,
            transport_by_user_id: Number(carrierId),
            handover_notes: '',
          });
        }
      });
      setJobForm({ ...jobForm, equipment_assignments: currentList });
      setBatchSelectedEquipIds([]);
    }
  };

  // Toggle selection for batch equipment with in-use/assigned confirmation check
  const handleToggleBatchEquipWithCheck = (eqId: number, isEditModal = false) => {
    const isCurrentlySelected = isEditModal
      ? editBatchSelectedEquipIds.includes(eqId)
      : batchSelectedEquipIds.includes(eqId);

    // If unselecting, just remove
    if (isCurrentlySelected) {
      if (isEditModal) {
        setEditBatchSelectedEquipIds(editBatchSelectedEquipIds.filter((id) => id !== eqId));
      } else {
        setBatchSelectedEquipIds(batchSelectedEquipIds.filter((id) => id !== eqId));
      }
      return;
    }

    // If selecting, check busy / in-use / already assigned
    const busyReason = checkEquipmentBusy(eqId);
    const eq = equipments.find((e) => e.id === eqId);

    if (busyReason && eq) {
      setEquipConflictWarning({
        equip: eq,
        reason: busyReason,
        onConfirm: () => {
          if (isEditModal) {
            setEditBatchSelectedEquipIds([...editBatchSelectedEquipIds, eqId]);
          } else {
            setBatchSelectedEquipIds([...batchSelectedEquipIds, eqId]);
          }
          setEquipConflictWarning(null);
        },
      });
    } else {
      if (isEditModal) {
        setEditBatchSelectedEquipIds([...editBatchSelectedEquipIds, eqId]);
      } else {
        setBatchSelectedEquipIds([...batchSelectedEquipIds, eqId]);
      }
    }
  };

  const [isUploadingEquipPhoto, setIsUploadingEquipPhoto] = useState(false);
  const handleUploadJobEquipPhoto = async (file: File, isEdit = false) => {
    try {
      setIsUploadingEquipPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetType', 'job');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setEditJobForm((prev: any) => ({ ...prev, equipment_photo_url: data.url }));
        } else {
          setJobForm((prev: any) => ({ ...prev, equipment_photo_url: data.url }));
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi tải ảnh lên máy chủ');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi tải ảnh');
    } finally {
      setIsUploadingEquipPhoto(false);
    }
  };

  // Handle Update Job Status (e.g. mark COMPLETED)
  const handleUpdateJobStatus = async (jobId: number, status: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchAllData();
        if (selectedJobDetail?.id === jobId) {
          const updated = await res.json();
          setSelectedJobDetail(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper tìm vai trò phù hợp nhất theo kỹ năng của Admin/User
  const getSuggestedDutyForUser = (userObj: any) => {
    let duty = 'CAMERAMAN';
    const sk = (userObj?.skills || '').toLowerCase();
    if (sk.includes('bình luận') || sk.includes('blv')) duty = 'CASTER';
    else if (sk.includes('kỹ thuật') || sk.includes('vmix')) duty = 'VMIX_OPERATOR';
    else if (sk.includes('chụp')) duty = 'PHOTOGRAPHER';
    else if (sk.includes('quay')) duty = 'CAMERAMAN';
    return duty;
  };

  // Tự phân công Admin vào Form tạo Job
  const handleAssignSelfToJobForm = () => {
    if (!currentUser?.id) return;
    const exists = jobForm.staff.some((s) => s.user_id === currentUser.id);
    if (exists) {
      alert(`Bạn (${currentUser.name}) đã có tên trong danh sách phân công trận này rồi.`);
      return;
    }
    const duty = getSuggestedDutyForUser(currentUser);
    setJobForm((prev) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          user_id: currentUser.id,
          is_external: false,
          duty,
          payout_amount: getDefaultStaffPayout(duty, prev.match_count),
        },
      ],
    }));
  };

  // Tự phân công Admin vào Form chỉnh sửa Job
  const handleAssignSelfToEditJobForm = () => {
    if (!currentUser?.id) return;
    const exists = (editJobForm.staff || []).some((s: any) => s.user_id === currentUser.id);
    if (exists) {
      alert(`Bạn (${currentUser.name}) đã có tên trong danh sách phân công trận này rồi.`);
      return;
    }
    const duty = getSuggestedDutyForUser(currentUser);
    setEditJobForm((prev: any) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          user_id: currentUser.id,
          is_external: false,
          duty,
          payout_amount: getDefaultStaffPayout(duty, prev.match_count),
        },
      ],
    }));
  };

  // Tự phân công Admin trực tiếp từ Modal Chi tiết Job
  const handleDirectSelfAssign = async (jobId: number) => {
    if (!currentUser?.id) return;
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const existingStaff = (targetJob.staff || []).map((s: any) => ({
      user_id: s.user_id,
      external_name: s.external_name,
      external_duty: s.external_duty,
      duty: s.duty,
      payout_amount: s.payout_amount,
    }));

    if (existingStaff.some((s: any) => s.user_id === currentUser.id)) {
      alert(`Bạn (${currentUser.name}) đã có tên trong ca làm này rồi.`);
      return;
    }

    const duty = getSuggestedDutyForUser(currentUser);
    const updatedStaff = [
      ...existingStaff,
      {
        user_id: currentUser.id,
        duty,
        payout_amount: getDefaultStaffPayout(duty, targetJob.match_count || 1),
      },
    ];

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff: updatedStaff,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        fetchAllData();
        setSelectedJobDetail(updated);
        alert(`✓ Đã tự phân công bạn (${currentUser.name} - ${getDutyLabel(duty)}) vào trận đấu! Bạn có thể chuyển sang Mobile App để check-in.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi tự phân công');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct S3 Upload Handler for existing Equipment and User
  const handleDirectUpload = async (file: File, targetType: 'equipment' | 'user', targetId: number) => {
    setUploadingTarget(`${targetType}-${targetId}`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetType', targetType);
      formData.append('targetId', targetId.toString());

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi tải ảnh lên máy chủ');
      }
    } catch (err: any) {
      console.error(err);
      alert('Không thể kết nối tải ảnh lên máy chủ');
    } finally {
      setUploadingTarget(null);
    }
  };

  // Handle Add New Equipment with AWS S3 Image Upload
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEquipUploading(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (equipUploadFile) {
        const formData = new FormData();
        formData.append('file', equipUploadFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedImageUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh thiết bị');
          setIsEquipUploading(false);
          return;
        }
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...equipForm,
          image_url: uploadedImageUrl,
        }),
      });

      if (res.ok) {
        setShowAddEquipmentModal(false);
        setEquipForm({ name: '', category_id: 1, qr_code: '', current_location: 'Kho văn phòng' });
        setEquipUploadFile(null);
        setEquipUploadPreview(null);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi thêm thiết bị');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEquipUploading(false);
    }
  };

  // Mở modal thu tiền trận đấu
  const handleOpenPaymentModal = (job: any) => {
    setPaymentModalJob(job);
    setPaymentForm({
      payment_status: job.payment_status || (job.is_deposited ? 'PARTIAL' : 'PAID'),
      paid_amount: job.paid_amount ? job.paid_amount.toString() : (job.price || 0).toString(),
      payment_notes: job.payment_notes || '',
    });
    setPaymentProofFile(null);
    setPaymentProofPreview(job.payment_proof_url ? resolveMediaUrl(job.payment_proof_url) : null);
  };

  // Xác nhận thu tiền trận đấu
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalJob) return;
    setIsSubmittingPayment(true);
    try {
      let finalBillUrl = paymentModalJob.payment_proof_url;
      if (paymentProofFile) {
        const formData = new FormData();
        formData.append('file', paymentProofFile);
        formData.append('targetType', 'payment');
        formData.append('targetId', paymentModalJob.id.toString());
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          finalBillUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh bill khách');
          setIsSubmittingPayment(false);
          return;
        }
      }

      const res = await fetch(`/api/jobs/${paymentModalJob.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: paymentForm.payment_status,
          paid_amount: parseFloat(paymentForm.paid_amount) || 0,
          payment_notes: paymentForm.payment_notes,
          payment_proof_url: finalBillUrl,
        }),
      });

      if (res.ok) {
        setPaymentModalJob(null);
        setPaymentProofFile(null);
        setPaymentProofPreview(null);
        fetchAllData();
        notifyLocalTabs();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật thu tiền');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Mở modal thanh toán lương cho nhân sự
  const handleOpenPayoutModal = (staffItem: any, specificAssignmentId?: number) => {
    setPayoutModalStaff(staffItem);
    if (specificAssignmentId) {
      setSelectedPayoutAssignmentIds([specificAssignmentId]);
    } else {
      const unpaidIds = (staffItem.assignments || [])
        .filter((a: any) => a.payout_status !== 'PAID')
        .map((a: any) => a.id);
      setSelectedPayoutAssignmentIds(unpaidIds);
    }
    setPayoutNotes('');
    setPayoutProofFile(null);
    setPayoutProofPreview(null);
  };

  // Xác nhận chi trả lương nhân sự
  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalStaff || selectedPayoutAssignmentIds.length === 0) {
      alert('Vui lòng chọn ít nhất một ca làm để chi trả lương!');
      return;
    }
    setIsSubmittingPayout(true);
    try {
      let finalBillUrl = null;
      if (payoutProofFile) {
        const formData = new FormData();
        formData.append('file', payoutProofFile);
        formData.append('targetType', 'payout');
        formData.append('targetId', payoutModalStaff.user.id.toString());
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          finalBillUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh bill chuyển khoản');
          setIsSubmittingPayout(false);
          return;
        }
      }

      const res = await fetch('/api/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: selectedPayoutAssignmentIds,
          user_id: payoutModalStaff.user.id,
          payout_proof_url: finalBillUrl,
          payout_notes: payoutNotes,
        }),
      });

      if (res.ok) {
        setPayoutModalStaff(null);
        setSelectedPayoutAssignmentIds([]);
        setPayoutNotes('');
        setPayoutProofFile(null);
        setPayoutProofPreview(null);
        fetchAllData();
        notifyLocalTabs();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi chi trả lương');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Không thể kết nối máy chủ');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Handle Add Transaction (Chi phí mua sắm vật tư, trang thiết bị, nước uống...)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTxSaving(true);
    try {
      let finalReceiptUrl = null;
      if (txReceiptFile) {
        const formData = new FormData();
        formData.append('file', txReceiptFile);
        formData.append('targetType', 'receipt');
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          finalReceiptUrl = upData.url;
        }
      }

      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...txForm,
          receipt_url: finalReceiptUrl,
        }),
      });

      if (res.ok) {
        setShowAddTransactionModal(false);
        setTxForm({
          type: 'EXPENSE',
          category: 'EQUIPMENT_PURCHASE',
          amount: '',
          notes: '',
          job_id: '',
          payment_method: 'BANK_TRANSFER',
        });
        setTxReceiptFile(null);
        setTxReceiptPreview(null);
        fetchAllData();
        notifyLocalTabs();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi thêm giao dịch');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi thêm giao dịch');
    } finally {
      setIsTxSaving(false);
    }
  };

  // Handle Delete Transaction (Xóa giao dịch)
  const handleDeleteTransaction = async (txId: number, notes?: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa giao dịch này khỏi hệ thống?\n\n"${notes || 'Giao dịch #' + txId}"`)) {
      return;
    }
    try {
      const res = await fetch(`/api/finance?id=${txId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa giao dịch');
      }
    } catch (e: any) {
      console.error(e);
      alert('Không thể kết nối máy chủ');
    }
  };

  // Handle Create User (No Password required)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      alert('Vui lòng nhập họ và tên nhân viên');
      return;
    }

    setIsUserSaving(true);
    try {
      let finalAvatarUrl = userForm.avatar_url;

      // Upload avatar to S3 if a file was selected
      if (userAvatarFile) {
        const formData = new FormData();
        formData.append('file', userAvatarFile);
        formData.append('targetType', 'user');

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalAvatarUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh đại diện');
          setIsUserSaving(false);
          return;
        }
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userForm,
          avatar_url: finalAvatarUrl,
        }),
      });

      if (res.ok) {
        setShowAddUserModal(false);
        setUserForm({
          name: '',
          phone: '',
          role: 'STAFF',
          address_district: 'Gò Vấp',
          skills: 'Kỹ thuật viên, Quay phim',
          avatar_url: '',
          status: 'ACTIVE',
          operational_status: 'IDLE',
        });
        setUserAvatarFile(null);
        setUserAvatarPreview(null);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi thêm nhân viên');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi khi thêm nhân viên');
    } finally {
      setIsUserSaving(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      id: user.id,
      name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'STAFF',
      address_district: user.address_district || 'Gò Vấp',
      skills: user.skills || '',
      avatar_url: user.avatar_url || '',
      status: user.status || 'ACTIVE',
      operational_status: user.operational_status || 'IDLE',
    });
    setEditUserAvatarFile(null);
    setEditUserAvatarPreview(null);
    setShowEditUserModal(true);
  };

  // Handle Update User (No Password required)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserForm.name.trim()) {
      alert('Vui lòng nhập họ và tên nhân viên');
      return;
    }

    setIsEditUserSaving(true);
    try {
      let finalAvatarUrl = editUserForm.avatar_url;

      // Upload avatar to S3 if new file selected
      if (editUserAvatarFile) {
        const formData = new FormData();
        formData.append('file', editUserAvatarFile);
        formData.append('targetType', 'user');
        formData.append('targetId', String(editUserForm.id));

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          finalAvatarUrl = upData.url;
        } else {
          const upErr = await upRes.json();
          alert(upErr.error || 'Lỗi khi tải ảnh đại diện');
          setIsEditUserSaving(false);
          return;
        }
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editUserForm,
          avatar_url: finalAvatarUrl,
        }),
      });

      if (res.ok) {
        setShowEditUserModal(false);
        setEditingUser(null);
        setEditUserAvatarFile(null);
        setEditUserAvatarPreview(null);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cập nhật nhân viên');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi khi cập nhật nhân viên');
    } finally {
      setIsEditUserSaving(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi hệ thống?\n\nLưu ý: Mọi phân công liên quan sẽ được tự động giải phóng an toàn.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (showEditUserModal) setShowEditUserModal(false);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa nhân viên');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Lỗi khi xóa nhân viên');
    }
  };

  // Xử lý Admin đặt lại mật khẩu cho nhân viên
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalUser || !newPasswordVal.trim()) return;
    if (newPasswordVal.trim().length < 4) {
      setResetPassError('Mật khẩu mới phải từ 4 ký tự trở lên');
      return;
    }
    setIsSubmittingResetPass(true);
    setResetPassError('');
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordModalUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordVal.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✓ ${data.message}`);
        setResetPasswordModalUser(null);
        setNewPasswordVal('');
      } else {
        setResetPassError(data.error || 'Lỗi khi đổi mật khẩu');
      }
    } catch (err: any) {
      setResetPassError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmittingResetPass(false);
    }
  };

  // Selected Location object in Form
  const selectedLocation = locations.find((l) => l.id === Number(jobForm.location_id));

  // Helper to check if staff lives near the chosen stadium
  const isStaffNearLocation = (staffDistrict?: string | null) => {
    if (!staffDistrict) return false;
    const locName = jobForm.is_new_location
      ? jobForm.new_location_name.toLowerCase()
      : (selectedLocation?.name + ' ' + (selectedLocation?.address || '')).toLowerCase();
    const sDist = staffDistrict.toLowerCase();
    return locName.includes(sDist);
  };

  // Filtered equipments
  const filteredEquipments = equipments.filter((eq) => {
    if (invCategoryFilter !== 'ALL' && eq.category?.id !== Number(invCategoryFilter) && eq.category?.name !== invCategoryFilter) {
      return false;
    }
    if (invStatusFilter !== 'ALL' && eq.status !== invStatusFilter) return false;
    if (invSearchQuery && !eq.name.toLowerCase().includes(invSearchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Đếm số trận mà Admin (currentUser) được phân công tham gia
  const myAssignedJobsCount = jobs.filter((j) =>
    (j.staff || []).some((s: any) => s.user_id === currentUser?.id) ||
    (j.equipmentAssignments || []).some((ea: any) => ea.transport_by_user_id === currentUser?.id)
  ).length;

  // Danh sách Jobs sau khi lọc
  const filteredJobs = jobs.filter((job) => {
    if (jobFilterMode === 'MY_JOBS') {
      const isMyJob =
        (job.staff || []).some((s: any) => s.user_id === currentUser?.id) ||
        (job.equipmentAssignments || []).some((ea: any) => ea.transport_by_user_id === currentUser?.id);
      if (!isMyJob) return false;
    }
    if (jobStatusFilter !== 'ALL' && job.status !== jobStatusFilter) {
      return false;
    }
    if (jobSearchQuery) {
      const q = jobSearchQuery.toLowerCase();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchLoc = job.location?.name?.toLowerCase().includes(q);
      const matchStaff = (job.staff || []).some((s: any) =>
        (s.user?.name || s.external_name || '').toLowerCase().includes(q)
      );
      if (!matchTitle && !matchLoc && !matchStaff) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[#f4f6fa] text-slate-900">
      {/* MOBILE TOP BAR (Only visible on screens < lg) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Mở menu quản trị"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo/logo_full.png"
              alt="Bóng Đá Số Media"
              className="h-8 w-auto object-contain"
            />
            <div className="border-l border-slate-200 pl-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bóng Đá Số Media</div>
              <div className="text-xs font-black text-emerald-700">
                {activeTab === 'dashboard' && 'Tổng Quan'}
                {activeTab === 'calendar' && 'Lịch & Điều Phối'}
                {activeTab === 'jobs' && `Quản Lý Jobs (${jobs.length})`}
                {activeTab === 'inventory' && `Kho Thiết Bị (${equipments.length})`}
                {activeTab === 'map' && 'Live GPS Tracking'}
                {activeTab === 'finance' && 'Thu Chi & Lương'}
                {activeTab === 'users' && `Nhân Sự (${users.length})`}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => setShowCreateJobModal(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Job</span>
          </button>
        </div>
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR NAVIGATION (Desktop static, Mobile slide drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col shadow-2xl transition-transform duration-300 lg:static lg:w-64 lg:shadow-sm lg:translate-x-0 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-3.5 border-b border-slate-200/90 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo/logo_full.png"
              alt="Bóng Đá Số Media"
              className="h-8 w-auto object-contain"
            />
            <div className="border-l border-slate-200 pl-2">
              <div className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Hệ thống</div>
              <div className="text-xs font-black text-emerald-600">Console</div>
            </div>
          </div>
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'dashboard'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            <span>Tổng quan (Dashboard)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('calendar');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'calendar'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <span>Lịch & Điều phối</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('jobs');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'jobs'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <div className="flex items-center gap-3">
              <Film className="w-4 h-4 text-emerald-600" />
              <span>Quản lý Jobs ({jobs.length})</span>
            </div>
            {jobs.filter((j) => j.status === 'IN_PROGRESS').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('inventory');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'inventory'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Kho 25 Thiết Bị</span>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
              {equipments.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('map');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'map'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-emerald-600" />
              <span>Live GPS Tracking</span>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              TP.HCM
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('finance');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'finance'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Thu Chi & Lương</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${activeTab === 'users'
                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Đội ngũ Nhân sự ({users.length})</span>
          </button>
        </nav>

        {/* Quick Database Status Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2">
            <img
              src="/logo/logo_rutgon.jpg"
              alt="Bóng Đá Số"
              className="w-5 h-5 rounded-md object-cover ring-1 ring-slate-200 shadow-2xs"
            />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800">PostgreSQL (Port 5433)</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">18 Sân bóng • 25 Thiết bị</div>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ================= 1. TAB: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bảng Điều Khiển Tổng Quan</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Giám sát các ca phát sóng, kiểm soát khu vực nhân sự và điều phối thiết bị
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAllData}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Làm mới</span>
                </button>
                <button
                  onClick={() => setShowCreateJobModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Job / Phân Lịch Mới</span>
                </button>
              </div>
            </div>

            {/* CẢNH BÁO NGUY CƠ ĐI MUỘN (TỰ ĐỘNG TÍNH TOÁN QUÃNG ĐƯỜNG & HẠN 30P TRƯỚC GIỜ BÓNG LĂN) */}
            {lateWarnings.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-5 shadow-lg space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      🚨
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-rose-950 uppercase flex items-center gap-2">
                        <span>CẢNH BÁO NGUY CƠ ĐI MUỘN ({lateWarnings.length} Nhân Sự)</span>
                        <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full">
                          QUY ĐỊNH: TỚI SÂN TRƯỚC 30 PHÚT
                        </span>
                      </h3>
                      <p className="text-xs text-rose-800 font-medium mt-0.5">
                        Hệ thống tự động tính quãng đường và thời gian di chuyển. Các nhân sự dưới đây có nguy cơ không kịp tới sân trước giờ bóng lăn 30 phút!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shrink-0"
                  >
                    Xem Trực Tiếp Trên Bản Đồ
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {lateWarnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-2xl border border-rose-200 flex items-center justify-between text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <img
                            src={resolveAvatarUrl(w.user.avatar_url)}
                            alt={w.user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{w.user.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({w.user.phone || 'SĐT'})</span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate mt-0.5">
                            🏟️ {w.stadiumName} • Trận bắt đầu: <strong>{new Date(w.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-full">
                          Trễ ~{w.evaluation.lateMinutes} phút
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Cách {w.evaluation.distanceKm} km (~{w.evaluation.travelMinutes}p)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Lịch Trận Đấu (Jobs)</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Film className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{jobs.length}</div>
                <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <span>{jobs.filter((j) => j.status === 'IN_PROGRESS').length} trận đang diễn ra</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Thiết Bị Vận Hành</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {equipments.filter((e) => e.status === 'IN_USE').length} / {equipments.length}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {equipments.filter((e) => e.status === 'AVAILABLE').length} thiết bị sẵn sàng trong kho
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Nhân Sự Hiện Trường</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                    <Navigation className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {users.filter((u) => u.operational_status === 'MOVING' || u.operational_status === 'WORKING').length}
                </div>
                <div className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1">
                  <span>{users.filter((u) => u.operational_status === 'MOVING').length} người đang trên đường</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Lợi Nhuận Ròng</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-700 font-mono">
                  {financeData?.summary?.netProfit?.toLocaleString('vi-VN') || 0} đ
                </div>
                <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Biên lợi nhuận: {financeData?.summary?.profitMargin || 0}%</span>
                </div>
              </div>
            </div>

            {/* LIVE GPS RADAR PREVIEW & ONGOING JOBS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map container */}
              <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="font-bold text-slate-900 text-base">Bản Đồ GPS Vận Chuyển Toàn TP.HCM</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    Mở toàn màn hình <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <LiveMap users={users} jobs={jobs} className="h-[360px] w-full" zoom={11} />
                </div>
              </div>

              {/* Active Jobs & Dispatches */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">Lịch Trình Tác Nghiệp</h3>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    Xem tất cả
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {jobs.slice(0, 4).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobDetail(job)}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        {(() => {
                          const statusInfo = getJobStatusBadge(job.status);
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                        <span className="text-xs font-mono font-bold text-amber-700">
                          {job.price?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{job.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">🏟️ {job.location?.name}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                        <span>👥 {job.staff?.length || 0} nhân sự</span>
                        <span>📦 {job.equipmentAssignments?.length || 0} thiết bị gán chở</span>
                      </div>

                      {/* Equipment Carriers on Dashboard */}
                      {job.equipmentAssignments && job.equipmentAssignments.length > 0 && (
                        <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-200 space-y-1">
                          <div className="font-bold text-amber-900 text-[10px] uppercase flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            <span>Người chở đồ ({job.equipmentAssignments.length} món):</span>
                          </div>
                          {Object.entries(
                            job.equipmentAssignments.reduce((acc: any, ea: any) => {
                              const cName = ea.transportByUser?.name || 'Chưa gán';
                              if (!acc[cName]) acc[cName] = [];
                              acc[cName].push(ea.equipment?.name || 'Món');
                              return acc;
                            }, {})
                          ).map(([carrier, gears]: [string, any]) => (
                            <div key={carrier} className="text-[10px] text-slate-700 flex items-start gap-1">
                              <span className="font-bold text-amber-800 shrink-0">🛵 {carrier}:</span>
                              <span className="text-slate-600 line-clamp-1">{gears.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes on Dashboard */}
                      {job.notes && (
                        <div className="text-[10px] bg-blue-50/80 border border-blue-200 rounded-lg p-1.5 text-blue-900 flex items-start gap-1">
                          <span className="font-bold text-blue-700 shrink-0">📝</span>
                          <span className="line-clamp-2 text-slate-700 font-medium">{job.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. TAB: CALENDAR & ĐIỀU PHỐI ================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Lịch Trình & Điều Phối Nhân Sự</h1>
                <p className="text-sm text-slate-500">
                  Lập kế hoạch phát sóng và kiểm tra xung đột trùng giờ của thiết bị & nhân sự
                </p>
              </div>
              <button
                onClick={() => setShowCreateJobModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Lịch Thi Đấu</span>
              </button>
            </div>

            {/* Agenda & Jobs Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => {
                const myStaff = (job.staff || []).find((s: any) => s.user_id === currentUser?.id);
                const isMe = Boolean(myStaff);
                return (
                  <div
                    key={job.id}
                    className={`bg-white p-5 rounded-2xl border shadow-sm transition-all space-y-3 ${isMe ? 'border-purple-300 ring-2 ring-purple-100 bg-purple-50/10' : 'border-slate-200 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const statusInfo = getJobStatusBadge(job.status);
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                        {isMe && (
                          <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                            <span>👑</span>
                            <span>Lịch của bạn</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono font-medium">
                        {new Date(job.start_time).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug">{job.title}</h3>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          -{' '}
                          {new Date(job.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span className="line-clamp-1 font-medium">{job.location?.name}</span>
                      </div>
                    </div>

                    {/* Staff roster in job */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center justify-between">
                        <span>Phân công nhiệm vụ ({job.staff?.length || 0}):</span>
                      </div>
                      <div className="space-y-1">
                        {job.staff?.map((s: any) => (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between text-xs p-2 rounded-lg border ${s.user_id === currentUser?.id
                                ? 'bg-purple-50/80 border-purple-200 font-bold'
                                : 'bg-slate-50 border-slate-100'
                              }`}
                          >
                            <div>
                              <span className="text-slate-800 font-semibold">
                                {s.user_id === currentUser?.id ? '👑 [BẠN] ' : ''}
                                {s.user?.name || s.external_name}
                              </span>
                              {s.user?.address_district && (
                                <span className="text-[10px] text-slate-500 ml-1">({s.user.address_district})</span>
                              )}
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {getDutyLabel(s.duty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equipment & Transport Carriers in job */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-amber-800 uppercase mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Thiết bị & Người chở ({job.equipmentAssignments?.length || 0}):</span>
                        </span>
                      </div>

                      {job.equipmentAssignments && job.equipmentAssignments.length > 0 ? (
                        <div className="space-y-1.5">
                          {Object.entries(
                            job.equipmentAssignments.reduce((acc: any, ea: any) => {
                              const carrierId = ea.transport_by_user_id;
                              const carrierName = ea.transportByUser?.name || 'Chưa gán';
                              const key = `${carrierId}_${carrierName}`;
                              if (!acc[key]) acc[key] = { id: carrierId, name: carrierName, items: [] };
                              acc[key].items.push(ea);
                              return acc;
                            }, {})
                          ).map(([key, group]: [string, any]) => {
                            const isMeCarrier = group.id === currentUser?.id;
                            const confirmedCount = group.items.filter((it: any) => it.check_in_status === 'CONFIRMED').length;

                            return (
                              <div
                                key={key}
                                className={`p-2 rounded-xl border text-xs ${isMeCarrier
                                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200'
                                    : 'bg-slate-50 border-slate-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                                  <span className="flex items-center gap-1.5">
                                    <span>🛵</span>
                                    <span className={isMeCarrier ? 'text-amber-900' : 'text-slate-800'}>
                                      {isMeCarrier ? '⭐ [BẠN] ' : ''}
                                      {group.name}
                                    </span>
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                      {group.items.length} món
                                    </span>
                                    {confirmedCount === group.items.length ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                        ✓ Đã lấy đủ
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                        ⏳ Chờ lấy
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {group.items.map((it: any) => (
                                    <span
                                      key={it.id}
                                      className="inline-flex items-center text-[10px] bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium"
                                    >
                                      📦 {it.equipment?.name || 'Thiết bị'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic py-1 bg-slate-50 rounded-lg px-2 border border-dashed border-slate-200">
                          Chưa phân bổ thiết bị mang đi
                        </div>
                      )}
                    </div>

                    {/* Ghi chú nếu có */}
                    {job.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2 text-xs text-blue-950 flex items-start gap-1.5">
                          <span className="text-blue-700 font-bold shrink-0">📝 Ghi chú:</span>
                          <span className="font-medium text-slate-800 leading-snug">{job.notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedJobDetail(job)}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors text-center"
                      >
                        Chi Tiết
                      </button>
                      <button
                        onClick={() => handleOpenEditJob(job)}
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1 border border-blue-200"
                        title="Chỉnh sửa lịch & thiết bị"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 3. TAB: QUẢN LÝ JOBS ================= */}
        {activeTab === 'jobs' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Quản Lý Các Ca Làm (Jobs)</h1>
                <p className="text-sm text-slate-500">
                  Theo dõi trạng thái, loại lịch, số trận, số cam, chụp ảnh và tự động quyết toán lương/doanh thu
                </p>
              </div>
              <button
                onClick={() => setShowCreateJobModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Job Mới</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên job, sân bóng, nhân sự..."
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64"
                  />
                </div>

                <select
                  value={jobStatusFilter}
                  onChange={(e) => setJobStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">⏳ Chờ thực hiện</option>
                  <option value="ASSIGNED">⚡ Đã phân công</option>
                  <option value="IN_PROGRESS">🔴 Đang diễn ra</option>
                  <option value="COMPLETED">✓ Đã hoàn thành</option>
                  <option value="CANCELLED">✕ Đã hủy</option>
                </select>
              </div>

              {/* Mode Toggle: Tất Cả vs Lịch Đi Làm Của Tôi */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setJobFilterMode('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${jobFilterMode === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Tất Cả ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilterMode('MY_JOBS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${jobFilterMode === 'MY_JOBS'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-700 hover:bg-purple-50'
                    }`}
                >
                  <span>👑</span>
                  <span>Lịch Đi Làm Của Tôi ({myAssignedJobsCount})</span>
                </button>
              </div>
            </div>

            {/* 1. DESKTOP JOBS TABLE (hidden on mobile, visible on md+) */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[1180px]">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-extrabold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3.5 px-4 w-[240px] whitespace-nowrap">Tên Trận Đấu / Gói</th>
                      <th className="py-3.5 px-4 w-[190px] whitespace-nowrap">Địa Điểm / Sân</th>
                      <th className="py-3.5 px-4 w-[130px] whitespace-nowrap">Quy Mô</th>
                      <th className="py-3.5 px-4 w-[135px] whitespace-nowrap">Thời Gian</th>
                      <th className="py-3.5 px-4 w-[120px] whitespace-nowrap">Tiền Phải Thu</th>
                      <th className="py-3.5 px-4 min-w-[280px]">Nhân Sự, Thiết Bị & Bàn Giao</th>
                      <th className="py-3.5 px-4 w-[110px] whitespace-nowrap text-center">Trạng Thái</th>
                      <th className="py-3.5 px-4 w-[180px] whitespace-nowrap text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          {jobFilterMode === 'MY_JOBS'
                            ? 'Bạn chưa tự phân công ca làm nào cho mình. Bấm "Tạo Job Mới" hoặc "Sửa" để tự nhận ca làm!'
                            : 'Không tìm thấy ca làm nào phù hợp bộ lọc.'}
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job) => {
                        const myStaff = (job.staff || []).find((s: any) => s.user_id === currentUser?.id);
                        const myGears = (job.equipmentAssignments || []).filter(
                          (ea: any) => ea.transport_by_user_id === currentUser?.id
                        );
                        const isMeWorking = Boolean(myStaff || myGears.length > 0);

                        return (
                          <tr
                            key={job.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isMeWorking ? 'bg-purple-50/30' : ''
                            }`}
                          >
                            <td className="p-3.5 align-top font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {isMeWorking && <span title="Bạn tham gia ca này">👑</span>}
                                <span className="line-clamp-2">{job.title}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {job.match_type || job.job_type}
                                </span>
                                {job.is_deposited && (
                                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Đã cọc {job.deposit_amount?.toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                              </div>
                              {isMeWorking && (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {myStaff && (
                                    <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-1.5 py-0.5 rounded border border-purple-300">
                                      ⭐ Bạn làm: {getDutyLabel(myStaff.duty)} ({myStaff.payout_amount?.toLocaleString('vi-VN')} đ)
                                    </span>
                                  )}
                                  {myGears.length > 0 && (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                      🛵 Bạn chở {myGears.length} món đồ
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 align-top text-slate-600">
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{job.location?.name}</span>
                              </div>
                              {job.location?.address && (
                                <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 pl-4.5">
                                  {job.location.address}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 align-top text-slate-700 font-medium">
                              <div>
                                {job.match_count || 1} trận • {job.pitch_count || 1} sân • {job.camera_count || 1} cam
                              </div>
                              {job.has_photo && (
                                <div className="text-[10px] text-purple-700 font-bold flex items-center gap-1 mt-0.5">
                                  <Camera className="w-3 h-3 text-purple-600" /> Có chụp hình
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 align-top text-slate-600">
                              <div className="font-bold text-slate-900">
                                {new Date(job.start_time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                -{' '}
                                {new Date(job.end_time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {new Date(job.start_time).toLocaleDateString('vi-VN')}
                              </div>
                            </td>
                            <td className="p-3.5 align-top font-mono">
                              <div className="font-extrabold text-amber-700 text-sm whitespace-nowrap">
                                {job.price?.toLocaleString('vi-VN')} đ
                              </div>

                              {/* Trạng thái thanh toán của khách & Nút tick thu tiền */}
                              <div className="mt-1.5 space-y-1 font-sans">
                                {job.payment_status === 'PAID' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                    <span>✓ ĐÃ THU ĐỦ</span>
                                  </span>
                                ) : job.payment_status === 'PARTIAL' ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                    <span>ĐÃ CỌC: {(job.paid_amount || job.deposit_amount)?.toLocaleString('vi-VN')} đ</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 font-extrabold px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                    <span>⏳ CHƯA THU</span>
                                  </span>
                                )}

                                <div className="flex items-center gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentModal(job)}
                                    className="text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-300 transition-colors cursor-pointer"
                                    title="Cập nhật thu tiền & đính kèm bill khách"
                                  >
                                    {job.payment_status === 'PAID' ? 'Sửa bill' : '✓ Thu tiền'}
                                  </button>

                                  {job.payment_proof_url && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhotoUrl(job.payment_proof_url)}
                                      className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline ml-1 cursor-pointer flex items-center gap-0.5"
                                      title="Xem ảnh bill khách chuyển khoản"
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>Bill</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 align-top space-y-1.5">
                              <div className="text-slate-800 font-bold text-xs">
                                👥 {job.staff?.length || 0} nhân sự
                              </div>
                              {job.equipmentAssignments && job.equipmentAssignments.length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(
                                    job.equipmentAssignments.reduce((acc: any, ea: any) => {
                                      const cName = ea.transportByUser?.name || 'Chưa gán';
                                      if (!acc[cName]) acc[cName] = [];
                                      acc[cName].push(ea.equipment?.name || 'Món');
                                      return acc;
                                    }, {})
                                  ).map(([carrier, gears]: [string, any]) => (
                                    <div
                                      key={carrier}
                                      className="text-[10px] bg-amber-50/80 border border-amber-200 rounded px-1.5 py-0.5 text-amber-950"
                                    >
                                      <span className="font-bold text-amber-900">🛵 {carrier}:</span>{' '}
                                      <span className="text-slate-700">{gears.join(', ')}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">Chưa gán đồ chở</div>
                              )}

                              {/* Ghi chú ca làm (Admin) */}
                              {job.notes && (
                                <div className="text-[11px] bg-blue-50/80 border border-blue-200/90 rounded-lg p-2 text-blue-950 leading-snug">
                                  <div className="font-extrabold text-blue-800 flex items-center gap-1 mb-0.5">
                                    <span>📝 Ghi chú ca làm (Admin):</span>
                                  </div>
                                  <div className="text-slate-800 whitespace-pre-line font-medium">{job.notes}</div>
                                </div>
                              )}

                              {/* Ghi chú bàn giao & vị trí đồ của Nhân viên */}
                              {job.equipmentAssignments?.some((ea: any) => ea.check_out_notes || ea.return_location_name) && (
                                <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 text-[11px] space-y-1.5 shadow-2xs">
                                  <div className="font-extrabold text-emerald-900 flex items-center justify-between pb-1 border-b border-emerald-200">
                                    <span className="flex items-center gap-1">
                                      <span>💬 Bàn giao từ NV:</span>
                                    </span>
                                    <span className="text-[9px] font-black bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded uppercase">
                                      Check-out
                                    </span>
                                  </div>
                                  {job.equipmentAssignments
                                    .filter((ea: any) => ea.check_out_notes || ea.return_location_name)
                                    .map((ea: any) => (
                                      <div key={ea.id} className="pt-1 border-t border-emerald-200/70 first:border-0 first:pt-0 leading-relaxed">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-black text-slate-900">{ea.transportByUser?.name || 'NV'}:</span>
                                          {ea.equipment?.name && (
                                            <span className="text-slate-600 font-semibold text-[10px]">[{ea.equipment.name}]</span>
                                          )}
                                          {ea.return_location_name && (
                                            <span className="bg-emerald-200 text-emerald-950 font-extrabold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1 border border-emerald-300">
                                              📍 {ea.return_location_name}
                                            </span>
                                          )}
                                        </div>
                                        {ea.check_out_notes && (
                                          <div className="italic text-slate-800 text-[11px] mt-0.5 pl-1 bg-white/70 rounded p-1 border border-emerald-100">
                                            "{ea.check_out_notes}"
                                          </div>
                                        )}
                                        {ea.check_out_photo_url && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewPhotoUrl(ea.check_out_photo_url);
                                            }}
                                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 font-bold transition-colors cursor-pointer"
                                          >
                                            <Camera className="w-3 h-3" />
                                            <span>Xem ảnh bàn giao đồ</span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 align-top text-center">
                              {(() => {
                                const statusInfo = getJobStatusBadge(job.status);
                                return (
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-block ${statusInfo.className}`}>
                                    {statusInfo.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3.5 align-top text-right whitespace-nowrap">
                              <div className="flex flex-col items-end gap-1.5">
                                {job.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => handleUpdateJobStatus(job.id, 'COMPLETED')}
                                    className="w-full max-w-[110px] px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition-all shadow-xs flex items-center justify-center gap-1"
                                    title="Hoàn thành Job (Tự động hạch toán tiền công cho staff & doanh thu)"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Hoàn Thành</span>
                                  </button>
                                )}
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => setSelectedJobDetail(job)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition-colors"
                                    title="Xem chi tiết ca làm"
                                  >
                                    Chi Tiết
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditJob(job)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors"
                                    title="Chỉnh sửa thông tin, giá tiền, nhân sự, thiết bị"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteJob(job.id)}
                                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors"
                                    title="Xóa trận đấu này"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. MOBILE JOBS CARDS (visible on mobile < md, hidden on desktop) */}
            <div className="md:hidden space-y-3">
              {filteredJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  {jobFilterMode === 'MY_JOBS'
                    ? 'Bạn chưa tự phân công ca làm nào cho mình.'
                    : 'Không tìm thấy ca làm nào phù hợp bộ lọc.'}
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const myStaff = (job.staff || []).find((s: any) => s.user_id === currentUser?.id);
                  const myGears = (job.equipmentAssignments || []).filter(
                    (ea: any) => ea.transport_by_user_id === currentUser?.id
                  );
                  const isMeWorking = Boolean(myStaff || myGears.length > 0);
                  const statusInfo = getJobStatusBadge(job.status);

                  return (
                    <div
                      key={job.id}
                      className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-colors ${
                        isMeWorking ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200'
                      }`}
                    >
                      {/* Top Bar: Match Type, Time, Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {job.match_type || job.job_type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            🕒 {new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(job.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(job.start_time).toLocaleDateString('vi-VN')})
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Job Title */}
                      <div>
                        <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          {isMeWorking && <span title="Bạn tham gia ca này">👑</span>}
                          <span>{job.title}</span>
                        </h3>
                        {job.is_deposited && (
                          <span className="inline-block mt-1 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Đã cọc: {job.deposit_amount?.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                        {isMeWorking && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {myStaff && (
                              <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-1.5 py-0.5 rounded border border-purple-300">
                                ⭐ Bạn làm: {getDutyLabel(myStaff.duty)} ({myStaff.payout_amount?.toLocaleString('vi-VN')} đ)
                              </span>
                            )}
                            {myGears.length > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                🛵 Bạn chở {myGears.length} món đồ
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stadium & Location */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{job.location?.name || 'Sân bóng'}</span>
                        </div>
                        {job.location?.address && (
                          <div className="text-[11px] text-slate-500 pl-5 leading-snug">{job.location.address}</div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 pl-5">
                          <span>⚽ {job.match_count || 1} trận • {job.pitch_count || 1} sân • {job.camera_count || 1} cam</span>
                          {job.has_photo && <span className="text-purple-700 font-bold">📸 Có chụp hình</span>}
                        </div>
                      </div>

                      {/* Price & Client Payment Status */}
                      <div className="flex items-center justify-between text-xs px-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-500 font-medium block text-[11px]">Tiền hợp đồng thu khách:</span>
                          <span className="font-mono font-extrabold text-amber-700 text-sm">
                            {job.price?.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {job.payment_status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 rounded text-[10px]">
                              ✓ ĐÃ THU ĐỦ
                            </span>
                          ) : job.payment_status === 'PARTIAL' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-black px-2 py-0.5 rounded text-[10px]">
                              ĐÃ CỌC: {(job.paid_amount || job.deposit_amount)?.toLocaleString('vi-VN')} đ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 font-black px-2 py-0.5 rounded text-[10px]">
                              ⏳ CHƯA THU
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(job)}
                              className="text-[10px] font-bold bg-white border border-slate-300 px-2 py-0.5 rounded-lg text-slate-700 hover:bg-emerald-50 cursor-pointer"
                            >
                              {job.payment_status === 'PAID' ? 'Sửa bill' : '✓ Thu tiền'}
                            </button>
                            {job.payment_proof_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(job.payment_proof_url)}
                                className="text-[10px] text-blue-700 underline font-bold"
                              >
                                📷 Xem bill
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Staff & Gears */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>👥 Nhân sự ({job.staff?.length || 0}):</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {job.staff?.map((s: any) => s.user?.name || s.external_name).filter(Boolean).join(', ')}
                          </span>
                        </div>

                        {job.equipmentAssignments && job.equipmentAssignments.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-slate-200/60">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase">Đồ chở theo người:</div>
                            {Object.entries(
                              job.equipmentAssignments.reduce((acc: any, ea: any) => {
                                const cName = ea.transportByUser?.name || 'Chưa gán';
                                if (!acc[cName]) acc[cName] = [];
                                acc[cName].push(ea.equipment?.name || 'Món');
                                return acc;
                              }, {})
                            ).map(([carrier, gears]: [string, any]) => (
                              <div key={carrier} className="text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-950">
                                <span className="font-bold text-amber-900">🛵 {carrier}:</span>{' '}
                                <span className="text-slate-700">{gears.join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Admin Note */}
                        {job.notes && (
                          <div className="text-[11px] bg-blue-50 border border-blue-200 rounded-lg p-2 text-blue-900">
                            <span className="font-bold text-blue-700">📝 Ghi chú Admin:</span> {job.notes}
                          </div>
                        )}

                        {/* Staff Checkout Note & Return Location */}
                        {job.equipmentAssignments?.some((ea: any) => ea.check_out_notes || ea.return_location_name) && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] space-y-1.5">
                            <div className="font-bold text-emerald-900 flex items-center gap-1">
                              <span>💬 Bàn giao & Ghi chú của NV:</span>
                            </div>
                            {job.equipmentAssignments
                              .filter((ea: any) => ea.check_out_notes || ea.return_location_name)
                              .map((ea: any) => (
                                <div key={ea.id} className="text-[11px] leading-tight">
                                  <span className="font-bold text-emerald-900">{ea.transportByUser?.name}:</span>{' '}
                                  {ea.return_location_name && (
                                    <span className="bg-emerald-200/80 text-emerald-950 font-bold px-1.5 py-0.5 rounded mr-1">
                                      📍 {ea.return_location_name}
                                    </span>
                                  )}
                                  {ea.check_out_notes && (
                                    <span className="italic text-slate-700">"{ea.check_out_notes}"</span>
                                  )}
                                  {ea.check_out_photo_url && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhotoUrl(ea.check_out_photo_url)}
                                      className="ml-1 text-emerald-700 underline font-bold"
                                    >
                                      📷 Xem ảnh
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        {job.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'COMPLETED')}
                            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                          >
                            ✓ Hoàn Thành
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedJobDetail(job)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 text-center"
                        >
                          Chi Tiết
                        </button>
                        <button
                          onClick={() => handleOpenEditJob(job)}
                          className="py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 text-center"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 text-center"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= 4. TAB: KHO THIẾT BỊ (MASTER INVENTORY) ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Danh Mục 25 Thiết Bị / Máy Móc Chi Tiết</h1>
                <p className="text-sm text-slate-500">
                  Phân loại theo Laptop/PC vMix, Máy quay, Loa kéo, Chân quay, Dây điện và kiểm soát người đang chở
                </p>
              </div>
              <button
                onClick={() => setShowAddEquipmentModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Thiết Bị Mới</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên máy (VD: Dell Vmix, Dalton...)"
                    value={invSearchQuery}
                    onChange={(e) => setInvSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={invCategoryFilter}
                  onChange={(e) => setInvCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">Tất cả 5 danh mục</option>
                  {equipmentCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c._count?.equipments || 0})
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={invStatusFilter}
                  onChange={(e) => setInvStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="AVAILABLE">Sẵn sàng trong kho</option>
                  <option value="IN_USE">Đang sử dụng / đi làm</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="BROKEN">Hỏng hóc</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-slate-900">{filteredEquipments.length}</span> / {equipments.length} thiết bị
              </div>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEquipments.map((eq) => {
                const isAvailable = eq.status === 'AVAILABLE';
                const isInUse = eq.status === 'IN_USE';
                const isMaintenance = eq.status === 'MAINTENANCE';
                const isBroken = eq.status === 'BROKEN';

                return (
                  <div
                    key={eq.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                  >
                    {/* Equipment Photo Box with S3 Upload Button */}
                    <div className="h-44 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {eq.image_url ? (
                        <img
                          src={resolveMediaUrl(eq.image_url)}
                          alt={eq.name}
                          onError={handleMediaError}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                          <Package className="w-12 h-12 stroke-[1.2] text-slate-300" />
                          <span className="text-xs font-medium">Chưa có ảnh thiết bị</span>
                        </div>
                      )}

                      {/* Category Tag (Top-left) */}
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-emerald-800 uppercase border border-emerald-200/70 shadow-xs">
                          {eq.category?.name || 'Phân loại'}
                        </span>
                      </div>

                      {/* Status Tag (Top-right) */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs backdrop-blur-md ${isAvailable
                              ? 'bg-emerald-500/95 text-white font-black'
                              : isInUse
                                ? 'bg-amber-500/95 text-slate-950 font-black'
                                : isMaintenance
                                  ? 'bg-orange-500/95 text-white font-black'
                                  : 'bg-rose-500/95 text-white font-black'
                            }`}
                        >
                          {isAvailable
                            ? '✓ SẴN SÀNG'
                            : isInUse
                              ? '📦 ĐANG DÙNG'
                              : isMaintenance
                                ? '🛠️ BẢO TRÌ'
                                : '⚠️ HỎNG HÓC'}
                        </span>
                      </div>

                      {/* S3 Image Upload Button (Bottom-right) */}
                      <div className="absolute bottom-3 right-3">
                        <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md hover:scale-105 transition-all">
                          {uploadingTarget === `equipment-${eq.id}` ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>Đang tải lên...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{eq.image_url ? 'Đổi ảnh' : 'Thêm ảnh'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingTarget === `equipment-${eq.id}`}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleDirectUpload(e.target.files[0], 'equipment', eq.id);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                            {eq.name}
                          </h3>
                        </div>
                        {eq.qr_code && (
                          <div className="mt-1">
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">
                              QR: {eq.qr_code}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Selector for Admin fast edit */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Trạng thái:</span>
                        <select
                          value={eq.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            await fetch('/api/inventory', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: eq.id, status: newStatus }),
                            });
                            fetchAllData();
                          }}
                          className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="AVAILABLE">✓ Sẵn sàng trong kho</option>
                          <option value="IN_USE">📦 Đang sử dụng / Đi làm</option>
                          <option value="MAINTENANCE">🛠️ Đang bảo trì</option>
                          <option value="BROKEN">⚠️ Hỏng hóc</option>
                        </select>
                      </div>

                      {/* Equipment Action Buttons: Sửa & Xóa */}
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEquipment(eq)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center gap-1 transition-colors"
                          title="Sửa thông tin thiết bị"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(eq.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 flex items-center gap-1 transition-colors"
                          title="Xóa thiết bị khỏi kho"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      </div>

                      {/* Current Location & Holder info */}
                      <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-600 font-medium flex items-center gap-1">
                            <span>📍</span>
                            <span>Vị trí hiện tại:</span>
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                            eq.current_location?.includes('Kho') || !eq.current_location
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : eq.current_location?.includes('sân') || eq.current_location?.includes('Sân')
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-blue-100 text-blue-950 border border-blue-300'
                          }`}>
                            {eq.current_location || 'Kho văn phòng'}
                          </span>
                        </div>

                        {eq.currentHolder ? (
                          <div className="flex items-center gap-2 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                            <img
                              src={
                                eq.currentHolder.avatar_url ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                              }
                              onError={handleAvatarError}
                              className="w-6 h-6 rounded-full object-cover border border-amber-300"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] text-amber-800 font-bold uppercase">Người đang giữ / chở:</div>
                              <div className="font-extrabold text-slate-900 truncate">
                                {eq.currentHolder.name}
                                {eq.currentHolder.address_district && (
                                  <span className="text-slate-500 font-normal text-[11px] ml-1">
                                    ({eq.currentHolder.address_district})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 italic text-[11px] py-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {eq.current_location?.includes('Kho') || !eq.current_location
                                ? 'Đang lưu trữ an toàn trong kho trụ sở'
                                : `Đang để tại: ${eq.current_location}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 5. TAB: LIVE GPS TRACKING ================= */}
        {activeTab === 'map' && (
          <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Navigation className="w-6 h-6 text-emerald-600" />
                  Live GPS Tracking 18 Sân Bóng TP.HCM
                </h1>
                <p className="text-sm text-slate-500">
                  Giám sát lộ trình di chuyển của nhân sự chở thiết bị đến các sân bóng Bình Tân, Bình Chánh, Gò Vấp, Tân Bình...
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl text-xs text-slate-700 font-semibold">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Auto Sync mỗi 8 giây</span>
              </div>
            </div>

            {/* Full-height map container */}
            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 shadow-md relative bg-white">
              <LiveMap users={users} jobs={jobs} className="w-full h-full" zoom={12} />
            </div>
          </div>
        )}

        {/* ================= 6. TAB: THU CHI & LƯƠNG (FINANCE) ================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-7 h-7 text-emerald-600" />
                  <span>Quản Lý Thu Chi, Lương & Công Nợ</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Kiểm soát dòng tiền hợp đồng khách hàng, chi trả lương nhân sự kèm bill minh chứng, và chi phí mua sắm vận hành
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Làm mới số liệu tài chính"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Thu / Chi / Mua Sắm</span>
                </button>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setFinanceSubTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  financeSubTab === 'overview'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📊 Tổng Quan Dòng Tiền</span>
              </button>

              <button
                type="button"
                onClick={() => setFinanceSubTab('client_payments')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  financeSubTab === 'client_payments'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>⚽ Thu Tiền Hợp Đồng ({jobs.filter((j) => j.payment_status !== 'PAID').length} chưa thu đủ)</span>
              </button>

              <button
                type="button"
                onClick={() => setFinanceSubTab('staff_payroll')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  financeSubTab === 'staff_payroll'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>👥 Lương Nhân Sự & Minh Chứng Bill ({staffPayrollData?.totalUnpaidAllStaff ? `${staffPayrollData.totalUnpaidAllStaff.toLocaleString('vi-VN')} đ` : '0 đ'})</span>
              </button>

              <button
                type="button"
                onClick={() => setFinanceSubTab('expenses')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  financeSubTab === 'expenses'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>🧾 Mua Sắm & Chi Phí Vận Hành</span>
              </button>
            </div>

            {/* ================= SUB-TAB 1: TỔNG QUAN DÒNG TIỀN ================= */}
            {financeSubTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 Financial Core KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1: Doanh thu hợp đồng */}
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold uppercase text-emerald-800 mb-1">
                        <span>Hợp Đồng Khách</span>
                        <span>⚽</span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono">
                        {financeData?.summary?.totalContractValue?.toLocaleString('vi-VN') || 0} đ
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-emerald-100 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Đã thu khách:</span>
                        <strong className="font-mono">{financeData?.summary?.collectedFromClients?.toLocaleString('vi-VN') || 0} đ</strong>
                      </div>
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Công nợ còn thiếu:</span>
                        <strong className="font-mono">{financeData?.summary?.clientReceivables?.toLocaleString('vi-VN') || 0} đ</strong>
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Tiền công nhân sự */}
                  <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm bg-gradient-to-br from-purple-50/50 to-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold uppercase text-purple-800 mb-1">
                        <span>Tiền Công Nhân Sự</span>
                        <span>👥</span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono">
                        {financeData?.summary?.totalStaffWages?.toLocaleString('vi-VN') || 0} đ
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-100 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Đã chi trả:</span>
                        <strong className="font-mono">{financeData?.summary?.wagesPaid?.toLocaleString('vi-VN') || 0} đ</strong>
                      </div>
                      <div className="flex justify-between text-purple-700 font-extrabold">
                        <span>Còn nợ nhân viên:</span>
                        <strong className="font-mono text-purple-900">{financeData?.summary?.wagesPending?.toLocaleString('vi-VN') || 0} đ</strong>
                      </div>
                    </div>
                  </div>

                  {/* KPI 3: Chi phí vận hành & Mua sắm */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold uppercase text-amber-800 mb-1">
                        <span>Chi Mua Sắm & Vận Hành</span>
                        <span>🧾</span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono">
                        {financeData?.summary?.operationalExpense?.toLocaleString('vi-VN') || 0} đ
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-amber-100 text-[11px] text-slate-500">
                      Thiết bị, dây rợ, mic, sửa chữa, xăng xe, nước nôi...
                    </div>
                  </div>

                  {/* KPI 4: Lợi nhuận ròng thực tế */}
                  <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-extrabold uppercase text-blue-800 mb-1">
                        <span>Lợi Nhuận Dòng Tiền</span>
                        <span>💎</span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-blue-900 font-mono">
                        {financeData?.summary?.netProfit?.toLocaleString('vi-VN') || 0} đ
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-blue-100 text-[11px] text-slate-600 font-medium">
                      Tỷ suất lợi nhuận: <span className="font-bold text-blue-800">{financeData?.summary?.profitMargin || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Nhật ký toàn bộ giao dịch dòng tiền */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">Nhật Ký Toàn Bộ Giao Dịch Thu Chi</h3>
                      <p className="text-xs text-slate-500">Dòng tiền thực nhận từ khách và thực chi cho nhân sự / mua sắm</p>
                    </div>
                    <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {financeData?.transactions?.length || 0} giao dịch
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[780px]">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 font-extrabold">
                        <tr>
                          <th className="py-3 px-4">Ngày</th>
                          <th className="py-3 px-4">Loại</th>
                          <th className="py-3 px-4">Phân Loại</th>
                          <th className="py-3 px-4">Nội Dung / Diễn Giải</th>
                          <th className="py-3 px-4">Trận Đấu</th>
                          <th className="py-3 px-4 text-center">Chứng Từ / Bill</th>
                          <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                          <th className="py-3 px-4 text-center w-12">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financeData?.transactions?.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              Chưa có giao dịch thu chi nào được ghi nhận.
                            </td>
                          </tr>
                        ) : (
                          financeData?.transactions?.map((tx: any) => {
                            const isIncome = tx.type === 'INCOME';
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 text-slate-500 font-mono font-medium whitespace-nowrap">
                                  {new Date(tx.transaction_date).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isIncome
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {isIncome ? 'THU (+)' : 'CHI (-)'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                                  {tx.category === 'CLIENT_PAYMENT'
                                    ? 'Thu tiền khách hàng'
                                    : tx.category === 'STAFF_SALARY'
                                    ? 'Tiền công nhân sự'
                                    : tx.category === 'EQUIPMENT_PURCHASE'
                                    ? 'Mua sắm thiết bị'
                                    : tx.category === 'MAINTENANCE'
                                    ? 'Bảo trì máy móc'
                                    : tx.category === 'TRAVEL'
                                    ? 'Xăng xe di chuyển'
                                    : 'Chi phí khác'}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">{tx.notes || '-'}</td>
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                  {tx.job?.title || 'Kho / Trụ sở'}
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  {tx.receipt_url ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhotoUrl(tx.receipt_url)}
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                                    >
                                      <Camera className="w-3 h-3 text-blue-600" />
                                      <span>Xem Bill</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Không có</span>
                                  )}
                                </td>
                                <td
                                  className={`py-3 px-4 text-right font-mono font-black text-sm whitespace-nowrap ${
                                    isIncome ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'}
                                  {tx.amount?.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransaction(tx.id, tx.notes)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa giao dịch này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 2: THU TIỀN HỢP ĐỒNG TRẬN ĐẤU ================= */}
            {financeSubTab === 'client_payments' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-600">Thống kê thu tiền:</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ Đã thu đủ: {jobs.filter((j) => j.payment_status === 'PAID').length} trận
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                      🟡 Đã cọc: {jobs.filter((j) => j.payment_status === 'PARTIAL').length} trận
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                      🔴 Chưa thu: {jobs.filter((j) => !j.payment_status || j.payment_status === 'UNPAID').length} trận
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-bold">
                    Tổng tiền còn phải thu khách:{' '}
                    <span className="text-rose-700 font-mono font-black text-sm">
                      {financeData?.summary?.clientReceivables?.toLocaleString('vi-VN') || 0} đ
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[900px]">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 font-extrabold">
                        <tr>
                          <th className="py-3 px-4 w-[240px]">Tên Trận Đấu</th>
                          <th className="py-3 px-4 w-[160px]">Sân Bóng & Ngày</th>
                          <th className="py-3 px-4 w-[120px]">Giá Hợp Đồng</th>
                          <th className="py-3 px-4 w-[130px]">Đã Thu Khách</th>
                          <th className="py-3 px-4 w-[130px]">Còn Nợ</th>
                          <th className="py-3 px-4 w-[140px] text-center">Trạng Thái</th>
                          <th className="py-3 px-4 text-center">Ảnh Bill Khách</th>
                          <th className="py-3 px-4 text-right">Thao Tác Thu Tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobs.map((job) => {
                          const paidVal = job.payment_status === 'PAID'
                            ? job.price
                            : (job.paid_amount || (job.is_deposited ? job.deposit_amount : 0));
                          const debtVal = Math.max(0, job.price - paidVal);

                          return (
                            <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                <div>{job.title}</div>
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 inline-block mt-0.5">
                                  {job.match_type || job.job_type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <div className="font-bold text-slate-800">{job.location?.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(job.start_time).toLocaleDateString('vi-VN')} ({new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 whitespace-nowrap">
                                {job.price?.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                                {paidVal?.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3.5 px-4 font-mono font-extrabold text-rose-600 whitespace-nowrap">
                                {debtVal > 0 ? `${debtVal.toLocaleString('vi-VN')} đ` : '0 đ'}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {job.payment_status === 'PAID' ? (
                                  <span className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 rounded text-[10px]">
                                    ✓ ĐÃ THU ĐỦ
                                  </span>
                                ) : job.payment_status === 'PARTIAL' ? (
                                  <span className="inline-block bg-amber-100 text-amber-950 border border-amber-300 font-black px-2 py-0.5 rounded text-[10px]">
                                    🟡 ĐÃ CỌC
                                  </span>
                                ) : (
                                  <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 font-black px-2 py-0.5 rounded text-[10px]">
                                    🔴 CHƯA THU
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {job.payment_proof_url ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoUrl(job.payment_proof_url)}
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    <Camera className="w-3 h-3 text-blue-600" />
                                    <span>Xem Bill</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Chưa có</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(job)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                                >
                                  {job.payment_status === 'PAID' ? 'Cập nhật / Sửa bill' : '✓ Xác nhận thu tiền'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 3: LƯƠNG NHÂN SỰ & MINH CHỨNG BILL ================= */}
            {financeSubTab === 'staff_payroll' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Bảng Lương Nhân Sự Theo Từng Ca Làm Việc</h3>
                    <p className="text-xs text-slate-500">
                      Chi trả lương theo từng ca hoặc chọn gộp nhiều trận, đính kèm bill chuyển khoản để nhân viên đối soát
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Tổng tiền công còn nợ nhân viên:{' '}
                    <span className="text-purple-700 font-mono font-black text-sm">
                      {staffPayrollData?.totalUnpaidAllStaff?.toLocaleString('vi-VN') || 0} đ
                    </span>
                  </div>
                </div>

                {/* Staff Cards List */}
                <div className="space-y-4">
                  {staffPayrollData?.staffPayrollList?.map((staffItem: any) => {
                    const isExpanded = selectedPayrollStaff?.user?.id === staffItem.user.id;
                    const hasUnpaid = staffItem.total_unpaid > 0;

                    return (
                      <div
                        key={staffItem.user.id}
                        className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-sm ${
                          hasUnpaid ? 'border-purple-200' : 'border-slate-200'
                        }`}
                      >
                        {/* Header bar of staff card */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveAvatarUrl(staffItem.user.avatar_url)}
                              onError={handleAvatarError}
                              className="w-12 h-12 rounded-full object-cover border-2 border-purple-300 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 text-base">{staffItem.user.name}</h4>
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                  {staffItem.user.role}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                📞 {staffItem.user.phone || 'Chưa có SĐT'} • 📍 {staffItem.user.address_district || 'TP.HCM'}
                              </div>
                            </div>
                          </div>

                          {/* Quick earnings summary */}
                          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Tổng công phát sinh</div>
                              <div className="font-mono font-black text-slate-900 text-sm">
                                {staffItem.total_earned?.toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Đã thanh toán</div>
                              <div className="font-mono font-black text-emerald-700 text-sm">
                                {staffItem.total_paid?.toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            <div className="text-right pl-3 border-l border-slate-200">
                              <div className="text-[10px] text-purple-700 font-bold uppercase">Còn nợ lương</div>
                              <div className={`font-mono font-black text-base ${hasUnpaid ? 'text-purple-700' : 'text-slate-400'}`}>
                                {staffItem.total_unpaid?.toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {hasUnpaid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayoutModal(staffItem)}
                                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-purple-600/20 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>Chi Trả Lương</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPayrollStaff(isExpanded ? null : staffItem)
                                }
                                className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>{staffItem.total_jobs} ca làm</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible details of shifts for this staff */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 p-4 bg-white space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-700">
                              <span>Chi tiết các ca làm việc của {staffItem.user.name}:</span>
                              {hasUnpaid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayoutModal(staffItem)}
                                  className="text-purple-700 hover:underline font-bold"
                                >
                                  + Thanh toán tất cả ca chưa trả
                                </button>
                              )}
                            </div>

                            {staffItem.assignments?.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-400 italic">
                                Nhân viên này chưa được phân công ca làm nào.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {staffItem.assignments.map((assignment: any) => {
                                  const isPaid = assignment.payout_status === 'PAID';
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                          <span>{assignment.job?.title || 'Trận đấu'}</span>
                                          <span className="text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                            {getDutyLabel(assignment.duty)}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          🏟️ {assignment.job?.location?.name || 'Sân bóng'} • 🕒{' '}
                                          {assignment.job?.start_time
                                            ? new Date(assignment.job.start_time).toLocaleDateString('vi-VN')
                                            : ''}
                                        </div>
                                        {assignment.payout_notes && (
                                          <div className="text-[10px] text-slate-600 italic mt-0.5">
                                            💬 Ghi chú lương: "{assignment.payout_notes}"
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <div className="text-right font-mono font-extrabold text-sm text-slate-900">
                                          {assignment.payout_amount?.toLocaleString('vi-VN')} đ
                                        </div>

                                        {isPaid ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded">
                                              ✓ ĐÃ TRẢ
                                            </span>
                                            {assignment.payout_proof_url && (
                                              <button
                                                type="button"
                                                onClick={() => setPreviewPhotoUrl(assignment.payout_proof_url)}
                                                className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                                              >
                                                <Camera className="w-3 h-3 text-blue-600" />
                                                <span>Bill CK</span>
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5">
                                            <span className="bg-purple-100 text-purple-900 border border-purple-300 font-extrabold text-[10px] px-2 py-0.5 rounded">
                                              ⏳ CHƯA TRẢ
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenPayoutModal(staffItem, assignment.id)}
                                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                                            >
                                              Trả ca này
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 4: MUA SẮM & CHI PHÍ VẬN HÀNH ================= */}
            {financeSubTab === 'expenses' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Chi Phí Mua Sắm & Vận Hành Kho ("Mua Này Mua Kia")</h3>
                    <p className="text-xs text-slate-500">
                      Ghi nhận các khoản mua sắm thiết bị mới (dây cáp, mic, pin...), chi phí sửa chữa máy móc, xăng xe, nước nôi kèm bill hóa đơn
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        type: 'EXPENSE',
                        category: 'EQUIPMENT_PURCHASE',
                        amount: '',
                        notes: '',
                        job_id: '',
                        payment_method: 'BANK_TRANSFER',
                      });
                      setTxReceiptFile(null);
                      setTxReceiptPreview(null);
                      setShowAddTransactionModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Khoản Chi / Mua Sắm Mới</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[750px]">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 font-extrabold">
                        <tr>
                          <th className="py-3 px-4">Ngày</th>
                          <th className="py-3 px-4">Phân Loại Khoản Chi</th>
                          <th className="py-3 px-4">Nội Dung / Đồ Mua</th>
                          <th className="py-3 px-4">Hình Thức</th>
                          <th className="py-3 px-4">Người Ghi Nhận</th>
                          <th className="py-3 px-4 text-center">Hóa Đơn / Bill</th>
                          <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                          <th className="py-3 px-4 text-center w-12">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financeData?.transactions?.filter((t: any) => t.type === 'EXPENSE' && t.category !== 'STAFF_SALARY').length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              Chưa có chi phí vận hành hay mua sắm nào. Bấm "Thêm Khoản Chi / Mua Sắm Mới" để lưu bill!
                            </td>
                          </tr>
                        ) : (
                          financeData?.transactions
                            ?.filter((t: any) => t.type === 'EXPENSE' && t.category !== 'STAFF_SALARY')
                            .map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                                  {new Date(tx.transaction_date).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                  {tx.category === 'EQUIPMENT_PURCHASE' && '📦 Mua sắm thiết bị'}
                                  {tx.category === 'MAINTENANCE' && '🛠️ Bảo trì sửa chữa'}
                                  {tx.category === 'TRAVEL' && '🛵 Xăng xe di chuyển'}
                                  {tx.category === 'OTHER' && '☕ Ăn uống / Nước nôi'}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-900 max-w-sm">
                                  {tx.notes || '-'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                  {tx.payment_method === 'CASH' ? '💵 Tiền mặt' : '💳 Chuyển khoản'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-semibold whitespace-nowrap">
                                  {tx.recorder?.name || 'Admin'}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  {tx.receipt_url ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhotoUrl(tx.receipt_url)}
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                                    >
                                      <Camera className="w-3 h-3 text-blue-600" />
                                      <span>Xem Bill</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Chưa chụp</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-rose-700 text-sm whitespace-nowrap">
                                  -{tx.amount?.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransaction(tx.id, tx.notes)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa khoản chi này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 7. TAB: ĐỘI NGŨ NHÂN SỰ ================= */}
        {activeTab === 'users' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Quản Lý Đội Ngũ Nhân Sự ({users.length})
                </h1>
                <p className="text-sm text-slate-500">
                  Phân quyền Admin, Kỹ thuật viên, Cộng tác viên và kiểm soát địa bàn khu vực để điều phối tác nghiệp
                </p>
              </div>
              <button
                onClick={() => {
                  setUserForm({
                    name: '',
                    phone: '',
                    role: 'STAFF',
                    address_district: 'Gò Vấp',
                    skills: 'Kỹ thuật viên, Quay phim',
                    avatar_url: '',
                    status: 'ACTIVE',
                    operational_status: 'IDLE',
                  });
                  setUserAvatarFile(null);
                  setUserAvatarPreview(null);
                  setShowAddUserModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Nhân Viên Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {users.map((u) => {
                const roleBadge = getUserRoleBadge(u.role);
                const opStatus = getUserOperationalStatus(u.operational_status);

                return (
                  <div
                    key={u.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar with S3 Upload Button */}
                      <div className="relative group shrink-0">
                        <img
                          src={resolveAvatarUrl(u.avatar_url)}
                          onError={handleAvatarError}
                          className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 shadow-xs"
                        />
                        <label
                          title="Tải ảnh đại diện mới"
                          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white"
                        >
                          {uploadingTarget === `user-${u.id}` ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          ) : (
                            <Camera className="w-4 h-4 text-emerald-300" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingTarget === `user-${u.id}`}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleDirectUpload(e.target.files[0], 'user', u.id);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">{u.name}</h3>
                          <label className="cursor-pointer text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 shrink-0">
                            <Camera className="w-3 h-3" />
                            <span>{uploadingTarget === `user-${u.id}` ? 'Đang tải lên...' : 'Đổi ảnh'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingTarget === `user-${u.id}`}
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleDirectUpload(e.target.files[0], 'user', u.id);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${roleBadge.className}`}>
                            {roleBadge.label}
                          </span>
                          {u.address_district && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-rose-500" />
                              {u.address_district}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Trạng thái hiện trường:</span>
                        <span className={`text-xs ${opStatus.className}`}>{opStatus.label}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Thiết bị đang chở:</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {u.transportAssignments?.filter(
                            (t: any) => t.check_in_status === 'CONFIRMED' && t.check_out_status !== 'CONFIRMED'
                          ).length || 0}{' '}
                          món
                        </span>
                      </div>
                      {u.phone && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Điện thoại liên hệ:</span>
                          <a
                            href={`tel:${u.phone}`}
                            className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            📞 {u.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Skills & Action Buttons (Sửa & Xóa) */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] truncate text-slate-600 font-medium">
                        {u.skills ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px] font-semibold">
                            💼 {u.skills}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Chưa điền kỹ năng</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setResetPasswordModalUser(u);
                            setNewPasswordVal('');
                            setResetPassError('');
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 flex items-center gap-1 transition-colors"
                          title="Đặt lại mật khẩu cho nhân viên này"
                        >
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>Đổi pass</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1 transition-colors"
                          title="Chỉnh sửa nhân viên"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                          title="Xóa nhân viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MAIN VIEWPORT FOOTER */}
        <footer className="mt-12 pt-6 pb-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/logo/logo_full.png"
              alt="Bóng Đá Số Media"
              className="h-9 w-auto object-contain opacity-95 transition-transform hover:scale-105"
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="font-extrabold text-slate-800 text-sm">BÓNG ĐÁ SỐ MEDIA ERP</div>
              <div className="text-[11px] text-slate-500">
                Hệ thống Quản lý Vận hành, Thiết bị, Lịch trình & Thu chi Thể thao
              </div>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400">
            <div>© {new Date().getFullYear()} Bóng Đá Số Media. All rights reserved.</div>
            <div className="text-emerald-700 font-semibold mt-0.5">Live Dispatch Platform • TP. Hồ Chí Minh</div>
          </div>
        </footer>
      </main>

      {/* ================= MODAL: TẠO JOB MỚI CHỌN NHANH ĐẦY ĐỦ CÁC MỤC ================= */}
      {showCreateJobModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Film className="w-5 h-5 text-emerald-600" />
                  Tạo Job Phát Sóng / Chọn Nhanh Gói Lịch
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động điền tiền, thời gian, số trận, số cam và kiểm soát ai chở đồ
                </p>
              </div>
              <button
                onClick={() => setShowCreateJobModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              {/* 1. CHỌN NHANH LOẠI LỊCH (COMBOBOX) */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label htmlFor="job-preset-combobox" className="text-slate-900 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>1. Chọn Nhanh Gói Tác Nghiệp (Combobox):</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">Tự động điền đơn giá và quy cách tác nghiệp</span>
                </div>

                <div className="relative">
                  <select
                    id="job-preset-combobox"
                    value={jobForm.match_type}
                    onChange={(e) => {
                      handleAutoPriceCalculation({ match_type: e.target.value, is_price_custom: false });
                    }}
                    className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-xs cursor-pointer"
                  >
                    <optgroup label="⚽ Lịch Bóng Đá Sân Cỏ / Futsal">
                      <option value="Giao hữu sân 7">⚽ Giao hữu sân 7 — 900.000 đ</option>
                      <option value="Giao hữu sân 5">⚽ Giao hữu sân 5 — 900.000 đ</option>
                      <option value="Giải sân 7">🏆 Giải sân 7 — 750.000 đ</option>
                      <option value="Giải sân 5">🏆 Giải sân 5 — 650.000 đ</option>
                      <option value="Giải futsal">⚡ Giải futsal — 650.000 đ</option>
                      <option value="Giải sân 11">🏟️ Giải sân 11 — 800.000 đ</option>
                      <option value="Giao hữu sân 11">⚽ Giao hữu sân 11 — 1.000.000 đ</option>
                    </optgroup>
                    <optgroup label="🎪 Sự Kiện Ngoài Trời & Trong Nhà">
                      <option value="Sự kiện ngoài trời">🎪 Sự kiện ngoài trời — 1.500.000 đ</option>
                      <option value="Sự kiện trong nhà">🏛️ Sự kiện trong nhà — 1.200.000 đ</option>
                    </optgroup>
                    <optgroup label="🎨 Thiết Kế & Hậu Kỳ (Media & Post-Production)">
                      <option value="Design (Thiết kế)">🎨 Design (Thiết kế) — [Nội bộ: 0đ khách, chỉ trả công NV]</option>
                      <option value="Chỉnh ảnh">📸 Chỉnh ảnh — 300.000 đ</option>
                      <option value="Edit video">🎬 Edit video — 500.000 đ</option>
                      <option value="Edit highlight">✂️ Edit highlight — 400.000 đ</option>
                    </optgroup>
                    <optgroup label="✏️ Khác">
                      <option value="Công việc tự nhập...">✏️ Công việc tự nhập (Tuỳ chỉnh)...</option>
                    </optgroup>
                  </select>
                </div>

                {jobForm.match_type === 'Design (Thiết kế)' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center gap-2">
                    <span className="text-base">🎨</span>
                    <div>
                      <strong className="font-bold">Lịch Design Nội Bộ:</strong> Không thu tiền khách ngoài (0đ). Phân bổ lịch trực tiếp cho Designer bên dưới để tính lương/tiền công thực nhận.
                    </div>
                  </div>
                )}

                {jobForm.match_type === 'Công việc tự nhập...' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Nhập tên công việc cụ thể (VD: Quay recap gala tất niên, highlight giải công ty...)"
                      value={jobForm.custom_match_type}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobForm((prev) => ({ ...prev, custom_match_type: val }));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* 2. THÔNG SỐ: SỐ TRẬN, SỐ SÂN, SỐ CAM, CÓ CHỤP HÌNH */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Quy Mô & Dịch Vụ Đi Kèm:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Số Trận (Default: 1)</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.match_count}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        handleAutoPriceCalculation({ match_count: val });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Số Sân (Default: 1)</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.pitch_count}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        handleAutoPriceCalculation({ pitch_count: val });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Số Máy Cam (Default: 1)</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.camera_count}
                      onChange={(e) => setJobForm({ ...jobForm, camera_count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* CÓ CHỤP HÌNH CHECKBOX VÀ PHỤ THU 300K-400K */}
                  <div className="flex flex-col justify-end">
                    <label
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-all ${jobForm.has_photo
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={jobForm.has_photo}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleAutoPriceCalculation({ has_photo: checked });
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[11px]">Có Chụp Hình</span>
                      </div>
                    </label>
                  </div>
                </div>

                {jobForm.has_photo && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 bg-purple-50/70 p-2 rounded-xl border border-purple-200">
                    <span className="font-semibold">Mức phụ thu gói chụp ảnh:</span>
                    <select
                      value={jobForm.photo_fee}
                      onChange={(e) => {
                        handleAutoPriceCalculation({ photo_fee: e.target.value });
                      }}
                      className="bg-white border border-purple-300 rounded-lg px-2 py-1 font-mono font-bold text-purple-900 text-xs"
                    >
                      <option value="300000">+300,000 đ</option>
                      <option value="350000">+350,000 đ (Khuyên dùng)</option>
                      <option value="400000">+400,000 đ</option>
                    </select>
                    <span className="text-purple-700 italic">Đã tự động cộng vào tổng tiền phải thu bên dưới</span>
                  </div>
                )}
              </div>

              {/* 3. ĐỊA ĐIỂM: LOAD SÂN DB HOẶC TỰ NHẬP SÂN MỚI (LƯU DB) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold">3. Địa Điểm / Sân Bóng Tác Nghiệp *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !jobForm.is_new_location;
                      setJobForm((prev) => ({ ...prev, is_new_location: next }));
                      handleAutoPriceCalculation({ is_new_location: next });
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    {jobForm.is_new_location ? '← Chọn từ 18 sân có sẵn' : '➕ Nhập sân mới (Lưu tự động vào DB)'}
                  </button>
                </div>

                {!jobForm.is_new_location ? (
                  <select
                    value={jobForm.location_id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      handleAutoPriceCalculation({ location_id: id });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Nhập tên sân bóng mới (VD: Sân bóng Chuyên Việt, Quận 7...)"
                      value={jobForm.new_location_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobForm((prev) => ({ ...prev, new_location_name: val }));
                        handleAutoPriceCalculation({ new_location_name: val });
                      }}
                      className="w-full bg-emerald-50/50 border-2 border-emerald-400 rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-bold placeholder-slate-400"
                    />
                    <div className="text-[10px] text-emerald-700 font-medium">
                      ✓ Sân bóng mới này sẽ được tự động lưu vào Database để sử dụng cho các lần sau.
                    </div>
                  </div>
                )}

                {/* Field Pick Vị Trí Sân Bóng & Lưu Tọa Độ */}
                <div className="mt-2 p-3 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span>Vị trí sân bóng:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {jobForm.location_lat && jobForm.location_lng ? (
                        <span className="font-mono text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                          📍 {Number(jobForm.location_lat).toFixed(4)}, {Number(jobForm.location_lng).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Chưa ghim toạ độ</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const locName = jobForm.is_new_location ? jobForm.new_location_name : selectedLocation?.name;
                          setLocationPickerConfig({
                            isOpen: true,
                            venueName: locName || 'Sân bóng',
                            initialAddress: jobForm.location_address || selectedLocation?.address || '',
                            initialLat: jobForm.location_lat ?? selectedLocation?.latitude ?? 10.78,
                            initialLng: jobForm.location_lng ?? selectedLocation?.longitude ?? 106.65,
                            onConfirm: (data) => {
                              setJobForm((prev) => ({
                                ...prev,
                                location_address: data.address,
                                location_lat: data.latitude,
                                location_lng: data.longitude,
                              }));
                            },
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Chọn vị trí bản đồ</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nhập địa chỉ hoặc vị trí cụ thể của sân..."
                      value={jobForm.location_address || ''}
                      onChange={(e) => setJobForm((prev) => ({ ...prev, location_address: e.target.value }))}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-rose-500"
                    />
                    {!jobForm.is_new_location && (
                      <button
                        type="button"
                        disabled={isSavingLoc}
                        onClick={() => handleSaveLocationToDB(Number(jobForm.location_id), jobForm.location_address, jobForm.location_lat, jobForm.location_lng)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        {isSavingLoc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>{savedLocSuccessId === Number(jobForm.location_id) ? '✓ Đã lưu vị trí!' : 'Lưu vị trí sân'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* District matching recommendation tip */}
              {selectedLocation && !jobForm.is_new_location && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Sân đã chọn: <strong>{selectedLocation.name}</strong>. Hệ thống tự động gắn nhãn{' '}
                    <span className="font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                      ⚡ Gần sân
                    </span>{' '}
                    cho nhân viên ở gần để tối ưu chi phí di chuyển.
                  </span>
                </div>
              )}

              {/* 4. THỜI GIAN: NGÀY, GIỜ BẮT ĐẦU, SỐ TRẬN / SỐ GIỜ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày Thi Đấu *</label>
                  <input
                    type="date"
                    required
                    value={jobForm.date}
                    onChange={(e) => setJobForm({ ...jobForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giờ Bắt Đầu *</label>
                  <input
                    type="time"
                    required
                    value={jobForm.start_time_val}
                    onChange={(e) => setJobForm({ ...jobForm, start_time_val: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Thời Lượng (Số giờ ca) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={jobForm.duration_hours}
                    onChange={(e) => setJobForm({ ...jobForm, duration_hours: parseFloat(e.target.value) || 1.5 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* TIÊU ĐỀ JOB (TỰ SINH HOẶC CHỈNH TAY) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tiêu Đề Trận Đấu / Job *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giao hữu sân 7 - Sân bóng Prolux"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              {/* 5. ĐƠN GIÁ LIVESTREAM, PHỤ THU CHỤP ẢNH & TỔNG TIỀN PHẢI THU */}
              <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl space-y-3">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
                  <span>5. Chi Tiết Giá & Đặt Cọc (Đơn giá mặc định, sửa được tùy ý):</span>
                  <span className="text-[10px] text-amber-700 font-normal">Tự động tính theo loại lịch + phụ thu ảnh</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      Đơn Giá Live (VNĐ) *
                    </label>
                    <input
                      type="number"
                      required
                      value={jobForm.live_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleAutoPriceCalculation({ live_price: val, is_price_custom: false });
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Mặc định theo loại lịch, sửa tùy ý</span>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      Phụ Thu Chụp Hình (VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={!jobForm.has_photo}
                      value={jobForm.photo_fee}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleAutoPriceCalculation({ photo_fee: val, is_price_custom: false });
                      }}
                      className={`w-full border rounded-xl px-3 py-2 font-mono font-bold text-xs focus:outline-none ${jobForm.has_photo
                          ? 'bg-white border-purple-300 text-purple-900 focus:border-purple-500'
                          : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    />
                    <span className="text-[10px] text-slate-500">
                      {jobForm.has_photo ? 'Cộng thêm nếu có chụp hình' : 'Tick "Có Chụp Hình" để mở'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-black mb-1">
                      Tổng Thu Hợp Đồng (VNĐ) *
                    </label>
                    <input
                      type="number"
                      required
                      value={jobForm.price}
                      onChange={(e) => {
                        setJobForm({ ...jobForm, price: e.target.value, is_price_custom: true });
                      }}
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 text-slate-900 font-mono font-black text-sm focus:outline-none focus:border-emerald-600"
                    />
                    <span className="text-[10px] text-emerald-700 font-bold">Tự động cộng live + ảnh (sửa được)</span>
                  </div>
                </div>

                {/* ĐÃ NHẬN TIỀN CỌC */}
                <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.is_deposited}
                      onChange={(e) => setJobForm({ ...jobForm, is_deposited: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Đã Nhận Tiền Cọc Của Khách</span>
                  </label>

                  {jobForm.is_deposited && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-medium">Số tiền cọc:</span>
                      <input
                        type="number"
                        placeholder="Số tiền cọc (VD: 300000)"
                        value={jobForm.deposit_amount}
                        onChange={(e) => setJobForm({ ...jobForm, deposit_amount: e.target.value })}
                        className="w-36 bg-white border border-emerald-400 rounded-xl px-3 py-1 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 6. PHÂN CÔNG NHÂN SỰ & VAI TRÒ (HỖ TRỢ CẢ ADMIN TỰ PHÂN CÔNG & NHÂN VIÊN NGOÀI) */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">Phân Công Nhân Sự (Admin, Nội bộ & Gọi Ngoài)</span>
                    <p className="text-[10px] text-slate-500">Admin có thể tự nhận ca tác nghiệp hoặc phân công nhân viên / CTV ngoài</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentUser?.id && (
                      <button
                        type="button"
                        onClick={handleAssignSelfToJobForm}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-purple-500 cursor-pointer"
                        title="Tự thêm tôi vào danh sách tác nghiệp trận này"
                      >
                        <span>👑</span>
                        <span>+ Tự nhận ca ({currentUser.name})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setJobForm({
                          ...jobForm,
                          staff: [
                            ...jobForm.staff,
                            {
                              user_id: users[0]?.id || 1,
                              duty: 'CAMERAMAN',
                              payout_amount: getDefaultStaffPayout('CAMERAMAN', jobForm.match_count),
                            },
                          ],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-emerald-500 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>+ Thêm Nhân Sự Nội Bộ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJobForm({
                          ...jobForm,
                          staff: [
                            ...jobForm.staff,
                            {
                              user_id: null,
                              is_external: true,
                              external_name: '',
                              external_duty: 'Quay phim ngoài',
                              duty: 'CAMERAMAN',
                              payout_amount: getDefaultStaffPayout('CAMERAMAN', jobForm.match_count),
                            },
                          ],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-amber-500 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Gọi Nhân Sự Ngoài</span>
                    </button>
                  </div>
                </div>

                {jobForm.staff.map((s, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {/* User Selection or External Inputs */}
                    {!s.is_external ? (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <select
                          value={s.user_id || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...jobForm.staff];
                            if (val === 'EXTERNAL') {
                              updated[idx].is_external = true;
                              updated[idx].user_id = null;
                              updated[idx].external_name = '';
                              updated[idx].external_duty = 'Quay phim';
                            } else {
                              updated[idx].user_id = Number(val);
                              const selectedU = users.find((u) => u.id === Number(val));
                              if (selectedU) {
                                const suggestedDuty = getSuggestedDutyForUser(selectedU);
                                updated[idx].duty = suggestedDuty;
                                updated[idx].payout_amount = getDefaultStaffPayout(suggestedDuty, jobForm.match_count);
                              }
                            }
                            setJobForm({ ...jobForm, staff: updated });
                          }}
                          className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium text-xs truncate"
                        >
                          {users.map((u) => {
                            const isNear = isStaffNearLocation(u.address_district);
                            const isMe = u.id === currentUser?.id;
                            const isAdmin = u.role === 'ADMIN';
                            return (
                              <option key={u.id} value={u.id}>
                                {isMe ? '⭐ [TÔI] ' : isAdmin ? '👑 [ADMIN] ' : ''}
                                {u.name} {u.address_district ? `(${u.address_district})` : ''} {u.skills ? `• [${u.skills}]` : ''} {isNear ? '⚡ [GẦN SÂN]' : ''}
                              </option>
                            );
                          })}
                          <option value="EXTERNAL">👤 [+ Nhân sự gọi ngoài / CTV ngoài...]</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="flex-1 min-w-0 flex gap-1.5">
                          <input
                            type="text"
                            required
                            placeholder="Tên nhân viên ngoài (VD: Anh Hùng, Tuấn Cam...)"
                            value={s.external_name || ''}
                            onChange={(e) => {
                              const updated = [...jobForm.staff];
                              updated[idx].external_name = e.target.value;
                              setJobForm({ ...jobForm, staff: updated });
                            }}
                            className="flex-1 min-w-0 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs placeholder-slate-400"
                          />
                          <input
                            type="text"
                            placeholder="Vai trò ngoài (VD: Cam 2, Chụp ảnh...)"
                            value={s.external_duty || ''}
                            onChange={(e) => {
                              const updated = [...jobForm.staff];
                              updated[idx].external_duty = e.target.value;
                              setJobForm({ ...jobForm, staff: updated });
                            }}
                            className="w-28 shrink-0 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs placeholder-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...jobForm.staff];
                            updated[idx].is_external = false;
                            updated[idx].user_id = users[0]?.id || 1;
                            setJobForm({ ...jobForm, staff: updated });
                          }}
                          className="text-[10px] text-blue-600 hover:underline shrink-0"
                        >
                          Chọn nv nội bộ
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <select
                        value={s.duty}
                        onChange={(e) => {
                          const newDuty = e.target.value;
                          const updated = [...jobForm.staff];
                          updated[idx].duty = newDuty;
                          updated[idx].payout_amount = getDefaultStaffPayout(newDuty, jobForm.match_count);
                          setJobForm({ ...jobForm, staff: updated });
                        }}
                        className="w-40 sm:w-44 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-semibold text-[11px]"
                        title="Chọn vai trò tác nghiệp (sẽ tự động gợi ý lương mặc định theo số trận)"
                      >
                        <option value="CASTER">🎙️ Bình luận viên (300k/trận)</option>
                        <option value="CAMERAMAN">🎥 Quay phim (200k/trận)</option>
                        <option value="PHOTOGRAPHER">📸 Chụp hình (400k/trận)</option>
                        <option value="VMIX_OPERATOR">💻 Kỹ thuật vMix (300k/trận)</option>
                        <option value="SUPPORT">🛠️ Hỗ trợ kỹ thuật (200k/trận)</option>
                      </select>

                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          placeholder="Tiền công"
                          value={s.payout_amount}
                          onChange={(e) => {
                            const updated = [...jobForm.staff];
                            updated[idx].payout_amount = parseFloat(e.target.value) || 0;
                            setJobForm({ ...jobForm, staff: updated });
                          }}
                          className="w-20 bg-transparent text-slate-900 font-mono font-bold text-xs outline-none"
                          title="Tiền công trả cho nhân sự (có thể sửa tùy ý)"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">đ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = jobForm.staff.filter((_, i) => i !== idx);
                          setJobForm({ ...jobForm, staff: updated });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-colors font-bold text-sm shrink-0"
                        title="Xóa nhân sự này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 7. PHÂN CÔNG THIẾT BỊ & CHỌN NHANH CÙNG LÚC */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>7. Phân Công Thiết Bị & Chỉ Định Người Chở</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Chọn nhanh cả bộ (Combo) hoặc tích chọn nhiều món cùng lúc để gán ngay cho nhân sự
                    </p>
                  </div>
                </div>

                {/* KHUNG GÁN NHIỀU THIẾT BỊ CÙNG LÚC (BATCH ALLOCATION TOOL) */}
                <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gán Nhanh Nhiều Món Cùng Lúc:</span>
                      </span>
                    </div>

                    {/* Quick Combo Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('live_1cam', false)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: 1 PC vMix, 1 Máy quay, 1 Chân, 1 Loa, 1 Dây"
                      >
                        ⚡ Bộ Live 1 Cam
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('live_2cam', false)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: 1 PC vMix, 2 Máy quay, 2 Chân, 1 Loa, 2 Dây"
                      >
                        ⚡ Bộ Live 2 Cam
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('photoshoot', false)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: Máy quay/ảnh + Chân + Dây"
                      >
                        ⚡ Bộ Chụp Ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('all_available', false)}
                        className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold hover:bg-emerald-200"
                      >
                        ☑️ Chọn Hết Hàng Rảnh
                      </button>
                      {batchSelectedEquipIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectEquipCombo('clear', false)}
                          className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100"
                        >
                          ✕ Bỏ chọn
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-select equipment checklist */}
                  <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {equipments.map((eq) => {
                      const isTicked = batchSelectedEquipIds.includes(eq.id);
                      const isAssigned = jobForm.equipment_assignments.some((ea) => ea.equipment_id === eq.id);
                      const isAvail = eq.status === 'AVAILABLE';
                      const busyReason = checkEquipmentBusy(eq.id);

                      return (
                        <div
                          key={eq.id}
                          onClick={() => handleToggleBatchEquipWithCheck(eq.id, false)}
                          className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-all select-none ${
                            isTicked
                              ? 'bg-emerald-100/90 border-emerald-500 font-bold text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                              : busyReason
                              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70 text-slate-800'
                              : isAssigned
                              ? 'bg-slate-100 border-slate-300 text-slate-500 opacity-60'
                              : 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isTicked}
                            onChange={() => {}} // Controlled via parent div onClick
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 pointer-events-none"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="font-bold truncate text-[11px] flex items-center justify-between">
                              <span className="truncate">{eq.name}</span>
                              {busyReason && !isTicked && (
                                <span className="text-[8px] bg-amber-200 text-amber-900 font-black px-1 rounded ml-1 shrink-0" title={busyReason}>
                                  ⚠️ BẬN
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-between">
                              <span>{eq.category?.name}</span>
                              {isAssigned && <span className="text-amber-700 font-bold">✓ Đã gán</span>}
                              {!isAssigned && !isAvail && <span className="text-rose-600 font-bold">[{eq.status}]</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Bar: Select Carrier & 1-Click Apply */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-emerald-200">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-emerald-950 whitespace-nowrap">Chỉ định chở:</span>
                      <select
                        value={batchCarrierId}
                        onChange={(e) => setBatchCarrierId(e.target.value ? Number(e.target.value) : '')}
                        className="bg-white border-2 border-emerald-400 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                      >
                        <option value="">-- Chọn người chở ({currentUser?.name || 'Tôi'} mặc định) --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.id === currentUser?.id ? '⭐ [TÔI] ' : u.role === 'ADMIN' ? '👑 [ADMIN] ' : ''}
                            {u.name} {u.address_district ? `(${u.address_district})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyBatchEquipments(false)}
                      disabled={batchSelectedEquipIds.length === 0}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>+ Gán {batchSelectedEquipIds.length} Thiết Bị Đã Chọn</span>
                    </button>
                  </div>
                </div>

                {/* DANH SÁCH THIẾT BỊ ĐÃ GÁN (KÈM GHI CHÚ VÀ XÓA TỪNG MÓN) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Danh sách thiết bị trong lịch này ({jobForm.equipment_assignments.length} món):</span>
                    {currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (equipments.length > 0) {
                            setJobForm({
                              ...jobForm,
                              equipment_assignments: [
                                ...jobForm.equipment_assignments,
                                {
                                  equipment_id: equipments[0].id,
                                  transport_by_user_id: currentUser.id,
                                  handover_notes: '',
                                },
                              ],
                            });
                          }
                        }}
                        className="text-[11px] text-amber-800 hover:underline font-bold"
                      >
                        + Thêm lẻ 1 món
                      </button>
                    )}
                  </div>

                  {jobForm.equipment_assignments.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
                      Chưa có thiết bị nào được gán. Hãy dùng bảng chọn nhanh ở trên để chọn cùng lúc!
                    </div>
                  ) : (
                    jobForm.equipment_assignments.map((ea, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                      >
                        <select
                          value={ea.equipment_id}
                          onChange={(e) => {
                            const updated = [...jobForm.equipment_assignments];
                            updated[idx].equipment_id = Number(e.target.value);
                            setJobForm({ ...jobForm, equipment_assignments: updated });
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs"
                        >
                          {equipments.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              [{eq.category?.name}] {eq.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-500 font-semibold shrink-0">Chở đi:</span>
                          <select
                            value={ea.transport_by_user_id}
                            onChange={(e) => {
                              const updated = [...jobForm.equipment_assignments];
                              updated[idx].transport_by_user_id = Number(e.target.value);
                              setJobForm({ ...jobForm, equipment_assignments: updated });
                            }}
                            className="w-48 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs"
                          >
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.id === currentUser?.id ? '⭐ [TÔI] ' : u.role === 'ADMIN' ? '👑 [ADMIN] ' : ''}
                                {u.name} {u.address_district ? `(${u.address_district})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = jobForm.equipment_assignments.filter((_, i) => i !== idx);
                            setJobForm({ ...jobForm, equipment_assignments: updated });
                          }}
                          className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1 self-center bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Xóa phân công thiết bị này"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}

                  {/* Ghi chú chung vận chuyển thiết bị ở phía dưới */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ghi chú thiết bị & bàn giao chở chung cho ca làm:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Đồ để ở kho Gò Vấp, balo đỏ có 2 pin sạc, mang cuộn dây 50m, trả đồ trước 22h..."
                      value={jobForm.notes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobForm({
                          ...jobForm,
                          notes: val,
                          equipment_assignments: jobForm.equipment_assignments.map((item: any) => ({
                            ...item,
                            handover_notes: val,
                          })),
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  {/* Ảnh Đồ Cần Lấy (Admin chụp trước để nhân viên đối chiếu) */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ảnh đồ cần lấy (Admin chụp sẵn để NV đối chiếu):</span>
                      </span>
                      {jobForm.equipment_photo_url && (
                        <button
                          type="button"
                          onClick={() => setJobForm({ ...jobForm, equipment_photo_url: '' })}
                          className="text-rose-600 hover:text-rose-700 text-[10px] font-bold"
                        >
                          ✕ Xóa ảnh
                        </button>
                      )}
                    </label>

                    {jobForm.equipment_photo_url ? (
                      <div className="flex items-center gap-3 bg-blue-50/60 p-2 rounded-xl border border-blue-200">
                        <img
                          src={resolveMediaUrl(jobForm.equipment_photo_url)}
                          alt="Đồ cần lấy"
                          onError={handleMediaError}
                          onClick={() => setPreviewPhotoUrl(jobForm.equipment_photo_url)}
                          className="w-16 h-16 rounded-lg object-cover border border-blue-300 cursor-pointer hover:opacity-85 shadow-xs"
                          title="Bấm để xem phóng to"
                        />
                        <div className="flex-1 text-[11px] text-slate-600">
                          <span className="font-bold text-blue-900 block">✓ Đã lưu ảnh đồ chuẩn bị</span>
                          <span className="text-[10px] text-slate-500">Ảnh này sẽ hiển thị trực tiếp trên app của nhân viên khi nhận ca</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraModalConfig({
                              isOpen: true,
                              title: 'Chụp Ảnh Đồ Cần Lấy (Admin)',
                              onCapture: (file) => handleUploadJobEquipPhoto(file, false),
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📸 Chụp ảnh trực tiếp</span>
                        </button>
                        <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadJobEquipPhoto(f, false);
                            }}
                          />
                        </label>
                        {isUploadingEquipPhoto && (
                          <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải ảnh...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CONFLICT CHECK WARNING BANNER */}
              {conflictResult.hasConflict && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>CẢNH BÁO XUNG ĐỘT LỊCH TRÌNH (CONFLICT DETECTED)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    Hệ thống phát hiện các nhân sự hoặc thiết bị dưới đây đã được gán vào Job khác trong cùng khung giờ:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs font-semibold text-rose-900">
                    {conflictResult.conflicts.map((c, i) => (
                      <li key={i}>
                        <strong>{c.name}</strong> trùng với: <em>"{c.conflictingJobTitle}"</em> ({c.timeRange})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Xác Nhận Tạo Lịch ({jobForm.price?.toLocaleString()} đ)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM THIẾT BỊ MỚI ================= */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Thêm Thiết Bị Vào Kho
              </h2>
              <button
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tên Thiết Bị & Đặc Điểm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Dell Vmix 2 (Balo đỏ)"
                  value={equipForm.name}
                  onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phân Loại Thiết Bị</label>
                <select
                  value={equipForm.category_id}
                  onChange={(e) => setEquipForm({ ...equipForm, category_id: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {equipmentCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mã QR Code (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="VD: QR-DELL-VMIX-02"
                  value={equipForm.qr_code}
                  onChange={(e) => setEquipForm({ ...equipForm, qr_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">📍 Vị Trí Lưu Trữ Ban Đầu</label>
                <input
                  type="text"
                  placeholder="VD: Kho văn phòng, Sân bóng đá Hoàn Anh..."
                  value={equipForm.current_location}
                  onChange={(e) => setEquipForm({ ...equipForm, current_location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ảnh Thiết Bị</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {equipUploadPreview ? (
                    <img
                      src={equipUploadPreview}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-300 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraModalConfig({
                            isOpen: true,
                            title: 'Chụp Ảnh Thiết Bị Mới',
                            onCapture: (file) => {
                              setEquipUploadFile(file);
                              setEquipUploadPreview(URL.createObjectURL(file));
                            },
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 Chụp ảnh trực tiếp</span>
                      </button>
                      <label className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn từ máy</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEquipUploadFile(file);
                              setEquipUploadPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">Chụp live bằng camera hoặc chọn ảnh từ máy để lưu vào hệ thống</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isEquipUploading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  {isEquipUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEquipUploading ? 'Đang lưu vào kho...' : 'Lưu Vào Kho'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM GIAO DỊCH THU / CHI & MUA SẮM VẬT TƯ ================= */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-800">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {txForm.type === 'EXPENSE' ? 'Ghi Nhận Khoản Chi / Mua Sắm' : 'Ghi Nhận Khoản Thu Mới'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {txForm.type === 'EXPENSE' ? 'Mua thiết bị, phụ kiện, xăng xe, bảo trì hoặc chi phí khác' : 'Dòng tiền thực thu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTransactionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'EXPENSE' })}
                  className={`py-2 rounded-xl font-black border text-xs transition-all ${
                    txForm.type === 'EXPENSE'
                      ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs ring-2 ring-rose-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  🔴 Khoản Chi (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'INCOME' })}
                  className={`py-2 rounded-xl font-black border text-xs transition-all ${
                    txForm.type === 'INCOME'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  🟢 Khoản Thu (+)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phân Loại Giao Dịch *</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="EQUIPMENT_PURCHASE">📦 Mua sắm thiết bị mới (Dây, pin, mic...)</option>
                    <option value="MAINTENANCE">🛠️ Bảo trì / sửa chữa máy móc</option>
                    <option value="TRAVEL">🛵 Xăng xe / di chuyển tác nghiệp</option>
                    <option value="OTHER">☕ Ăn uống / Nước nôi / Chi khác</option>
                    <option value="CLIENT_PAYMENT">💰 Thu tiền hợp đồng khách hàng</option>
                    <option value="STAFF_SALARY">👥 Chi trả tiền công nhân sự</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hình Thức Thanh Toán</label>
                  <select
                    value={txForm.payment_method}
                    onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="BANK_TRANSFER">💳 Chuyển khoản ngân hàng</option>
                    <option value="CASH">💵 Tiền mặt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số Tiền (VNĐ) *</label>
                <input
                  type="number"
                  required
                  placeholder="VD: 350000"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nội Dung Chi Tiết / Tên Đồ Mua *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua 2 cuộn dây HDMI 15m, mua pin AA cho micro, tiền nước..."
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Gắn Với Trận Đấu (Tùy chọn)</label>
                <select
                  value={txForm.job_id}
                  onChange={(e) => setTxForm({ ...txForm, job_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">-- Kho / Văn phòng / Chi phí chung --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({new Date(j.start_time).toLocaleDateString('vi-VN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ảnh Hóa Đơn / Bill Mua Hàng */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ảnh Hóa Đơn / Bill Mua Hàng / Chuyển Khoản:</span>
                  </span>
                  {txReceiptPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setTxReceiptFile(null);
                        setTxReceiptPreview(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 text-[10px] font-bold"
                    >
                      ✕ Bỏ ảnh
                    </button>
                  )}
                </label>

                {txReceiptPreview ? (
                  <div className="flex items-center gap-3 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                    <img
                      src={txReceiptPreview}
                      alt="Bill mua hàng"
                      onClick={() => setPreviewPhotoUrl(txReceiptPreview)}
                      className="w-16 h-16 rounded-xl object-cover border border-amber-300 cursor-pointer hover:opacity-85 shadow-xs"
                      title="Bấm để xem phóng to"
                    />
                    <div className="flex-1 text-[11px] text-slate-700">
                      <span className="font-bold text-amber-950 block">✓ Đã đính kèm ảnh hóa đơn</span>
                      <span className="text-[10px] text-slate-500">Ảnh này sẽ lưu lại để phục vụ đối soát chi phí</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalConfig({
                          isOpen: true,
                          title: 'Chụp Ảnh Hóa Đơn / Bill Mua Hàng',
                          onCapture: (file) => {
                            setTxReceiptFile(file);
                            setTxReceiptPreview(URL.createObjectURL(file));
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Chụp bill trực tiếp</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setTxReceiptFile(f);
                            setTxReceiptPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isTxSaving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {isTxSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isTxSaving ? 'Đang lưu...' : 'LƯU KHOẢN CHI'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THU TIỀN HỢP ĐỒNG KHÁCH HÀNG ================= */}
      {paymentModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 rounded-2xl text-emerald-800">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Xác Nhận Thu Tiền Khách Hàng</h2>
                  <p className="text-xs text-slate-500">Cập nhật tiến độ thu tiền hợp đồng trận đấu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalJob(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Thông tin tóm tắt trận đấu */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-black text-slate-900 text-sm">{paymentModalJob.title}</div>
              <div className="text-slate-600">
                🏟️ <strong>Sân bóng:</strong> {paymentModalJob.location?.name}
              </div>
              <div className="text-slate-600">
                🕒 <strong>Ngày thi đấu:</strong> {new Date(paymentModalJob.start_time).toLocaleDateString('vi-VN')}
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">Tổng giá trị hợp đồng:</span>
                <span className="font-mono font-black text-amber-700 text-base">
                  {paymentModalJob.price?.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Trạng Thái Thanh Toán *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm({
                        ...paymentForm,
                        payment_status: 'PAID',
                        paid_amount: paymentModalJob.price.toString(),
                      });
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center font-black border transition-all ${
                      paymentForm.payment_status === 'PAID'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ ĐÃ THU ĐỦ 100%
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const curDeposit = paymentModalJob.paid_amount || paymentModalJob.deposit_amount || Math.round(paymentModalJob.price / 2);
                      setPaymentForm({
                        ...paymentForm,
                        payment_status: 'PARTIAL',
                        paid_amount: curDeposit.toString(),
                      });
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center font-black border transition-all ${
                      paymentForm.payment_status === 'PARTIAL'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🟡 ĐÃ CỌC 1 PHẦN
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm({
                        ...paymentForm,
                        payment_status: 'UNPAID',
                        paid_amount: '0',
                      });
                    }}
                    className={`py-2 px-1.5 rounded-xl text-center font-black border transition-all ${
                      paymentForm.payment_status === 'UNPAID'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm ring-2 ring-rose-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🔴 CHƯA THU
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Số Tiền Thực Thu (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    placeholder="VD: 900000"
                    value={paymentForm.paid_amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Số Tiền Còn Nợ Khách</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-black text-sm text-rose-600 flex items-center justify-between">
                    <span>
                      {Math.max(0, paymentModalJob.price - (parseFloat(paymentForm.paid_amount) || 0)).toLocaleString('vi-VN')} đ
                    </span>
                    {(parseFloat(paymentForm.paid_amount) || 0) >= paymentModalJob.price ? (
                      <span className="text-[10px] text-emerald-700 font-sans font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                        Hết nợ
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-700 font-sans font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                        Còn thiếu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Thu Tiền</label>
                <input
                  type="text"
                  placeholder="VD: Khách chuyển khoản VCB lúc 15h, hẹn cuối tuần tất toán..."
                  value={paymentForm.payment_notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Ảnh Bill Chuyển Khoản của Khách */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ảnh Bill Chuyển Khoản Của Khách:</span>
                  </span>
                  {(paymentProofPreview || paymentModalJob.payment_proof_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentProofFile(null);
                        setPaymentProofPreview(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 text-[10px] font-bold"
                    >
                      ✕ Bỏ ảnh
                    </button>
                  )}
                </label>

                {paymentProofPreview || paymentModalJob.payment_proof_url ? (
                  <div className="flex items-center gap-3 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                    <img
                      src={paymentProofPreview || resolveMediaUrl(paymentModalJob.payment_proof_url)}
                      alt="Bill khách"
                      onClick={() => setPreviewPhotoUrl(paymentProofPreview || paymentModalJob.payment_proof_url)}
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-300 cursor-pointer hover:opacity-85 shadow-xs"
                      title="Bấm để xem phóng to"
                    />
                    <div className="flex-1 text-[11px] text-slate-700">
                      <span className="font-bold text-emerald-950 block">✓ Đã có ảnh bill chuyển khoản</span>
                      <span className="text-[10px] text-slate-500">Bấm vào ảnh để phóng to đối soát</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalConfig({
                          isOpen: true,
                          title: 'Chụp Ảnh Bill Chuyển Khoản Khách',
                          onCapture: (file) => {
                            setPaymentProofFile(file);
                            setPaymentProofPreview(URL.createObjectURL(file));
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Chụp bill trực tiếp</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setPaymentProofFile(f);
                            setPaymentProofPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isSubmittingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSubmittingPayment ? 'Đang lưu...' : 'LƯU THANH TOÁN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TRẢ LƯƠNG NHÂN SỰ ================= */}
      {payoutModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in zoom-in-95">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 rounded-2xl text-purple-800">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Chi Trả Tiền Công / Lương Nhân Sự</h2>
                  <p className="text-xs text-slate-500">Đính kèm ảnh bill chuyển khoản để lưu trữ & gửi cho nhân viên</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalStaff(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Thông tin nhân viên */}
            <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={resolveAvatarUrl(payoutModalStaff.user.avatar_url)}
                  onError={handleAvatarError}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-300 shrink-0"
                />
                <div>
                  <div className="font-black text-slate-900 text-sm">{payoutModalStaff.user.name}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    📞 {payoutModalStaff.user.phone || 'Chưa có SĐT'} • 📍 {payoutModalStaff.user.address_district || 'TP.HCM'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-purple-700 font-bold uppercase block">Còn nợ lương</span>
                <span className="font-mono font-black text-purple-800 text-sm">
                  {payoutModalStaff.total_unpaid?.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-3.5 text-xs">
              {/* Chọn các ca làm để thanh toán */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 font-bold">Chọn Ca Làm Cần Chi Trả:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = (payoutModalStaff.assignments || []).map((a: any) => a.id);
                        setSelectedPayoutAssignmentIds(allIds);
                      }}
                      className="text-[10px] text-purple-700 hover:underline font-bold"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPayoutAssignmentIds([])}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {payoutModalStaff.assignments?.map((a: any) => {
                    const isChecked = selectedPayoutAssignmentIds.includes(a.id);
                    const isAlreadyPaid = a.payout_status === 'PAID';

                    return (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-purple-100/70 border-purple-300 font-bold'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPayoutAssignmentIds([...selectedPayoutAssignmentIds, a.id]);
                              } else {
                                setSelectedPayoutAssignmentIds(selectedPayoutAssignmentIds.filter((id) => id !== a.id));
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <div className="min-w-0">
                            <div className="text-slate-900 font-bold text-xs truncate">
                              {a.job?.title || 'Trận đấu'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {a.job?.start_time ? new Date(a.job.start_time).toLocaleDateString('vi-VN') : ''} • {getDutyLabel(a.duty)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <div className="font-mono font-black text-slate-900">
                            {a.payout_amount?.toLocaleString('vi-VN')} đ
                          </div>
                          {isAlreadyPaid && (
                            <span className="text-[9px] text-emerald-700 font-bold">✓ Đã trả</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tổng tiền đợt chi này */}
              {(() => {
                const totalSelectedAmount = (payoutModalStaff.assignments || [])
                  .filter((a: any) => selectedPayoutAssignmentIds.includes(a.id))
                  .reduce((sum: number, a: any) => sum + (a.payout_amount || 0), 0);

                return (
                  <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 flex items-center justify-between font-bold">
                    <span className="text-purple-950">
                      Tổng tiền thanh toán ({selectedPayoutAssignmentIds.length} ca):
                    </span>
                    <span className="font-mono font-black text-purple-800 text-base">
                      {totalSelectedAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Chi Lương</label>
                <input
                  type="text"
                  placeholder="VD: Chuyển khoản VCB đuôi 888, trừ 50k tạm ứng..."
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              {/* Ảnh Bill Chuyển Khoản Ngân Hàng */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ảnh Bill Chuyển Khoản Ngân Hàng Cho Nhân Viên:</span>
                  </span>
                  {payoutProofPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutProofFile(null);
                        setPayoutProofPreview(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 text-[10px] font-bold"
                    >
                      ✕ Bỏ ảnh
                    </button>
                  )}
                </label>

                {payoutProofPreview ? (
                  <div className="flex items-center gap-3 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200">
                    <img
                      src={payoutProofPreview}
                      alt="Bill CK"
                      onClick={() => setPreviewPhotoUrl(payoutProofPreview)}
                      className="w-16 h-16 rounded-xl object-cover border border-purple-300 cursor-pointer hover:opacity-85 shadow-xs"
                      title="Bấm để xem phóng to"
                    />
                    <div className="flex-1 text-[11px] text-slate-700">
                      <span className="font-bold text-purple-950 block">✓ Đã đính kèm ảnh bill chuyển khoản</span>
                      <span className="text-[10px] text-slate-500">Nhân viên sẽ xem được ảnh bill này trong app cá nhân</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalConfig({
                          isOpen: true,
                          title: 'Chụp Bill Chuyển Khoản Cho Nhân Sự',
                          onCapture: (file) => {
                            setPayoutProofFile(file);
                            setPayoutProofPreview(URL.createObjectURL(file));
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Chụp bill trực tiếp</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setPayoutProofFile(f);
                            setPayoutProofPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout || selectedPayoutAssignmentIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  {isSubmittingPayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSubmittingPayout ? 'Đang thanh toán...' : 'XÁC NHẬN CHI LƯƠNG'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TIẾT JOB ================= */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const statusInfo = getJobStatusBadge(selectedJobDetail.status);
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                  {selectedJobDetail.match_type && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {selectedJobDetail.match_type}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedJobDetail.title}</h2>
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div>🏟️ <strong>Sân bóng:</strong> {selectedJobDetail.location?.name}</div>
                <div>
                  ⏰ <strong>Thời gian:</strong>{' '}
                  {new Date(selectedJobDetail.start_time).toLocaleTimeString('vi-VN')} -{' '}
                  {new Date(selectedJobDetail.end_time).toLocaleTimeString('vi-VN')}{' '}
                  ({new Date(selectedJobDetail.start_time).toLocaleDateString('vi-VN')})
                </div>
                <div>
                  ⚽ <strong>Quy mô trận:</strong> {selectedJobDetail.match_count || 1} trận • {selectedJobDetail.pitch_count || 1} sân • {selectedJobDetail.camera_count || 1} cam
                  {selectedJobDetail.has_photo && ' • 📸 Có chụp hình'}
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      💰 <strong>Hợp đồng doanh thu:</strong>{' '}
                      <span className="font-mono text-amber-700 font-black">
                        {selectedJobDetail.price?.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {/* Trạng thái thu tiền & Nút thu tiền */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedJobDetail.payment_status === 'PAID' ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          ✓ ĐÃ THU ĐỦ
                        </span>
                      ) : selectedJobDetail.payment_status === 'PARTIAL' ? (
                        <span className="bg-amber-100 text-amber-950 border border-amber-300 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          🟡 ĐÃ CỌC: {(selectedJobDetail.paid_amount || selectedJobDetail.deposit_amount)?.toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          🔴 CHƯA THU
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(selectedJobDetail)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                        title="Cập nhật thu tiền & lưu bill khách"
                      >
                        {selectedJobDetail.payment_status === 'PAID' ? 'Sửa bill' : '✓ Thu tiền'}
                      </button>

                      {selectedJobDetail.payment_proof_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(selectedJobDetail.payment_proof_url)}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Xem ảnh bill khách chuyển khoản"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>Bill Khách</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedJobDetail.payment_notes && (
                    <div className="text-[10px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200">
                      💬 Ghi chú thu tiền: "{selectedJobDetail.payment_notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Banner: Admin tự phân công / Tham gia ca làm này */}
              {(() => {
                const myStaff = (selectedJobDetail.staff || []).find((s: any) => s.user_id === currentUser?.id);
                const myGears = (selectedJobDetail.equipmentAssignments || []).filter(
                  (ea: any) => ea.transport_by_user_id === currentUser?.id
                );
                if (myStaff || myGears.length > 0) {
                  return (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-purple-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👑</span>
                        <div>
                          <div className="font-extrabold text-xs">
                            Bạn ({currentUser?.name}) đang tham gia ca làm này!
                          </div>
                          <div className="text-[11px] text-purple-700">
                            {myStaff && `Vai trò: ${getDutyLabel(myStaff.duty)} • Thù lao: ${myStaff.payout_amount?.toLocaleString('vi-VN')} đ`}
                            {myGears.length > 0 && ` • 🛵 Chở ${myGears.length} món thiết bị`}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-purple-200/80 font-bold px-2 py-0.5 rounded-full text-purple-900">
                        Đã Phân Công
                      </span>
                    </div>
                  );
                } else if (currentUser?.id) {
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                      <div className="text-[11px] text-slate-600">
                        Bạn ({currentUser.name}) chưa có tên trong trận đấu này.
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDirectSelfAssign(selectedJobDetail.id)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                        title="Tự thêm tôi vào danh sách tác nghiệp trận này"
                      >
                        <span>👑</span>
                        <span>Tự Nhận Ca Này</span>
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Staff Assignments */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px]">Nhân Sự Phân Công</h4>
                <div className="space-y-1.5">
                  {selectedJobDetail.staff?.map((s: any) => {
                    const isStaffPaid = s.payout_status === 'PAID';
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-1.5"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">{s.user?.name || s.external_name}</span>
                            {s.user?.address_district && (
                              <span className="text-[10px] text-slate-500">({s.user.address_district})</span>
                            )}
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {getDutyLabel(s.duty)}
                            </span>
                          </div>
                          {s.payout_notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              💬 Lương: "{s.payout_notes}"
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="font-mono text-slate-900 font-black">
                            {s.payout_amount?.toLocaleString('vi-VN')} đ
                          </span>

                          {isStaffPaid ? (
                            <div className="flex items-center gap-1">
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                                ✓ ĐÃ TRẢ
                              </span>
                              {s.payout_proof_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhotoUrl(s.payout_proof_url)}
                                  className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-0.5"
                                  title="Xem bill chuyển khoản"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Bill CK</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="bg-purple-100 text-purple-900 border border-purple-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                              ⏳ CHƯA TRẢ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ảnh Thiết Bị Admin Soạn Sẵn */}
              {selectedJobDetail.equipment_photo_url && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ảnh đồ admin chuẩn bị sẵn cho ca làm:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoUrl(selectedJobDetail.equipment_photo_url)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Phóng to ảnh
                    </button>
                  </div>
                  <div
                    className="relative rounded-xl overflow-hidden border border-blue-200 bg-slate-900 h-36 max-w-xs cursor-pointer group"
                    onClick={() => setPreviewPhotoUrl(selectedJobDetail.equipment_photo_url)}
                  >
                    <img
                      src={resolveMediaUrl(selectedJobDetail.equipment_photo_url)}
                      alt="Ảnh đồ admin chuẩn bị"
                      onError={handleMediaError}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                        🔍 Nhấn để xem chi tiết
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment Transport Assignments */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] flex items-center justify-between">
                  <span>Thiết Bị Gán Chở & Check-In ({selectedJobDetail.equipmentAssignments?.length || 0})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Nhấn ảnh để xem phóng to</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedJobDetail.equipmentAssignments?.map((ea: any) => (
                    <div
                      key={ea.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        {ea.equipment?.image_url ? (
                          <img
                            src={resolveMediaUrl(ea.equipment.image_url)}
                            onError={handleMediaError}
                            alt={ea.equipment.name}
                            onClick={() => setPreviewPhotoUrl(ea.equipment.image_url)}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Bấm để xem ảnh thiết bị"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{ea.equipment?.name}</div>
                          <div className="text-[10px] text-slate-500">
                            Người chở: <span className="text-amber-800 font-bold">{ea.transportByUser?.name}</span>
                            {ea.handover_notes && <span className="italic ml-1">({ea.handover_notes})</span>}
                          </div>
                          {/* Photo badges if available */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {ea.check_in_photo_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(ea.check_in_photo_url)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[9px] transition-colors"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Ảnh lấy đồ</span>
                              </button>
                            )}
                            {ea.check_out_photo_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoUrl(ea.check_out_photo_url)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[9px] transition-colors"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Ảnh trả đồ</span>
                              </button>
                            )}
                          </div>

                          {/* Location & staff checkout notes */}
                          {ea.return_location_name && (
                            <div className="mt-1 text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                              <span>📍 Bàn giao tại:</span>
                              <span className="bg-emerald-100 text-emerald-950 px-1.5 py-0.2 rounded font-extrabold">
                                {ea.return_location_name}
                              </span>
                            </div>
                          )}
                          {ea.check_out_notes && (
                            <div className="mt-0.5 text-[10px] bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200 italic">
                              💬 "{ea.check_out_notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-slate-200">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${ea.check_in_status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                          >
                            Lấy đồ: {ea.check_in_status === 'CONFIRMED' ? '✓ ĐÃ LẤY' : '⏳ CHỜ'}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${ea.check_out_status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-200 text-slate-700'
                              }`}
                          >
                            Trả đồ: {ea.check_out_status === 'CONFIRMED' ? '✓ ĐÃ TRẢ' : 'CHƯA'}
                          </span>
                        </div>
                        {ea.check_in_time && (
                          <span className="text-[9px] text-slate-500">
                            Lấy lúc: {new Date(ea.check_in_time).toLocaleTimeString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const job = selectedJobDetail;
                    setSelectedJobDetail(null);
                    handleOpenEditJob(job);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Lịch</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteJob(selectedJobDetail.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Lịch</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedJobDetail.status !== 'COMPLETED' ? (
                  <button
                    onClick={() => handleUpdateJobStatus(selectedJobDetail.id, 'COMPLETED')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                  >
                    Xác Nhận Hoàn Thành
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-bold">✓ Job đã hoàn thành</span>
                )}
                <button
                  onClick={() => setSelectedJobDetail(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA JOB (EDIT JOB MODAL) ================= */}
      {showEditJobModal && editingJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  Chỉnh Sửa Lịch Tác Nghiệp #{editingJob.id}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật thời gian, địa điểm, giá tiền, nhân sự & thiết bị
                </p>
              </div>
              <button
                onClick={() => setShowEditJobModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateJob} className="space-y-4 text-xs">
              {/* Chọn Nhanh Gói Tác Nghiệp (Combobox) */}
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 space-y-1.5">
                <label className="text-slate-900 font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Loại Gói Tác Nghiệp (Combobox):</span>
                </label>
                <select
                  value={editJobForm.match_type}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const preset = SCHEDULE_PRESETS.find((p) => p.name === chosen);
                    const defaultUnit = preset ? preset.defaultPrice : 0;
                    const isDesign = chosen === 'Design (Thiết kế)';
                    const newLivePrice = isDesign ? '0' : defaultUnit.toString();
                    const photoFee = editJobForm.has_photo && !isDesign ? parseFloat(editJobForm.photo_fee) || 350000 : 0;
                    const newTotal = isDesign ? 0 : defaultUnit * (editJobForm.match_count || 1) * (editJobForm.pitch_count || 1) + photoFee;

                    setEditJobForm({
                      ...editJobForm,
                      match_type: chosen,
                      live_price: newLivePrice,
                      price: newTotal.toString(),
                      has_photo: isDesign ? false : editJobForm.has_photo,
                    });
                  }}
                  className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <optgroup label="⚽ Lịch Bóng Đá Sân Cỏ / Futsal">
                    <option value="Giao hữu sân 7">⚽ Giao hữu sân 7 — 900.000 đ</option>
                    <option value="Giao hữu sân 5">⚽ Giao hữu sân 5 — 900.000 đ</option>
                    <option value="Giải sân 7">🏆 Giải sân 7 — 750.000 đ</option>
                    <option value="Giải sân 5">🏆 Giải sân 5 — 650.000 đ</option>
                    <option value="Giải futsal">⚡ Giải futsal — 650.000 đ</option>
                    <option value="Giải sân 11">🏟️ Giải sân 11 — 800.000 đ</option>
                    <option value="Giao hữu sân 11">⚽ Giao hữu sân 11 — 1.000.000 đ</option>
                  </optgroup>
                  <optgroup label="🎪 Sự Kiện Ngoài Trời & Trong Nhà">
                    <option value="Sự kiện ngoài trời">🎪 Sự kiện ngoài trời — 1.500.000 đ</option>
                    <option value="Sự kiện trong nhà">🏛️ Sự kiện trong nhà — 1.200.000 đ</option>
                  </optgroup>
                  <optgroup label="🎨 Thiết Kế & Hậu Kỳ (Media & Post-Production)">
                    <option value="Design (Thiết kế)">🎨 Design (Thiết kế) — [Nội bộ: 0đ khách, chỉ trả công NV]</option>
                    <option value="Chỉnh ảnh">📸 Chỉnh ảnh — 300.000 đ</option>
                    <option value="Edit video">🎬 Edit video — 500.000 đ</option>
                    <option value="Edit highlight">✂️ Edit highlight — 400.000 đ</option>
                  </optgroup>
                  <optgroup label="✏️ Khác">
                    <option value="Công việc tự nhập...">✏️ Công việc tự nhập (Tuỳ chỉnh)...</option>
                  </optgroup>
                </select>

                {editJobForm.match_type === 'Design (Thiết kế)' && (
                  <p className="text-[10px] text-purple-800 font-bold">
                    🎨 Gói Design Nội Bộ: Doanh thu 0đ, chỉ tính và thanh toán tiền công cho Designer.
                  </p>
                )}
              </div>

              {/* Tiêu đề & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Tiêu Đề Trận Đấu *</label>
                  <input
                    type="text"
                    required
                    value={editJobForm.title}
                    onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trạng Thái Job</label>
                  <select
                    value={editJobForm.status}
                    onChange={(e) => setEditJobForm({ ...editJobForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PENDING">⏳ Chờ thực hiện</option>
                    <option value="ASSIGNED">⚡ Đã phân công</option>
                    <option value="IN_PROGRESS">🔴 Đang diễn ra</option>
                    <option value="COMPLETED">✓ Đã hoàn thành</option>
                    <option value="CANCELLED">✕ Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Sân bóng & Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Sân Bóng *</label>
                  <select
                    value={editJobForm.location_id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const locObj = locations.find((l) => l.id === id);
                      setEditJobForm({
                        ...editJobForm,
                        location_id: id,
                        location_address: locObj?.address || '',
                        location_lat: locObj?.latitude ?? null,
                        location_lng: locObj?.longitude ?? null,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày Thi Đấu *</label>
                  <input
                    type="date"
                    required
                    value={editJobForm.date}
                    onChange={(e) => setEditJobForm({ ...editJobForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giờ Bắt Đầu *</label>
                  <input
                    type="time"
                    required
                    value={editJobForm.start_time_val}
                    onChange={(e) => setEditJobForm({ ...editJobForm, start_time_val: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Field Pick Vị Trí Sân Bóng & Lưu Tọa Độ (Edit Job) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Vị trí sân bóng:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {editJobForm.location_lat && editJobForm.location_lng ? (
                      <span className="font-mono text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                        📍 {Number(editJobForm.location_lat).toFixed(4)}, {Number(editJobForm.location_lng).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa ghim toạ độ</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const locObj = locations.find((l) => l.id === Number(editJobForm.location_id));
                        setLocationPickerConfig({
                          isOpen: true,
                          venueName: locObj?.name || 'Sân bóng',
                          initialAddress: editJobForm.location_address || locObj?.address || '',
                          initialLat: editJobForm.location_lat ?? locObj?.latitude ?? 10.78,
                          initialLng: editJobForm.location_lng ?? locObj?.longitude ?? 106.65,
                          onConfirm: (data) => {
                            setEditJobForm((prev: any) => ({
                              ...prev,
                              location_address: data.address,
                              location_lat: data.latitude,
                              location_lng: data.longitude,
                            }));
                          },
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Chọn vị trí bản đồ</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ hoặc vị trí cụ thể của sân..."
                    value={editJobForm.location_address || ''}
                    onChange={(e) => setEditJobForm({ ...editJobForm, location_address: e.target.value })}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    disabled={isSavingLoc}
                    onClick={() => handleSaveLocationToDB(Number(editJobForm.location_id), editJobForm.location_address, editJobForm.location_lat, editJobForm.location_lng)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {isSavingLoc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    <span>{savedLocSuccessId === Number(editJobForm.location_id) ? '✓ Đã lưu vị trí!' : 'Lưu vị trí sân'}</span>
                  </button>
                </div>
              </div>

              {/* Quy mô & Chụp ảnh */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Trận</label>
                  <input
                    type="number"
                    min={1}
                    value={editJobForm.match_count}
                    onChange={(e) => {
                      const newCount = Math.max(1, parseInt(e.target.value, 10) || 1);
                      const oldCount = Math.max(1, parseInt(editJobForm.match_count, 10) || 1);
                      const updatedStaff = (editJobForm.staff || []).map((s: any) => {
                        const oldDefault = getDefaultStaffPayout(s.duty, oldCount);
                        if (s.payout_amount === oldDefault || !s.payout_amount) {
                          return { ...s, payout_amount: getDefaultStaffPayout(s.duty, newCount) };
                        }
                        return s;
                      });
                      setEditJobForm({ ...editJobForm, match_count: newCount, staff: updatedStaff });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Sân</label>
                  <input
                    type="number"
                    min={1}
                    value={editJobForm.pitch_count}
                    onChange={(e) => setEditJobForm({ ...editJobForm, pitch_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Máy Cam</label>
                  <input
                    type="number"
                    min={1}
                    value={editJobForm.camera_count}
                    onChange={(e) => setEditJobForm({ ...editJobForm, camera_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editJobForm.has_photo}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const liveAmt = parseFloat(editJobForm.live_price) || 0;
                        const photoAmt = checked ? parseFloat(editJobForm.photo_fee) || 350000 : 0;
                        setEditJobForm({
                          ...editJobForm,
                          has_photo: checked,
                          price: (liveAmt + photoAmt).toString(),
                        });
                      }}
                      className="w-4 h-4 rounded text-purple-600"
                    />
                    <span className="text-[11px] font-bold text-purple-900">Có Chụp Hình</span>
                  </label>
                </div>
              </div>

              {/* Chi tiết Giá tiền */}
              <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">Đơn Giá Live (VNĐ)</label>
                    <input
                      type="number"
                      value={editJobForm.live_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        const photoAmt = editJobForm.has_photo ? parseFloat(editJobForm.photo_fee) || 0 : 0;
                        setEditJobForm({
                          ...editJobForm,
                          live_price: val,
                          price: ((parseFloat(val) || 0) + photoAmt).toString(),
                        });
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">Phụ Thu Chụp Hình (VNĐ)</label>
                    <input
                      type="number"
                      disabled={!editJobForm.has_photo}
                      value={editJobForm.photo_fee}
                      onChange={(e) => {
                        const val = e.target.value;
                        const liveAmt = parseFloat(editJobForm.live_price) || 0;
                        setEditJobForm({
                          ...editJobForm,
                          photo_fee: val,
                          price: (liveAmt + (parseFloat(val) || 0)).toString(),
                        });
                      }}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-black mb-1">Tổng Tiền Thu Khách (VNĐ) *</label>
                    <input
                      type="number"
                      required
                      value={editJobForm.price}
                      onChange={(e) => setEditJobForm({ ...editJobForm, price: e.target.value })}
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 text-slate-900 font-mono font-black text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Nhân sự phân công */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Phân Công Nhân Sự (Admin, Nội bộ & Gọi Ngoài)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentUser?.id && (
                      <button
                        type="button"
                        onClick={handleAssignSelfToEditJobForm}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-purple-500 cursor-pointer"
                        title="Tự thêm tôi vào danh sách tác nghiệp trận này"
                      >
                        <span>👑</span>
                        <span>+ Tự nhận ca ({currentUser.name})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditJobForm({
                          ...editJobForm,
                          staff: [
                            ...editJobForm.staff,
                            {
                              user_id: users[0]?.id || 1,
                              duty: 'CAMERAMAN',
                              payout_amount: getDefaultStaffPayout('CAMERAMAN', editJobForm.match_count),
                            },
                          ],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-emerald-500 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>+ Thêm Nhân Sự Nội Bộ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditJobForm({
                          ...editJobForm,
                          staff: [
                            ...editJobForm.staff,
                            {
                              user_id: null,
                              is_external: true,
                              external_name: '',
                              external_duty: 'Quay phim ngoài',
                              duty: 'CAMERAMAN',
                              payout_amount: getDefaultStaffPayout('CAMERAMAN', editJobForm.match_count),
                            },
                          ],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all ring-1 ring-amber-500 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Gọi Nhân Sự Ngoài</span>
                    </button>
                  </div>
                </div>

                {editJobForm.staff.map((s: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {!s.is_external ? (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <select
                          value={s.user_id || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...editJobForm.staff];
                            if (val === 'EXTERNAL') {
                              updated[idx].is_external = true;
                              updated[idx].user_id = null;
                              updated[idx].external_name = '';
                              updated[idx].external_duty = 'Quay phim';
                            } else {
                              updated[idx].user_id = Number(val);
                              const selectedU = users.find((u) => u.id === Number(val));
                              if (selectedU) {
                                const suggestedDuty = getSuggestedDutyForUser(selectedU);
                                updated[idx].duty = suggestedDuty;
                                updated[idx].payout_amount = getDefaultStaffPayout(suggestedDuty, editJobForm.match_count);
                              }
                            }
                            setEditJobForm({ ...editJobForm, staff: updated });
                          }}
                          className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium text-xs truncate"
                        >
                          {users.map((u) => {
                            const isMe = u.id === currentUser?.id;
                            const isAdmin = u.role === 'ADMIN';
                            return (
                              <option key={u.id} value={u.id}>
                                {isMe ? '⭐ [TÔI] ' : isAdmin ? '👑 [ADMIN] ' : ''}
                                {u.name} {u.address_district ? `(${u.address_district})` : ''} {u.skills ? `• [${u.skills}]` : ''}
                              </option>
                            );
                          })}
                          <option value="EXTERNAL">👤 [+ Nhân sự gọi ngoài / CTV ngoài...]</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="flex-1 min-w-0 flex gap-1.5">
                          <input
                            type="text"
                            required
                            placeholder="Tên nhân viên ngoài"
                            value={s.external_name || ''}
                            onChange={(e) => {
                              const updated = [...editJobForm.staff];
                              updated[idx].external_name = e.target.value;
                              setEditJobForm({ ...editJobForm, staff: updated });
                            }}
                            className="flex-1 min-w-0 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Vai trò ngoài"
                            value={s.external_duty || ''}
                            onChange={(e) => {
                              const updated = [...editJobForm.staff];
                              updated[idx].external_duty = e.target.value;
                              setEditJobForm({ ...editJobForm, staff: updated });
                            }}
                            className="w-28 shrink-0 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editJobForm.staff];
                            updated[idx].is_external = false;
                            updated[idx].user_id = users[0]?.id || 1;
                            setEditJobForm({ ...editJobForm, staff: updated });
                          }}
                          className="text-[10px] text-blue-600 hover:underline shrink-0"
                        >
                          Chọn nv nội bộ
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <select
                        value={s.duty}
                        onChange={(e) => {
                          const newDuty = e.target.value;
                          const updated = [...editJobForm.staff];
                          updated[idx].duty = newDuty;
                          updated[idx].payout_amount = getDefaultStaffPayout(newDuty, editJobForm.match_count);
                          setEditJobForm({ ...editJobForm, staff: updated });
                        }}
                        className="w-40 sm:w-44 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-semibold text-[11px]"
                        title="Chọn vai trò tác nghiệp (sẽ tự động gợi ý lương mặc định theo số trận)"
                      >
                        <option value="CASTER">🎙️ Bình luận viên (300k/trận)</option>
                        <option value="CAMERAMAN">🎥 Quay phim (200k/trận)</option>
                        <option value="PHOTOGRAPHER">📸 Chụp hình (400k/trận)</option>
                        <option value="VMIX_OPERATOR">💻 Kỹ thuật vMix (300k/trận)</option>
                        <option value="SUPPORT">🛠️ Hỗ trợ kỹ thuật (200k/trận)</option>
                      </select>

                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          placeholder="Tiền công"
                          value={s.payout_amount}
                          onChange={(e) => {
                            const updated = [...editJobForm.staff];
                            updated[idx].payout_amount = parseFloat(e.target.value) || 0;
                            setEditJobForm({ ...editJobForm, staff: updated });
                          }}
                          className="w-20 bg-transparent text-slate-900 font-mono font-bold text-xs outline-none"
                          title="Tiền công trả cho nhân sự (có thể sửa tùy ý)"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">đ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = editJobForm.staff.filter((_: any, i: number) => i !== idx);
                          setEditJobForm({ ...editJobForm, staff: updated });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-colors font-bold text-sm shrink-0"
                        title="Xóa nhân sự này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thiết bị gán chở & Chọn Nhanh Cùng Lúc */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>Phân Công Thiết Bị & Chỉ Định Người Chở</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Chọn nhanh cả bộ (Combo) hoặc tích chọn nhiều món cùng lúc để gán ngay cho nhân sự
                    </p>
                  </div>
                </div>

                {/* KHUNG GÁN NHIỀU THIẾT BỊ CÙNG LÚC (BATCH ALLOCATION TOOL CHO EDIT MODAL) */}
                <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gán Nhanh Nhiều Món Cùng Lúc:</span>
                      </span>
                    </div>

                    {/* Quick Combo Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('live_1cam', true)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: 1 PC vMix, 1 Máy quay, 1 Chân, 1 Loa, 1 Dây"
                      >
                        ⚡ Bộ Live 1 Cam
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('live_2cam', true)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: 1 PC vMix, 2 Máy quay, 2 Chân, 1 Loa, 2 Dây"
                      >
                        ⚡ Bộ Live 2 Cam
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('photoshoot', true)}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                        title="Tự động tích: Máy quay/ảnh + Chân + Dây"
                      >
                        ⚡ Bộ Chụp Ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEquipCombo('all_available', true)}
                        className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold hover:bg-emerald-200"
                      >
                        ☑️ Chọn Hết Hàng Rảnh
                      </button>
                      {editBatchSelectedEquipIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectEquipCombo('clear', true)}
                          className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100"
                        >
                          ✕ Bỏ chọn
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-select equipment checklist */}
                  <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {equipments.map((eq) => {
                      const isTicked = editBatchSelectedEquipIds.includes(eq.id);
                      const isAssigned = editJobForm.equipment_assignments.some((ea: any) => ea.equipment_id === eq.id);
                      const isAvail = eq.status === 'AVAILABLE';
                      const busyReason = checkEquipmentBusy(eq.id);

                      return (
                        <div
                          key={eq.id}
                          onClick={() => handleToggleBatchEquipWithCheck(eq.id, true)}
                          className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-all select-none ${
                            isTicked
                              ? 'bg-emerald-100/90 border-emerald-500 font-bold text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                              : busyReason
                              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70 text-slate-800'
                              : isAssigned
                              ? 'bg-slate-100 border-slate-300 text-slate-500 opacity-60'
                              : 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isTicked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 pointer-events-none"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="font-bold truncate text-[11px] flex items-center justify-between">
                              <span className="truncate">{eq.name}</span>
                              {busyReason && !isTicked && (
                                <span className="text-[8px] bg-amber-200 text-amber-900 font-black px-1 rounded ml-1 shrink-0" title={busyReason}>
                                  ⚠️ BẬN
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-between">
                              <span>{eq.category?.name}</span>
                              {isAssigned && <span className="text-amber-700 font-bold">✓ Đã gán</span>}
                              {!isAssigned && !isAvail && <span className="text-rose-600 font-bold">[{eq.status}]</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Bar: Select Carrier & 1-Click Apply */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-emerald-200">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-emerald-950 whitespace-nowrap">Chỉ định chở:</span>
                      <select
                        value={editBatchCarrierId}
                        onChange={(e) => setEditBatchCarrierId(e.target.value ? Number(e.target.value) : '')}
                        className="bg-white border-2 border-emerald-400 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                      >
                        <option value="">-- Chọn người chở ({currentUser?.name || 'Tôi'} mặc định) --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.id === currentUser?.id ? '⭐ [TÔI] ' : u.role === 'ADMIN' ? '👑 [ADMIN] ' : ''}
                            {u.name} {u.address_district ? `(${u.address_district})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyBatchEquipments(true)}
                      disabled={editBatchSelectedEquipIds.length === 0}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>+ Gán {editBatchSelectedEquipIds.length} Thiết Bị Đã Chọn</span>
                    </button>
                  </div>
                </div>

                {/* DANH SÁCH THIẾT BỊ ĐÃ GÁN (KÈM GHI CHÚ VÀ XÓA TỪNG MÓN) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Danh sách thiết bị trong lịch này ({editJobForm.equipment_assignments.length} món):</span>
                    {currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (equipments.length > 0) {
                            setEditJobForm({
                              ...editJobForm,
                              equipment_assignments: [
                                ...editJobForm.equipment_assignments,
                                {
                                  equipment_id: equipments[0].id,
                                  transport_by_user_id: currentUser.id,
                                  handover_notes: '',
                                },
                              ],
                            });
                          }
                        }}
                        className="text-[11px] text-amber-800 hover:underline font-bold"
                      >
                        + Thêm lẻ 1 món
                      </button>
                    )}
                  </div>

                  {editJobForm.equipment_assignments.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
                      Chưa có thiết bị nào được gán. Hãy dùng bảng chọn nhanh ở trên để chọn cùng lúc!
                    </div>
                  ) : (
                    editJobForm.equipment_assignments.map((ea: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                      >
                        <select
                          value={ea.equipment_id}
                          onChange={(e) => {
                            const updated = [...editJobForm.equipment_assignments];
                            updated[idx].equipment_id = Number(e.target.value);
                            setEditJobForm({ ...editJobForm, equipment_assignments: updated });
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs"
                        >
                          {equipments.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              [{eq.category?.name}] {eq.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-500 font-semibold shrink-0">Chở đi:</span>
                          <select
                            value={ea.transport_by_user_id}
                            onChange={(e) => {
                              const updated = [...editJobForm.equipment_assignments];
                              updated[idx].transport_by_user_id = Number(e.target.value);
                              setEditJobForm({ ...editJobForm, equipment_assignments: updated });
                            }}
                            className="w-48 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-medium text-xs"
                          >
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.id === currentUser?.id ? '⭐ [TÔI] ' : u.role === 'ADMIN' ? '👑 [ADMIN] ' : ''}
                                {u.name} {u.address_district ? `(${u.address_district})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = editJobForm.equipment_assignments.filter((_: any, i: number) => i !== idx);
                            setEditJobForm({ ...editJobForm, equipment_assignments: updated });
                          }}
                          className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1 self-center bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Xóa phân công thiết bị này"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}

                  {/* Ghi chú chung vận chuyển thiết bị ở phía dưới */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ghi chú thiết bị & bàn giao chở chung cho ca làm:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Đồ để ở kho Gò Vấp, balo đỏ có 2 pin sạc, mang cuộn dây 50m, trả đồ trước 22h..."
                      value={editJobForm.notes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditJobForm({
                          ...editJobForm,
                          notes: val,
                          equipment_assignments: editJobForm.equipment_assignments.map((item: any) => ({
                            ...item,
                            handover_notes: val,
                          })),
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  {/* Ảnh Đồ Cần Lấy (Admin chụp trước để nhân viên đối chiếu) */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ảnh đồ cần lấy (Admin chụp sẵn để NV đối chiếu):</span>
                      </span>
                      {editJobForm.equipment_photo_url && (
                        <button
                          type="button"
                          onClick={() => setEditJobForm({ ...editJobForm, equipment_photo_url: '' })}
                          className="text-rose-600 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                        >
                          ✕ Xóa ảnh
                        </button>
                      )}
                    </label>

                    {editJobForm.equipment_photo_url ? (
                      <div className="flex items-center gap-3 bg-blue-50/60 p-2 rounded-xl border border-blue-200">
                        <img
                          src={resolveMediaUrl(editJobForm.equipment_photo_url)}
                          alt="Đồ cần lấy"
                          onError={handleMediaError}
                          onClick={() => setPreviewPhotoUrl(editJobForm.equipment_photo_url)}
                          className="w-16 h-16 rounded-lg object-cover border border-blue-300 cursor-pointer hover:opacity-85 shadow-xs"
                          title="Bấm để xem phóng to"
                        />
                        <div className="flex-1 text-[11px] text-slate-600">
                          <span className="font-bold text-blue-900 block">✓ Đã lưu ảnh đồ chuẩn bị</span>
                          <span className="text-[10px] text-slate-500">Ảnh này sẽ hiển thị trực tiếp trên app của nhân viên khi nhận ca</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraModalConfig({
                              isOpen: true,
                              title: 'Chụp Ảnh Đồ Cần Lấy (Admin)',
                              onCapture: (file) => handleUploadJobEquipPhoto(file, true),
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📸 Chụp ảnh trực tiếp</span>
                        </button>
                        <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadJobEquipPhoto(f, true);
                            }}
                          />
                        </label>
                        {isUploadingEquipPhoto && (
                          <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải ảnh...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteJob(editingJob.id)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa Trận Đấu Này</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditJobModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                  >
                    Lưu Thay Đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA THIẾT BỊ (EDIT EQUIPMENT MODAL) ================= */}
      {showEditEquipmentModal && editingEquipment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                Chỉnh Sửa Thiết Bị #{editingEquipment.id}
              </h2>
              <button
                onClick={() => setShowEditEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateEquipment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tên Thiết Bị *</label>
                <input
                  type="text"
                  required
                  value={editEquipForm.name}
                  onChange={(e) => setEditEquipForm({ ...editEquipForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phân Loại</label>
                <select
                  value={editEquipForm.category_id}
                  onChange={(e) => setEditEquipForm({ ...editEquipForm, category_id: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                >
                  {equipmentCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mã QR Code</label>
                <input
                  type="text"
                  value={editEquipForm.qr_code}
                  onChange={(e) => setEditEquipForm({ ...editEquipForm, qr_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Trạng Thái Kho</label>
                <select
                  value={editEquipForm.status}
                  onChange={(e) => setEditEquipForm({ ...editEquipForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="AVAILABLE">✓ Sẵn sàng trong kho</option>
                  <option value="IN_USE">📦 Đang sử dụng / Đi làm</option>
                  <option value="MAINTENANCE">🛠️ Đang bảo trì</option>
                  <option value="BROKEN">⚠️ Hỏng hóc</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">📍 Vị Trí Hiện Tại Của Thiết Bị</label>
                <input
                  type="text"
                  placeholder="VD: Kho văn phòng, Sân bóng đá Hoàn Anh, Lê Chung giữ..."
                  value={editEquipForm.current_location}
                  onChange={(e) => setEditEquipForm({ ...editEquipForm, current_location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Ảnh Thiết Bị */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ảnh Thiết Bị</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <img
                    src={editEquipPreview || resolveMediaUrl(editEquipForm.image_url)}
                    alt="Preview"
                    onError={handleMediaError}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0 bg-white"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraModalConfig({
                            isOpen: true,
                            title: `Chụp Ảnh: ${editEquipForm.name || 'Thiết Bị'}`,
                            onCapture: (file) => {
                              setEditEquipFile(file);
                              setEditEquipPreview(URL.createObjectURL(file));
                            },
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 Chụp ảnh trực tiếp</span>
                      </button>
                      <label className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn từ máy</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditEquipFile(file);
                              setEditEquipPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Chụp trực tiếp bằng camera hoặc chọn ảnh mới để cập nhật
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEquipmentModal(false);
                    handleDeleteEquipment(editingEquipment.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditEquipmentModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isEditEquipUploading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5"
                  >
                    {isEditEquipUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu Thay Đổi</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM NHÂN VIÊN MỚI (NO PASSWORD) ================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Thêm Nhân Viên Mới</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm nhân sự vào hệ thống điều phối (Không yêu cầu mật khẩu)
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Họ và Tên Nhân Viên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Số Điện Thoại</label>
                  <input
                    type="tel"
                    placeholder="VD: 0901234567"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vai Trò / Phân Quyền *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STAFF">🎥 STAFF (Kỹ thuật viên / Quay phim)</option>
                    <option value="ADMIN">👑 ADMIN (Quản lý hệ thống)</option>
                    <option value="FREELANCER">🤝 FREELANCER (Cộng tác viên gọi ngoài)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Khu Vực Thường Trú (Quận/Huyện)</label>
                  <select
                    value={userForm.address_district}
                    onChange={(e) => setUserForm({ ...userForm, address_district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Gò Vấp">Gò Vấp</option>
                    <option value="Bình Chánh">Bình Chánh</option>
                    <option value="Tân Bình">Tân Bình</option>
                    <option value="Bình Tân">Bình Tân</option>
                    <option value="Quận 1">Quận 1</option>
                    <option value="Quận 3">Quận 3</option>
                    <option value="Quận 7">Quận 7</option>
                    <option value="Quận 10">Quận 10</option>
                    <option value="Quận 12">Quận 12</option>
                    <option value="Thủ Đức">TP. Thủ Đức</option>
                    <option value="Bình Thạnh">Bình Thạnh</option>
                    <option value="Phú Nhuận">Phú Nhuận</option>
                    <option value="Tân Phú">Tân Phú</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trạng Thái Hoạt Động</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">✓ Đang hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Kỹ Năng & Chuyên Môn</label>
                <input
                  type="text"
                  placeholder="VD: Bình luận viên, Kỹ thuật viên vMix, Quay phim sân 7..."
                  value={userForm.skills}
                  onChange={(e) => setUserForm({ ...userForm, skills: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ảnh Đại Diện</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {userAvatarPreview ? (
                    <img
                      src={userAvatarPreview}
                      alt="Preview"
                      className="w-14 h-14 rounded-full object-cover border border-slate-300 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-200 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUserAvatarFile(file);
                          setUserAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Ảnh sẽ tự động tải lên và lưu vào hệ thống</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUserSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {isUserSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUserSaving ? 'Đang lưu...' : 'Thêm Nhân Viên'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA NHÂN VIÊN (NO PASSWORD) ================= */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  <span>Chỉnh Sửa Nhân Viên: {editingUser.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật phân quyền, khu vực địa chỉ và trạng thái (Không có mật khẩu)
                </p>
              </div>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Họ và Tên Nhân Viên *</label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Số Điện Thoại</label>
                  <input
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phân Quyền / Vai Trò *</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="STAFF">🎥 STAFF (Kỹ thuật viên / Quay phim)</option>
                    <option value="ADMIN">👑 ADMIN (Quản lý hệ thống)</option>
                    <option value="FREELANCER">🤝 FREELANCER (Cộng tác viên gọi ngoài)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Khu Vực Thường Trú (Quận/Huyện)</label>
                  <select
                    value={editUserForm.address_district}
                    onChange={(e) => setEditUserForm({ ...editUserForm, address_district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="Gò Vấp">Gò Vấp</option>
                    <option value="Bình Chánh">Bình Chánh</option>
                    <option value="Tân Bình">Tân Bình</option>
                    <option value="Bình Tân">Bình Tân</option>
                    <option value="Quận 1">Quận 1</option>
                    <option value="Quận 3">Quận 3</option>
                    <option value="Quận 7">Quận 7</option>
                    <option value="Quận 10">Quận 10</option>
                    <option value="Quận 12">Quận 12</option>
                    <option value="Thủ Đức">TP. Thủ Đức</option>
                    <option value="Bình Thạnh">Bình Thạnh</option>
                    <option value="Phú Nhuận">Phú Nhuận</option>
                    <option value="Tân Phú">Tân Phú</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trạng Thái Hiện Trường</label>
                  <select
                    value={editUserForm.operational_status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, operational_status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="IDLE">☕ Sẵn sàng / Rảnh rỗi (IDLE)</option>
                    <option value="MOVING">🛵 Đang di chuyển (MOVING)</option>
                    <option value="WORKING">🎥 Đang tác nghiệp tại sân (WORKING)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kỹ Năng & Chuyên Môn</label>
                  <input
                    type="text"
                    value={editUserForm.skills}
                    onChange={(e) => setEditUserForm({ ...editUserForm, skills: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trạng Thái Tài Khoản</label>
                  <select
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">✓ Đang hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {/* Avatar Update */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ảnh Đại Diện</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <img
                    src={editUserAvatarPreview || resolveAvatarUrl(editUserForm.avatar_url)}
                    alt="Preview"
                    onError={handleAvatarError}
                    className="w-14 h-14 rounded-full object-cover border border-slate-300 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditUserAvatarFile(file);
                          setEditUserAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Chọn ảnh mới để tải lên và cập nhật</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(editingUser.id, editingUser.name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Nhân Viên</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isEditUserSaving}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    {isEditUserSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isEditUserSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CẢNH BÁO TRÙNG THIẾT BỊ ================= */}
      {equipConflictWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-amber-200">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 leading-tight">Cảnh Báo Thiết Bị Trùng Lịch</h3>
                <p className="text-xs text-amber-700 font-semibold mt-0.5">Vui lòng kiểm tra kỹ trước khi phân công</p>
              </div>
              <button
                type="button"
                onClick={() => setEquipConflictWarning(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
                {equipConflictWarning.equip.image_url ? (
                  <img
                    src={resolveMediaUrl(equipConflictWarning.equip.image_url)}
                    alt={equipConflictWarning.equip.name}
                    onError={handleMediaError}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">{equipConflictWarning.equip.name}</div>
                  <div className="text-slate-500 text-[11px]">{equipConflictWarning.equip.category?.name}</div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  Lý do cảnh báo:
                </span>
                <p className="font-semibold text-xs leading-relaxed text-amber-900">{equipConflictWarning.reason}</p>
              </div>

              <p className="text-[11px] text-slate-600 leading-normal">
                Để tránh việc 1 thiết bị bị 2 ca đi làm cùng lúc hoặc dùng đồ đang bảo dưỡng, nếu bạn vẫn muốn dùng thiết bị này cho ca, hãy bấm <strong className="text-amber-800 font-bold">"Vẫn Gán Thiết Bị"</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEquipConflictWarning(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => equipConflictWarning.onConfirm()}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>⚠️ Vẫn Gán Thiết Bị</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỤP ẢNH TRỰC TIẾP TỪ CAMERA ================= */}
      {cameraModalConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{cameraModalConfig.title || 'Chụp Ảnh Trực Tiếp'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCameraModalConfig(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/80 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-300 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="max-w-xs">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Camera Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Mở Camera Thiết Bị</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      cameraModalConfig.onCapture(f);
                      setCameraModalConfig(null);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setCameraModalConfig(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSnapCameraPhoto}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Chụp Ảnh Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / High-Res Photo Preview Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-slate-700">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Chi Tiết Ảnh (Kho Dữ Liệu)
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={resolveMediaUrl(previewPhotoUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline px-2 py-1"
                >
                  Mở ảnh gốc
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhotoUrl(null)}
                  className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-65px)] bg-slate-950/60">
              <img
                src={resolveMediaUrl(previewPhotoUrl)}
                onError={handleMediaError}
                alt="Chi tiết ảnh"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin Đặt Lại Mật Khẩu Cho Nhân Sự */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-800">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Đặt Lại Mật Khẩu Nhân Sự</h3>
                  <p className="text-[11px] text-slate-500">Cấp lại mật khẩu cho {resetPasswordModalUser.name} ({resetPasswordModalUser.phone})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPassError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                ⚠️ {resetPassError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mật khẩu mới:</span>
                </label>
                <input
                  type="text"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Nhập mật khẩu mới (VD: staff123, 123456...)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  autoFocus
                />
              </div>

              {/* Gợi ý đặt nhanh */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewPasswordVal('staff123')}
                  className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Gán mặc định: staff123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPasswordVal(Math.floor(100000 + Math.random() * 900000).toString())}
                  className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                >
                  🎲 6 số ngẫu nhiên
                </button>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-950 font-medium leading-relaxed">
                ℹ️ <strong>Lưu ý:</strong> Khi bạn bấm lưu, toàn bộ phiên đăng nhập trên các thiết bị cũ của nhân viên sẽ tự động bị hủy (bị văng ra) và nhân viên phải đăng nhập lại với mật khẩu mới này.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResetPass || !newPasswordVal.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingResetPass ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>LƯU MẬT KHẨU MỚI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chọn Vị Trí Sân Bóng Trên Bản Đồ */}
      {locationPickerConfig && (
        <LocationPickerModal
          isOpen={locationPickerConfig.isOpen}
          onClose={() => setLocationPickerConfig(null)}
          venueName={locationPickerConfig.venueName}
          initialAddress={locationPickerConfig.initialAddress}
          initialLat={locationPickerConfig.initialLat}
          initialLng={locationPickerConfig.initialLng}
          onConfirm={locationPickerConfig.onConfirm}
        />
      )}
    </div>
  );
}
