# Testing Checklist for Recall It Extension

This document provides a comprehensive checklist for manually testing the Recall It browser extension.

## Setup

1. ✅ Build the extension: `npm run build`
2. ✅ Load extension in Chrome/Edge (`chrome://extensions/`)
3. ✅ Verify extension icon appears in toolbar
4. ✅ Verify extension name is "Recall It"

## Feature Testing

### 1. Save Page Functionality

#### Test 1.1: Save via Popup
- [ ] Open `examples/test-page.html` in browser
- [ ] Click Recall It extension icon
- [ ] Click "Save Page" button
- [ ] ✅ Success notification appears
- [ ] ✅ Popup shows card in Cards tab
- [ ] ✅ Card shows title "Modern Software Development Best Practices"
- [ ] ✅ Card shows keywords (code, developer, software, programming, etc.)
- [ ] ✅ Card shows category "Technology"

#### Test 1.2: Save via Context Menu
- [ ] Open `examples/ml-page.html`
- [ ] Right-click anywhere on page
- [ ] Select "Save page to Recall It"
- [ ] ✅ Success notification appears
- [ ] ✅ Card appears in popup

#### Test 1.3: Verify Data Persistence
- [ ] Close and reopen popup
- [ ] ✅ Saved cards still appear
- [ ] Reload extension
- [ ] ✅ Saved cards still appear

### 2. Keyword Highlighting

#### Test 2.1: Basic Highlighting
- [ ] Save `examples/test-page.html`
- [ ] Open `examples/ml-page.html`
- [ ] ✅ Keywords like "code", "developer", "software" are highlighted
- [ ] ✅ Highlights have subtle background color
- [ ] ✅ Highlights have underline

#### Test 2.2: Light Mode Highlighting
- [ ] View highlighting on light background pages
- [ ] ✅ Yellow/gold translucent background
- [ ] ✅ Readable and not too bright

#### Test 2.3: Dark Mode Highlighting
- [ ] Open `examples/test-page.html`
- [ ] Click "Toggle Dark Mode" button
- [ ] ✅ Highlights adapt to dark mode
- [ ] ✅ Gold color with lower opacity
- [ ] ✅ Still readable

#### Test 2.4: Click Highlights
- [ ] Click on a highlighted keyword
- [ ] ✅ Popup appears showing related cards
- [ ] ✅ Can click card title to open URL
- [ ] ✅ Can click "Close" to dismiss

### 3. Popup UI

#### Test 3.1: Cards Tab
- [ ] Open popup
- [ ] Navigate to Cards tab (should be default)
- [ ] ✅ All saved cards are listed
- [ ] ✅ Most recent cards appear first
- [ ] ✅ Each card shows title, category, date, excerpt, keywords

#### Test 3.2: Search Functionality
- [ ] Type "software" in search box
- [ ] ✅ Only cards with "software" in title or keywords appear
- [ ] Clear search
- [ ] ✅ All cards reappear

#### Test 3.3: Category Filtering
- [ ] Click "Technology" category filter
- [ ] ✅ Only Technology cards appear
- [ ] Click "All" filter
- [ ] ✅ All cards reappear

#### Test 3.4: Card Actions
- [ ] Click card title
- [ ] ✅ Original page opens in new tab
- [ ] Click "Delete" button on a card
- [ ] ✅ Card is removed from list
- [ ] ✅ Card no longer appears after reopening popup

### 4. Statistics Tab

#### Test 4.1: View Stats
- [ ] Save at least 2 pages
- [ ] Navigate to Stats tab
- [ ] ✅ "Cards Saved" shows correct count
- [ ] ✅ "Keywords Tracked" shows number > 0
- [ ] ✅ "Connections" shows calculated connections
- [ ] ✅ Categories list shows breakdown

### 5. Knowledge Graph Tab

#### Test 5.1: View Graph
- [ ] Navigate to Knowledge Graph tab
- [ ] ✅ Shows connection count
- [ ] ✅ Shows card count
- [ ] ✅ Lists top keywords with card counts

### 6. Edge Cases

#### Test 6.1: Empty State
- [ ] Delete all cards
- [ ] ✅ Empty state message appears
- [ ] ✅ Message encourages saving pages

#### Test 6.2: No Matching Keywords
- [ ] Save a page
- [ ] Open a completely different page with no matching keywords
- [ ] ✅ No highlights appear
- [ ] ✅ No errors in console

#### Test 6.3: Many Keywords
- [ ] Save multiple pages (5+)
- [ ] ✅ Highlighting still works
- [ ] ✅ Performance is acceptable
- [ ] ✅ No lag when scrolling

#### Test 6.4: Special Characters
- [ ] Test pages with special characters in title/content
- [ ] ✅ Saves correctly
- [ ] ✅ Displays correctly
- [ ] ✅ No encoding issues

### 7. Browser Compatibility

#### Test 7.1: Chrome
- [ ] Load extension in Chrome
- [ ] ✅ All features work

#### Test 7.2: Edge
- [ ] Load extension in Edge
- [ ] ✅ All features work

#### Test 7.3: Brave
- [ ] Load extension in Brave
- [ ] ✅ All features work

#### Test 7.4: Firefox
- [ ] Build with `npm run build:firefox`
- [ ] Load in Firefox
- [ ] ✅ All features work

## Performance Testing

### Test 8.1: Large Pages
- [ ] Save a very long article
- [ ] ✅ Saves within reasonable time
- [ ] ✅ Highlighting completes without freezing

### Test 8.2: Many Cards
- [ ] Save 20+ pages
- [ ] ✅ Popup remains responsive
- [ ] ✅ Search/filter works quickly

## Security Testing

### Test 9.1: Storage
- [ ] Check Chrome DevTools → Application → Storage → Local Storage
- [ ] ✅ Data is stored locally
- [ ] ✅ No external requests in Network tab

### Test 9.2: Permissions
- [ ] Check extension permissions
- [ ] ✅ Only requests necessary permissions
- [ ] ✅ Explains why each permission is needed

## Documentation Testing

### Test 10.1: README
- [ ] Follow installation instructions
- [ ] ✅ Instructions are clear and work
- [ ] ✅ Features are accurately described

### Test 10.2: Quick Start
- [ ] Follow QUICKSTART.md
- [ ] ✅ Can get extension running in 5 minutes
- [ ] ✅ Examples work as described

## Known Limitations

Document any issues found:
- [ ] Cannot highlight on chrome:// or extension pages (expected behavior)
- [ ] Highlighting on dynamic single-page apps may need page refresh
- [ ] Very long pages may have slight delay in highlighting

## Sign-off

Tested by: _______________
Date: _______________
Browser/Version: _______________
OS: _______________

✅ All critical tests passed
✅ Ready for production use
