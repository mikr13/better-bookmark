# Recall It - Feature Showcase

This document showcases all the features of the Recall It browser extension with examples.

## 🎯 Overview

Recall It is a browser extension that helps you build a personal knowledge graph by:
1. Saving web pages as cards
2. Extracting and tracking keywords
3. Highlighting those keywords on other pages you visit
4. Showing connections between related content

## 📱 Main Features

### 1. Save Pages as Cards

**How it works:**
- Click the extension icon → "Save Page" button
- Right-click → "Save page to Recall It"

**What gets saved:**
```
Card {
  id: "card_1703001234567_abc123xyz"
  title: "Modern Software Development Best Practices"
  url: "https://example.com/article"
  keywords: ["programming", "code", "developer", "software", "javascript"]
  category: "Technology"
  timestamp: 1703001234567
  excerpt: "This article explores essential programming concepts..."
}
```

**Categories:**
- 🔧 Technology (code, programming, API, etc.)
- 🔬 Science (research, study, experiment, etc.)
- 💼 Business (market, company, startup, etc.)
- 📰 News (breaking, report, update, etc.)
- 📚 General (everything else)

### 2. Keyword Extraction

**Automatic keyword extraction:**
- Removes common words (the, and, is, etc.)
- Analyzes word frequency
- Extracts 10-15 most relevant keywords
- Filters by minimum word length (4+ characters)

**Example:**
```
Input: "Modern software development requires understanding 
        programming languages like JavaScript and Python..."

Output: ["software", "development", "programming", 
         "javascript", "python", "languages"]
```

### 3. Smart Highlighting

**Visual styling:**
- **Light mode:** Subtle yellow background (rgba(255, 235, 59, 0.25))
- **Dark mode:** Gold background (rgba(255, 215, 0, 0.15))
- **Border:** Thin bottom border
- **Interactive:** Clickable to show related cards

**Behavior:**
```
Saved Card 1: keywords = ["react", "javascript", "frontend"]
Saved Card 2: keywords = ["python", "backend", "api"]

When visiting new page mentioning "react" and "python":
→ Both words get highlighted
→ Click "react" shows Card 1
→ Click "python" shows Card 2
```

### 4. Popup Interface

**Three tabs:**

#### Cards Tab
- List of all saved cards
- Search by title or keyword
- Filter by category
- Click title to open original page
- Delete unwanted cards

```
┌─────────────────────────────────┐
│  🧠 Recall It      [Save Page]  │
├─────────────────────────────────┤
│ Cards(5) │ Stats │ Graph        │
├─────────────────────────────────┤
│ [Search: react_______________]  │
│ [All][Technology][Science]      │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ React Hooks Tutorial        │ │
│ │ Technology · 2 days ago     │ │
│ │ Learn how to use React...   │ │
│ │ [react][hooks][javascript]  │ │
│ │ https://example.com/...     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### Stats Tab
- Total cards count
- Total keywords tracked
- Number of connections
- Category breakdown

```
┌───────────────────────────────┐
│   Cards Saved                 │
│      15                       │
└───────────────────────────────┘
┌───────────────────────────────┐
│   Keywords Tracked            │
│      127                      │
└───────────────────────────────┘
┌───────────────────────────────┐
│   Connections                 │
│      45                       │
└───────────────────────────────┘
```

#### Graph Tab
- Connection overview
- Top keywords with card counts
- Knowledge graph visualization

```
Knowledge Graph
━━━━━━━━━━━━━━━━
45 connections between 15 cards

Top Keywords:
• javascript: 5 cards
• programming: 4 cards
• development: 4 cards
• react: 3 cards
```

### 5. Knowledge Graph

**How connections are calculated:**

```
Card A: ["react", "javascript", "frontend"]
Card B: ["javascript", "api", "backend"]
Card C: ["react", "hooks", "frontend"]

Connections:
- "javascript" connects Card A ↔ Card B
- "react" connects Card A ↔ Card C
- "frontend" connects Card A ↔ Card C

Total connections = 3
```

### 6. Context Menu Integration

**Right-click menu:**
```
┌─────────────────────────────┐
│ Copy                        │
│ Paste                       │
│ ──────────────────────────  │
│ Save page to Recall It ✓    │
└─────────────────────────────┘
```

## 🔍 Real-World Example

**Scenario:** You're researching React development

**Step 1:** Save a React tutorial
```
Saved: "React Hooks Complete Guide"
Keywords: ["react", "hooks", "useState", "useEffect", "javascript"]
Category: Technology
```

**Step 2:** Save an article about state management
```
Saved: "State Management in React"
Keywords: ["react", "state", "redux", "context", "hooks"]
Category: Technology
```

**Step 3:** Visit a blog post about web development
```
Blog mentions: "When building with React, state management is crucial..."

Result:
- "react" is highlighted (links to 2 cards)
- "state" is highlighted (links to 1 card)
- "hooks" is highlighted (links to 2 cards)
```

**Step 4:** Click highlighted "react"
```
┌─────────────────────────────────┐
│ Related cards for "react"       │
├─────────────────────────────────┤
│ React Hooks Complete Guide      │
│ https://example.com/react-hooks │
├─────────────────────────────────┤
│ State Management in React       │
│ https://example.com/state-mgmt  │
├─────────────────────────────────┤
│              [Close]            │
└─────────────────────────────────┘
```

## 💡 Use Cases

### For Developers
- Track programming tutorials and documentation
- Build connections between related tech concepts
- Quickly find previously saved resources

### For Researchers
- Organize research papers and articles
- Track related studies by keywords
- Build a personal knowledge base

### For Students
- Save study materials
- Connect related topics
- Quick reference to saved content

### For General Users
- Bookmark with superpowers
- Automatic organization
- Discover connections in your reading

## 🎨 Design Principles

1. **Non-intrusive:** Subtle highlighting that doesn't disrupt reading
2. **Fast:** Optimized for performance even with many cards
3. **Private:** All data stays in your browser
4. **Simple:** No configuration needed - works out of the box
5. **Smart:** Automatic categorization and keyword extraction

## 🔒 Privacy Features

- ✅ No external servers
- ✅ No data collection
- ✅ No tracking
- ✅ No internet connection needed
- ✅ All processing happens locally
- ✅ You own your data

## 📊 Technical Specs

**Storage:**
- Uses Chrome Storage API
- Stores cards, keywords, and connections
- Indexed for fast retrieval
- No size limit (up to browser limits)

**Performance:**
- Keyword extraction: ~50ms per page
- Highlighting: ~100ms for typical page
- Search: Instant with indexing
- Memory efficient

**Compatibility:**
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Firefox 85+

## 🚀 Getting Started

1. Install the extension
2. Visit any web page
3. Click "Save Page"
4. Visit another page
5. See keywords highlighted automatically!

That's it! No configuration, no account, no setup required.

---

**Built with:** WXT + React + TypeScript
**License:** ISC
**Size:** ~244KB
**Status:** Production Ready ✅
