#!/usr/bin/env python3
"""
Rebuild assets/search-index.json from the pages.

Run after changing page content, or the header search will quietly return
stale results - the failure is silent, which is why this is a script and not
a one-off snippet.

    python tools/build-search-index.py
"""
import re, json, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {
    "index.html": "Home", "services.html": "Services", "instructors.html": "Instructors",
    "about.html": "About Us", "contact.html": "Contact", "process.html": "How It Works",
    "shop.html": "The Shop", "student-stories.html": "Student Stories",
    "resources.html": "Resources", "events.html": "Events", "privacy.html": "Privacy Policy",
}

def text_of(s):
    s = re.sub(r"<(script|style|nav|footer)\b.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.I)          # else words fuse across breaks
    s = re.sub(r"</(p|div|li|h[1-6]|td)>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"[\U0001F300-\U0001FAFF☀-➿️]", " ", s)   # decorative emoji
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def build():
    out = []
    for f, label in PAGES.items():
        s = (ROOT / f).read_text(encoding="utf-8")
        # real content only. The mobile drawer sits AFTER </nav> and repeats every
        # link on every page, so indexing from <section> is what keeps each page's
        # text distinct - without it every result shows the same snippet.
        a, b = s.find("<section"), s.find("<footer")
        body = s[a if a >= 0 else 0 : b if b > 0 else len(s)]
        heads = [text_of(h) for h in re.findall(r"<h[123][^>]*>(.*?)</h[123]>", body, re.S | re.I)]
        heads = [h for h in heads if h and len(h) < 90][:14]
        txt = text_of(body)
        out.append({"u": f, "t": label, "h": heads, "d": txt[:150], "b": txt[:1400].lower()})
    return out

if __name__ == "__main__":
    data = build()
    p = ROOT / "assets" / "search-index.json"
    p.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False),
                 encoding="utf-8", newline="\n")
    print(f"{len(data)} pages -> {p.relative_to(ROOT)} ({p.stat().st_size/1024:.1f} KB)")
