"""Build videos.json from the official YouTube channel feeds.

Usage: python3 kids-tube/tools/update_videos.py
Only channels listed in CHANNELS are used. Shorts, live streams and
videos that YouTube does not allow to be embedded are skipped.
"""
import http.client
import json
import pathlib
import time
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
    # Added 2026-11-16 from the parents' list.
    ("postman", "Postman Pat", "UCqrVPwN_DhavUC386xH9SDw", None),
    ("babyeinstein", "Baby Einstein", "UCtBOJ9bEAoMOY9keGK6p2hQ", None),
    ("sarahduck", "Sarah & Duck", "UC3OUMU3s7Oy6Ta0wnpZFBWw", None),
    ("bing", "Bing", "UCyG6ZCj6weaA2_JvnUWWlVA", None),
    ("danieltiger", "Daniel Tiger", "UCDqgSnRMGVx3dP4sn3ATZMA", None),
    ("franklin", "Franklin", "UCQJ8D7gkhMCqP1qtusqmfgg", None),
    ("littlebear", "Little Bear", "UCncFzSeWqySvOXEbQoEJsZg", None),
    ("arthur", "Arthur", "UCSPzXeCRf12qayHCAtuffzw", None),
    ("carebears", "Care Bears", "UChRHU6dbz5cpM2qVBK0Omng", None),
    ("puffin", "Puffin Rock", "UCBx2mmZhRBkPC2MK4bqcSHQ", None),
    ("mrrogers", "Mister Rogers", "UCQr37RLNViAkEwli9WiaUug", None),
    ("clifford", "Clifford", "UCqu9w7Mw14mAUQMzcyV3D4A", None),
    ("magicbus", "Magic School Bus", "UCi7STzPDqcOvmjm7-bEsvDg", None),
    ("berenstain", "Berenstain Bears", "UCGtFbbGApG0s_8mMuJd-zKg", None),
    ("moomin", "Moomin", "UC82jKc_wW8iHVXU9GrYRunw", None),
]
# The official handle of each channel. Before building, every channel id is
# checked against it, so a look-alike channel (anyone can name a channel
# "Bluey") can never slip in again.
OFFICIAL = {
    "sesame": "@SesameStreet", "blippi": "@Blippi", "numberblocks": "@Numberblocks",
    "bluey": "@BlueyOfficialChannel", "songs": "@SuperSimpleSongs",
    "peppa": "@PeppaPigOfficial", "paw": "@PAWPatrolOfficial",
    "postman": "@PostmanPat", "babyeinstein": "@BabyEinstein", "sarahduck": "@SarahAndDuckOfficial",
    "bing": "@BingBunny", "danieltiger": "@DanielTigersNeighbourhood", "franklin": "@officialfranklin",
    "littlebear": "@OfficialLittleBear", "arthur": "@arthur", "carebears": "@carebears", "puffin": "@PuffinRock",
    "mrrogers": "@MisterRogersNeighborhood", "clifford": "@CliffordtheBigRedDogClassic",
    "magicbus": "@TheMagicSchoolBusOfficial", "berenstain": "@OfficialBerenstainBears", "moomin": "@MoominOfficial",
}
# Each show scored 1-5 by Claude (a judgment, not from a source), used to keep
# every day's list balanced (see dailyList in index.html):
#   real  - 5 = real world, 1 = full of impossible, magical events
#   learn - 5 = clearly teaches (numbers, letters, science, feelings)
#   kind  - 5 = gentle and kind, no fighting or mean jokes
#   calm  - 5 = slow and quiet, 1 = fast, loud and exciting
#   color - 5 = very bright and colourful
#   music - 5 = mostly songs
#   age   - 5 = made for 3-4 year olds, 1 = made for much older or younger
TRAITS = {
    "sesame":       {"real": 3, "learn": 5, "kind": 5, "calm": 3, "color": 4, "music": 4, "age": 5},
    "blippi":       {"real": 5, "learn": 4, "kind": 4, "calm": 1, "color": 5, "music": 4, "age": 5},
    "numberblocks": {"real": 1, "learn": 5, "kind": 4, "calm": 3, "color": 5, "music": 3, "age": 4},
    "bluey":        {"real": 4, "learn": 2, "kind": 5, "calm": 3, "color": 3, "music": 2, "age": 4},
    "songs":        {"real": 3, "learn": 4, "kind": 5, "calm": 4, "color": 4, "music": 5, "age": 5},
    "peppa":        {"real": 4, "learn": 2, "kind": 3, "calm": 4, "color": 3, "music": 1, "age": 5},
    "paw":          {"real": 2, "learn": 1, "kind": 4, "calm": 1, "color": 5, "music": 2, "age": 4},
    "postman":      {"real": 4, "learn": 2, "kind": 5, "calm": 5, "color": 3, "music": 2, "age": 5},
    "babyeinstein": {"real": 4, "learn": 3, "kind": 3, "calm": 4, "color": 5, "music": 5, "age": 2},
    "sarahduck":    {"real": 3, "learn": 2, "kind": 5, "calm": 5, "color": 3, "music": 1, "age": 5},
    "bing":         {"real": 5, "learn": 3, "kind": 5, "calm": 5, "color": 3, "music": 1, "age": 5},
    "danieltiger":  {"real": 4, "learn": 4, "kind": 5, "calm": 4, "color": 4, "music": 4, "age": 5},
    "franklin":     {"real": 4, "learn": 3, "kind": 5, "calm": 5, "color": 3, "music": 1, "age": 4},
    "littlebear":   {"real": 4, "learn": 2, "kind": 5, "calm": 5, "color": 2, "music": 2, "age": 5},
    "arthur":       {"real": 5, "learn": 3, "kind": 4, "calm": 4, "color": 3, "music": 1, "age": 2},
    "carebears":    {"real": 1, "learn": 2, "kind": 5, "calm": 3, "color": 5, "music": 3, "age": 4},
    "puffin":       {"real": 5, "learn": 4, "kind": 5, "calm": 5, "color": 3, "music": 2, "age": 5},
    "mrrogers":     {"real": 5, "learn": 4, "kind": 5, "calm": 5, "color": 2, "music": 4, "age": 4},
    "clifford":     {"real": 3, "learn": 3, "kind": 5, "calm": 4, "color": 4, "music": 1, "age": 5},
    "magicbus":     {"real": 1, "learn": 5, "kind": 4, "calm": 2, "color": 4, "music": 2, "age": 2},
    "berenstain":   {"real": 4, "learn": 3, "kind": 5, "calm": 4, "color": 3, "music": 1, "age": 4},
    "moomin":       {"real": 2, "learn": 1, "kind": 4, "calm": 4, "color": 3, "music": 2, "age": 3},
}

# Official playlists to take videos from, besides each channel's 15 newest
# uploads. A playlist is used when its title contains one of these words
# (case does not matter) and none of SKIP_PLAYLIST.
PLAYLIST_WORDS = {
    "sesame": ["favorite episodes", "sing and dance", "abcs, 123s", "animal songs", "fruits & vegetables",
               "nature explorers", "abc & 123 songs", "i spy songs", "sesame street babies"],
    "blippi": ["vehicle adventures", "roar & explore", "jump, wiggle", "playtime adventures", "job show",
               "tasty adventures", "learns stem"],
    "numberblocks": ["course - level 1", "course - level 2", "course - level 3", "season 8 | full episodes"],
    "bluey": ["full episodes", "full episode collection", "minisodes", "book reads", "music with bluey",
              "play the bluey way", "family fun"],
    "songs": ["counting songs", "all about the alphabet", "big big animals", "big cars and trucks", "bugs",
              "family songs", "healthy kids", "super simple essentials", "top 20", "vehicles"],
    "peppa": ["most popular stories", "peppa pig and friends", "planes, trains"],
    "paw": ["full episodes", "to the rescue", "search & rescue", "water rescue", "air rescue", "fire rescue"],
}
# Channels not listed in PLAYLIST_WORDS use these.
DEFAULT_PLAYLIST_WORDS = ["full episode", "episodes", "season", "compilation", "best of", "songs", "stories"]
SKIP_PLAYLIST = ["live", "#shorts", "shorts", "halloween", "christmas", "holiday", "sponsored", "toys", "roblox", "movie"]
MAX_PER_CHANNEL = 200   # videos per show at most (newest uploads first, then playlists)
MIN_SECONDS = 60

# Fun topics. A video joins a topic when its title has one of the topic's
# words as a whole word (plural too: "dog" matches "dogs", not "dogma"); a word
# ending in * matches any word starting with it ("count*" matches "counting"). Each day one topic
# is the "topic of the day" (see dailyList in index.html).
# (key, Persian label, icon, title words)
TOPICS = [
    ("dino", "دایناسورها", "🦖", ["dinosaur", "dino", "t-rex", "t rex"]),
    ("space", "فضا و ستاره‌ها", "🚀", ["space", "rocket", "moon", "planet", "astronaut", "star"]),
    ("ocean", "دریا و ماهی‌ها", "🐳", ["ocean", "sea", "fish", "whale", "shark", "beach", "underwater", "mermaid", "octopus"]),
    ("farm", "مزرعه", "🐄", ["farm", "cow", "pig", "sheep", "horse", "chicken", "goat", "duck"]),
    ("wild", "جنگل و باغ‌وحش", "🦁", ["jungle", "lion", "tiger", "monkey", "zoo", "safari", "elephant", "giraffe", "bear"]),
    ("bugs", "حشره‌ها", "🐛", ["bug", "insect", "butterfl*", "bee", "bees", "ant", "ants", "spider", "caterpillar", "ladybug"]),
    ("pets", "سگ و گربه", "🐶", ["dog", "pupp*", "cat", "cats", "kitten", "pet", "bunny"]),
    ("trucks", "کامیون و ماشین‌سازی", "🚜", ["truck", "fire engine", "fire truck", "excavator", "digger", "crane", "tractor", "garbage", "construct*"]),
    ("travel", "قطار، هواپیما، کشتی", "🚂", ["train", "plane", "airplane", "aeroplane", "boat", "ship", "bus", "helicopter", "rocket"]),
    ("music", "آهنگ و رقص", "🎵", ["song", "sing*", "danc*", "music", "nursery rhyme"]),
    ("feelings", "احساس‌ها و دوستی", "💛", ["feel*", "sad", "happy", "angry", "scared", "emotion*", "friend", "share", "sharing", "kind", "sorry"]),
    ("food", "خوراکی و آشپزی", "🍎", ["food", "cook*", "cake", "fruit", "vegetable*", "pizza", "snack", "bak*", "kitchen", "ice cream", "picnic"]),
    ("weather", "باران و برف", "☔", ["rain", "snow", "wind", "weather", "storm", "puddle", "rainbow", "sunny"]),
    ("numbers", "عدد و شکل", "🔢", ["number", "count*", "math", "shape", "123"]),
    ("abc", "حروف و قصه", "🔤", ["abc", "alphabet", "letter", "phonics", "book", "read*"]),
    ("art", "رنگ و نقاشی", "🎨", ["color", "colour", "paint*", "draw*", "art", "craft*"]),
    ("bedtime", "شب و خواب", "🌙", ["bedtime", "sleep", "night", "goodnight", "lullaby", "dream*"]),
    ("body", "بدن و سلامتی", "🦷", ["doctor", "dentist", "teeth", "tooth", "wash*", "bath", "potty", "healthy", "hospital"]),
    ("family", "خانواده", "👨‍👩‍👦", ["mum", "mom", "mummy", "dad", "daddy", "family", "baby", "grandma", "granny", "nana", "grandpa", "brother", "sister"]),
    ("outdoor", "پارک و طبیعت", "🌳", ["park", "garden", "tree", "nature", "forest", "outside", "camping", "playground", "flower"]),
    ("party", "تولد و جشن", "🎉", ["birthday", "party", "celebrat*"]),
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
# balance: each day's list keeps at most maxExciting fast shows (calm <= 2) and
# maxFantasy magical shows (real <= 2), and tries for at least minLearn
# teaching shows (learn >= 4) and minCalm quiet shows (calm >= 4).
# topicPerDay: how many of the day's videos come from the topic of the day.
DAILY = {"topicPerDay": 3, "balance": {"maxExciting": 3, "maxFantasy": 5, "minLearn": 6, "minCalm": 6}, "size": 12, "start": "2026-11-16", "perShow": 4, "perLessShow": 1, "videoRestMinutes": 10, "videoHalfMinutes": 10, "showHalfMinutes": 20, "taperPerWeek": 0.7, "turns": 4, "turnMinutes": 15, "breakTimes": 4}

MAX_MINUTES = 60
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
OUT = pathlib.Path(__file__).resolve().parent.parent / "videos.json"


def get(url, tries=4):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9"})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read()
        except urllib.error.HTTPError:
            raise  # a real answer from YouTube (e.g. 401 not embeddable): callers handle it
        except (OSError, http.client.HTTPException):
            if n == tries - 1:
                raise
            time.sleep(3 * (n + 1))  # YouTube dropped the connection: wait and try again


def embeddable(video_id):
    try:
        get(f"https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={video_id}")
        return True
    except (urllib.error.HTTPError, OSError, http.client.HTTPException):
        return False


def is_live(video_id):
    page = get(f"https://www.youtube.com/watch?v={video_id}").decode("utf-8", "replace")
    return '"isLiveContent":true' in page


def topic_words(words):
    return [re.compile(r"\b" + re.escape(w[:-1]) if w.endswith("*") else r"\b" + re.escape(w) + r"(s|es)?\b", re.I)
            for w in words]


# Show and character names are taken out of titles before matching, so
# "Peppa Pig" is not a farm video and "Care Bears" is not a zoo video.
NAME_RE = re.compile(r"peppa pig|george pig|daddy pig|mummy pig|sarah (&|and) duck|care ?bears?|little bear|berenstain bears?"
                     r"|clifford the big red dog|daniel tiger|puffin rock|baby einstein|paw patrol|postman pat|mister rogers"
                     r"|planet earth|bluey|bingo|super simple|numberblocks?|sesame street|magic school bus", re.I)


def build_topics(categories):
    """Sort every collected video into the TOPICS its title matches."""
    out = []
    for key, label, icon, words in TOPICS:
        pats = topic_words(words)
        videos = [{"id": v["id"], "title": v["title"], "show": c["key"]}
                  for c in categories for v in c["videos"] if any(p.search(NAME_RE.sub(" ", v["title"])) for p in pats)]
        print(f"topic {key}: {len(videos)} videos")
        if videos:
            out.append({"key": key, "title": label, "icon": icon, "videos": videos})
    return out


def page_data(url):
    html = get(url).decode("utf-8", "replace")
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
    return json.loads(m.group(1)) if m else {}


def lockups(o, out):
    """Every lockupViewModel (YouTube's card for a video or playlist) in the page data."""
    if isinstance(o, dict):
        if "lockupViewModel" in o:
            out.append(o["lockupViewModel"])
        for v in o.values():
            lockups(v, out)
    elif isinstance(o, list):
        for v in o:
            lockups(v, out)
    return out


def card_title(lv):
    return lv.get("metadata", {}).get("lockupMetadataViewModel", {}).get("title", {}).get("content", "")


def to_seconds(text):
    secs = 0
    for part in text.split(":"):
        secs = secs * 60 + int(part)
    return secs


def playlist_videos(key, cid):
    """(video id, title, playlist title) from the channel's chosen official playlists."""
    words = PLAYLIST_WORDS.get(key, DEFAULT_PLAYLIST_WORDS)
    out = []
    for lv in lockups(page_data(f"https://www.youtube.com/channel/{cid}/playlists"), []):
        name = card_title(lv)
        low = name.lower()
        if not lv.get("contentId") or not any(w in low for w in words) or any(w in low for w in SKIP_PLAYLIST):
            continue
        short = name.split("|")[0].strip()
        found = 0
        try:
            items = lockups(page_data(f"https://www.youtube.com/playlist?list={lv['contentId']}"), [])
        except (OSError, http.client.HTTPException, ValueError) as err:
            print(f"  playlist {short}: skipped ({err})")
            continue
        for v in items:
            if v.get("contentType") != "LOCKUP_CONTENT_TYPE_VIDEO":
                continue
            dur = re.findall(r'"text": "(\d+:\d\d(?::\d\d)?)"', json.dumps(v))
            secs = to_seconds(dur[0]) if dur else None
            if secs is None or secs < MIN_SECONDS or secs > MAX_MINUTES * 60:
                continue
            out.append((v["contentId"], card_title(v), short))
            found += 1
        print(f"  playlist {short}: {found} videos")
    return out


def check_channels():
    for key, title, cid, _ in CHANNELS:
        html = get(f"https://www.youtube.com/channel/{cid}").decode("utf-8", "replace")
        m = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', html)
        handle = m.group(1) if m else None
        if not handle or handle.lower() != (OFFICIAL.get(key) or "").lower():
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
            videos.append({"id": vid, "title": e.find("a:title", NS).text, "list": "تازه‌ها"})
        seen = {v["id"] for v in videos}
        for vid, vtitle, plist in playlist_videos(key, cid):
            if len(videos) >= MAX_PER_CHANNEL:
                break
            if vid in seen or not embeddable(vid):
                continue
            seen.add(vid)
            videos.append({"id": vid, "title": vtitle, "list": plist})
        print(f"{title}: {len(videos)} videos")
        if videos:
            cat = {"key": key, "title": title, "channel": cid, "traits": TRAITS[key], "videos": videos}
            if limit:
                cat["limit"] = limit
            categories.append(cat)
    topics = build_topics(categories)
    OUT.write_text(json.dumps({"daily": DAILY, "topics": topics, "categories": categories}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
