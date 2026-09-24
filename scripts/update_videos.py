#!/usr/bin/env python3
"""Osvježava data/videos.json iz javnog YouTube RSS feeda kanala.

Pokreće se automatski u GitHub Actions prije svake objave (i jednom dnevno),
pa se najnoviji videi na početnoj pojavljuju bez ručnog rada.
Ako feed nije dostupan, postojeći data/videos.json ostaje netaknut.

Ručno: python3 scripts/update_videos.py
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

CHANNEL_ID = "UClXAOFnoNj5lPWU11vw2Rqw"  # @harlibee
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUT = Path(__file__).resolve().parent.parent / "data" / "videos.json"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
MAX = 12


def main() -> int:
    try:
        req = urllib.request.Request(FEED, headers={"User-Agent": "harlibee-site/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            root = ET.fromstring(r.read())
    except Exception as e:  # mreža, parsiranje…
        print(f"Feed nije dostupan ({e}); zadržavam postojeći {OUT.name}.")
        return 0

    old = {}
    if OUT.exists():
        try:
            old = {v["id"]: v for v in json.loads(OUT.read_text(encoding="utf-8")).get("videos", [])}
        except ValueError:
            pass

    videos = []
    for entry in root.findall("a:entry", NS):
        vid = entry.findtext("yt:videoId", namespaces=NS)
        link = entry.find("a:link", NS)
        # RSS ne razlikuje Shorts; preskačemo ih po linku.
        if not vid or (link is not None and "/shorts/" in link.get("href", "")):
            continue
        item = {
            "id": vid,
            "title": entry.findtext("a:title", namespaces=NS, default="").strip(),
            "published": entry.findtext("a:published", namespaces=NS, default=""),
        }
        # Trajanje nije u RSS-u; zadržavamo ga ako je ranije upisano.
        if old.get(vid, {}).get("duration"):
            item["duration"] = old[vid]["duration"]
        videos.append(item)

    if not videos:
        print("Feed nema videa; zadržavam postojeći fajl.")
        return 0

    data = {"channelId": CHANNEL_ID, "updated": date.today().isoformat(), "videos": videos[:MAX]}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Upisano {len(data['videos'])} videa u {OUT}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
