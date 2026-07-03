import type {
  KnowledgeGraph,
  KnowledgeGraphLink,
  KnowledgeGraphNode,
} from "@/lib/bookmarks/knowledge-graph";

export type GraphRenderNode = KnowledgeGraphNode & {
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  labelWidth?: number;
  labelHeight?: number;
};

export type GraphRenderLink = KnowledgeGraphLink;

export type GraphRenderData = {
  readonly nodes: GraphRenderNode[];
  readonly links: GraphRenderLink[];
};

type LayoutLane = {
  readonly index: number;
  readonly total: number;
  readonly x: number;
};

const LANE_SPACING = 150;
const NODE_SPACING = 76;

function positionNode(node: KnowledgeGraphNode, lane: LayoutLane): GraphRenderNode {
  const y = (lane.index - (lane.total - 1) / 2) * NODE_SPACING;
  return {
    ...node,
    x: lane.x,
    y,
    fx: lane.x,
    fy: y,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected graph node kind: ${JSON.stringify(value)}`);
}

export function createGraphRenderData(graph: KnowledgeGraph): GraphRenderData {
  const pageTotal = graph.nodes.filter((node) => node.kind === "page").length;
  const conceptTotal = graph.nodes.length - pageTotal;
  let pageIndex = 0;
  let conceptIndex = 0;
  const nodes = graph.nodes.map<GraphRenderNode>((node) => {
    switch (node.kind) {
      case "page": {
        const index = pageIndex;
        pageIndex += 1;
        return positionNode(node, { index, total: pageTotal, x: -LANE_SPACING });
      }
      case "concept": {
        const index = conceptIndex;
        conceptIndex += 1;
        return positionNode(node, { index, total: conceptTotal, x: LANE_SPACING });
      }
      default:
        return assertNever(node);
    }
  });

  return {
    nodes,
    links: graph.links.map<GraphRenderLink>((link) => ({ ...link })),
  };
}
