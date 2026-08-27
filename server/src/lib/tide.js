// 潮名（大潮/中潮/小潮/長潮/若潮）は本来、海域ごとの実測にもとづく潮汐表
// （気象庁・海上保安庁など）で決まるが、無料でキー不要の公式APIが無いため、
// 旧暦日（新月を1日目とする月内の日）ベースの一般的な近似表で代用する。
// 実際の潮回りとは海域や気圧配置により数日ずれることがある「目安」である前提で使うこと。

const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 基準となる新月時刻
const SYNODIC_MONTH = 29.530588853; // 朔望月（日）

const TIDE_TABLE = {
  1: "若潮", 2: "中潮", 3: "中潮", 4: "大潮", 5: "大潮", 6: "大潮", 7: "中潮",
  8: "中潮", 9: "小潮", 10: "小潮", 11: "長潮", 12: "若潮", 13: "中潮", 14: "中潮",
  15: "大潮", 16: "大潮", 17: "大潮", 18: "中潮", 19: "中潮", 20: "小潮", 21: "小潮",
  22: "小潮", 23: "長潮", 24: "若潮", 25: "中潮", 26: "中潮", 27: "大潮", 28: "大潮",
  29: "大潮", 30: "中潮",
};

function moonAge(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const age = days % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

export function estimateTideName(dateInput) {
  const age = moonAge(new Date(dateInput));
  const lunarDay = Math.min(30, Math.max(1, Math.floor(age) + 1));
  return TIDE_TABLE[lunarDay] ?? "中潮";
}
