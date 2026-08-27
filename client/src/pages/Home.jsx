import { Link } from "react-router-dom";
import { useApi } from "../useApi";
import Layout from "../components/Layout";
import TripRow from "../components/TripRow";

export default function Home() {
  const { data: spots } = useApi("/spots");
  const { data: trips } = useApi("/trips?days=7&limit=10");

  return (
    <Layout>
      <div className="home-head">
        <h1>釣り場を選ぶ</h1>
        <p>直近1週間に釣行のあった場所から。釣況・スレッド・ルールは釣り場ごとにまとまっています。</p>
        <Link to="/rankings" className="btn ghost" style={{ display: "inline-flex" }}>今週の回遊・大物ランキングを見る</Link>
      </div>

      <div className="spot-table">
        {(spots ?? []).map((s) => (
          <Link key={s.slug} to={`/spots/${s.slug}`} className="spot-cell">
            <div className="nm">{s.name}</div>
            <div className="mt">
              <span>{s.area.name}</span>
              <span>{s.kind}</span>
              <span>釣行 <span className="num">{s._count.trips}</span>件</span>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="sec-head">
        最近の釣況（全釣り場）
        <Link to="/spots/new" className="more">＋ 釣り場を追加する</Link>
      </h2>
      <ul className="list">
        {(trips ?? []).map((t) => <TripRow key={t.id} trip={t} />)}
      </ul>
      {(trips ?? []).length === 0 && <p className="notice">直近1週間の釣行はまだありません。</p>}
    </Layout>
  );
}
