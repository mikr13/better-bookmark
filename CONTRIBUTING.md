# Contributing to Recall It

Thank you for your interest in contributing to Recall It! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- A Chromium-based browser (Chrome, Edge, Brave, etc.) or Firefox
- Git

### Getting Started

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/recall-it.git
   cd recall-it
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development mode:
   ```bash
   npm run dev
   ```

5. Load the extension in your browser:
   - **Chrome/Edge**: 
     - Navigate to `chrome://extensions/`
     - Enable "Developer mode"
     - Click "Load unpacked"
     - Select the `.output/chrome-mv3` directory
   
   - **Firefox**:
     - Run `npm run dev:firefox` instead
     - Navigate to `about:debugging#/runtime/this-firefox`
     - Click "Load Temporary Add-on"
     - Select the `manifest.json` file in `.output/firefox-mv2`

### Project Structure

```
recall-it/
├── entrypoints/           # Extension entry points
│   ├── background.ts      # Background service worker
│   ├── content.ts         # Content script
│   └── popup/             # Popup UI (React)
├── utils/                 # Utility functions
│   ├── types.ts           # TypeScript types
│   ├── storage.ts         # Storage utilities
│   └── keywords.ts        # Keyword extraction
├── public/                # Static assets
└── wxt.config.ts          # WXT configuration
```

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests

Example: `feature/add-tags-support` or `fix/highlighting-bug`

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

Follow the conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example: `feat: add support for custom tags`

## Testing

### Manual Testing

1. Build the extension: `npm run build`
2. Load it in your browser
3. Test the following scenarios:
   - Save a page
   - View saved cards in popup
   - Search and filter cards
   - Verify keyword highlighting on different websites
   - Test light/dark mode adaptation
   - Delete a card
   - Check stats and graph views

### Testing Different Browsers

- Test on Chrome/Edge (chrome-mv3)
- Test on Firefox (firefox-mv2) using `npm run dev:firefox`

## Pull Request Process

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Build and test** your changes:
   ```bash
   npm run build
   ```

4. **Commit your changes** with clear commit messages

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - List what you tested

7. **Address review feedback** if requested

## Feature Ideas

Looking for something to work on? Here are some ideas:

### High Priority
- Add export/import functionality for cards
- Implement manual tags in addition to auto-categorization
- Add full-text search within card content
- Create a visual knowledge graph with D3.js or similar
- Add browser sync support (optional, privacy-conscious)

### Medium Priority
- Support for custom keyword extraction rules
- Bulk operations (delete, export, re-categorize)
- Card grouping/collections
- Related cards suggestions in popup
- Keyboard shortcuts

### Low Priority
- Different highlight color schemes
- Card templates
- Statistics charts
- Dark mode for popup UI
- Advanced search with filters

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Questions?

- Open an issue for bugs or feature requests
- Use GitHub Discussions for questions
- Check existing issues before creating new ones

## License

By contributing to Recall It, you agree that your contributions will be licensed under the ISC License.

Thank you for contributing! 🎉
