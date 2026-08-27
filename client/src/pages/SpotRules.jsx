import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../useApi";
import { api, qs } from "../api";
import { useAuth } from "../auth";
import Layout from "../components/Layout";
import SpotSidebar from "../components/SpotSidebar";

const KINDS = ["立入禁止", "駐車", "地元ルール", "安全"];
const DANGER = new Set(["立入禁止", "安全"]);

/**
 * ルールタブ。イマツレ最大の差別化。
 * 釣果情報だけを流すと、人が殺到して釣り場が閉鎖される。
 * だから「そこで守るべきこと」を釣況と同じ階層に常設する。
 */
export default function SpotRules() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: spot } = useApi(`/spots/${slug}`, [slug]);
  const { data: spots } = useApi("/spots");
  const path = `/rules${qs({ spot: slug })}`;
  const { data: rules, reload } = useApi(path, [path]);

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ kind: "立入禁止", title: "", body: "", source: "" });

  const verify = async (id) => {
    try { await api.post(`/rules/${id}/verify`); reload(); }
    catch (e) { setError(e.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/rules", { spotId: spot.id, ...form });
      setForm({ kind: "立入禁止", title: "", body: "", source: "" });
      setOpen(false); setError(null); reload();
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout spot={spot} ruleCount={rules?.length ?? 0}>
      <div className="body-grid">
        <SpotSidebar spots={spots ?? []} currentSlug={slug} />
        <main>
          <div className="listhead">
            <span>この釣り場のルール <b>{(rules ?? []).length}</b> 件</span>
            <span className="note">危険・禁止から順に表示</span>
            <span className="grow" />
            {user && <button className="chip" onClick={() => setOpen((v) => !v)}>＋ ルール・現地情報を追加</button>}
          </div>
          <div className="rules">
            {error && <div className="error" style={{ margin: 12 }}>{error}</div>}
            {open && (
              <form className="form" onSubmit={submit}>
                <div className="field"><label htmlFor="r-kind">種別</label>
                  <select id="r-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k}>{k}</option>)}
                  </select></div>
                <div className="field"><label htmlFor="r-title">見出し</label>
                  <input id="r-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例：北側駐車場が工事中" /></div>
                <div className="field"><label htmlFor="r-body">内容</label>
                  <textarea id="r-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                <div className="field"><label htmlFor="r-src">出典（掲示・漁協・現地確認など）</label>
                  <input id="r-src" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
                <div className="ctl">
                  <button className="btn" type="submit">追加する</button>
                  <button className="btn ghost" type="button" onClick={() => setOpen(false)}>やめる</button>
                </div>
              </form>
            )}

            {(rules ?? []).map((r) => (
              <div key={r.id} className={`rule-card${DANGER.has(r.kind) ? " danger" : ""}`}>
                <h3><span className="kind">{r.kind}</span>{r.title}</h3>
                <p>{r.body}</p>
                <div className="src">
                  {r.source && <span>出典：{r.source}</span>}
                  <span><span className="num">{r._count.verifications}</span>人が現地で確認</span>
                  {user && <button className="verify" onClick={() => verify(r.id)}>現地で確認した</button>}
                </div>
              </div>
            ))}
            {(rules ?? []).length === 0 && <p className="notice">この釣り場のルール情報はまだありません。</p>}
          </div>
        </main>
        <aside className="pane-right">
          <div className="pane-head">ルールについて</div>
          <div className="detail"><h3>なぜ最初にルールなのか</h3>
            <div className="dsub">
              釣果情報が広まると人が集まり、ゴミ・駐車トラブルから釣り禁止になる釣り場があります。
              イマツレは情報を出す責任とセットで出すために、ルールを釣況と同じ階層に置いています。
            </div></div>
        </aside>
      </div>
    </Layout>
  );
}
