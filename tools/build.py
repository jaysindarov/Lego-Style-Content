"""One command per step, for any story and language.

    python3 tools/build.py voice  <slug> <lang>   # TTS + word timings (spends VoiceLab credits once, then cached)
    python3 tools/build.py stills <slug> <lang>   # one still per shot + contact sheets, for review
    python3 tools/build.py video  <slug> <lang>   # sound mix + full render + mux + small preview copy
    python3 tools/build.py cover  <slug> <lang>   # cover image
    python3 tools/build.py all    <slug> <lang>   # voice (if missing), video, cover
    python3 tools/build.py new    <slug>          # scaffold a new story from the template

Outputs land in stories/<slug>/out/ and stories/<slug>/build/<lang>/.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
GEN = ROOT / "src" / "generated"


def run(*cmd: str, cwd: Path = ROOT, quiet: bool = False) -> None:
    print("  $", " ".join(cmd) if len(" ".join(cmd)) < 160 else cmd[0] + " ...")
    subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.DEVNULL if quiet else None, stderr=subprocess.STDOUT if quiet else None)


def select(slug: str, lang: str) -> dict:
    """Point the Remotion project at this story + language (src/generated/current.ts)."""
    tl_path = ROOT / "stories" / slug / "build" / lang / "timeline.json"
    if not tl_path.exists():
        raise SystemExit(f"no timeline for {slug}/{lang}: run `python3 tools/build.py voice {slug} {lang}` first")
    story = json.loads((ROOT / "stories" / slug / "story.json").read_text())
    fmt = story.get("format", "portrait")
    GEN.mkdir(parents=True, exist_ok=True)
    shutil.copy(tl_path, GEN / "timeline.json")
    (GEN / "current.ts").write_text(
        "// Written by tools/build.py: the story and language the next render uses.\n"
        'import timeline from "./timeline.json";\n'
        f'export {{ SHOTS }} from "../../stories/{slug}/src/shots";\n'
        f'export {{ COVER }} from "../../stories/{slug}/src/cover";\n'
        f'export const LANG = "{lang}";\n'
        f'export const FORMAT: "portrait" | "landscape" = "{fmt}";\n'
        "export { timeline };\n"
    )
    # the caption font is the system's Arial Rounded Bold (licensed, so not in git)
    font = ROOT / "public" / "Rounded.ttf"
    if not font.exists():
        sys_font = Path("/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf")
        if not sys_font.exists():
            raise SystemExit("public/Rounded.ttf missing: put a rounded bold .ttf there")
        font.parent.mkdir(exist_ok=True)
        shutil.copy(sys_font, font)
    # webpack's cache does not notice the swap: always bundle fresh
    shutil.rmtree(ROOT / "node_modules" / ".cache", ignore_errors=True)
    return json.loads(tl_path.read_text())


def cuts(tl: dict) -> list[tuple[str, float, float]]:
    raw = []
    for sc in tl["scenes"]:
        sw = [w for w in tl["words"] if w["scene"] == sc["id"]]
        for shot, wi in tl["schedule"][sc["id"]]:
            raw.append([shot, max(0, sc["start"] - 0.14) if wi == 0 else sw[wi]["start"] - 0.06])
    raw[0][1] = 0
    return [(s, a, raw[i + 1][1] if i + 1 < len(raw) else tl["duration"]) for i, (s, a) in enumerate(raw)]


def remotion(*args: str) -> None:
    run("npx", "remotion", *args, "--gl=angle", "--bundle-cache=false", "--log=error")


def voice(slug: str, lang: str) -> None:
    print(f"voice {slug}/{lang}")
    run(sys.executable, str(TOOLS / "voice.py"), slug, lang)


def stills(slug: str, lang: str, frac: float = 0.62, only: list[str] | None = None) -> None:
    tl = select(slug, lang)
    out = ROOT / "stories" / slug / "build" / lang / "stills"
    out.mkdir(parents=True, exist_ok=True)
    shots = [c for c in cuts(tl) if not only or c[0] in only]
    print(f"stills {slug}/{lang}: {len(shots)} shots")
    jobs = [f"{name}:{int((a + (b - a) * frac) * 30)}" for name, a, b in shots]
    run("node", str(TOOLS / "stills.mjs"), str(out), "0.33", *jobs)
    # contact sheets, 8 shots each, in cut order
    names = [s[0] for s in shots]
    land = json.loads((ROOT / "stories" / slug / "story.json").read_text()).get("format") == "landscape"
    tw, th = (634, 356) if land else (356, 634)
    for i in range(0, len(names), 8):
        grp = names[i : i + 8]
        args = []
        for n in grp:
            args += ["-i", str(out / f"{n}.jpg")]
        if len(grp) == 1:
            filt = f"[0:v]scale={tw}:{th}"
        else:
            filt = "".join(f"[{k}:v]scale={tw}:{th}[v{k}];" for k in range(len(grp)))
            filt += "".join(f"[v{k}]" for k in range(len(grp))) + f"xstack=inputs={len(grp)}:layout=" + "|".join(f"{(k % 4) * tw}_{(k // 4) * th}" for k in range(len(grp))) + ":fill=black"
        sheet = out / f"sheet{i // 8}.jpg"
        run("ffmpeg", "-y", "-loglevel", "error", *args, "-filter_complex", filt, str(sheet))
        print(f"  {sheet.relative_to(ROOT)}: {', '.join(grp)}")


def video(slug: str, lang: str) -> None:
    tl = select(slug, lang)
    build = ROOT / "stories" / slug / "build" / lang
    out = ROOT / "stories" / slug / "out"
    out.mkdir(parents=True, exist_ok=True)
    print(f"sound {slug}/{lang}")
    run(sys.executable, str(TOOLS / "sfx.py"), slug, lang)
    print(f"render {slug}/{lang} ({tl['duration']:.0f}s, takes a few minutes)")
    remotion("render", "Story", str(build / "picture.mp4"), "--concurrency=6")
    final = out / f"{slug}-{lang}.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(build / "picture.mp4"), "-i", str(build / "mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final))
    small = out / f"{slug}-{lang}-720p.mp4"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(final), "-vf", "scale=720:1280", "-c:v", "libx264", "-crf", "30", "-preset", "fast", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(small))
    # fail loudly on black frames
    bd = subprocess.run(["ffmpeg", "-i", str(final), "-vf", "blackdetect=d=0.3:pix_th=0.08", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    blacks = bd.count("black_start")
    print(f"  {final.relative_to(ROOT)}  ({final.stat().st_size / 1e6:.0f} MB)\n  {small.relative_to(ROOT)}  ({small.stat().st_size / 1e6:.0f} MB)")
    if blacks:
        print(f"  WARN {blacks} black stretch(es) found: check the stills")


def cover(slug: str, lang: str) -> None:
    select(slug, lang)
    out = ROOT / "stories" / slug / "out"
    out.mkdir(parents=True, exist_ok=True)
    png = out / f"{slug}-{lang}-cover.png"
    print(f"cover {slug}/{lang}")
    remotion("still", "Cover", str(png), f'--props={{"lang":"{lang}"}}')
    fmt = json.loads((ROOT / "stories" / slug / "story.json").read_text()).get("format", "portrait")
    scale = ["-vf", "scale=1280:720"] if fmt == "landscape" else []  # YouTube thumbnail size
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(png), *scale, "-q:v", "2", str(png.with_suffix(".jpg")))
    print(f"  {png.with_suffix('.jpg').relative_to(ROOT)}")


def new(slug: str) -> None:
    dst = ROOT / "stories" / slug
    if dst.exists():
        raise SystemExit(f"{dst} already exists")
    shutil.copytree(ROOT / "stories" / "_template", dst)
    story = json.loads((dst / "story.json").read_text())
    story["slug"] = slug
    (dst / "story.json").write_text(json.dumps(story, ensure_ascii=False, indent=2))
    print(f"created {dst.relative_to(ROOT)}: write story.json, src/shots.ts and src/cover.ts")


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    step, slug = sys.argv[1], sys.argv[2]
    lang = sys.argv[3] if len(sys.argv) > 3 else "en"
    if step == "new":
        return new(slug)
    if not (ROOT / "stories" / slug / "story.json").exists():
        raise SystemExit(f"no story {slug!r} in stories/")
    if step == "voice":
        voice(slug, lang)
    elif step == "stills":
        stills(slug, lang, only=sys.argv[4].split(",") if len(sys.argv) > 4 else None)
    elif step == "video":
        video(slug, lang)
    elif step == "cover":
        cover(slug, lang)
    elif step == "all":
        if not (ROOT / "stories" / slug / "build" / lang / "timeline.json").exists():
            voice(slug, lang)
        video(slug, lang)
        cover(slug, lang)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
