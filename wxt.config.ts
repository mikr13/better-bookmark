import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "./src",
  manifest: {
    name: "Better Bookmarks",
    description:
      "Local-first AI bookmark graph with BYOK multimodal analysis and seen-before annotations.",
    permissions: ["activeTab", "scripting", "sidePanel", "storage", "tabs"],
    host_permissions: ["https://api.openai.com/*"],
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
