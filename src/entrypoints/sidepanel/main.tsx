import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import "@/assets/globals.css";
import { SidepanelPage } from "@/components/app/sidepanel-page";
import { ThemeProvider } from "@/components/app/theme-provider";

const root = document.getElementById("root");
const queryClient = new QueryClient();

if (!root) {
  throw new Error("Side panel root element is missing.");
}

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SidepanelPage />
    </ThemeProvider>
  </QueryClientProvider>,
);
