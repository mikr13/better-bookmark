import { Download, FileUp, Grid2X2, List, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { BookmarkCard } from "@/components/app/bookmark-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SavedBookmark } from "@/lib/domain";

type SortMode = "newest" | "oldest" | "title";
type ViewMode = "grid" | "list";

function sortFromValue(value: unknown): SortMode | null {
  if (value === "newest" || value === "oldest" || value === "title") {
    return value;
  }

  return null;
}

function viewFromToggleValue(values: readonly string[]): ViewMode | null {
  const [value] = values;

  if (value === "grid" || value === "list") {
    return value;
  }

  return null;
}

function sortBookmarks(bookmarks: readonly SavedBookmark[], sortMode: SortMode): SavedBookmark[] {
  const sorted = [...bookmarks];

  if (sortMode === "title") {
    return sorted.sort((left, right) => left.title.localeCompare(right.title));
  }

  return sorted.sort((left, right) => {
    const leftTime = Date.parse(left.savedAt);
    const rightTime = Date.parse(right.savedAt);
    return sortMode === "newest" ? rightTime - leftTime : leftTime - rightTime;
  });
}

export function BookmarkListPanel({
  bookmarks,
  isImporting,
  onDelete,
  onEdit,
  onExport,
  onImport,
  onQueryChange,
  query,
}: {
  readonly bookmarks: readonly SavedBookmark[];
  readonly isImporting: boolean;
  readonly onDelete: (bookmark: SavedBookmark) => void;
  readonly onEdit: (bookmark: SavedBookmark) => void;
  readonly onExport: () => void;
  readonly onImport: (file: File | null) => void;
  readonly onQueryChange: (query: string) => void;
  readonly query: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const sortedBookmarks = useMemo(() => sortBookmarks(bookmarks, sortMode), [bookmarks, sortMode]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            placeholder="Search bookmarks"
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sortMode}
            onValueChange={(value) => {
              const nextSort = sortFromValue(value);
              if (nextSort) {
                setSortMode(nextSort);
              }
            }}
          >
            <SelectTrigger className="w-[132px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            aria-label="Bookmark list view"
            multiple={false}
            value={[viewMode]}
            onValueChange={(values) => {
              const nextViewMode = viewFromToggleValue(values);
              if (nextViewMode) {
                setViewMode(nextViewMode);
              }
            }}
            size="sm"
          >
            <ToggleGroupItem value="list" aria-label="List view">
              <List />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid2X2 />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div
          className={viewMode === "grid" ? "grid gap-3 md:grid-cols-2" : "flex flex-col gap-4 p-1"}
        >
          {sortedBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              mode={viewMode === "grid" ? "compact" : "detailed"}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {sortedBookmarks.length === 0 ? (
            <Empty className="min-h-44 border sm:min-h-72">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>{query ? "No matching bookmarks" : "No bookmarks yet"}</EmptyTitle>
                <EmptyDescription>
                  {query ? "Try another title, tag, domain, or concept." : "Use the form below."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-1">
        <span className="text-muted-foreground text-sm">
          Showing {sortedBookmarks.length} entries
        </span>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" onClick={onExport}>
                  <Download />
                  <span className="sr-only">Export bookmarks</span>
                </Button>
              }
            />
            <TooltipContent>Export bookmarks</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp />
                  <span className="sr-only">Import bookmarks</span>
                </Button>
              }
            />
            <TooltipContent>Import bookmarks</TooltipContent>
          </Tooltip>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="application/json"
            onChange={(event) => {
              onImport(event.currentTarget.files?.item(0) ?? null);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
