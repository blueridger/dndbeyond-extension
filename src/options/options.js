function saveOptions() {
  const urlPatterns = document
    .getElementById("urlPatterns")
    .value.split("\n")
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern);
  let homepage = document.getElementById("homepage").value.trim();
  if (homepage && !homepage.startsWith("http"))
    homepage = "https://" + homepage;

  browser.storage.sync.set({
    urlPatterns,
    homepage,
    shouldUseHomepage: document.getElementById("shouldUseHomepage").checked,
  });
}

function restoreOptions() {
  browser.storage.sync.get(["currentParams", "savedParams"]).then((result) => {
    document.getElementById("currentParams").innerText =
      "current: " + (result.currentParams ?? "");
    document.getElementById("savedParams").innerText =
      "saved: " + (result.savedParams ?? "");
    document.getElementById("saveButton").onclick = (e) => {
      e.preventDefault();
      browser.storage.sync
        .get(["currentParams"])
        .then((result) => {
          // Saving an empty filter would make every page redirect to itself.
          if (!result.currentParams?.length) return;
          return browser.storage.sync.set({
            savedParams: result.currentParams,
          });
        })
        .then(restoreOptions);
    };
  }, console.log);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
