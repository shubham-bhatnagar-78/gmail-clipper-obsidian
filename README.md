# Gmail Clipper for Obsidian

A Chrome extension that clips Gmail emails to your Obsidian vault in rich Markdown format — preserving formatting, images, links, attachments, and thread structure.

Built as a Gmail-specific alternative to the [official Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper), which uses generic article extraction that doesn't work well with email content.

![Chrome](https://img.shields.io/badge/Chrome-Manifest_V3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Why This Exists

The official Obsidian Web Clipper uses Readability (article extraction) which strips Gmail's email UI instead of extracting the email body. Existing Gmail-to-Obsidian tools only export plain text. This extension preserves the full rich content:

| Feature | Official Clipper | Gmail2Obsidian | This Extension |
|---------|-----------------|----------------|----------------|
| Rich formatting | Generic extraction | Plain text | Full email HTML → Markdown |
| Images | Stripped | Skipped | Preserved with alt text |
| Tables | Broken | Skipped | Layout tables collapsed, data tables preserved |
| Links | May break | Plain text | Tracking URLs unwrapped to real destinations |
| Attachments | No | No | Listed with filenames and sizes |
| Thread structure | No | Flat | Each message separated with sender/date headers |
| Gmail quotes | Stripped | Flat | Obsidian collapsible callouts |
| Frontmatter | Generic | Basic | Configurable YAML (from, to, date, subject, labels) |

## Installation

### From Source

```bash
git clone https://github.com/shubham-bhatnagar-78/gmail-clipper-obsidian.git
cd gmail-clipper-obsidian
npm install
npm run build
```

Then load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### First Run

1. Click the extension icon on any Gmail page
2. Enter your Obsidian **vault name** (must match exactly)
3. Set a folder path (default: `Emails`)
4. Open an email and click the extension icon to clip

## Usage

1. Open any email in Gmail
2. Click the extension icon or press `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows)
3. Review the note name, properties, and content preview
4. Click **Add to Obsidian**

### Delivery Methods

- **Obsidian URI** (default) — Opens Obsidian directly and creates the note
- **Copy to clipboard** — Copies markdown, paste manually into Obsidian
- **Download .md file** — Downloads a `.md` file you can move to your vault

Use the dropdown arrow on the "Add to Obsidian" button to switch methods.

## Output Format

```markdown
---
clipped: 2026-06-03
type: email
source: gmail
from: Justin Welsh <justin@justinwelsh.me>
to:
  - "you@example.com"
date: Jun 3, 2026, 10:00 AM
subject: Day 1 of 21 The Easiest Online Store You'll Ever Build
labels:
  - "Newsletters"
---

Hi Shubham,

Today we're doing something that's fundamental but extremely important: **setting up your store.**

Here's the good news — you don't need a fancy custom website...

People inside of this challenge are finally getting over the hump of starting their store by [using Stan](https://join.stan.store/justinwelsh)...

![image9](https://assets.stanwith.me/.../image9.png)

### The Only Things That Matter

When it comes to setting up your store...
```

### What Gets Preserved

- **Bold**, *italic*, ~~strikethrough~~, ==highlights==, `code`
- Links with tracking URL unwrapping (AWS, Google, generic redirects)
- Images with alt text fallback from filename
- Tables (layout tables collapsed, data tables as GFM)
- Blockquotes → Obsidian `> [!quote]` callouts
- Gmail quoted replies → collapsible callouts
- Attachments → `> [!paperclip]` callout with filenames
- Thread messages → `> [!email]` callouts with sender/date

## Configuration

Open extension settings (`chrome://extensions` → Gmail Clipper → Details → Extension options):

| Setting | Default | Description |
|---------|---------|-------------|
| Vault name | *(required)* | Your Obsidian vault name |
| Folder path | `Emails` | Where clipped notes are saved |
| Filename template | `{{subject}}` | Note naming pattern |
| Date format | `YYYY-MM-DD HH:mm` | Date display format |
| Delivery method | Obsidian URI | How to send to Obsidian |
| Include attachments | Yes | List attachments in the note |
| Image handling | Keep as links | How to handle inline images |
| Thread separator | `---` | Separator between thread messages |

### Template Variables

Use in filename template and property values:

| Variable | Value |
|----------|-------|
| `{{subject}}` | Email subject line |
| `{{from}}` | Sender name and email |
| `{{from_name}}` | Sender name only |
| `{{from_email}}` | Sender email only |
| `{{to}}` | Recipients |
| `{{cc}}` | CC recipients |
| `{{date}}` | Email date |
| `{{date_iso}}` | ISO 8601 date |
| `{{labels}}` | Gmail labels |
| `{{participants}}` | All thread participants |
| `{{message_count}}` | Number of messages in thread |
| `{{url}}` | Gmail URL |

## Development

```bash
npm run dev       # Watch mode (rebuilds on changes)
npm run build     # Production build
npm run build:dev # Development build
npm run lint      # TypeScript type check
```

### Project Structure

```
src/
├── content.ts                # Gmail DOM extraction (injected into Gmail)
├── background.ts             # Service worker (script injection, downloads)
├── core/
│   ├── popup.ts              # Extension popup UI
│   └── settings.ts           # Settings page
├── utils/
│   ├── gmail-extractor.ts    # Email extraction with multi-fallback selectors
│   ├── gmail-selectors.ts    # Gmail DOM selector candidates
│   ├── markdown-converter.ts # Turndown + custom email conversion rules
│   ├── obsidian-delivery.ts  # Obsidian URI / clipboard / download delivery
│   └── storage.ts            # Chrome storage for settings
├── styles/
│   ├── popup.scss            # Popup styling (matches Obsidian theme)
│   └── settings.scss         # Settings page styling
├── types/
│   └── email.ts              # TypeScript interfaces
├── manifest.json             # Chrome Manifest V3
├── popup.html                # Popup markup
└── settings.html             # Settings markup
```

### Tech Stack

- **TypeScript** + **Webpack** — Build system
- **Turndown** + **turndown-plugin-gfm** — HTML to Markdown conversion
- **DOMPurify** — HTML sanitization
- **dayjs** — Date formatting
- **webextension-polyfill** — Cross-browser compatibility

## Known Limitations

- Gmail uses obfuscated CSS class names that may change between versions. The extension uses multiple fallback selectors, but a Gmail update could temporarily break extraction.
- Inline images are kept as external URLs (not downloaded to vault). Gmail proxies images through `googleusercontent.com`.
- The extension only works on `mail.google.com` — not the Gmail mobile app or desktop clients.
- Content scripts need to be re-injected after extension updates (refresh the Gmail tab).

## License

MIT
