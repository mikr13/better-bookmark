// Keyword extraction and text processing utilities

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
  'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
  'were', 'said', 'did', 'having', 'may', 'should'
]);

export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Clean and tokenize the text
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));

  // Count word frequencies
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Sort by frequency and get top keywords
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, maxKeywords);

  return sortedWords;
}

export function extractTitle(doc: Document): string {
  // Try to get title from various sources
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (ogTitle) return ogTitle;

  const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  if (twitterTitle) return twitterTitle;

  return doc.title || 'Untitled Page';
}

export function extractContent(doc: Document): string {
  // Remove script, style, and other non-content elements
  const clone = doc.cloneNode(true) as Document;
  const elementsToRemove = clone.querySelectorAll('script, style, noscript, iframe, nav, header, footer');
  elementsToRemove.forEach(el => el.remove());

  // Get text content from body
  const body = clone.body;
  if (!body) return '';

  return body.innerText || body.textContent || '';
}

export function extractExcerpt(content: string, maxLength: number = 200): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + '...';
}

export function categorizeContent(keywords: string[]): string {
  // Simple categorization based on keyword analysis
  // This is a basic implementation - could be enhanced with ML
  const techKeywords = ['code', 'programming', 'software', 'developer', 'api', 'data', 'algorithm', 'javascript', 'python', 'react'];
  const scienceKeywords = ['research', 'study', 'science', 'experiment', 'theory', 'analysis', 'hypothesis'];
  const businessKeywords = ['business', 'market', 'company', 'product', 'strategy', 'management', 'startup'];
  const newsKeywords = ['news', 'today', 'report', 'update', 'announce', 'breaking'];

  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

  if (techKeywords.some(k => keywordSet.has(k))) return 'Technology';
  if (scienceKeywords.some(k => keywordSet.has(k))) return 'Science';
  if (businessKeywords.some(k => keywordSet.has(k))) return 'Business';
  if (newsKeywords.some(k => keywordSet.has(k))) return 'News';

  return 'General';
}

export function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
