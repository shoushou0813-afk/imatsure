import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api で始まるリクエストは Express（4000番）に転送する。
// こうするとブラウザからは同一オリジンに見えるので、Cookie がそのまま使える。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 同じWi-Fiのスマホから実機確認できるように、LAN側にも公開する。
    // /api はこのVite自身がサーバ(4000)へ中継するので、スマホからは同一オリジンに見える。
    host: true,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      // アップロードした画像もサーバ側にあるので、同じように転送する
      "/uploads": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
