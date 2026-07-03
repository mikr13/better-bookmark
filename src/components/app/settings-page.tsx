import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, MousePointer2, MousePointerClick, X } from "lucide-react";
import { useState } from "react";
import { browser } from "wxt/browser";

import { AppShell } from "@/components/app/app-shell";
import type { ShellTab } from "@/components/app/app-shell";
import { KnowledgeGraphPanel } from "@/components/app/knowledge-graph-panel";
import { ProviderSettings } from "@/components/app/provider-settings";
import { SavedBookmarksList } from "@/components/app/saved-bookmarks-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  appSettingsItem,
  removeHighlightSiteRule,
  setHighlightTrigger,
  setSettings,
} from "@/lib/app-storage";
import type { HighlightTrigger } from "@/lib/domain";
import { defaultSettings, HighlightTriggerSchema } from "@/lib/domain";
import { activeHighlightSiteRules } from "@/lib/page/highlight-settings";

function triggerFromToggleValue(values: readonly string[]): HighlightTrigger | null {
  const value = values[0];
  if (!value) {
    return null;
  }

  const parsed = HighlightTriggerSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function SettingsPage() {
  const [tab, setTab] = useState<ShellTab>("settings");
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => appSettingsItem.getValue(),
  });
  const refreshSettings = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };
  const setHighlightAccess = async (checked: boolean): Promise<void> => {
    const origins = ["http://*/*", "https://*/*"];
    const granted = checked
      ? await browser.permissions.request({ origins })
      : !(await browser.permissions.remove({ origins }));

    await setSettings({ highlightHostAccessGranted: checked ? granted : false });
    await refreshSettings();
  };
  const updateHighlightTrigger = async (trigger: HighlightTrigger): Promise<void> => {
    await setHighlightTrigger(trigger);
    await refreshSettings();
  };
  const showHighlightsForSite = async (host: string): Promise<void> => {
    await removeHighlightSiteRule(host);
    await refreshSettings();
  };
  const highlightTrigger = settings.data?.highlightTrigger ?? defaultSettings.highlightTrigger;
  const hiddenSiteRules = activeHighlightSiteRules(settings.data?.highlightSiteRules ?? []);

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
        {tab === "settings" ? (
          <>
            <ProviderSettings />
            <Card>
              <CardHeader>
                <CardTitle>Highlighting</CardTitle>
                <CardDescription>
                  Ambient seen-before underlines run after site access is granted.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Host access status</p>
                    <p className="text-muted-foreground text-sm">
                      {settings.data?.highlightHostAccessGranted
                        ? "Ready for pages where permission is available."
                        : "Turn this on when you are ready to browse with highlights."}
                    </p>
                  </div>
                  <Switch
                    checked={settings.data?.highlightHostAccessGranted ?? false}
                    onCheckedChange={(checked) => void setHighlightAccess(checked === true)}
                  />
                </div>
                <div className="grid gap-3 border-t pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <p className="font-medium">Open highlight cards</p>
                    <p className="text-muted-foreground text-sm">
                      Choose whether saved-source cards appear on hover or on click.
                    </p>
                  </div>
                  <ToggleGroup
                    aria-label="Highlight trigger"
                    multiple={false}
                    value={[highlightTrigger]}
                    onValueChange={(values) => {
                      const trigger = triggerFromToggleValue(values);
                      if (trigger) {
                        void updateHighlightTrigger(trigger);
                      }
                    }}
                  >
                    <ToggleGroupItem value="hover" aria-label="Open on hover">
                      <MousePointer2 data-icon="inline-start" />
                      On hover
                    </ToggleGroupItem>
                    <ToggleGroupItem value="click" aria-label="Open on click">
                      <MousePointerClick data-icon="inline-start" />
                      On click
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="grid gap-3 border-t pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Sites where highlights are hidden</p>
                      <p className="text-muted-foreground text-sm">
                        Remove a site to allow seen-before highlights there again.
                      </p>
                    </div>
                    <EyeOff className="text-muted-foreground mt-0.5 size-4" />
                  </div>
                  {hiddenSiteRules.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {hiddenSiteRules.map((rule) => (
                        <Badge
                          key={rule.host}
                          className="bg-primary/35 text-foreground hover:bg-primary/40 h-7 gap-2 rounded-full px-3 text-sm"
                        >
                          <span>{rule.host}</span>
                          {rule.scope === "today" ? (
                            <span className="text-muted-foreground text-xs font-medium">today</span>
                          ) : null}
                          <button
                            type="button"
                            className="hover:bg-foreground/10 focus-visible:ring-ring -mr-1 inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2"
                            aria-label={`Show highlights on ${rule.host} again`}
                            onClick={() => void showHighlightsForSite(rule.host)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No hidden sites.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
        {tab === "saved" ? <SavedBookmarksList /> : null}
        {tab === "graph" ? <KnowledgeGraphPanel /> : null}
      </main>
    </AppShell>
  );
}
