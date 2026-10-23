// Goong.io Configuration and APIs for BÓNG ĐÁ SỐ MEDIA ERP

export const GOONG_MAPTILES_KEY =
  process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || 'EIrCceGEt7N0SEv9nMJfM9DySzFRyYygRXYqv61t';

export const GOONG_API_KEY =
  process.env.NEXT_PUBLIC_GOONG_API_KEY || 'MPEqUMBdbR1WFaTmu1JfbmviYgyScrQwQ91fXcGL';

export const GOONG_MAP_STYLE = 'https://tiles.goong.io/assets/goong_map_web.json';

/**
 * Get Goong JS instance safely on the client side from CDN script (window.goongjs)
 */
export async function getGoongJS(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if ((window as any).goongjs) {
    const g = (window as any).goongjs;
    g.accessToken = GOONG_MAPTILES_KEY;
    return g;
  }

  // Wait for window.goongjs to be loaded by the CDN script in layout.tsx
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds timeout

    const checkGoong = () => {
      attempts++;
      if ((window as any).goongjs) {
        const g = (window as any).goongjs;
        g.accessToken = GOONG_MAPTILES_KEY;
        resolve(g);
        return;
      }

      if (attempts >= maxAttempts) {
        // Fallback: Dynamically inject CDN script if not present
        if (!document.querySelector('script[src*="goong-js"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
          script.async = true;
          script.onload = () => {
            if ((window as any).goongjs) {
              const g = (window as any).goongjs;
              g.accessToken = GOONG_MAPTILES_KEY;
              resolve(g);
            } else {
              reject(new Error('Goong JS failed to initialize after script load'));
            }
          };
          script.onerror = () => reject(new Error('Failed to load Goong JS from CDN'));
          document.head.appendChild(script);
        } else {
          reject(new Error('Goong JS script timed out loading'));
        }
        return;
      }

      setTimeout(checkGoong, 100);
    };

    checkGoong();
  });
}

export interface GoongPrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

// In-memory caches to eliminate repeated network calls
const autocompleteCache = new Map<string, GoongPrediction[]>();
const placeDetailCache = new Map<string, { address: string; lat: number; lng: number }>();

/**
 * Search places using Goong Place AutoComplete (With caching and abort signal)
 */
export async function searchGoongPlaces(
  input: string,
  location: string = '10.78,106.65',
  radius: number = 50,
  signal?: AbortSignal
): Promise<GoongPrediction[]> {
  const query = input?.trim().toLowerCase();
  if (!query || query.length < 2) return [];

  if (autocompleteCache.has(query)) {
    return autocompleteCache.get(query)!;
  }

  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(
      input.trim()
    )}&location=${location}&radius=${radius}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const predictions = data.predictions || [];
    autocompleteCache.set(query, predictions);
    return predictions;
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    console.error('Goong Autocomplete error:', err);
    return [];
  }
}

/**
 * Get detailed place geometry (lat, lng) by place_id (With caching and abort signal)
 */
export async function getGoongPlaceDetail(
  placeId: string,
  signal?: AbortSignal
): Promise<{ address: string; lat: number; lng: number } | null> {
  if (!placeId) return null;

  if (placeDetailCache.has(placeId)) {
    return placeDetailCache.get(placeId)!;
  }

  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(
      placeId
    )}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.result;
    if (result && result.geometry?.location) {
      const detail = {
        address: result.formatted_address || result.name || '',
        lat: parseFloat(result.geometry.location.lat),
        lng: parseFloat(result.geometry.location.lng),
      };
      placeDetailCache.set(placeId, detail);
      return detail;
    }
    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    console.error('Goong Place Detail error:', err);
    return null;
  }
}

/**
 * Geocode text address to coordinates using Goong Geocode API
 */
export async function geocodeGoongAddress(
  address: string
): Promise<{ address: string; lat: number; lng: number } | null> {
  if (!address || !address.trim()) return null;
  try {
    const url = `https://rsapi.goong.io/geocode?address=${encodeURIComponent(
      address.trim()
    )}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const first = data.results[0];
      return {
        address: first.formatted_address || address,
        lat: parseFloat(first.geometry.location.lat),
        lng: parseFloat(first.geometry.location.lng),
      };
    }
    return null;
  } catch (err) {
    console.error('Goong Geocode error:', err);
    return null;
  }
}

/**
 * Reverse Geocode coordinates (lat, lng) to Vietnamese address using Goong Geocode API
 */
export async function reverseGeocodeGoong(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const url = `https://rsapi.goong.io/geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address || null;
    }
    return null;
  } catch (err) {
    console.error('Goong Reverse Geocode error:', err);
    return null;
  }
}
