import { useEffect, useState } from "react";
import { freshness, hhmm, catchLabel } from "../format";
import { api } from "../api";
import { useAuth } from "../auth";
import PhotoGallery from "./PhotoGallery";

// trips.js の VERIFY_THRESHOLD と揃える（バッジの基準がずれないように）。
const VERIFY_THRESHOLD = 2;

export default function TripDetail({ trip }) {
  const { user } = useAuth();
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [verifyError, setVerifyError] = useState(null);
  const [verifyDone, setVerifyDone] = useState(false);

  useEffect(() => {
    setVerifiedCount(trip?._count?.verifications ?? 0);
    setVerifyError(null);
    setVerifyDone(false);
  }, [trip?.id]);

  if (!trip) return (
    <div className="detail"><h3>釣行を選ぶ</h3>
      <div className="dsub">左の一覧から行を選ぶと、ここに詳細が出ます。</div></div>
  );

  const verify = async () => {
    try {
      await api.post(`/trips/${trip.id}/verify`);
      setVerifiedCount((n) => n + 1);
      setVerifyDone(true);
    } catch (e) { setVerifyError(e.message); }
  };

  const isOwnTrip = user?.id === trip.user.id;
  const f = freshness(trip.startedAt);
  return (
    <div className="detail">
      <h3>
        {trip.spot.name}
        {verifiedCount >= VERIFY_THRESHOLD && <span className="tag verified">検証済み</span>}
      </h3>
      <div className="dsub">
        {f.label} {hhmm(trip.startedAt)}{trip.endedAt && `-${hhmm(trip.endedAt)}`} ・ {trip.user.displayName}
        {trip.user.trustScore !== 0 && <span className="trust">（信頼 {trip.user.trustScore > 0 ? "+" : ""}{trip.user.trustScore}）</span>}
      </div>
      <div className="ctl" style={{ margin: "0 0 10px" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          <span className="num">{verifiedCount}</span>人が確からしいと確認
        </span>
        {user && !isOwnTrip && !verifyDone && (
          <button type="button" className="verify" onClick={verify}>確からしいと確認する</button>
        )}
        {verifyError && <span className="error" style={{ padding: "3px 8px", fontSize: 12 }}>{verifyError}</span>}
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
        {trip.weather && <><dt>天気</dt><dd>{trip.weather}</dd></>}
        {trip.windDir && <><dt>風</dt><dd>{trip.windDir} {trip.windSpeed}m</dd></>}
        {trip.waterTemp && <><dt>水温</dt><dd>{trip.waterTemp}℃</dd></>}
      </dl>
      {trip.note && <div className="note">{trip.note}</div>}
    </div>
  );
}
