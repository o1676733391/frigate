/// <reference types="vitest" />
import path, { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

const proxyHost = process.env.PROXY_HOST || "192.168.1.195:8971";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "import.meta.vitest": "undefined",
  },
  server: {
    proxy: {
      "/api": {
        target: `https://${proxyHost}`,
        ws: true,
        secure: false,
        changeOrigin: true,
      },
      "/vod": {
        target: `https://${proxyHost}`,
        secure: false,
        changeOrigin: true,
      },
      "/clips": {
        target: `https://${proxyHost}`,
        secure: false,
        changeOrigin: true,
      },
      "/exports": {
        target: `https://${proxyHost}`,
        secure: false,
        changeOrigin: true,
      },
      "/ws": {
        target: `wss://${proxyHost}`,
        ws: true,
        secure: false,
        changeOrigin: true,
      },
      "/live": {
        target: `wss://${proxyHost}`,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
      },
    },
  },
  plugins: [
    react(),
    monacoEditorPlugin.default({
      customWorkers: [{ label: "yaml", entry: "monaco-yaml/yaml.worker" }],
      languageWorkers: ["editorWorkerService"], // we don't use any of the default languages
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    alias: {
      "testing-library": path.resolve(
        __dirname,
        "./__test__/testing-library.js",
      ),
    },
    setupFiles: ["./__test__/test-setup.ts"],
    includeSource: ["src/**/*.{js,jsx,ts,tsx}"],
    coverage: {
      reporter: ["text-summary", "text"],
    },
    mockReset: true,
    restoreMocks: true,
    globals: true,
  },
});
