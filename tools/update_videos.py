"""Build videos.json from the official YouTube channel feeds.

Usage: python3 kids-tube/tools/update_videos.py
Only channels listed in CHANNELS are used. Shorts, live streams and
videos that YouTube does not allow to be embedded are skipped.
"""
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Watch-time limit for shows the parents want watched less (minutes).
# day: most per day; a day at or over it also hides the show the next day.
# week: most in the last 7 days.
LIMITED = {"day": 20, "week": 60}

CHANNELS = [
    # (key, title shown in the app, channel id, limit or None)
    ("sesame", "Sesame Street", "UCoookXUzPciGrEZEXmh4Jjg", None),
    ("blippi", "Blippi", "UC5PYHgAzJ1wLEidB58SK6Xw", None),
    ("numberblocks", "Numberblocks", "UCPlwvN0w4qFSP1FllALB92w", None),
    ("bluey", "Bluey", "UCVzLLZkDuFGAE2BGdBuBNBg", None),
    ("songs", "Super Simple Songs", "UCLsooMJoIpl_7ux2jvdPB-Q", None),
    ("peppa", "Peppa Pig", "UCAOtE1V7Ots4DjM8JLlrYgg", LIMITED),
    ("paw", "PAW Patrol", "UCSVSJ1OCSv5ClFgKFTHIDew", LIMITED),
]
# The official handle of each channel. Before building, every channel id is
# checked against it, so a look-alike channel (anyone can name a channel
# "Bluey") can never slip in again.
OFFICIAL = {
    "sesame": "@SesameStreet", "blippi": "@Blippi", "numberblocks": "@Numberblocks",
    "bluey": "@BlueyOfficialChannel", "songs": "@SuperSimpleSongs",
    "peppa": "@PeppaPigOfficial", "paw": "@PAWPatrolOfficial",
}
# Topics the child can pick. Videos come from searching YouTube for
# "<show> <query>" and keeping only results from the channels above whose
# title contains one of the words.
TOPICS = [
    # (key, Persian label, icon, search query, title words)
    ("animals", "حیوانات", "🐾", "animals", ["animal", "zoo", "farm", "dog", "cat", "lion", "bird", "pet", "fish", "duck", "cow", "pig"]),
    ("elephant", "فیل", "🐘", "elephant", ["elephant"]),
    ("dino", "دایناسور", "🦖", "dinosaur", ["dinosaur", "dino", "t-rex", "t rex"]),
    ("trucks", "ماشین‌ها", "🚒", "trucks cars", ["truck", "car ", "cars", "excavator", "digger", "bus", "fire engine", "tractor", "vehicle"]),
    ("trains", "قطار", "🚂", "train", ["train"]),
    ("numbers", "عددها", "🔢", "counting numbers", ["number", "count", "1 to", "123", "math"]),
    ("abc", "حروف", "🔤", "ABC alphabet letters", ["abc", "alphabet", "letter", "phonics"]),
    ("colors", "رنگ‌ها", "🎨", "colors", ["color", "colour", "rainbow"]),
]
# The app shows one list a day, chosen by score (see dailyList in index.html):
# - a video watched videoRestMinutes or more yesterday is left out;
# - every videoHalfMinutes of a video in the last 7 days halves its score,
#   and every showHalfMinutes of its show halves it again (yesterday counts
#   fully, 7 days ago counts 1/7);
# - shows with a limit (LIMITED) also lose taperPerWeek each week from start;
# - at most perShow videos per show (perLessShow for limited shows);
# - by default a day has `turns` turns of turnMinutes each (parents can change
#   today's turns in the report); after a turn ends, the next opens only after
#   breakTimes x the turn length; after the last turn, nothing until tomorrow.
DAILY = {"size": 16, "start": "2026-11-16", "perShow": 4, "perLessShow": 1, "videoRestMinutes": 10, "videoHalfMinutes": 10, "showHalfMinutes": 20, "taperPerWeek": 0.7, "turns": 4, "turnMinutes": 15, "breakTimes": 4}

# Topics only feed the daily list's pool of videos; each joins some topics above.
# (key, Persian label, icon, topic keys)
MAIN_TOPICS = [
    ("animals", "حیوانات", "🐘", ["animals", "elephant", "dino"]),
    ("vehicles", "ماشین و قطار", "🚒", ["trucks", "trains"]),
    ("learn", "عدد و حرف", "🔢", ["numbers", "abc"]),
    ("colors", "رنگ‌ها", "🎨", ["colors"]),
]
PER_MAIN_TOPIC = 8
PER_CHANNEL = 4
PER_TOPIC = 16
MAX_MINUTES = 60
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


def is_live(video_id):
    page = get(f"https://www.youtube.com/watch?v={video_id}").decode("utf-8", "replace")
    return '"isLiveContent":true' in page


def search(query):
    """Videos from a YouTube search: (id, title, channel id, seconds or None if live)."""
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query)
    page = get(url).decode("utf-8", "replace")
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", page)
    out = []

    def walk(o):
        if isinstance(o, dict):
            v = o.get("videoRenderer")
            if v:
                runs = v.get("ownerText", {}).get("runs", [{}])
                ch = runs[0].get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId")
                length = v.get("lengthText", {}).get("simpleText")
                secs = None
                if length:
                    secs = 0
                    for part in length.split(":"):
                        secs = secs * 60 + int(part)
                out.append((v["videoId"], v["title"]["runs"][0]["text"], ch, secs))
            for x in o.values():
                walk(x)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    if m:
        walk(json.loads(m.group(1)))
    return out


def build_topics():
    topics = []
    for key, label, icon, query, words in TOPICS:
        videos, seen = [], set()
        for show, title, cid, _ in CHANNELS:
            taken = 0
            for vid, vtitle, ch, secs in search(f"{title} {query}"):
                low = vtitle.lower()
                if (ch != cid or vid in seen or secs is None or secs < 60 or secs > MAX_MINUTES * 60
                        or not any(w in low for w in words) or not embeddable(vid)):
                    continue
                seen.add(vid)
                videos.append({"id": vid, "title": vtitle, "show": show})
                taken += 1
                if taken >= PER_CHANNEL:
                    break
        print(f"topic {key}: {len(videos)} videos")
        if videos:
            topics.append({"key": key, "title": label, "icon": icon, "videos": videos[:PER_TOPIC]})
    return topics


def mix_shows(videos):
    """Reorder so shows take turns: one from each show, then the next round."""
    queues = {}
    for v in videos:
        queues.setdefault(v["show"], []).append(v)
    out = []
    while any(queues.values()):
        for q in queues.values():
            if q:
                out.append(q.pop(0))
    return out


def group_topics(topics):
    """Join topics into MAIN_TOPICS, taking videos from each part in turn."""
    by_key = {t["key"]: t["videos"] for t in topics}
    out = []
    for key, label, icon, parts in MAIN_TOPICS:
        lists = [mix_shows(by_key.get(p, [])) for p in parts]
        videos, seen = [], set()
        while len(videos) < PER_MAIN_TOPIC and any(lists):
            for lst in lists:
                while lst:
                    v = lst.pop(0)
                    if v["id"] not in seen:
                        seen.add(v["id"])
                        videos.append(v)
                        break
                if len(videos) >= PER_MAIN_TOPIC:
                    break
        if videos:
            out.append({"key": key, "title": label, "icon": icon, "videos": videos})
    return out


def check_channels():
    for key, title, cid, _ in CHANNELS:
        html = get(f"https://www.youtube.com/channel/{cid}").decode("utf-8", "replace")
        m = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', html)
        handle = m.group(1) if m else None
        if handle != OFFICIAL.get(key):
            raise SystemExit(f"{title}: channel {cid} is {handle}, not the official {OFFICIAL.get(key)}. Stopped.")
        print(f"{title}: official channel {handle}")


def main():
    check_channels()
    categories = []
    for key, title, cid, limit in CHANNELS:
        root = ET.fromstring(get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
        videos = []
        for e in root.findall("a:entry", NS):
            link = e.find("a:link", NS).get("href")
            if "/shorts/" in link:
                continue
            vid = e.find("yt:videoId", NS).text
            if not embeddable(vid) or is_live(vid):
                continue
            videos.append({"id": vid, "title": e.find("a:title", NS).text})
        print(f"{title}: {len(videos)} videos")
        if videos:
            cat = {"key": key, "title": title, "channel": cid, "videos": videos}
            if limit:
                cat["limit"] = limit
            categories.append(cat)
    topics = group_topics(build_topics())
    OUT.write_text(json.dumps({"daily": DAILY, "topics": topics, "categories": categories}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
