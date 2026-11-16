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
PLANS_FILE = os.path.join(os.path.dirname(DATA_FILE), "plans.json")  # {day: {"turns": n, "minutes": m}}
LOG_DIR = os.path.join(os.path.dirname(DATA_FILE), "log")  # one JSON-lines file per UTC day
ACTIONS = {"app", "show", "hide", "open", "play", "pause", "home", "end", "again", "restart", "timeup", "rotate", "error"}
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
    """Last reset as (ms timestamp, day or None). Day None means everything.
    Devices that have not seen it yet are told to clear their own copy, and
    their old numbers are not stored. Set by POST /api/reset."""
    try:
        with open(RESET_FILE) as f:
            raw = f.read().strip()
    except OSError:
        return 0, None
    try:
        r = json.loads(raw or "0")
    except ValueError:
        return 0, None
    if isinstance(r, dict):
        return int(r.get("at") or 0), r.get("day")
    return int(r), None


def do_reset(day):
    """Clear one day (or everything) on every device."""
    at = int(time.time() * 1000)
    with lock:
        devices = load()
        for d in devices.values():
            for name in ("watch", "vwatch", "turnEnds"):
                if day is None:
                    d[name] = {}
                else:
                    d.get(name, {}).pop(day, None)
        store(devices)
        tmp = RESET_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump({"at": at, "day": day}, f)
        os.replace(tmp, RESET_FILE)
    return at


def load_plans():
    try:
        with open(PLANS_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_plan(day, turns, minutes):
    """Parents pick today's turns, e.g. 4 x 15 minutes. Keeps the last 7 days."""
    with lock:
        plans = load_plans()
        plans[day] = {"turns": turns, "minutes": minutes}
        plans = {d: plans[d] for d in sorted(plans, reverse=True)[:7]}
        tmp = PLANS_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(plans, f)
        os.replace(tmp, PLANS_FILE)
    return plans


def clean_event(ev, device, label):
    """One action from the app, e.g. {"at": ms, "a": "open", "v": id, "s": show, "t": 12, "w": 60}."""
    if not isinstance(ev, dict) or ev.get("a") not in ACTIONS or not isinstance(ev.get("at"), (int, float)):
        return None
    out = {"at": int(ev["at"]), "a": ev["a"], "d": device, "dl": label}
    for k in ("v", "s"):
        if isinstance(ev.get(k), str) and KEY.match(ev[k]):
            out[k] = ev[k]
    for k in ("t", "w", "from", "deg", "code"):
        if isinstance(ev.get(k), (int, float)) and 0 <= ev[k] <= 10 ** 7:
            out[k] = int(ev[k])
    return out


def append_log(events, device, label):
    os.makedirs(LOG_DIR, exist_ok=True)
    by_day = {}
    for ev in events:
        e = clean_event(ev, device, label)
        if e:
            day = time.strftime("%Y-%m-%d", time.gmtime(e["at"] / 1000))
            by_day.setdefault(day, []).append(json.dumps(e, ensure_ascii=False))
    for day, lines in by_day.items():
        with open(os.path.join(LOG_DIR, day + ".jsonl"), "a") as f:
            f.write("\n".join(lines) + "\n")


def read_log(since):
    """Actions from `since` (ms) until now, oldest first, at most 3000."""
    out = []
    t = max(since / 1000, time.time() - 8 * 86400)
    days = sorted({time.strftime("%Y-%m-%d", time.gmtime(t + i * 86400)) for i in range(int((time.time() - t) / 86400) + 2)})
    for day in days:
        try:
            with open(os.path.join(LOG_DIR, day + ".jsonl")) as f:
                for line in f:
                    try:
                        e = json.loads(line)
                    except ValueError:
                        continue
                    if e.get("at", 0) >= since:
                        out.append(e)
        except OSError:
            pass
    return out[-3000:]


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


def clean_pos(raw):
    """Where each video was left: {id: {"t": seconds, "at": ms}}, newest 150."""
    out = {}
    if isinstance(raw, dict):
        for k, v in raw.items():
            if isinstance(k, str) and KEY.match(k) and isinstance(v, dict) \
                    and isinstance(v.get("t"), (int, float)) and isinstance(v.get("at"), (int, float)):
                out[k] = {"t": max(0, int(v["t"])), "at": int(v["at"])}
    return dict(sorted(out.items(), key=lambda kv: kv[1]["at"])[-150:])


def clean_ends(raw):
    out = {}
    if isinstance(raw, dict):
        for day in sorted((d for d in raw if isinstance(d, str) and DAY.match(d)), reverse=True)[:3]:
            vals = raw[day]
            if isinstance(vals, list):
                out[day] = [int(v) if isinstance(v, (int, float)) and v > 0 else None for v in vals[:10]]
    return out


def others(devices, me):
    total = {"watch": {}, "vwatch": {}, "turnEnds": {}, "pos": {}}
    for dev, d in devices.items():
        if dev == me:
            continue
        for name in ("watch", "vwatch"):
            for day, vals in d.get(name, {}).items():
                t = total[name].setdefault(day, {})
                for k, v in vals.items():
                    t[k] = t.get(k, 0) + v
        for vid, p in d.get("pos", {}).items():
            if vid not in total["pos"] or p["at"] > total["pos"][vid]["at"]:
                total["pos"][vid] = p  # the newest place wins
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
        if self.path not in ("/api/sync", "/api/reset", "/api/plan"):
            return self.reply(404, {"error": "not found"})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self.reply(413, {"error": "bad size"})
        if self.path == "/api/plan":  # {"day": "2026-11-16", "turns": 4, "minutes": 15}
            try:
                b = json.loads(self.rfile.read(size))
                day, turns, minutes = b["day"], b["turns"], b["minutes"]
                assert isinstance(day, str) and DAY.match(day)
                assert isinstance(turns, int) and 1 <= turns <= 8
                assert isinstance(minutes, int) and 5 <= minutes <= 60
            except (ValueError, KeyError, AssertionError, TypeError):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"plans": save_plan(day, turns, minutes)})
        if self.path == "/api/reset":  # parents' button: {"day": "2026-11-16"} clears that day
            try:
                day = json.loads(self.rfile.read(size)).get("day")
                assert isinstance(day, str) and DAY.match(day)
            except (ValueError, AssertionError, AttributeError):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"reset": do_reset(day), "resetDay": day})
        try:
            body = json.loads(self.rfile.read(size))
            device = body["device"]
            data = body.get("data") or {}
            assert isinstance(device, str) and KEY.match(device)
        except (ValueError, KeyError, AssertionError, TypeError):
            return self.reply(400, {"error": "bad request"})
        label = body.get("label")
        mine = {"watch": clean_counts(data.get("watch")), "vwatch": clean_counts(data.get("vwatch")),
                "turnEnds": clean_ends(data.get("turnEnds")), "pos": clean_pos(data.get("pos")),
                "label": label[:40] if isinstance(label, str) else "", "seen": int(time.time() * 1000)}
        reset, reset_day = reset_at()
        seen = body.get("resetSeen")
        if reset and (not isinstance(seen, (int, float)) or seen < reset):
            return self.reply(200, {"reset": reset, "resetDay": reset_day})  # clear first, then sync again
        log = body.get("log") if isinstance(body.get("log"), list) else []
        with lock:
            devices = load()
            if device not in devices and len(devices) >= MAX_DEVICES:
                return self.reply(403, {"error": "too many devices"})
            if log:
                append_log(log[:500], device, mine["label"])
            devices[device] = mine
            store(devices)
            result_reset = reset
            if body.get("all"):  # parents' report: every device, each on its own
                result = {"me": device, "devices": devices}
                since = body.get("logSince")
                if isinstance(since, (int, float)):
                    result["log"] = read_log(since)
            else:
                result = others(devices, device)
        result["reset"] = result_reset
        result["resetDay"] = reset_day
        result["plans"] = load_plans()
        result["logged"] = len(log[:500])
        self.reply(200, result)

    def log_message(self, fmt, *args):
        pass  # keep the journal quiet


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
