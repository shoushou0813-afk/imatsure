/**
 * 一覧の前に「今どうなっているか」を出す帯。
 * ここを読めば、リストを1件も開かずに行くか行かないかを決められる、が目標。
 */
export default function SummaryBand({ summary }) {
  if (!summary) return null;
  const { spot, hours, tripCount, topFishes, hourly, avgFishPerTrip, skunkRate, maxSize } = summary;
  const maxRank = Math.max(1, ...topFishes.map((f) => f.count));
  const maxHour = Math.max(...hourly);

  return (
    <section className="summary">
      <h2>直近{hours}時間の釣況 ／ <b>{spot.name}</b> ・ 釣行 <span className="num">{tripCount}</span>件</h2>
      <div className="sum-grid">
        <div className="sum-card">
          <h3>釣れている魚</h3>
          <div className="rank">
            {topFishes.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-3)" }}>まだ釣果がありません</span>}
            {topFishes.map((f) => (
              <div className="rank-row" key={f.name}>
                <span className="nm">{f.name}</span>
                <span className="rank-bar"><i style={{ width: `${(f.count / maxRank) * 100}%` }} /></span>
                <span className="num">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sum-card">
          <h3>入釣した時間帯</h3>
          {/* 単系列なので凡例は不要。ピークだけ色を変えて 目線を誘導する */}
          <div className="hist">
            {hourly.map((v, h) => (
              <div className={`b${v === maxHour && v > 0 ? " peak" : ""}`} key={h} title={`${h}時 ${v}件`}>
                <i style={{ height: maxHour ? `${(v / maxHour) * 100}%` : 0 }} />
              </div>
            ))}
          </div>
          <div className="hist-axis"><span>0時</span><span>6時</span><span>12時</span><span>18時</span><span>23時</span></div>
        </div>

        <div className="sum-card">
          <h3>釣行あたり平均</h3>
          <div className="hero-num">{avgFishPerTrip}<span style={{ fontSize: 14 }}> 匹</span></div>
          <div className="hero-sub">
            ボウズ率 <span className="num">{skunkRate}</span>%
            {maxSize && <> ・ 最大 <span className="num">{maxSize.sizeCm}</span>cm（{maxSize.fish}）</>}
          </div>
        </div>
      </div>
    </section>
  );
}
