# イマツレ（imatsure）— 釣り掲示板

> 「記録するSNS」ではなく、**明日の釣行を10秒で決めるための掲示板**。
> アングラーズより見やすい、を検証可能な設計に落とした実装スキャフォールドです。

**ドキュメント**

| | |
|---|---|
| [docs/01-design-note.md](docs/01-design-note.md) | なぜこの形なのか。競合分析・差別化の4本柱・見やすさの設計原則 |
| [docs/02-monetization.md](docs/02-monetization.md) | 収益設計。モデル7案・フェーズ別試算・やらないこと |
| [docs/03-prototype.md](docs/03-prototype.md) | 画面プロトタイプと、サイクル1で測った数字 |
| [GLOSSARY.md](GLOSSARY.md) | 用語集。分からない言葉が出たらここ |

---

## 1. これは何か

| | |
|---|---|
| フロント | React 18 + Vite + React Router |
| サーバ | Node.js + Express |
| DB | Prisma + SQLite（本番は PostgreSQL に差し替え可能） |
| 認証 | JWT を HttpOnly Cookie で保持 |

動く状態で入っています。シードデータ（釣り場4か所・釣行8件・スレッド4件・ルール4件）も込みです。

---

## 2. 動かす

```bash
npm install        # ルートの開発ツール（同時起動用）
npm run setup      # server / client の依存 ＋ DB作成 ＋ シード投入（初回のみ）
npm run dev        # フロント(5173) とサーバ(4000) を同時に起動
```

`.env` は初回に `.env.example` から自動生成されます（`JWT_SECRET` は本番前に必ず変更）。

ブラウザで <http://localhost:5173> を開きます。

**テストログイン** — ID: `kaz` ／ パスワード: `password123`
（シードで作られる他のユーザーも同じパスワードです）

### 個別に起動したいとき

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

### DBを作り直したいとき

```bash
npm run db:reset     # 全消し＋作り直し＋シード（データは消えます）
npm run db:setup     # スキーマ反映＋シード追加（既存データは残る）
```

> `db:setup` のシードは**追記型**なので、2回流すと重複エラーになります。作り直したいときは `db:reset` を使ってください。

---

## 3. ディレクトリ構成

```
imatsure/
├── server/                 Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   ← テーブル定義。ここが設計の中心
│   │   └── seed.js         ← 開発用の初期データ
│   └── src/
│       ├── index.js        ← 起動・ミドルウェア・ルーティング登録
│       ├── db.js           ← Prisma クライアント
│       ├── middleware/     ← 認証・エラー整形
│       └── routes/         ← spots / trips / threads / rules / auth / reports
└── client/                 React + Vite
    └── src/
        ├── App.jsx         ← ルーティング（URLと画面の対応）
        ├── auth.jsx        ← ログイン状態を全体で共有（Context）
        ├── api.js          ← fetch のラッパー。通信はここに集約
        ├── useApi.js       ← GET用の小さなデータ取得フック
        ├── format.js       ← 表示用の整形（鮮度・時刻・釣果ラベル）
        ├── components/     ← TripRow / SummaryBand / FilterBar / …
        └── pages/          ← Home / SpotBoard / SpotThreads / SpotRules / …
```

---

## 4. 設計で押さえている4点

### ① 1行＝1釣行（1匹ではない）

`Trip`（釣行）と `Catch`（釣果1件）を分けています。ここを分けずに「1匹＝1レコード」にすると、

- 一覧が水増しされて「釣れている」が誤って見える
- 「その日どれだけ釣れたか」の統計が出せない
- ボウズ（1匹も釣れなかった日）を記録できない

の3つが同時に起きます。`schema.prisma` の `Trip` / `Catch` を見てください。

### ② 鮮度を色で持つ

釣り情報は鮮度がすべてです。`client/src/format.js` の `freshness()` が
「今日／昨日／N日前」を返し、CSS の `.fresh.f0〜f3` が色の濃さに変換します。
日付の文字を読ませず、視線を止めずに新旧が分かるようにするためです。

### ③ テキストファースト（写真の扱い）

一覧に写真を出しません。釣り場は電波が弱く、写真8枚で数MB、テキストなら数十KBです。
一覧には「写真 3」という**文字**だけを出し、実際の画像は行を開いてから `loading="lazy"` で読み込みます。

**写真投稿の流れ**

1. 投稿画面で写真を選ぶ → その場で `POST /api/photos` に送る（まだDBには入らない）
2. サーバが Exif から**撮影日時だけ**を読み取って返す → 開始日時の欄が自動で埋まる
3. sharp で長辺1600pxの表示用と480pxのサムネに変換して保存。
   **この変換で Exif（GPS を含む）は完全に消える**
4. 「この釣行を投稿する」で `POST /api/trips` に画像URLを渡し、`Photo` レコードが作られる

関連ファイル：`server/src/storage.js`（保存と変換）、`server/src/routes/photos.js`（受け口）、
`client/src/components/PhotoPicker.jsx`（選択UI）、`PhotoGallery.jsx`（表示）

**制限**

| 項目 | 値 | 変える場所 |
|---|---|---|
| 1釣行あたりの枚数 | 3枚 | `routes/photos.js` の `FREE_PHOTOS_PER_TRIP` |
| 1枚のサイズ上限 | 12MB | `routes/photos.js` の `MAX_BYTES` |
| 対応形式 | JPEG / PNG / WebP | `routes/photos.js` の `ALLOWED` |
| 表示用の長辺 | 1600px | `storage.js` の `DISPLAY_MAX` |

> **iPhoneのHEICについて**：iOSのカメラは既定でHEIC形式です。Safariのファイル選択では
> 多くの場合JPEGに変換されて送られますが、変換されないケースもあります。
> 本番前に実機で確認し、必要なら sharp に libheif を入れるか、ブラウザ側で変換してください。

> **保存先の差し替え**：いまはサーバのディスク（`server/uploads/`）に置いています。
> 本番では `storage.js` の `saveImage` / `deleteImage` だけを Cloudflare R2 などの
> S3互換ストレージに書き換えれば移行できます。呼び出し側は変更不要です。

### ④ ルールを釣況より上に

`Rule` テーブルと `/spots/:slug/rules` が最大の差別化です。
釣果情報が広まると人が殺到し、ゴミ・駐車トラブルから釣り禁止になる釣り場が実在します。
だから「そこで守るべきこと」を釣況と同じ階層に常設し、
`RuleVerification`（現地で確認した）で古い情報が自然に沈むようにしています。
投稿時の位置情報の既定値を `area`（ぼかし）にしているのも同じ理由です。

---

## 5. 主なAPI

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/api/spots` | 釣り場一覧 |
| GET | `/api/spots/:slug/summary?hours=72` | 直近◯時間の釣況サマリー |
| GET | `/api/trips?spot=&fish=&method=&days=&cursor=` | 釣況リスト（カーソルページング） |
| POST | `/api/trips` | 釣行＋釣果をまとめて投稿 |
| GET/POST | `/api/threads` | スレッド一覧・作成 |
| POST | `/api/threads/:id/posts` | 返信 |
| POST | `/api/photos` | 写真1枚をアップロード（Exif削除＋リサイズ、撮影日時を返す） |
| GET/POST | `/api/rules` | ルール一覧・追加 |
| POST | `/api/rules/:id/verify` | 「現地で確認した」 |
| POST | `/api/auth/register` `/login` `/logout` | 認証 |

レスポンスは常に `{ data, meta }`、エラーは常に `{ error: { message } }` に揃えています。

---

## 6. 次にやること（TODOの場所）

コード中に `TODO(学習):` と書いてある箇所が手を入れるポイントです。

- [x] 写真アップロード（Exif削除・リサイズ・サムネ生成まで実装済み）
- [ ] 保存先を S3互換ストレージ（R2）に差し替え（`storage.js` だけで済む）
- [ ] HEIC（iPhone）対応
- [ ] 潮汐・天候の自動取得（いまはシードの固定値）
- [ ] 通報が3件たまったら自動で非表示にする処理（`routes/reports.js`）
- [ ] サマリー集計のキャッシュ（`routes/spots.js`）
- [ ] レートリミットを `express-rate-limit` + Redis に置き換え（`index.js`）
- [ ] 無限スクロール（`nextCursor` は既に返っている）
- [ ] PWA化（ホーム画面に追加・オフラインで直近を読む）

## 7. 本番に出すとき

1. `schema.prisma` の `provider` を `postgresql` に変更し、`DATABASE_URL` を差し替え
2. `JWT_SECRET` を必ず変更（`.env` はコミットしない）
3. Cookie に `secure: true` を追加（HTTPS前提）
4. 利用規約・プライバシーポリシー（位置情報を扱うので必須）
5. ホスティング例：フロント Vercel / Cloudflare Pages、サーバ Render / Fly.io、DB Neon、画像 R2

用語で分からないものは `GLOSSARY.md` を見てください。
