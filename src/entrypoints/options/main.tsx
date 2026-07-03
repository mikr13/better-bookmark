import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import "@/assets/globals.css";
import { SettingsPage } from "@/components/app/settings-page";
import { ThemeProvider } from "@/components/app/theme-provider";

const root = document.getElementById("root");
const queryClient = new QueryClient();

if (!root) {
  throw new Error("Options root element is missing.");
}

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>
  </QueryClientProvider>,
);
