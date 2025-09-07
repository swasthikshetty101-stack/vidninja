import { join } from "path";
import pkg from "./package.json";

//https://nitro.unjs.io/config
export default defineNitroConfig({
  compatibilityDate: "2023-05-18",
  srcDir: "./src",
  preset: "cloudflare-pages", // Optimize for Cloudflare deployment
  runtimeConfig: {
    version: pkg.version,
    tmdbApiKey: process.env.TMDB_API_KEY
  },
  alias: {
    "@": join(__dirname, "src")
  },
  // Cloudflare Workers optimizations
  experimental: {
    wasm: true,
  },
  rollupConfig: {
    external: ['node:crypto', 'node:buffer', 'node:timers', 'node:events', 'node:process'],
  },
  // Fix Node.js compatibility issues
  node: false,
});
