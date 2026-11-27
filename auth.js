/* Shared by the app, the report and the account page: where the server is,
   the family login token, and one helper to call the server with it.
   - On noyantv.com / ntv.financemind.com the server is on the same site
     (and on test.noyantv.com, the test site, its own test server).
   - The GitHub copy reaches ntv.financemind.com.
   - On this computer (localhost) there is no server, unless the page was
     opened once with ?dev (then a local test server on port 8099 is used).
   - The design preview (?preview) never talks to a server. */
(function () {
  const params = new URLSearchParams(location.search);
  const LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) || location.hostname.endsWith(".localhost");
  const store = {
    get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} },
  };
  if (LOCAL && params.has("dev")) store.set("devApi", "1");
  const OWN = ["noyantv.com", "ntv.financemind.com", "test.noyantv.com"]; // test.noyantv.com: the test site, with its own test server and data
  const base = params.has("preview") ? null
    : LOCAL ? (store.get("devApi") ? "http://localhost:8099/api" : null)
    : OWN.includes(location.hostname) ? location.origin + "/api" : "https://ntv.financemind.com/api";
  const NT = {
    base,
    local: LOCAL,
    token: () => store.get("auth"),
    setToken: (t) => store.set("auth", t),
    headers() {
      const h = { "Content-Type": "text/plain" };
      if (store.get("auth")) h.Authorization = "Bearer " + store.get("auth");
      return h;
    },
    onLogout: null, // set by a page: what to do when the server says the login is gone
    async call(path, body = {}, opts = {}) {
      if (!base) return { ok: false, status: 0, body: null };
      try {
        const r = await fetch(base + path, { method: "POST", keepalive: !!opts.keepalive, headers: NT.headers(), body: JSON.stringify(body) });
        let j = null;
        try { j = await r.json(); } catch (e) {}
        if (r.status === 401 && NT.token() && !path.startsWith("/log")) { NT.setToken(""); if (NT.onLogout) NT.onLogout(); }
        return { ok: r.ok, status: r.status, body: j };
      } catch (e) {
        return { ok: false, status: 0, body: null };
      }
    },
  };
  window.NT = NT;
})();
