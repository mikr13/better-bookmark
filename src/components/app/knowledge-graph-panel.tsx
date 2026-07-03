import { useQuery } from "@tanstack/react-query";
import { MousePointerClick, Network } from "lucide-react";
import { useMemo, useState } from "react";

import { KnowledgeGraphCanvas } from "@/components/app/knowledge-graph-canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBookmarkDate } from "@/lib/bookmarks/display-date";
import { buildKnowledgeGraph } from "@/lib/bookmarks/knowledge-graph";
import type { KnowledgeGraphNode } from "@/lib/bookmarks/knowledge-graph";
import { listBookmarks } from "@/lib/bookmarks/repository";

function selectedNodeDetails(node: KnowledgeGraphNode | null) {
  if (!node) {
    return (
      <div className="text-muted-foreground grid min-h-40 place-items-center text-center text-sm">
        Select a node to inspect its local relationships.
      </div>
    );
  }

  if (node.kind === "page") {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-muted-foreground text-xs">{node.domain}</p>
          <h3 className="text-base font-semibold">{node.label}</h3>
        </div>
        <p className="text-muted-foreground text-sm">{node.summary}</p>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Concepts</dt>
            <dd className="font-medium">{node.conceptCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Saved</dt>
            <dd className="font-medium">{formatBookmarkDate(node.savedAt) ?? "Saved"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-muted-foreground text-xs">{node.conceptKind}</p>
        <h3 className="text-base font-semibold">{node.label}</h3>
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Saved sources</dt>
          <dd className="font-medium">{node.pageCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Graph strength</dt>
          <dd className="font-medium">{node.strength}</dd>
        </div>
      </dl>
    </div>
  );
}

export function KnowledgeGraphPanel() {
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const bookmarks = useQuery({
    queryKey: ["bookmarks", "knowledge-graph"],
    queryFn: listBookmarks,
  });
  const graph = useMemo(() => buildKnowledgeGraph(bookmarks.data ?? []), [bookmarks.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Graph</CardTitle>
        <CardDescription>Saved pages linked by local concept edges.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookmarks.isLoading ? (
          <Skeleton className="h-[500px] rounded-xl" />
        ) : graph.nodes.length === 0 ? (
          <Empty className="min-h-[360px] border">
            <EmptyMedia variant="icon">
              <Network />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No graph yet</EmptyTitle>
              <EmptyDescription>
                Save a page to create local page and concept nodes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <KnowledgeGraphCanvas
              graph={graph}
              selectedNode={selectedNode}
              onSelectedNodeChange={setSelectedNode}
            />
            <aside className="space-y-4 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold">{graph.stats.pageCount}</p>
                  <p className="text-muted-foreground text-xs">pages</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{graph.stats.conceptCount}</p>
                  <p className="text-muted-foreground text-xs">concepts</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{graph.stats.linkCount}</p>
                  <p className="text-muted-foreground text-xs">links</p>
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 border-y py-3 text-sm">
                <MousePointerClick className="size-4" />
                Drag nodes, scroll to zoom, click to inspect.
              </div>
              {selectedNodeDetails(selectedNode)}
            </aside>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
