import type { Card, StorageData } from './types';

// Storage utility functions
export const storage = {
  async getAll(): Promise<StorageData> {
    const result = await chrome.storage.local.get(['cards', 'keywords', 'connections']);
    return {
      cards: result.cards || {},
      keywords: result.keywords || {},
      connections: result.connections || [],
    };
  },

  async saveCard(card: Card): Promise<void> {
    const data = await this.getAll();
    data.cards[card.id] = card;

    // Update keyword index
    card.keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      if (!data.keywords[normalizedKeyword]) {
        data.keywords[normalizedKeyword] = [];
      }
      if (!data.keywords[normalizedKeyword].includes(card.id)) {
        data.keywords[normalizedKeyword].push(card.id);
      }
    });

    await chrome.storage.local.set({
      cards: data.cards,
      keywords: data.keywords,
    });
  },

  async deleteCard(cardId: string): Promise<void> {
    const data = await this.getAll();
    const card = data.cards[cardId];
    
    if (card) {
      // Remove from keyword index
      card.keywords.forEach(keyword => {
        const normalizedKeyword = keyword.toLowerCase();
        if (data.keywords[normalizedKeyword]) {
          data.keywords[normalizedKeyword] = data.keywords[normalizedKeyword].filter(
            id => id !== cardId
          );
          if (data.keywords[normalizedKeyword].length === 0) {
            delete data.keywords[normalizedKeyword];
          }
        }
      });

      delete data.cards[cardId];
    }

    await chrome.storage.local.set({
      cards: data.cards,
      keywords: data.keywords,
    });
  },

  async getCardsByKeyword(keyword: string): Promise<Card[]> {
    const data = await this.getAll();
    const normalizedKeyword = keyword.toLowerCase();
    const cardIds = data.keywords[normalizedKeyword] || [];
    return cardIds.map(id => data.cards[id]).filter(Boolean);
  },

  async saveConnections(connections: any[]): Promise<void> {
    await chrome.storage.local.set({ connections });
  },
};
