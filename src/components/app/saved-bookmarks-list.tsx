import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Search, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBookmarkDate } from "@/lib/bookmarks/display-date";
import {
  deleteAllBookmarks,
  exportBookmarks,
  importBookmarks,
  searchBookmarks,
} from "@/lib/bookmarks/repository";

export function SavedBookmarksList() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const bookmarks = useQuery({
    queryKey: ["bookmarks", query],
    queryFn: () => searchBookmarks(query),
  });
  const deleteAll = useMutation({
    mutationFn: deleteAllBookmarks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  async function downloadExport(): Promise<void> {
    const payload = await exportBookmarks();
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `better-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    await importBookmarks(await file.text());
    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Bookmarks</CardTitle>
        <CardDescription>Local graph records. Exports exclude API keys.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            placeholder="Search title, summary, domain, or concept"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div className="space-y-3">
          {(bookmarks.data ?? []).map((bookmark) => (
            <article key={bookmark.id} className="bg-background rounded-xl border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{bookmark.title}</h3>
                  <p className="text-muted-foreground truncate text-sm">{bookmark.domain}</p>
                </div>
                <span className="text-muted-foreground justify-self-end text-xs whitespace-nowrap">
                  {formatBookmarkDate(bookmark.savedAt) ?? "Saved"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{bookmark.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {bookmark.concepts.slice(0, 6).map((concept) => (
                  <Badge key={concept.id} variant="secondary">
                    {concept.term} {concept.score}
                  </Badge>
                ))}
              </div>
            </article>
          ))}
          {(bookmarks.data ?? []).length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              No saved bookmarks yet.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-muted-foreground text-sm">
            Showing {(bookmarks.data ?? []).length} entries
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={downloadExport}>
              <Download />
              <span className="sr-only">Export bookmarks</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp />
              <span className="sr-only">Import bookmarks</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              disabled={deleteAll.isPending}
              onClick={() => deleteAll.mutate()}
            >
              <Trash2 />
              <span className="sr-only">Delete local bookmarks</span>
            </Button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(event) => handleImport(event.currentTarget.files?.item(0) ?? null)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
