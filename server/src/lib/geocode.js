const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * 住所や目印の文字列から緯度経度を引く。
 * Nominatim（OpenStreetMap）はAPIキー不要で使えるが、利用規約で
 * User-Agentの明示と過度な連打の禁止が定められているため、それに従う。
 */
export async function geocodeAddress(text) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=jp&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "imatsure-dev/0.1 (fishing spot board; local dev use)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("地図サービスへの問い合わせに失敗しました。時間をおいて試してください。");

  const results = await res.json();
  if (!results.length) return null;

  const { lat, lon } = results[0];
  return { lat: Number(lat), lng: Number(lon) };
}
