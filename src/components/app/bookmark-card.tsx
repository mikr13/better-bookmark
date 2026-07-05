import { useEffect, useState } from "react";

import { BookmarkActionsMenu } from "@/components/app/bookmark-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { formatBookmarkDate } from "@/lib/bookmarks/display-date";
import { cn } from "@/lib/cn";
import type { SavedBookmark } from "@/lib/domain";

function isShortcutTarget(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return false;
  }

  return !(target instanceof HTMLElement && target.isContentEditable);
}

export function BookmarkCard({
  bookmark,
  mode = "detailed",
  onDelete,
  onEdit,
}: {
  readonly bookmark: SavedBookmark;
  readonly mode?: "compact" | "detailed";
  readonly onDelete: (bookmark: SavedBookmark) => void;
  readonly onEdit: (bookmark: SavedBookmark) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const dateLabel = formatBookmarkDate(bookmark.savedAt) ?? "Saved";
  const visibleTags = bookmark.tags.slice(0, mode === "compact" ? 3 : 5);
  const visibleConcepts = bookmark.concepts
    .filter(
      (concept) =>
        !bookmark.tags.some((tag) => tag.toLocaleLowerCase() === concept.term.toLocaleLowerCase()),
    )
    .slice(0, mode === "compact" ? 2 : 3);

  useEffect(() => {
    if (!isHovered) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (!isShortcutTarget(event.target)) {
        return;
      }

      if (event.key.toLocaleLowerCase() === "e") {
        event.preventDefault();
        onEdit(bookmark);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onDelete(bookmark);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookmark, isHovered, onDelete, onEdit]);

  return (
    <Card
      className={cn(
        "p-4 hover:shadow-md transition-shadow",
        mode === "compact" ? "gap-3" : "gap-4",
        isHovered && "ring-2 ring-primary/50",
      )}
      aria-label={`${bookmark.title} bookmark`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-medium">{bookmark.title}</h3>
          <p className="text-muted-foreground truncate text-xs">{bookmark.domain}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-muted-foreground text-xs whitespace-nowrap">{dateLabel}</span>
          <BookmarkActionsMenu bookmark={bookmark} onDelete={onDelete} onEdit={onEdit} />
        </div>
      </div>
      <p
        className={cn(
          "text-muted-foreground text-sm",
          mode === "compact" ? "line-clamp-2" : "line-clamp-3",
        )}
      >
        {bookmark.summary}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {visibleConcepts.map((concept) => (
          <Badge key={concept.id} variant="outline">
            {concept.term} {concept.score}
          </Badge>
        ))}
      </div>
      <div
        className={cn(
          "flex min-h-7 items-center justify-between gap-3 border-t pt-3",
          mode === "compact" && "pt-2",
        )}
      >
        <span className="text-muted-foreground truncate text-xs">{bookmark.url}</span>
        {isHovered ? (
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
            <Kbd>e</Kbd>
            <span>edit</span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
