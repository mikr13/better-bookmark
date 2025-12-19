import React, { useEffect, useState } from 'react';
import { storage } from '../../utils/storage';
import type { Card, StorageData } from '../../utils/types';

type TabType = 'cards' | 'graph' | 'stats';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('cards');
  const [data, setData] = useState<StorageData>({ cards: {}, keywords: {}, connections: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadData();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  async function loadData() {
    const storageData = await storage.getAll();
    setData(storageData);
  }

  async function handleSaveCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'SAVE_CURRENT_PAGE' });
    }
  }

  async function handleDeleteCard(cardId: string) {
    await storage.deleteCard(cardId);
    await loadData();
  }

  function handleCardClick(card: Card) {
    chrome.tabs.create({ url: card.url });
  }

  const cards = Object.values(data.cards);
  
  // Filter cards
  const filteredCards = cards.filter(card => {
    const matchesSearch = searchQuery === '' || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || card.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => b.timestamp - a.timestamp);

  // Get unique categories
  const categories = Array.from(new Set(cards.map(c => c.category)));

  // Calculate stats
  const stats = {
    totalCards: cards.length,
    totalKeywords: Object.keys(data.keywords).length,
    totalConnections: calculateConnections(cards, data.keywords),
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🧠 Recall It</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleSaveCurrentPage}>
            Save Page
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Cards ({cards.length})
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={`tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Knowledge Graph
        </button>
      </div>

      <div className="content">
        {activeTab === 'cards' && (
          <>
            <input
              type="text"
              className="search-box"
              placeholder="Search cards by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {categories.length > 0 && (
              <div className="filter-chips">
                <div
                  className={`filter-chip ${selectedCategory === null ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </div>
                {categories.map(category => (
                  <div
                    key={category}
                    className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </div>
                ))}
              </div>
            )}

            {filteredCards.length === 0 ? (
              <div className="empty-state">
                <h3>No cards yet</h3>
                <p>
                  Click "Save Page" to start building your knowledge base.
                  <br />
                  Saved keywords will be highlighted on other pages you visit!
                </p>
              </div>
            ) : (
              <div className="cards-list">
                {filteredCards.map(card => (
                  <div key={card.id} className="card">
                    <div className="card-header">
                      <div className="card-title" onClick={() => handleCardClick(card)}>
                        {card.title}
                      </div>
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="card-meta">
                      <span className="card-category">{card.category}</span>
                      <span className="card-date">
                        {new Date(card.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {card.excerpt && (
                      <div className="card-excerpt">{card.excerpt}</div>
                    )}
                    <div className="card-keywords">
                      {card.keywords.slice(0, 8).map((keyword, idx) => (
                        <span key={idx} className="keyword">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <div className="card-url">{card.url}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="stats">
              <div className="stat-card">
                <div className="stat-value">{stats.totalCards}</div>
                <div className="stat-label">Cards Saved</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalKeywords}</div>
                <div className="stat-label">Keywords Tracked</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalConnections}</div>
                <div className="stat-label">Connections</div>
              </div>
            </div>

            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Categories</h3>
            <div className="cards-list">
              {categories.map(category => {
                const categoryCards = cards.filter(c => c.category === category);
                return (
                  <div key={category} className="card">
                    <div className="card-title">{category}</div>
                    <div className="card-excerpt">
                      {categoryCards.length} card{categoryCards.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'graph' && (
          <div className="graph-container">
            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Knowledge Graph</h3>
            <div className="graph-placeholder">
              <div style={{ textAlign: 'center' }}>
                <p>Knowledge graph visualization</p>
                <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                  {stats.totalConnections} connections between {stats.totalCards} cards
                </p>
                <div style={{ marginTop: '20px', fontSize: '12px' }}>
                  {Object.entries(data.keywords).slice(0, 10).map(([keyword, cardIds]) => (
                    <div key={keyword} style={{ marginBottom: '8px' }}>
                      <strong>{keyword}</strong>: {cardIds.length} card{cardIds.length !== 1 ? 's' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateConnections(cards: Card[], keywords: { [key: string]: string[] }): number {
  let connections = 0;
  Object.values(keywords).forEach(cardIds => {
    if (cardIds.length > 1) {
      // Each keyword connects n cards with n*(n-1)/2 connections
      connections += (cardIds.length * (cardIds.length - 1)) / 2;
    }
  });
  return Math.floor(connections);
}

export default App;
