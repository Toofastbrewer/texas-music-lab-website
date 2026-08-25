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

/* ══════════════════════════════════════════════════════════════
   SHOP CLUSTER — the photographs pile up, and shove apart from the
   pointer. The transform is written here on .fs-item; the idle float
   is a CSS animation on .fs-inner, so the two compose instead of the
   inline style silently killing the keyframes.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var box = document.getElementById("shopCluster");
  if (!box) return;
  /* No pointer to react to, and vestibular motion is the thing being asked
     about - the CSS fan already renders the pile correctly in both cases. */
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var cards = [].slice.call(box.querySelectorAll(".fs-item")).map(function (el) {
    return { el: el,
             bx: num(el.getAttribute("data-x")),
             by: num(el.getAttribute("data-y")),
             br: num(el.getAttribute("data-r")),
             /* each card sits at a slightly different size for depth, so the
                pointer lift has to add to that base rather than replace it */
             bs: num(el.getAttribute("data-s")) || 1,
             cx: 0, cy: 0, cs: 0, tx: 0, ty: 0, ts: 0 };
  });
  if (!cards.length) return;

  var REACH = 320;     /* px at which a card stops noticing the cursor */
  var SHOVE = 68;      /* px it travels when the cursor is right on it  */
  var raf = 0, running = false, geo = null;

  function measure() { geo = box.getBoundingClientRect(); }
  function measureCards() {
    /* A rotated card's half-extents are (w/2)cos+(h/2)sin and (w/2)sin+(h/2)cos,
       not w/2 and h/2 - using the unrotated ones is what let cards drift out of
       the box. Split from measure() because that runs on scroll, and reading
       offsetWidth there would force layout on every scroll event. */
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var rad = Math.abs(c.br) * Math.PI / 180;
      var w = c.el.offsetWidth / 2, h = c.el.offsetHeight / 2;
      var grow = c.bs + 0.05;                 /* allow for the pointer lift */
      c.hw = (w * Math.cos(rad) + h * Math.sin(rad)) * grow;
      c.hh = (w * Math.sin(rad) + h * Math.cos(rad)) * grow;
    }
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  measure(); measureCards();
  addEventListener("resize", function () { measure(); measureCards(); }, { passive: true });
  addEventListener("scroll", measure, { passive: true });

  function frame() {
    running = false;
    var moving = false;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      c.cx += (c.tx - c.cx) * 0.10;      /* damped toward the target, never pinned */
      c.cy += (c.ty - c.cy) * 0.10;
      c.cs += (c.ts - c.cs) * 0.10;
      if (Math.abs(c.tx - c.cx) > 0.1 || Math.abs(c.ty - c.cy) > 0.1 ||
          Math.abs(c.ts - c.cs) > 0.001) moving = true;
      c.el.style.transform =
        "translate(" + (c.bx + c.cx).toFixed(1) + "px," + (c.by + c.cy).toFixed(1) + "px) " +
        "rotate(" + (c.br + c.cx * 0.05).toFixed(2) + "deg) " +
        "scale(" + (c.bs + c.cs).toFixed(3) + ")";
      /* whatever the cursor is nearest rides on top of the pile */
      c.el.style.zIndex = String(3 + Math.round(c.cs * 400));
    }
    if (moving && !document.hidden) { running = true; raf = requestAnimationFrame(frame); }
  }
  function kick() { if (!running && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }

  box.addEventListener("pointermove", function (e) {
    if (!geo) measure();
    var px = e.clientX - geo.left, py = e.clientY - geo.top;
    var mx = geo.width / 2, my = geo.height / 2;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var dx = (mx + c.bx) - px, dy = (my + c.by) - py;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var s = Math.max(0, 1 - d / REACH);
      s = s * s;                     /* squared, so the shove is local rather than global */
      /* Clamp the FINAL position, not the displacement, so a card slides
         along the edge of the box instead of leaving it. */
      var lx = Math.max(0, geo.width / 2 - c.hw);
      var ly = Math.max(0, geo.height / 2 - c.hh);
      c.tx = clamp(c.bx + (dx / d) * s * SHOVE, -lx, lx) - c.bx;
      c.ty = clamp(c.by + (dy / d) * s * SHOVE, -ly, ly) - c.by;
      c.ts = s * 0.045;
    }
    kick();
  }, { passive: true });

  box.addEventListener("pointerleave", function () {
    for (var i = 0; i < cards.length; i++) { cards[i].tx = cards[i].ty = cards[i].ts = 0; }
    kick();                          /* settle back into the pile */
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
  });
})();
