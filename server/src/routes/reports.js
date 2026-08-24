import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();
const TARGETS = ["trip", "post", "rule"];

r.post("/", requireAuth, wrap(async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!TARGETS.includes(targetType) || !targetId)
    return res.status(400).json({ error: { message: "通報対象が正しくありません" } });
  const report = await prisma.report.create({
    data: { targetType, targetId: Number(targetId), userId: req.user.id, reason: reason || "" },
  });
  // TODO(学習): 同一対象への通報が3件たまったら自動で status を hidden にする処理を足す
  res.status(201).json({ data: { id: report.id } });
}));

export default r;
