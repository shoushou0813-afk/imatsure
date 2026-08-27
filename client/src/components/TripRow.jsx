import { freshness, hhmm, catchLabel } from "../format";

/**
 * 釣況リストの1行 ＝ 1釣行。
 * 「1匹1行」にしないのがイマツレの設計の核。一覧が水増しされず、統計も正しく出る。
 */
export default function TripRow({ trip, selected, onSelect, hideSpot = false }) {
  const f = freshness(trip.startedAt);
  return (
    <li
      className={`row${selected ? " on" : ""}`}
      onClick={() => onSelect?.(trip)}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(trip)}
      tabIndex={0}
      role="button"
      aria-label={`${trip.spot.name} ${f.label}の釣行`}
    >
      <div className="when">
        <span className={`fresh f${f.level}`}>{f.label}</span>
        <span className="num">{hhmm(trip.startedAt)}</span>
      </div>

      <div className="catch">
        {/* ボウズも立派な釣行情報なので、薄くしすぎず本文として読める濃さで出す */}
        {trip.catches.length === 0 ? (
          <span className="fish skunk">ボウズ</span>
        ) : (
          trip.catches.map((c) => {
            const { name, size, count } = catchLabel(c);
            return (
              <span className="fish" key={c.id}>
                {name}
                {size && <span className="sz">{size}</span>}
                {count > 1 && <span className="x"> ×{count}</span>}
              </span>
            );
          })
        )}
      </div>

      <div className="meta">
        <b>{trip.method.name}</b>
        {/* 釣り場ボードでは全行が同じ釣り場なので出さない。1行が1段短くなり、一覧に多く入る。 */}
        {!hideSpot && <span>{trip.spot.name}</span>}
        {trip.tideName && <span>{trip.tideName}{trip.tidePhase ? ` ${trip.tidePhase}` : ""}</span>}
        {trip.windDir && <span>{trip.windDir} {trip.windSpeed}m</span>}
        {/* 一覧に画像は出さない。「写真がある」という事実だけ文字で伝える */}
        {trip._count?.photos > 0 && <span>写真 <span className="num">{trip._count.photos}</span></span>}
      </div>

      <div className="rowend">
        <span className="avatar">{trip.user.handle.slice(0, 2)}</span>
      </div>
    </li>
  );
}
