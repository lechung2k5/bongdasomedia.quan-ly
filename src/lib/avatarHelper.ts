import React from 'react';

/**
 * Fallback handler cho avatar nhân viên
 * Nếu link AWS S3 bị 403 (do bucket chưa bật public read), tự động fallback sang ảnh nội bộ trong /avatar_nhanVien/
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  const currentSrc = target.src;
  const defaultFallback = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  if (currentSrc === defaultFallback) return;

  if (currentSrc.includes('avatars/')) {
    const filename = currentSrc.split('avatars/').pop()?.split('?')[0];
    const candidate = `/avatar_nhanVien/${filename}`;
    if (filename && !currentSrc.endsWith(candidate)) {
      target.src = candidate;
      return;
    }
  }

  target.src = defaultFallback;
};

/**
 * Trả về đường dẫn avatar hiển thị ngay lập tức
 * Nếu là link S3 của avatar nhân viên (bị chặn quyền đọc công khai do bucket private),
 * tự động phân giải thành ảnh nội bộ /avatar_nhanVien/[filename] để không bị 403 trên bản đồ và giao diện.
 */
export const resolveAvatarUrl = (url: string | null | undefined): string => {
  if (!url) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  }

  if (url.includes('avatars/')) {
    const filename = url.split('avatars/').pop()?.split('?')[0];
    if (filename) {
      return `/avatar_nhanVien/${filename}`;
    }
  }

  if (url.includes('bongdaso-user') && url.includes('uploads/')) {
    const filename = url.split('uploads/').pop()?.split('?')[0];
    if (filename) {
      return `/uploads/${filename}`;
    }
  }

  return url;
};

/**
 * Trả về đường dẫn ảnh hiển thị ngay lập tức (cho cả Thiết bị, Avatar, và các phương tiện)
 */
export const resolveMediaUrl = (
  url: string | null | undefined,
  fallback: string = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80'
): string => {
  if (!url) return fallback;

  if (url.includes('avatars/')) {
    const filename = url.split('avatars/').pop()?.split('?')[0];
    if (filename) return `/avatar_nhanVien/${filename}`;
  }

  if (url.includes('bongdaso-user') && url.includes('uploads/')) {
    const filename = url.split('uploads/').pop()?.split('?')[0];
    if (filename) return `/uploads/${filename}`;
  }

  return url;
};

/**
 * Fallback handler cho ảnh thiết bị và phương tiện
 */
export const handleMediaError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80'
) => {
  const target = e.currentTarget;
  const currentSrc = target.src;

  if (currentSrc === fallback) return;

  if (currentSrc.includes('avatars/')) {
    const filename = currentSrc.split('avatars/').pop()?.split('?')[0];
    const candidate = `/avatar_nhanVien/${filename}`;
    if (filename && !currentSrc.endsWith(candidate)) {
      target.src = candidate;
      return;
    }
  }

  if (currentSrc.includes('bongdaso-user') && currentSrc.includes('uploads/')) {
    const filename = currentSrc.split('uploads/').pop()?.split('?')[0];
    const candidate = `/uploads/${filename}`;
    if (filename && !currentSrc.endsWith(candidate)) {
      target.src = candidate;
      return;
    }
  }

  target.src = fallback;
};
