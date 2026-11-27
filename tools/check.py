"""Hard checks on a finished video before it goes to Telegram.

    python3 tools/check.py <slug> <lang>      # exit 1 and print the reasons when it fails
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    slug, lang = sys.argv[1], sys.argv[2]
    s = ROOT / "stories" / slug
    video = s / "out" / f"{slug}-{lang}.mp4"
    bad: list[str] = []
    for f in (video, s / "out" / f"{slug}-{lang}-cover.jpg", s / "PUBLISHING.md"):
        if not f.exists():
            bad.append(f"missing {f.relative_to(ROOT)}")
    if bad:
        raise SystemExit("\n".join(bad))
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,codec_type:format=duration", "-of", "json", str(video)], capture_output=True, text=True).stdout)
    dur = float(probe["format"]["duration"])
    vid = next(x for x in probe["streams"] if x["codec_type"] == "video")
    if (vid["width"], vid["height"]) != (1080, 1920):
        bad.append(f"size {vid['width']}x{vid['height']}, want 1080x1920")
    if not 60 <= dur <= 130:
        bad.append(f"duration {dur:.0f}s outside 60-130s")
    if not any(x["codec_type"] == "audio" for x in probe["streams"]):
        bad.append("no audio track")
    bd = subprocess.run(["ffmpeg", "-i", str(video), "-vf", "blackdetect=d=0.3:pix_th=0.08", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    if bd.count("black_start"):
        bad.append(f"{bd.count('black_start')} black stretch(es)")
    vol = subprocess.run(["ffmpeg", "-i", str(video), "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: (-?[\d.]+) dB", vol)
    if m and float(m.group(1)) < -45:
        bad.append(f"audio almost silent ({m.group(1)} dB)")
    pub = (s / "PUBLISHING.md").read_text()
    t = re.search(r"## Title[^\n]*\n\n\s+([^\n]+)", pub)
    if not t or not 10 <= len(t.group(1).strip()) <= 60:
        bad.append("PUBLISHING.md: title missing or not 10-60 chars")
    if "## Description" not in pub:
        bad.append("PUBLISHING.md: no description")
    if bad:
        print("CHECK FAILED:\n- " + "\n- ".join(bad))
        sys.exit(1)
    print(f"checks ok ({dur:.0f}s)")


if __name__ == "__main__":
    main()
