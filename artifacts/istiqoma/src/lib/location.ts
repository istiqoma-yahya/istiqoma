export const LOCATION_STORAGE_KEY = "qibla_last_location";

export interface SavedLocation {
  latitude: number;
  longitude: number;
  placeName?: string | null;
  manual?: boolean;
}

export function getSavedLocation(): SavedLocation | null {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        return {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          placeName: typeof parsed.placeName === "string" ? parsed.placeName : null,
          manual: parsed.manual === true,
        };
      }
    }
  } catch {}
  return null;
}

export function saveLocation(
  latitude: number,
  longitude: number,
  placeName?: string | null,
  manual: boolean = false,
) {
  try {
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ latitude, longitude, placeName: placeName ?? null, manual }),
    );
  } catch {}
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
}

function buildPlaceName(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.suburb ||
    null;
  const region = address.state || address.region || null;
  const country = address.country || null;
  const parts = [locality, region, country].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  if (parts.length === 0) return null;
  return parts.join(", ");
}

const placeNameCache = new Map<string, string>();

function cacheKey(latitude: number, longitude: number, language: string): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}|${language}`;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string,
  signal: AbortSignal,
): Promise<string | null> {
  const key = cacheKey(latitude, longitude, language);
  const cached = placeNameCache.get(key);
  if (cached) return cached;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", language);
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const name = buildPlaceName(data?.address);
  if (name) placeNameCache.set(key, name);
  return name;
}

export interface PlaceSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(
  query: string,
  language: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", language);
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!isFinite(lat) || !isFinite(lon)) return null;
      const friendly = buildPlaceName(item.address) || item.display_name || null;
      if (!friendly) return null;
      return {
        displayName: friendly,
        latitude: lat,
        longitude: lon,
      } as PlaceSuggestion;
    })
    .filter((x): x is PlaceSuggestion => x !== null);
}
