import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../useApi";
import { api } from "../api";
import { useAuth } from "../auth";
import Layout from "../components/Layout";

const KINDS = ["堤防", "地磯", "砂浜", "河口", "港"];
const NEW_AREA = "__new__";

/** 釣り場の新規追加。住所・目印の文字入力を、サーバ側でMap API（Nominatim）に渡して座標に変換する。 */
export default function SpotNew() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: areas } = useApi("/areas");

  const [form, setForm] = useState({
    name: "", kind: KINDS[0], areaId: "", address: "", accessNote: "",
  });
  const [newArea, setNewArea] = useState({ name: "", prefecture: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const usingNewArea = form.areaId === NEW_AREA;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        kind: form.kind,
        address: form.address,
        accessNote: form.accessNote,
        ...(usingNewArea
          ? { area: { name: newArea.name, prefecture: newArea.prefecture } }
          : { areaId: Number(form.areaId) }),
      };
      const r = await api.post("/spots", payload);
      nav(`/spots/${r.data.slug}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (!user) return <Layout><p className="notice">釣り場の追加にはログインが必要です。</p></Layout>;

  return (
    <Layout>
      <form className="form" onSubmit={submit}>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 20, margin: 0 }}>釣り場を追加する</h1>
        {error && <div className="error">{error}</div>}

        <div className="field"><label htmlFor="name">釣り場名</label>
          <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="例：剣崎 松輪港堤防" required /></div>

        <div className="field"><label htmlFor="kind">種別</label>
          <select id="kind" value={form.kind} onChange={(e) => set("kind", e.target.value)} required>
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select></div>

        <div className="field"><label htmlFor="area">エリア</label>
          <select id="area" value={form.areaId} onChange={(e) => set("areaId", e.target.value)} required>
            <option value="">選んでください</option>
            {(areas ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}（{a.prefecture}）</option>)}
            <option value={NEW_AREA}>＋ 新しいエリアを追加</option>
          </select>
          {usingNewArea && (
            <div className="ctl" style={{ marginTop: 8 }}>
              <input placeholder="エリア名（例：三浦半島）" value={newArea.name}
                onChange={(e) => setNewArea((a) => ({ ...a, name: e.target.value }))}
                style={{ flex: 2, minWidth: 140 }} required />
              <input placeholder="都道府県（例：神奈川県）" value={newArea.prefecture}
                onChange={(e) => setNewArea((a) => ({ ...a, prefecture: e.target.value }))}
                style={{ flex: 1, minWidth: 120 }} required />
            </div>
          )}</div>

        <div className="field"><label htmlFor="address">住所・目印</label>
          <input id="address" value={form.address} onChange={(e) => set("address", e.target.value)}
            placeholder="例：神奈川県三浦市南下浦町松輪 松輪漁港" required />
          <p className="hint">ここに入力した住所や施設名から地図上の位置を自動で調べます。番地や施設名まで書くほど精度が上がります。</p>
        </div>

        <div className="field"><label htmlFor="note">アクセスメモ（駐車・トイレ・足場など）</label>
          <textarea id="note" value={form.accessNote} onChange={(e) => set("accessNote", e.target.value)}
            placeholder="例：駐車は南側有料（500円/日）。トイレあり。" /></div>

        <button className="btn" type="submit" disabled={busy}>{busy ? "登録中…" : "この釣り場を追加する"}</button>
      </form>
    </Layout>
  );
}
