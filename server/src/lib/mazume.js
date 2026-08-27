// 朝マズメ・夕マズメ（日の出・日没前後、魚の活性が上がるとされる時間帯）を近似する。
// tide.js と同じ考え方：外部APIのたびに呼ぶと集計が重くなるので、月ごとの日本本土の
// 日の出・日没のおおよその時刻を表にして即座に計算する。緯度差で数十分ずれる「目安」。

// [日の出時, 日没時]（24時間表記の小数）。月初を代表値とする。
const MONTHLY_SUN = {
  1: [6.8, 16.8], 2: [6.5, 17.3], 3: [5.9, 17.8], 4: [5.2, 18.3],
  5: [4.7, 18.8], 6: [4.4, 19.1], 7: [4.6, 19.0], 8: [5.0, 18.5],
  9: [5.4, 17.8], 10: [5.8, 17.1], 11: [6.2, 16.6], 12: [6.6, 16.5],
};

const MAZUME_WINDOW_HOURS = 1; // 日の出・日没の前後1時間を「マズメ」とする

/** 開始時刻から「朝マズメ／夕マズメ／日中／夜間」を判定する。 */
export function mazumeLabel(dateInput) {
  const d = new Date(dateInput);
  const hour = d.getHours() + d.getMinutes() / 60;
  const [rise, set] = MONTHLY_SUN[d.getMonth() + 1];

  if (Math.abs(hour - rise) <= MAZUME_WINDOW_HOURS) return "朝マズメ";
  if (Math.abs(hour - set) <= MAZUME_WINDOW_HOURS) return "夕マズメ";
  if (hour > rise + MAZUME_WINDOW_HOURS && hour < set - MAZUME_WINDOW_HOURS) return "日中";
  return "夜間";
}
