import { Link } from "react-router-dom";

export default function SpotSidebar({ spots, currentSlug }) {
  return (
    <nav className="pane-left">
      <div className="side-label">釣り場<span className="cnt">全{spots.length}件</span></div>
      {spots.map((s) => (
        <Link key={s.slug} to={`/spots/${s.slug}`}
          className={`side-item${s.slug === currentSlug ? " on" : ""}`}>
          {/* 直近に釣行があるかどうかだけを点で示す。数はすぐ右に文字で出す。 */}
          <span className={`dot${s._count.trips > 2 ? "" : " cold"}`} />
          {s.name}
          <span className="cnt">{s._count.trips}</span>
        </Link>
      ))}
      <Link to="/spots/new" className="side-add">＋ 釣り場を追加する</Link>
    </nav>
  );
}
