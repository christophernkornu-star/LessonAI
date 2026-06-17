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
    chunkSizeWarningLimit: 1500,
    // Do NOT split node_modules into separate vendor chunks.
    // lucide-react v0.462+ uses dynamic icon imports that break with chunk splitting
    // (causes "Cannot access 'n' before initialization" TDZ errors).
    // Let Vite/Rollup handle chunking naturally.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React and core UI libraries - these need to be in ONE chunk
          // to avoid circular dependency issues (lucide-react v0.462+)
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') ||
              id.includes('@tanstack/react-query') || id.includes('@supabase/supabase-js') ||
              id.includes('lucide-react') || id.includes('@radix-ui') || id.includes('sonner') ||
              id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-core';
          }

          if (id.includes('katex')) {
            return 'vendor-katex';
          }

          if (id.includes('docx') || id.includes('docxtemplater') || id.includes('pizzip')) {
            return 'vendor-docx';
          }

          if (id.includes('pdfjs-dist')) {
            return 'vendor-pdf';
          }

          if (id.includes('file-saver')) {
            return 'vendor-filesaver';
          }

          if (id.includes('date-fns')) {
            return 'vendor-date';
          }

          return 'vendor-misc';
        },
      },
    },
  },
}));

