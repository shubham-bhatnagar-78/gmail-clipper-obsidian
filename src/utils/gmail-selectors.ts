// Gmail DOM extraction strategies — ordered by reliability.
// Gmail obfuscates class names and changes them across versions.
// We use ARIA roles, data attributes, and structural patterns as primary,
// with class-based selectors as fallbacks.

// Multiple selector candidates per element — try each until one matches.
export const CANDIDATES = {
  // Subject line
  subject: [
    'h2.hP',
    '[data-legacy-thread-id] h2',
    'h2[data-thread-perm-id]',
    '[role="main"] h2',
    '.ha h2',
  ],

  // Message body (expanded email content)
  messageBody: [
    '.a3s.aiL',
    '.a3s',
    '[data-message-id] .ii.gt',
    '.ii.gt .a3s',
    '.gs .ii.gt',
    '.nH .aHU .ii.gt',
    '[role="listitem"] .ii .a3s',
    // Gmail's message body always has dir="ltr" or dir="auto"
    '[dir="ltr"].ii.gt',
  ],

  // Sender email element (has email attribute)
  senderEmail: [
    '.gD[email]',
    '[email]',
    'span[email]',
    '.go [email]',
  ],

  // Date element
  date: [
    '.g3 span[title]',
    'span.g3 span[title]',
    '[role="listitem"] .gH span[title]',
    '.gH .g3 span[title]',
    // Fallback: any span with a title that looks like a date
    'span[title*=","]',
  ],

  // Message container (wraps one email in a thread)
  messageContainer: [
    '.gs',
    '[role="listitem"]',
    '.kv, .kx',
    '.h7',
  ],

  // Message header area
  messageHeader: [
    '.gE.iv.gt',
    '.gE',
    '.gH',
    '.iv.gt',
  ],

  // Recipients
  recipients: [
    '.g2',
    '.gI span[email]',
    '.afn span[email]',
  ],

  // Attachment container
  attachments: [
    '.aQH',
    '.aZo',
    '[download_url]',
    '.aV3',
  ],

  // Labels
  labels: [
    '.at .ar.as .av',
    '.ar.as .av',
    '.av',
    '.J-awr',
  ],

  // Star
  star: [
    '.T-KT-Jp',
    '[aria-label*="Star"] .T-KT-Jp',
    'img[aria-label*="Starred"]',
  ],
} as const;

// Try each candidate selector, return first match
export function queryFirst(root: Element | Document, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch { /* invalid selector, skip */ }
  }
  return null;
}

// Try each candidate selector, return all matches from first one that has results
export function queryAll(root: Element | Document, candidates: readonly string[]): Element[] {
  for (const selector of candidates) {
    try {
      const els = root.querySelectorAll(selector);
      if (els.length > 0) return Array.from(els);
    } catch { /* skip */ }
  }
  return [];
}
