import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedBookmark } from "@/lib/domain";

export function BookmarkActionsMenu({
  bookmark,
  onDelete,
  onEdit,
}: {
  readonly bookmark: SavedBookmark;
  readonly onDelete: (bookmark: SavedBookmark) => void;
  readonly onEdit: (bookmark: SavedBookmark) => void;
}) {
  function openBookmark(): void {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${bookmark.title}`}
          >
            <MoreVertical />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={openBookmark}>
          <ExternalLink />
          Open URL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(bookmark)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(bookmark)}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
