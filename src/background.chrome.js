// Chrome MV3 has no blocking webRequest, so redirect from webNavigation instead.
// The service worker can be restarted at any time, so state lives in storage.
const FILTER = "filter-source";

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    const params = new URLSearchParams(url.search);
    const { savedParams } = await chrome.storage.sync.get(["savedParams"]);
    if (savedParams && !params.has(FILTER)) {
      for (const value of savedParams) params.append(FILTER, value);
      url.search = params.toString();
      chrome.tabs.update(details.tabId, { url: url.toString() });
    } else {
      chrome.storage.sync.set({ currentParams: params.getAll(FILTER) });
    }
  },
  { url: [{ hostEquals: "www.dndbeyond.com" }] }
);

chrome.runtime.onStartup.addListener(() =>
  chrome.storage.sync.remove(["currentParams"])
);
