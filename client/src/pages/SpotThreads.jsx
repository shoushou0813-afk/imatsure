import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../useApi";
import { api, qs } from "../api";
import { useAuth } from "../auth";
import Layout from "../components/Layout";
import SpotSidebar from "../components/SpotSidebar";
import { relTime } from "../format";

const CATEGORIES = ["質問", "募集", "現地情報", "雑談"];

export default function SpotThreads() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: spot } = useApi(`/spots/${slug}`, [slug]);
  const { data: spots } = useApi("/spots");
  const [cat, setCat] = useState("");
  const path = `/threads${qs({ spot: slug, category: cat })}`;
  const { data: threads, reload } = useApi(path, [path]);

  const [form, setForm] = useState({ title: "", category: "質問", body: "" });
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/threads", { spotId: spot.id, ...form });
      setForm({ title: "", category: "質問", body: "" });
      setOpen(false); setError(null); reload();
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout spot={spot} >
      <div className="body-grid">
        <SpotSidebar spots={spots ?? []} currentSlug={slug} />
        <main>
          <div className="filters">
            <button className={`chip${cat === "" ? " on" : ""}`} onClick={() => setCat("")}>すべて</button>
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{c}</button>
            ))}
            <span className="grow" />
            {user && <button className="chip" onClick={() => setOpen((v) => !v)}>＋ スレッドを立てる</button>}
          </div>

          {open && (
            <form className="form" onSubmit={submit}>
              {error && <div className="error">{error}</div>}
              <div className="field"><label htmlFor="t-title">タイトル</label>
                <input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例：明日の朝マズメ、40gで足りますか？" /></div>
              <div className="field"><label htmlFor="t-cat">カテゴリ</label>
                <select id="t-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="field"><label htmlFor="t-body">本文</label>
                <textarea id="t-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="ctl">
                <button className="btn" type="submit">投稿する</button>
                <button className="btn ghost" type="button" onClick={() => setOpen(false)}>やめる</button>
              </div>
            </form>
          )}

          <ul className="threads">
            {(threads ?? []).map((t) => (
              <li key={t.id}>
                <Link className="thread" to={`/threads/${t.id}`}>
                  <div className="tt">{t.title}</div>
                  <div className="tm">
                    <span className={`tag ${t.category}`}>{t.category}</span>
                    <span>{t.user.displayName}</span>
                    <span>返信 <span className="num">{Math.max(0, t._count.posts - 1)}</span></span>
                    <span>{relTime(t.lastPostedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {(threads ?? []).length === 0 && <p className="notice">まだスレッドがありません。</p>}
        </main>
        <aside className="pane-right">
          <div className="detail"><h3>スレッド</h3>
            <div className="dsub">質問・同行者募集・現地情報・雑談。釣況とは別に、会話が流れずに残る場所です。</div></div>
        </aside>
      </div>
    </Layout>
  );
}
