import { useState } from "react";

/**
 * 釣り場の位置を地図で確認する。
 * 初期表示を軽く保つため既定は閉じておき、開いたときだけ埋め込み地図を読み込む。
 * APIキー不要のOpenStreetMap埋め込みを使う。
 */
export default function SpotMap({ spot }) {
  const [open, setOpen] = useState(false);
  if (!spot?.lat || !spot?.lng) return null;

  const { lat, lng, name, accessNote } = spot;
  const dLat = 0.0045, dLng = 0.007;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(",");
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const fullUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="spotmap">
      <button type="button" className="spotmap-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="mk">{open ? "▼" : "▶"}</span>
        地図で場所を見る
        {accessNote && <span className="acc">／ {accessNote}</span>}
      </button>
      {open && (
        <div className="spotmap-frame">
          <iframe title={`${name}の地図`} src={embedSrc} loading="lazy" />
          <a href={fullUrl} target="_blank" rel="noreferrer">大きな地図で開く（OpenStreetMap）</a>
        </div>
      )}
    </div>
  );
}
