'use client';

import { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Lock,
  Camera,
  Check,
  RefreshCw,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { handleAvatarError, resolveAvatarUrl } from '@/lib/avatarHelper';
import { compressImage } from '@/lib/imageCompression';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserUpdated: (updatedUser: any) => void;
  initialTab?: 'profile' | 'security';
}

const DISTRICT_OPTIONS = [
  'Gò Vấp',
  'Bình Chánh',
  'Tân Bình',
  'Bình Tân',
  'Quận 1',
  'Quận 3',
  'Quận 7',
  'Quận 10',
  'Quận 12',
  'Thủ Đức',
  'Bình Thạnh',
  'Phú Nhuận',
  'Tân Phú',
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  initialTab = 'profile',
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(initialTab);

  // Form State: Thông tin cá nhân
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Gò Vấp');
  const [skills, setSkills] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form State: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Action status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setDistrict(currentUser.address_district || 'Gò Vấp');
      setSkills(currentUser.skills || '');
      setAvatarUrl(currentUser.avatar_url || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');
      setActiveTab(initialTab);
    }
  }, [isOpen, currentUser, initialTab]);

  if (!isOpen) return null;

  // Xử lý chọn ảnh đại diện & upload lên AWS S3
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setErrorMessage('');
      // Tạo preview tạm thời
      setAvatarPreview(URL.createObjectURL(file));

      // Nén ảnh client-side xuống 600x600 px để tối ưu
      const compressed = await compressImage(file, 600, 600, 0.7);
      setAvatarFile(compressed);

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('targetType', 'user');
      formData.append('targetId', currentUser?.id?.toString() || '');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
        setSuccessMessage('✓ Đã tải ảnh lên thành công! Nhớ bấm "Lưu Thay Đổi" để cập nhật hồ sơ.');
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Lỗi khi tải ảnh đại diện lên máy chủ');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối khi tải ảnh');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Submit cập nhật thông tin cá nhân
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Tên hiển thị không được để trống');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Số điện thoại không được để trống');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address_district: district,
          skills: skills.trim(),
          avatar_url: avatarUrl || currentUser.avatar_url,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('✓ Đã cập nhật hồ sơ cá nhân thành công!');
        onUserUpdated(data.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Lỗi khi lưu thông tin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Submit đổi mật khẩu
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMessage('Mật khẩu mới phải từ 4 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('✓ Đã đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới này.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Lỗi khi đổi mật khẩu');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in zoom-in-95">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Hồ Sơ Cá Nhân & Bảo Mật</h3>
              <p className="text-xs text-slate-500">Chỉnh sửa thông tin, ảnh đại diện và mật khẩu của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông Tin Cá Nhân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>

        {/* Alert Messages */}
        <div className="px-6 pt-4 shrink-0 space-y-2">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Ảnh đại diện với nút đổi ảnh S3 */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-200 shadow-xs">
                    <img
                      src={avatarPreview || resolveAvatarUrl(avatarUrl || currentUser?.avatar_url)}
                      alt={name}
                      onError={handleAvatarError}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block">Ảnh đại diện</span>
                  <p className="text-[11px] text-slate-500 mb-2">Ảnh được tự động nén và tải lên hệ thống</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isUploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh mới...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingAvatar}
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
              </div>

              {/* Tên hiển thị */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Họ và tên hiển thị:</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              {/* Số điện thoại (Tài khoản) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Số điện thoại (Tài khoản đăng nhập):</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại (VD: 0901111001)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
                <span className="text-[10px] text-slate-400 block">
                  Số điện thoại này được dùng để đăng nhập vào hệ thống.
                </span>
              </div>

              {/* Khu vực sinh sống */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Khu vực sinh sống / Địa bàn (TP.HCM):</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  {DISTRICT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      📍 {d}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block">
                  Hệ thống dùng khu vực này để ưu tiên điều phối các ca làm việc gần nhà bạn nhất.
                </span>
              </div>

              {/* Kỹ năng & Tác nghiệp */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Kỹ năng & Chuyên môn tác nghiệp:</span>
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="VD: Bình luận viên, Quay phim, Kỹ thuật vMix..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Nút Submit */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading || isUploadingAvatar}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>LƯU THAY ĐỔI</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ĐỔI MẬT KHẨU */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-950 leading-relaxed font-medium">
                ℹ️ Để bảo vệ tài khoản, sau khi đổi mật khẩu, phiên đăng nhập hiện tại trên thiết bị này vẫn được duy trì trong 7 ngày.
              </div>

              {/* Mật khẩu hiện tại */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mật khẩu hiện tại:</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mật khẩu mới:</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 4 ký tự"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu mới:</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              {/* Nút Submit */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>CẬP NHẬT MẬT KHẨU</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
