import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../useApi";
import { api, qs } from "../api";
import Layout from "../components/Layout";
import SpotSidebar from "../components/SpotSidebar";
import SpotMap from "../components/SpotMap";
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

  // カーソルページング。ページ番号ではなく「この時刻より前」で継ぎ足すので、
  // 一覧を見ている間に新しい投稿が入っても行がずれたり重複したりしない。
  const buildTripsPath = (extra = {}) => `/trips${qs({ spot: slug, ...filters, ...extra })}`;
  const [trips, setTrips] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const basePath = buildTripsPath();

  // 絞り込みや釣り場が変わったら一覧を最初から取り直す
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setTrips([]);
    setCursor(null);
    setHasMore(false);
    api.get(basePath).then((r) => {
      if (!alive) return;
      setTrips(r.data);
      setHasMore(r.meta?.hasMore ?? false);
      setCursor(r.meta?.nextCursor ?? null);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  // 一覧の下端が画面に入ったら次の分を継ぎ足す（ページ送りボタンを押させない）
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, cursor, basePath]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const r = await api.get(buildTripsPath({ cursor }));
      setTrips((prev) => [...prev, ...r.data]);
      setHasMore(r.meta?.hasMore ?? false);
      setCursor(r.meta?.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  };

  const selected = useMemo(
    () => trips.find((t) => t.id === selectedId) ?? trips[0],
    [trips, selectedId]
  );

  return (
    <Layout spot={spot} ruleCount={rules?.length ?? 0}>
      <div className="body-grid">
        <SpotSidebar spots={spots ?? []} currentSlug={slug} />

        <main>
          <SummaryBand summary={summary} />
          <SpotMap spot={spot} />
          <FilterBar fishes={fishes ?? []} methods={methods ?? []} value={filters} onChange={setFilters} />

          {/* 何件を見ているのかを必ず文字で出す。絞り込みの効き具合がその場で分かる。 */}
          <div className="listhead">
            <span>表示中 <b>{trips.length}</b> 件{hasMore && "（下にスクロールで続き）"}</span>
            <span className="note">直近{filters.days}日 ・ 新しい順</span>
            <span className="grow" />
            <span className="note">1行＝1釣行</span>
          </div>

          {loading && <p className="notice">読み込み中…</p>}
          {!loading && trips.length === 0 && <p className="notice">条件に合う釣行がありません。期間を広げてみてください。</p>}
          <ul className="list">
            {trips.map((t) => (
              <TripRow key={t.id} trip={t} hideSpot selected={selected?.id === t.id} onSelect={(x) => {
                // 右ペインが畳まれている幅では、行タップで詳細ページへ移動する
                if (window.matchMedia("(max-width: 980px)").matches) navigate(`/trips/${x.id}`);
                else setSelectedId(x.id);
              }} />
            ))}
          </ul>
          {/* この要素が画面に入った時点で次の分を読み込む。ボタンを押させない無限スクロール。 */}
          {hasMore && (
            <div ref={sentinelRef} className="loadmore">
              {loadingMore ? "読み込み中…" : ""}
            </div>
          )}
        </main>

        <aside className="pane-right">
          <div className="pane-head">釣行の詳細</div>
          <TripDetail trip={selected} />
          {selected && (
            <div style={{ padding: "0 14px" }}>
              <Link to={`/trips/${selected.id}`} className="chip">この釣行を開く</Link>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}
