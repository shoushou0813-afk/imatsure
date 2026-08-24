import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();
const userSel = { select: { id: true, handle: true, displayName: true } };

/** 釣り場のスレッド一覧。並び順は「最後に書き込まれた順」＝生きている話題が上。 */
r.get("/", wrap(async (req, res) => {
  const { spot, category } = req.query;
  const threads = await prisma.thread.findMany({
    where: {
      ...(spot ? { spot: { slug: String(spot) } } : {}),
      ...(category ? { category: String(category) } : {}),
    },
    include: { user: userSel, spot: { select: { name: true, slug: true } }, _count: { select: { posts: true } } },
    orderBy: { lastPostedAt: "desc" },
    take: 50,
  });
  res.json({ data: threads });
}));

r.get("/:id", wrap(async (req, res) => {
  const thread = await prisma.thread.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      user: userSel,
      spot: { select: { name: true, slug: true } },
      posts: { include: { user: userSel }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) return res.status(404).json({ error: { message: "スレッドが見つかりません" } });
  res.json({ data: thread });
}));

const CATEGORIES = ["質問", "募集", "現地情報", "雑談"];

r.post("/", requireAuth, wrap(async (req, res) => {
  const { spotId, title, category, body } = req.body;
  if (!spotId || !title?.trim() || !body?.trim())
    return res.status(400).json({ error: { message: "釣り場・タイトル・本文は必須です" } });
  if (!CATEGORIES.includes(category))
    return res.status(400).json({ error: { message: `カテゴリは ${CATEGORIES.join(" / ")} から選んでください` } });

  const thread = await prisma.thread.create({
    data: {
      spotId: Number(spotId), userId: req.user.id, title: title.trim(), category,
      posts: { create: { userId: req.user.id, body: body.trim() } },
    },
    include: { user: userSel, _count: { select: { posts: true } } },
  });
  res.status(201).json({ data: thread });
}));

r.post("/:id/posts", requireAuth, wrap(async (req, res) => {
  const threadId = Number(req.params.id);
  const { body, replyToId } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: { message: "本文を入力してください" } });

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return res.status(404).json({ error: { message: "スレッドが見つかりません" } });
  if (thread.isLocked) return res.status(403).json({ error: { message: "このスレッドは書き込みが止まっています" } });

  const post = await prisma.post.create({
    data: { threadId, userId: req.user.id, body: body.trim(), replyToId: replyToId ? Number(replyToId) : null },
    include: { user: userSel },
  });
  // 一覧の並び替えに使うので、親スレッドの最終書き込み時刻を更新する
  await prisma.thread.update({ where: { id: threadId }, data: { lastPostedAt: new Date() } });
  res.status(201).json({ data: post });
}));

export default r;
