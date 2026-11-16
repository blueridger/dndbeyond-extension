---
name: submit-extension
description: Check whether the Chrome Web Store and Firefox AMO listings for DnD Beyond Auto Source Filter are behind the repo, bump the version if needed, build, and upload through each developer portal using Claude in Chrome. Use when asked to release, publish, submit or ship a new version of this extension.
---

# Submit a new version to the Chrome Web Store and Firefox AMO

Go slowly. Every portal action is outward-facing. Confirm with the user before
the final "Submit" click on each store, and before any commit or push.

## Facts about this project

- Everything builds from **`main`**. The `chrome` branch is obsolete (pre-2026
  two-branch setup); don't use it. `origin/chrome` holds an unrelated
  project's history; leave it alone.
- `src/manifest.json`: Chrome MV3 (service worker `background.chrome.js`).
  `src/manifest.firefox.json`: Firefox MV2 (`main.js`, blocking webRequest).
  Both `version` fields must match (`make` checks this).
- `make` in `src/` writes `build/artifacts/{chrome,firefox}/dnd_beyond_auto_source_filter-<ver>.zip`
  (`build/` is gitignored). It refuses to rebuild an existing version unless
  you pass `FORCE=1`.
- Firefox add-on ID `{fe422939-cf9d-45f7-923c-eae74650ba62}`, slug
  `dnd-beyond-auto-source-filter`. Chrome item ID
  `gnbdkhkkpjggdohophbonegpbdioaede`.

## Step 1: Sync with the remote

```sh
git fetch --all --prune
git checkout main && git merge --ff-only origin/main
```

Work often lands on GitHub through PRs (including from Claude cloud
sessions), so local `main` is frequently behind. If `--ff-only` fails, stop
and ask the user.

## Step 2: Compare repo and live versions

- Repo: `grep '"version"' src/manifest.json src/manifest.firefox.json`
- Firefox live: WebFetch
  `https://addons.mozilla.org/api/v5/addons/addon/{fe422939-cf9d-45f7-923c-eae74650ba62}/`
  and read `current_version.version`.
- Chrome live: WebFetch
  `https://chromewebstore.google.com/detail/dnd-beyond-auto-source-fi/gnbdkhkkpjggdohophbonegpbdioaede`
  and ask for the listed version.
- Find unreleased code: `git log --oneline <commit that set the live version>..main -- src/`.

**If there are code changes since the live version, but the repo version
equals a live version, bump the version.** Stores reject a version number
that was already used. Bump the patch number in **both** manifests, keeping
both stores on the same version.

Public pages don't show versions still pending review, so check the
dashboards too (step 5).

## Step 3: Build and check

```sh
cd src && make
web-ext lint -s ../build/firefox      # expect 0 errors / 0 warnings
unzip -p ../build/artifacts/chrome/*-<ver>.zip manifest.json | grep -E '"(version|manifest_version)"'   # 3, <ver>
unzip -p ../build/artifacts/firefox/*-<ver>.zip manifest.json | grep -E '"(version|manifest_version)"'  # 2, <ver>
```

## Step 4: Commit the version bump

Show the diff, then ask before committing and pushing to `main`. The
`.claude/skills/` directory can go in the same commit if it changed.

## Step 5: Upload with Claude in Chrome

Load the `anthropic-skills:chrome-browser` skill first and follow it: call
`tabs_context_mcp`, then work in a **new tab**. Load these tools in one
ToolSearch: `tabs_context_mcp, tabs_create_mcp, navigate, computer, read_page,
find, get_page_text, file_upload, tabs_close_mcp`. If the tools aren't
available, tell the user to connect the Claude in Chrome extension, then stop.

**Auth:** if a portal shows a sign-in page, STOP. Tell the user which tab to
sign in on, and wait for them to say they're done. Never type credentials or
handle 2FA yourself.

Release notes for both stores: draft them from the step 2 `git log`, written
for users (e.g. "Fixes a redirect loop when no sources are saved"), and get
the user's approval.

### Chrome Web Store: use the API, NOT Claude in Chrome
Chrome blocks every extension from scripting or screenshotting Web Store
pages, including the developer dashboard ("The extensions gallery cannot be
scripted"). So Claude in Chrome can't drive it. Use `scripts/cws.sh`
(Chrome Web Store API v2) instead:

- The publisher account is the user's **techwitch.dev** Google account, not
  their main Gmail. With the wrong account, the dashboard redirects to
  `/devconsole/register`.
- Credentials live in the gitignored `.env.cws` at the repo root (see the
  script header). Never ask for them in chat, echo them, or type them into a
  page. To check them, print value lengths only.
- One-time setup (done 2026-11-16): Cloud project "Chrome Web Store
  automation" (`true-shore-515023-i1`) under techwitch.dev, a **Desktop app**
  OAuth client "cws-cli", and consent in Testing mode with techwitch.dev as a
  test user. If the refresh token stops working (for example, Testing-mode
  tokens can expire), re-run `python3 -I scripts/cws-auth.py`. It opens the
  consent screen, and the user approves as techwitch.dev. It uses `curl` for
  the token exchange because the python.org Python has no CA certs.
- Don't search the user's email for review or rejection notices. Use
  `cws.sh status` and ask the user.

1. `scripts/cws.sh status`. `submittedItemRevisionStatus` shows the last
   submission's state (`PENDING_REVIEW`, `REJECTED`, ...). If it's pending,
   stop. If it was rejected, ask the user for the reason before resubmitting.
2. `scripts/cws.sh upload` creates a draft only. Report errors verbatim.
3. Ask the user to confirm, then run `scripts/cws.sh publish`, then `status`.
   If publish returns **400 `INVALID_ITEM_METADATA`**, the dashboard listing
   is incomplete. Usually the Privacy-tab permission justifications are
   missing after a permissions change. The user fixes this in the dashboard
   (link in the error) and can submit from there. Offer justification text
   for each new permission.
4. Release notes: the API doesn't take them. That's fine; Chrome doesn't
   show per-version notes.

History: 1.0.4 was REJECTED (MV3 manifest used `background.scripts`).
1.0.5 (service worker + `webNavigation`) was submitted 2026-11-16.

### Firefox AMO  _(verified live 2026-11-16, 1.0.5)_
AMO account: techwitch.dev. Claude in Chrome works fine here.
1. Open
   `https://addons.mozilla.org/en-US/developers/addon/dnd-beyond-auto-source-filter/versions`
   and confirm nothing is awaiting review.
2. Open `.../versions/submit/`. "Where to Host" is already "On this site".
3. Use `find` to locate the hidden `file-input`, then `file_upload` the
   Firefox zip. Wait about 8s for validation.
4. If there are any warnings, open "See full validation report" (its href)
   **in a separate tab**, so the form isn't lost. Fix real warnings in the
   source and rebuild with `make firefox FORCE=1` rather than shipping them.
   (Example: AMO requires `gecko.data_collection_permissions`; `web-ext lint`
   locally did not flag it.)
5. Compatibility: leave **Firefox** checked and **Firefox for Android**
   unchecked, then click Continue.
6. Details page: type the approved notes in **Release Notes**. Leave Notes to
   Reviewer empty. Screenshot to confirm the text landed.
7. Ask the user to confirm, then click **Submit Version**.
8. Then a **source-code question** appears. Answer **No** (`web-ext build`
   only zips the files; `browser-polyfill.min.js` is the stock library) and
   click Continue. The page shows "Version Submitted". Publication can take
   up to 24h.

## Step 6: Verify and clean up

- Confirm each dashboard shows the new version as pending, in review, or
  published.
- Close the tabs you created.
- Report what was submitted, what was skipped and why, and any warnings.
- Update this file wherever the real portal UI differed. Remove the
  "not yet verified" notes once a step has been done live.
