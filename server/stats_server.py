"""Tiny shared store for watch time, so every device sees the same day.

Each device keeps its own counts and sends them all in one POST /api/sync:
    {"device": "<random id>", "label": "تلویزیون", "data": {"watch": {...}, "vwatch": {...}, "turnEnds": {...}}}
The reply is the sum of every OTHER device's counts in the same shape, so the
app adds it to its own without counting itself twice. Data lives in one JSON
file; only watch numbers are stored, nothing personal.
"""
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATA_FILE = os.environ.get("STATS_FILE", "/var/lib/kids-tube/stats.json")
RESET_FILE = os.path.join(os.path.dirname(DATA_FILE), "reset")  # holds a ms timestamp; see reset_at()
PORT = int(os.environ.get("STATS_PORT", "8080"))
ORIGINS = {"https://ntv.financemind.com", "https://financemind.github.io", "http://localhost:8765"}
MAX_BODY = 200_000
MAX_DEVICES = 30
DAY = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}$")
KEY = re.compile(r"^[A-Za-z0-9_-]{1,40}$")

lock = threading.Lock()


def load():
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def store(devices):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(devices, f)
    os.replace(tmp, DATA_FILE)


def reset_at():
    """Parents can wipe every device's counts: write a new ms timestamp to
    RESET_FILE (and empty DATA_FILE). Devices that have not seen it yet are
    told to clear their own copy, and their old numbers are not stored."""
    try:
        with open(RESET_FILE) as f:
            return int(f.read().strip() or 0)
    except (OSError, ValueError):
        return 0


def clean_counts(raw):
    """Keep only {day: {key: seconds}} with sane values; the last 31 days."""
    out = {}
    if not isinstance(raw, dict):
        return out
    for day in sorted((d for d in raw if isinstance(d, str) and DAY.match(d)), reverse=True)[:31]:
        vals = raw[day]
        if isinstance(vals, dict):
            out[day] = {k: int(v) for k, v in vals.items()
                        if isinstance(k, str) and KEY.match(k) and isinstance(v, (int, float)) and 0 <= v <= 86400}
    return out


def clean_ends(raw):
    out = {}
    if isinstance(raw, dict):
        for day in sorted((d for d in raw if isinstance(d, str) and DAY.match(d)), reverse=True)[:3]:
            vals = raw[day]
            if isinstance(vals, list):
                out[day] = [int(v) if isinstance(v, (int, float)) and v > 0 else None for v in vals[:10]]
    return out


def others(devices, me):
    total = {"watch": {}, "vwatch": {}, "turnEnds": {}}
    for dev, d in devices.items():
        if dev == me:
            continue
        for name in ("watch", "vwatch"):
            for day, vals in d.get(name, {}).items():
                t = total[name].setdefault(day, {})
                for k, v in vals.items():
                    t[k] = t.get(k, 0) + v
        for day, ends in d.get("turnEnds", {}).items():
            t = total["turnEnds"].setdefault(day, [])
            for i, v in enumerate(ends):
                while len(t) <= i:
                    t.append(None)
                if v and (t[i] is None or v < t[i]):
                    t[i] = v  # the earliest end of each turn wins
    return total


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def reply(self, code, body):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            return self.reply(200, {"ok": True})
        self.reply(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/api/sync":
            return self.reply(404, {"error": "not found"})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self.reply(413, {"error": "bad size"})
        try:
            body = json.loads(self.rfile.read(size))
            device = body["device"]
            data = body.get("data") or {}
            assert isinstance(device, str) and KEY.match(device)
        except (ValueError, KeyError, AssertionError, TypeError):
            return self.reply(400, {"error": "bad request"})
        label = body.get("label")
        mine = {"watch": clean_counts(data.get("watch")), "vwatch": clean_counts(data.get("vwatch")),
                "turnEnds": clean_ends(data.get("turnEnds")),
                "label": label[:40] if isinstance(label, str) else "", "seen": int(time.time() * 1000)}
        reset = reset_at()
        seen = body.get("resetSeen")
        if reset and (not isinstance(seen, (int, float)) or seen < reset):
            return self.reply(200, {"reset": reset})  # clear first, then sync again
        with lock:
            devices = load()
            if device not in devices and len(devices) >= MAX_DEVICES:
                return self.reply(403, {"error": "too many devices"})
            devices[device] = mine
            store(devices)
            result_reset = reset
            if body.get("all"):  # parents' report: every device, each on its own
                result = {"me": device, "devices": devices}
            else:
                result = others(devices, device)
        result["reset"] = result_reset
        self.reply(200, result)

    def log_message(self, fmt, *args):
        pass  # keep the journal quiet


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
