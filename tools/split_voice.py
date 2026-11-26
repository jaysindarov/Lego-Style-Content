"""Split one narration take (e.g. from ElevenLabs) into per-scene clips for voice.py.

    python3 tools/split_voice.py <slug> <lang> <full.mp3> <words.json>

`words.json` is a transcript of the whole take with word timings: a list of
{"word"|"text", "start", "end"} (ElevenLabs Scribe output works as-is; spacing
and punctuation entries are ignored). The script is matched against it, each
scene is cut at the middle of the pause before its first word, and the result
lands in stories/<slug>/voice/<lang>/<scene>.wav + <scene>.words.json. Then set
the story's voice "engine" to "files" and run `make voice`.
"""

from __future__ import annotations

import difflib
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice import key  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    slug, lang, full, words_path = sys.argv[1], sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4])
    story = json.loads((ROOT / "stories" / slug / "story.json").read_text())
    raw = json.loads(words_path.read_text())
    if isinstance(raw, dict):
        raw = raw.get("words", raw)
    heard = [
        {"word": (w.get("word") or w.get("text") or "").strip(), "start": float(w["start"]), "end": float(w["end"])}
        for w in raw
        if w.get("type", "word") == "word" and (w.get("word") or w.get("text") or "").strip()
    ]
    script: list[tuple[int, str]] = []  # (scene index, word)
    for si, sc in enumerate(story["scenes"]):
        script += [(si, w) for w in sc["text"][lang].split()]

    times: list[tuple[float, float] | None] = [None] * len(script)
    m = difflib.SequenceMatcher(a=[key(w) for _, w in script], b=[key(h["word"]) for h in heard], autojunk=False)
    for blk in m.get_matching_blocks():
        for o in range(blk.size):
            h = heard[blk.b + o]
            times[blk.a + o] = (h["start"], h["end"])
    matched = sum(1 for t in times if t)
    print(f"matched {matched}/{len(script)} script words")

    total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(full)], capture_output=True, text=True, check=True).stdout)
    n = len(story["scenes"])
    first = [next((times[i] for i, (s, _) in enumerate(script) if s == si and times[i]), None) for si in range(n)]
    last = [next((times[i] for i in range(len(script) - 1, -1, -1) if script[i][0] == si and times[i]), None) for si in range(n)]
    cuts = [0.0]
    for si in range(1, n):
        if not (last[si - 1] and first[si]):
            raise SystemExit(f"scene {story['scenes'][si]['id']}: could not find its edges in the transcript")
        cuts.append((last[si - 1][1] + first[si][0]) / 2)
    cuts.append(total)

    out = ROOT / "stories" / slug / "voice" / lang
    out.mkdir(parents=True, exist_ok=True)
    for si, sc in enumerate(story["scenes"]):
        a, b = cuts[si], cuts[si + 1]
        clip = out / f"{sc['id']}.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(full), "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-ar", "48000", "-ac", "1", str(clip)], check=True)
        words = [{"word": w, "start": round(t[0] - a, 3), "end": round(t[1] - a, 3)} for (s, w), t in zip(script, times) if s == si and t]
        (out / f"{sc['id']}.words.json").write_text(json.dumps(words, indent=0))
        print(f"  {sc['id']}: {b - a:5.2f}s  {len(words)} words")


if __name__ == "__main__":
    main()
