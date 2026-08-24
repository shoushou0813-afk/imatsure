import { Link, useParams } from "react-router-dom";
import { useApi } from "../useApi";
import Layout from "../components/Layout";
import TripDetail from "../components/TripDetail";

/**
 * 釣行の単独ページ。
 * PCでは右ペインに詳細が出るが、スマホでは右ペインを畳んでいるので、
 * 行をタップしたらこのページに来る。写真もここで初めて読み込まれる。
 */
export default function TripPage() {
  const { id } = useParams();
  const { data: trip, loading } = useApi(`/trips/${id}`, [id]);

  if (loading) return <Layout><p className="notice">読み込み中…</p></Layout>;
  if (!trip) return <Layout><p className="notice">この釣行は見つかりませんでした。</p></Layout>;

  return (
    <Layout>
      <div style={{ padding: "14px 16px 4px" }}>
        <Link to={`/spots/${trip.spot.slug}`} style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          ← {trip.spot.name} の釣況にもどる
        </Link>
      </div>
      <div style={{ padding: "0 16px 28px", maxWidth: 620 }}>
        <TripDetail trip={trip} />
      </div>
    </Layout>
  );
}
