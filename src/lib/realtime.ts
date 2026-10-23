import { EventEmitter } from 'events';

declare global {
  var __realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter: EventEmitter = global.__realtimeEmitter || new EventEmitter();
realtimeEmitter.setMaxListeners(500);

if (process.env.NODE_ENV !== 'production') {
  global.__realtimeEmitter = realtimeEmitter;
}

export function broadcastRealtimeEvent(event: { type: string; payload?: any }) {
  try {
    realtimeEmitter.emit('app_event', {
      ...event,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Error broadcasting realtime event:', err);
  }
}
