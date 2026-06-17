import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
      },
    },
  },
  optimizeDeps: {
    // Force pre-bundling of these packages to avoid chunk ordering issues
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
    ],
    // Ensure all radix-ui packages are bundled together
    exclude: [],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'LessonAi.png', 'robots.txt'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4194304 // 4 MB
      },
      manifest: {
        name: 'LessonAI',
        short_name: 'LessonAI',
        description: 'AI-Powered Lesson Note Generator for Teachers',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'LessonAi.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'LessonAi.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  esbuild: {
    // In production, strip standard logs but keep errors and warnings for debugging
    drop: mode === 'production' ? ['debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
    build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Put ALL node_modules into a single vendor chunk to avoid
        // cross-chunk dependency issues (lucide-react dynamic imports,
        // radix-ui inter-dependencies, vendor-misc needing React context, etc.)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));

