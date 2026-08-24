import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../useApi";
import { qs } from "../api";
import Layout from "../components/Layout";
import SpotSidebar from "../components/SpotSidebar";
import SummaryBand from "../components/SummaryBand";
import FilterBar from "../components/FilterBar";
import TripRow from "../components/TripRow";
import TripDetail from "../components/TripDetail";

/** 釣り場ボードの「釣況」タブ。サービスの中心画面。 */
export default function SpotBoard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ days: "7", fish: "", method: "" });
  const [selectedId, setSelectedId] = useState(null);

  const { data: spot } = useApi(`/spots/${slug}`, [slug]);
  const { data: summary } = useApi(`/spots/${slug}/summary?hours=72`, [slug]);
  const { data: spots } = useApi("/spots");
  const { data: fishes } = useApi("/fishes");
  const { data: methods } = useApi("/methods");
  const { data: rules } = useApi(`/rules${qs({ spot: slug })}`, [slug]);

  const tripsPath = `/trips${qs({ spot: slug, ...filters })}`;
  const { data: trips, loading } = useApi(tripsPath, [tripsPath]);

  const selected = useMemo(
    () => (trips ?? []).find((t) => t.id === selectedId) ?? (trips ?? [])[0],
    [trips, selectedId]
  );

  return (
    <Layout spot={spot} ruleCount={rules?.length ?? 0}>
      <div className="body-grid">
        <SpotSidebar spots={spots ?? []} currentSlug={slug} />

        <main>
          <SummaryBand summary={summary} />
          <FilterBar fishes={fishes ?? []} methods={methods ?? []} value={filters} onChange={setFilters} />
          {loading && <p className="notice">読み込み中…</p>}
          {!loading && (trips ?? []).length === 0 && <p className="notice">条件に合う釣行がありません。期間を広げてみてください。</p>}
          <ul className="list">
            {(trips ?? []).map((t) => (
              <TripRow key={t.id} trip={t} selected={selected?.id === t.id} onSelect={(x) => {
                // 右ペインが畳まれている幅では、行タップで詳細ページへ移動する
                if (window.matchMedia("(max-width: 980px)").matches) navigate(`/trips/${x.id}`);
                else setSelectedId(x.id);
              }} />
            ))}
          </ul>
        </main>

        <aside className="pane-right">
          <TripDetail trip={selected} />
          {selected && (
            <Link to={`/trips/${selected.id}`} className="chip" style={{ marginTop: 12, display: "inline-block" }}>
              この釣行を開く
            </Link>
          )}
        </aside>
      </div>
    </Layout>
  );
}
