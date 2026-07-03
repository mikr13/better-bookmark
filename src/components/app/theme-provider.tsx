import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { appSettingsItem, setSettings } from "@/lib/app-storage";
import type { ThemePreference } from "@/lib/domain";

type ThemeContextValue = {
  readonly theme: ThemePreference;
  readonly setTheme: (theme: ThemePreference) => Promise<void>;
  readonly cycleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    root.classList.add(
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );
    return;
  }

  root.classList.add(theme);
}

function nextTheme(theme: ThemePreference): ThemePreference {
  switch (theme) {
    case "light":
      return "dark";
    case "dark":
      return "system";
    case "system":
      return "light";
  }
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    let mounted = true;

    void appSettingsItem.getValue().then((settings) => {
      if (mounted) {
        setThemeState(settings.theme);
        applyTheme(settings.theme);
      }
    });

    const unwatch = appSettingsItem.watch((settings) => {
      setThemeState(settings.theme);
      applyTheme(settings.theme);
    });

    return () => {
      mounted = false;
      unwatch();
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: async (next) => {
        await setSettings({ theme: next });
      },
      cycleTheme: async () => {
        await setSettings({ theme: nextTheme(theme) });
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
