import { CANDIDATES, queryFirst, queryAll } from './gmail-selectors';
import type { EmailMessage, EmailContact, EmailAttachment, EmailThread } from '../types/email';
import DOMPurify from 'dompurify';

function parseContact(text: string): EmailContact {
  const match = text.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  }
  const emailOnly = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailOnly) return { name: '', email: emailOnly[0] };
  return { name: text.trim(), email: '' };
}

function extractSubject(): string {
  const el = queryFirst(document, CANDIDATES.subject);
  return el?.textContent?.trim() || 'Untitled Email';
}

function extractSender(container: Element): EmailContact {
  const emailEl = queryFirst(container, CANDIDATES.senderEmail);
  if (emailEl) {
    return {
      name: emailEl.getAttribute('name') || emailEl.textContent?.trim() || '',
      email: emailEl.getAttribute('email') || '',
    };
  }
  return { name: '', email: '' };
}

function extractDate(container: Element): { formatted: string; iso: string } {
  const dateEl = queryFirst(container, CANDIDATES.date);
  if (dateEl) {
    const title = dateEl.getAttribute('title') || dateEl.textContent?.trim() || '';
    return { formatted: title, iso: title };
  }
  return { formatted: new Date().toISOString(), iso: new Date().toISOString() };
}

function extractRecipients(container: Element): { to: EmailContact[]; cc: EmailContact[] } {
  const to: EmailContact[] = [];
  const cc: EmailContact[] = [];

  // Find all [email] elements in the header area after the sender
  const headerArea = queryFirst(container, CANDIDATES.messageHeader);
  if (!headerArea) return { to, cc };

  const emailEls = headerArea.querySelectorAll('[email]');
  const sender = queryFirst(container, CANDIDATES.senderEmail);
  const senderAddr = sender?.getAttribute('email') || '';

  emailEls.forEach(el => {
    const addr = el.getAttribute('email') || '';
    if (addr && addr !== senderAddr) {
      to.push({
        name: el.getAttribute('name') || el.textContent?.trim() || '',
        email: addr,
      });
    }
  });

  return { to, cc };
}

function extractMessageBody(container: Element): { html: string; text: string } {
  const bodyEl = queryFirst(container, CANDIDATES.messageBody);
  if (!bodyEl) return { html: '', text: '' };

  const clone = bodyEl.cloneNode(true) as HTMLElement;

  // Wrap Gmail quoted sections in collapsible
  clone.querySelectorAll('.gmail_quote, .gmail_extra').forEach(el => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Quoted text';
    details.appendChild(summary);
    while (el.firstChild) {
      details.appendChild(el.firstChild);
    }
    el.replaceWith(details);
  });

  const sanitizedHtml = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
      'blockquote', 'pre', 'code',
      'hr', 'details', 'summary',
      'sup', 'sub', 'small', 'font', 'center',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'colspan', 'rowspan', 'style', 'dir', 'align',
    ],
    ALLOW_DATA_ATTR: false,
  });

  return { html: sanitizedHtml, text: clone.textContent?.trim() || '' };
}

function extractAttachments(container: Element): EmailAttachment[] {
  const items: EmailAttachment[] = [];

  // Strategy 1: look for download_url attributes
  container.querySelectorAll('[download_url]').forEach(el => {
    const dlUrl = el.getAttribute('download_url') || '';
    const parts = dlUrl.split(':');
    if (parts.length >= 2) {
      items.push({
        filename: parts[0] || 'attachment',
        mimeType: '',
        size: '',
        downloadUrl: undefined,
      });
    }
  });

  // Strategy 2: look for attachment name elements
  if (items.length === 0) {
    const attachEls = queryAll(container, CANDIDATES.attachments);
    attachEls.forEach(el => {
      const name = el.textContent?.trim();
      if (name && name.includes('.')) {
        items.push({
          filename: name,
          mimeType: '',
          size: '',
          downloadUrl: undefined,
        });
      }
    });
  }

  return items;
}

function extractLabels(): string[] {
  const labels: string[] = [];
  const els = queryAll(document, CANDIDATES.labels);
  els.forEach(el => {
    const text = el.textContent?.trim() || '';
    if (text && !['Inbox', 'Sent', 'Drafts', 'Important', 'Starred'].includes(text)) {
      labels.push(text);
    }
  });
  return [...new Set(labels)];
}

function isStarred(): boolean {
  return queryAll(document, CANDIDATES.star).length > 0;
}

// Find all expanded message containers in the thread
function findMessageContainers(): Element[] {
  // Strategy 1: find message bodies, walk up to containers
  const bodies = queryAll(document, CANDIDATES.messageBody);
  if (bodies.length === 0) return [];

  const containers: Element[] = [];

  bodies.forEach(body => {
    // Walk up to find a reasonable container that has sender info
    let el: Element | null = body;
    let container: Element | null = null;

    // Walk up max 10 levels looking for a container with [email] attribute
    for (let i = 0; i < 10 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      if (el.querySelector('[email]')) {
        container = el;
        break;
      }
    }

    // If no container with email found, use the body's grandparent
    if (!container) {
      container = body.parentElement?.parentElement || body.parentElement || body;
    }

    if (container && !containers.includes(container)) {
      // Avoid nesting: don't add a container that's an ancestor of an existing one
      const isAncestor = containers.some(c => container!.contains(c));
      const isDescendant = containers.some(c => c.contains(container!));
      if (!isAncestor && !isDescendant) {
        containers.push(container);
      } else if (isAncestor) {
        // Replace descendants with this ancestor — but only if it has [email]
        // Actually, prefer the more specific (descendant) container
      }
    }
  });

  return containers.length > 0 ? containers : bodies.map(b => b.parentElement || b);
}

export function extractThread(): EmailThread | null {
  const containers = findMessageContainers();
  if (containers.length === 0) return null;

  const messages: EmailMessage[] = containers.map((container, i) => {
    const sender = extractSender(container);
    const { to, cc } = extractRecipients(container);
    const { formatted, iso } = extractDate(container);
    const { html, text } = extractMessageBody(container);
    const attachments = extractAttachments(container);

    return {
      id: `msg-${Date.now()}-${i}`,
      subject: extractSubject(),
      from: sender,
      to,
      cc,
      bcc: [],
      date: formatted,
      dateISO: iso,
      bodyHtml: html,
      bodyText: text,
      attachments,
      labels: extractLabels(),
      isStarred: isStarred(),
      messageId: `msg-${Date.now()}-${i}`,
    };
  });

  if (messages.length === 0) return null;

  const allParticipants = new Map<string, EmailContact>();
  messages.forEach(msg => {
    [msg.from, ...msg.to, ...msg.cc].forEach(c => {
      if (c.email && !allParticipants.has(c.email)) {
        allParticipants.set(c.email, c);
      }
    });
  });

  return {
    subject: extractSubject(),
    messages,
    labels: extractLabels(),
    participants: Array.from(allParticipants.values()),
    messageCount: messages.length,
  };
}

export function isGmailEmailView(): boolean {
  return (
    window.location.hostname === 'mail.google.com' &&
    queryAll(document, CANDIDATES.messageBody).length > 0
  );
}

// Debug: report what selectors matched — helps diagnose extraction failures
export function debugSelectors(): Record<string, { matched: boolean; selector: string; count: number }> {
  const results: Record<string, { matched: boolean; selector: string; count: number }> = {};

  for (const [name, candidates] of Object.entries(CANDIDATES)) {
    let matched = false;
    let matchedSelector = '';
    let matchCount = 0;

    for (const sel of candidates) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          matched = true;
          matchedSelector = sel;
          matchCount = els.length;
          break;
        }
      } catch { /* skip */ }
    }

    results[name] = { matched, selector: matchedSelector, count: matchCount };
  }

  return results;
}
