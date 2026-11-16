#!/usr/bin/env python3
"""One-time OAuth helper for scripts/cws.sh.

Usage: scripts/cws-auth.py [client_secret_XXX.json]

Reads CWS_CLIENT_ID / CWS_CLIENT_SECRET (from the JSON if given, else .env.cws), opens Google's consent
screen, catches the redirect on http://127.0.0.1:8765/, exchanges the code, and
writes CWS_REFRESH_TOKEN back into .env.cws. Tokens are never printed.

Use a "Desktop app" OAuth client (loopback redirects need no registration).
You must sign in as the account that owns the Chrome Web Store item.
"""
import http.server
import json
import pathlib
import secrets
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV = ROOT / ".env.cws"
PORT = 8765
REDIRECT = f"http://127.0.0.1:{PORT}/"
SCOPE = "https://www.googleapis.com/auth/chromewebstore"


def read_env():
    env = {}
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def write_env_value(key, value):
    lines = ENV.read_text().splitlines()
    out, done = [], False
    for line in lines:
        if line.split("=", 1)[0].strip() == key:
            out.append(f"{key}={value}")
            done = True
        else:
            out.append(line)
    if not done:
        out.append(f"{key}={value}")
    ENV.write_text("\n".join(out) + "\n")
    ENV.chmod(0o600)


def import_client_json(path):
    """Copy client_id/secret from a downloaded Google client JSON into .env.cws."""
    data = json.loads(pathlib.Path(path).expanduser().read_text())
    c = data.get("installed") or data.get("web") or {}
    if not c.get("client_id") or not c.get("client_secret"):
        sys.exit(f"{path} doesn't look like an OAuth client JSON.")
    if not ENV.exists():
        ENV.write_text("")
    write_env_value("CWS_CLIENT_ID", c["client_id"])
    write_env_value("CWS_CLIENT_SECRET", c["client_secret"])
    print(f"Imported client credentials from {path} into .env.cws.")


def main():
    if len(sys.argv) > 1:
        import_client_json(sys.argv[1])
    env = read_env()
    cid, csec = env.get("CWS_CLIENT_ID", ""), env.get("CWS_CLIENT_SECRET", "")
    if cid in ("", "...") or csec in ("", "..."):
        sys.exit("Fill in CWS_CLIENT_ID and CWS_CLIENT_SECRET in .env.cws first.")

    state = secrets.token_urlsafe(16)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state,
    })
    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" not in q and "error" not in q:
                self.send_response(404); self.end_headers(); return
            result.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Done. You can close this tab and return to the terminal.")

        def log_message(self, *a):
            pass

    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    print("Opening the Google consent screen. Sign in as the Chrome Web Store publisher account.")
    print("If it doesn't open, visit:\n" + url)
    webbrowser.open(url)
    while not result:
        server.handle_request()

    if "error" in result:
        sys.exit("Authorization failed: " + result["error"])
    if result.get("state") != state:
        sys.exit("State mismatch; aborting.")

    body = urllib.parse.urlencode({
        "code": result["code"], "client_id": cid, "client_secret": csec,
        "redirect_uri": REDIRECT, "grant_type": "authorization_code",
    }).encode()
    # Use curl (system trust store): python.org builds often ship without CA
    # certs. The body goes over stdin so the secret never appears in argv.
    r = subprocess.run(
        ["curl", "-sS", "https://oauth2.googleapis.com/token", "--data-binary", "@-",
         "-H", "Content-Type: application/x-www-form-urlencoded"],
        input=body, capture_output=True,
    )
    try:
        tok = json.loads(r.stdout)
    except ValueError:
        sys.exit(f"Token exchange failed: {r.stderr.decode()[:300]}")
    if "error" in tok:
        sys.exit(f"Token exchange failed: {tok.get('error')}: {tok.get('error_description', '')}")
    if "refresh_token" not in tok:
        sys.exit("No refresh_token in response (keys: %s)" % ", ".join(tok))
    write_env_value("CWS_REFRESH_TOKEN", tok["refresh_token"])
    print("Saved CWS_REFRESH_TOKEN to .env.cws (scope: %s)." % tok.get("scope", "?"))


if __name__ == "__main__":
    main()
