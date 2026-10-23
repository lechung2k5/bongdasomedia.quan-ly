'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapPin, Search, Check, X, Crosshair, Navigation, Loader2, Sparkles, Building2 } from 'lucide-react';
import {
  getGoongJS,
  GOONG_MAP_STYLE,
  searchGoongPlaces,
  getGoongPlaceDetail,
  reverseGeocodeGoong,
  GoongPrediction,
} from '@/lib/goong';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
  venueName?: string;
  onConfirm: (data: { address: string; latitude: number | null; longitude: number | null }) => void;
}

interface PresetStadium {
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
}

// 18 Sân bóng thực tế của Bóng Đá Số Media + các sân bóng phủ sóng lớn tại TP.HCM
const COMMON_STADIUMS: PresetStadium[] = [
  { name: 'Sân bóng đá Prolux', address: 'Đường số 7, An Lạc A, Bình Tân, TP.HCM', district: 'Bình Tân', lat: 10.7485, lng: 106.6025 },
  { name: 'Sân bóng đá Phủi Bình Tân', address: 'Hồ Học Lãm, An Lạc, Bình Tân, TP.HCM', district: 'Bình Tân', lat: 10.7650, lng: 106.5980 },
  { name: 'Sân bóng đá Cây Cám', address: 'Bình Hưng Hòa B, Bình Tân, TP.HCM', district: 'Bình Tân', lat: 10.7812, lng: 106.5890 },
  { name: 'Sân bóng đá Hoàn Anh', address: 'Tân Kiên, Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7180, lng: 106.6210 },
  { name: 'Sân bóng đá Gia Phú', address: 'Bình Hưng Hòa, Bình Tân, TP.HCM', district: 'Bình Tân', lat: 10.7950, lng: 106.6050 },
  { name: 'Sân bóng đá H2', address: 'Tân Sơn, Phường 15, Tân Bình, TP.HCM', district: 'Tân Bình', lat: 10.8020, lng: 106.6540 },
  { name: 'Sân bóng đá Thanh Thảo', address: 'Đường số 20, Phường 5, Gò Vấp, TP.HCM', district: 'Gò Vấp', lat: 10.8420, lng: 106.6710 },
  { name: 'Sân bóng đá Phúc Lợi', address: 'Cộng Hòa, Phường 13, Tân Bình, TP.HCM', district: 'Tân Bình', lat: 10.8120, lng: 106.6480 },
  { name: 'Sân bóng đá Khôi Nguyên', address: 'Bình Hưng, Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7250, lng: 106.6780 },
  { name: 'Sân bóng đá Hồng Ngọc', address: 'Bình Trị Đông, Bình Tân, TP.HCM', district: 'Bình Tân', lat: 10.7890, lng: 106.6220 },
  { name: 'Sân bóng đá IFS Park', address: 'Phan Văn Trị, Phường 10, Gò Vấp, TP.HCM', district: 'Gò Vấp', lat: 10.8350, lng: 106.6620 },
  { name: 'Sân bóng đá Thăng Long', address: 'Thăng Long, Phường 4, Tân Bình, TP.HCM', district: 'Tân Bình', lat: 10.8050, lng: 106.6610 },
  { name: 'Sân bóng đá PM Sport', address: 'Quốc Lộ 50, Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7120, lng: 106.6350 },
  { name: 'Sân bóng đá Sông Quê', address: 'Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7020, lng: 106.6190 },
  { name: 'Sân bóng đá Mizuki', address: 'Khu đô thị Mizuki Park, Bình Hưng, Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7150, lng: 106.6690 },
  { name: 'Sân bóng đá Đại Long 1', address: 'Tân Túc, Bình Chánh, TP.HCM', district: 'Bình Chánh', lat: 10.7310, lng: 106.6110 },
  { name: 'Sân bóng đá Quốc Hưng Arena', address: 'Lê Đức Thọ, Phường 16, Gò Vấp, TP.HCM', district: 'Gò Vấp', lat: 10.8560, lng: 106.6750 },
  { name: 'Sân bóng đá Tân Tạo - Đức Hòa', address: 'Tân Tạo, Bình Chánh / Đức Hòa, TP.HCM', district: 'Bình Chánh', lat: 10.7720, lng: 106.5410 },
  { name: 'Sân bóng đá Chuyên Việt', address: '18D Cộng Hòa, Phường 4, Tân Bình, TP.HCM', district: 'Tân Bình', lat: 10.8035, lng: 106.6570 },
  { name: 'Sân bóng đá Chu Văn An', address: 'Chu Văn An, Phường 26, Bình Thạnh, TP.HCM', district: 'Bình Thạnh', lat: 10.8160, lng: 106.7030 },
  { name: 'Sân bóng đá Celadon Tân Phú', address: 'Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP.HCM', district: 'Tân Phú', lat: 10.8015, lng: 106.6185 },
  { name: 'Sân vận động Phú Thọ', address: '219 Lý Thường Kiệt, Phường 15, Quận 11, TP.HCM', district: 'Quận 11', lat: 10.7680, lng: 106.6575 },
  { name: 'Sân bóng đá Kỳ Hòa', address: 'Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM', district: 'Quận 10', lat: 10.7750, lng: 106.6680 },
  { name: 'Sân bóng đá Đầm Sen', address: 'Hòa Bình, Phường 3, Quận 11, TP.HCM', district: 'Quận 11', lat: 10.7665, lng: 106.6420 },
  { name: 'Sân bóng K334 Tân Bình', address: 'K334 Lê Trung Nghĩa, Phường 12, Tân Bình, TP.HCM', district: 'Tân Bình', lat: 10.7995, lng: 106.6515 },
];

const DISTRICT_PRESETS: { name: string; lat: number; lng: number }[] = [
  { name: 'Bình Tân', lat: 10.765, lng: 106.602 },
  { name: 'Gò Vấp', lat: 10.838, lng: 106.666 },
  { name: 'Bình Chánh', lat: 10.718, lng: 106.621 },
  { name: 'Tân Bình', lat: 10.801, lng: 106.654 },
  { name: 'Quận 7', lat: 10.734, lng: 106.721 },
  { name: 'TP. Thủ Đức', lat: 10.850, lng: 106.758 },
  { name: 'Tân Phú', lat: 10.790, lng: 106.628 },
  { name: 'Quận 12', lat: 10.867, lng: 106.641 },
];

// Helper chuẩn hóa tiếng Việt để tìm kiếm không dấu siêu tốc
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialAddress,
  venueName,
  onConfirm,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [lat, setLat] = useState<number | null>(initialLat || 10.78);
  const [lng, setLng] = useState<number | null>(initialLng || 106.65);
  const [address, setAddress] = useState<string>(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<GoongPrediction[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setLat(initialLat || 10.78);
      setLng(initialLng || 106.65);
      setAddress(initialAddress || '');
      setSearchQuery('');
      setPredictions([]);
      setShowDropdown(false);
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  // Instant local stadium search (0ms, no network delay)
  const localStadiumMatches = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    const normalized = removeVietnameseTones(trimmed);
    return COMMON_STADIUMS.filter((s) => {
      const normName = removeVietnameseTones(s.name);
      const normAddr = removeVietnameseTones(s.address);
      const normDist = removeVietnameseTones(s.district);
      return (
        normName.includes(normalized) ||
        normAddr.includes(normalized) ||
        normDist.includes(normalized)
      );
    }).slice(0, 5); // Tối đa 5 gợi ý nhanh nhất
  }, [searchQuery]);

  // Reverse geocode via Goong
  const handleReverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const fullAddress = await reverseGeocodeGoong(latitude, longitude);
      if (fullAddress) {
        setAddress(fullAddress);
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Optimized debounced search via Goong API with AbortController
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    // Cancel previous inflight search
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchGoongPlaces(trimmed, '10.78,106.65', 50, abortController.signal);
        if (!abortController.signal.aborted) {
          setPredictions(results);
          setShowDropdown(true);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery]);

  // Initialize Goong JS Vector Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isSubscribed = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initGoongMap() {
      try {
        const goongjs = await getGoongJS();
        if (!goongjs || !mapContainerRef.current || !isSubscribed) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
        }

        const centerLng = lng || 106.65;
        const centerLat = lat || 10.78;

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: GOONG_MAP_STYLE,
          center: [centerLng, centerLat],
          zoom: lat && lng ? 15 : 12,
          attributionControl: true,
        });

        // Add navigation controls (zoom in/out)
        map.addControl(new goongjs.NavigationControl(), 'bottom-right');

        // Pin Element
        const pinEl = document.createElement('div');
        pinEl.className = 'relative flex items-center justify-center cursor-pointer';
        pinEl.innerHTML = `
          <div class="relative flex items-center justify-center -translate-y-4">
            <div class="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-rose-400/40">
              <span class="text-base font-black">📍</span>
            </div>
          </div>
        `;

        const marker = new goongjs.Marker(pinEl, { draggable: true })
          .setLngLat([centerLng, centerLat])
          .addTo(map);

        markerRef.current = marker;

        // Click on map to move pin
        map.on('click', async (e: any) => {
          const newLng = parseFloat(e.lngLat.lng.toFixed(6));
          const newLat = parseFloat(e.lngLat.lat.toFixed(6));
          marker.setLngLat([newLng, newLat]);
          setLat(newLat);
          setLng(newLng);
          handleReverseGeocode(newLat, newLng);
        });

        // Drag marker
        marker.on('dragend', async () => {
          const pos = marker.getLngLat();
          const newLng = parseFloat(pos.lng.toFixed(6));
          const newLat = parseFloat(pos.lat.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          handleReverseGeocode(newLat, newLng);
        });

        mapInstanceRef.current = map;

        // Resize observer to ensure 100% full-frame render
        if (mapContainerRef.current && typeof window !== 'undefined' && 'ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        // Trigger map.resize() at multiple intervals to completely eliminate half-frame issue
        map.on('load', () => {
          map.resize();
        });
        [50, 150, 300, 500, 800, 1200].forEach((delay) => {
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize();
            }
          }, delay);
        });
      } catch (err) {
        console.error('Failed to init Goong Map in LocationPickerModal:', err);
      }
    }

    initGoongMap();

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
        markerRef.current = null;
      }
    };
  }, [isOpen, handleReverseGeocode]);

  // Chọn ngay một sân bóng từ danh sách Instant Preset
  const handleSelectLocalStadium = (stadium: PresetStadium) => {
    setLat(stadium.lat);
    setLng(stadium.lng);
    setAddress(stadium.address);
    setSearchQuery(stadium.name);
    setShowDropdown(false);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo({
        center: [stadium.lng, stadium.lat],
        zoom: 16,
      });
      markerRef.current.setLngLat([stadium.lng, stadium.lat]);
      mapInstanceRef.current.resize();
    }
  };

  // Execute Immediate Search (when pressing Enter or clicking "Tìm")
  const handleImmediateSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Nếu có kết quả local matches ngay, chọn luôn cái đầu tiên
    if (localStadiumMatches.length > 0) {
      handleSelectLocalStadium(localStadiumMatches[0]);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abort = new AbortController();
    searchAbortRef.current = abort;

    setIsSearching(true);
    try {
      const results = await searchGoongPlaces(query, '10.78,106.65', 50, abort.signal);
      setPredictions(results);
      if (results.length > 0) {
        await handleSelectPrediction(results[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from Goong Autocomplete Suggestions
  const handleSelectPrediction = async (p: GoongPrediction) => {
    setIsSearching(true);
    setPredictions([]);
    setShowDropdown(false);
    setSearchQuery(p.structured_formatting?.main_text || p.description);

    try {
      const detail = await getGoongPlaceDetail(p.place_id);
      if (detail) {
        setLat(detail.lat);
        setLng(detail.lng);
        setAddress(detail.address);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo({
            center: [detail.lng, detail.lat],
            zoom: 16,
          });
          markerRef.current.setLngLat([detail.lng, detail.lat]);
          mapInstanceRef.current.resize();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // Jump to District Preset
  const handleJumpDistrict = (preset: { name: string; lat: number; lng: number }) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setPredictions([]);
    setShowDropdown(false);
    if (!address) {
      setAddress(`${preset.name}, TP.HCM`);
    }
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo({
        center: [preset.lng, preset.lat],
        zoom: 14,
      });
      markerRef.current.setLngLat([preset.lng, preset.lat]);
      mapInstanceRef.current.resize();
    }
    handleReverseGeocode(preset.lat, preset.lng);
  };

  if (!isOpen) return null;

  const hasSuggestions = (localStadiumMatches.length > 0 || predictions.length > 0) && showDropdown;

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight flex items-center gap-1.5">
                <span>Chọn Vị Trí Sân Bóng {venueName ? `: ${venueName}` : ''}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Goong.io Maps
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Bản đồ Goong Maps tiếng Việt chuẩn xác. Chạm hoặc kéo ghim đỏ để định vị sân
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg font-bold cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar with Instant Local Matches + Goong Autocomplete (Zero Lag) */}
        <div className="relative shrink-0">
          <form onSubmit={handleImmediateSearch} className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Gõ tên sân bóng hoặc địa chỉ (VD: Prolux, H2, Cây Cám, Chu Văn An, Bình Tân)..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setShowDropdown(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPredictions([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Tìm</span>
            </button>
          </form>

          {/* Autocomplete Predictions Dropdown (Instant Local + Goong REST) */}
          {hasSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {/* 1. Sân bóng quen thuộc BĐS (Gợi ý tức thì 0ms) */}
              {localStadiumMatches.length > 0 && (
                <div className="p-1 bg-slate-50">
                  <div className="px-2.5 py-1 text-[10px] font-black text-rose-600 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Sân bóng quen thuộc BĐS (Gợi ý tức thì)</span>
                  </div>
                  {localStadiumMatches.map((stadium) => (
                    <button
                      key={stadium.name}
                      type="button"
                      onClick={() => handleSelectLocalStadium(stadium)}
                      className="w-full text-left p-2 hover:bg-rose-50 rounded-xl transition-colors flex items-start gap-2 cursor-pointer group"
                    >
                      <Building2 className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{stadium.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold shrink-0">
                            {stadium.district}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {stadium.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Địa chỉ tìm kiếm từ Goong Maps */}
              {predictions.length > 0 && (
                <div className="p-1">
                  <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>Địa chỉ tìm trên Goong Maps</span>
                  </div>
                  {predictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      onClick={() => handleSelectPrediction(p)}
                      className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {p.structured_formatting?.main_text || p.description}
                        </div>
                        {p.structured_formatting?.secondary_text && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {p.structured_formatting.secondary_text}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick District Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none shrink-0">
          <span className="text-slate-400 font-semibold shrink-0">Khu vực:</span>
          {DISTRICT_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleJumpDistrict(p)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Map Container (Fixed Dimensions, Full-Frame Render) */}
        <div
          className="relative w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100 shrink-0"
          onMouseEnter={() => mapInstanceRef.current?.resize()}
        >
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
          <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 shadow-sm flex items-center gap-1.5">
            <Crosshair className="w-3 h-3 text-rose-600 animate-pulse" />
            <span>Chạm hoặc kéo ghim đỏ để định vị trên Goong Maps</span>
          </div>
        </div>

        {/* Selected Coordinates & Address Input */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Địa chỉ Goong.io:</span>
            </label>
            <div className="flex items-center gap-2">
              {isGeocoding && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                  Đang lấy địa chỉ...
                </span>
              )}
              {lat && lng && (
                <span className="font-mono text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold border border-rose-200">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Nhập địa chỉ hoặc vị trí cụ thể của sân bóng..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({
                address: address.trim(),
                latitude: lat,
                longitude: lng,
              });
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Xác Nhận Vị Trí Này</span>
          </button>
        </div>
      </div>
    </div>
  );
}
