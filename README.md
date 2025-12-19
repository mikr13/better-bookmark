# 🧠 Recall It

A powerful browser extension that helps you build a personal knowledge graph by saving web pages as cards, extracting keywords, and automatically highlighting related content across the web.

## Features

- **💾 Save Pages as Cards**: Quickly save any web page with a single click
- **🔍 Automatic Keyword Extraction**: Uses advanced text analysis to extract meaningful keywords from saved pages
- **✨ Smart Highlighting**: Automatically highlights keywords from your saved cards on any webpage you visit
- **🌓 Dark/Light Mode Support**: Subtle highlighting that works beautifully on both light and dark websites
- **🕸️ Knowledge Graph**: Builds connections between related cards based on shared keywords
- **🏷️ Auto-Categorization**: Automatically categorizes content (Technology, Science, Business, News, General)
- **🔒 Privacy-First**: All data stays in your browser - nothing is sent to external servers
- **⚡ Built with Modern Tech**: WXT + React.js + TypeScript

## Installation

### Development Mode

1. Clone the repository:
```bash
git clone https://github.com/mikr13/recall-it.git
cd recall-it
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run dev
```

4. Load the extension in your browser:
   - **Chrome/Edge**: 
     - Open `chrome://extensions/`
     - Enable "Developer mode"
     - Click "Load unpacked"
     - Select the `.output/chrome-mv3` directory
   
   - **Firefox**:
     - Run `npm run dev:firefox`
     - Open `about:debugging#/runtime/this-firefox`
     - Click "Load Temporary Add-on"
     - Select any file in the `.output/firefox-mv2` directory

### Production Build

```bash
npm run build        # For Chrome/Edge
npm run build:firefox # For Firefox
npm run zip          # Create distributable zip
```

## Usage

### Saving a Page

1. **Click the extension icon** and click "Save Page" button
2. **Right-click** anywhere on the page and select "Save page to Recall It"

The extension will:
- Extract the page title, content, and metadata
- Identify important keywords
- Categorize the content automatically
- Store everything locally in your browser

### Viewing Saved Cards

Click the extension icon to open the popup where you can:
- **Browse all saved cards** with search and filtering
- **View statistics** about your knowledge base
- **Explore the knowledge graph** to see connections
- **Delete cards** you no longer need

### Automatic Highlighting

When you visit any webpage, the extension will:
- Scan the page for keywords from your saved cards
- Highlight matching keywords with a subtle background and underline
- **Click any highlighted keyword** to see related saved cards
- Automatically adapt to light/dark mode

## Technology Stack

- **WXT**: Modern web extension framework
- **React**: UI components
- **TypeScript**: Type-safe development
- **Chrome Storage API**: Local data persistence

## Architecture

```
recall-it/
├── entrypoints/
│   ├── background.ts       # Background service worker
│   ├── content.ts          # Content script for highlighting
│   └── popup/              # React-based popup UI
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.html
│       └── style.css
├── utils/
│   ├── types.ts            # TypeScript type definitions
│   ├── storage.ts          # Storage utilities
│   └── keywords.ts         # Keyword extraction & processing
└── public/
    └── icon-128.svg        # Extension icon
```

## Privacy

Recall It is designed with privacy as a top priority:
- ✅ All data stored locally in browser storage
- ✅ No external API calls
- ✅ No data collection or tracking
- ✅ No internet connection required (after installation)
- ✅ Open source - verify the code yourself

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC License

## Author

Built with ❤️ for knowledge enthusiasts