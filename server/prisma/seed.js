import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

// 空のDBのままだと画面の見た目が確認できないので、開発用の初期データを流し込む。
const AREAS = [{ name: "三浦半島", slug: "miura", prefecture: "神奈川県" }];

const SPOTS = [
  { name: "剣崎 松輪港堤防", slug: "matsuwa-breakwater", kind: "堤防", lat: 35.1523, lng: 139.6708, accessNote: "駐車は南側有料（500円/日）。トイレあり。" },
  { name: "剣崎 地磯",       slug: "tsurugisaki-iso",   kind: "地磯", lat: 35.1489, lng: 139.6802, accessNote: "スパイクシューズ必須。南風のうねりに注意。" },
  { name: "松輪 江奈湾",     slug: "ena-bay",           kind: "港",   lat: 35.1566, lng: 139.6612, accessNote: "足場が良くファミリー向き。" },
  { name: "城ヶ島",           slug: "jogashima",         kind: "地磯", lat: 35.1338, lng: 139.6136, accessNote: "有料駐車場あり。灯台側は人が多い。" },
];

const FISHES = [
  ["ワラサ", "わらさ", "warasa", "青物"], ["イナダ", "いなだ", "inada", "青物"],
  ["カンパチ", "かんぱち", "kanpachi", "青物"], ["サバ", "さば", "saba", "青物"],
  ["アオリイカ", "あおりいか", "aoriika", "イカ"], ["タチウオ", "たちうお", "tachiuo", "その他"],
  ["クロダイ", "くろだい", "kurodai", "根魚"], ["メジナ", "めじな", "mejina", "根魚"],
  ["カサゴ", "かさご", "kasago", "根魚"], ["シロギス", "しろぎす", "shirogisu", "投げ"],
  ["メゴチ", "めごち", "megochi", "投げ"], ["ヒラメ", "ひらめ", "hirame", "その他"],
];

const METHODS = [
  ["ショアジギング", "shore-jigging"], ["エギング", "eging"], ["ウキ釣り", "uki"],
  ["ちょい投げ", "choinage"], ["フカセ", "fukase"], ["ワインド", "wind"],
];

const USERS = [
  ["kaz", "カズ"], ["nori", "のり"], ["tsuru", "つる"], ["hide", "ひで"],
  ["mako", "まこ"], ["ken", "けん"], ["yuki", "ゆき"], ["local_m", "松輪の常連"],
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

async function main() {
  console.log("シード開始…");
  const area = await prisma.area.create({ data: AREAS[0] });
  const spots = {};
  for (const s of SPOTS) spots[s.slug] = await prisma.spot.create({ data: { ...s, areaId: area.id } });

  const fishes = {};
  for (const [name, kana, slug, category] of FISHES)
    fishes[slug] = await prisma.fish.create({ data: { name, kana, slug, category } });

  const methods = {};
  for (const [name, slug] of METHODS) methods[slug] = await prisma.method.create({ data: { name, slug } });

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = {};
  for (const [handle, displayName] of USERS)
    users[handle] = await prisma.user.create({ data: { handle, displayName, passwordHash, trustScore: 10 } });

  const TRIPS = [
    { u: "kaz",   s: "matsuwa-breakwater", m: "shore-jigging", h: 6,   dur: 3.3, tide: ["大潮", "上げ3分"], wind: ["北東", 3], temp: 22.4,
      note: "日の出30分がすべて。ジグ40gブルピンで表層早巻き。7時以降は完全に沈黙しました。",
      c: [["warasa", 68, 2], ["saba", 41, 3]] },
    { u: "nori",  s: "tsurugisaki-iso",    m: "eging",         h: 7,   dur: 2.3, tide: ["大潮", "上げ2分"], wind: ["北東", 3], temp: 22.1,
      note: "3.5号オレンジ金テープ。潮が動き出した5時台に集中。足元は滑るのでスパイク必須。",
      c: [["aoriika", null, 1, 1200], ["aoriika", null, 2, 600]] },
    { u: "tsuru", s: "ena-bay",            m: "uki",           h: 14,  dur: 2.6, tide: ["大潮", "下げ"],     wind: ["南", 2],   temp: 22.6,
      note: "オキアミ。常夜灯まわりは小メジナばかり、少し離すとサイズが上がりました。",
      c: [["kurodai", 38, 1], ["mejina", 27, 4]] },
    { u: "hide",  s: "matsuwa-breakwater", m: "shore-jigging", h: 30,  dur: 4.1, tide: ["大潮", "上げ"],     wind: ["北", 4],   temp: 22.0,
      note: "鳥山が沖に出たまま寄らず。回遊は6時前後の一瞬だけ。",
      c: [["warasa", 72, 1], ["inada", 45, 2]] },
    { u: "mako",  s: "tsurugisaki-iso",    m: "wind",          h: 38,  dur: 4.5, tide: ["大潮", "下げ"],     wind: ["北", 3],   temp: 21.8,
      note: "20時台に群れが入りました。ケミホタル必須。帰りの磯歩きは複数人推奨。",
      c: [["tachiuo", null, 5, null, "指3本"]] },
    { u: "ken",   s: "ena-bay",            m: "choinage",      h: 78,  dur: 2.5, tide: ["中潮", "上げ"],     wind: ["東", 2],   temp: 21.5,
      note: "数は出るがサイズは伸びず。ファミリー向きの足場でおすすめ。",
      c: [["shirogisu", 22, 8], ["megochi", 18, 3]] },
    { u: "yuki",  s: "matsuwa-breakwater", m: "fukase",        h: 80,  dur: 5,   tide: ["中潮", null],       wind: ["東", 2],   temp: 21.6,
      note: "エサ取りだけ。潮が全く動かない時間帯に入ってしまったのが敗因。", c: [] },
    { u: "kaz",   s: "jogashima",          m: "shore-jigging", h: 150, dur: 3.2, tide: ["小潮", null],       wind: ["南西", 5], temp: 21.2,
      note: "風で釣りづらい。小型ながら青物の反応はまだ続いています。",
      c: [["kanpachi", 42, 1]] },
  ];

  for (const t of TRIPS) {
    const startedAt = hoursAgo(t.h);
    await prisma.trip.create({
      data: {
        userId: users[t.u].id, spotId: spots[t.s].id, methodId: methods[t.m].id,
        startedAt, endedAt: new Date(startedAt.getTime() + t.dur * 3600 * 1000),
        tideName: t.tide[0], tidePhase: t.tide[1], weather: "晴れ",
        windDir: t.wind[0], windSpeed: t.wind[1], waterTemp: t.temp,
        note: t.note, precision: "area", isSkunked: t.c.length === 0,
        catches: { create: t.c.map(([slug, sizeCm, count, weightG, sizeNote]) => ({
          fishId: fishes[slug].id, sizeCm, count, weightG: weightG ?? null, sizeNote: sizeNote ?? null,
        })) },
      },
    });
  }

  const THREADS = [
    { s: "matsuwa-breakwater", u: "ken",     cat: "質問",     title: "明日の朝マズメ、剣崎堤防いきます。40gで足りますか？",
      body: "初めて行きます。手持ちは30〜40gのジグだけです。届かないでしょうか。", replies: [["kaz", "40gあれば十分です。潮が速い日は60gがあると安心。"], ["hide", "むしろ表層を早く引ける方が大事。40gでOK。"]] },
    { s: "matsuwa-breakwater", u: "kaz",     cat: "募集",     title: "【募集】9/2(火) 早朝 松輪 車出せます あと1名",
      body: "3時出発、10時解散予定。ガソリン代割り勘でお願いします。", replies: [["nori", "行きたいです！"]] },
    { s: "ena-bay",            u: "local_m", cat: "現地情報", title: "江奈湾の駐車場、今週から工事で北側が使えません",
      body: "9月末まで閉鎖です。南側の有料に停めてください。路上駐車が増えると本当にまずいので共有まで。", replies: [["tsuru", "助かります。気をつけます。"]] },
    { s: "tsurugisaki-iso",    u: "nori",    cat: "雑談",     title: "アオリイカ、今年は去年より2週間遅い気がしませんか",
      body: "去年の同時期はもっとサイズが出ていた記憶があります。", replies: [] },
  ];

  for (const t of THREADS) {
    const thread = await prisma.thread.create({
      data: {
        spotId: spots[t.s].id, userId: users[t.u].id, title: t.title, category: t.cat,
        posts: { create: { userId: users[t.u].id, body: t.body } },
      },
    });
    for (const [u, body] of t.replies)
      await prisma.post.create({ data: { threadId: thread.id, userId: users[u].id, body } });
    if (t.replies.length)
      await prisma.thread.update({ where: { id: thread.id }, data: { lastPostedAt: new Date() } });
  }

  const RULES = [
    { s: "matsuwa-breakwater", u: "local_m", kind: "立入禁止", title: "松輪港 西側岸壁は終日立入禁止",
      body: "漁協の作業区域です。柵の外側からの釣りも不可。", source: "三浦市漁協 掲示（2026-06更新）", verifiers: ["kaz", "hide", "nori"] },
    { s: "ena-bay", u: "local_m", kind: "駐車", title: "北側駐車場が工事中（9月末まで）",
      body: "南側の有料駐車場（500円/日）を利用してください。路上駐車は近隣クレームの原因になります。",
      source: "現地掲示", expiresAt: new Date(Date.now() + 40 * 86400000), verifiers: ["tsuru", "ken"] },
    { s: "tsurugisaki-iso", u: "hide", kind: "安全", title: "南寄りの風でうねりが入ります",
      body: "風速5m以上、または波高1.5m以上の予報の日は入磯しないでください。ライフジャケット着用必須。",
      source: "経験則", verifiers: ["mako"] },
    { s: "matsuwa-breakwater", u: "kaz", kind: "地元ルール", title: "夜間は住宅地側での物音に注意",
      body: "ドアの開閉音・大声はトラブルの元です。ゴミは必ず持ち帰り、コマセを撒いた場所は海水で流してから帰りましょう。",
      source: null, verifiers: ["yuki"] },
  ];

  for (const r of RULES) {
    const rule = await prisma.rule.create({
      data: {
        spotId: spots[r.s].id, userId: users[r.u].id, kind: r.kind,
        title: r.title, body: r.body, source: r.source ?? null, expiresAt: r.expiresAt ?? null,
      },
    });
    for (const u of r.verifiers)
      await prisma.ruleVerification.create({ data: { ruleId: rule.id, userId: users[u].id } });
  }

  console.log("シード完了：釣り場 %d / 釣行 %d / スレッド %d / ルール %d",
    SPOTS.length, TRIPS.length, THREADS.length, RULES.length);
  console.log("テストログイン → ID: kaz  パスワード: password123");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
