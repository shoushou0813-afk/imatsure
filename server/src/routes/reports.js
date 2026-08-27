import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();
const TARGETS = ["trip", "post", "rule"];
const AUTO_HIDE_THRESHOLD = 3;
// 通報で自動非表示になった投稿者は、捏造・荒らしの疑いがある側なので信頼スコアを減点する。
const TRUST_PENALTY = 3;

/**
 * 対象を「非表示」にする。人の目での対応を待たず、荒れた投稿を一旦引っ込めるための処置なので、
 * 実体（画像ファイルなど）は消さず、元に戻せる形にしておく。
 * あわせて投稿者の信頼スコアを下げ、大物ランキング等での見え方にも反映されるようにする。
 */
async function hideTarget(targetType, targetId) {
  if (targetType === "trip") {
    const trip = await prisma.trip.findUnique({ where: { id: targetId } });
    if (!trip || trip.deletedAt) return false;
    await prisma.trip.update({ where: { id: targetId }, data: { deletedAt: new Date() } });
    await prisma.user.update({ where: { id: trip.userId }, data: { trustScore: { decrement: TRUST_PENALTY } } });
    return true;
  }
  if (targetType === "post") {
    const post = await prisma.post.findUnique({ where: { id: targetId } });
    if (!post || post.status === "hidden") return false;
    await prisma.post.update({ where: { id: targetId }, data: { status: "hidden" } });
    await prisma.user.update({ where: { id: post.userId }, data: { trustScore: { decrement: TRUST_PENALTY } } });
    return true;
  }
  if (targetType === "rule") {
    const rule = await prisma.rule.findUnique({ where: { id: targetId } });
    if (!rule || rule.status === "hidden") return false;
    await prisma.rule.update({ where: { id: targetId }, data: { status: "hidden" } });
    await prisma.user.update({ where: { id: rule.userId }, data: { trustScore: { decrement: TRUST_PENALTY } } });
    return true;
  }
  return false;
}

r.post("/", requireAuth, wrap(async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!TARGETS.includes(targetType) || !targetId)
    return res.status(400).json({ error: { message: "通報対象が正しくありません" } });

  const numTargetId = Number(targetId);
  const report = await prisma.report.create({
    data: { targetType, targetId: numTargetId, userId: req.user.id, reason: reason || "" },
  });

  // 同一対象への未対応（open）の通報が3件たまったら、モデレーターの対応を待たずに自動で非表示にする。
  // 通報が来た投稿を対応が追いつくまで公開したままにしないための足止め措置。
  const openCount = await prisma.report.count({ where: { targetType, targetId: numTargetId, status: "open" } });
  let autoHidden = false;
  if (openCount >= AUTO_HIDE_THRESHOLD) {
    autoHidden = await hideTarget(targetType, numTargetId);
    if (autoHidden) {
      await prisma.report.updateMany({
        where: { targetType, targetId: numTargetId, status: "open" },
        data: { status: "closed" },
      });
    }
  }

  res.status(201).json({ data: { id: report.id, autoHidden } });
}));

export default r;
