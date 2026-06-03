<div align="center">

# Gmail Clipper for Obsidian

**Clip Gmail emails to Obsidian in rich Markdown — images, formatting, threads, and all.**

The missing bridge between your inbox and your second brain.

[![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Webpack](https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack&logoColor=black)](https://webpack.js.org/)
[![Obsidian](https://img.shields.io/badge/Obsidian-Compatible-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<br>

[**Install**](#installation) · [**Features**](#features) · [**Comparison**](#how-it-compares) · [**Configuration**](#configuration) · [**Contributing**](#contributing)

</div>

---

## The Problem

You want to save important emails to Obsidian. But nothing works properly:

- **Official Obsidian Web Clipper** — **does not work on Gmail.** It uses Readability (designed for articles), which cannot parse Gmail's dynamic SPA interface. On Gmail, it either captures the entire inbox UI, returns garbage, or fails to extract any content at all. It was never built for email.
- **Gmail2Obsidian** and **Gmail → Obsidian** — export plain text only. No bold, no images, no tables, no links. Formatting is completely lost.
- **obsidian-google-mail** — requires OAuth + Google Cloud Console setup, and its own README warns *"some emails may seem weird."*

There is no good way to get a properly formatted email from Gmail into Obsidian. Until now.

## The Solution

Gmail Clipper extracts email content directly from Gmail's DOM with 10+ custom Turndown rules built specifically for email HTML. Layout tables get collapsed (not converted to broken GFM tables). Tracking URLs get unwrapped. Images get preserved. Gmail quotes become collapsible Obsidian callouts.

**Zero OAuth. Zero API keys. Just install and clip.**

## Features

- **Rich Markdown** — Bold, italic, strikethrough, highlights (`==text==`), code blocks, headings
- **Images** — Preserved with alt text fallback from filename. Tracking pixels auto-removed
- **Links** — Tracking URL unwrapping for AWS SES, Google, Mailchimp, and generic redirects
- **Tables** — Email layout tables collapsed to content; actual data tables kept as GFM
- **Attachments** — Listed as Obsidian `> [!paperclip]` callouts with filenames and sizes
- **Threads** — Each message gets its own `> [!email]` callout with sender, recipients, and timestamp
- **Gmail Quotes** — Collapsed into `> [!quote]` callouts (not stripped, not flattened)
- **YAML Frontmatter** — Configurable properties: from, to, cc, date, subject, labels, attachments
- **13 Template Variables** — `{{subject}}`, `{{from}}`, `{{date}}`, `{{labels}}`, and more
- **3 Delivery Methods** — Obsidian URI (direct), clipboard, or `.md` file download
- **Keyboard Shortcut** — `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows)
- **Dark UI** — Matches Obsidian's aesthetic, mirrors official Web Clipper layout

---

## How It Compares

### Content Quality

> **Note:** The Official Obsidian Web Clipper does not properly support Gmail. Gmail is a single-page application with dynamically rendered content — Readability-based extraction either captures the inbox chrome, returns broken output, or extracts nothing. All "Official Clipper" ratings below reflect this fundamental incompatibility.

| What gets preserved | Gmail Clipper | Official Clipper | Gmail→Obsidian | Gmail2Obsidian | obsidian-google-mail |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Works on Gmail** | ✅ | ❌ Not designed for email | ✅ | ✅ | ✅ |
| **Bold, italic, formatting** | ✅ Full | ❌ Fails to extract | ❌ Plain text | ❌ Plain text | ⚠️ Partial |
| **Images** | ✅ + alt fallback | ❌ | ❌ | ❌ | ❌ |
| **Email tables** | ✅ Smart handling | ❌ | ❌ | ❌ | ⚠️ "May seem weird" |
| **Links** | ✅ Unwrapped | ❌ | ❌ | ❌ | ❌ |
| **Attachments** | ✅ Listed | ❌ | ❌ | ❌ | ❌ |
| **Highlighted text** | ✅ `==text==` | ❌ | ❌ | ❌ | ❌ |
| **Tracking pixel removal** | ✅ | ❌ | ❌ | ❌ | ❌ |

### Email-Specific Features

| Feature | Gmail Clipper | Official Clipper | Gmail→Obsidian | Gmail2Obsidian | obsidian-google-mail |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Thread structure** | ✅ Per-message | ❌ N/A | ⚠️ Expanded only | ⚠️ Expanded only | ⚠️ Label-based |
| **Gmail quotes** | ✅ Collapsible callouts | ❌ N/A | ❌ Flat | ❌ Flat | ❌ |
| **Tracking URL unwrap** | ✅ AWS/Google/generic | ❌ N/A | ❌ | ❌ | ❌ |
| **YAML frontmatter** | ✅ Full email metadata | ❌ N/A | ❌ None | ⚠️ Basic | ⚠️ Labels only |
| **Configurable properties** | ✅ | ❌ N/A | ❌ | ❌ | ❌ |

### Setup & Compatibility

| | Gmail Clipper | Official Clipper | Gmail→Obsidian | Gmail2Obsidian | obsidian-google-mail |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Works on Gmail** | ✅ Built for it | ❌ Not compatible | ✅ | ✅ | ✅ |
| **Needs OAuth** | ❌ | ❌ | ❌ | ❌ | ✅ Google Cloud |
| **Needs API key** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delivery options** | 3 methods | 2 methods | 1 method | 1 method | Direct |
| **Platform** | Chrome | Multi-browser | Chrome | Chrome | Obsidian plugin |

---

## Installation

```bash
git clone https://github.com/shubham-bhatnagar-78/gmail-clipper-obsidian.git
cd gmail-clipper-obsidian
npm install
npm run build
```

Then load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder

### First Run

1. Click the extension icon on any Gmail page
2. Enter your Obsidian **vault name** (must match exactly)
3. Set a folder path (default: `Emails`)
4. Open an email → click the extension icon → **Add to Obsidian**

---

## Usage

1. **Open** any email in Gmail
2. **Click** the extension icon or press `Cmd+Shift+E` / `Ctrl+Shift+E`
3. **Review** the note name, properties, and content preview
4. **Click** "Add to Obsidian" (or use the dropdown for clipboard / .md download)

### Delivery Methods

| Method | How it works |
|--------|-------------|
| **Obsidian URI** *(default)* | Copies markdown to clipboard, opens `obsidian://new` — note appears in your vault |
| **Clipboard** | Copies markdown to clipboard for manual paste |
| **File download** | Downloads a `.md` file you can move to your vault folder |

---

## Output Format

### Single Email

```markdown
---
clipped: 2024-01-15
type: email
source: gmail
from: Alice Johnson <alice@example.com>
to:
  - "bob@example.com"
date: Jan 15, 2024, 9:30 AM
subject: Weekly Project Update
labels:
  - "Work"
  - "Projects"
attachments:
  - "report-q4.pdf"
  - "slides.pptx"
---

Hi Bob,

Here's the weekly update on **Project Atlas**:

### Progress

- Completed the migration to the new API
- Performance improved by [40% across all endpoints](https://dashboard.example.com/metrics)
- Design review scheduled for Thursday

![architecture-diagram](https://example.com/images/architecture-v2.png)

### Next Steps

1. Finalize the ==database schema changes==
2. Run load tests on staging
3. Update documentation

Let me know if you have questions.

Best,
Alice

> [!paperclip] Attachments
> - report-q4.pdf *(2.4 MB)*
> - slides.pptx *(1.1 MB)*
```

### Thread (Multiple Messages)

```markdown
---
clipped: 2024-01-15
type: email
source: gmail
from: Alice Johnson <alice@example.com>
to:
  - "team@example.com"
date: Jan 15, 2024, 9:30 AM
subject: Re: Launch Timeline
labels:
  - "Work"
---

> [!email] **Alice Johnson** `alice@example.com` — Jan 15, 2024, 9:30 AM
> **To:** **Team** `team@example.com`

Sounds good — let's target Friday for the soft launch.

I'll prepare the rollback plan tonight.

---

> [!email] **Bob Chen** `bob@example.com` — Jan 15, 2024, 8:45 AM
> **To:** **Team** `team@example.com`

All tests passing on staging. Green light from QA.

> [!quote]- Quoted text
> Can we move the launch to this week?
> We're ahead of schedule.
```

### What Gets Preserved

| Element | Markdown Output |
|---------|----------------|
| Bold / italic | `**bold**` / `*italic*` |
| Strikethrough | `~~text~~` |
| Highlights | `==highlighted==` |
| Links | `[text](unwrapped-url)` |
| Images | `![alt-from-filename](url)` |
| Code | `` `inline` `` and fenced blocks |
| Blockquotes | `> quoted text` |
| Gmail quotes | `> [!quote]- Quoted text` (collapsible) |
| Attachments | `> [!paperclip]` callout |
| Thread messages | `> [!email]` callout with metadata |
| Layout tables | Collapsed to content |
| Data tables | GFM table syntax |

---

## Configuration

Open settings via the gear icon in the popup, or `chrome://extensions` → Gmail Clipper → Extension options.

### General Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Vault name | *(required)* | Must match your Obsidian vault name exactly |
| Folder path | `Emails` | Subfolder in vault for clipped emails |
| Filename template | `{{subject}}` | Note naming pattern |
| Date format | `YYYY-MM-DD HH:mm` | Timestamp format in frontmatter |
| Delivery method | Obsidian URI | How notes reach your vault |
| Include attachments | Yes | Show attachment list in the note |
| Image handling | Keep as links | How inline images are handled |
| Thread separator | `---` | Divider between thread messages |

### Template Variables

Use these in filename templates and property values:

| Variable | Example Output |
|----------|---------------|
| `{{subject}}` | Weekly Project Update |
| `{{from}}` | Alice Johnson \<alice@example.com\> |
| `{{from_name}}` | Alice Johnson |
| `{{from_email}}` | alice@example.com |
| `{{to}}` | bob@example.com |
| `{{cc}}` | carol@example.com |
| `{{date}}` | Jan 15, 2024, 9:30 AM |
| `{{date_iso}}` | 2024-01-15T09:30:00.000Z |
| `{{labels}}` | Work, Projects |
| `{{participants}}` | Alice, Bob, Carol |
| `{{message_count}}` | 3 |
| `{{url}}` | https://mail.google.com/mail/u/0/#inbox/... |

---

## Development

```bash
npm run dev       # Watch mode — rebuilds on file changes
npm run build     # Production build (minified)
npm run build:dev # Development build (source maps)
npm run lint      # TypeScript type checking
```

### Architecture

```
src/
├── content.ts                # Injected into Gmail — extracts email DOM
├── background.ts             # Service worker — script injection, file downloads
├── core/
│   ├── popup.ts              # Extension popup UI (mirrors official clipper layout)
│   └── settings.ts           # Settings page logic
├── utils/
│   ├── gmail-extractor.ts    # Multi-fallback DOM extraction engine
│   ├── gmail-selectors.ts    # Gmail selector candidates (resilient to class name changes)
│   ├── markdown-converter.ts # Turndown + 10 custom rules for email HTML
│   ├── obsidian-delivery.ts  # 3-tier delivery: URI → clipboard → file download
│   └── storage.ts            # Chrome storage abstraction
├── styles/
│   ├── popup.scss            # Dark theme matching Obsidian
│   └── settings.scss         # Settings page styles
├── types/
│   └── email.ts              # TypeScript interfaces
├── manifest.json             # Chrome Manifest V3
├── popup.html                # Popup markup
└── settings.html             # Settings markup
```

### Tech Stack

| Technology | Purpose |
|-----------|---------|
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Webpack 5](https://webpack.js.org/) | Bundling and build |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown conversion |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | GFM tables and strikethrough |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitization |
| [dayjs](https://day.js.org/) | Date formatting |
| [webextension-polyfill](https://github.com/nicolo-ribaudo/webextension-polyfill) | Cross-browser API compatibility |

### How Extraction Works

1. **Content script** injects into Gmail and listens for extraction requests
2. **Multi-fallback selectors** try 5-8 CSS selector candidates per element (Gmail obfuscates class names)
3. **DOMPurify** sanitizes extracted HTML — whitelisted tags and attributes only
4. **Turndown** converts sanitized HTML to Markdown with custom rules:
   - Layout tables → collapsed to content (emails use `<table>` for layout)
   - Tracking URLs → unwrapped to real destinations
   - Tracking pixels → filtered (1x1 images)
   - Styled spans → Markdown formatting (`**bold**`, `*italic*`, `==highlight==`)
   - Gmail quotes → Obsidian collapsible callouts
   - Empty headings and orphan UI text → stripped
5. **YAML frontmatter** built from configurable property templates
6. **Delivery** via `obsidian://new` URI, clipboard, or `.md` file download

---

## Roadmap

- [ ] **Chrome Web Store release** — Publish for one-click install
- [ ] **Firefox support** — Manifest + polyfill adjustments
- [ ] **Download images to vault** — Save inline images as local files
- [ ] **Batch clip** — Clip multiple selected emails at once
- [ ] **Custom templates** — Multiple save formats (meeting notes, newsletter, receipt)
- [ ] **Obsidian plugin companion** — Two-way sync with Gmail labels
- [ ] **Search & clip** — Search Gmail from the extension and clip results

Have an idea? [Open an issue](https://github.com/shubham-bhatnagar-78/gmail-clipper-obsidian/issues).

---

## Known Limitations

- **Gmail class names change** — Gmail uses obfuscated CSS selectors that may change between updates. The extension uses multi-fallback selector candidates to stay resilient, but a major Gmail redesign could temporarily break extraction.
- **Images stay as URLs** — Inline images are kept as external links (not downloaded into vault). Gmail proxies most images through `googleusercontent.com`.
- **Chrome only** — Currently built for Chrome / Chromium browsers. Firefox and Safari support is possible with minor manifest changes.
- **Requires page refresh after updates** — Content scripts need to be re-injected after extension updates. Just refresh the Gmail tab.

---

## Contributing

Contributions welcome! Whether it's bug fixes, new features, or improved Gmail selector coverage.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/gmail-clipper-obsidian.git
cd gmail-clipper-obsidian
npm install
npm run dev  # Start development with watch mode
```

If Gmail changes their DOM and extraction breaks, the fix is usually in `src/utils/gmail-selectors.ts` — add the new selector as a candidate and it'll be tried automatically.

---

## License

[MIT](LICENSE) — use it, fork it, ship it.

---

<div align="center">

**If this extension saves you time, consider giving it a ⭐**

Built for the [Obsidian](https://obsidian.md/) community.

</div>
