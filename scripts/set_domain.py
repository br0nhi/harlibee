#!/usr/bin/env python3
"""Prebacuje sajt na vlastitu domenu.

Zamjenjuje trenutnu osnovnu adresu (canonical, Open Graph, sitemap, robots, 404)
novom i upisuje fajl CNAME za GitHub Pages.

Upotreba:
  python3 scripts/set_domain.py harlibee.ba
  python3 scripts/set_domain.py www.harlibee.ba
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_FILE = ROOT / "scripts" / ".base-url"
DEFAULT_BASE = "https://br0nhi.github.io/harlibee/"
SUFFIXES = {".html", ".xml", ".txt", ".json", ".webmanifest"}
SKIP_DIRS = {".git", "node_modules", ".github"}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    domain = re.sub(r"^https?://", "", sys.argv[1].strip()).strip("/")
    if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", domain, re.I):
        print(f"Neispravna domena: {domain}")
        return 1

    old = BASE_FILE.read_text().strip() if BASE_FILE.exists() else DEFAULT_BASE
    new = f"https://{domain}/"
    changed = 0
    for path in ROOT.rglob("*"):
        if path.suffix not in SUFFIXES or any(p in SKIP_DIRS for p in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        if old in text:
            path.write_text(text.replace(old, new), encoding="utf-8")
            changed += 1
    (ROOT / "CNAME").write_text(domain + "\n")
    BASE_FILE.write_text(new + "\n")
    print(f"Adresa {old} -> {new} u {changed} fajlova. CNAME = {domain}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
