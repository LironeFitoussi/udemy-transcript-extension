# Udemy Transcript Copier

> Copy any Udemy lesson transcript to your clipboard with a single click — no sidebar required.

A lightweight Chrome extension that adds a **clipboard button** directly into the Udemy video player controls. Click it and the full transcript is instantly fetched via Udemy's API and copied to your clipboard. No page manipulation, no sidebar toggling, no noise.

---

## Features

| | |
|---|---|
| **Instant copy** | Fetches transcript directly from Udemy's API in the background |
| **No sidebar needed** | Works whether the transcript panel is open or closed |
| **Loading spinner** | Button shows a spinner while fetching, prevents double-clicks |
| **Format options** | Plain text, Markdown, or JSON output |
| **Metadata toggle** | Optionally prepend course title, lesson title, and date |
| **SPA-aware** | Button re-injects automatically when navigating between lectures |
| **Privacy-first** | No data leaves your browser, no tracking, no analytics |

---

## Installation

### Chrome Web Store *(coming soon)*

Search **Udemy Transcript Copier** on the Chrome Web Store.

### Manual (Developer Mode)

1. [Download the ZIP](https://github.com/LironeFitoussi/udemy-transcript-extension/archive/refs/heads/main.zip) and extract it, or clone the repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the extracted folder
5. Navigate to any Udemy lecture — the clipboard icon appears in the player controls

> **First time from source:** Open `generate-icons.html` in Chrome, click **Download All Icons**, and move the 3 downloaded PNGs into the `icons/` folder before loading the extension.

---

## How It Works

1. Click the **clipboard icon** in the video player controls (sits inline next to Transcript, Captions, Settings)
2. The extension calls Udemy's internal API to fetch the caption VTT file for the current lecture
3. Timestamps are stripped — clean, readable text is copied to your clipboard
4. A toast notification confirms the copy with character count and format

No sidebar opening. No DOM scraping. No UI side effects.

---

## Settings

Click the extension icon in the Chrome toolbar to open the settings popup:

| Option | Description |
|--------|-------------|
| **Plain text** | Clean continuous prose (default) |
| **Markdown** | Adds `##` heading with optional metadata |
| **JSON** | Structured `{transcript, lessonTitle, courseTitle, timestamp}` object |
| **Include lesson & course title** | Prepends course name, lesson name, and date to the copied text |

Preferences are saved across sessions via `chrome.storage.sync`.

---

## Technical Details

- **Transcript source:** `GET /api-2.0/users/me/subscribed-courses/{courseId}/lectures/{lectureId}/?fields[lecture]=asset&fields[asset]=captions` — uses your existing browser session, no extra auth
- **Caption format:** WebVTT fetched from Udemy's CDN (pre-signed URL, no cookies needed)
- **Course/lecture IDs:** Extracted from `data-module-args` on the page (stable, works on SPA navigation)
- **English preference:** Selects `en_US` → any `en_*` locale → `video_label` containing "English" → first available
- **Fallback:** If the API fails, reads cue text directly from the open transcript sidebar DOM

---

## File Structure

```
udemy-transcript-extension/
├── manifest.json          — Chrome Manifest V3 config
├── content.js             — Content script: button injection, API fetch, clipboard
├── styles.css             — Toast notification + spinner styles
├── popup.html             — Settings panel UI
├── popup.js               — Settings load/save (chrome.storage.sync)
├── generate-icons.html    — Dev tool: generates PNG icons via canvas (not shipped)
├── store/
│   ├── description.txt    — Chrome Web Store listing text
│   └── privacy-policy.md  — Privacy policy
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

---

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Chromium-based: Edge, Brave, Opera

---

## Privacy

- All processing is local — no data is sent to any server
- Transcript text goes only to your clipboard
- No analytics, no telemetry, no background service worker
- Only permissions used: `clipboard-write` (copy to clipboard), `storage` (save format preference)

Full privacy policy: [store/privacy-policy.md](store/privacy-policy.md)

---

## Publishing to Chrome Web Store

1. Create a ZIP of: `manifest.json`, `content.js`, `styles.css`, `popup.html`, `popup.js`, `icons/`
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. **New Item** → upload ZIP
4. Use the description from [store/description.txt](store/description.txt)
5. Host [store/privacy-policy.md](store/privacy-policy.md) publicly and paste its URL
6. Add at least one 1280×800 screenshot of the button in the player
7. Submit for review (~1–3 business days)

---

## License

MIT
