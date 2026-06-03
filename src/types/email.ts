export interface EmailMessage {
  id: string;
  subject: string;
  from: EmailContact;
  to: EmailContact[];
  cc: EmailContact[];
  bcc: EmailContact[];
  date: string;
  dateISO: string;
  bodyHtml: string;
  bodyText: string;
  attachments: EmailAttachment[];
  labels: string[];
  isStarred: boolean;
  messageId: string;
}

export interface EmailContact {
  name: string;
  email: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: string;
  downloadUrl?: string;
}

export interface EmailThread {
  subject: string;
  messages: EmailMessage[];
  labels: string[];
  participants: EmailContact[];
  messageCount: number;
}

export interface ClipResult {
  markdown: string;
  frontmatter: Record<string, unknown>;
  title: string;
  attachments: EmailAttachment[];
}

export interface ClipperSettings {
  vaultName: string;
  folderPath: string;
  templateId: string;
  includeAttachmentList: boolean;
  threadSeparator: string;
  dateFormat: string;
  filenameTemplate: string;
  deliveryMethod: 'obsidian-uri' | 'clipboard' | 'file-download';
  imageHandling: 'link' | 'skip';
  properties: PropertyConfig[];
}

export interface PropertyConfig {
  name: string;
  value: string;
  type: 'text' | 'date' | 'list' | 'checkbox';
}

export interface Template {
  id: string;
  name: string;
  noteNameFormat: string;
  folderPath: string;
  properties: PropertyConfig[];
  bodyTemplate: string;
}
