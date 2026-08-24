// .env が無ければ .env.example からコピーする（初回セットアップを1コマンドで済ませるため）
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = join(root, ".env");
if (!existsSync(env)) {
  copyFileSync(join(root, ".env.example"), env);
  console.log(".env を .env.example から作成しました。JWT_SECRET は本番前に必ず変更してください。");
}
