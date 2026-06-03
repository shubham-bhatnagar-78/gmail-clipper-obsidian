import browser from './browser-polyfill';
import type { ClipperSettings, Template } from '../types/email';

const DEFAULT_SETTINGS: ClipperSettings = {
  vaultName: '',
  folderPath: 'Emails',
  templateId: 'default',
  includeAttachmentList: true,
  threadSeparator: '---',
  dateFormat: 'YYYY-MM-DD HH:mm',
  filenameTemplate: '{{subject}}',
  deliveryMethod: 'obsidian-uri',
  imageHandling: 'link',
  properties: [
    { name: 'from', value: '{{from}}', type: 'text' },
    { name: 'to', value: '{{to}}', type: 'list' },
    { name: 'date', value: '{{date}}', type: 'date' },
    { name: 'subject', value: '{{subject}}', type: 'text' },
    { name: 'labels', value: '{{labels}}', type: 'list' },
  ],
};

const DEFAULT_TEMPLATE: Template = {
  id: 'default',
  name: 'Default',
  noteNameFormat: '{{subject}}',
  folderPath: 'Emails',
  properties: DEFAULT_SETTINGS.properties,
  bodyTemplate: '{{content}}',
};

export async function loadSettings(): Promise<ClipperSettings> {
  const data = await browser.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

export async function saveSettings(settings: Partial<ClipperSettings>): Promise<void> {
  const current = await loadSettings();
  await browser.storage.sync.set({ settings: { ...current, ...settings } });
}

export async function loadTemplates(): Promise<Template[]> {
  const data = await browser.storage.sync.get('templates');
  return (data.templates as Template[] | undefined) || [DEFAULT_TEMPLATE];
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await browser.storage.sync.set({ templates });
}

export async function getActiveTemplate(): Promise<Template> {
  const settings = await loadSettings();
  const templates = await loadTemplates();
  return templates.find(t => t.id === settings.templateId) || templates[0];
}

export { DEFAULT_SETTINGS, DEFAULT_TEMPLATE };
