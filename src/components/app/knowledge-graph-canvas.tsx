import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-2d";

import {
  createGraphRenderData,
  type GraphRenderLink,
  type GraphRenderNode,
} from "@/components/app/knowledge-graph-render-data";
import { useTheme } from "@/components/app/theme-provider";
import { Button } from "@/components/ui/button";
import type { KnowledgeGraph, KnowledgeGraphNode } from "@/lib/bookmarks/knowledge-graph";

type GraphSize = {
  readonly width: number;
  readonly height: number;
};

type GraphPalette = {
  readonly background: string;
  readonly concept: string;
  readonly link: string;
  readonly page: string;
  readonly selected: string;
  readonly selectedText: string;
  readonly surface: string;
  readonly text: string;
};

type ForceNode = NodeObject<GraphRenderNode>;
type ForceLink = LinkObject<GraphRenderNode, GraphRenderLink>;
type LinkEndpoint = string | number | ForceNode | undefined;
type GraphRef = ForceGraphMethods<GraphRenderNode, GraphRenderLink>;

type KnowledgeGraphCanvasProps = {
  readonly graph: KnowledgeGraph;
  readonly selectedNode: KnowledgeGraphNode | null;
  readonly onSelectedNodeChange: (node: KnowledgeGraphNode | null) => void;
};

const GRAPH_HEIGHT = 500;
const GRAPH_WIDTH = 860;

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readGraphPalette(): GraphPalette {
  return {
    background: readToken("--background", "Canvas"),
    concept: readToken("--accent", "CanvasText"),
    link: readToken("--border", "GrayText"),
    page: readToken("--primary", "CanvasText"),
    selected: readToken("--primary", "Highlight"),
    selectedText: readToken("--primary-foreground", "HighlightText"),
    surface: readToken("--card", "Canvas"),
    text: readToken("--foreground", "CanvasText"),
  };
}

function useGraphSize(): {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly size: GraphSize;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<GraphSize>({ width: GRAPH_WIDTH, height: GRAPH_HEIGHT });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = (): void => {
      setSize({
        width: Math.max(320, Math.round(element.clientWidth)),
        height: Math.max(360, Math.round(element.clientHeight)),
      });
    };
    const observer = new ResizeObserver(updateSize);
    updateSize();
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, size };
}

function endpointId(endpoint: LinkEndpoint): string | null {
  if (typeof endpoint === "string" || typeof endpoint === "number") {
    return String(endpoint);
  }

  return endpoint?.id === undefined ? null : String(endpoint.id);
}

function linkTouchesNode(link: ForceLink, nodeId: string | null): boolean {
  return (
    nodeId !== null && (endpointId(link.source) === nodeId || endpointId(link.target) === nodeId)
  );
}

export function KnowledgeGraphCanvas({
  graph,
  onSelectedNodeChange,
  selectedNode,
}: KnowledgeGraphCanvasProps) {
  const { theme } = useTheme();
  const graphRef = useRef<GraphRef | undefined>(undefined);
  const { containerRef, size } = useGraphSize();
  const [palette, setPalette] = useState<GraphPalette>(() => readGraphPalette());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const graphData = useMemo(() => createGraphRenderData(graph), [graph]);
  const activeNodeId = selectedNode?.id ?? hoveredNodeId;

  useEffect(() => {
    if (theme === "system" || theme === "light" || theme === "dark") {
      window.requestAnimationFrame(() => setPalette(readGraphPalette()));
    }
  }, [theme]);
  useEffect(() => {
    if (graphData.nodes.length === 0 || size.width === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => graphRef.current?.zoomToFit(180, 88), 220);
    return () => window.clearTimeout(timeoutId);
  }, [graphData.nodes.length, size.width]);

  const paintNode = useCallback(
    (node: ForceNode, canvas: CanvasRenderingContext2D, globalScale: number): void => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isActive = node.id === activeNodeId;
      const fontSize = Math.max(9, 12 / globalScale);
      const label = node.label;
      const paddingX = 8 / globalScale;
      const paddingY = 5 / globalScale;
      const textWidth = Math.min(168 / globalScale, canvas.measureText(label).width);
      const width = textWidth + paddingX * 2;
      const height = fontSize + paddingY * 2;
      const radius = Math.min(height / 2, 10 / globalScale);

      node.labelWidth = width;
      node.labelHeight = height;
      canvas.font = `${fontSize}px "Geist Variable", ui-sans-serif`;
      canvas.textAlign = "center";
      canvas.textBaseline = "middle";
      canvas.beginPath();
      canvas.roundRect(x - width / 2, y - height / 2, width, height, radius);
      canvas.fillStyle = isActive ? palette.selected : palette.surface;
      canvas.fill();
      canvas.lineWidth = isActive ? 2 / globalScale : 1 / globalScale;
      canvas.strokeStyle = node.kind === "page" ? palette.page : palette.concept;
      canvas.stroke();
      canvas.fillStyle = isActive ? palette.selectedText : palette.text;
      canvas.fillText(label, x, y, textWidth);
    },
    [activeNodeId, palette],
  );
  const paintPointerArea = useCallback(
    (node: ForceNode, color: string, canvas: CanvasRenderingContext2D): void => {
      const width = node.labelWidth ?? 24;
      const height = node.labelHeight ?? 24;
      canvas.fillStyle = color;
      canvas.fillRect((node.x ?? 0) - width / 2, (node.y ?? 0) - height / 2, width, height);
    },
    [],
  );
  const selectNode = useCallback(
    (node: ForceNode): void => {
      const id = node.id === undefined ? null : String(node.id);
      onSelectedNodeChange(graph.nodes.find((graphNode) => graphNode.id === id) ?? null);
      if (node.x !== undefined && node.y !== undefined) {
        const currentGraph = graphRef.current;
        if (currentGraph) {
          currentGraph.centerAt(node.x, node.y, 180);
          currentGraph.zoom(Math.max(currentGraph.zoom(), 1.25), 180);
        }
      }
    },
    [graph.nodes, onSelectedNodeChange],
  );
  const updateZoom = useCallback((ratio: number): void => {
    const currentGraph = graphRef.current;
    if (!currentGraph) {
      return;
    }
    currentGraph.centerAt(0, 0, 160);
    currentGraph.zoom(Math.max(0.35, Math.min(4, currentGraph.zoom() * ratio)), 160);
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-background relative h-[500px] min-h-[360px] overflow-hidden rounded-xl border"
    >
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button type="button" variant="outline" size="icon-sm" onClick={() => updateZoom(1.2)}>
          <ZoomIn />
          <span className="sr-only">Zoom in</span>
        </Button>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => updateZoom(0.84)}>
          <ZoomOut />
          <span className="sr-only">Zoom out</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => graphRef.current?.zoomToFit(180, 36)}
        >
          <Maximize2 />
          <span className="sr-only">Fit graph</span>
        </Button>
      </div>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={size.width}
        height={size.height}
        backgroundColor={palette.background}
        nodeId="id"
        nodeVal="weight"
        nodeLabel="label"
        linkWidth={(link) => (linkTouchesNode(link, activeNodeId) ? 2.4 : 1.2)}
        linkColor={(link) =>
          linkTouchesNode(link, activeNodeId) ? palette.selected : palette.link
        }
        linkDirectionalParticles={(link) => (linkTouchesNode(link, activeNodeId) ? 2 : 0)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => palette.selected}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointerArea}
        onNodeClick={selectNode}
        onNodeHover={(node) => setHoveredNodeId(node?.id === undefined ? null : String(node.id))}
        onBackgroundClick={() => onSelectedNodeChange(null)}
        cooldownTicks={90}
        d3VelocityDecay={0.34}
        minZoom={0.35}
        maxZoom={4}
        enableNodeDrag
      />
    </div>
  );
}
