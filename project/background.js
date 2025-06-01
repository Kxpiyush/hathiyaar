// Handle messages from popup or content scripts
chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(async (msg) => {
        const response = { action: msg.action };

        if (msg.action === 'fetch_info') {
            const keys = ['__un', '__pw', 'candidateID', 'selectedCity', 'lat', 'lng', 'distance', 'jobType', '__ap'];
            const data = await chrome.storage.local.get(keys);
            const version = await new Promise(resolve => chrome.management.getSelf(o => resolve(o.version)));

            response.data = {
                $username: data.__un,
                $password: data.__pw,
                $candidateID: data.candidateID,
                $selectedCity: data.selectedCity,
                $lat: data.lat,
                $lng: data.lng,
                $distance: data.distance,
                $jobType: data.jobType,
                $active: data.__ap,
                $version: version
            };
        }

        port.postMessage(response);
    });
});

// Initial install setup
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    chrome.action.disable();

    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [new chrome.declarativeContent.PageStateMatcher({ pageUrl: {} })],
                actions: [new chrome.declarativeContent.ShowAction()]
            }
        ]);
    });

    if (reason === 'install') {
        await chrome.storage.local.set({
            $active: false,
            __cr: 0,
            __fq: 0.5,
            __gp: 3,
            __tdgp: 3
        });

        chrome.tabs.create({ url: 'https://hiring.amazon.ca/app#/jobSearch' });
    }
});

// Inject scripts based on the tab URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (
            tab.url.includes('hiring.amazon.ca/app#/jobDetail') ||
            tab.url.includes('hiring.amazon.ca/application/ca/') ||
            tab.url.includes('/consent')
        ) {
            console.log('Injecting Createapp.js into tab:', tabId);
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['Createapp.js']
            });
        }
    }
});

// Handle candidate ID saving and fetch control
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_fetch') {
        chrome.runtime.sendMessage({ action: 'start_fetch' });
    } else if (message.action === 'stop_fetch') {
        chrome.runtime.sendMessage({ action: 'stop_fetch' });
    }

    if (message.candidateId) {
        chrome.storage.local.set({ candidateId: message.candidateId }, () => {
            sendResponse({ status: 'success' });
        });
        return true; // Indicates async sendResponse
    }
});
