import { freshness, hhmm, catchLabel } from "../format";
import PhotoGallery from "./PhotoGallery";

export default function TripDetail({ trip }) {
  if (!trip) return (
    <div className="detail"><h3>釣行を選ぶ</h3>
      <div className="dsub">左の一覧から行を選ぶと、ここに詳細が出ます。</div></div>
  );
  const f = freshness(trip.startedAt);
  return (
    <div className="detail">
      <h3>{trip.spot.name}</h3>
      <div className="dsub">
        {f.label} {hhmm(trip.startedAt)}{trip.endedAt && `-${hhmm(trip.endedAt)}`} ・ {trip.user.displayName}
      </div>
      <PhotoGallery photos={trip.photos} />
      <dl className="dl-grid">
        <dt>釣果</dt>
        <dd>{trip.catches.length === 0 ? "ボウズ" : trip.catches.map((c) => {
          const { name, size, count } = catchLabel(c);
          return <div key={c.id}>{name} {size}{count > 1 ? ` ×${count}` : ""}</div>;
        })}</dd>
        <dt>釣り方</dt><dd>{trip.method.name}</dd>
        {trip.tideName && <><dt>潮</dt><dd>{trip.tideName} {trip.tidePhase}</dd></>}
        {trip.windDir && <><dt>風</dt><dd>{trip.windDir} {trip.windSpeed}m</dd></>}
        {trip.waterTemp && <><dt>水温</dt><dd>{trip.waterTemp}℃</dd></>}
      </dl>
      {trip.note && <div className="note">{trip.note}</div>}
    </div>
  );
}
