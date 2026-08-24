import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../useApi";
import { api } from "../api";
import { useAuth } from "../auth";
import Layout from "../components/Layout";

const PRECISIONS = [
  ["exact", "ピンポイント"],
  ["area",  "エリア（半径2km）"],
  ["city",  "市町村のみ"],
  ["hidden", "非公開"],
];
const TIDES = ["大潮", "中潮", "小潮", "長潮", "若潮"];

/** 釣行投稿。1釣行にまとめて複数の魚を入れるのがポイント。 */
export default function TripNew() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: spots } = useApi("/spots");
  const { data: fishes } = useApi("/fishes");
  const { data: methods } = useApi("/methods");

  const [form, setForm] = useState({
    spotId: "", methodId: "",
    startedAt: new Date().toISOString().slice(0, 16),
    tideName: "大潮", tidePhase: "", note: "",
    precision: "area", // 既定はぼかし。ピンポイントは選ばないと出ない
  });
  const [catches, setCatches] = useState([{ fishId: "", sizeCm: "", count: 1 }]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCatch = (i, k, v) => setCatches((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        spotId: Number(form.spotId),
        methodId: Number(form.methodId),
        startedAt: new Date(form.startedAt).toISOString(),
        catches: catches
          .filter((c) => c.fishId)
          .map((c) => ({ fishId: Number(c.fishId), sizeCm: c.sizeCm ? Number(c.sizeCm) : null, count: Number(c.count) || 1 })),
      };
      const r = await api.post("/trips", payload);
      nav(`/spots/${r.data.spot.slug}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (!user) return <Layout><p className="notice">釣行の投稿にはログインが必要です。</p></Layout>;

  return (
    <Layout>
      <form className="form" onSubmit={submit}>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 20, margin: 0 }}>釣行を投稿する</h1>
        {error && <div className="error">{error}</div>}

        <div className="field"><label htmlFor="spot">釣り場</label>
          <select id="spot" value={form.spotId} onChange={(e) => set("spotId", e.target.value)} required>
            <option value="">選んでください</option>
            {(spots ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>

        <div className="field"><label htmlFor="method">釣り方</label>
          <select id="method" value={form.methodId} onChange={(e) => set("methodId", e.target.value)} required>
            <option value="">選んでください</option>
            {(methods ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>

        <div className="field"><label htmlFor="started">開始日時</label>
          <input id="started" type="datetime-local" value={form.startedAt}
            onChange={(e) => set("startedAt", e.target.value)} required /></div>

        <div className="field"><label>釣れた魚（この釣行の分をまとめて）</label>
          {catches.map((c, i) => (
            <div className="ctl" key={i} style={{ marginBottom: 8, alignItems: "center" }}>
              <select value={c.fishId} onChange={(e) => setCatch(i, "fishId", e.target.value)} style={{ flex: 2, minWidth: 130 }}>
                <option value="">魚種</option>
                {(fishes ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input type="number" placeholder="cm" value={c.sizeCm}
                onChange={(e) => setCatch(i, "sizeCm", e.target.value)} style={{ flex: 1, minWidth: 80 }} />
              <input type="number" min="1" value={c.count}
                onChange={(e) => setCatch(i, "count", e.target.value)} style={{ flex: 1, minWidth: 70 }} />
              {catches.length > 1 && (
                <button type="button" className="chip"
                  onClick={() => setCatches((cs) => cs.filter((_, j) => j !== i))}>削除</button>
              )}
            </div>
          ))}
          <div className="ctl">
            <button type="button" className="chip" onClick={() => setCatches((cs) => [...cs, { fishId: "", sizeCm: "", count: 1 }])}>＋ 魚を追加</button>
            <button type="button" className="chip" onClick={() => setCatches([])}>ボウズだった</button>
          </div>
        </div>

        <div className="field"><label htmlFor="tide">潮</label>
          <div className="ctl">
            {TIDES.map((t) => (
              <button type="button" key={t} className={`chip${form.tideName === t ? " on" : ""}`}
                onClick={() => set("tideName", t)}>{t}</button>
            ))}
          </div></div>

        <div className="field"><label htmlFor="note">ひとことメモ（次に来る人が助かる情報）</label>
          <textarea id="note" value={form.note} onChange={(e) => set("note", e.target.value)}
            placeholder="例：日の出30分がすべて。7時以降は沈黙。" /></div>

        <div className="field"><label>釣り場の公開範囲</label>
          <div className="ctl">
            {PRECISIONS.map(([v, label]) => (
              <button type="button" key={v} className={`chip${form.precision === v ? " on" : ""}`}
                onClick={() => set("precision", v)}>{label}</button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "6px 0 0" }}>
            既定は「エリア」です。ピンポイント公開は、その場所が混んでも大丈夫か考えてから選んでください。
          </p>
        </div>

        <button className="btn" type="submit" disabled={busy}>{busy ? "投稿中…" : "この釣行を投稿する"}</button>
      </form>
    </Layout>
  );
}
