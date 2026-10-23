'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StaffMobileView from '@/components/StaffMobileView';
import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

export default function StaffPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kickoutAlert, setKickoutAlert] = useState<string | null>(null);

  const fetchAuthUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (!data.currentUser) {
          router.replace('/login');
          return;
        }
        setCurrentUser(data.currentUser);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'SESSION_REVOKED') {
          setKickoutAlert('Tài khoản của bạn đã được đăng nhập từ một thiết bị khác. Phiên làm việc trên thiết bị này đã kết thúc.');
          return;
        }
        router.replace('/login');
      }
    } catch (e) {
      console.error(e);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthUser();

    // Heartbeat định kỳ 20 giây kiểm tra xem có bị văng do thiết bị khác đăng nhập không
    const heartbeat = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err.error === 'SESSION_REVOKED') {
            clearInterval(heartbeat);
            setKickoutAlert('Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Thiết bị này đã bị đăng xuất.');
          }
        }
      } catch {
        // network issue, keep running
      }
    }, 20000);

    return () => clearInterval(heartbeat);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const handleConfirmKickout = () => {
    setKickoutAlert(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-900 space-y-4">
        <div className="p-3 bg-white rounded-3xl border border-slate-200/90 shadow-xl flex items-center justify-center animate-pulse">
          <img
            src="/logo/logo_full.png"
            alt="BÓNG ĐÁ SỐ MEDIA"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Đang nạp ứng dụng Tác nghiệp...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* MODAL CẢNH BÁO KHI BỊ THIẾT BỊ KHÁC ĐĂNG NHẬP VĂNG RA */}
      {kickoutAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Phiên Làm Việc Đã Kết Thúc</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {kickoutAlert}
              </p>
            </div>
            <button
              onClick={handleConfirmKickout}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              ĐĂNG NHẬP LẠI
            </button>
          </div>
        </div>
      )}

      {/* Admin banner if logged in as admin */}
      {currentUser?.role === 'ADMIN' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-40">
          <span className="flex items-center gap-1.5">
            <span>👑</span>
            <span>Bạn đang xem ở vai trò Quản Trị Viên (Admin)</span>
          </span>
          <button
            onClick={() => router.push('/admin')}
            className="underline hover:text-black font-extrabold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Bàn Điều Phối Admin</span>
          </button>
        </div>
      )}

      {/* Real Full Responsive Mobile Web App (không đóng khung giả lập) */}
      <StaffMobileView
        currentUser={currentUser}
        onRefreshUser={fetchAuthUser}
        onLogout={handleLogout}
      />
    </div>
  );
}
