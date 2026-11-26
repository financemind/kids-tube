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
import base64
import hashlib
import hmac
import json
import os
import queue
import re
import secrets
import shutil
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.environ.get("STATS_ROOT") or os.path.dirname(os.environ.get("STATS_FILE", "/var/lib/kids-tube/stats.json"))
ACCOUNTS = os.path.join(ROOT, "accounts.json")
SESSIONS = os.path.join(ROOT, "sessions.json")
FAMILIES = os.path.join(ROOT, "families")
LEGACY = ["stats.json", "plans.json", "reset", "log"]  # data from before accounts

ACTIONS = {"app", "show", "hide", "open", "play", "pause", "home", "end", "again", "restart", "timeup", "rotate", "error", "page", "game", "score"}
PORT = int(os.environ.get("STATS_PORT", "8080"))
ORIGINS = {"https://noyantv.com", "https://ntv.financemind.com", "https://financemind.github.io"}
if os.environ.get("STATS_DEV"):
    ORIGINS.add("http://localhost:8765")  # local testing only
MAX_BODY = 200_000
MAX_DEVICES = 100  # per family; old devices that stopped syncing stay in the history
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


def theme_set(fid, theme):
    """The clock picture the parents chose for the child (a short name, e.g. "pup")."""
    with lock:
        info = pin_info(fid)
        info["theme"] = theme
        write_json(fam_path(fid, "settings.json"), info)


def family_theme(fid):
    return pin_info(fid).get("theme", "")


def games_set(fid, enabled, off):
    """The games part of the app: on or off for the family, and which games are switched off."""
    with lock:
        info = pin_info(fid)
        info["games"] = {"enabled": enabled, "off": off}
        write_json(fam_path(fid, "settings.json"), info)


def family_games(fid):
    return pin_info(fid).get("games") or {"enabled": False, "off": []}  # off until a parent switches them on


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


def save_plan(fid, day, turns, minutes, extra=0, bedtime=None):
    """extra: seconds given (or, below 0, taken away) on top of the turns, e.g. +10 minutes for this turn.
    bedtime: tonight only, minutes after midnight when only stories are left (e.g. 1350 = 22:30;
    up to 1560 = 2 at night); None = the usual time."""
    with lock:
        plans = read_json(fam_path(fid, "plans.json"), {})
        plans[day] = {"turns": turns, "minutes": minutes, "extra": extra}
        if bedtime is not None:
            plans[day]["bedtime"] = bedtime
        plans = {d: plans[d] for d in sorted(plans, reverse=True)[:7]}
        write_json(fam_path(fid, "plans.json"), plans)
    return plans


# ---------- live: what each open app shows right now (kept in memory only) ----------
# Every open app tells the server every few seconds what it shows (a video,
# a story, a game, home, a break). The parents' page reads it to show "now
# watching", and the app's reply carries when today's plan last changed, so a
# change made by a parent reaches the TV within seconds, without a refresh.
LIVE = {}  # fid -> device -> status
LIVE_FOR_MS = 30_000  # a status older than this is not "now" any more
LIVE_STATES = {"video", "story", "game", "home", "rest", "pick", "pair"}


def plans_changed_at(fid):
    """When today's plan or the family settings (e.g. the clock picture) last changed."""
    out = 0
    for name in ("plans.json", "settings.json"):
        try:
            out = max(out, int(os.path.getmtime(fam_path(fid, name)) * 1000))
        except OSError:
            pass
    return out


def live_set(fid, device, label, now):
    st = {"state": now.get("state") if now.get("state") in LIVE_STATES else "home", "at": now_ms(),
          "label": label[:40] if isinstance(label, str) else ""}
    for k in ("v", "s"):
        if isinstance(now.get(k), str) and KEY.match(now[k]):
            st[k] = now[k]
    if isinstance(now.get("title"), str):
        st["title"] = now["title"][:150]
    for k in ("t", "d", "left", "turn", "turns"):
        if isinstance(now.get(k), (int, float)) and -10 ** 6 <= now[k] <= 10 ** 7:
            st[k] = int(now[k])
    if isinstance(now.get("playing"), bool):
        st["playing"] = now["playing"]
    with lock:
        fam = LIVE.setdefault(fid, {})
        fam[device] = st
        for d in [d for d, x in fam.items() if now_ms() - x["at"] > 3_600_000]:
            del fam[d]  # forget apps closed long ago
    return {"plansAt": plans_changed_at(fid), "reset": reset_at(fid)[0]}


def live_status(fid):
    cut = now_ms() - LIVE_FOR_MS
    with lock:
        return {"now": now_ms(), "devices": {d: x for d, x in LIVE.get(fid, {}).items() if x["at"] >= cut}}


# ---------- phone as a game controller ----------
# A parent's phone becomes a big two-button controller for a game on the TV.
# The phone sends each press (POST /api/pad); the server pushes it at once to
# the family's TV, which listens on an open stream (GET /api/pad/listen, as
# server-sent events). The TV gets a one-time ticket first, so its login never
# goes into a web address.
PAD_BUTTONS = {"left", "right", "up", "down", "honk", "lane0", "lane1", "lane2", "blow", "shake"}  # lanes: tilt to steer; blow/shake: phone microphone and motion
PAD_TICKETS = {}  # ticket -> (fid, expires)
PADS = {}  # fid -> list of queues, one per listening TV
MAX_PAD_LISTENERS = 4


def pad_ticket(fid):
    t = secrets.token_urlsafe(18)
    with lock:
        for k in [k for k, (_, exp) in PAD_TICKETS.items() if exp < time.time()]:
            del PAD_TICKETS[k]
        PAD_TICKETS[t] = (fid, time.time() + 120)
    return t


def pad_join(ticket):
    with lock:
        fid, exp = PAD_TICKETS.pop(ticket, (None, 0))
        if not fid or exp < time.time():
            return None, None
        q = queue.Queue(maxsize=50)
        lst = PADS.setdefault(fid, [])
        lst.append(q)
        while len(lst) > MAX_PAD_LISTENERS:
            lst.pop(0).put_nowait(None)  # the oldest stream ends
    return fid, q


def pad_leave(fid, q):
    with lock:
        lst = PADS.get(fid, [])
        if q in lst:
            lst.remove(q)


def pad_send(fid, btn):
    with lock:
        lst = list(PADS.get(fid, []))
    for q in lst:
        try:
            q.put_nowait({"btn": btn, "at": now_ms()})
        except queue.Full:
            pass
    return len(lst)


# ---------- phone as the game's computer (test) ----------
# The phone draws a game and sends it to the TV as live video (WebRTC). The two
# only need to swap a few short messages first (offer, answer, network
# addresses); this passes them on inside the family. Each side listens like the
# pad does (one-time ticket, then server-sent events) and sends with POST
# /api/rtc {to: "tv" | "phone", msg}. The video itself never comes here.
RTC_ROLES = {"tv", "phone"}
RTC_TICKETS = {}  # ticket -> (fid, role, expires)
RTCS = {}  # (fid, role) -> list of queues
MAX_RTC_MSG = 20_000
# When the two can't reach each other directly, the picture goes through our
# relay (coturn on this server). Its passwords are made from a shared secret
# and stop working after a few hours (coturn's use-auth-secret).
TURN_SECRET = os.environ.get("TURN_SECRET", "")
TURN_URLS = [u for u in os.environ.get("TURN_URLS", "").split(",") if u]


def turn_login(fid):
    if not (TURN_SECRET and TURN_URLS):
        return None
    user = f"{int(time.time()) + 6 * 3600}:{sha(fid)[:12]}"
    cred = base64.b64encode(hmac.new(TURN_SECRET.encode(), user.encode(), hashlib.sha1).digest()).decode()
    return {"urls": TURN_URLS, "username": user, "credential": cred}


def rtc_ticket(fid, role):
    t = secrets.token_urlsafe(18)
    with lock:
        for k in [k for k, v in RTC_TICKETS.items() if v[2] < time.time()]:
            del RTC_TICKETS[k]
        RTC_TICKETS[t] = (fid, role, time.time() + 120)
    return t


def rtc_join(ticket):
    with lock:
        fid, role, exp = RTC_TICKETS.pop(ticket, (None, None, 0))
        if not fid or exp < time.time():
            return None, None
        q = queue.Queue(maxsize=200)
        lst = RTCS.setdefault((fid, role), [])
        lst.append(q)
        while len(lst) > 4:  # a few TV pages may be open; each phone try picks one (sid)
            lst.pop(0).put_nowait(None)  # the oldest one stops listening
    return (fid, role), q


def rtc_leave(key, q):
    with lock:
        lst = RTCS.get(key, [])
        if q in lst:
            lst.remove(q)


def rtc_diag(fid, role, data):
    # What each side saw while connecting (for fixing the test), last ~200 KB per family.
    path = fam_path(fid, "rtc-diag.jsonl")
    line = json.dumps({"at": now_ms(), "role": role, **data}, ensure_ascii=False)
    with lock:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            old = open(path).read()[-200_000:]
        except OSError:
            old = ""
        with open(path, "w") as f:
            f.write(old + line + "\n")


def rtc_send(fid, to, msg):
    with lock:
        lst = list(RTCS.get((fid, to), []))
    for q in lst:
        try:
            q.put_nowait(msg)
        except queue.Full:
            pass
    return len(lst)


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
    for k in ("t", "w", "from", "deg", "code", "ok", "no"):
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


def clean_pet(raw):
    """The little dinosaur game: how much care it has had and whether it hatched."""
    if not isinstance(raw, dict):
        return {}
    care = raw.get("care")
    return {"care": int(care) if isinstance(care, (int, float)) and 0 <= care <= 10 ** 6 else 0,
            "hatched": raw.get("hatched") is True,
            "last": int(raw["last"]) if isinstance(raw.get("last"), (int, float)) and raw["last"] > 0 else 0}


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
    total = {"watch": {}, "vwatch": {}, "turnEnds": {}, "pos": {}, "pet": {}}
    for dev, d in devices.items():
        if dev == me:
            continue
        pet = d.get("pet") or {}
        if pet.get("care", 0) > total["pet"].get("care", -1):
            total["pet"] = pet  # one dinosaur for the child: the most looked-after one wins
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
            "turnEnds": clean_ends(data.get("turnEnds")), "pos": clean_pos(data.get("pos")), "pet": clean_pet(data.get("pet")),
            "label": label[:40] if isinstance(label, str) else "", "seen": now_ms()}
    reset, reset_day = reset_at(fid)
    plans = read_json(fam_path(fid, "plans.json"), {})
    if body.get("readonly") and body.get("all"):
        result = {"me": None, "devices": read_json(fam_path(fid, "stats.json"), {})}
        if isinstance(body.get("logSince"), (int, float)):
            result["log"] = read_log(fid, body["logSince"])
        result.update({"reset": 0, "resetDay": reset_day, "plans": plans, "logged": 0, "theme": family_theme(fid), "games": family_games(fid)})
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
    result.update({"reset": reset, "resetDay": reset_day, "plans": plans, "logged": len(log[:500]), "theme": family_theme(fid), "games": family_games(fid)})
    return 200, result


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        try:  # small messages (a controller press) leave at once, not bundled with the next one
            self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except OSError:
            pass

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
        if self.path.startswith("/api/pad/listen?t="):
            return self.pad_stream(self.path.split("=", 1)[1])
        if self.path.startswith("/api/rtc/listen?t="):
            key, q = rtc_join(self.path.split("=", 1)[1])
            if not key:
                return self.reply(403, {"error": "ticket"})
            return self.event_stream(q, lambda: rtc_leave(key, q))
        self.reply(404, {"error": "not found"})

    def pad_stream(self, ticket):
        fid, q = pad_join(ticket)
        if not fid:
            return self.reply(403, {"error": "ticket"})
        self.event_stream(q, lambda: pad_leave(fid, q))

    def event_stream(self, q, leave):
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            self.wfile.write(b"retry: 2000\n: hello\n\n")
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")  # keeps the line open through proxies
                    self.wfile.flush()
                    continue
                if msg is None:
                    break
                self.wfile.write(b"data: " + json.dumps(msg).encode() + b"\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            leave()

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
            extra, bedtime = body.get("extra", 0), body.get("bedtime")
            if not (isinstance(day, str) and DAY.match(day) and isinstance(turns, int) and 1 <= turns <= 8
                    and isinstance(minutes, int) and 5 <= minutes <= 60
                    and isinstance(extra, int) and -86400 <= extra <= 86400
                    and (bedtime is None or (isinstance(bedtime, int) and 1080 <= bedtime <= 1560))):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"plans": save_plan(fid, day, turns, minutes, extra, bedtime)})
        if path == "/api/live":
            if not (isinstance(body.get("device"), str) and KEY.match(body["device"]) and isinstance(body.get("now"), dict)):
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, live_set(fid, body["device"], body.get("label"), body["now"]))
        if path == "/api/pad/ticket":
            return self.reply(200, {"ticket": pad_ticket(fid)})
        if path == "/api/pad":
            btn = body.get("btn")
            if btn not in PAD_BUTTONS:
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"listeners": pad_send(fid, btn)})
        if path == "/api/rtc/ticket":
            if body.get("role") not in RTC_ROLES:
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"ticket": rtc_ticket(fid, body["role"])})
        if path == "/api/rtc/diag":
            data = body.get("data")
            if body.get("role") not in RTC_ROLES or not isinstance(data, dict) or len(json.dumps(data)) > 8000:
                return self.reply(400, {"error": "bad request"})
            rtc_diag(fid, body["role"], data)
            return self.reply(200, {"ok": True})
        if path == "/api/rtc/turn":
            return self.reply(200, {"turn": turn_login(fid)})
        if path == "/api/rtc":
            to, msg = body.get("to"), body.get("msg")
            if to not in RTC_ROLES or not isinstance(msg, dict) or len(json.dumps(msg)) > MAX_RTC_MSG:
                return self.reply(400, {"error": "bad request"})
            return self.reply(200, {"listeners": rtc_send(fid, to, msg)})
        if path == "/api/games":
            if s["kind"] != "parent":
                return self.reply(403, {"error": "parents only"})
            enabled, off = body.get("enabled"), body.get("off")
            if not (isinstance(enabled, bool) and isinstance(off, list) and len(off) <= 30
                    and all(isinstance(k, str) and KEY.match(k) for k in off)):
                return self.reply(400, {"error": "bad request"})
            games_set(fid, enabled, sorted(set(off)))
            return self.reply(200, {"games": family_games(fid)})
        if path == "/api/theme":
            if s["kind"] != "parent":
                return self.reply(403, {"error": "parents only"})
            theme = body.get("theme")
            if not (isinstance(theme, str) and (theme == "" or KEY.match(theme))):
                return self.reply(400, {"error": "bad request"})
            theme_set(fid, theme)
            return self.reply(200, {"theme": theme})
        if path == "/api/live/status":
            if s["kind"] != "parent":
                return self.reply(403, {"error": "parents only"})
            return self.reply(200, live_status(fid))
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
