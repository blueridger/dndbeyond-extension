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

### Chrome Web Store  _(UI steps not yet verified live; fix them after the first run)_
1. Open `https://chrome.google.com/webstore/devconsole` and select
   `gnbdkhkkpjggdohophbonegpbdioaede`.
2. If a version is already pending review, stop and report.
3. Go to **Package**, then **Upload new package**. Upload the Chrome zip with
   `file_upload`, giving the absolute path.
4. Report validation errors verbatim. Don't work around them.
5. Permissions changed in 1.0.5 (`webRequest`/`webRequestBlocking` were
   replaced by `webNavigation` + `host_permissions`). Check that the
   **Privacy** tab's permission justifications cover the current permissions.
   Draft any new justification text and get the user's approval.
6. Ask the user to confirm, then click **Submit for review**.

### Firefox AMO  _(UI steps not yet verified live; fix them after the first run)_
1. Open
   `https://addons.mozilla.org/en-US/developers/addon/dnd-beyond-auto-source-filter/versions/submit/`.
2. Keep distribution "On this site". Upload the Firefox zip.
3. Wait for validation and report any warnings or errors.
4. Source code question: the code is unminified except
   `browser-polyfill.min.js`, a well-known third-party library. Answer
   **No** unless the user says otherwise.
5. Paste the approved release notes.
6. Ask the user to confirm, then click **Submit Version**.

## Step 6: Verify and clean up

- Confirm each dashboard shows the new version as pending, in review, or
  published.
- Close the tabs you created.
- Report what was submitted, what was skipped and why, and any warnings.
- Update this file wherever the real portal UI differed. Remove the
  "not yet verified" notes once a step has been done live.
