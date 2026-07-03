import { fileURLToPath, URL } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "./src",
  manifest: {
    name: "Better Bookmarks",
    description:
      "Local-first AI bookmark graph with BYOK multimodal analysis and seen-before annotations.",
    permissions: ["activeTab", "scripting", "sidePanel", "storage", "tabs"],
    host_permissions: [
      "<all_urls>",
      "https://api.openai.com/*",
      "https://api.anthropic.com/*",
      "https://api.groq.com/*",
      "https://api.deepseek.com/*",
      "https://generativelanguage.googleapis.com/*",
      "http://localhost:11434/*",
      "http://127.0.0.1:11434/*",
    ],
    optional_host_permissions: ["http://*/*", "https://*/*"],
    action: {
      default_title: "Better Bookmarks",
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@src": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      modulePreload: { polyfill: false },
    },
    plugins: [
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset()],
      }),
    ],
  }),
});
