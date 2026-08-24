import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { attachUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import auth from "./routes/auth.js";
import spots from "./routes/spots.js";
import trips from "./routes/trips.js";
import threads from "./routes/threads.js";
import rules from "./routes/rules.js";
import reports from "./routes/reports.js";
import masters from "./routes/masters.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

// 簡易レートリミット（同一IPで1分60リクエストまで）。
// TODO(学習): 本番は express-rate-limit + Redis に置き換える。
const hits = new Map();
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  const key = req.ip;
  const now = Date.now();
  const rec = hits.get(key) || { n: 0, t: now };
  if (now - rec.t > 60_000) { rec.n = 0; rec.t = now; }
  rec.n += 1; hits.set(key, rec);
  if (rec.n > 60) return res.status(429).json({ error: { message: "少し時間をおいてからお試しください" } });
  next();
});

app.get("/api/health", (_req, res) => res.json({ data: { ok: true } }));
app.use("/api/auth", auth);
app.use("/api/spots", spots);
app.use("/api/trips", trips);
app.use("/api/threads", threads);
app.use("/api/rules", rules);
app.use("/api/reports", reports);
app.use("/api", masters);

app.use((_req, res) => res.status(404).json({ error: { message: "そのAPIはありません" } }));
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`[imatsure] API listening on http://localhost:${port}`));
