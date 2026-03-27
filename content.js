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
 * Extract course ID from the page's data-module-args attribute.
 * @returns {string|null}
 */
function getCourseId() {
  const el = document.querySelector('[data-module-id="course-taking"]');
  if (!el) return null;
  try {
    const args = JSON.parse(el.getAttribute('data-module-args') || '{}');
    return args.courseId ? String(args.courseId) : null;
  } catch {
    return null;
  }
}

/**
 * Extract lecture ID — first from data-module-args (most reliable),
 * then fall back to the URL.
 * @returns {string|null}
 */
function getLectureId() {
  // data-module-args always has the current lecture id
  try {
    const el = document.querySelector('[data-module-id="course-taking"]');
    const args = JSON.parse(el?.getAttribute('data-module-args') || '{}');
    if (args.initialCurriculumItemId) return String(args.initialCurriculumItemId);
  } catch {}
  const match = window.location.pathname.match(/\/learn\/lecture\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Parse a WebVTT string into clean plain text (no timestamps, no cue IDs).
 * @param {string} vtt
 * @returns {string}
 */
function parseVtt(vtt) {
  return vtt
    .split('\n')
    .filter(line => {
      const t = line.trim();
      return t &&
        t !== 'WEBVTT' &&
        !t.includes('-->') &&       // timestamp lines
        !/^\d+$/.test(t) &&         // bare cue index numbers
        !t.startsWith('NOTE') &&
        !t.startsWith('STYLE') &&
        !t.startsWith('REGION');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch transcript via Udemy's API — no sidebar interaction needed.
 * Uses the browser's existing session cookies for auth.
 * @returns {Promise<string|null>}
 */
async function fetchTranscriptFromApi() {
  const courseId = getCourseId();
  const lectureId = getLectureId();

  if (!courseId || !lectureId) {
    console.warn('[UTC] Could not determine courseId or lectureId', { courseId, lectureId });
    return null;
  }

  // Step 1: get the captions array for this lecture
  const apiUrl = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lectureId}/?fields[lecture]=asset&fields[asset]=captions&page_size=100`;

  let captionsArr;
  try {
    const res = await fetch(apiUrl, { credentials: 'include' });
    if (!res.ok) {
      console.warn('[UTC] Lecture API returned', res.status);
      return null;
    }
    const data = await res.json();
    captionsArr = data?.asset?.captions;
  } catch (err) {
    console.warn('[UTC] Lecture API fetch failed', err);
    return null;
  }

  if (!Array.isArray(captionsArr) || captionsArr.length === 0) {
    console.warn('[UTC] No captions available for this lecture');
    return null;
  }

  // Step 2: prefer English by locale_id or video_label, fall back to first available
  const isEnglish = c =>
    c.locale_id === 'en_US' ||
    c.locale_id?.startsWith('en') ||
    c.video_label?.toLowerCase().includes('english');

  const caption = captionsArr.find(isEnglish) || captionsArr[0];

  if (!caption?.url) return null;

  // Step 3: fetch the VTT file and parse it
  try {
    const vttRes = await fetch(caption.url, { credentials: 'include' });
    if (!vttRes.ok) {
      console.warn('[UTC] VTT fetch returned', vttRes.status);
      return null;
    }
    const vttText = await vttRes.text();
    return parseVtt(vttText) || null;
  } catch (err) {
    console.warn('[UTC] VTT fetch failed', err);
    return null;
  }
}

/**
 * Fallback: read transcript from the sidebar DOM if already open.
 * @returns {string|null}
 */
function getTranscriptFromDom() {
  const panel = document.querySelector('[data-purpose="transcript-panel"]');
  if (!panel) return null;
  const cues = Array.from(panel.querySelectorAll('[data-purpose="cue-text"]'));
  if (cues.length > 0) {
    return cues.map(c => c.innerText.trim()).filter(Boolean).join(' ');
  }
  const raw = panel.innerText?.trim();
  return raw?.length > 50 ? raw : null;
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
 * Handle copy transcript button click.
 * Tries API first (silent, no sidebar needed), falls back to DOM.
 */
async function handleCopyTranscript() {
  // API approach — fast, silent, no UI side effects
  let rawText = await fetchTranscriptFromApi();

  // DOM fallback — works if sidebar is already open
  if (!rawText) {
    rawText = getTranscriptFromDom();
  }

  if (!rawText) {
    showNotification('No transcript available for this lesson.', 'error');
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
    showNotification('Failed to copy transcript. Please try again.', 'error');
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
