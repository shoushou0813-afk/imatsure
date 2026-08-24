import { useRef, useState } from "react";

/**
 * 写真を選ぶ → その場でサーバに送る → サムネを並べる、までを担当する部品。
 *
 * 投稿ボタンを押した時にまとめて送らないのは、
 *  1) 先に送っておけば投稿ボタンの待ち時間が短い
 *  2) Exif（撮影日時）を先に読めるので、日時欄を自動で埋められる
 * ため。onPicked に撮影日時を渡して、親のフォームに反映してもらう。
 */
export default function PhotoPicker({ photos, setPhotos, max = 3, onTakenAt }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pick = async (e) => {
    const files = [...e.target.files].slice(0, max - photos.length);
    e.target.value = ""; // 同じファイルを選び直せるようにクリアしておく
    if (files.length === 0) return;

    setBusy(true); setError(null);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        // FormData を送るときは Content-Type を自分で付けない（境界文字列をブラウザが付ける）
        const res = await fetch("/api/photos", { method: "POST", body: fd, credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || "アップロードに失敗しました");
        setPhotos((prev) => [...prev, json.data]);
        if (json.data.takenAt) onTakenAt?.(json.data.takenAt);
      } catch (err) {
        setError(err.message);
      }
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="photo-strip">
        {photos.map((p, i) => (
          <div className="photo-thumb" key={p.url}>
            <img src={p.thumbUrl} alt={`選択した写真 ${i + 1}`} loading="lazy" />
            <button type="button" className="photo-del"
              aria-label={`写真 ${i + 1} を外す`}
              onClick={() => setPhotos(photos.filter((x) => x.url !== p.url))}>×</button>
          </div>
        ))}

        {photos.length < max && (
          <button type="button" className="photo-add" disabled={busy}
            onClick={() => inputRef.current?.click()}>
            {busy ? "送信中…" : "＋ 写真"}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple hidden onChange={pick} />

      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

      <p className="hint">
        {max}枚まで・1枚12MBまで。長辺1600pxに縮小し、<b>位置情報（GPS）を含むExifは保存時に削除</b>されます。
      </p>
    </div>
  );
}
