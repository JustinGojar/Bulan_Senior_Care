"""Exercise the production router and browser build locally without using application data."""
import os
import pathlib
import re
import socket
import subprocess
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
base = f"http://127.0.0.1:{port}"
environment = dict(os.environ, APP_ENV="production", APP_DEBUG="true", SESSION_DRIVER="file",
                   CACHE_STORE="file", DB_CONNECTION="sqlite", DB_DATABASE=":memory:", DB_URL="")
server = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", "public", "public/router.php"],
                          cwd=ROOT / "backend", env=environment, stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)


def request(path, **kwargs):
    try:
        return urllib.request.urlopen(urllib.request.Request(base + path, **kwargs), timeout=15)
    except urllib.error.HTTPError as error:
        return error


try:
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    for path, expected in [("/", 200), ("/.env", 404), ("/.htaccess", 404), ("/.git/config", 404),
                           ("/spa-assets/../index.php", 404), ("/spa-assets/assets/test.map", 404),
                           ("/api/user", 401), ("/api/admin/users", 401), ("/api/unknown", 404)]:
        with request(path) as response:
            assert response.status == expected, (path, response.status, expected)
            assert response.headers.get("X-Content-Type-Options") == "nosniff", path
            assert response.headers.get("X-Frame-Options") == "DENY", path
            if path.startswith("/api"):
                assert "no-store" in response.headers.get("Cache-Control", ""), path
        print(path, expected, "security headers OK", flush=True)
    with request("/api/login", data=b"{}", headers={"Content-Type": "application/json",
                 "Origin": "https://attacker.example", "Sec-Fetch-Site": "cross-site"}) as response:
        assert response.status == 403
        assert not response.headers.get("Set-Cookie")
    print("Cross-site login rejected without an authentication cookie.", flush=True)
    # An intentionally missing SQLite table provokes a real exception; production must hide it.
    with request("/api/announcements") as response:
        body = response.read()
        assert response.status == 500
        assert b"SQLSTATE" not in body and b"Stack trace" not in body
    print("Production errors hide details even with APP_DEBUG=true.", flush=True)
    assets = ROOT / "backend/public/spa-assets/assets"
    for extension, mime in [(".js", "javascript"), (".css", "text/css"), (".ttf", "font/ttf")]:
        asset = next(assets.glob("*" + extension))
        with request("/spa-assets/assets/" + asset.name) as response:
            assert mime in response.headers.get("Content-Type", "")
            assert response.headers.get("Strict-Transport-Security")
            assert "immutable" in response.headers.get("Cache-Control", "")
        print(extension, "asset content type, caching and HSTS OK", flush=True)
    secrets = []
    for filename in ["backend/.env", "frontend/.env.local"]:
        path = ROOT / filename
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            if "=" not in line or line.startswith("#"):
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            if re.search("KEY|TOKEN|SECRET|PASSWORD", key) and len(value) >= 12:
                secrets.append((key, value.encode()))
    for path in (ROOT / "backend/public/spa-assets").rglob("*"):
        if path.is_file() and path.suffix in [".js", ".html", ".json", ".css", ".map"]:
            data = path.read_bytes()
            for key, value in secrets:
                assert value not in data, f"Potential {key} leak in {path} (value redacted)"
    print("No configured local secret values found in browser build assets.", flush=True)
    subprocess.run(["node", "scripts/browser-smoke.mjs"], cwd=ROOT / "frontend",
                   env=dict(os.environ, SMOKE_BASE_URL=base), check=True, timeout=90)
finally:
    server.terminate()
    server.wait(timeout=10)
