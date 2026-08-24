import { Link, NavLink, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

/** ヘッダ＋タブ＋（スマホ用）下部タブバー。全画面で共通の枠。 */
export default function Layout({ children, spot, ruleCount = 0 }) {
  const { user, logout } = useAuth();
  const { slug } = useParams();
  const { pathname } = useLocation();
  const base = slug ? `/spots/${slug}` : "";

  const tab = (to, label, badge) => (
    <NavLink to={to} end className={({ isActive }) => (isActive ? "on" : "")}>
      {label}{badge > 0 && <span className="tab-badge">{badge}</span>}
    </NavLink>
  );

  return (
    <div className="app">
      <header className="app-head">
        <div className="head-top">
          <Link to="/" className="logo">イマツレ</Link>
          {spot && <span className="spot-pick">{spot.name} <small>{spot.area?.name}</small></span>}
          <span className="grow" />
          {user
            ? <><Link className="linkbtn" to="/trips/new">釣行を投稿</Link>
                <button className="linkbtn" onClick={logout}>{user.displayName} · ログアウト</button></>
            : <Link className="linkbtn" to="/login">ログイン</Link>}
        </div>
        {slug && (
          <nav className="tabs">
            {tab(base, "釣況")}
            {tab(`${base}/threads`, "スレッド")}
            {tab(`${base}/rules`, "ルール", ruleCount)}
          </nav>
        )}
      </header>

      {children}

      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}><span className="ic">≡</span>ホーム</NavLink>
        <NavLink to={base || "/"} end className={pathname === base ? "on" : ""}><span className="ic">◎</span>釣況</NavLink>
        <NavLink to="/trips/new" className={({ isActive }) => (isActive ? "on" : "")}><span className="ic">＋</span>投稿</NavLink>
        <NavLink to={base ? `${base}/rules` : "/"} className={({ isActive }) => (isActive ? "on" : "")}><span className="ic">！</span>ルール</NavLink>
      </nav>
    </div>
  );
}
