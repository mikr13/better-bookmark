// Core data types for the Recall It extension

export interface Card {
  id: string;
  title: string;
  url: string;
  content: string;
  keywords: string[];
  tags: string[];
  category: string;
  timestamp: number;
  favicon?: string;
  excerpt?: string;
}

export interface KeywordMatch {
  keyword: string;
  cardIds: string[];
}

export interface Connection {
  sourceCardId: string;
  targetCardId: string;
  keywords: string[];
  strength: number;
}

export interface StorageData {
  cards: { [id: string]: Card };
  keywords: { [keyword: string]: string[] }; // keyword -> cardIds
  connections: Connection[];
}

export interface HighlightStyle {
  backgroundColor: string;
  textDecoration: string;
  borderBottom: string;
}
