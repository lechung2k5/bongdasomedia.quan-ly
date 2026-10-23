'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import AdminView from '@/components/AdminView';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchAuthUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (!data.currentUser) {
          router.replace('/login');
          return;
        }

        // Kiểm tra quyền Admin
        if (data.currentUser.role !== 'ADMIN') {
          setForbidden(true);
          setTimeout(() => {
            router.replace('/staff');
          }, 1500);
          return;
        }

        setCurrentUser(data.currentUser);
        setAvailableUsers(data.availableUsers || []);
      } else {
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
  }, []);

  const handleSwitchUser = async (userId: string | number) => {
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const target = availableUsers.find((u) => u.id === Number(userId));
        if (target && target.role !== 'ADMIN') {
          router.push('/staff');
        } else {
          await fetchAuthUser();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] flex flex-col items-center justify-center text-slate-900 space-y-4">
        <div className="p-3 bg-white rounded-3xl border border-slate-200/90 shadow-xl flex items-center justify-center animate-pulse">
          <img
            src="/logo/logo_full.png"
            alt="BÓNG ĐÁ SỐ MEDIA"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Đang nạp không gian Quản trị Admin...</span>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md shadow-2xl space-y-4">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Bạn không có quyền truy cập</h2>
          <p className="text-sm text-slate-600">
            Khu vực Quản trị chỉ dành cho tài khoản Admin. Đang tự động chuyển bạn về giao diện Nhân viên...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa] text-slate-900 select-none">
      <HeaderNav
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onRefreshUser={fetchAuthUser}
      />
      <div className="flex-1 overflow-hidden">
        <AdminView currentUser={currentUser} onRefreshData={fetchAuthUser} />
      </div>
    </div>
  );
}
