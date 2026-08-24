import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";
import { saveImage, readTakenAt } from "../storage.js";

const r = Router();

/** 1釣行に付けられる枚数。無料プランの上限。ここが課金設計と直結する（README参照）。 */
export const FREE_PHOTOS_PER_TRIP = 3;
const MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// ディスクではなくメモリに受ける。どうせ sharp で変換するので、原本を残す必要がない。
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype))
      return cb(new Error("JPEG / PNG / WebP の画像を選んでください（iPhoneのHEICは非対応です）"));
    cb(null, true);
  },
});

/**
 * 画像を1枚アップロードする。
 * この時点ではまだDBに保存しない ＝ 釣行に紐づかない「下ごしらえ」。
 * 投稿画面で先に写真を選ばせて、Exifの撮影日時をフォームに反映したいため。
 * 実際の Photo レコードは POST /api/trips のときにまとめて作られる。
 */
r.post("/", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "画像が大きすぎます（12MBまで）"
        : err.message || "画像を受け取れませんでした";
      return res.status(400).json({ error: { message } });
    }
    next();
  });
}, wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { message: "画像が選ばれていません" } });

  // 順番が大事：Exif を読む → 変換して保存（変換の時点で Exif は消える）
  const takenAt = await readTakenAt(req.file.buffer);
  const saved = await saveImage(req.file.buffer);

  res.status(201).json({ data: { ...saved, takenAt } });
}));

export default r;
