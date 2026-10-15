// Chrome MV3 has no blocking webRequest, so redirect from webNavigation instead.
// The service worker can be restarted at any time, so state lives in storage.
const FILTER = "filter-source";
// Only these listing pages have a source filter. Adding it elsewhere is
// useless and the site 301-loops /sources/* when given it.
const FILTERABLE =
  /^(\/[a-z]{2})?\/(spells|monsters|magic-items|equipment|feats|backgrounds)\/?$/;

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    if (!FILTERABLE.test(url.pathname)) return;
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
