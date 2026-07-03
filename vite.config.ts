import { defineConfig } from "vite-plus";
import { WxtVitest } from "wxt/testing/vitest-plugin";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [WxtVitest(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@src": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
  },
  lint: {
    ignorePatterns: [
      ".agents/**",
      ".omo/**",
      ".output/**",
      ".wxt/**",
      "dist/**",
      "node_modules/**",
    ],
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      ".agents/**",
      ".omo/**",
      ".output/**",
      ".wxt/**",
      "dist/**",
      "node_modules/**",
      "src/assets/globals.css",
    ],
    sortImports: true,
    sortTailwindcss: true,
  },
  // The empty block is load-bearing, needed
  staged: {},
});
