import { Link } from "react-router-dom";

export default function SpotSidebar({ spots, currentSlug }) {
  return (
    <nav className="pane-left">
      <div className="side-label">釣り場</div>
      {spots.map((s) => (
        <Link key={s.slug} to={`/spots/${s.slug}`}
          className={`side-item${s.slug === currentSlug ? " on" : ""}`}>
          <span className={`dot${s._count.trips > 2 ? "" : " cold"}`} />
          {s.name}
          <span className="cnt">{s._count.trips}</span>
        </Link>
      ))}
    </nav>
  );
}
