import { Router } from "express";
import { prisma } from "../db.js";
import { wrap } from "../middleware/error.js";
import { VERIFY_THRESHOLD } from "./trips.js";
import { mazumeLabel } from "../lib/mazume.js";

const r = Router();

// 個票（誰がどこで釣ったか）まで晒すと特定の釣り場に人が殺到しかねないので、
// ランキングはエリア単位でのみ集計する。釣り場そのものを知りたければ、
// 元の釣行ページ（/trips/:id）を開けば従来通り見られる。
function areaFilter(areaSlug) {
  return areaSlug ? { spot: { area: { slug: String(areaSlug) } } } : {};
}

// 釣行者が「これは伏せたい」と選んだ釣行（precision=hidden）はランキング集計から外す。
const VISIBLE_TRIP = { deletedAt: null, precision: { not: "hidden" } };

function dateRange(daysAgo, windowDays) {
  const end = new Date(Date.now() - daysAgo * 86400000);
  const start = new Date(end.getTime() - windowDays * 86400000);
  return { start, end };
}

/**
 * 今週、エリアで釣れている魚種TOP5。前週比の増減を矢印で出す。
 * 「回遊が始まったか」を数字ではなく矢印1つで一瞬で読ませるための集計。
 */
r.get("/species", wrap(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  const where = areaFilter(req.query.area);

  const thisWindow = dateRange(0, days);
  const lastWindow = dateRange(days, days);

  const [thisCatches, lastCatches] = await Promise.all([
    prisma.catch.findMany({
      where: { trip: { ...VISIBLE_TRIP, startedAt: { gte: thisWindow.start, lt: thisWindow.end }, ...where } },
      include: { fish: true, trip: { select: { tideName: true, startedAt: true } } },
    }),
    prisma.catch.findMany({
      where: { trip: { ...VISIBLE_TRIP, startedAt: { gte: lastWindow.start, lt: lastWindow.end }, ...where } },
      include: { fish: true },
    }),
  ]);

  const tally = (list) => {
    const m = new Map();
    for (const c of list) m.set(c.fish.name, (m.get(c.fish.name) || 0) + c.count);
    return m;
  };
  const thisTally = tally(thisCatches);
  const lastTally = tally(lastCatches);

  // 「何が」だけでなく「いつ」も1行で分かるように、魚種ごとに一番多い
  // 潮回り×時間帯の組み合わせを添える。潮名が入っていない古い釣行は数えない。
  const jiaiByFish = new Map();
  for (const c of thisCatches) {
    if (!c.trip.tideName) continue;
    const key = `${c.trip.tideName}・${mazumeLabel(c.trip.startedAt)}`;
    const byKey = jiaiByFish.get(c.fish.name) ?? new Map();
    byKey.set(key, (byKey.get(key) || 0) + c.count);
    jiaiByFish.set(c.fish.name, byKey);
  }
  const bestJiai = (name) => {
    const byKey = jiaiByFish.get(name);
    if (!byKey) return null;
    const [key, count] = [...byKey.entries()].sort((a, b) => b[1] - a[1])[0];
    const [tideName, mazume] = key.split("・");
    return { tideName, mazume, count };
  };

  const ranking = [...thisTally.entries()]
    .map(([name, count]) => {
      const prevCount = lastTally.get(name) || 0;
      const trend = count > prevCount ? "up" : count < prevCount ? "down" : "flat";
      return { name, count, prevCount, trend, bestJiai: bestJiai(name) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({ data: { days, ranking } });
}));

/**
 * 大物ランキング（魚種別・エリア別）。
 * 「減衰」はスコア式ではなく期間窓で単純に実現する：日数を絞れば、
 * 古い釣果は自動的にランキングの対象外になる（既定30日）。
 */
r.get("/size", wrap(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  const since = new Date(Date.now() - days * 86400000);
  const where = areaFilter(req.query.area);
  const { fish: fishSlug } = req.query;

  const catches = await prisma.catch.findMany({
    where: {
      sizeCm: { not: null },
      trip: { ...VISIBLE_TRIP, startedAt: { gte: since }, ...where },
      ...(fishSlug ? { fish: { slug: String(fishSlug) } } : {}),
    },
    include: {
      fish: true,
      trip: {
        include: {
          user: { select: { displayName: true } },
          spot: { include: { area: true } },
          _count: { select: { verifications: true } },
        },
      },
    },
    orderBy: { sizeCm: "desc" },
    take: 20,
  });

  // サイズは自己申告なので、他の利用者に確認された記録かどうかをここでも見せる。
  const ranking = catches.map((c) => ({
    tripId: c.trip.id,
    fish: c.fish.name,
    sizeCm: c.sizeCm,
    area: c.trip.spot.area.name,
    angler: c.trip.user.displayName,
    startedAt: c.trip.startedAt,
    verified: c.trip._count.verifications >= VERIFY_THRESHOLD,
  }));

  res.json({ data: { days, ranking } });
}));

export default r;
