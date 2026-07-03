import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Search, Settings } from "lucide-react";
import { useState } from "react";
import { browser } from "wxt/browser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getProviderConfig,
  isProviderConfigured,
  providerNeedsApiKey,
  selectedModelForProvider,
} from "@/lib/ai/providers";
import { appSettingsItem } from "@/lib/app-storage";
import { searchBookmarks, saveAnalyzedBookmark } from "@/lib/bookmarks/repository";
import { type ExtractedPage, ExtractedPageSchema } from "@/lib/domain";
import { REFRESH_HIGHLIGHTS_MESSAGE } from "@/lib/page/highlight-messages";
import { resizeScreenshot } from "@/lib/page/image";
import { nonWebPageSaveMessage, pageSaveFailureMessage, saveablePageUrl } from "@/lib/page/tab";
import { getProviderApiKey } from "@/lib/security/key-vault";

type ActiveTab = {
  readonly id: number;
  readonly url: string;
  readonly windowId?: number;
};

async function activeTab(): Promise<ActiveTab> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || tab.id === undefined) {
    throw new Error("No active tab is available.");
  }

  const url = saveablePageUrl(tab.url);

  if (!url) {
    throw new Error(nonWebPageSaveMessage());
  }

  if (tab.windowId === undefined) {
    return { id: tab.id, url };
  }

  return { id: tab.id, url, windowId: tab.windowId };
}

async function extractActivePage(tabId: number): Promise<ExtractedPage> {
  const response = await browser.tabs.sendMessage(tabId, {
    type: "BETTER_BOOKMARKS_EXTRACT_PAGE",
  });
  return ExtractedPageSchema.parse(response);
}

async function captureScreenshot(windowId?: number): Promise<string> {
  const screenshot =
    windowId === undefined
      ? await browser.tabs.captureVisibleTab({ format: "jpeg", quality: 72 })
      : await browser.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 72 });
  return resizeScreenshot(screenshot, 1400);
}

export function SidepanelPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("Ready");
  const bookmarks = useQuery({
    queryKey: ["bookmarks", query],
    queryFn: () => searchBookmarks(query),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => appSettingsItem.getValue(),
  });
  const savePage = useMutation({
    mutationFn: async () => {
      setStatus("Capturing page");
      const tab = await activeTab();
      const page = await extractActivePage(tab.id);
      const screenshotDataUrl = await captureScreenshot(tab.windowId);
      const currentSettings = await appSettingsItem.getValue();
      const provider = currentSettings.selectedAIProvider;
      const providerConfig = getProviderConfig(provider);
      const apiKey = await getProviderApiKey(provider);

      if (!isProviderConfigured(currentSettings)) {
        throw new Error(`Configure ${providerConfig.name} in settings before saving.`);
      }

      if (providerNeedsApiKey(provider) && !apiKey) {
        throw new Error(`Add your ${providerConfig.name} API key in settings first.`);
      }

      setStatus(`Analyzing with ${providerConfig.name}`);
      const model = selectedModelForProvider(currentSettings, provider);
      const { analyzePageWithProvider } = await import("@/lib/ai/page-analysis");
      const analysisInput = apiKey
        ? { provider, apiKey, model, page, screenshotDataUrl }
        : { provider, model, page, screenshotDataUrl };
      const analysis = await analyzePageWithProvider(analysisInput);
      setStatus("Saving graph");
      return saveAnalyzedBookmark({
        page,
        analysis,
        providerCall: {
          id: crypto.randomUUID(),
          provider,
          model,
          createdAt: new Date().toISOString(),
          payloadBytes: new Blob([JSON.stringify(page), screenshotDataUrl]).size,
        },
      });
    },
    onSuccess: async () => {
      setStatus("Saved");
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      await browser.runtime.sendMessage({ type: REFRESH_HIGHLIGHTS_MESSAGE });
    },
    onError: (error) => {
      setStatus(pageSaveFailureMessage(error));
    },
  });
  const readyToSave = settings.data ? isProviderConfigured(settings.data) : false;

  return (
    <main className="bg-background text-foreground min-h-[100dvh] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Better Bookmarks</h1>
          <p className="text-muted-foreground text-xs">{status}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open settings"
          onClick={() => browser.runtime.openOptionsPage()}
        >
          <Settings />
        </Button>
      </div>
      <section className="grid gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Page</CardTitle>
            <CardDescription>Save with screenshot plus sanitized page text.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="w-full"
              disabled={savePage.isPending || !readyToSave}
              onClick={() => savePage.mutate()}
            >
              {savePage.isPending ? <Loader2 className="size-4 animate-spin" /> : <BookOpen />}
              Save page
            </Button>
            {!readyToSave ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Configure an AI provider in settings before saving.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            placeholder="Search saved concepts"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div className="grid gap-2">
          {(bookmarks.data ?? []).map((bookmark) => (
            <article key={bookmark.id} className="bg-card rounded-xl border p-3">
              <h2 className="line-clamp-1 text-sm font-medium">{bookmark.title}</h2>
              <p className="text-muted-foreground line-clamp-2 text-xs">{bookmark.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {bookmark.concepts.slice(0, 4).map((concept) => (
                  <Badge key={concept.id} variant="secondary">
                    {concept.term}
                  </Badge>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
