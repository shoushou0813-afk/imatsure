/** 表示用の整形をまとめる。画面ごとに書くとズレるので1か所に置く。 */

/** 何日前か（0=今日, 1=昨日 …）。鮮度の色分けに使う。 */
export function freshness(dateStr) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const days = Math.round((today - that) / 86400000);
  const level = days <= 0 ? 0 : days === 1 ? 1 : days <= 3 ? 2 : 3;
  const label = days <= 0 ? "今日" : days === 1 ? "昨日" : `${days}日前`;
  return { days, level, label };
}

export const hhmm = (dateStr) =>
  new Date(dateStr).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

/** 「ワラサ 68cm ×2」の形にする。イカのg、タチウオの「指3本」も吸収する。 */
export function catchLabel(c) {
  const size = c.sizeCm ? `${c.sizeCm}cm` : c.weightG ? `${c.weightG}g` : c.sizeNote || "";
  return { name: c.fish?.name ?? "", size, count: c.count };
}

export const relTime = (dateStr) => {
  const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  if (m < 1440) return `${Math.floor(m / 60)}時間前`;
  return `${Math.floor(m / 1440)}日前`;
};
