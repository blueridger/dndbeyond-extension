// Chrome MV3 has no blocking webRequest, so redirect from webNavigation instead.
// The service worker can be restarted at any time, so state lives in storage.
const FILTER = "filter-source";
// The site 301s /sources/* back to itself when given filter-source, which loops.
const SKIP_PATH = /^\/sources(\/|$)/;

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    if (SKIP_PATH.test(url.pathname)) return;
    const params = new URLSearchParams(url.search);
    const { savedParams } = await chrome.storage.sync.get(["savedParams"]);
    if (savedParams?.length && !params.has(FILTER)) {
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
