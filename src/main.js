let pattern = "https://www.dndbeyond.com/*";
let savedParams = null;
function redirect(requestDetails) {
  console.log(`Redirecting: ${requestDetails.url}`);
  console.log("s:"+savedParams)
  url = new URL(requestDetails.url);
  params = new URLSearchParams(url.search);
  if (savedParams && !params.has("filter-source")) {
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
