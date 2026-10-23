import { useEffect, useRef } from 'react';

/**
 * useRealtimeSync:
 * 1. Kết nối `/api/realtime` qua SSE (Server-Sent Events) tự động kết nối lại khi rớt mạng.
 * 2. Hỗ trợ `BroadcastChannel('bongdaso_realtime_channel')` để đồng bộ <1ms giữa các tab cùng trình duyệt.
 * 3. Bắt sự kiện `visibilitychange` (khi người dùng chuyển sang tab khác rồi quay lại, tự động kéo dữ liệu mới nhất).
 * 4. Chu kỳ polling dự phòng 5s khi tab đang hiển thị để đảm bảo 100% không bao giờ bị lệch dữ liệu.
 */
export function useRealtimeSync(onSync: () => void, enabled: boolean = true) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isSubscribed = true;

    // 1. Cross-tab BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('bongdaso_realtime_channel');
        broadcastChannel.onmessage = () => {
          onSyncRef.current?.();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // 2. Connect SSE
    const connectSSE = () => {
      if (!isSubscribed) return;
      try {
        eventSource = new EventSource('/api/realtime');

        eventSource.addEventListener('update', () => {
          onSyncRef.current?.();
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isSubscribed) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        console.warn('SSE connection failed, falling back to polling:', err);
      }
    };

    connectSSE();

    // 3. Fallback smart polling every 5 seconds when visible
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onSyncRef.current?.();
      }
    }, 5000);

    // 4. Tab visibility sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onSyncRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [enabled]);
}

// Bắn thông báo nội bộ cho các tab khác trong cùng trình duyệt
export function notifyLocalTabs() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('bongdaso_realtime_channel');
      bc.postMessage({ type: 'MUTATION_OCCURRED', time: Date.now() });
      setTimeout(() => bc.close(), 100);
    }
  } catch {}
}
