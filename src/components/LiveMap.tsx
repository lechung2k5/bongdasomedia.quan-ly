'use client';

import { useEffect, useRef, useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatarHelper';
import { getGoongJS, GOONG_MAP_STYLE } from '@/lib/goong';
import { evaluateStaffPunctuality } from '@/lib/etaCalculator';

export interface StaffUser {
  id: number | string;
  name: string;
  phone?: string | null;
  address_district?: string | null;
  avatar_url?: string | null;
  status?: string;
  operational_status?: 'IDLE' | 'MOVING' | 'WORKING';
  is_app_active?: boolean;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_update?: string | null;
  heldEquipments?: {
    id: number;
    name: string;
    category?: { name: string };
  }[];
  transportAssignments?: {
    id: number;
    equipment?: { name: string; category?: { name: string } };
    check_in_status?: string;
    check_out_status?: string;
  }[];
  jobStaffs?: {
    duty?: string;
    job?: {
      id: number;
      title: string;
      location?: { name: string; address?: string };
      start_time: string;
      end_time: string;
      status: string;
    };
  }[];
}

export interface JobLocation {
  id: number | string;
  title: string;
  location?: {
    id: number;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  location_name?: string;
  location_lat?: number | null;
  location_lng?: number | null;
  status: string;
  start_time: string;
  notes?: string | null;
  staff?: any[];
  equipmentAssignments?: any[];
}

interface LiveMapProps {
  users: StaffUser[];
  jobs?: JobLocation[];
  selectedUserId?: number | string | null;
  onSelectUser?: (userId: number | string) => void;
  className?: string;
  zoom?: number;
  center?: [number, number]; // [lat, lng]
}

export default function LiveMap({
  users,
  jobs = [],
  selectedUserId,
  onSelectUser,
  className = 'h-[500px] w-full rounded-2xl',
  zoom = 12,
  center = [10.7800, 106.6500], // [lat, lng] TP. Hồ Chí Minh
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const [isMounted, setIsMounted] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Goong Vector Map
  useEffect(() => {
    if (!isMounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initGoongMap() {
      try {
        const goongjs = await getGoongJS();
        if (!goongjs || !mapContainerRef.current || !isSubscribed) return;

        // Clean up previous instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markersRef.current = {};
        }

        // Center [lng, lat] for Goong
        const centerLng = center[1] || 106.65;
        const centerLat = center[0] || 10.78;

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: GOONG_MAP_STYLE,
          center: [centerLng, centerLat],
          zoom: zoom,
          attributionControl: true,
        });

        // Navigation Controls
        map.addControl(new goongjs.NavigationControl(), 'bottom-right');

        map.on('load', () => {
          if (!isSubscribed) return;
          map.resize();
          setIsMapLoaded(true);
          updateMarkers(goongjs, map);
        });

        // Trigger multiple resize checks to ensure WebGL canvas occupies 100% frame
        [50, 150, 300, 600, 1000].forEach((delay) => {
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          }, delay);
        });

        mapInstanceRef.current = map;
      } catch (err) {
        console.error('Failed to init Goong Map in LiveMap:', err);
      }
    }

    initGoongMap();

    // ResizeObserver to automatically resize map when container dimension changes
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isSubscribed = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, [isMounted]);

  // Update Markers when users or jobs change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;

    getGoongJS().then((goongjs) => {
      if (goongjs && mapInstanceRef.current) {
        updateMarkers(goongjs, mapInstanceRef.current);
      }
    });
  }, [users, jobs, selectedUserId, isMapLoaded]);

  // Render Markers on Goong Map
  const updateMarkers = (goongjs: any, map: any) => {
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // 1. Render Job Venues
    jobs.forEach((job) => {
      const lat = job.location?.latitude || job.location_lat;
      const lng = job.location?.longitude || job.location_lng;
      const venueName = job.location?.name || job.location_name || 'Sân bóng';

      if (!lat || !lng) return;

      const el = document.createElement('div');
      el.className = 'custom-venue-marker cursor-pointer';
      el.innerHTML = `
        <div class="relative flex items-center justify-center -translate-y-2">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-white ring-2 ring-emerald-400/30 transform hover:scale-110 transition-transform">
            <span class="text-base">⚽</span>
          </div>
          <div class="absolute -bottom-6 whitespace-nowrap bg-slate-900/95 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded shadow border border-emerald-500/30">
            ${job.title.length > 20 ? job.title.slice(0, 20) + '...' : job.title}
          </div>
        </div>
      `;

      // Build equipment & carrier summary for this venue
      const gearSummary = (job.equipmentAssignments && job.equipmentAssignments.length > 0)
        ? Object.entries(
            job.equipmentAssignments.reduce((acc: any, ea: any) => {
              const cName = ea.transportByUser?.name || 'Chưa gán';
              if (!acc[cName]) acc[cName] = [];
              acc[cName].push(ea.equipment?.name || 'Món');
              return acc;
            }, {})
          ).map(([carrier, gears]: [string, any]) => `
            <div class="text-[10px] bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
              <strong class="text-amber-900">🛵 ${carrier}:</strong> <span class="text-slate-700">${gears.join(', ')}</span>
            </div>
          `).join('')
        : '<div class="text-[10px] text-slate-400 italic mt-1">Chưa phân bổ thiết bị chở</div>';

      const notesHtml = job.notes
        ? `<div class="text-[10px] text-blue-900 bg-blue-50 border border-blue-200 rounded p-1.5 mt-1.5 font-medium leading-tight">📝 ${job.notes}</div>`
        : '';

      const popupHtml = `
        <div class="p-3 max-w-[280px] bg-white rounded-xl text-slate-800">
          <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
            <span>🏟️ ĐỊA ĐIỂM THI ĐẤU (GOONG MAPS)</span>
          </div>
          <h4 class="text-sm font-bold text-slate-900 leading-tight mb-1">${job.title}</h4>
          <p class="text-xs font-medium text-slate-700 mb-1.5">${venueName}</p>
          <div class="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200 mb-1">
            Trạng thái: <span class="text-emerald-700 font-bold">${job.status}</span>
          </div>
          <div class="text-[10px] uppercase font-bold text-slate-500 mt-1.5">📦 Thiết bị & người chở:</div>
          ${gearSummary}
          ${notesHtml}
        </div>
      `;

      const popup = new goongjs.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml);

      const marker = new goongjs.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current[`job-${job.id}`] = marker;
    });

    // 2. Render Staff Markers
    users.forEach((user) => {
      if (!user.current_lat || !user.current_lng) return;

      const isAppActive = user.is_app_active !== false;
      const opStatus = user.operational_status || (user.status === 'MOVING' ? 'MOVING' : user.status === 'WORKING' ? 'WORKING' : 'IDLE');
      const isMoving = opStatus === 'MOVING';
      const isWorking = opStatus === 'WORKING';
      const isSelected = selectedUserId === user.id;

      let statusColor = 'bg-slate-400';
      let statusText = 'Rảnh rỗi';

      if (!isAppActive) {
        statusColor = 'bg-slate-500';
        statusText = 'Đã tắt app';
      } else if (isMoving) {
        statusColor = 'bg-amber-500';
        statusText = 'Đang di chuyển';
      } else if (isWorking) {
        statusColor = 'bg-emerald-600';
        statusText = 'Đang tác nghiệp';
      }

      const activeDuty = user.jobStaffs?.[0];
      const activeJob = activeDuty?.job;
      const carriedGear = user.transportAssignments?.filter(t => t.check_in_status === 'CONFIRMED' && t.check_out_status !== 'CONFIRMED') || [];

      // Đánh giá nguy cơ đi muộn (phải tới trước 30 phút trước giờ bóng lăn)
      let punctuality: any = null;
      let isLate = false;
      let isRush = false;
      if (isAppActive && activeJob && (activeJob.location as any)?.latitude && (activeJob.location as any)?.longitude) {
        punctuality = evaluateStaffPunctuality(
          user.current_lat,
          user.current_lng,
          (activeJob.location as any).latitude,
          (activeJob.location as any).longitude,
          activeJob.start_time,
          isWorking
        );
        isLate = punctuality?.riskLevel === 'CRITICAL_LATE';
        isRush = punctuality?.riskLevel === 'WARNING_RUSH';
      }

      const el = document.createElement('div');
      el.className = 'custom-staff-marker cursor-pointer';
      el.innerHTML = `
        <div class="relative flex flex-col items-center group cursor-pointer -translate-y-4">
          ${isLate ? '<div class="absolute -inset-2 rounded-full bg-rose-500/50 animate-ping"></div>' : isMoving ? '<div class="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping"></div>' : ''}
          <div class="relative w-11 h-11 rounded-full overflow-hidden border-2 ${
            isLate
              ? 'border-rose-500 ring-4 ring-rose-500/60 scale-110'
              : isSelected
              ? 'border-amber-500 ring-4 ring-amber-400/40 scale-110'
              : !isAppActive
              ? 'border-slate-300 opacity-65 grayscale-[30%]'
              : 'border-white'
          } shadow-lg bg-white">
            <img src="${resolveAvatarUrl(user.avatar_url)}" alt="${user.name}" class="w-full h-full object-cover" onerror="if(this.src.includes('avatars/')){this.src='/avatar_nhanVien/' + this.src.split('avatars/').pop().split('?')[0];}else{this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';}" />
            <div class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ${statusColor} border-2 border-white"></div>
          </div>
          <div class="mt-1 bg-white text-slate-900 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md border ${
            isLate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
          } flex items-center gap-1">
            <span>${user.name.split(' ').slice(-2).join(' ')}</span>
            ${!isAppActive ? '<span class="bg-slate-700 text-white font-bold text-[8px] px-1 rounded-full">📴 Tắt</span>' : ''}
            ${isLate ? `<span class="bg-rose-600 text-white font-black text-[8px] px-1 py-0.2 rounded-full animate-pulse">🚨 TRỄ ${punctuality.lateMinutes}p</span>` : ''}
            ${isRush && !isLate ? '<span class="bg-amber-500 text-slate-950 font-black text-[8px] px-1 rounded-full">⚡ Gấp</span>' : ''}
            ${carriedGear.length > 0 ? `<span class="bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-full">📦${carriedGear.length}</span>` : ''}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onSelectUser) onSelectUser(user.id);
      });

      // Popup content with detailed cargo, destination and punctuality
      const popupHtml = `
        <div class="p-3 max-w-[290px] bg-white rounded-xl text-slate-800">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
            <div class="w-9 h-9 rounded-full overflow-hidden border border-slate-300 shrink-0">
              <img src="${resolveAvatarUrl(user.avatar_url)}" class="w-full h-full object-cover" onerror="if(this.src.includes('avatars/')){this.src='/avatar_nhanVien/' + this.src.split('avatars/').pop().split('?')[0];}else{this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';}" />
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-slate-900 leading-tight truncate">${user.name}</h4>
              <p class="text-[11px] text-slate-500 font-mono">Khu vực: <strong class="text-slate-800">${user.address_district || 'Chưa cập nhật'}</strong></p>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor} text-white shrink-0">
              ${statusText}
            </span>
          </div>

          ${
            !isAppActive
              ? '<div class="mb-2 bg-slate-100 p-2 rounded-lg border border-slate-200 text-[11px] text-slate-600 italic">Nhân viên đã TẮT ứng dụng. Vị trí GPS hiện tại được lưu từ phiên làm việc gần nhất.</div>'
              : ''
          }

          ${
            isLate
              ? `
              <div class="mb-2 bg-rose-50 p-2.5 rounded-xl border-2 border-rose-400 text-rose-950 space-y-1">
                <div class="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                  <span>🚨 CẢNH BÁO NGUY CƠ ĐI MUỘN</span>
                </div>
                <div class="text-[11px] font-bold">
                  Cách sân: <strong>${punctuality.distanceKm} km</strong> (~${punctuality.travelMinutes}p đi xe)
                </div>
                <div class="text-[10px] text-rose-800 leading-tight">
                  Hạn chót có mặt: <strong>${punctuality.deadlineTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>. Dự kiến tới lúc <strong>${punctuality.estimatedArrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong> (Trễ ${punctuality.lateMinutes} phút so với mốc 30p trước giờ bóng lăn).
                </div>
              </div>
            `
              : isRush
              ? `
              <div class="mb-2 bg-amber-50 p-2 rounded-xl border border-amber-300 text-amber-900 text-[11px] font-medium">
                ⚡ Cần xuất phát ngay! Chỉ còn ${punctuality.marginMinutes} phút dôi dư trước hạn chót có mặt (${punctuality.deadlineTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).
              </div>
            `
              : ''
          }

          ${
            activeJob
              ? `
              <div class="mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div class="text-[10px] uppercase font-bold text-emerald-700 mb-0.5">🏟️ Ca làm việc đang gán</div>
                <div class="text-xs font-bold text-slate-900 leading-tight">${activeJob.title}</div>
                <div class="text-[11px] text-slate-600 mt-0.5">${activeJob.location?.name || ''}</div>
                ${activeDuty?.duty ? `<div class="text-[10px] font-bold text-blue-700 mt-1">Vai trò: ${activeDuty.duty}</div>` : ''}
                ${(activeJob as any).notes ? `<div class="text-[10px] text-blue-900 bg-blue-50 border border-blue-200 rounded p-1 mt-1 font-medium leading-tight">📝 ${(activeJob as any).notes}</div>` : ''}
              </div>
            `
              : '<div class="text-xs text-slate-400 mb-2 italic">Hiện chưa phân công ca làm</div>'
          }

          <div>
            <div class="text-[10px] uppercase font-bold text-amber-800 mb-1 flex items-center justify-between">
              <span>📦 THIẾT BỊ ĐƯỢC GIAO CHỞ</span>
              <span class="text-[10px] text-slate-500 font-bold">${carriedGear.length} món</span>
            </div>
            ${
              carriedGear.length > 0
                ? `
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  ${carriedGear
                    .map(
                      (g: any) => `
                    <div class="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                      <div class="flex items-center justify-between">
                        <span class="text-slate-800 font-medium">${g.equipment?.name || 'Thiết bị'}</span>
                        <span class="text-[10px] font-bold ${g.check_in_status === 'CONFIRMED' ? 'text-emerald-700' : 'text-amber-700'}">${g.check_in_status === 'CONFIRMED' ? '✓ Đã lấy' : '⏳ Chờ lấy'}</span>
                      </div>
                      ${g.handover_notes ? `<div class="text-[9px] text-amber-800 italic mt-0.5">⚠️ ${g.handover_notes}</div>` : ''}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                : '<p class="text-[11px] text-slate-400 italic">Không chở thiết bị nào</p>'
            }
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-400 text-right">
            Cập nhật: ${user.last_location_update ? new Date(user.last_location_update).toLocaleTimeString('vi-VN') : 'Vừa xong'}
          </div>
        </div>
      `;

      const popup = new goongjs.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml);

      const marker = new goongjs.Marker(el)
        .setLngLat([user.current_lng, user.current_lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current[`user-${user.id}`] = marker;
    });

    // Pan to selected user if specified
    if (selectedUserId) {
      const selected = users.find((u) => u.id === selectedUserId);
      if (selected && selected.current_lat && selected.current_lng) {
        map.flyTo({ center: [selected.current_lng, selected.current_lat], zoom: 16 });
        markersRef.current[`user-${selected.id}`]?.togglePopup();
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => mapInstanceRef.current?.resize()}
    >
      {!isMounted && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-emerald-700 text-sm">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Đang tải Goong Maps TP. Hồ Chí Minh...</span>
          </div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 shadow-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Goong.io Live Map</span>
      </div>
    </div>
  );
}
