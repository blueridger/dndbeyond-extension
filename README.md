# DnD Beyond Augmentation Extension

This is a Firefox/Chrome Extension that augments dndbeyond.com by allowing you 
to save a source filter and automatically apply it, in order to only see material
from sources you own.

# [Get for Firefox >]()

# [Get for Chrome >]()

## Submit feedback

If you have a Github account, submit an issue.

## Dev setup
`src/manifest.json` is the Chrome (MV3) manifest and `src/manifest.firefox.json` is the Firefox (MV2) one. Chrome uses `src/background.chrome.js` (no blocking webRequest in MV3); Firefox uses `src/main.js`.

To test in Chrome, load `src/` as an unpacked extension from `chrome://extensions`.

To test in Firefox, run `make run` from `src/`.

To build, run `make` from `src/`. This puts both zips in `build/artifacts/`. Rebuilding a version that's already built fails unless you run `make FORCE=1`.

If you don't have web-ext, you can get it with `npm install --global web-ext`
