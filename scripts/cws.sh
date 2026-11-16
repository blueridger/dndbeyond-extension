#!/usr/bin/env bash
# Chrome Web Store API v2 helper.
#   scripts/cws.sh status            show the item's current state
#   scripts/cws.sh upload [zip]      upload a package (default: build/artifacts/chrome/*-<version>.zip)
#   scripts/cws.sh publish           submit the uploaded package for review
#
# Credentials come from .env.cws (gitignored) at the repo root:
#   CWS_CLIENT_ID=...
#   CWS_CLIENT_SECRET=...
#   CWS_REFRESH_TOKEN=...
#   CWS_PUBLISHER_ID=...
# Setup: https://developer.chrome.com/docs/webstore/using-api
# The OAuth grant must come from the Google account that owns the item.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ITEM_ID=gnbdkhkkpjggdohophbonegpbdioaede
ENV_FILE="$ROOT/.env.cws"

[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (see header of $0)" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a
for v in CWS_CLIENT_ID CWS_CLIENT_SECRET CWS_REFRESH_TOKEN CWS_PUBLISHER_ID; do
  [ -n "${!v:-}" ] || { echo "$v is not set in $ENV_FILE" >&2; exit 1; }
done

API=https://chromewebstore.googleapis.com
ITEM="publishers/$CWS_PUBLISHER_ID/items/$ITEM_ID"

token() {
  curl -sS --fail-with-body https://oauth2.googleapis.com/token \
    --data-urlencode "client_id=$CWS_CLIENT_ID" \
    --data-urlencode "client_secret=$CWS_CLIENT_SECRET" \
    --data-urlencode "refresh_token=$CWS_REFRESH_TOKEN" \
    -d grant_type=refresh_token | jq -er .access_token
}

status() {
  curl -sS --fail-with-body -H "Authorization: Bearer $1" "$API/v2/$ITEM:fetchStatus"
}

cmd=${1:-}
case "$cmd" in
  status)
    status "$(token)" | jq .
    ;;
  upload)
    version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$ROOT/src/manifest.json")
    zip=${2:-$ROOT/build/artifacts/chrome/dnd_beyond_auto_source_filter-$version.zip}
    [ -f "$zip" ] || { echo "no such zip: $zip (run make in src/)" >&2; exit 1; }
    zipver=$(unzip -p "$zip" manifest.json | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p')
    echo "Uploading $zip (manifest version $zipver)"
    tok=$(token)
    resp=$(curl -sS --fail-with-body -X POST -H "Authorization: Bearer $tok" \
      -H "Content-Type: application/zip" --data-binary "@$zip" \
      "$API/upload/v2/$ITEM:upload")
    echo "$resp" | jq .
    if [ "$(echo "$resp" | jq -r '.uploadState // empty')" = IN_PROGRESS ]; then
      for _ in $(seq 1 20); do
        sleep 3
        s=$(status "$tok")
        state=$(echo "$s" | jq -r '.lastAsyncUploadState // empty')
        [ "$state" != IN_PROGRESS ] && { echo "$s" | jq .; break; }
      done
    fi
    ;;
  publish)
    curl -sS --fail-with-body -X POST -H "Authorization: Bearer $(token)" \
      -H "Content-Length: 0" "$API/v2/$ITEM:publish" | jq .
    ;;
  *)
    sed -n '2,6p' "$0"; exit 1
    ;;
esac
