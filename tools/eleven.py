"""Narration through the ElevenLabs API: one take, Scribe word timings, split per scene.

    python3 tools/eleven.py <slug> <lang>

Needs ELEVENLABS_API_KEY in .env. The narrator voice comes from story.json
(`voices.<lang>.narrator`, "elevenlabs:<voice_id>"). Output lands in
stories/<slug>/voice/<lang>/ (full.mp3, full.words.json, then one clip per scene via
split_voice.py). Takes are cached: delete full.mp3 to record again.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.elevenlabs.io/v1"
TTS_MODEL = os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_v3")
STT_MODEL = os.environ.get("ELEVENLABS_STT_MODEL", "scribe_v1")


def env_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY")
    envfile = ROOT / ".env"
    if not key and envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY missing (.env)")
    return key


def tts(text: str, voice_id: str, key: str) -> bytes:
    body = json.dumps({"text": text, "model_id": TTS_MODEL}).encode()
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def transcribe(audio: bytes, key: str) -> list[dict]:
    boundary = uuid.uuid4().hex
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\n{STT_MODEL}\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="timestamps_granularity"\r\n\r\nword\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="full.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode(),
        audio,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    req = urllib.request.Request(
        f"{API}/speech-to-text",
        data=b"".join(parts),
        headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["words"]


def main() -> None:
    slug, lang = sys.argv[1], sys.argv[2]
    story = json.loads((ROOT / "stories" / slug / "story.json").read_text(encoding="utf-8"))
    voice = story["voices"][lang]["narrator"].split(":", 1)[-1]
    vdir = ROOT / "stories" / slug / "voice" / lang
    vdir.mkdir(parents=True, exist_ok=True)
    full, words = vdir / "full.mp3", vdir / "full.words.json"
    key = env_key()
    if not full.exists():
        text = "\n\n".join(sc["text"][lang] for sc in story["scenes"])
        print(f"tts {slug}/{lang}: {len(text.split())} words, model {TTS_MODEL}")
        full.write_bytes(tts(text, voice, key))
    if not words.exists():
        print("transcribe for word timings")
        words.write_text(json.dumps(transcribe(full.read_bytes(), key)))
    subprocess.run([sys.executable, str(ROOT / "tools" / "split_voice.py"), slug, lang, str(full), str(words)], check=True)


if __name__ == "__main__":
    main()
