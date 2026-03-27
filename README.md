# Udemy Transcript Copier

A lightweight Chrome extension that adds a **Copy Transcript** button directly to the Udemy video player controls. Copy the full lesson transcript to your clipboard with a single click.

## Features

- **One-click copy** — clipboard button sits inline with the other player controls
- **Format options** — Plain text, Markdown, or JSON
- **Metadata toggle** — optionally prepend course title, lesson title, and date
- **SPA-aware** — button re-injects automatically when navigating between lectures
- **Privacy-first** — no data leaves your browser, no tracking, no analytics

## Installation

### From Chrome Web Store *(coming soon)*

Search for **Udemy Transcript Copier** in the [Chrome Web Store](https://chrome.google.com/webstore).

### Manual (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the extension folder
5. Navigate to any Udemy lecture — the clipboard icon will appear in the player controls

> **Note:** You need to generate the icons first if installing from source. Open `generate-icons.html` in Chrome, click **Download All Icons**, and place the downloaded PNGs in the `icons/` folder.

## Usage

1. Open any Udemy lecture with a transcript
2. Make sure the **Transcript** panel is open in the sidebar
3. Click the clipboard icon (📋) in the video player controls
4. The transcript is now in your clipboard — paste anywhere

### Settings

Click the extension icon in the Chrome toolbar to open settings:

| Option | Description |
|--------|-------------|
| **Plain text** | Clean continuous text (default) |
| **Markdown** | Formatted with heading and metadata |
| **JSON** | Structured object for API/tool use |
| **Include lesson & course title** | Prepends metadata to the copied text |

## File Structure

```
udemy-transcript-extension/
├── manifest.json          — Chrome Manifest V3 config
├── content.js             — Content script (button injection + transcript extraction)
├── styles.css             — Toast notification styles
├── popup.html             — Settings panel UI
├── popup.js               — Settings load/save logic
├── generate-icons.html    — Dev tool: generates PNG icons via canvas
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Chromium-based browsers: Edge, Brave, Opera

## Privacy

- No data is transmitted to any server
- Transcript text is only copied to your local clipboard
- No personal data is collected or stored
- No background service worker

## License

MIT
