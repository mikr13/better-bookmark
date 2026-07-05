import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { BookmarkForm } from "@/components/app/bookmark-form";
import { BookmarkListPanel } from "@/components/app/bookmark-list-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  createManualBookmark,
  deleteBookmark,
  exportBookmarks,
  importBookmarks,
  searchBookmarks,
  updateManualBookmark,
} from "@/lib/bookmarks/repository";
import type { ManualBookmarkInput } from "@/lib/bookmarks/repository";
import type { SavedBookmark } from "@/lib/domain";
import { REFRESH_HIGHLIGHTS_MESSAGE } from "@/lib/page/highlight-messages";

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Bookmark operation failed.";
}

export function SavedBookmarksList() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to save manually.");
  const bookmarks = useQuery({
    queryKey: ["bookmarks", query],
    queryFn: () => searchBookmarks(query),
  });
  const selectedBookmark = bookmarks.data?.find((bookmark) => bookmark.id === selectedId) ?? null;

  async function refreshBookmarkSurfaces(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    await browser.runtime.sendMessage({ type: REFRESH_HIGHLIGHTS_MESSAGE });
  }

  const saveManual = useMutation({
    mutationFn: async (input: ManualBookmarkInput) => {
      if (selectedBookmark) {
        return updateManualBookmark(selectedBookmark.id, input);
      }

      return createManualBookmark(input);
    },
    onSuccess: async () => {
      setSelectedId(null);
      setStatus(selectedBookmark ? "Bookmark updated." : "Bookmark saved.");
      await refreshBookmarkSurfaces();
    },
    onError: (error) => setStatus(messageFromError(error)),
  });
  const deleteSingle = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: async (_deletedPageId, pageId) => {
      setStatus("Bookmark deleted.");
      if (selectedId === pageId) {
        setSelectedId(null);
      }
      await refreshBookmarkSurfaces();
    },
    onError: (error) => setStatus(messageFromError(error)),
  });
  const importFile = useMutation({
    mutationFn: async (file: File) => {
      await importBookmarks(await file.text());
    },
    onSuccess: async () => {
      setStatus("Bookmarks imported.");
      setSelectedId(null);
      await refreshBookmarkSurfaces();
    },
    onError: (error) => setStatus(messageFromError(error)),
  });

  useEffect(() => {
    if (!selectedId || !bookmarks.data) {
      return;
    }

    if (!bookmarks.data.some((bookmark) => bookmark.id === selectedId)) {
      setSelectedId(null);
    }
  }, [bookmarks.data, selectedId]);

  async function downloadExport(): Promise<void> {
    try {
      const payload = await exportBookmarks();
      const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `better-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Export downloaded.");
    } catch (error) {
      setStatus(messageFromError(error));
    }
  }

  function handleImport(file: File | null): void {
    if (!file) {
      return;
    }

    importFile.mutate(file);
  }

  function handleCancelEdit(): void {
    setSelectedId(null);
    setStatus("Ready to save manually.");
  }

  async function submitManualBookmark(input: ManualBookmarkInput): Promise<void> {
    await saveManual.mutateAsync(input);
  }

  function handleDeleteBookmark(bookmark: SavedBookmark): void {
    deleteSingle.mutate(bookmark.id);
  }

  return (
    <TooltipProvider>
      <section className="h-[calc(100dvh-8rem)] min-h-[680px] min-w-0 overflow-x-hidden">
        <ResizablePanelGroup
          orientation={isMobile ? "vertical" : "horizontal"}
          className="h-full max-w-full min-w-0 overflow-hidden"
        >
          <ResizablePanel defaultSize={50} minSize={30} className="min-w-0">
            <div className="h-full min-w-0 overflow-auto p-4">
              <BookmarkListPanel
                bookmarks={bookmarks.data ?? []}
                isImporting={importFile.isPending}
                onDelete={handleDeleteBookmark}
                onEdit={(nextBookmark) => setSelectedId(nextBookmark.id)}
                onExport={() => void downloadExport()}
                onImport={handleImport}
                onQueryChange={setQuery}
                query={query}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30} className="min-w-0">
            <div className="h-full min-w-0 overflow-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedBookmark ? "Edit Bookmark" : "Add Bookmark"}</CardTitle>
                  <CardDescription>
                    {selectedBookmark
                      ? "Update an existing saved bookmark."
                      : "Create a new bookmark with a URL and manual tags."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookmarkForm
                    bookmark={selectedBookmark}
                    isSaving={saveManual.isPending}
                    status={status}
                    onSubmit={submitManualBookmark}
                    {...(selectedBookmark ? { onCancel: handleCancelEdit } : {})}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    </TooltipProvider>
  );
}
