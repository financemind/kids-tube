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

    def test_plan_and_reset_stay_in_family(self):
        a, b = self.signup(), self.signup("dad@example.org")
        self.post("/api/plan", {"day": "2026-11-19", "turns": 3, "minutes": 25}, a)
        _, rb = self.post("/api/sync", {"device": "b1", "resetSeen": 0, "data": {}}, b)
        self.assertEqual(rb["plans"], {})
        _, ra = self.post("/api/sync", {"device": "a1", "resetSeen": 0, "data": {}}, a)
        self.assertEqual(ra["plans"]["2026-11-19"]["turns"], 3)


if __name__ == "__main__":
    unittest.main()
