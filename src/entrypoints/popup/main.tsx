import { createRoot } from "react-dom/client";

import "@/assets/globals.css";
import { PopupPage } from "@/components/app/popup-page";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Popup root element is missing.");
}

createRoot(root).render(<PopupPage />);
