import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../useApi";
import { api } from "../api";
import { useAuth } from "../auth";
import Layout from "../components/Layout";
import { relTime } from "../format";

export default function ThreadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: thread, reload } = useApi(`/threads/${id}`, [id]);
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post(`/threads/${id}/posts`, { body }); setBody(""); setError(null); reload(); }
    catch (err) { setError(err.message); }
  };

  if (!thread) return <Layout><p className="notice">読み込み中…</p></Layout>;

  return (
    <Layout>
      <div style={{ padding: "18px 16px 8px", borderBottom: "1px solid var(--line)" }}>
        <Link to={`/spots/${thread.spot.slug}/threads`} style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          ← {thread.spot.name} のスレッド一覧
        </Link>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 20, margin: "6px 0 4px" }}>{thread.title}</h1>
        <span className={`tag ${thread.category}`}>{thread.category}</span>
      </div>

      <ul className="threads">
        {thread.posts.map((p, i) => (
          <li key={p.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 5 }}>
              <span className="avatar">{p.user.handle.slice(0, 2)}</span>
              <b style={{ fontSize: 13.5 }}>{p.user.displayName}</b>
              <span className="num" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>#{i + 1}</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>{relTime(p.createdAt)}</span>
            </div>
            <div style={{ fontSize: 14.5, whiteSpace: "pre-wrap" }}>{p.body}</div>
          </li>
        ))}
      </ul>

      {user ? (
        <form className="form" onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <div className="field"><label htmlFor="reply">返信する</label>
            <textarea id="reply" value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <button className="btn" type="submit" disabled={!body.trim()}>返信を投稿</button>
        </form>
      ) : (
        <p className="notice"><Link to="/login" style={{ color: "var(--accent-2)" }}>ログイン</Link>すると返信できます。</p>
      )}
    </Layout>
  );
}
