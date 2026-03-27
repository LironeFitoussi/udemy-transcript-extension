/**
 * UDEMY TRANSCRIPT COPIER - Content Script
 * Injected into Udemy lesson pages
 */

// Configuration
const CONFIG = {
  TRANSCRIPT_SELECTOR: '[data-purpose="transcript-panel"]',
  CONTROL_BAR_SELECTOR: '[data-purpose="video-controls"]',
  FULLSCREEN_BTN_SELECTOR: 'button[data-purpose="theatre-mode-toggle-button"]',
  EXTENSION_ID: 'udemy-transcript-copier'
};

// Default user preferences
const DEFAULT_PREFS = {
  format: 'plain',        // 'plain' | 'markdown' | 'json'
  includeMetadata: false, // prepend course/lesson title + date
};

/**
 * Load user preferences from chrome.storage.sync
 * @returns {Promise<object>} User preferences
 */
function loadPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_PREFS, (prefs) => {
      resolve(prefs);
    });
  });
}

/**
 * Extract transcript text from the page.
 * Targets [data-purpose="cue-text"] spans inside [data-purpose="transcript-panel"].
 * @returns {string|null} Transcript text or null if not found
 */
function getTranscriptText() {
  // Method 1: Direct — the transcript panel has a stable data-purpose attribute
  const transcriptPanel = document.querySelector('[data-purpose="transcript-panel"]');

  if (transcriptPanel) {
    // Collect each cue-text span and join with spaces
    const cues = Array.from(transcriptPanel.querySelectorAll('[data-purpose="cue-text"]'));
    if (cues.length > 0) {
      return cues.map(cue => cue.innerText.trim()).filter(Boolean).join(' ');
    }
    // Fallback: just use innerText of the whole panel
    const raw = transcriptPanel.innerText?.trim();
    if (raw?.length > 50) return raw;
  }

  // Method 2: Find sidebar content area by data-purpose="sidebar-content"
  // and look for transcript cues inside it
  const sidebarContent = document.querySelector('[data-purpose="sidebar-content"]');
  if (sidebarContent) {
    const cues = Array.from(sidebarContent.querySelectorAll('[data-purpose="cue-text"]'));
    if (cues.length > 0) {
      return cues.map(cue => cue.innerText.trim()).filter(Boolean).join(' ');
    }
  }

  console.warn('[UTC] Transcript panel not found');
  return null;
}

/**
 * Get lesson and course metadata from the page
 * @returns {{ lessonTitle: string, courseTitle: string, timestamp: string }}
 */
function getMetadata() {
  const lessonTitle = document.querySelector('h1')?.innerText?.trim() || 'Unknown Lesson';
  const courseTitle = document.querySelector('a[href*="/course/"]')?.innerText?.trim() || 'Unknown Course';
  const timestamp = new Date().toLocaleString();
  return { lessonTitle, courseTitle, timestamp };
}

/**
 * Format transcript text according to user preferences
 * @param {string} text - Raw transcript text
 * @param {object} prefs - User preferences
 * @returns {string} Formatted text
 */
function formatTranscript(text, prefs) {
  let output = text;

  if (prefs.format === 'markdown') {
    const meta = prefs.includeMetadata ? getMetadata() : null;
    const heading = meta
      ? `## ${meta.lessonTitle}\n_${meta.courseTitle} — ${meta.timestamp}_\n\n`
      : '';
    output = `${heading}${text}`;
  } else if (prefs.format === 'json') {
    const meta = getMetadata();
    output = JSON.stringify({
      transcript: text,
      lessonTitle: meta.lessonTitle,
      courseTitle: prefs.includeMetadata ? meta.courseTitle : undefined,
      timestamp: prefs.includeMetadata ? meta.timestamp : undefined,
    }, null, 2);
  } else {
    // plain text
    if (prefs.includeMetadata) {
      const meta = getMetadata();
      output = `COURSE: ${meta.courseTitle}\nLESSON: ${meta.lessonTitle}\nDATE: ${meta.timestamp}\n---\n\n${text}`;
    }
  }

  return output;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('[UTC] Clipboard write failed:', err);
    return false;
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 * @param {number} duration - Duration in ms (default 3000)
 */
function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `${CONFIG.EXTENSION_ID}-notification ${CONFIG.EXTENSION_ID}-${type}`;
  notification.innerHTML = `
    <div class="utc-notification-content">
      <span>${escapeHtml(message)}</span>
      <button class="utc-notification-close" aria-label="Close notification">✕</button>
    </div>
  `;

  document.body.appendChild(notification);

  notification.querySelector('.utc-notification-close').addEventListener('click', () => {
    notification.remove();
  });

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);
}

/**
 * Handle copy transcript button click
 */
async function handleCopyTranscript() {
  const rawText = getTranscriptText();

  if (!rawText) {
    showNotification(
      'Transcript not found. Please open the transcript panel first.',
      'error'
    );
    return;
  }

  const prefs = await loadPrefs();
  const formattedText = formatTranscript(rawText, prefs);
  const success = await copyToClipboard(formattedText);

  if (success) {
    const formatLabel = prefs.format === 'plain' ? 'Plain text' : prefs.format === 'markdown' ? 'Markdown' : 'JSON';
    showNotification(
      `✓ Transcript copied! (${rawText.length} chars · ${formatLabel})`,
      'success',
      2500
    );
  } else {
    showNotification(
      'Failed to copy transcript. Please try again.',
      'error'
    );
  }
}

/**
 * Create the "Copy Transcript" button wrapped in the same popper div
 * structure that all other control bar buttons use.
 * @returns {HTMLDivElement} The outer popper wrapper (direct child of control bar)
 */
function createCopyButton() {
  // Outer wrapper — matches every other button's container in the control bar
  const wrapper = document.createElement('div');
  wrapper.id = `${CONFIG.EXTENSION_ID}-wrapper`;
  wrapper.className = 'popper-module--popper--mM5Ie';

  // Button — exact same classes as the other control bar buttons (e.g. transcript-toggle)
  const button = document.createElement('button');
  button.id = `${CONFIG.EXTENSION_ID}-btn`;
  button.setAttribute('type', 'button');
  button.setAttribute('tabindex', '0');
  button.className = 'ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4';

  // SVG icon — matches the ud-icon style of sibling buttons
  button.innerHTML = `
    <svg aria-label="Copy transcript" role="img" focusable="false" class="ud-icon ud-icon-medium" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/>
    </svg>
  `;

  button.addEventListener('click', handleCopyTranscript);
  wrapper.appendChild(button);

  return wrapper;
}

let injectRetryCount = 0;
const MAX_RETRIES = 20;

/**
 * Inject the button into the control bar
 */
function injectButton() {
  // Already injected
  if (document.getElementById(`${CONFIG.EXTENSION_ID}-btn`)) {
    return;
  }

  const controlBar = document.querySelector(CONFIG.CONTROL_BAR_SELECTOR);

  if (!controlBar) {
    if (injectRetryCount < MAX_RETRIES) {
      injectRetryCount++;
      setTimeout(injectButton, 500);
    } else {
      console.warn('[UTC] Control bar not found after max retries');
    }
    return;
  }

  injectRetryCount = 0;

  // Find insertion point: before the theatre-mode (Expanded view) button's popper wrapper.
  // All buttons in the control bar are direct children wrapped in popper divs, so we
  // insert our wrapper div at the same level.
  const theatreBtn = controlBar.querySelector(CONFIG.FULLSCREEN_BTN_SELECTOR);

  if (theatreBtn) {
    // theatreBtn is the <button> — its parent is the popper wrapper div, which is a direct
    // child of the control bar. Insert our wrapper before that popper div.
    const theatreWrapper = theatreBtn.closest('[class*="popper-module--popper"]') || theatreBtn.parentElement;
    controlBar.insertBefore(createCopyButton(), theatreWrapper);
  } else {
    // Fallback: insert before the last child of the control bar
    controlBar.insertBefore(createCopyButton(), controlBar.lastElementChild);
  }

  console.log('[UTC] Copy Transcript button injected');
}

/**
 * Initialize extension
 */
function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  // Re-inject if SPA navigation removes the button
  const observer = new MutationObserver(() => {
    if (!document.getElementById(`${CONFIG.EXTENSION_ID}-btn`)) {
      injectButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });
}

// Start extension
if (window.location.hostname.includes('udemy.com')) {
  init();
}
