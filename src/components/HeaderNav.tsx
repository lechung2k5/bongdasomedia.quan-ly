'use client';

import { useState } from 'react';
import {
  Smartphone,
  ChevronDown,
  Sun,
  MapPin,
  LogOut,
  User,
  Key,
  Camera,
  Edit3,
  Phone,
  Shield,
} from 'lucide-react';
import { handleAvatarError, resolveAvatarUrl } from '@/lib/avatarHelper';
import UserProfileModal from './UserProfileModal';
import NotificationBell from './NotificationBell';

interface HeaderNavProps {
  currentUser: any;
  availableUsers?: any[];
  onSwitchUser?: (userId: string | number) => void;
  viewMode?: 'desktop' | 'mobile-mock';
  onToggleViewMode?: (mode: 'desktop' | 'mobile-mock') => void;
  onLogout?: () => void;
  onRefreshUser?: () => void;
}

export default function HeaderNav({
  currentUser,
  onLogout,
  onRefreshUser,
}: HeaderNavProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security'>('profile');

  const openProfileEdit = (tab: 'profile' | 'security') => {
    setProfileModalTab(tab);
    setShowProfileModal(true);
    setShowUserDropdown(false);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-sm">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img
              src="/logo/logo_full.png"
              alt="BÓNG ĐÁ SỐ MEDIA"
              className="h-10 md:h-11 w-auto object-contain transition-transform hover:scale-105"
            />
          </div>
          <div className="hidden sm:block border-l border-slate-200 pl-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                HỆ THỐNG <span className="text-emerald-600 font-black">ERP ĐIỀU PHỐI</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE DISPATCH
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                <Sun className="w-3 h-3 text-amber-500" />
                Giao Diện Sáng
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              25 Thiết bị • 18 Sân bóng TP.HCM • Điều phối & Thu chi
            </div>
          </div>
        </div>

        {/* Right Controls: Notification Bell, Staff App Link & User Profile Menu */}
        <div className="flex items-center gap-2.5">
          {/* Realtime Notification Center */}
          <NotificationBell />

          <a
            href="/staff"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
            title="Mở giao diện Web Nhân viên"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Giao diện Nhân viên</span>
          </a>

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-1.5 pr-3.5 transition-colors shadow-sm cursor-pointer"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/60 bg-slate-200 shrink-0">
                <img
                  src={resolveAvatarUrl(currentUser?.avatar_url)}
                  alt={currentUser?.name}
                  onError={handleAvatarError}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>{currentUser?.name}</span>
                  {currentUser?.address_district && (
                    <span className="text-[10px] font-normal text-slate-500">({currentUser.address_district})</span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  {currentUser?.role === 'ADMIN'
                    ? '👑 Quản lý (Admin)'
                    : currentUser?.role === 'FREELANCER'
                      ? '🤝 Cộng tác viên'
                      : '🎥 Kỹ thuật viên (Staff)'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Profile Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-3xl shadow-2xl p-2 z-50 space-y-1 animate-in zoom-in-95">
                {/* User Summary Header */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-200 shrink-0">
                    <img
                      src={resolveAvatarUrl(currentUser?.avatar_url)}
                      alt={currentUser?.name}
                      onError={handleAvatarError}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{currentUser?.name}</div>
                    <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{currentUser?.phone || 'Chưa có SĐT'}</span>
                    </div>
                    {currentUser?.address_district && (
                      <div className="text-[10px] text-amber-800 font-semibold flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                        <span>{currentUser.address_district}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="pt-1 space-y-0.5">
                  <button
                    onClick={() => openProfileEdit('profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Chỉnh sửa hồ sơ & Số điện thoại</span>
                  </button>

                  <button
                    onClick={() => openProfileEdit('profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Thay đổi ảnh đại diện</span>
                  </button>

                  <button
                    onClick={() => openProfileEdit('security')}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>
                </div>

                {/* Logout Button */}
                {onLogout && (
                  <div className="pt-1 border-t border-slate-200 mt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs text-rose-700 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Chỉnh sửa Profile & Đổi mật khẩu */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUserUpdated={() => {
          if (onRefreshUser) onRefreshUser();
        }}
        initialTab={profileModalTab}
      />
    </>
  );
}
