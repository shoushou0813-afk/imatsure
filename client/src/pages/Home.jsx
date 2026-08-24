import { Link } from "react-router-dom";
import { useApi } from "../useApi";
import Layout from "../components/Layout";
import TripRow from "../components/TripRow";

export default function Home() {
  const { data: spots } = useApi("/spots");
  const { data: trips } = useApi("/trips?days=7&limit=10");

  return (
    <Layout>
      <div style={{ padding: "20px 16px 6px" }}>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 22, margin: "0 0 4px" }}>釣り場を選ぶ</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13.5 }}>直近1週間に釣行のあった場所から。</p>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", padding: 16 }}>
        {(spots ?? []).map((s) => (
          <Link key={s.slug} to={`/spots/${s.slug}`}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--surface-2)" }}>
            <div style={{ fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {s.area.name} ・ {s.kind} ・ 釣行 <span className="num">{s._count.trips}</span>件
            </div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--f-disp)", fontSize: 15, margin: "18px 16px 0" }}>最近の釣況（全釣り場）</h2>
      <ul className="list">
        {(trips ?? []).map((t) => <TripRow key={t.id} trip={t} />)}
      </ul>
    </Layout>
  );
}
