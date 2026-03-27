# Privacy Policy — Udemy Transcript Copier

**Last updated: March 2026**

## Summary

Udemy Transcript Copier does not collect, store, or transmit any personal data. It operates entirely on your local device.

## Data Collection

This extension collects **no data** of any kind. Specifically:

- No transcript content is stored or sent anywhere
- No usage analytics or telemetry are collected
- No personal information (name, email, account details) is accessed
- No cookies are set or read
- No network requests are made by this extension

## Permissions Used

| Permission | Purpose |
|------------|---------|
| `clipboard-write` | Write transcript text to your clipboard when you click the copy button |
| `storage` | Save your copy format preference (plain/markdown/JSON) locally in Chrome |
| `host_permissions` for `udemy.com` | Inject the copy button into Udemy lecture pages |

## Local Storage

The only data stored locally (via `chrome.storage.sync`) is your format preference:
- `format`: `"plain"`, `"markdown"`, or `"json"`
- `includeMetadata`: `true` or `false`

This data never leaves your device and is only used to remember your settings.

## Contact

For questions or concerns, open an issue at:
https://github.com/LironeFitoussi/udemy-transcript-extension/issues
