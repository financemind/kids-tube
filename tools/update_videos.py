"""Build videos.json from the official YouTube channel feeds.

Usage: python3 kids-tube/tools/update_videos.py
Only channels listed in CHANNELS are used. Shorts and videos that
YouTube does not allow to be embedded are skipped.
"""
import json
import pathlib
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

CHANNELS = [
    # (key, title shown in the app, channel id)
    ("sesame", "Sesame Street", "UCoookXUzPciGrEZEXmh4Jjg"),
    ("blippi", "Blippi", "UC5PYHgAzJ1wLEidB58SK6Xw"),
    ("numberblocks", "Numberblocks", "UCPlwvN0w4qFSP1FllALB92w"),
    ("peppa", "Peppa Pig", "UCAOtE1V7Ots4DjM8JLlrYgg"),
    ("bluey", "Bluey", "UCEC-8nMiuXYH2QUs0yYcHTQ"),
    ("songs", "Super Simple Songs", "UCLsooMJoIpl_7ux2jvdPB-Q"),
]
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
OUT = pathlib.Path(__file__).resolve().parent.parent / "videos.json"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def embeddable(video_id):
    try:
        get(f"https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={video_id}")
        return True
    except urllib.error.HTTPError:
        return False


def main():
    categories = []
    for key, title, cid in CHANNELS:
        root = ET.fromstring(get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
        videos = []
        for e in root.findall("a:entry", NS):
            link = e.find("a:link", NS).get("href")
            if "/shorts/" in link:
                continue
            vid = e.find("yt:videoId", NS).text
            if not embeddable(vid):
                continue
            videos.append({"id": vid, "title": e.find("a:title", NS).text})
        print(f"{title}: {len(videos)} videos")
        if videos:
            categories.append({"key": key, "title": title, "channel": cid, "videos": videos})
    OUT.write_text(json.dumps({"categories": categories}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
