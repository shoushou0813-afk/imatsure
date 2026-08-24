import { Router } from "express";
import { prisma } from "../db.js";
import { wrap } from "../middleware/error.js";

const r = Router();

r.get("/", wrap(async (req, res) => {
  const { q, area } = req.query;
  const spots = await prisma.spot.findMany({
    where: {
      ...(q ? { name: { contains: String(q) } } : {}),
      ...(area ? { area: { slug: String(area) } } : {}),
    },
    include: { area: true, _count: { select: { trips: true } } },
    orderBy: { id: "asc" },
  });
  res.json({ data: spots });
}));

r.get("/:slug", wrap(async (req, res) => {
  const spot = await prisma.spot.findUnique({
    where: { slug: req.params.slug },
    include: { area: true },
  });
  if (!spot) return res.status(404).json({ error: { message: "釣り場が見つかりません" } });
  res.json({ data: spot });
}));

/**
 * 直近◯時間の釣況サマリー。
 * 一覧を見る前に「今どうなっているか」を3秒で掴ませるための集計。
 * TODO(学習): 釣行が増えたらこの集計はキャッシュする（例：5分間メモリに保持）。
 */
r.get("/:slug/summary", wrap(async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 72, 24 * 30);
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: { message: "釣り場が見つかりません" } });

  const trips = await prisma.trip.findMany({
    where: { spotId: spot.id, deletedAt: null, startedAt: { gte: since } },
    include: { catches: { include: { fish: true } } },
  });

  // 魚種ランキング
  const byFish = new Map();
  let totalFish = 0, maxSize = null;
  for (const t of trips) {
    for (const c of t.catches) {
      byFish.set(c.fish.name, (byFish.get(c.fish.name) || 0) + c.count);
      totalFish += c.count;
      if (c.sizeCm && (!maxSize || c.sizeCm > maxSize.sizeCm)) maxSize = { sizeCm: c.sizeCm, fish: c.fish.name };
    }
  }
  const topFishes = [...byFish.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // 開始時刻の時間帯分布（0〜23時）
  const hourly = Array(24).fill(0);
  for (const t of trips) hourly[new Date(t.startedAt).getHours()] += 1;

  const skunked = trips.filter((t) => t.isSkunked || t.catches.length === 0).length;

  res.json({
    data: {
      spot: { id: spot.id, name: spot.name, slug: spot.slug },
      hours,
      tripCount: trips.length,
      topFishes,
      hourly,
      avgFishPerTrip: trips.length ? Number((totalFish / trips.length).toFixed(1)) : 0,
      skunkRate: trips.length ? Math.round((skunked / trips.length) * 100) : 0,
      maxSize,
    },
  });
}));

export default r;
