import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { browser } from "wxt/browser";

import { AppShell } from "@/components/app/app-shell";
import { ProviderSettings } from "@/components/app/provider-settings";
import { SavedBookmarksList } from "@/components/app/saved-bookmarks-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { appSettingsItem, setSettings } from "@/lib/app-storage";

export function SettingsPage() {
  const [tab, setTab] = useState<"settings" | "saved">("settings");
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => appSettingsItem.getValue(),
  });
  const setHighlightAccess = async (checked: boolean): Promise<void> => {
    const origins = ["http://*/*", "https://*/*"];
    const granted = checked
      ? await browser.permissions.request({ origins })
      : !(await browser.permissions.remove({ origins }));

    await setSettings({ highlightHostAccessGranted: checked ? granted : false });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

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
              <CardContent className="flex items-center justify-between gap-4">
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
              </CardContent>
            </Card>
          </>
        ) : (
          <SavedBookmarksList />
        )}
      </main>
    </AppShell>
  );
}
