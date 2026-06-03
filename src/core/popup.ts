import '../styles/popup.scss';
import DOMPurify from 'dompurify';
import { loadSettings, saveSettings, loadTemplates } from '../utils/storage';
import { convertToMarkdown } from '../utils/markdown-converter';
import { deliverToObsidian } from '../utils/obsidian-delivery';
import type { EmailThread, ClipResult, Template, ClipperSettings } from '../types/email';

let currentThread: EmailThread | null = null;
let currentClip: ClipResult | null = null;
let settings: ClipperSettings;
let templates: Template[];

const $ = (id: string) => document.getElementById(id)!;

const clipForm = $('clip-form');
const notGmail = $('not-gmail');
const noEmail = $('no-email');
const vaultSetup = $('vault-setup');
const statusBar = $('status-bar');
const statusText = $('status-text');
const noteNameInput = $('note-name') as HTMLTextAreaElement;
const templateSelect = $('template-select') as HTMLSelectElement;
const propertiesList = $('properties-list');
const contentPreview = $('content-preview');
const folderPathInput = $('folder-path') as HTMLInputElement;
const btnClip = $('btn-clip');
const btnClipDropdown = $('btn-clip-dropdown');
const clipDropdownMenu = $('clip-dropdown-menu');
const btnSettings = $('btn-settings');
const btnRefresh = $('btn-refresh');
const toggleProperties = $('toggle-properties');
const vaultNameQuick = $('vault-name-quick') as HTMLInputElement;
const folderPathQuick = $('folder-path-quick') as HTMLInputElement;
const btnSaveVault = $('btn-save-vault');

const PROP_ICONS: Record<string, string> = {
  text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
  date: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>',
  checkbox: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/></svg>',
};

function showStatus(text: string, type: 'success' | 'error' | 'warning' | 'info') {
  statusBar.className = `status-bar ${type}`;
  statusText.textContent = text;
  statusBar.classList.remove('hidden');
  if (type === 'success') setTimeout(() => statusBar.classList.add('hidden'), 3000);
}

function hideStatus() { statusBar.classList.add('hidden'); }

function showView(view: 'not-gmail' | 'no-email' | 'form' | 'vault-setup') {
  notGmail.classList.toggle('hidden', view !== 'not-gmail');
  noEmail.classList.toggle('hidden', view !== 'no-email');
  clipForm.classList.toggle('hidden', view !== 'form');
  vaultSetup.classList.toggle('hidden', view !== 'vault-setup');
}

function populateTemplates() {
  templateSelect.textContent = '';
  templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
  templateSelect.value = settings.templateId;
}

function renderProperties() {
  propertiesList.textContent = '';
  if (!currentClip) return;

  const propTypes = new Map(settings.properties.map(p => [p.name, p.type]));

  for (const [key, value] of Object.entries(currentClip.frontmatter)) {
    const item = document.createElement('div');
    item.className = 'property-item';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'property-icon';
    const type = propTypes.get(key) || 'text';
    const iconSvg = DOMPurify.sanitize(PROP_ICONS[type] || PROP_ICONS.text, { USE_PROFILES: { svg: true } });
    iconSpan.innerHTML = iconSvg;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'property-name';
    nameSpan.textContent = key;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'property-value';
    const displayVal = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    valueSpan.textContent = displayVal;
    valueSpan.title = displayVal;

    item.appendChild(iconSpan);
    item.appendChild(nameSpan);
    item.appendChild(valueSpan);
    propertiesList.appendChild(item);
  }
}

function renderContentPreview() {
  if (!currentClip) return;

  const md = currentClip.markdown;
  const bodyStart = md.indexOf('---\n', 4);
  const body = bodyStart > 0 ? md.slice(bodyStart + 4).trim() : md;

  // Simple markdown → HTML for preview
  let html = body
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^> \[!(\w+)\][-+]?\s*(.*)$/gm, '<div class="callout callout-$1"><strong>$2</strong></div>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  html = `<p>${html}</p>`;
  html = html.replace(/<\/blockquote><br><blockquote>/g, '<br>');

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'del', 'mark',
      'a', 'img', 'blockquote', 'hr', 'li', 'ul', 'ol', 'code', 'pre',
      'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'rel'],
  });

  contentPreview.innerHTML = sanitized;
}

function autoResizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function processEmail() {
  if (!currentThread) return;

  const template = templates.find(t => t.id === templateSelect.value) || templates[0];
  currentClip = convertToMarkdown(currentThread, settings, template);
  noteNameInput.value = currentClip.title;
  autoResizeTextarea(noteNameInput);
  folderPathInput.value = settings.folderPath || 'Emails';

  renderProperties();
  renderContentPreview();
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'checkGmail' });
  } catch {
    // Content script not loaded — ask background to inject it
    await chrome.runtime.sendMessage({ action: 'ensureContentScript', tabId });
    await new Promise(r => setTimeout(r, 500));
  }
}

async function extractEmail(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes('mail.google.com')) {
    showView('not-gmail');
    return;
  }

  showStatus('Extracting email...', 'info');

  try {
    // Always ensure content script is loaded first
    await ensureContentScript(tab.id);

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractEmail' });

    if (!response?.success) {
      hideStatus();
      console.log('[Gmail Clipper] Extraction failed:', response?.error);
      if (response?.debug) {
        console.log('[Gmail Clipper] Selector debug:', JSON.stringify(response.debug, null, 2));
      }
      showView('no-email');
      showStatus(response?.error || 'Could not extract email', 'error');
      return;
    }

    currentThread = response.thread;
    hideStatus();
    showView('form');
    processEmail();
  } catch (err) {
    console.error('[Gmail Clipper] Fatal extraction error:', err);
    showStatus('Failed — try refreshing Gmail tab first', 'error');
    showView('no-email');
  }
}

async function handleClip(method?: string) {
  if (!currentClip || !currentThread) return;

  const deliveryMethod = method || settings.deliveryMethod;

  if (deliveryMethod === 'obsidian-uri' && !settings.vaultName) {
    showStatus('Set vault name in Settings first', 'error');
    return;
  }

  currentClip.title = noteNameInput.value;
  const folderVal = folderPathInput.value.trim();
  if (folderVal !== settings.folderPath) {
    settings.folderPath = folderVal;
    await saveSettings({ folderPath: folderVal });
  }

  btnClip.setAttribute('disabled', 'true');
  showStatus('Sending to Obsidian...', 'info');

  const overrideSettings = { ...settings, deliveryMethod: deliveryMethod as ClipperSettings['deliveryMethod'] };
  const result = await deliverToObsidian(currentClip, overrideSettings);

  if (result.success) {
    const methodLabel = result.method === 'obsidian-uri' ? 'Added to Obsidian' :
                        result.method === 'clipboard' ? 'Copied to clipboard' : 'Downloaded .md file';
    showStatus(methodLabel, 'success');
  } else {
    showStatus(`Failed: ${result.error}`, 'error');
  }
  btnClip.removeAttribute('disabled');
}

// ── Events ──
btnClip.addEventListener('click', () => handleClip());

btnClipDropdown.addEventListener('click', () => {
  clipDropdownMenu.classList.toggle('hidden');
});

clipDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const itemMethod = (item as HTMLElement).dataset.method!;
    clipDropdownMenu.classList.add('hidden');
    handleClip(itemMethod);
  });
});

document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('.btn-clip-dropdown') && !(e.target as Element).closest('.dropdown-menu')) {
    clipDropdownMenu.classList.add('hidden');
  }
});

btnSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
btnRefresh.addEventListener('click', () => extractEmail());
templateSelect.addEventListener('change', () => processEmail());

toggleProperties.addEventListener('click', () => {
  toggleProperties.classList.toggle('expanded');
  propertiesList.classList.toggle('hidden');
});

noteNameInput.addEventListener('input', () => autoResizeTextarea(noteNameInput));

btnSaveVault.addEventListener('click', async () => {
  const vaultName = vaultNameQuick.value.trim();
  if (!vaultName) { showStatus('Vault name required', 'error'); return; }
  const folderPath = folderPathQuick.value.trim() || 'Emails';
  await saveSettings({ vaultName, folderPath });
  settings = await loadSettings();
  showStatus('Vault configured!', 'success');
  await extractEmail();
});

async function init() {
  settings = await loadSettings();
  templates = await loadTemplates();
  populateTemplates();

  if (!settings.vaultName) { showView('vault-setup'); return; }
  await extractEmail();
}

init();
