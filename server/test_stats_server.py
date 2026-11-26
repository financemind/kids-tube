"""Tests for the kids TV server: python3 -m unittest kids-tube/server/test_stats_server.py"""
import importlib.util
import json
import os
import pathlib
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent


def load_server(root):
    os.environ["STATS_ROOT"] = root
    os.environ["STATS_PORT"] = "0"
    spec = importlib.util.spec_from_file_location("stats_server_under_test", HERE / "stats_server.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class ServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = self.tmp.name
        # data from before accounts: it should move into the first family
        with open(os.path.join(root, "stats.json"), "w") as f:
            json.dump({"oldtv": {"watch": {"2026-11-19": {"bluey": 120}}, "label": "TV"}}, f)
        self.mod = load_server(root)
        self.httpd = self.mod.ThreadingHTTPServer(("127.0.0.1", 0), self.mod.Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp.cleanup()

    def post(self, path, body=None, token=None):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=json.dumps(body or {}).encode(), method="POST")
        if token:
            req.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def signup(self, email="mom@example.com", password="goodpassword"):
        code, body = self.post("/api/signup", {"email": email, "password": password, "name": "Fam"})
        self.assertEqual(code, 200, body)
        return body["token"]

    def test_old_data_only_moves_by_hand(self):
        tok = self.signup()
        code, body = self.post("/api/sync", {"device": "phone", "all": True, "resetSeen": 0, "data": {}}, tok)
        self.assertNotIn("oldtv", body["devices"])  # a new sign-up never gets the old data by itself
        acc = self.mod.read_json(self.mod.ACCOUNTS, {})
        self.mod.move_legacy_into(acc["users"]["mom@example.com"]["fid"])
        code, body = self.post("/api/sync", {"device": "phone", "all": True, "resetSeen": 0, "data": {}}, tok)
        self.assertIn("oldtv", body["devices"])

    def test_no_data_without_login(self):
        self.assertEqual(self.post("/api/sync", {"device": "x", "data": {}})[0], 401)
        self.assertEqual(self.post("/api/plan", {"day": "2026-11-19", "turns": 2, "minutes": 30})[0], 401)
        self.assertEqual(self.post("/api/sync", {"device": "x", "data": {}}, "made-up-token")[0], 401)

    def test_login_and_lockout(self):
        self.signup()
        self.assertEqual(self.post("/api/login", {"email": "mom@example.com", "password": "goodpassword"})[0], 200)
        self.assertEqual(self.post("/api/login", {"email": "MOM@example.com ", "password": "goodpassword"})[0], 200)
        for _ in range(5):
            self.assertEqual(self.post("/api/login", {"email": "mom@example.com", "password": "wrongpass1"})[0], 401)
        self.assertEqual(self.post("/api/login", {"email": "mom@example.com", "password": "goodpassword"})[0], 429)

    def test_duplicate_email_and_bad_input(self):
        self.signup()
        self.assertEqual(self.post("/api/signup", {"email": "mom@example.com", "password": "anotherpass"})[0], 409)
        self.assertEqual(self.post("/api/signup", {"email": "not-an-email", "password": "goodpassword"})[0], 400)
        self.assertEqual(self.post("/api/signup", {"email": "a@b.co", "password": "short"})[0], 400)

    def test_pairing_a_tv(self):
        parent = self.signup()
        code, p = self.post("/api/pair/new")
        self.assertEqual(code, 200)
        self.assertEqual(len(p["code"]), 4)
        self.assertEqual(self.post("/api/pair/wait", {"pair": p["pair"]})[1]["status"], "waiting")
        self.assertEqual(self.post("/api/pair/approve", {"code": "ZZZZ"}, parent)[0], 404)
        self.assertEqual(self.post("/api/pair/approve", {"code": p["code"].lower(), "label": "TV"}, parent)[0], 200)
        code, w = self.post("/api/pair/wait", {"pair": p["pair"]})
        self.assertEqual(w["status"], "ok")
        tv = w["token"]
        self.assertEqual(self.post("/api/pair/wait", {"pair": p["pair"]})[1]["status"], "expired")  # handed out once
        self.assertEqual(self.post("/api/sync", {"device": "tv1", "resetSeen": 0, "data": {}}, tv)[0], 200)
        # a TV is not a parent: it cannot approve other devices or remove logins
        _, p2 = self.post("/api/pair/new")
        self.assertEqual(self.post("/api/pair/approve", {"code": p2["code"]}, tv)[0], 403)

    def test_families_are_separate_and_logins_can_be_removed(self):
        a, b = self.signup(), self.signup("dad@example.org")
        self.post("/api/sync", {"device": "a1", "resetSeen": 0, "data": {"watch": {"2026-11-19": {"paw": 300}}}}, a)
        _, rb = self.post("/api/sync", {"device": "b1", "resetSeen": 0, "data": {}}, b)
        self.assertEqual(rb["watch"], {})  # family B does not see family A's minutes
        _, ra = self.post("/api/sync", {"device": "a2", "resetSeen": 0, "data": {}}, a)
        self.assertEqual(ra["watch"]["2026-11-19"]["paw"], 300)
        _, devs = self.post("/api/devices", {}, a)
        mine = [x for x in devs["logins"] if x["me"]][0]
        self.assertEqual(self.post("/api/devices/remove", {"id": mine["id"]}, a)[1]["ok"], True)
        self.assertEqual(self.post("/api/sync", {"device": "a2", "data": {}}, a)[0], 401)

    def test_parents_code(self):
        parent = self.signup()
        self.assertEqual(self.post("/api/pin/status", {}, parent)[1]["set"], False)
        self.assertEqual(self.post("/api/pin/set", {"pin": "12a4"}, parent)[0], 400)
        self.assertEqual(self.post("/api/pin/set", {"pin": "4321"}, parent)[0], 200)
        self.assertEqual(self.post("/api/pin/check", {"pin": "4321"}, parent)[0], 200)
        self.assertEqual(self.post("/api/pin/check", {"pin": "0000"}, parent)[0], 403)
        self.assertEqual(self.post("/api/pin/set", {"pin": "1111"}, parent)[0], 403)  # changing needs the old code
        self.assertEqual(self.post("/api/pin/set", {"pin": "1111", "old": "4321"}, parent)[0], 200)
        for _ in range(5):
            self.post("/api/pin/check", {"pin": "9999"}, parent)
        self.assertEqual(self.post("/api/pin/check", {"pin": "1111"}, parent)[0], 429)  # locked after 5 wrong tries
        other = self.signup("dad@example.org")
        self.assertEqual(self.post("/api/pin/status", {}, other)[1]["set"], False)  # each family has its own code

    def test_plan_and_reset_stay_in_family(self):
        a, b = self.signup(), self.signup("dad@example.org")
        self.post("/api/plan", {"day": "2026-11-19", "turns": 3, "minutes": 25}, a)
        _, rb = self.post("/api/sync", {"device": "b1", "resetSeen": 0, "data": {}}, b)
        self.assertEqual(rb["plans"], {})
        _, ra = self.post("/api/sync", {"device": "a1", "resetSeen": 0, "data": {}}, a)
        self.assertEqual(ra["plans"]["2026-11-19"]["turns"], 3)

    def test_live_status_and_extra_time(self):
        parent = self.signup()
        _, p = self.post("/api/pair/new")
        self.post("/api/pair/approve", {"code": p["code"], "label": "TV"}, parent)
        tv = self.post("/api/pair/wait", {"pair": p["pair"]})[1]["token"]
        code, r = self.post("/api/live", {"device": "tv1", "label": "TV", "now": {"state": "video", "v": "abc_123", "title": "Bluey", "t": 40, "left": 300}}, tv)
        self.assertEqual(code, 200)
        before = r["plansAt"]
        self.assertEqual(self.post("/api/live/status", {}, tv)[0], 403)  # only a parent sees it
        _, st = self.post("/api/live/status", {}, parent)
        self.assertEqual(st["devices"]["tv1"]["v"], "abc_123")
        self.assertEqual(st["devices"]["tv1"]["left"], 300)
        self.assertEqual(self.post("/api/live", {"device": "tv1", "now": {"state": "x", "v": "bad id!"}}, tv)[0], 200)
        self.assertEqual(self.post("/api/live/status", {}, parent)[1]["devices"]["tv1"]["state"], "home")  # unknown state, bad id dropped
        import time as _t
        _t.sleep(0.01)
        _, pl = self.post("/api/plan", {"day": "2026-11-21", "turns": 4, "minutes": 15, "extra": 600}, parent)
        self.assertEqual(pl["plans"]["2026-11-21"]["extra"], 600)
        self.assertGreaterEqual(self.post("/api/live", {"device": "tv1", "now": {"state": "home"}}, tv)[1]["plansAt"], before)
        self.assertEqual(self.post("/api/plan", {"day": "2026-11-21", "turns": 4, "minutes": 15, "extra": "lots"}, parent)[0], 400)

    def test_one_dinosaur_across_devices(self):
        tok = self.signup()
        self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {"pet": {"care": 12, "hatched": True, "last": 5}}}, tok)
        self.post("/api/sync", {"device": "tab", "resetSeen": 0, "data": {"pet": {"care": "x", "hatched": "yes"}}}, tok)
        _, r = self.post("/api/sync", {"device": "phone", "resetSeen": 0, "data": {}}, tok)
        self.assertEqual(r["pet"], {"care": 12, "hatched": True, "last": 5})
        _, r = self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {"pet": {"care": 12, "hatched": True}}}, tok)
        self.assertEqual(r["pet"]["care"], 0)  # the tablet sent nonsense: it counts as no care

    def test_clock_theme(self):
        parent = self.signup()
        _, p = self.post("/api/pair/new")
        self.post("/api/pair/approve", {"code": p["code"]}, parent)
        tv = self.post("/api/pair/wait", {"pair": p["pair"]})[1]["token"]
        self.assertEqual(self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}}, tv)[1]["theme"], "")
        self.assertEqual(self.post("/api/theme", {"theme": "pup"}, tv)[0], 403)  # the TV cannot choose
        self.assertEqual(self.post("/api/theme", {"theme": "no spaces!"}, parent)[0], 400)
        self.assertEqual(self.post("/api/theme", {"theme": "pup"}, parent)[0], 200)
        self.assertEqual(self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}}, tv)[1]["theme"], "pup")
        self.post("/api/pin/set", {"pin": "1234"}, parent)
        self.assertEqual(self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}}, tv)[1]["theme"], "pup")  # the code keeps it

    def test_phone_controller_reaches_the_tv(self):
        tok = self.signup()
        other = self.signup("dad@example.org")
        _, t = self.post("/api/pad/ticket", {}, tok)
        self.assertEqual(self.post("/api/pad", {"btn": "left"}, tok)[1]["listeners"], 0)  # no TV listening yet
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request("GET", "/api/pad/listen?t=" + t["ticket"])
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        self.assertIn(b"hello", resp.fp.readline() + resp.fp.readline())
        resp.fp.readline()
        self.assertEqual(self.post("/api/pad", {"btn": "honk"}, other)[1]["listeners"], 0)  # another family: not heard
        self.assertEqual(self.post("/api/pad", {"btn": "right"}, tok)[1]["listeners"], 1)
        line = resp.fp.readline()
        self.assertIn(b'"btn": "right"', line)
        conn.close()
        self.assertEqual(self.post("/api/pad", {"btn": "jump"}, tok)[0], 400)
        c2 = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        c2.request("GET", "/api/pad/listen?t=" + t["ticket"])  # a ticket works once
        self.assertEqual(c2.getresponse().status, 403)
        c2.close()

    def test_rtc_messages_pass_inside_the_family(self):
        tok = self.signup()
        other = self.signup("dad@example.org")
        _, t = self.post("/api/rtc/ticket", {"role": "tv"}, tok)
        self.assertEqual(self.post("/api/rtc/ticket", {"role": "fridge"}, tok)[0], 400)
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        conn.request("GET", "/api/rtc/listen?t=" + t["ticket"])
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        self.assertIn(b"hello", resp.fp.readline() + resp.fp.readline())
        resp.fp.readline()
        self.assertEqual(self.post("/api/rtc", {"to": "tv", "msg": {"type": "offer"}}, other)[1]["listeners"], 0)
        self.assertEqual(self.post("/api/rtc", {"to": "phone", "msg": {"type": "offer"}}, tok)[1]["listeners"], 0)
        self.assertEqual(self.post("/api/rtc", {"to": "tv", "msg": {"type": "offer", "sdp": "v=0"}}, tok)[1]["listeners"], 1)
        self.assertIn(b'"sdp": "v=0"', resp.fp.readline())
        conn.close()
        self.assertEqual(self.post("/api/rtc", {"to": "tv", "msg": "x"}, tok)[0], 400)
        self.assertEqual(self.post("/api/rtc", {"to": "tv", "msg": {"sdp": "x" * 30000}}, tok)[0], 400)
        self.assertEqual(self.post("/api/rtc", {"to": "tv", "msg": {}}, None)[0], 401)

    def test_relay_passwords(self):
        tok = self.signup()
        self.assertIsNone(self.post("/api/rtc/turn", {}, tok)[1]["turn"])  # no relay set up
        self.mod.TURN_SECRET, self.mod.TURN_URLS = "s3cret", ["turn:example.test:3478"]
        t = self.post("/api/rtc/turn", {}, tok)[1]["turn"]
        import base64, hashlib, hmac, time
        expires = int(t["username"].split(":")[0])
        self.assertTrue(time.time() < expires < time.time() + 7 * 3600)
        self.assertEqual(t["credential"], base64.b64encode(hmac.new(b"s3cret", t["username"].encode(), hashlib.sha1).digest()).decode())
        self.assertEqual(t["urls"], ["turn:example.test:3478"])
        self.assertEqual(self.post("/api/rtc/turn", {}, None)[0], 401)

    def test_late_night_and_game_switches(self):
        parent = self.signup()
        _, p = self.post("/api/pair/new")
        self.post("/api/pair/approve", {"code": p["code"]}, parent)
        tv = self.post("/api/pair/wait", {"pair": p["pair"]})[1]["token"]
        _, pl = self.post("/api/plan", {"day": "2026-11-22", "turns": 4, "minutes": 15, "bedtime": 1350}, parent)
        self.assertEqual(pl["plans"]["2026-11-22"]["bedtime"], 1350)
        self.assertEqual(self.post("/api/plan", {"day": "2026-11-22", "turns": 4, "minutes": 15, "bedtime": 300}, parent)[0], 400)
        _, pl = self.post("/api/plan", {"day": "2026-11-22", "turns": 4, "minutes": 15}, parent)
        self.assertNotIn("bedtime", pl["plans"]["2026-11-22"])  # back to the usual time
        self.assertEqual(self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}}, tv)[1]["games"], {"enabled": False, "off": []})
        self.assertEqual(self.post("/api/games", {"enabled": True, "off": ["car"]}, tv)[0], 403)
        self.assertEqual(self.post("/api/games", {"enabled": "yes", "off": []}, parent)[0], 400)
        self.assertEqual(self.post("/api/games", {"enabled": False, "off": ["car", "car", "simon"]}, parent)[0], 200)
        self.assertEqual(self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}}, tv)[1]["games"], {"enabled": False, "off": ["car", "simon"]})

    def test_game_scores_reach_the_report(self):
        parent = self.signup()
        _, p = self.post("/api/pair/new")
        self.post("/api/pair/approve", {"code": p["code"]}, parent)
        tv = self.post("/api/pair/wait", {"pair": p["pair"]})[1]["token"]
        import time
        now = int(time.time() * 1000)
        log = [{"at": now, "a": "score", "v": "game-count", "ok": 4, "no": 2, "x": "dropped"},
               {"at": now, "a": "score", "v": "game-colors", "ok": -1}]
        self.post("/api/sync", {"device": "tv", "resetSeen": 0, "data": {}, "log": log}, tv)
        _, r = self.post("/api/sync", {"device": "tv", "resetSeen": 0, "all": True, "logSince": now - 1000, "data": {}}, tv)
        scores = [e for e in r["log"] if e["a"] == "score"]
        self.assertEqual({k: scores[0][k] for k in ("v", "ok", "no")}, {"v": "game-count", "ok": 4, "no": 2})
        self.assertNotIn("x", scores[0])
        self.assertNotIn("ok", scores[1])  # a bad number is left out


if __name__ == "__main__":
    unittest.main()
