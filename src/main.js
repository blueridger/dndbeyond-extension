let pattern = "https://www.dndbeyond.com/*";
let savedParams = null;
// Only these listing pages have a source filter. Adding it elsewhere is
// useless and the site 301-loops /sources/* when given it.
const FILTERABLE =
  /^(\/[a-z]{2})?\/(spells|monsters|magic-items|equipment|feats|backgrounds)\/?$/;
function redirect(requestDetails) {
  console.log(`Redirecting: ${requestDetails.url}`);
  console.log("s:"+savedParams)
  url = new URL(requestDetails.url);
  if (!FILTERABLE.test(url.pathname)) return;
  params = new URLSearchParams(url.search);
  if (savedParams?.length && !params.has("filter-source")) {
    for (const value of savedParams) params.append("filter-source", value);
    url.search = params.toString();
    return {
      redirectUrl: url.toString(),
    };
  } else {
    browser.storage.sync.set({ currentParams: params.getAll("filter-source") });
  }
}

browser.storage.sync.remove(["currentParams"]);
browser.storage.sync.get(["savedParams"]).then((result) => {
  savedParams = result.savedParams;
  browser.webRequest.onBeforeRequest.addListener(
    redirect,
    { urls: [pattern], types: ["main_frame"] },
    ["blocking"]
  );
});
browser.storage.sync.onChanged.addListener((changes) => {
  console.log(changes)
  const changedItems = Object.keys(changes);
  for (const item of changedItems) {
    if (item == "savedParams") savedParams = changes[item].newValue;
  }
});
