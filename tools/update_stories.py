"""Build stories.json: bedtime stories, read aloud, from official YouTube playlists.

Usage: python3 kids-tube/tools/update_stories.py
At bedtime the app plays only these, as sound with a still picture (see
index.html, "Bedtime stories"). Only the playlists below are used, and each
channel is checked against its official handle first.
"""
import http.client
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import update_videos as u  # noqa: E402

# (key, name shown to parents, official handle, playlist id, playlist name)
PLAYLISTS = [
    ("bluey", "Bluey Book Reads", "@BlueyOfficialChannel", "PLbtUQWldWkKgJiZICfUZ3orfuAtoHFsWl", "Bluey Book Reads Series 2"),
    ("bluey", "Bluey Book Reads", "@BlueyOfficialChannel", None, "Bluey Book Reads Series 3"),
    ("beddybyes", "CBeebies BeddyByes", "@CBeebies", None, "BeddyByes on CBeebies"),
    ("storyline", "Storyline Online", "@StorylineOnline", "PLVkRno2M8Jkpso5VkXR32GK8nIBBEygCa", "Storyline Online Library"),
]
MIN_SECONDS, MAX_SECONDS = 120, 30 * 60
SKIP = ["#shorts", "trailer", "halloween", "live"]
OUT = pathlib.Path(__file__).resolve().parent.parent / "stories.json"


def channel_id(handle):
    html = u.get(f"https://www.youtube.com/{handle}").decode("utf-8", "replace")
    cid = re.search(r'"externalId":"(UC[^"]+)"', html)
    canon = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', html)
    if not cid or not canon or canon.group(1).lower() != handle.lower():
        raise SystemExit(f"{handle}: not the official channel. Stopped.")
    return cid.group(1)


def find_playlist(cid, name):
    for lv in u.lockups(u.page_data(f"https://www.youtube.com/channel/{cid}/playlists"), []):
        if u.card_title(lv).lower().startswith(name.lower()):
            return lv.get("contentId")
    return None


def main():
    stories, seen = [], set()
    for key, label, handle, pid, pname in PLAYLISTS:
        cid = channel_id(handle)
        pid = pid or find_playlist(cid, pname)
        if not pid:
            print(f"{pname}: playlist not found, skipped")
            continue
        found = 0
        try:
            items = u.lockups(u.page_data(f"https://www.youtube.com/playlist?list={pid}"), [])
        except (OSError, http.client.HTTPException, ValueError) as err:
            print(f"{pname}: skipped ({err})")
            continue
        for v in items:
            if v.get("contentType") != "LOCKUP_CONTENT_TYPE_VIDEO" or v["contentId"] in seen:
                continue
            title = u.card_title(v)
            dur = re.findall(r'"text": "(\d+:\d\d(?::\d\d)?)"', json.dumps(v))
            secs = u.to_seconds(dur[0]) if dur else 0
            if not MIN_SECONDS <= secs <= MAX_SECONDS or any(w in title.lower() for w in SKIP):
                continue
            if not u.embeddable(v["contentId"]):
                continue
            seen.add(v["contentId"])
            stories.append({"id": v["contentId"], "title": title, "from": key, "label": label, "secs": secs})
            found += 1
        print(f"{pname}: {found} stories")
    OUT.write_text(json.dumps({"stories": stories}, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT} ({len(stories)} stories)")


if __name__ == "__main__":
    main()
