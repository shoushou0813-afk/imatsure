import jwt from "jsonwebtoken";

// 本番で JWT_SECRET を設定し忘れると、誰でも偽のログイン証明を作れてしまう。
// 黙って既定値に落ちるのが一番危ないので、本番では起動時に止める。
const SECRET = process.env.JWT_SECRET || "dev-secret";
if (process.env.NODE_ENV === "production" && SECRET === "dev-secret") {
  throw new Error("本番環境では JWT_SECRET を必ず設定してください（.env の既定値のままです）");
}

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
