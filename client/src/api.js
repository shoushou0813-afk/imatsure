/**
 * サーバとの通信をここに集約する。
 * 画面side から fetch を直接書かないのは、
 *  1) エラーの形を1か所で揃えられる
 *  2) credentials: "include"（Cookieを送る）の付け忘れを防げる
 * ため。
 */
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `通信に失敗しました (${res.status})`);
  return json;
}

export const api = {
  get:   (p) => request(p),
  post:  (p, body) => request(p, { method: "POST", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  del:   (p) => request(p, { method: "DELETE" }),
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v != null && v !== "") p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};
