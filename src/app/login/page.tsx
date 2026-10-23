'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Phone, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessInfo(data.user);
        // Chờ 0.5s hiển thị trạng thái thành công rồi chuyển trang
        setTimeout(() => {
          if (data.redirectUrl) {
            router.push(data.redirectUrl);
          } else if (data.user?.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/staff');
          }
        }, 500);
      } else {
        setErrorMessage(data.error || 'Đăng nhập không thành công');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for testing
  const handleQuickFill = (testPhone: string, testPass: string) => {
    setPhone(testPhone);
    setPassword(testPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative ambient background lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 p-7 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-slate-900 rounded-2xl shadow-md border border-slate-700">
            <img
              src="/logo/logo_full.png"
              alt="Bóng Đá Số Media"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">HỆ THỐNG ĐIỀU PHỐI MEDIA</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Đăng nhập để xem lịch ca làm & điều phối thiết bị
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2.5 animate-shake">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              Đăng nhập thành công! Đang chuyển đến{' '}
              <span className="underline uppercase">{successInfo.role === 'ADMIN' ? 'Bàn điều phối Admin' : 'App Nhân viên'}</span>...
            </div>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Số điện thoại / Tài khoản */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Số điện thoại (Tài khoản)</span>
            </label>
            <div className="relative">
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại (VD: 0901111001)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Input Mật khẩu */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Mật khẩu</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checkbox Ghi nhớ & Thời hạn 7 ngày */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
              />
              <span className="font-semibold text-slate-700">Lưu đăng nhập trong 7 ngày</span>
            </label>
            <span className="text-[11px] text-slate-400">Tự logout sau 7 ngày</span>
          </div>

          {/* Nút Submit */}
          <button
            type="submit"
            disabled={loading || Boolean(successInfo)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ĐANG XÁC THỰC...</span>
              </>
            ) : (
              <>
                <span>ĐĂNG NHẬP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Test Buttons */}
        <div className="pt-4 border-t border-slate-200 text-center space-y-2.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Chọn nhanh tài khoản thử nghiệm</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('0901111002', 'admin123')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-left transition-colors cursor-pointer"
            >
              <div className="text-[10px] text-emerald-700 font-black">👑 ADMIN</div>
              <div className="truncate">Minh Nhật</div>
              <div className="text-[10px] text-slate-500 font-mono">0901111002</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('0901111001', 'staff123')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-left transition-colors cursor-pointer"
            >
              <div className="text-[10px] text-blue-700 font-black">🛵 NHÂN VIÊN</div>
              <div className="truncate">Lê Chung</div>
              <div className="text-[10px] text-slate-500 font-mono">0901111001</div>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Nếu quên mật khẩu, vui lòng liên hệ Admin để cấp lại</span>
        </div>
      </div>
    </div>
  );
}
