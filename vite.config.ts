import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      // O service worker novo assume sem recarregar a página: o perfil só existe na memória
      // até ser salvo, então a versão nova passa a valer na próxima abertura do app.
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      // `start_url` e `scope` seguem o `base` do build (ex.: /gerenciador-financeiro/).
      manifest: {
        name: "Gerenciador Financeiro",
        short_name: "Gerenciador Financeiro",
        description:
          "Controle entradas, saídas e cartões de crédito mês a mês, salvando tudo em um arquivo JSON.",
        lang: "pt-BR",
        display: "standalone",
        orientation: "portrait",
        // Equivalentes em hex de `--primary` (ícone) e `--background` de src/styles.css.
        theme_color: "#174a35",
        background_color: "#f8f7f1",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
