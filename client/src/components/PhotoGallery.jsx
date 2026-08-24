import { useState } from "react";

/**
 * 釣行詳細の写真表示。
 * 一覧では写真を出さない（テキストファースト）ので、実際に画像を読むのはここだけ。
 * loading="lazy" と decoding="async" で、画面に入るまで通信を始めない。
 */
export default function PhotoGallery({ photos = [] }) {
  const [open, setOpen] = useState(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className="gallery">
        {photos.map((p, i) => (
          <button type="button" key={p.id ?? p.url} className="gallery-item" onClick={() => setOpen(p)}>
            <img src={p.thumbUrl} alt={`釣果の写真 ${i + 1}`} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="写真"
          onClick={() => setOpen(null)}>
          <img src={open.url} alt="釣果の写真（拡大）" />
          <button type="button" className="lightbox-close" aria-label="閉じる">×</button>
        </div>
      )}
    </>
  );
}
