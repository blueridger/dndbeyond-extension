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
    document.getElementById("saveButton").addEventListener("click", () => {
      browser.storage.sync
        .get(["currentParams"])
        .then((result) =>
          browser.storage.sync.set({
            savedParams: result.currentParams,
          })
        );
      restoreOptions();
    });
  }, console.log);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
