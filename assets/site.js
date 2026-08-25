/* ══════════════════════════════════════════════════════════════
   Shared header behaviour: site search + enquiry list.

   Both are real. The search filters a generated index of every page
   rather than pretending to; the enquiry list holds actual items and
   ends at the contact form. There is no online checkout on this site,
   so this is not a shopping cart and does not display a money total -
   a permanent "$0.00" would be a claim the shop cannot honour.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── SEARCH ──────────────────────────────────────────────── */
  var form = document.getElementById("siteSearch");
  if (form) {
    var input = form.querySelector("input");
    var panel = document.getElementById("searchResults");
    var index = null, loading = false;

    function load() {
      if (index || loading) return;
      loading = true;
      fetch("assets/search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (j) { index = j; loading = false; run(); })
        .catch(function () { loading = false; });
    }

    function score(entry, q) {
      var s = 0, i;
      if (entry.t.toLowerCase().indexOf(q) >= 0) s += 60;
      for (i = 0; i < entry.h.length; i++) {
        if (entry.h[i].toLowerCase().indexOf(q) >= 0) { s += 30; break; }
      }
      var at = entry.b.indexOf(q);
      /* earlier in the page counts for more, but never outweighs a heading */
      if (at >= 0) s += 20 - Math.min(18, Math.floor(at / 80));
      return s;
    }

    function snippet(entry, q) {
      var at = entry.b.indexOf(q);
      if (at < 0) return entry.d;
      var from = Math.max(0, at - 40);
      return (from ? "…" : "") + entry.b.slice(from, from + 120).trim() + "…";
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { close(); return; }
      if (!index) { load(); return; }
      var hits = [];
      for (var i = 0; i < index.length; i++) {
        var s = score(index[i], q);
        if (s > 0) hits.push({ e: index[i], s: s });
      }
      hits.sort(function (a, b) { return b.s - a.s; });
      hits = hits.slice(0, 6);
      if (!hits.length) {
        panel.innerHTML = '<p class="sr-none">Nothing matches “' +
          esc(input.value.trim()) + '”.</p>';
      } else {
        panel.innerHTML = hits.map(function (h) {
          return '<a class="sr-item" href="' + h.e.u + '">' +
                 '<span class="sr-t">' + esc(h.e.t) + '</span>' +
                 '<span class="sr-d">' + esc(snippet(h.e, q)) + '</span></a>';
        }).join("");
      }
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
    function close() { panel.hidden = true; input.setAttribute("aria-expanded", "false"); }

    input.addEventListener("focus", load);
    input.addEventListener("input", run);
    form.addEventListener("submit", function (e) {
      e.preventDefault();                     /* no server to submit to */
      var first = panel.querySelector(".sr-item");
      if (first) window.location.href = first.getAttribute("href");
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); input.blur(); } });
    document.addEventListener("click", function (e) {
      if (!form.contains(e.target) && !panel.contains(e.target)) close();
    });
  }

  /* ── ENQUIRY LIST ────────────────────────────────────────── */
  var KEY = "tml.enquiry";

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch (err) { return []; }          /* private mode, cleared storage, junk */
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) {}
    paint();
  }
  window.tmlEnquiry = { read: read, write: write };

  var btn   = document.getElementById("cartBtn");
  var count = document.getElementById("cartCount");
  var tray  = document.getElementById("cartTray");
  var label = document.getElementById("cartLabel");

  function paint() {
    var list = read();
    /* the badge always shows, zero included - matching the reference - so it
       never relies on [hidden], which a `display` rule would out-specify */
    if (count) count.textContent = String(list.length);
    if (label) label.textContent = list.length + (list.length === 1 ? " item" : " items");
    if (btn) btn.setAttribute("aria-label",
      list.length ? "Enquiry list, " + list.length + " item" + (list.length === 1 ? "" : "s")
                  : "Enquiry list, empty");
    if (tray) {
      if (!list.length) {
        tray.innerHTML = '<p class="ct-none">Nothing here yet. Add instruments from ' +
          '<a href="shop.html">the shop</a> and send us one enquiry about all of them.</p>';
      } else {
        tray.innerHTML =
          '<ul class="ct-list">' + list.map(function (it, i) {
            return '<li><span>' + it.label + '</span>' +
                   '<button type="button" data-rm="' + i + '" aria-label="Remove ' +
                   it.label + '">×</button></li>';
          }).join("") + "</ul>" +
          '<a class="btn btn-orange btn-sm ct-send" href="contact.html?items=' +
          encodeURIComponent(list.map(function (i) { return i.label; }).join("|")) +
          '">Send enquiry</a>';
      }
    }
    document.querySelectorAll("[data-enq]").forEach(function (el) {
      var on = read().some(function (i) { return i.id === el.getAttribute("data-enq"); });
      el.classList.toggle("is-added", on);
      el.textContent = on ? "✓ Added" : "+ Add to enquiry";
    });
  }

  if (tray) {
    tray.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]");
      if (!b) return;
      var list = read(); list.splice(+b.getAttribute("data-rm"), 1); write(list);
    });
  }
  if (btn) {
    btn.addEventListener("click", function () {
      var open = tray.hidden;
      tray.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (tray && !tray.hidden && !btn.contains(e.target) && !tray.contains(e.target)) {
        tray.hidden = true; btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-enq]");
    if (!el) return;
    e.preventDefault();
    var id = el.getAttribute("data-enq"), list = read();
    var at = list.findIndex(function (i) { return i.id === id; });
    if (at >= 0) list.splice(at, 1);
    else list.push({ id: id, label: el.getAttribute("data-enq-label") || id });
    write(list);
  });

  /* ── CONTACT PREFILL ─────────────────────────────────────── */
  /* The enquiry list ends here: items arrive as ?items=a|b and are written
     into the message box, so one enquiry covers everything collected. */
  var msg = document.getElementById("msg");
  if (msg) {
    var raw = new URLSearchParams(location.search).get("items");
    if (raw) {
      var items = raw.split("|").map(function (t) { return t.trim(); }).filter(Boolean);
      if (items.length && !msg.value.trim()) {
        var lines = ["I would like to ask about:"];
        items.forEach(function (t) { lines.push("  - " + t); });
        lines.push("", "");
        msg.value = lines.join("\n");
        msg.focus();
        msg.setSelectionRange(msg.value.length, msg.value.length);
      }
    }
  }

  paint();
})();
