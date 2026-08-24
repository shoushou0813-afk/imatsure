import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();
const KINDS = ["立入禁止", "駐車", "地元ルール", "安全"];
// 表示順：危険・禁止から先に見せる
const ORDER = Object.fromEntries(KINDS.map((k, i) => [k, i]));

/** 期限切れ（工事終了など）は自動で落とす。掲示板が古い情報の墓場になるのを防ぐ。 */
r.get("/", wrap(async (req, res) => {
  const { spot } = req.query;
  const rules = await prisma.rule.findMany({
    where: {
      status: "active",
      ...(spot ? { spot: { slug: String(spot) } } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      user: { select: { id: true, handle: true, displayName: true } },
      _count: { select: { verifications: true } },
    },
  });
  rules.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9) || b.createdAt - a.createdAt);
  res.json({ data: rules });
}));

r.post("/", requireAuth, wrap(async (req, res) => {
  const { spotId, kind, title, body, source, expiresAt } = req.body;
  if (!spotId || !title?.trim() || !body?.trim())
    return res.status(400).json({ error: { message: "釣り場・タイトル・本文は必須です" } });
  if (!KINDS.includes(kind))
    return res.status(400).json({ error: { message: `種別は ${KINDS.join(" / ")} から選んでください` } });

  const rule = await prisma.rule.create({
    data: {
      spotId: Number(spotId), userId: req.user.id, kind,
      title: title.trim(), body: body.trim(), source: source || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: { _count: { select: { verifications: true } } },
  });
  res.status(201).json({ data: rule });
}));

/** 「現地で確認した」。確認者が多い情報が上がり、古い情報が自然に沈む。 */
r.post("/:id/verify", requireAuth, wrap(async (req, res) => {
  const ruleId = Number(req.params.id);
  try {
    await prisma.ruleVerification.create({ data: { ruleId, userId: req.user.id } });
  } catch {
    return res.status(409).json({ error: { message: "すでに確認済みです" } });
  }
  const count = await prisma.ruleVerification.count({ where: { ruleId } });
  res.json({ data: { ruleId, verifiedCount: count } });
}));

export default r;
