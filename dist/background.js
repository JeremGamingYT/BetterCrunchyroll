/**
 * Background Service Worker
 * Handles data saving and background tasks
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SAVE_FILE') {
        const { path, data } = message;

        try {
            // Encode safely for UTF-8
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });

            // Use a data URI base64 encoded to ensure content is handled correctly
            // Note: btoa fails on unicode strings, so we use a safe encoding strategy
            const base64 = btoa(new TextEncoder().encode(jsonStr).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const url = `data:application/json;base64,${base64}`;

            chrome.downloads.download({
                url: url,
                filename: `BetterCrunchyroll/${path}`,
                saveAs: false,
                conflictAction: 'overwrite'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download failed:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log(`Saved: ${path}`);
                    sendResponse({ success: true, downloadId });
                }
            });
        } catch (error) {
            console.error('Error preparing download:', error);
            sendResponse({ success: false, error: error.message });
        }

        return true; // Keep channel open for async response
    }
});
