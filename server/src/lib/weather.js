const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

// WMO weathercode（Open-Meteoの標準コード）を釣行フォームの日本語表記に丸める。
const WEATHER_LABELS = {
  0: "快晴", 1: "晴れ", 2: "晴れ", 3: "曇り",
  45: "霧", 48: "霧",
  51: "小雨", 53: "小雨", 55: "雨",
  56: "雨", 57: "雨",
  61: "雨", 63: "雨", 65: "強い雨",
  66: "雨", 67: "強い雨",
  71: "雪", 73: "雪", 75: "強い雪", 77: "雪",
  80: "にわか雨", 81: "にわか雨", 82: "激しいにわか雨",
  85: "雪", 86: "強い雪",
  95: "雷雨", 96: "雷雨", 99: "雷雨",
};

const DIR16 = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東",
  "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];

function degToDir(deg) {
  return DIR16[Math.round(deg / 22.5) % 16];
}

/** 対象時刻にいちばん近い時間のインデックスを探す。 */
function nearestIndex(times, target) {
  let bestIdx = -1, bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target.getTime());
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  });
  return bestIdx;
}

async function fetchHourly(base, extraParams, lat, lng, dateStr) {
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lng),
    timezone: "Asia/Tokyo", start_date: dateStr, end_date: dateStr,
    ...extraParams,
  });
  const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Open-Meteo（無料・APIキー不要）から、指定地点・日時にいちばん近い天気・風・海水温を取る。
 * 過去14日を超える古い日付は、リアルタイム予報APIに残っていないためarchive APIを使う。
 * 海水温（marine API）は近海のみ・データが無い地点もあるので、失敗しても致命的にはしない。
 */
export async function fetchWeatherAt(lat, lng, dateInput) {
  const target = new Date(dateInput);
  const dateStr = target.toISOString().slice(0, 10);
  const daysAgo = (Date.now() - target.getTime()) / 86400000;
  const base = daysAgo > 14 ? ARCHIVE_URL : FORECAST_URL;

  const [land, marine] = await Promise.all([
    fetchHourly(base, { hourly: "temperature_2m,windspeed_10m,winddirection_10m,weathercode" }, lat, lng, dateStr),
    fetchHourly(MARINE_URL, { hourly: "sea_surface_temperature" }, lat, lng, dateStr).catch(() => null),
  ]);

  if (!land?.hourly?.time?.length) return null;
  const idx = nearestIndex(land.hourly.time, target);

  const code = land.hourly.weathercode?.[idx];
  const windKmh = land.hourly.windspeed_10m?.[idx];
  const windDeg = land.hourly.winddirection_10m?.[idx];

  let waterTemp = null;
  if (marine?.hourly?.time?.length) {
    const mIdx = nearestIndex(marine.hourly.time, target);
    const v = marine.hourly.sea_surface_temperature?.[mIdx];
    if (typeof v === "number") waterTemp = Number(v.toFixed(1));
  }

  return {
    weather: WEATHER_LABELS[code] ?? null,
    windDir: typeof windDeg === "number" ? degToDir(windDeg) : null,
    windSpeed: typeof windKmh === "number" ? Number((windKmh / 3.6).toFixed(1)) : null, // km/h → m/s
    waterTemp,
  };
}
