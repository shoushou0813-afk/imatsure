import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../useApi";
import { qs } from "../api";
import { freshness } from "../format";
import Layout from "../components/Layout";

const TREND_MARK = { up: "▲", down: "▼", flat: "・" };
const TREND_LABEL = { up: "回り始め", down: "減少", flat: "横ばい" };
// server/src/routes/trips.js の VERIFY_THRESHOLD と揃える（バッジの基準がずれないように）。
const VERIFY_THRESHOLD = 2;

/**
 * 「今週どこで何が釣れているか」を1画面で見せるランキング。
 * 個々の釣り場ではなくエリア単位で集計する：具体的な釣り場まで晒すと
 * その1か所に人が集中し、ゴミ・駐車トラブルで釣り禁止になりかねないため。
 * 元の釣行を辿れば釣り場は分かるので、情報を消しているわけではない。
 */
export default function Rankings() {
  const [areaSlug, setAreaSlug] = useState("");
  const { data: areas } = useApi("/areas");
  const { data: species, loading: speciesLoading } = useApi(`/rankings/species${qs({ area: areaSlug, days: 7 })}`, [areaSlug]);
  const { data: big, loading: bigLoading } = useApi(`/rankings/size${qs({ area: areaSlug, days: 30 })}`, [areaSlug]);

  return (
    <Layout crumb="ランキング">
      <div className="form" style={{ maxWidth: 720 }}>
        <h1 style={{ fontFamily: "var(--f-disp)", fontSize: 20, margin: 0 }}>ランキング</h1>
        <p className="hint" style={{ margin: 0 }}>
          エリア単位の集計です。釣り場そのものへの集中を避けるため、個々の釣り場名は出しません。詳しく見たい釣行は下のリンクから開けます。
          サイズは自己申告のため、「検証済み」は他の利用者{VERIFY_THRESHOLD}人以上が確認した記録であることを示します（自動判定ではありません）。
        </p>

        <div className="field"><label htmlFor="area">エリア</label>
          <select id="area" value={areaSlug} onChange={(e) => setAreaSlug(e.target.value)}>
            <option value="">全国</option>
            {(areas ?? []).map((a) => <option key={a.id} value={a.slug}>{a.name}（{a.prefecture}）</option>)}
          </select>
        </div>
      </div>

      <section className="summary">
        <h2><b>今週の回遊</b> <span className="sub">／ 直近7日・前週比</span></h2>
        <div className="sum-card" style={{ borderRight: "none" }}>
          {speciesLoading && <p className="notice" style={{ padding: "10px 0" }}>集計中…</p>}
          {!speciesLoading && (species?.ranking?.length ?? 0) === 0 && (
            <p style={{ fontSize: 13, color: "var(--ink-3)" }}>このエリアはまだ今週の釣果がありません。</p>
          )}
          {!speciesLoading && species?.ranking?.length > 0 && (
            <div className="rank" style={{ gap: 9 }}>
              {species.ranking.map((f, i) => (
                <div className="rank-row" key={f.name} style={{ fontSize: 15 }}>
                  <span className="no">{i + 1}</span>
                  <span className="nm">{f.name}</span>
                  <span
                    className={`trend t-${f.trend}`}
                    aria-label={`前週比 ${TREND_LABEL[f.trend]}`}
                    title={`前週 ${f.prevCount}件 → 今週 ${f.count}件`}
                  >
                    {TREND_MARK[f.trend]} {TREND_LABEL[f.trend]}
                  </span>
                  <span className="num" style={{ marginLeft: "auto" }}>{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <h2 className="sec-head">今月の大物（過去30日）</h2>
      <ul className="list">
        {bigLoading && <li className="notice">集計中…</li>}
        {!bigLoading && (big?.ranking?.length ?? 0) === 0 && (
          <li className="notice">このエリアはまだ大物の記録がありません。</li>
        )}
        {!bigLoading && big?.ranking?.map((c, i) => (
          <li className="row" key={`${c.tripId}-${i}`} style={{ cursor: "default" }}>
            <div className="when">
              <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>{i + 1}位</span>
            </div>
            <div className="catch">
              <span className="fish">{c.fish}<span className="sz">{c.sizeCm}cm</span></span>
              {c.verified && <span className="tag verified">検証済み</span>}
            </div>
            <div className="meta">
              <b>{c.angler}</b>
              <span>{c.area}</span>
              <span>{freshness(c.startedAt).label}</span>
              <Link to={`/trips/${c.tripId}`}>釣行を見る</Link>
            </div>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
