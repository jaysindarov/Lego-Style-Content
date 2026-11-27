"""Flag stills that are washed out or nearly black, from their brightness and colour.

    python3 tools/stillcheck.py <slug> <lang>   # prints "name: reason" per bad still; exit 1 if any

Washed out: mean luma > 180 with mean saturation < 15 (a white haze over everything,
usually a camera inside a light beam, a spotlight too strong, or fog at the lens).
Too dark: mean luma < 30 (a camera inside a dark object or facing nothing lit).
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def stats(img: Path) -> dict[str, float]:
    err = subprocess.run(["ffmpeg", "-i", str(img), "-vf", "signalstats,metadata=print", "-f", "null", "-"], capture_output=True, text=True).stderr
    return {k: float(v) for k, v in re.findall(r"lavfi\.signalstats\.(YAVG|SATAVG)=([\d.]+)", err)}


def main() -> None:
    slug, lang = sys.argv[1], sys.argv[2]
    d = ROOT / "stories" / slug / "build" / lang / "stills"
    bad = []
    for img in sorted(d.glob("*.jpg")):
        if img.stem.startswith("sheet"):
            continue
        s = stats(img)
        y, sat = s.get("YAVG", 128), s.get("SATAVG", 30)
        if y > 180 and sat < 15:
            bad.append(f"{img.stem}: washed out (brightness {y:.0f}, colour {sat:.0f})")
        elif y < 30:
            bad.append(f"{img.stem}: nearly black (brightness {y:.0f})")
    print("\n".join(bad) if bad else "stills ok")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
