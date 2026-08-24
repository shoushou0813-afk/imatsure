import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import exifr from "exifr";

/**
 * 画像の保存先をここに閉じ込める。
 * いまはサーバのディスクに置くが、本番は S3互換ストレージ（Cloudflare R2 など）に差し替える。
 * 呼び出し側（routes/photos.js）は「保存して URL を返す関数」しか知らないので、
 * ここだけ書き換えれば移行できる。
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const UPLOAD_DIR = join(ROOT, "uploads");

/** 表示用の長辺。1600pxあればスマホでもPCでも十分で、容量は原寸の1/10以下になる。 */
const DISPLAY_MAX = 1600;
/** 一覧・初期表示用のサムネイル。 */
const THUMB_MAX = 480;

/**
 * Exif（写真に埋め込まれた撮影情報）から撮影日時だけを取り出す。
 * GPS は意図的に読み捨てる。自宅や秘密のポイントの座標が
 * 本人の意図と無関係に公開されるのを防ぐため。
 */
export async function readTakenAt(buffer) {
  try {
    const exif = await exifr.parse(buffer, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d = exif?.DateTimeOriginal || exif?.CreateDate;
    return d ? new Date(d).toISOString() : null;
  } catch {
    return null; // Exif が無い画像・壊れた画像は「日時不明」として扱う
  }
}

/**
 * 受け取った画像を 表示用 + サムネ の2枚に変換して保存する。
 * sharp は既定でメタデータを引き継がないので、この時点で Exif（GPS含む）は消える。
 */
export async function saveImage(buffer) {
  const now = new Date();
  const rel = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dir = join(UPLOAD_DIR, rel);
  await mkdir(dir, { recursive: true });

  const id = randomUUID();
  const base = sharp(buffer).rotate(); // rotate() で Exif の回転情報を画素に焼き込んでから捨てる

  const display = await base.clone()
    .resize({ width: DISPLAY_MAX, height: DISPLAY_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const thumb = await base.clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();

  await writeFile(join(dir, `${id}.jpg`), display.data);
  await writeFile(join(dir, `${id}_t.jpg`), thumb);

  return {
    url: `/uploads/${rel}/${id}.jpg`,
    thumbUrl: `/uploads/${rel}/${id}_t.jpg`,
    width: display.info.width,
    height: display.info.height,
    bytes: display.data.length,
  };
}

/** 保存済みの画像を消す（釣行削除時など）。失敗しても致命傷ではないので握りつぶす。 */
export async function deleteImage(url) {
  const rel = url.replace(/^\/uploads\//, "");
  await unlink(join(UPLOAD_DIR, rel)).catch(() => {});
  await unlink(join(UPLOAD_DIR, rel.replace(/\.jpg$/, "_t.jpg"))).catch(() => {});
}
