import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(user) {
  return jwt.sign({ id: user.id, handle: user.handle }, SECRET, { expiresIn: "30d" });
}

/** ログインしていれば req.user を埋める。していなくても素通しする。 */
export function attachUser(req, _res, next) {
  const token = req.cookies?.token;
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch { /* 期限切れなどは無視 */ }
  }
  next();
}

/** ログイン必須のルートに付ける。 */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: { message: "ログインが必要です" } });
  next();
}
