import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router', 'react/jsx-runtime'],
          'charts-vendor': ['lightweight-charts'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'utils-vendor': ['date-fns', 'date-fns-jalali', 'clsx', 'tailwind-merge'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react/jsx-runtime',
      'react-router',
      'lightweight-charts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'framer-motion',
      'lucide-react',
      'recharts',
    ],
    exclude: ['pdfjs-dist'],
  },
  esbuild: {
    legalComments: 'none',
    keepNames: false,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
  },
  server: {
    hmr: false,
    proxy: {
      // ─── TSETMC API (market watch) ───
      '/tsetmc-api': {
        target: 'https://cdn.tsetmc.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/tsetmc-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fa,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://tsetmc.com/',
          'Origin': 'https://tsetmc.com',
        },
      },
      // ─── TSETMC API (mirror) ───
      '/tsetmc-api-v2': {
        target: 'https://tsetmc.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/tsetmc-api-v2/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fa,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://tsetmc.com/',
          'Origin': 'https://tsetmc.com',
        },
      },
      // ─── TSETMC Historical OHLC (fixes CORS) ───
      '/tsetmc-history': {
        target: 'https://cdn.tsetmc.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/tsetmc-history/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://tsetmc.com/',
          'Origin': 'https://tsetmc.com',
        },
      },
      // ─── Codal API ───
      '/codal-api': {
        target: 'https://www.codal.ir',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/codal-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fa,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://www.codal.ir/',
        },
      },
      // ─── TGJU API ───
      '/tgju-api': {
        target: 'https://api.tgju.org',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/tgju-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      },
      // ─── Iranian RSS Proxies ───
      '/rss/irna': {
        target: 'https://www.irna.ir',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/irna/, '/rss/service/economy/rss.xml'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/tasnim': {
        target: 'https://www.tasnimnews.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/tasnim/, '/rss/service/economy'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/mehr': {
        target: 'https://www.mehrnews.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/mehr/, '/rss/service/economy'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/fars': {
        target: 'https://www.farsnews.ir',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/fars/, '/rss/economy'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/boursenews': {
        target: 'https://www.boursenews.ir',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/boursenews/, '/rss'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/donya': {
        target: 'https://www.donya-e-eqtesad.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/donya/, '/Base/RSS'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/eghtesadnews': {
        target: 'https://www.eghtesadnews.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/eghtesadnews/, '/rss'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/shahrestock': {
        target: 'https://www.shahrestock.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/shahrestock/, '/rss'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      // ─── International RSS ───
      '/rss/reuters': {
        target: 'https://www.reutersagency.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/reuters/, '/feed/?best-sectors=commodities&post_type=best'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/cnbc': {
        target: 'https://search.cnbc.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/cnbc/, '/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/marketwatch': {
        target: 'https://feeds.marketwatch.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/marketwatch/, '/marketwatch/topstories'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/yahoo': {
        target: 'https://finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/yahoo/, '/news/rssindex'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/euronews': {
        target: 'https://www.euronews.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/euronews/, '/rss'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
      '/rss/investing': {
        target: 'https://www.investing.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/rss\/investing/, '/rss/rss_news.xml'),
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml, */*' },
      },
    },
  },
});
