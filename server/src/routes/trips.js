import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();

const tripInclude = {
  user: { select: { id: true, handle: true, displayName: true } },
  spot: { select: { id: true, name: true, slug: true } },
  method: true,
  catches: { include: { fish: true } },
  _count: { select: { photos: true } },
};

/**
 * 釣況リスト。カーソルページング（「この時刻より前の N 件」）。
 * ページ番号方式だと、閲覧中に新しい投稿が入ると項目がずれて重複・欠落する。
 */
r.get("/", wrap(async (req, res) => {
  const { spot, fish, method, days, cursor } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const where = {
    deletedAt: null,
    ...(spot ? { spot: { slug: String(spot) } } : {}),
    ...(method ? { method: { slug: String(method) } } : {}),
    ...(fish ? { catches: { some: { fish: { slug: String(fish) } } } } : {}),
    ...(days ? { startedAt: { gte: new Date(Date.now() - Number(days) * 86400000) } } : {}),
    ...(cursor ? { startedAt: { lt: new Date(String(cursor)) } } : {}),
  };

  const trips = await prisma.trip.findMany({
    where, include: tripInclude, orderBy: { startedAt: "desc" }, take: limit + 1,
  });

  const hasMore = trips.length > limit;
  const page = hasMore ? trips.slice(0, limit) : trips;
  res.json({
    data: page,
    meta: { hasMore, nextCursor: hasMore ? page[page.length - 1].startedAt : null },
  });
}));

r.get("/:id", wrap(async (req, res) => {
  const trip = await prisma.trip.findFirst({
    where: { id: Number(req.params.id), deletedAt: null },
    include: { ...tripInclude, photos: true },
  });
  if (!trip) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  res.json({ data: trip });
}));

/** 釣行＋釣果をまとめて1リクエストで作る（画面の入力単位と揃える）。 */
r.post("/", requireAuth, wrap(async (req, res) => {
  const { spotId, methodId, startedAt, endedAt, tideName, tidePhase, weather,
          windDir, windSpeed, waterTemp, note, precision, catches = [] } = req.body;

  if (!spotId || !methodId || !startedAt)
    return res.status(400).json({ error: { message: "spotId / methodId / startedAt は必須です" } });

  const trip = await prisma.trip.create({
    data: {
      userId: req.user.id,
      spotId: Number(spotId),
      methodId: Number(methodId),
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : null,
      tideName, tidePhase, weather, windDir,
      windSpeed: windSpeed != null ? Number(windSpeed) : null,
      waterTemp: waterTemp != null ? Number(waterTemp) : null,
      note,
      // 既定値は "area"（ぼかし）。ピンポイント公開は明示的に選んだときだけ。
      precision: ["exact", "area", "city", "hidden"].includes(precision) ? precision : "area",
      isSkunked: catches.length === 0,
      catches: {
        create: catches.map((c) => ({
          fishId: Number(c.fishId),
          sizeCm: c.sizeCm != null ? Number(c.sizeCm) : null,
          weightG: c.weightG != null ? Number(c.weightG) : null,
          sizeNote: c.sizeNote || null,
          count: Number(c.count) || 1,
        })),
      },
    },
    include: tripInclude,
  });
  res.status(201).json({ data: trip });
}));

r.patch("/:id", requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.deletedAt) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  if (trip.userId !== req.user.id) return res.status(403).json({ error: { message: "他の人の釣行は編集できません" } });

  const { note, precision, tideName, tidePhase } = req.body;
  const updated = await prisma.trip.update({
    where: { id }, data: { note, precision, tideName, tidePhase }, include: tripInclude,
  });
  res.json({ data: updated });
}));

/** 論理削除：他人のコメントが宙に浮かないよう、行そのものは残す。 */
r.delete("/:id", requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.deletedAt) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  if (trip.userId !== req.user.id) return res.status(403).json({ error: { message: "他の人の釣行は削除できません" } });
  await prisma.trip.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ data: { ok: true } });
}));

export default r;
