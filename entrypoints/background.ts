export default defineBackground(() => {
  console.log('Recall It: Background script loaded');

  // Listen for messages from content scripts and popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SAVE_CURRENT_PAGE') {
      handleSaveCurrentPage(sender.tab?.id);
      sendResponse({ success: true });
    }
    return true;
  });

  // Context menu for saving pages
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'save-page',
      title: 'Save page to Recall It',
      contexts: ['page'],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-page' && tab?.id) {
      handleSaveCurrentPage(tab.id);
    }
  });

  async function handleSaveCurrentPage(tabId?: number) {
    if (!tabId) return;

    try {
      // Inject content script if needed and request page data
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // This will trigger the content script to send page data
          window.postMessage({ type: 'RECALL_IT_SAVE_PAGE' }, '*');
        },
      });
    } catch (error) {
      console.error('Error saving page:', error);
    }
  }
});
