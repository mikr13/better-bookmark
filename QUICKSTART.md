# Quick Start Guide

Get up and running with Recall It in 5 minutes!

## Installation

### For Users

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mikr13/recall-it.git
   cd recall-it
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Load in browser**:
   
   **Chrome/Edge/Brave:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` folder
   
   **Firefox:**
   - Run `npm run build:firefox` instead of `npm run build`
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file in `.output/firefox-mv2`

## First Steps

### 1. Save Your First Page

Open the included example page to test:
```bash
# Open examples/test-page.html in your browser
```

Then:
- Click the Recall It extension icon
- Click "Save Page"
- See the success notification!

### 2. View Your Cards

- Click the extension icon again
- See your saved card in the "Cards" tab
- Notice the keywords that were extracted

### 3. Test Highlighting

- Open the second example: `examples/ml-page.html`
- Notice how keywords from your first saved page are highlighted!
- Click on any highlighted keyword to see related cards

### 4. Save Another Page

- Save the ML page as well
- Notice new keywords are highlighted on both pages
- Explore the "Stats" tab to see connections

## Development Mode

For development with hot reload:

```bash
npm run dev
```

This will:
- Watch for file changes
- Auto-rebuild the extension
- Output to `.output/chrome-mv3`

> **Note:** You'll still need to click the "Reload" button in `chrome://extensions/` to see your changes.

## Testing the Extension

### Test Saving
1. Navigate to any webpage
2. Right-click → "Save page to Recall It"
3. Check that a success notification appears

### Test Highlighting
1. Save a page with specific keywords (like the examples)
2. Open another page that contains those keywords
3. Verify keywords are highlighted
4. Click a highlight to see the related cards popup

### Test Dark Mode
1. Open `examples/test-page.html`
2. Click "Toggle Dark Mode"
3. Verify highlights still look good with adjusted colors

### Test Search and Filters
1. Save multiple pages
2. Open the popup
3. Use the search box to find cards
4. Click category filters

## Common Commands

```bash
# Development
npm run dev              # Chrome/Edge with hot reload
npm run dev:firefox      # Firefox with hot reload

# Build
npm run build            # Production build for Chrome/Edge
npm run build:firefox    # Production build for Firefox

# Package
npm run zip              # Create distributable .zip for Chrome/Edge
npm run zip:firefox      # Create distributable .zip for Firefox

# Setup
npm install              # Install dependencies
npm run postinstall      # Prepare WXT (runs automatically after install)
```

## Troubleshooting

### Extension not loading
- Make sure you selected the correct folder (`.output/chrome-mv3` for Chrome)
- Check for build errors in the console
- Try rebuilding: `npm run build`

### Highlighting not working
- Make sure you've saved at least one page
- Wait for the page to fully load
- Try refreshing the page
- Check the browser console for errors

### Popup not showing cards
- Click the extension icon
- Check the "Cards" tab
- Verify storage permissions are granted

### Build errors
- Delete `node_modules` and run `npm install` again
- Make sure you're using Node.js 18+
- Check that all dependencies installed correctly

## Next Steps

- Read the full [User Guide](USERGUIDE.md)
- Check out [Contributing Guidelines](CONTRIBUTING.md)
- Explore the code in `entrypoints/` and `utils/`
- Star the repository if you find it useful!

## Need Help?

- Check existing GitHub issues
- Create a new issue with details about your problem
- Include browser version and error messages

Happy recalling! 🧠✨
