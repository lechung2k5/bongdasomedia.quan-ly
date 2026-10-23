'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Package,
  MapPin,
  Power,
  X,
  ExternalLink,
  Clock,
  Sparkles,
} from 'lucide-react';
import { resolveMediaUrl, handleMediaError, resolveAvatarUrl, handleAvatarError } from '@/lib/avatarHelper';

export interface NotificationItem {
  id: number;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'STADIUM_CHECK_IN' | 'LATE_WARNING' | 'APP_STATUS' | 'SYSTEM';
  title: string;
  message: string;
  user_id?: number | null;
  job_id?: number | null;
  photo_url?: string | null;
  is_read: boolean;
  metadata?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    avatar_url?: string | null;
    role?: string;
  };
  job?: {
    id: number;
    title: string;
    start_time: string;
    location?: { name: string };
  };
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  // Run punctuality check to discover potential late staff
  const triggerPunctualityCheck = async () => {
    try {
      await fetch('/api/jobs/punctuality-check');
      fetchNotifications();
    } catch (e) {
      console.warn('Punctuality check failed:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    triggerPunctualityCheck();

    // Auto sync notifications every 20s
    const notifTimer = setInterval(fetchNotifications, 20000);
    // Punctuality check every 45s
    const punctTimer = setInterval(triggerPunctualityCheck, 45000);

    return () => {
      clearInterval(notifTimer);
      clearInterval(punctTimer);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  // Format relative time (ví dụ: 5 phút trước)
  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Icon tương ứng với loại thông báo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LATE_WARNING':
        return <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />;
      case 'CHECK_IN':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'CHECK_OUT':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'STADIUM_CHECK_IN':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'APP_STATUS':
        return <Power className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-xs group"
        title="Thông báo vận hành"
      >
        <Bell className="w-4 h-4 text-slate-700 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-600/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[82vh] animate-fadeIn">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wide uppercase">Thông Báo Điều Phối</h4>
                <p className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} thông báo mới chưa đọc` : 'Không có thông báo mới'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="font-semibold">Chưa có thông báo nào hôm nay</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isLateWarning = n.type === 'LATE_WARNING';
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                    }}
                    className={`p-3 transition-colors flex items-start gap-3 cursor-pointer ${
                      n.is_read ? 'hover:bg-slate-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                    } ${isLateWarning ? 'border-l-4 border-rose-500 bg-rose-50/40' : ''}`}
                  >
                    {/* User Avatar / Event Icon */}
                    <div className="relative shrink-0">
                      {n.user?.avatar_url ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                          <img
                            src={resolveAvatarUrl(n.user.avatar_url)}
                            alt={n.user.name}
                            onError={handleAvatarError}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                            isLateWarning ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {getNotificationIcon(n.type)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                        {getNotificationIcon(n.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-black truncate ${
                            isLateWarning ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug font-medium break-words">
                        {n.message}
                      </p>

                      {/* Photo Thumbnail if attached */}
                      {n.photo_url && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto(resolveMediaUrl(n.photo_url));
                            }}
                            className="relative w-16 h-12 rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-xs hover:opacity-90 transition-opacity cursor-pointer group"
                            title="Bấm để xem ảnh lớn"
                          >
                            <img
                              src={resolveMediaUrl(n.photo_url)}
                              alt="Bằng chứng"
                              onError={handleMediaError}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            📷 Xem ảnh bằng chứng
                          </span>
                        </div>
                      )}
                    </div>

                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center shrink-0 flex items-center justify-between px-4">
            <span className="text-[10px] text-slate-400 font-semibold">
              Tự động cập nhật mỗi 20 giây
            </span>
            <button
              onClick={() => {
                triggerPunctualityCheck();
                fetchNotifications();
              }}
              className="text-[10px] font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              🔄 Quét lại ngay
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Preview Photo Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <span>📷 Ảnh Check-in / Kiểm kê đồ của nhân viên</span>
              </span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={previewPhoto}
                alt="Ảnh đính kèm"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="p-3 bg-slate-50 text-right">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
