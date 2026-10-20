// Web Dirwise (GitHub Pages). Adresu dává workflow z actions/configure-pages
// (SITE_URL + BASE_PATH), takže sedí i po přejmenování repa a s vlastní doménou.
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "url";

const site = process.env.SITE_URL ?? "https://arcly-studio.github.io";
const base = process.env.BASE_PATH ?? "/dirwise";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  // CSS je malé – vložené do HTML, bez blokujícího požadavku.
  build: { inlineStylesheets: "always" },
  integrations: [
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", cs: "cs" } },
    }),
  ],
  // Screenshoty a README se berou přímo z repa (docs/, README*.md) – bez kopií.
  vite: {
    server: { fs: { allow: [".."] } },
    define: { __REPO_ROOT__: JSON.stringify(fileURLToPath(new URL("..", import.meta.url))) },
  },
});
