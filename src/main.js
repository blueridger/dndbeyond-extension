let pattern = "https://www.dndbeyond.com/*";

function buildRedirect(savedParams) {
  return function redirect(requestDetails) {
    console.log(`Redirecting: ${requestDetails.url}`);
    url = new URL(requestDetails.url)
    params = new URLSearchParams(url.search);
    if (!params.has("filter-source")) {
      for (const value of savedParams)
        params.append("filter-source", value)
      url.search = params.toString()
      return {
        redirectUrl: url.toString(),
      };
    } else {
      browser.storage.sync.set({"currentParams": params.getAll("filter-source")});
    }
  };
}
browser.storage.sync.remove(["currentParams"])
browser.storage.sync
  .get(["savedParams"])
  .then((result) =>
    browser.webRequest.onBeforeRequest.addListener(
      buildRedirect(result.savedParams),
      { urls: [pattern], types: ["main_frame"] },
      ["blocking"]
    )
  );
