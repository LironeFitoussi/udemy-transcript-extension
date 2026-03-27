/**
 * UDEMY TRANSCRIPT COPIER - Popup Script
 * Manages user preferences via chrome.storage.sync
 */

const DEFAULT_PREFS = {
  format: 'plain',
  includeMetadata: false,
};

/**
 * Load prefs and populate form fields
 */
function loadPrefs() {
  chrome.storage.sync.get(DEFAULT_PREFS, (prefs) => {
    // Set format radio
    const formatRadio = document.querySelector(`input[name="format"][value="${prefs.format}"]`);
    if (formatRadio) formatRadio.checked = true;

    // Set metadata checkbox
    document.getElementById('include-metadata').checked = !!prefs.includeMetadata;
  });
}

/**
 * Save form values to chrome.storage.sync and show confirmation
 */
function savePrefs() {
  const format = document.querySelector('input[name="format"]:checked')?.value || 'plain';
  const includeMetadata = document.getElementById('include-metadata').checked;

  chrome.storage.sync.set({ format, includeMetadata }, () => {
    const msg = document.getElementById('saved-msg');
    msg.classList.add('visible');
    setTimeout(() => msg.classList.remove('visible'), 1500);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPrefs();
  document.getElementById('save-btn').addEventListener('click', savePrefs);
});
