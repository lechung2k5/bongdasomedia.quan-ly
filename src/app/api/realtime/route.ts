import { NextRequest } from 'next/server';
import { realtimeEmitter } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection message
      try {
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`));
      } catch (err) {
        console.error('SSE start error:', err);
      }

      // 2. Event listener
      const onAppEvent = (eventData: any) => {
        try {
          controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify(eventData)}\n\n`));
        } catch {
          // Client stream closed
        }
      };

      realtimeEmitter.on('app_event', onAppEvent);

      // 3. Keep-alive heartbeat ping every 15 seconds
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // 4. Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        realtimeEmitter.off('app_event', onAppEvent);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
