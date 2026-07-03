import { BookMarked, PanelRight, Settings } from "lucide-react";
import { browser } from "wxt/browser";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PopupPage() {
  async function openSidePanel(): Promise<void> {
    await browser.runtime.sendMessage({ type: "BETTER_BOOKMARKS_OPEN_SIDE_PANEL" });
    window.close();
  }

  return (
    <main className="bg-background text-foreground w-[360px] p-3">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              <BookMarked className="size-4" />
            </span>
            <div>
              <CardTitle>Better Bookmarks</CardTitle>
              <CardDescription>Local AI bookmark graph</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button type="button" onClick={openSidePanel}>
            <PanelRight />
            Open side panel
          </Button>
          <Button type="button" variant="outline" onClick={() => browser.runtime.openOptionsPage()}>
            <Settings />
            Settings
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
