"""Narration for one story in one language.

Each scene is its own TTS clip (so scene boundaries are exact), word times
come from VoiceLab STT matched against the script (the script is the truth
for spelling, STT only supplies timings), and each shot's start phrase from
story.json becomes a word index.

    python3 tools/voice.py <slug> <lang>

Writes stories/<slug>/build/<lang>/{scenes/*.wav, narration.wav, timeline.json}.
"""

from __future__ import annotations

import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voicelab  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAP = 0.28  # silence between scenes
LEAD = 0.35  # silence before the first word
TAIL = 1.6  # picture after the last word
APOS = "'‘’ʻʼ`´"


def ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def duration(p: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def uz_apostrophes(text: str) -> str:
    """Official Uzbek Latin: oʻ gʻ with U+02BB, the glottal stop with U+02BC."""
    text = re.sub(rf"([oOgG])[{APOS}]", lambda m: m.group(1) + "ʻ", text)
    return re.sub(r"(?<=\w)['‘’`´](?=\w)", "ʼ", text)


def key(w: str) -> str:
    w = w.lower()
    for a in APOS:
        w = w.replace(a, "'")
    return re.sub(r"[^\w']", "", w)


def display(w: str) -> str:
    return re.sub(r"^[^\w'ʻʼ]+|[^\w'ʻʼ!?]+$", "", w.lower())


def trim(src: Path, dst: Path, rate: int, pitch: float | None) -> None:
    chain = (
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,"
        "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse"
    )
    if pitch:
        chain += f",asetrate={rate}*{pitch},aresample={rate},atempo={1 / pitch:.4f}"
    ff("-i", str(src), "-af", chain, "-ar", "48000", "-ac", "1", str(dst))


def sample_rate(p: Path) -> int:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return int(out.stdout.strip())


def align(clip: Path, text: str, lang: str) -> list[tuple[str, float, float]]:
    words = text.split()
    total = duration(clip)
    heard = voicelab.transcribe(clip, lang)
    times: list[list[float] | None] = [None] * len(words)
    m = difflib.SequenceMatcher(a=[key(w) for w in words], b=[key(h["word"]) for h in heard], autojunk=False)
    for blk in m.get_matching_blocks():
        for o in range(blk.size):
            h = heard[blk.b + o]
            times[blk.a + o] = [h["start"], h["end"]]
    matched = sum(1 for t in times if t)
    if matched < len(words) * 0.7:
        print(f"  WARN only {matched}/{len(words)} words matched the transcript (check the language)")
    i = 0
    while i < len(words):  # interpolate the words STT missed
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(words) and times[j] is None:
            j += 1
        lo = times[i - 1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(words) else total
        if hi <= lo:
            hi = min(total, lo + 0.25 * (j - i))
        step = (hi - lo) / (j - i)
        for k in range(i, j):
            times[k] = [lo + step * (k - i), lo + step * (k - i + 1)]
        i = j
    out, cursor = [], 0.0
    for w, t in zip(words, times):
        s = max(t[0], cursor)
        e = max(t[1], s + 0.04)
        cursor = s
        out.append((w, min(s, total), min(e, total)))
    return out


def shot_index(words: list[str], phrase: str, start: int, where: str) -> int:
    if not phrase:
        return 0
    p = [key(x) for x in phrase.split()]
    k = [key(x) for x in words]
    for i in range(start, len(k) - len(p) + 1):
        if k[i : i + len(p)] == p:
            return i
    raise SystemExit(f"{where}: start phrase {phrase!r} not found in the scene text")


def main() -> None:
    slug, lang = sys.argv[1], sys.argv[2]
    story = json.loads((ROOT / "stories" / slug / "story.json").read_text(encoding="utf-8"))
    voice = story["voices"][lang]
    out = ROOT / "stories" / slug / "build" / lang
    (out / "scenes").mkdir(parents=True, exist_ok=True)

    timeline = {"slug": slug, "language": lang, "title": story["title"].get(lang, ""), "scenes": [], "words": [], "schedule": {}}
    cursor = LEAD
    clips = []
    for scene in story["scenes"]:
        text = scene["text"][lang]
        if re.search(r"\d", text):
            raise SystemExit(f"{scene['id']}: write numbers as words, the voice reads digits badly")
        if lang == "uz":
            text = uz_apostrophes(text)
        kid = bool(scene.get("kid"))
        wav = voicelab.synthesize(
            text,
            voice["kid"] if kid else voice["narrator"],
            lang,
            voice.get("kidSpeed", 1.1) if kid else voice.get("speed", 1.0),
        )
        clip = out / "scenes" / f"{scene['id']}.wav"
        trim(wav, clip, sample_rate(wav), voice.get("kidPitch", 1.35) if kid else None)
        dur = duration(clip)
        for w, s, e in align(clip, text, lang):
            timeline["words"].append({"w": display(w), "start": round(cursor + s, 3), "end": round(cursor + e, 3), "scene": scene["id"], "kid": kid})
        words, sched, prev = text.split(), [], 0
        for shot in scene["shots"]:
            idx = shot_index(words, uz_apostrophes(shot["at"][lang]) if lang == "uz" else shot["at"][lang], prev, f"{scene['id']}/{shot['name']}")
            sched.append([shot["name"], idx])
            prev = idx + 1 if idx else prev
        timeline["schedule"][scene["id"]] = sched
        timeline["scenes"].append({"id": scene["id"], "start": round(cursor, 3), "end": round(cursor + dur, 3), "kid": kid})
        print(f"  {scene['id']}: {dur:.2f}s")
        clips.append(clip)
        cursor += dur + GAP
    timeline["duration"] = round(cursor - GAP + TAIL, 3)

    gap, lead = out / "gap.wav", out / "lead.wav"
    ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(GAP), str(gap))
    ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(LEAD), str(lead))
    seq = [lead]
    for i, c in enumerate(clips):
        seq += [c] + ([gap] if i < len(clips) - 1 else [])
    listing = out / "concat.txt"
    listing.write_text("".join(f"file '{p}'\n" for p in seq))
    ff("-f", "concat", "-safe", "0", "-i", str(listing), "-ar", "48000", "-ac", "1", str(out / "narration.wav"))
    (out / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  narration {timeline['duration']:.1f}s, {len(timeline['words'])} words -> {out / 'timeline.json'}")


if __name__ == "__main__":
    main()
