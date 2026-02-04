// BetterCrunchyroll - Background Service Worker
// Handles extension lifecycle and API proxying

console.log('[BetterCrunchyroll] Background service worker started');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[BetterCrunchyroll] Extension installed:', details.reason);

    if (details.reason === 'install') {
        // First time install
        console.log('[BetterCrunchyroll] First time installation');
    } else if (details.reason === 'update') {
        // Extension updated
        console.log('[BetterCrunchyroll] Extension updated from version:', details.previousVersion);
    }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[BetterCrunchyroll] Message received:', message);

    if (message.type === 'FETCH_API') {
        // Proxy API requests through background to avoid CORS issues
        handleApiRequest(message.url, message.options)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        // Return true to indicate we'll send response asynchronously
        return true;
    }

    if (message.type === 'GET_EXTENSION_URL') {
        sendResponse({ url: chrome.runtime.getURL('') });
        return false;
    }
});

// Handle API requests (proxy to avoid CORS)
async function handleApiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[BetterCrunchyroll] API request failed:', error);
        throw error;
    }
}

// Handle tab updates for potential URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('crunchyroll.com')) {
        console.log('[BetterCrunchyroll] Crunchyroll tab updated:', tab.url);
    }
});
