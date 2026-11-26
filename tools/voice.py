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


def lead_silence(p: Path) -> float:
    """Seconds of silence trim() will cut from the start (to shift external word times)."""
    out = subprocess.run(["ffmpeg", "-i", str(p), "-af", "silencedetect=n=-45dB:d=0.03", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"silence_start: (-?[\d.]+)\s.*?silence_end: ([\d.]+)", out, re.S)
    if m and float(m.group(1)) <= 0.01:
        return max(0.0, float(m.group(2)) - 0.03)
    return 0.0


def estimate(text: str, total: float) -> list[dict]:
    """No transcript available: spread the words over the clip by length, with pauses at punctuation."""
    words = text.split()
    w = [0.12 + 0.045 * len(re.sub(r"\W", "", x)) for x in words]
    pause = [0.28 if re.search(r"[.!?…]$", x) else 0.12 if x.endswith(",") else 0.0 for x in words]
    scale = total / (sum(w) + sum(pause[:-1]) or 1)
    out, t = [], 0.0
    for x, a, b in zip(words, w, pause):
        out.append({"word": x, "start": t, "end": t + a * scale * 0.92})
        t += (a + b) * scale
    return out


def align(clip: Path, text: str, lang: str, heard: list[dict] | None = None) -> list[tuple[str, float, float]]:
    words = text.split()
    total = duration(clip)
    if heard is None:
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
    gap = story.get("gap", GAP)  # silence between scenes (longer for long-form pacing)
    tail = story.get("tail", TAIL)
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
        heard = None
        if voice.get("engine", "voicelab") == "files":
            # clips made elsewhere (e.g. ElevenLabs): stories/<slug>/voice/<lang>/<id>.(mp3|wav),
            # with optional word timings in <id>.words.json ([{word, start, end}] on the raw clip)
            vdir = ROOT / "stories" / slug / "voice" / lang
            src = next((p for p in (vdir / f"{scene['id']}.mp3", vdir / f"{scene['id']}.wav") if p.exists()), None)
            if src is None:
                raise SystemExit(f"{scene['id']}: no clip in {vdir}")
            wav = src
            wj = vdir / f"{scene['id']}.words.json"
            if wj.exists():
                cut = lead_silence(src)
                heard = [{**h, "start": max(0.0, h["start"] - cut), "end": max(0.0, h["end"] - cut)} for h in json.loads(wj.read_text())]
        else:
            wav = voicelab.synthesize(
                text,
                voice["kid"] if kid else voice["narrator"],
                lang,
                voice.get("kidSpeed", 1.1) if kid else voice.get("speed", 1.0),
            )
        clip = out / "scenes" / f"{scene['id']}.wav"
        trim(wav, clip, sample_rate(wav), voice.get("kidPitch", 1.35) if kid else None)
        dur = duration(clip)
        if heard is None and voice.get("engine") == "files":
            print(f"  {scene['id']}: no word timings, estimating them")
            heard = estimate(text, dur)
        for w, s, e in align(clip, text, lang, heard):
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
        cursor += dur + gap
    timeline["duration"] = round(cursor - gap + tail, 3)

    gap_wav, lead = out / "gap.wav", out / "lead.wav"
    ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(gap), str(gap_wav))
    ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(LEAD), str(lead))
    seq = [lead]
    for i, c in enumerate(clips):
        seq += [c] + ([gap_wav] if i < len(clips) - 1 else [])
    listing = out / "concat.txt"
    listing.write_text("".join(f"file '{p}'\n" for p in seq))
    ff("-f", "concat", "-safe", "0", "-i", str(listing), "-ar", "48000", "-ac", "1", str(out / "narration.wav"))
    (out / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  narration {timeline['duration']:.1f}s, {len(timeline['words'])} words -> {out / 'timeline.json'}")


if __name__ == "__main__":
    main()
