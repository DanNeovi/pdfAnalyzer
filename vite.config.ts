import { defineConfig } from "vite";
import { resolve } from "node:path";

// We deliberately keep the build output predictable so the Neovi factory
// app's sync-pdf-analyzer.mjs script can copy known files into its
// public/ folder without parsing the manifest.
//
// The HTML entrypoint is `pdf-annotator.html` (not index.html) because
// that's the URL the Neovi app routes to — keeping the same name avoids
// a frontend update.
export default defineConfig({
  // Relative asset URLs ("./assets/foo.js" instead of "/assets/foo.js") so
  // the same build works whether the app is served at "/" (standalone via
  // python -m http.server), at "/pdf-analyzer/" (Neovi factory app), or
  // any other prefix. Without this, mounting under a sub-path would 404
  // every asset because the HTML references absolute root paths.
  base: "./",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        annotator: resolve(__dirname, "pdf-annotator.html"),
      },
      output: {
        // Hashed filenames for the JS / CSS so the SW can cache-bust on
        // version bump. Keeping HTML un-hashed (Vite default).
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    // pdf.js worker is large; make Vite stop warning about it.
    chunkSizeWarningLimit: 1500,
  },
  // pdf.js needs its worker as a separate file. Vite's optimizeDeps will
  // try to inline ESM but pdfjs-dist ships a worker binary. We exclude it
  // and use the `?worker&url` import in the source.
  optimizeDeps: {
    exclude: ["pdfjs-dist/build/pdf.worker.min.js"],
  },
  server: {
    port: 8000,
    open: "/pdf-annotator.html",
  },
});
