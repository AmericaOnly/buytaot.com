import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        wallets: resolve(__dirname, "wallets.html"),
        available: resolve(__dirname, "available.html"),
        podcast: resolve(__dirname, "podcast.html"),
      },
    },
  },
});
