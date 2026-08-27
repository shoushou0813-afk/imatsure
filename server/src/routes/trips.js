import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";
import { FREE_PHOTOS_PER_TRIP } from "./photos.js";
import { deleteImage } from "../storage.js";

const r = Router();

// この人数が「現地の記録として確からしい」と確認したら検証済みバッジを出す。
// rankings.js でも同じ値を使う（バッジの基準がずれないように）。
export const VERIFY_THRESHOLD = 2;

const tripInclude = {
  user: { select: { id: true, handle: true, displayName: true, trustScore: true } },
  spot: { select: { id: true, name: true, slug: true } },
  method: true,
  catches: { include: { fish: true } },
  // 一覧では写真そのものは出さない（テキストファースト）。
  // ただし「写真あり」の印と、詳細を開いた時の初期表示のために1枚だけサムネを持ってくる。
  photos: { select: { id: true, thumbUrl: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  _count: { select: { photos: true, verifications: true } },
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
    include: { ...tripInclude, photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!trip) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  res.json({ data: trip });
}));

/** 釣行＋釣果をまとめて1リクエストで作る（画面の入力単位と揃える）。 */
r.post("/", requireAuth, wrap(async (req, res) => {
  const { spotId, methodId, startedAt, endedAt, tideName, tidePhase, weather,
          windDir, windSpeed, waterTemp, note, precision, catches = [], photos = [] } = req.body;

  if (!spotId || !methodId || !startedAt)
    return res.status(400).json({ error: { message: "spotId / methodId / startedAt は必須です" } });

  if (photos.length > FREE_PHOTOS_PER_TRIP)
    return res.status(400).json({ error: { message: `写真は1釣行あたり${FREE_PHOTOS_PER_TRIP}枚までです` } });

  // アップロード済みの画像だけを受け付ける。クライアントから任意のURLを書き込ませない。
  const safePhotos = photos.filter(
    (p) => typeof p?.url === "string" && p.url.startsWith("/uploads/") &&
           typeof p?.thumbUrl === "string" && p.thumbUrl.startsWith("/uploads/")
  );

  // サイズの数値申告は、メジャー等と一緒に写った写真が無いと裏付けが取れない。
  // 自動でメジャーの写り込みを判定しているわけではなく、あくまで「写真を添える」ことを必須にする運用ルール。
  if (catches.some((c) => c.sizeCm != null && c.sizeCm !== "") && safePhotos.length === 0)
    return res.status(400).json({ error: { message: "サイズを記録する場合は、メジャー等と一緒に写った写真を1枚以上添付してください" } });

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
      photos: {
        create: safePhotos.map((p, i) => ({
          url: p.url, thumbUrl: p.thumbUrl,
          width: p.width ?? null, height: p.height ?? null, bytes: p.bytes ?? null,
          sortOrder: i,
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

/**
 * 「現地の記録として確からしい」と他の利用者が確認する。ルールの現地確認と同じ考え方で、
 * サイズの自己申告を裏付ける手段が写真しかない釣行に、コミュニティでの裏付けを足す。
 */
r.post("/:id/verify", requireAuth, wrap(async (req, res) => {
  const tripId = Number(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.deletedAt) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  if (trip.userId === req.user.id)
    return res.status(400).json({ error: { message: "自分の釣行は確認できません" } });

  try {
    await prisma.tripVerification.create({ data: { tripId, userId: req.user.id } });
  } catch {
    return res.status(409).json({ error: { message: "すでに確認済みです" } });
  }

  const verifiedCount = await prisma.tripVerification.count({ where: { tripId } });
  // ちょうど閾値に達した瞬間だけ加点する（確認が増えるたびに際限なく積み上がらないように）
  if (verifiedCount === VERIFY_THRESHOLD)
    await prisma.user.update({ where: { id: trip.userId }, data: { trustScore: { increment: 1 } } });

  res.json({ data: { tripId, verifiedCount, verified: verifiedCount >= VERIFY_THRESHOLD } });
}));

/** 論理削除：他人のコメントが宙に浮かないよう、行そのものは残す。 */
r.delete("/:id", requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.deletedAt) return res.status(404).json({ error: { message: "釣行が見つかりません" } });
  if (trip.userId !== req.user.id) return res.status(403).json({ error: { message: "他の人の釣行は削除できません" } });

  // 行は論理削除で残すが、画像ファイルは実体を消す（容量がそのまま費用になるため）
  const photos = await prisma.photo.findMany({ where: { tripId: id } });
  await Promise.all(photos.map((p) => deleteImage(p.url)));
  await prisma.photo.deleteMany({ where: { tripId: id } });

  await prisma.trip.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ data: { ok: true } });
}));

export default r;
