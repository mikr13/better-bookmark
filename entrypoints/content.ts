import { storage } from '../utils/storage';
import { extractKeywords, extractTitle, extractContent, extractExcerpt, categorizeContent, generateCardId } from '../utils/keywords';
import type { Card } from '../utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Recall It: Content script loaded');

    // Listen for save page requests from window messages
    window.addEventListener('message', async (event) => {
      // Validate origin for security
      if (event.source !== window) return;
      
      if (event.data.type === 'RECALL_IT_SAVE_PAGE') {
        await saveCurrentPage();
      }
    });

    // Listen for messages from extension (popup/background)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SAVE_CURRENT_PAGE') {
        saveCurrentPage().then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep the message channel open for async response
      }
    });

    // Highlight keywords on page load
    highlightKeywords();

    // Re-highlight when DOM changes (for dynamic content)
    const observer = new MutationObserver(() => {
      highlightKeywords();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    async function saveCurrentPage() {
      try {
        const title = extractTitle(document);
        const content = extractContent(document);
        const keywords = extractKeywords(content, 15);
        const category = categorizeContent(keywords);
        const excerpt = extractExcerpt(content);

        // Get favicon
        const faviconLink = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
        const favicon = faviconLink?.href || '';

        const card: Card = {
          id: generateCardId(),
          title,
          url: window.location.href,
          content: excerpt,
          keywords,
          tags: [],
          category,
          timestamp: Date.now(),
          favicon,
          excerpt,
        };

        await storage.saveCard(card);

        // Show notification
        showNotification('Page saved successfully!');

        // Re-highlight with new keywords
        setTimeout(() => highlightKeywords(), 100);
      } catch (error) {
        console.error('Error saving page:', error);
        showNotification('Error saving page', true);
      }
    }

    let highlightedElements = new Set<HTMLElement>();
    let isHighlighting = false;

    async function highlightKeywords() {
      if (isHighlighting) return;
      isHighlighting = true;

      try {
        // Remove existing highlights
        clearHighlights();

        const data = await storage.getAll();
        const allKeywords = Object.keys(data.keywords);

        if (allKeywords.length === 0) {
          isHighlighting = false;
          return;
        }

        // Get text nodes from the page
        const textNodes = getTextNodes(document.body);

        // Detect if the page is in dark mode
        const isDarkMode = detectDarkMode();

        textNodes.forEach(node => {
          const text = node.textContent || '';
          const parent = node.parentElement;
          
          if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
            return;
          }

          // Check if any keyword is in this text
          let hasMatch = false;
          const lowerText = text.toLowerCase();
          
          for (const keyword of allKeywords) {
            if (lowerText.includes(keyword)) {
              hasMatch = true;
              break;
            }
          }

          if (hasMatch) {
            highlightTextNode(node, allKeywords, isDarkMode);
          }
        });
      } finally {
        isHighlighting = false;
      }
    }

    function highlightTextNode(node: Text, keywords: string[], isDarkMode: boolean) {
      const text = node.textContent || '';
      const parent = node.parentElement;
      if (!parent) return;

      // Create a regex pattern for all keywords
      const pattern = keywords
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      
      const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
      const matches = text.match(regex);

      if (!matches || matches.length === 0) return;

      // Split text and wrap matches
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      
      text.replace(regex, (match, ...args) => {
        const index = args[args.length - 2];
        
        // Add text before match
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
        }

        // Create highlighted span
        const span = document.createElement('span');
        span.textContent = match;
        span.className = 'recall-it-highlight';
        span.style.cssText = getHighlightStyle(isDarkMode);
        
        // Add click handler to show related cards
        span.addEventListener('click', (e) => {
          e.preventDefault();
          showKeywordInfo(match);
        });

        highlightedElements.add(span);
        fragment.appendChild(span);

        lastIndex = index + match.length;
        return match;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace the text node with the fragment
      parent.replaceChild(fragment, node);
    }

    function getHighlightStyle(isDarkMode: boolean): string {
      const bgColor = isDarkMode 
        ? 'rgba(255, 215, 0, 0.15)'  // Gold with low opacity for dark mode
        : 'rgba(255, 235, 59, 0.25)'; // Yellow with low opacity for light mode
      
      const borderColor = isDarkMode
        ? 'rgba(255, 215, 0, 0.4)'
        : 'rgba(255, 193, 7, 0.6)';

      return `
        background-color: ${bgColor};
        border-bottom: 1px solid ${borderColor};
        cursor: pointer;
        transition: background-color 0.2s ease;
      `.trim();
    }

    function detectDarkMode(): boolean {
      // Check if page has dark mode preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }

      // Check background color of body
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      if (bgColor) {
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
          return brightness < 128;
        }
      }

      return false;
    }

    function clearHighlights() {
      highlightedElements.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        }
      });
      highlightedElements.clear();
    }

    function getTextNodes(element: Node): Text[] {
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip empty nodes and nodes in excluded elements
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            const tagName = parent.tagName;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEXTAREA', 'INPUT'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if already highlighted
            if (parent.classList.contains('recall-it-highlight')) {
              return NodeFilter.FILTER_REJECT;
            }

            const text = node.textContent || '';
            if (text.trim().length === 0) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node as Text);
      }

      return textNodes;
    }

    async function showKeywordInfo(keyword: string) {
      const cards = await storage.getCardsByKeyword(keyword.toLowerCase());
      
      if (cards.length === 0) return;

      // Create a simple tooltip/popup to show related cards
      const popup = document.createElement('div');
      popup.className = 'recall-it-popup';
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 400px;
        max-height: 60vh;
        overflow-y: auto;
        color: #333;
      `;

      const title = document.createElement('h3');
      title.textContent = `Related cards for "${keyword}"`;
      title.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; font-weight: 600;';
      popup.appendChild(title);

      cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.style.cssText = `
          margin-bottom: 12px;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
        `;
        cardEl.innerHTML = `
          <div style="font-weight: 500; margin-bottom: 4px;">${card.title}</div>
          <div style="font-size: 12px; color: #666;">${card.url}</div>
        `;
        cardEl.addEventListener('click', () => {
          window.open(card.url, '_blank');
        });
        popup.appendChild(cardEl);
      });

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.cssText = `
        margin-top: 12px;
        padding: 6px 12px;
        background: #333;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(popup);
      });
      popup.appendChild(closeBtn);

      document.body.appendChild(popup);

      // Close on outside click
      setTimeout(() => {
        const closeOnOutsideClick = (e: MouseEvent) => {
          if (!popup.contains(e.target as Node)) {
            if (document.body.contains(popup)) {
              document.body.removeChild(popup);
            }
            document.removeEventListener('click', closeOnOutsideClick);
          }
        };
        document.addEventListener('click', closeOnOutsideClick);
      }, 100);
    }

    function showNotification(message: string, isError = false) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#f44336' : '#4caf50'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }
  },
});
