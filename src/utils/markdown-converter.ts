import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import DOMPurify from 'dompurify';
import type { EmailMessage, EmailThread, EmailContact, ClipResult } from '../types/email';
import type { ClipperSettings, Template } from '../types/email';

function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const decoded = decodeURIComponent(last);
    // Remove file extension and return if it looks like a name
    const name = decoded.replace(/\.\w{2,4}$/, '');
    return name.length > 2 && name.length < 60 ? name : '';
  } catch { return ''; }
}

function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  td.use(gfm);

  // Email layout tables — collapse to content (emails use tables for layout, not data)
  td.addRule('layoutTable', {
    filter: (node) => {
      if (node.nodeName !== 'TABLE') return false;
      const table = node as HTMLTableElement;
      // Heuristic: layout tables have 1-2 columns, or have style attributes for layout
      const style = table.getAttribute('style') || '';
      const rows = table.querySelectorAll('tr');
      const firstRow = rows[0];
      const cols = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
      const isLayout = cols <= 2 ||
        style.includes('border-collapse') ||
        style.includes('max-width') ||
        style.includes('width:100%') ||
        !table.querySelector('th'); // No headers = likely layout
      return isLayout;
    },
    replacement: (content) => {
      return '\n\n' + content.trim() + '\n\n';
    },
  });

  // Layout table cells — just pass through content
  td.addRule('layoutTd', {
    filter: (node) => {
      if (node.nodeName !== 'TD' && node.nodeName !== 'TR' && node.nodeName !== 'TBODY') return false;
      const table = node.closest?.('table') || (node as Element).parentElement?.closest?.('table');
      if (!table) return false;
      const style = table.getAttribute('style') || '';
      const firstRow = table.querySelector('tr');
      const cols = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
      return cols <= 2 || style.includes('border-collapse') || !table.querySelector('th');
    },
    replacement: (content) => content,
  });

  td.addRule('lineBreaks', {
    filter: 'br',
    replacement: () => '\n',
  });

  // Images — preserve all real images, skip tracking pixels and spacers
  td.addRule('emailImages', {
    filter: 'img',
    replacement: (_content, node) => {
      const el = node as HTMLImageElement;
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      const width = parseInt(el.getAttribute('width') || '0', 10);
      const height = parseInt(el.getAttribute('height') || '0', 10);

      // Skip tracking pixels
      if ((width > 0 && width <= 2) && (height > 0 && height <= 2)) return '';
      // Skip blank/transparent spacer GIFs
      if (!src || src.startsWith('data:image/gif;base64,R0lGOD')) return '';
      // Skip CID references (embedded images with no real URL)
      if (src.startsWith('cid:')) return `*(embedded image: ${alt || 'image'})*`;

      // Use filename from URL as alt text fallback
      const altText = alt || extractFilenameFromUrl(src) || 'image';
      return `![${altText}](${src})`;
    },
  });

  // Gmail quoted text → Obsidian collapsible callout
  td.addRule('details', {
    filter: 'details',
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const summary = el.querySelector('summary');
      const summaryText = summary?.textContent || 'Quoted text';
      const body = content.replace(summaryText, '').trim();
      const indented = body.split('\n').map(line => `> ${line}`).join('\n');
      return `\n\n> [!quote]- ${summaryText}\n${indented}\n\n`;
    },
  });

  td.addRule('summary', {
    filter: 'summary',
    replacement: (content) => content,
  });

  // Blockquotes → Obsidian-style quote blocks
  td.addRule('emailBlockquote', {
    filter: 'blockquote',
    replacement: (content) => {
      const lines = content.trim().split('\n');
      return '\n\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
    },
  });

  // Strip empty layout divs/spans Gmail uses
  td.addRule('emptyContainers', {
    filter: (node) => {
      const el = node as HTMLElement;
      return (
        (el.tagName === 'DIV' || el.tagName === 'SPAN') &&
        !el.textContent?.trim() &&
        !el.querySelector('img') &&
        !el.querySelector('a')
      );
    },
    replacement: () => '',
  });

  // Styled text — bold, italic, underline, strikethrough from inline styles
  td.addRule('styledSpan', {
    filter: (node) => {
      const el = node as HTMLElement;
      if (el.tagName !== 'SPAN') return false;
      const style = el.getAttribute('style') || '';
      return (
        style.includes('font-weight') ||
        style.includes('font-style') ||
        style.includes('text-decoration') ||
        style.includes('background-color') ||
        style.includes('color:')
      );
    },
    replacement: (content, node) => {
      if (!content.trim()) return content;
      const el = node as HTMLElement;
      const style = el.getAttribute('style') || '';
      let result = content;

      if (style.includes('bold') || style.match(/font-weight:\s*(700|800|900|bold)/)) {
        result = `**${result}**`;
      }
      if (style.includes('italic')) {
        result = `*${result}*`;
      }
      if (style.includes('underline')) {
        result = `<u>${result}</u>`;
      }
      if (style.includes('line-through')) {
        result = `~~${result}~~`;
      }
      // Highlighted/background-colored text → Obsidian highlight syntax
      if (style.match(/background-color:\s*(?!transparent|inherit|initial)/)) {
        result = `==${result}==`;
      }
      return result;
    },
  });

  // Links — unwrap tracking redirects, preserve real URLs
  td.addRule('emailLinks', {
    filter: 'a',
    replacement: (content, node) => {
      const el = node as HTMLAnchorElement;
      const href = el.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        return content;
      }

      let realUrl = href;
      try {
        const url = new URL(href);

        // Strategy 1: URL has a redirect param (q, url, u, redirect_uri, destination)
        for (const param of ['q', 'url', 'u', 'redirect_uri', 'destination', 'target']) {
          const val = url.searchParams.get(param);
          if (val && val.startsWith('http')) { realUrl = val; break; }
        }

        // Strategy 2: tracking URL with encoded real URL in path
        // e.g. awstrack.me/L0/https:%2F%2Freal-url.com/...
        if (realUrl === href) {
          const pathMatch = url.pathname.match(/\/(?:L\d+\/|redirect\/)(https?[:%].+?)(?:\/\d|$)/);
          if (pathMatch) {
            realUrl = decodeURIComponent(pathMatch[1]);
          }
        }
      } catch { /* keep original */ }

      // Skip "Download" buttons that link to Gmail attachment viewer
      if (content.trim().toLowerCase() === 'download' && href.includes('mail.google.com')) {
        return '';
      }

      if (content === realUrl || !content.trim()) {
        return realUrl;
      }
      return `[${content}](${realUrl})`;
    },
  });

  // Horizontal rules
  td.addRule('hr', {
    filter: 'hr',
    replacement: () => '\n\n---\n\n',
  });

  // Strip layout-only elements — font, center, wbr
  td.addRule('passthrough', {
    filter: (node) => ['FONT', 'CENTER', 'WBR', 'SMALL'].includes(node.nodeName),
    replacement: (content) => content,
  });

  // Preformatted/code blocks
  td.addRule('preCode', {
    filter: 'pre',
    replacement: (content) => {
      return `\n\n\`\`\`\n${content.trim()}\n\`\`\`\n\n`;
    },
  });

  return td;
}

function formatContact(contact: EmailContact): string {
  if (contact.name && contact.email) {
    return `${contact.name} <${contact.email}>`;
  }
  return contact.email || contact.name || '';
}

function formatContactList(contacts: EmailContact[]): string {
  return contacts.map(formatContact).join(', ');
}

function formatContactMarkdown(contact: EmailContact): string {
  if (contact.name && contact.email) {
    return `**${contact.name}** \`${contact.email}\``;
  }
  return contact.email ? `\`${contact.email}\`` : contact.name || '';
}

function buildFrontmatter(thread: EmailThread, settings: ClipperSettings): Record<string, unknown> {
  const firstMsg = thread.messages[0];
  const fm: Record<string, unknown> = {};

  fm['clipped'] = new Date().toISOString().split('T')[0];
  fm['type'] = 'email';
  fm['source'] = 'gmail';

  for (const prop of settings.properties) {
    const value = resolveTemplateVar(prop.value, thread, firstMsg);
    if (prop.type === 'list' && typeof value === 'string') {
      fm[prop.name] = value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (prop.type === 'checkbox') {
      fm[prop.name] = value === 'true';
    } else {
      fm[prop.name] = value;
    }
  }

  if (firstMsg.attachments.length > 0) {
    fm['attachments'] = firstMsg.attachments.map(a => a.filename);
  }

  return fm;
}

function resolveTemplateVar(template: string, thread: EmailThread, msg: EmailMessage): string {
  const vars: Record<string, string> = {
    '{{subject}}': thread.subject,
    '{{from}}': formatContact(msg.from),
    '{{from_name}}': msg.from.name,
    '{{from_email}}': msg.from.email,
    '{{to}}': formatContactList(msg.to),
    '{{cc}}': formatContactList(msg.cc),
    '{{date}}': msg.date,
    '{{date_iso}}': msg.dateISO,
    '{{labels}}': thread.labels.join(', '),
    '{{participants}}': formatContactList(thread.participants),
    '{{message_count}}': String(thread.messageCount),
    '{{starred}}': String(msg.isStarred),
    '{{url}}': typeof window !== 'undefined' ? window.location.href : '',
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value);
  }
  return result;
}

function yamlSerialize(obj: Record<string, unknown>, indent = 0): string {
  const pad = ' '.repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else {
        lines.push(`${pad}${key}:`);
        value.forEach(item => lines.push(`${pad}  - "${String(item).replace(/"/g, '\\"')}"`));
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${pad}${key}: ${value}`);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${pad}${key}:`);
      lines.push(yamlSerialize(value as Record<string, unknown>, indent + 2));
    } else {
      const str = String(value ?? '');
      if (str.includes(':') || str.includes('#') || str.includes('"') || str.includes("'") || str.includes('\n')) {
        lines.push(`${pad}${key}: "${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
      } else {
        lines.push(`${pad}${key}: ${str}`);
      }
    }
  }

  return lines.join('\n');
}

export function convertToMarkdown(
  thread: EmailThread,
  settings: ClipperSettings,
  template: Template,
): ClipResult {
  const td = createTurndownService();
  const frontmatter = buildFrontmatter(thread, settings);
  const parts: string[] = [];

  for (let i = 0; i < thread.messages.length; i++) {
    const msg = thread.messages[i];

    // Message header with sender info — Obsidian callout style
    if (thread.messages.length > 1) {
      parts.push(`> [!email] ${formatContactMarkdown(msg.from)} — ${msg.date}`);
      if (msg.to.length > 0) {
        parts.push(`> **To:** ${msg.to.map(c => formatContactMarkdown(c)).join(', ')}`);
      }
      if (msg.cc.length > 0) {
        parts.push(`> **CC:** ${msg.cc.map(c => formatContactMarkdown(c)).join(', ')}`);
      }
      parts.push('');
    }

    // Convert body HTML to Markdown via Turndown
    const bodySource = msg.bodyHtml || msg.bodyText;
    let markdown = '';
    if (bodySource) {
      try {
        markdown = td.turndown(bodySource);
      } catch (e) {
        console.error('[Gmail Clipper] Turndown conversion error:', e);
        // Fallback: use DOMPurify to sanitize, then extract text
        const sanitized = DOMPurify.sanitize(bodySource);
        const tmp = document.createElement('div');
        tmp.textContent = '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        markdown = doc.body?.textContent || bodySource.replace(/<[^>]+>/g, '');
      }
    }

    // Clean up markdown artifacts
    const cleaned = markdown
      // Remove empty headings (### followed by nothing or just whitespace)
      .replace(/^#{1,6}\s*$/gm, '')
      // Remove orphan "Download" text from Gmail attachment buttons
      .replace(/^\s*Download\s*$/gm, '')
      // Collapse excessive blank lines
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    parts.push(cleaned);

    // Attachments section
    if (settings.includeAttachmentList && msg.attachments.length > 0) {
      parts.push('');
      parts.push('> [!paperclip] Attachments');
      msg.attachments.forEach(att => {
        const sizeStr = att.size ? ` *(${att.size})*` : '';
        if (att.downloadUrl) {
          parts.push(`> - [${att.filename}](${att.downloadUrl})${sizeStr}`);
        } else {
          parts.push(`> - ${att.filename}${sizeStr}`);
        }
      });
    }

    // Thread separator
    if (i < thread.messages.length - 1) {
      parts.push(`\n${settings.threadSeparator}\n`);
    }
  }

  const bodyContent = parts.join('\n');
  const resolvedBody = resolveTemplateVar(
    template.bodyTemplate,
    thread,
    thread.messages[0],
  ).replace('{{content}}', bodyContent);

  const yamlBlock = yamlSerialize(frontmatter);
  const fullMarkdown = `---\n${yamlBlock}\n---\n\n${resolvedBody}`;

  const titleTemplate = template.noteNameFormat || settings.filenameTemplate;
  const title = resolveTemplateVar(titleTemplate, thread, thread.messages[0]);

  const allAttachments = thread.messages.flatMap(m => m.attachments);

  return {
    markdown: fullMarkdown,
    frontmatter,
    title: sanitizeFilename(title),
    attachments: allAttachments,
  };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
