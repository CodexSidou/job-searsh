#!/usr/bin/env python3
"""Local bridge for the AI Job Search app.

Serves the static site, a host-whitelisted outbound proxy for job portals that
do not send CORS headers, and a small local-AI endpoint that talks to Ollama or
any OpenAI-compatible server (LM Studio, llama.cpp, ...).

Usage:
    python job_scraper/server.py
    python job_scraper/server.py --port 8080 --open

Only the Python standard library is used.
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OPENAI_URL = os.environ.get("OPENAI_URL", "http://127.0.0.1:1234/v1").rstrip("/")
AI_MODEL = os.environ.get("AI_MODEL", "")
AI_TIMEOUT = int(os.environ.get("AI_TIMEOUT", "180"))
PROXY_TIMEOUT = int(os.environ.get("PROXY_TIMEOUT", "25"))

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

ALLOWED_HOSTS = (
    "jobindex.dk",
    "it-jobbank.dk",
    "jobnet.dk",
    "jobbank.dk",
    "jobdanmark.dk",
    "linkedin.com",
    "freehire.me",
    "himalayas.app",
    "remotive.com",
    "arbeitnow.com",
    "jobicy.com",
    "remoteok.com",
    "hn.algolia.com",
    "news.ycombinator.com",
    "ashbyhq.com",
    "greenhouse.io",
    "lever.co",
    "smartrecruiters.com",
    "weworkremotely.com",
    "nodesk.co",
    "jobspresso.co",
    "larajobs.com",
    "vuejobs.com",
    "djangojobs.net",
    "smashingmagazine.com",
    "landing.jobs",
    "teamtailor.com",
)

HOST_HEADERS = {
    "jobnet.dk": {"x-csrf": "1", "Accept": "application/json"},
    "jobindex.dk": {"Accept": "text/html,application/xhtml+xml"},
    "it-jobbank.dk": {"Accept": "text/html,application/xhtml+xml"},
    "linkedin.com": {"Accept": "text/html,application/xhtml+xml"},
    "jobdanmark.dk": {"Accept": "application/json"},
    "freehire.me": {"Accept": "application/json"},
    "himalayas.app": {"Accept": "application/json"},
}

JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
}


def log(message):
    sys.stderr.write("[bridge] %s\n" % message)
    sys.stderr.flush()


def host_allowed(host):
    host = (host or "").lower().split(":")[0]
    if not host:
        return False
    return any(host == suffix or host.endswith("." + suffix) for suffix in ALLOWED_HOSTS)


def read_json_request(handler, limit=2 * 1024 * 1024):
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    if length > limit:
        raise ValueError("Request body too large")
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8", "replace"))


def http_json(url, payload=None, timeout=3):
    data = None
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
    return json.loads(body.decode("utf-8", "replace"))


def probe_ollama():
    try:
        data = http_json(OLLAMA_URL + "/api/tags", timeout=2)
        models = [m.get("name") for m in data.get("models", []) if m.get("name")]
        return {"available": True, "url": OLLAMA_URL, "models": models}
    except Exception as exc:  # noqa: BLE001 - surfaced to the UI
        return {"available": False, "url": OLLAMA_URL, "models": [], "error": str(exc)}


def probe_openai():
    try:
        data = http_json(OPENAI_URL + "/models", timeout=2)
        models = [m.get("id") for m in data.get("data", []) if m.get("id")]
        return {"available": True, "url": OPENAI_URL, "models": models}
    except Exception as exc:  # noqa: BLE001 - surfaced to the UI
        return {"available": False, "url": OPENAI_URL, "models": [], "error": str(exc)}


def ai_status():
    results = {}
    threads = []

    def run(name, fn):
        results[name] = fn()

    for name, fn in (("ollama", probe_ollama), ("openai", probe_openai)):
        thread = threading.Thread(target=run, args=(name, fn), daemon=True)
        thread.start()
        threads.append(thread)
    for thread in threads:
        thread.join(timeout=4)

    ollama = results.get("ollama", {"available": False, "models": []})
    openai = results.get("openai", {"available": False, "models": []})
    preferred = None
    if ollama.get("available") and ollama.get("models"):
        preferred = {"provider": "ollama", "model": AI_MODEL or ollama["models"][0]}
    elif openai.get("available") and openai.get("models"):
        preferred = {"provider": "openai", "model": AI_MODEL or openai["models"][0]}
    elif AI_MODEL:
        preferred = {"provider": "ollama" if ollama.get("available") else "openai", "model": AI_MODEL}

    models = []
    if ollama.get("available"):
        models.extend(ollama.get("models", []))
    if openai.get("available"):
        models.extend([m for m in openai.get("models", []) if m not in models])

    return {
        "ok": True,
        "available": bool(preferred),
        "providers": {"ollama": ollama, "openai": openai},
        "preferred": preferred,
        "models": models,
        "model": preferred.get("model") if preferred else "",
    }


def generate_ollama(payload):
    models = payload.get("models") or probe_ollama().get("models") or []
    model = payload.get("model") or AI_MODEL or (models[0] if models else "")
    if not model:
        raise RuntimeError("No Ollama model installed. Run: ollama pull llama3.2")
    body = {
        "model": model,
        "prompt": payload.get("prompt", ""),
        "stream": False,
        "options": {"temperature": payload.get("temperature", 0.4)},
    }
    if payload.get("system"):
        body["system"] = payload["system"]
    data = http_json(OLLAMA_URL + "/api/generate", body, timeout=AI_TIMEOUT)
    text = data.get("response") or ""
    if not text:
        raise RuntimeError("Ollama returned an empty response")
    return text, model


def generate_openai(payload):
    models = payload.get("models") or probe_openai().get("models") or []
    model = payload.get("model") or AI_MODEL or (models[0] if models else "")
    if not model:
        raise RuntimeError("No model loaded in the OpenAI-compatible server")
    messages = []
    if payload.get("system"):
        messages.append({"role": "system", "content": payload["system"]})
    messages.append({"role": "user", "content": payload.get("prompt", "")})
    body = {
        "model": model,
        "messages": messages,
        "temperature": payload.get("temperature", 0.4),
        "max_tokens": payload.get("maxTokens", 1200),
        "stream": False,
    }
    data = http_json(OPENAI_URL + "/chat/completions", body, timeout=AI_TIMEOUT)
    choices = data.get("choices") or []
    text = ""
    if choices:
        message = choices[0].get("message") or {}
        text = message.get("content") or choices[0].get("text") or ""
    if not text:
        raise RuntimeError("OpenAI-compatible server returned an empty response")
    return text, model


def generate_ai(payload):
    status = ai_status()
    provider = payload.get("provider")
    if not provider:
        preferred = status.get("preferred") or {}
        provider = preferred.get("provider")
    if not provider:
        raise RuntimeError(
            "No local AI runtime found. Start Ollama (ollama serve) or LM Studio, "
            "or set OLLAMA_URL / OPENAI_URL."
        )
    payload = dict(payload)
    payload.setdefault("models", status.get("models") or [])
    if provider == "openai":
        text, model = generate_openai(payload)
    else:
        text, model = generate_ollama(payload)
    return {"ok": True, "provider": provider, "model": model, "text": text}


class Handler(SimpleHTTPRequestHandler):
    server_version = "AIJobSearchBridge/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):  # noqa: A003 - stdlib signature
        if self.path.startswith("/api/"):
            log("%s - %s" % (self.command, self.path.split("?")[0]))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def do_OPTIONS(self):  # noqa: N802 - stdlib callback
        self.send_response(204)
        self.end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for key, value in JSON_HEADERS.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802 - stdlib callback
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            return self.send_json(200, {
                "ok": True,
                "service": "ai-job-search",
                "proxy": True,
                "ai": True,
                "time": int(time.time()),
            })
        if path in ("/api/ai/status", "/api/ai/models"):
            return self.send_json(200, ai_status())
        if path == "/api/proxy":
            query = urllib.parse.parse_qs(parsed.query)
            url = (query.get("url") or [""])[0]
            return self.handle_proxy(url, method="GET", body=None, headers={})

        return super().do_GET()

    def do_POST(self):  # noqa: N802 - stdlib callback
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/ai":
            try:
                payload = read_json_request(self)
                if not payload.get("prompt"):
                    return self.send_json(400, {"ok": False, "error": "Missing prompt"})
                return self.send_json(200, generate_ai(payload))
            except Exception as exc:  # noqa: BLE001 - returned to the client
                return self.send_json(502, {"ok": False, "error": str(exc)})

        if path == "/api/proxy":
            try:
                payload = read_json_request(self)
            except Exception as exc:  # noqa: BLE001
                return self.send_json(400, {"ok": False, "error": str(exc)})
            url = payload.get("url") or ""
            method = (payload.get("method") or "GET").upper()
            body = payload.get("body")
            headers = payload.get("headers") or {}
            return self.handle_proxy(url, method=method, body=body, headers=headers)

        return self.send_json(404, {"ok": False, "error": "Not found"})

    def handle_proxy(self, url, method="GET", body=None, headers=None):
        if not url:
            return self.send_json(400, {"ok": False, "error": "Missing url"})
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return self.send_json(400, {"ok": False, "error": "Only http(s) URLs are allowed"})
        if not host_allowed(parsed.hostname):
            return self.send_json(403, {"ok": False, "error": "Host not allowed: %s" % parsed.hostname})

        outgoing = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/html, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9,da;q=0.8",
            "Accept-Encoding": "identity",
            "Cache-Control": "no-cache",
        }
        host = (parsed.hostname or "").lower()
        for suffix, extra in HOST_HEADERS.items():
            if host == suffix or host.endswith("." + suffix):
                outgoing.update(extra)
                break
        if isinstance(headers, dict):
            for key, value in headers.items():
                if not isinstance(key, str) or not isinstance(value, (str, int, float)):
                    continue
                lowered = key.lower()
                if lowered in ("host", "content-length", "connection", "accept-encoding"):
                    continue
                outgoing[key] = str(value)

        data = None
        if method in ("POST", "PUT", "PATCH") and body is not None:
            if isinstance(body, (dict, list)):
                data = json.dumps(body).encode("utf-8")
                outgoing.setdefault("Content-Type", "application/json")
            else:
                data = str(body).encode("utf-8")
        elif method in ("POST", "PUT", "PATCH") and body is None:
            data = b""

        request = urllib.request.Request(url, data=data, headers=outgoing, method=method)
        try:
            with urllib.request.urlopen(request, timeout=PROXY_TIMEOUT) as response:
                final = urllib.parse.urlparse(response.geturl())
                if not host_allowed(final.hostname):
                    return self.send_json(403, {"ok": False, "error": "Redirect to a host that is not allowed"})
                payload = response.read()
                content_type = response.headers.get("Content-Type", "application/octet-stream")
                status = response.status
        except urllib.error.HTTPError as exc:
            payload = exc.read() or b""
            content_type = exc.headers.get("Content-Type", "text/plain")
            status = exc.code
        except Exception as exc:  # noqa: BLE001 - returned to the client
            return self.send_json(502, {"ok": False, "error": str(exc)})

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    parser = argparse.ArgumentParser(description="Local bridge for the AI Job Search app")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--open", action="store_true", help="Open the app in a browser")
    args = parser.parse_args()

    os.chdir(str(ROOT))
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    address = "http://%s:%d/" % (args.host, args.port)
    print("AI Job Search running at %s" % address)
    print("Proxy:   %sapi/proxy" % address)
    print("AI:      %sapi/ai  (Ollama %s | OpenAI-compatible %s)" % (address, OLLAMA_URL, OPENAI_URL))
    print("Press Ctrl+C to stop.")
    if args.open:
        threading.Timer(1.0, lambda: webbrowser.open(address)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
