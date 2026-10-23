'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Đang kiểm tra phiên đăng nhập...');

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.currentUser) {
            setLoadingText(`Xin chào ${data.currentUser.name}, đang chuyển hướng...`);
            if (data.currentUser.role === 'ADMIN') {
              router.replace('/admin');
            } else {
              router.replace('/staff');
            }
            return;
          }
        }
        // Chưa đăng nhập
        router.replace('/login');
      } catch (e) {
        console.error(e);
        router.replace('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white space-y-4 select-none">
      <div className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center animate-pulse">
        <img
          src="/logo/logo_full.png"
          alt="BÓNG ĐÁ SỐ MEDIA"
          className="h-14 w-auto object-contain"
        />
      </div>
      <div className="flex items-center gap-2.5 text-sm font-extrabold text-emerald-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
      <div className="text-[11px] text-slate-400 font-mono">Bóng Đá Số Media ERP • Phiên đăng nhập 7 ngày</div>
    </div>
  );
}
