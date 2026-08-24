/** すべてのエラーを { error: { message } } の形に揃える。 */
export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message || "サーバーエラーが発生しました" } });
}

/** async なハンドラの try/catch を省くためのラッパー。 */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
