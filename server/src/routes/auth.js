import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

const r = Router();
const cookieOpts = { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 };

r.post("/register", wrap(async (req, res) => {
  const { handle, displayName, password } = req.body;
  if (!handle || !password) return res.status(400).json({ error: { message: "handle と password は必須です" } });
  if (password.length < 8) return res.status(400).json({ error: { message: "パスワードは8文字以上にしてください" } });
  const exists = await prisma.user.findUnique({ where: { handle } });
  if (exists) return res.status(409).json({ error: { message: "そのIDは既に使われています" } });

  const user = await prisma.user.create({
    data: { handle, displayName: displayName || handle, passwordHash: await bcrypt.hash(password, 10) },
  });
  res.cookie("token", signToken(user), cookieOpts);
  res.status(201).json({ data: { id: user.id, handle: user.handle, displayName: user.displayName } });
}));

r.post("/login", wrap(async (req, res) => {
  const { handle, password } = req.body;
  const user = await prisma.user.findUnique({ where: { handle: handle ?? "" } });
  // ユーザーの有無を漏らさないため、メッセージは共通にする
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash)))
    return res.status(401).json({ error: { message: "IDかパスワードが違います" } });
  res.cookie("token", signToken(user), cookieOpts);
  res.json({ data: { id: user.id, handle: user.handle, displayName: user.displayName } });
}));

r.post("/logout", (_req, res) => { res.clearCookie("token"); res.json({ data: { ok: true } }); });

r.get("/me", requireAuth, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, handle: true, displayName: true, role: true, trustScore: true },
  });
  res.json({ data: user });
}));

export default r;
