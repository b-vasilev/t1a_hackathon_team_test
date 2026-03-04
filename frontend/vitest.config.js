import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Custom plugin to handle JSX in .js files (needed for pdf/ directory)
function jsxInJsPlugin() {
  return {
    name: "jsx-in-js",
    enforce: "pre",
    async transform(code, id) {
      if (id.endsWith(".js") && id.includes("/src/") && (code.includes("</") || code.includes("/>"))) {
        const esbuild = await import("esbuild");
        const result = await esbuild.transform(code, {
          loader: "jsx",
          jsx: "automatic",
          sourcefile: id,
        });
        return { code: result.code, map: result.map };
      }
    },
  };
}

export default defineConfig({
  plugins: [jsxInJsPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    css: false,
  },
});
