import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";
import { geocodeAddress } from "../lib/geocode.js";
import { estimateTideName } from "../lib/tide.js";
import { fetchWeatherAt } from "../lib/weather.js";

const r = Router();
const KINDS = ["堤防", "地磯", "砂浜", "河口", "港"];

// 日本語の場所名はそのままだとURLに使えないので、英数字だけ残してslugにする。
// 英数字が残らない場合はランダム値にフォールバックする。
function slugify(name, fallbackPrefix = "spot") {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || `${fallbackPrefix}-${crypto.randomBytes(3).toString("hex")}`;
}

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

/**
 * 釣り場を新規追加する。
 * 住所・目印の文字入力をNominatim（地図API）で緯度経度に変換して保存する。
 * lat/lngが直接渡された場合（地図で位置を選んだ場合）はそちらを優先する。
 */
r.post("/", requireAuth, wrap(async (req, res) => {
  const { name, kind, areaId, area: newArea, address, lat, lng, accessNote } = req.body;

  if (!name?.trim() || !kind)
    return res.status(400).json({ error: { message: "釣り場名と種別は必須です" } });
  if (!KINDS.includes(kind))
    return res.status(400).json({ error: { message: `種別は ${KINDS.join(" / ")} から選んでください` } });

  let area;
  if (areaId) {
    area = await prisma.area.findUnique({ where: { id: Number(areaId) } });
    if (!area) return res.status(400).json({ error: { message: "エリアが見つかりません" } });
  } else if (newArea?.name?.trim() && newArea?.prefecture?.trim()) {
    const areaName = newArea.name.trim();
    const prefecture = newArea.prefecture.trim();
    area = await prisma.area.findFirst({ where: { name: areaName, prefecture } });
    for (let slug = slugify(areaName, "area"); !area; ) {
      try {
        area = await prisma.area.create({ data: { name: areaName, slug, prefecture } });
      } catch (e) {
        if (e.code !== "P2002") throw e;
        slug = `${slugify(areaName, "area")}-${crypto.randomBytes(2).toString("hex")}`;
      }
    }
  } else {
    return res.status(400).json({ error: { message: "エリアを選ぶか、新しいエリア名と都道府県を入力してください" } });
  }

  let point;
  if (lat != null && lng != null) {
    point = { lat: Number(lat), lng: Number(lng) };
  } else if (address?.trim()) {
    const found = await geocodeAddress(address.trim());
    if (!found)
      return res.status(400).json({ error: { message: "その住所・目印からは場所を特定できませんでした。もう少し詳しく（市区町村名や施設名を添えて）入力してください。" } });
    point = found;
  } else {
    return res.status(400).json({ error: { message: "住所か目印を入力してください" } });
  }

  let spot;
  for (let slug = slugify(name.trim()); !spot; ) {
    try {
      spot = await prisma.spot.create({
        data: {
          areaId: area.id, name: name.trim(), slug, kind,
          lat: point.lat, lng: point.lng,
          accessNote: accessNote?.trim() || null,
        },
        include: { area: true, _count: { select: { trips: true } } },
      });
    } catch (e) {
      if (e.code !== "P2002") throw e;
      slug = `${slugify(name.trim())}-${crypto.randomBytes(2).toString("hex")}`;
    }
  }

  res.status(201).json({ data: spot });
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
 * 釣行投稿フォーム用：釣り場と日時から潮名・天候・風・水温の参考値を自動取得する。
 * 潮名は月齢からの近似計算、天候・風・水温はOpen-Meteo（無料・APIキー不要）から取る。
 * ユーザーはこれを初期値として、違っていればフォーム側で書き換えられる。
 */
r.get("/:slug/conditions", wrap(async (req, res) => {
  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug } });
  if (!spot) return res.status(404).json({ error: { message: "釣り場が見つかりません" } });

  const at = req.query.at ? new Date(String(req.query.at)) : new Date();
  if (Number.isNaN(at.getTime()))
    return res.status(400).json({ error: { message: "日時の形式が正しくありません" } });

  const tideName = estimateTideName(at);
  const weather = await fetchWeatherAt(spot.lat, spot.lng, at).catch(() => null);

  res.json({
    data: {
      tideName,
      weather: weather?.weather ?? null,
      windDir: weather?.windDir ?? null,
      windSpeed: weather?.windSpeed ?? null,
      waterTemp: weather?.waterTemp ?? null,
    },
  });
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
