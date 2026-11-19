"""Kids TV server: family accounts, device pairing and each family's watch data.

Accounts
    A family has one or more parent logins (email + password; the password is
    kept only as a salted PBKDF2 hash). Signing up creates a new family.
    POST /api/signup {email, password, name}   -> {token}
    POST /api/login  {email, password}         -> {token}
    POST /api/logout                           (auth)
    POST /api/me                               (auth) -> who and which family

Pairing a TV (or any device) with a QR code
    The device asks for a short code and shows it as a QR code; a logged-in
    parent opens the QR link on the phone and approves; the device then gets
    its own login token. Codes work once and for 10 minutes.
    POST /api/pair/new                          -> {pair, code, expires}
    POST /api/pair/wait {pair}                  -> {status: waiting|ok|expired, token?}
    POST /api/pair/approve {code}               (parent auth)
    POST /api/devices                           (auth) -> the family's logins
    POST /api/devices/remove {id}               (parent auth)

Parents' code (4 digits, so the child cannot open the report)
    POST /api/pin/status                        (auth) -> {set}
    POST /api/pin/check {pin}                   (auth) -> ok; 5 wrong tries lock it for 10 minutes
    POST /api/pin/set {pin, old?}               (parent auth; old needed to change an existing code)

Watch data (all need auth and only touch that family's files)
    POST /api/sync, /api/reset, /api/plan       as before (see the app).
    Each device sends its own counts; the reply is the sum of the family's
    other devices, so nobody is counted twice.

Tokens are random; only their SHA-256 is stored. Data: STATS_ROOT (default
/var/lib/kids-tube): accounts.json, sessions.json, families/<id>/... The
files from before accounts (stats.json, plans.json, reset, log/) are moved by
hand into the right family: python3 stats_server.py --claim <email>
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.environ.get("STATS_ROOT") or os.path.dirname(os.environ.get("STATS_FILE", "/var/lib/kids-tube/stats.json"))
ACCOUNTS = os.path.join(ROOT, "accounts.json")
SESSIONS = os.path.join(ROOT, "sessions.json")
FAMILIES = os.path.join(ROOT, "families")
LEGACY = ["stats.json", "plans.json", "reset", "log"]  # data from before accounts

ACTIONS = {"app", "show", "hide", "open", "play", "pause", "home", "end", "again", "restart", "timeup", "rotate", "error", "page", "game"}
PORT = int(os.environ.get("STATS_PORT", "8080"))
ORIGINS = {"https://noyantv.com", "https://ntv.financemind.com", "https://financemind.github.io"}
if os.environ.get("STATS_DEV"):
    ORIGINS.add("http://localhost:8765")  # local testing only
MAX_BODY = 200_000
MAX_DEVICES = 30
PAIR_SECONDS = 600
DAY = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}$")
KEY = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$")
CODE_CHARS = "ACDEFGHJKMNPQRTUVWXY3479"  # no look-alikes (0/O, 1/I/L, 5/S, 8/B, 2/Z, 6)

lock = threading.Lock()
pairs = {}        # pair id -> {code, created, fid, token}
fails = {}        # (ip, email) -> [count, first fail time]
pin_fails = {}    # family id -> [count, first fail time]
PIN = re.compile(r"^[0-9]{4}$")


# ---------- small file helpers ----------

def read_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, path)


def fam_path(fid, name):
    return os.path.join(FAMILIES, fid, name)


def now_ms():
    return int(time.time() * 1000)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


# ---------- accounts and sessions ----------

def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    return salt, hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()


def new_session(fid, kind, who):
    """Create a login for a parent ("parent", who = email) or a paired device ("device", who = label)."""
    token = secrets.token_urlsafe(32)
    sessions = read_json(SESSIONS, {})
    sessions[sha(token)] = {"fid": fid, "kind": kind, "who": who, "created": now_ms(), "last": now_ms()}
    write_json(SESSIONS, sessions)
    return token


def session_for(token):
    if not token:
        return None
    sessions = read_json(SESSIONS, {})
    s = sessions.get(sha(token))
    if s and now_ms() - s.get("last", 0) > 3600_000:  # remember the last visit, at most once an hour
        s["last"] = now_ms()
        write_json(SESSIONS, sessions)
    return s


def move_legacy_into(fid):
    """The first family gets the data from before accounts."""
    for name in LEGACY:
        src = os.path.join(ROOT, name)
        if os.path.exists(src):
            os.makedirs(os.path.join(FAMILIES, fid), exist_ok=True)
            shutil.move(src, fam_path(fid, name))


def signup(email, password, name):
    with lock:
        acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
        if email in acc["users"]:
            return None, "exists"
        fid = secrets.token_hex(8)
        acc["families"][fid] = {"name": name or email.split("@")[0], "created": now_ms()}
        salt, h = hash_password(password)
        acc["users"][email] = {"fid": fid, "salt": salt, "hash": h, "created": now_ms()}
        write_json(ACCOUNTS, acc)
        os.makedirs(os.path.join(FAMILIES, fid), exist_ok=True)
        return new_session(fid, "parent", email), None


def add_parent(fid, email, password):
    """A second parent joins an existing family (from the report)."""
    with lock:
        acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
        if email in acc["users"]:
            return "exists"
        salt, h = hash_password(password)
        acc["users"][email] = {"fid": fid, "salt": salt, "hash": h, "created": now_ms()}
        write_json(ACCOUNTS, acc)
        return None


def too_many_fails(ip, email):
    f = fails.get((ip, email))
    if f and time.time() - f[1] > 600:
        fails.pop((ip, email), None)
        return False
    return bool(f and f[0] >= 5)


def login(email, password, ip):
    if too_many_fails(ip, email):
        return None, "wait"
    acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
    u = acc["users"].get(email)
    if u and hmac.compare_digest(hash_password(password, u["salt"])[1], u["hash"]):
        fails.pop((ip, email), None)
        with lock:
            return new_session(u["fid"], "parent", email), None
    f = fails.setdefault((ip, email), [0, time.time()])
    f[0] += 1
    return None, "wrong"


# ---------- pairing ----------

def clean_pairs():
    for pid in [p for p, v in pairs.items() if time.time() - v["created"] > PAIR_SECONDS]:
        pairs.pop(pid, None)


def pair_new():
    with lock:
        clean_pairs()
        if len(pairs) > 500:
            return None
        used = {v["code"] for v in pairs.values()}
        while True:
            code = "".join(secrets.choice(CODE_CHARS) for _ in range(4))
            if code not in used:
                break
        pid = secrets.token_urlsafe(16)
        pairs[pid] = {"code": code, "created": time.time(), "fid": None, "token": None}
        return {"pair": pid, "code": code, "expires": PAIR_SECONDS}


def pair_approve(code, fid, label):
    with lock:
        clean_pairs()
        for p in pairs.values():
            if p["code"] == code and not p["fid"]:
                p["fid"] = fid
                p["token"] = new_session(fid, "device", label or "دستگاه")
                return True
        return False


def pair_wait(pid):
    with lock:
        clean_pairs()
        p = pairs.get(pid)
        if not p:
            return {"status": "expired"}
        if p["token"]:
            pairs.pop(pid, None)  # the token is handed out once
            return {"status": "ok", "token": p["token"]}
        return {"status": "waiting"}


def family_logins(fid, my_hash):
    acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
    out = []
    for h, s in read_json(SESSIONS, {}).items():
        if s["fid"] == fid:
            out.append({"id": h[:12], "kind": s["kind"], "who": s["who"], "created": s["created"], "last": s.get("last"), "me": h == my_hash})
    parents = [e for e, u in acc["users"].items() if u["fid"] == fid]
    return {"family": acc["families"].get(fid, {}).get("name", ""), "parents": parents, "logins": out}


def remove_login(fid, short_id):
    with lock:
        sessions = read_json(SESSIONS, {})
        for h in list(sessions):
            if h[:12] == short_id and sessions[h]["fid"] == fid:
                sessions.pop(h)
                write_json(SESSIONS, sessions)
                return True
        return False


# ---------- parents' code ----------

def pin_info(fid):
    return read_json(fam_path(fid, "settings.json"), {})


def pin_ok(fid, pin):
    """True / False, or None while locked after too many wrong tries."""
    f = pin_fails.get(fid)
    if f and time.time() - f[1] > 600:
        pin_fails.pop(fid, None)
        f = None
    if f and f[0] >= 5:
        return None
    info = pin_info(fid)
    if not info.get("pin_hash"):
        return True
    good = hmac.compare_digest(hash_password(pin, info["pin_salt"])[1], info["pin_hash"])
    if good:
        pin_fails.pop(fid, None)
    else:
        f = pin_fails.setdefault(fid, [0, time.time()])
        f[0] += 1
    return good


def pin_set(fid, pin):
    salt, h = hash_password(pin)
    with lock:
        info = pin_info(fid)
        info.update({"pin_salt": salt, "pin_hash": h})
        write_json(fam_path(fid, "settings.json"), info)


# ---------- one family's watch data ----------

def reset_at(fid):
    """Last reset as (ms timestamp, day or None)."""
    r = read_json(fam_path(fid, "reset"), 0)
    if isinstance(r, dict):
        return int(r.get("at") or 0), r.get("day")
    return int(r or 0), None


def do_reset(fid, day):
    at = now_ms()
    with lock:
        devices = read_json(fam_path(fid, "stats.json"), {})
        for d in devices.values():
            for name in ("watch", "vwatch", "turnEnds"):
                d.get(name, {}).pop(day, None)
        write_json(fam_path(fid, "stats.json"), devices)
        write_json(fam_path(fid, "reset"), {"at": at, "day": day})
    return at


def save_plan(fid, day, turns, minutes):
    with lock:
        plans = read_json(fam_path(fid, "plans.json"), {})
        plans[day] = {"turns": turns, "minutes": minutes}
        plans = {d: plans[d] for d in sorted(plans, reverse=True)[:7]}
        write_json(fam_path(fid, "plans.json"), plans)
    return plans


def clean_event(ev, device, label):
    if not isinstance(ev, dict) or ev.get("a") not in ACTIONS or not isinstance(ev.get("at"), (int, float)):
        return None
    out = {"at": int(ev["at"]), "a": ev["a"], "d": device, "dl": label}
    for k in ("v", "s"):
        if isinstance(ev.get(k), str) and KEY.match(ev[k]):
            out[k] = ev[k]
    for k in ("ua", "size"):
        if isinstance(ev.get(k), str):
            out[k] = ev[k][:200]
    for k in ("t", "w", "from", "deg", "code"):
        if isinstance(ev.get(k), (int, float)) and 0 <= ev[k] <= 10 ** 7:
            out[k] = int(ev[k])
    return out


def append_log(fid, events, device, label):
    by_day = {}
    for ev in events:
        e = clean_event(ev, device, label)
        if e:
            by_day.setdefault(time.strftime("%Y-%m-%d", time.gmtime(e["at"] / 1000)), []).append(json.dumps(e, ensure_ascii=False))
    os.makedirs(fam_path(fid, "log"), exist_ok=True)
    for day, lines in by_day.items():
        with open(os.path.join(fam_path(fid, "log"), day + ".jsonl"), "a") as f:
            f.write("\n".join(lines) + "\n")


def read_log(fid, since):
    out = []
    t = max(since / 1000, time.time() - 8 * 86400)
    days = sorted({time.strftime("%Y-%m-%d", time.gmtime(t + i * 86400)) for i in range(int((time.time() - t) / 86400) + 2)})
    for day in days:
        try:
            with open(os.path.join(fam_path(fid, "log"), day + ".jsonl")) as f:
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
                total["pos"][vid] = p
        for day, ends in d.get("turnEnds", {}).items():
            t = total["turnEnds"].setdefault(day, [])
            for i, v in enumerate(ends):
                while len(t) <= i:
                    t.append(None)
                if v and (t[i] is None or v < t[i]):
                    t[i] = v
    return total


def sync(fid, body):
    device, data = body["device"], body.get("data") or {}
    label = body.get("label")
    mine = {"watch": clean_counts(data.get("watch")), "vwatch": clean_counts(data.get("vwatch")),
            "turnEnds": clean_ends(data.get("turnEnds")), "pos": clean_pos(data.get("pos")),
            "label": label[:40] if isinstance(label, str) else "", "seen": now_ms()}
    reset, reset_day = reset_at(fid)
    plans = read_json(fam_path(fid, "plans.json"), {})
    if body.get("readonly") and body.get("all"):
        result = {"me": None, "devices": read_json(fam_path(fid, "stats.json"), {})}
        if isinstance(body.get("logSince"), (int, float)):
            result["log"] = read_log(fid, body["logSince"])
        result.update({"reset": 0, "resetDay": reset_day, "plans": plans, "logged": 0})
        return 200, result
    seen = body.get("resetSeen")
    if reset and (not isinstance(seen, (int, float)) or seen < reset):
        return 200, {"reset": reset, "resetDay": reset_day}
    log = body.get("log") if isinstance(body.get("log"), list) else []
    with lock:
        devices = read_json(fam_path(fid, "stats.json"), {})
        if device not in devices and len(devices) >= MAX_DEVICES:
            return 403, {"error": "too many devices"}
        if log:
            append_log(fid, log[:500], device, mine["label"])
        devices[device] = mine
        write_json(fam_path(fid, "stats.json"), devices)
        if body.get("all"):
            result = {"me": device, "devices": devices}
            if isinstance(body.get("logSince"), (int, float)):
                result["log"] = read_log(fid, body["logSince"])
        else:
            result = others(devices, device)
    result.update({"reset": reset, "resetDay": reset_day, "plans": plans, "logged": len(log[:500])})
    return 200, result


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):
    def cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

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

    def client_ip(self):
        return self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()

    def token(self):
        h = self.headers.get("Authorization", "")
        return h[7:] if h.startswith("Bearer ") else ""

    def do_POST(self):
        size = int(self.headers.get("Content-Length") or 0)
        if size < 0 or size > MAX_BODY:
            return self.reply(413, {"error": "bad size"})
        try:
            body = json.loads(self.rfile.read(size) or b"{}")
            assert isinstance(body, dict)
        except (ValueError, AssertionError):
            return self.reply(400, {"error": "bad request"})
        path = self.path

        # --- no login needed ---
        if path in ("/api/signup", "/api/login"):
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", ""))
            if not EMAIL.match(email) or not 8 <= len(password) <= 200:
                return self.reply(400, {"error": "bad email or password"})
            if path == "/api/signup":
                token, err = signup(email, password, str(body.get("name", ""))[:60])
                return self.reply(409, {"error": err}) if err else self.reply(200, {"token": token})
            token, err = login(email, password, self.client_ip())
            if err:
                return self.reply(429 if err == "wait" else 401, {"error": err})
            return self.reply(200, {"token": token})
        if path == "/api/pair/new":
            p = pair_new()
            return self.reply(200, p) if p else self.reply(503, {"error": "busy"})
        if path == "/api/pair/wait":
            return self.reply(200, pair_wait(str(body.get("pair", ""))))

        # --- everything else: a family login ---
        tok = self.token()
        s = session_for(tok)
        if not s:
            return self.reply(401, {"error": "login"})
        fid = s["fid"]
        if path == "/api/logout":
            remove_login(fid, sha(tok)[:12])
            return self.reply(200, {"ok": True})
        if path == "/api/me":
            acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
            return self.reply(200, {"kind": s["kind"], "who": s["who"], "family": acc["families"].get(fid, {}).get("name", "")})
        if path == "/api/devices":
            return self.reply(200, family_logins(fid, sha(tok)))
        if path == "/api/pin/status":
            return self.reply(200, {"set": bool(pin_info(fid).get("pin_hash"))})
        if path == "/api/pin/check":
            ok = pin_ok(fid, str(body.get("pin", "")))
            if ok is None:
                return self.reply(429, {"error": "wait"})
            return self.reply(200, {"ok": True}) if ok else self.reply(403, {"error": "pin"})
        if path == "/api/sync":
            if not (isinstance(body.get("device"), str) and KEY.match(body["device"])):
                return self.reply(400, {"error": "bad request"})
            code, result = sync(fid, body)
            return self.reply(code, result)
        if path == "/api/plan":
            day, turns, minutes = body.get("day"), body.get("turns"), body.get("minutes")
            if not (isinstance(day, str) and DAY.match(day) and isinstance(turns, int) and 1 <= turns <= 8
                    and isinstance(minutes, int) and 5 <= minutes <= 60):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"plans": save_plan(fid, day, turns, minutes)})
        if path == "/api/reset":
            day = body.get("day")
            if not (isinstance(day, str) and DAY.match(day)):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"reset": do_reset(fid, day), "resetDay": day})

        # --- parents only ---
        if s["kind"] != "parent":
            return self.reply(403, {"error": "parents only"})
        if path == "/api/pin/set":
            pin = str(body.get("pin", ""))
            if not PIN.match(pin):
                return self.reply(400, {"error": "pin must be 4 digits"})
            if pin_info(fid).get("pin_hash"):
                ok = pin_ok(fid, str(body.get("old", "")))
                if not ok:
                    return self.reply(429 if ok is None else 403, {"error": "old pin"})
            pin_set(fid, pin)
            return self.reply(200, {"ok": True})
        if path == "/api/pair/approve":
            code = str(body.get("code", "")).strip().upper()
            ok = pair_approve(code, fid, str(body.get("label", ""))[:40])
            return self.reply(200, {"ok": True}) if ok else self.reply(404, {"error": "code"})
        if path == "/api/devices/remove":
            return self.reply(200, {"ok": remove_login(fid, str(body.get("id", "")))})
        if path == "/api/parents/add":
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", ""))
            if not EMAIL.match(email) or not 8 <= len(password) <= 200:
                return self.reply(400, {"error": "bad email or password"})
            err = add_parent(fid, email, password)
            return self.reply(409, {"error": err}) if err else self.reply(200, {"ok": True})
        self.reply(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "--claim":  # move the old data into this parent's family
        acc = read_json(ACCOUNTS, {"users": {}, "families": {}})
        user = acc["users"].get(sys.argv[2].strip().lower())
        if not user:
            raise SystemExit("no such account")
        move_legacy_into(user["fid"])
        print("moved old data into family", user["fid"])
    else:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
