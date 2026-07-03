import { BookMarked, Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";

import { useTheme } from "@/components/app/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export type ShellTab = "settings" | "saved" | "graph";

export function AppShell({
  activeTab,
  children,
  onTabChange,
}: {
  readonly activeTab?: ShellTab;
  readonly children: ReactNode;
  readonly onTabChange?: (tab: ShellTab) => void;
}) {
  const { cycleTheme, theme } = useTheme();
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className="bg-background text-foreground min-h-[100dvh]">
      <header className="bg-background/92 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              <BookMarked className="size-4" />
            </span>
            <span>Better Bookmarks</span>
          </div>
          {onTabChange ? (
            <nav className="bg-muted mx-auto grid w-full max-w-xl grid-cols-3 rounded-xl p-1">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "settings" ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => onTabChange("settings")}
              >
                Settings
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "saved" ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => onTabChange("saved")}
              >
                Saved
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "graph" ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => onTabChange("graph")}
              >
                Graph
              </button>
            </nav>
          ) : (
            <div className="flex-1" />
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={() => cycleTheme()}
                />
              }
            >
              <ThemeIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Theme</TooltipContent>
          </Tooltip>
        </div>
      </header>
      {children}
    </div>
  );
}
