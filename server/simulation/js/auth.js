/*
 * Carries the dashboard login into the simulator.
 * The dashboard (e.g. on Vercel) and the simulator (served by the API server) are different websites, so the browser does not always
 * share the login cookie between them. The dashboard's "Open simulator" link therefore adds the session token to the address after
 * "!t=" (the part after "#" is never sent to any server). This script reads it once, keeps it in this browser tab's storage, removes it
 * from the address bar, and adds it to every request the simulator makes to /api/... in this tab (including its inner pages).
 */
(function () {
  var KEY = "vision.sim.token";
  function get() { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(t) { try { sessionStorage.setItem(KEY, t); localStorage.setItem(KEY, t); } catch (e) { /* storage blocked */ } }

  var m = /[#&!]t=([^&]+)/.exec(location.hash || "");
  if (m) {
    try { set(decodeURIComponent(m[1])); } catch (e) { /* bad token: ignore */ }
    try { history.replaceState(null, "", location.pathname + location.search + location.hash.replace(/[!&]t=[^&]+/, "")); } catch (e) { /* ignore */ }
  }

  var orig = window.fetch;
  if (!orig) return;
  window.fetch = function (input, init) {
    try {
      var token = get();
      var url = typeof input === "string" ? input : input && input.url;
      if (token && url) {
        var u = new URL(url, location.href);
        if (u.origin === location.origin && u.pathname.indexOf("/api/") === 0) {
          var headers = new Headers((init && init.headers) || (typeof input !== "string" && input.headers) || undefined);
          if (!headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
          init = Object.assign({}, init || {}, { headers: headers });
        }
      }
    } catch (e) { /* fall through to a normal request */ }
    return orig.call(this, input, init);
  };
})();
