"""Minimal VoiceLab (voicelab.uz) client, standard library only.

TTS  POST /v1/tts            -> audio/wav (or 202 + a job to poll)
STT  POST /v1/stt (multipart) -> job; poll /v1/stt/transcriptions/{id} for word times
Voices GET /v1/voices?language=..

Every synthesis is cached in cache/voice by sha256 of its inputs, so a rebuild
never spends credits twice (1 credit = 1 character).
"""

from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.voicelab.uz"
CACHE = ROOT / "cache" / "voice"
MODEL = "lison"


def _env() -> dict:
    env = {}
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    env.update({k: v for k, v in os.environ.items() if k.startswith("VOICELAB_")})
    return env


def _key() -> str:
    key = _env().get("VOICELAB_API_KEY")
    if not key:
        raise SystemExit("VOICELAB_API_KEY is missing: put it in .env (see .env.example)")
    return key


def _request(method: str, url: str, body: bytes | None = None, headers: dict | None = None, timeout: int = 180):
    h = {"Authorization": f"Bearer {_key()}", **(headers or {})}
    if not url.startswith("http"):
        url = API + url
    for attempt in range(4):
        req = urllib.request.Request(url, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.headers.get("Content-Type", ""), r.read()
        except urllib.error.HTTPError as e:
            text = e.read()[:500].decode("utf-8", "replace")
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 * (attempt + 1) ** 2)
                continue
            if e.code == 402:
                raise SystemExit(f"VoiceLab credits exhausted (402): {text}")
            raise SystemExit(f"VoiceLab {e.code} on {url}: {text}")
        except urllib.error.URLError:
            if attempt < 3:
                time.sleep(2 * (attempt + 1) ** 2)
                continue
            raise
    raise SystemExit("VoiceLab: out of retries")


def _poll(url: str, timeout: float = 300) -> dict:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        _, _, raw = _request("GET", url)
        data = json.loads(raw)
        if data.get("status") == "completed":
            return data
        if data.get("status") == "failed":
            raise SystemExit(f"VoiceLab job failed: {json.dumps(data)[:400]}")
        time.sleep(1.5)
    raise SystemExit(f"VoiceLab job still running after {timeout:.0f}s: {url}")


def synthesize(text: str, voice: str, language: str, speed: float = 1.0) -> Path:
    """WAV for `text`, from the cache when it has been said before."""
    payload = {"text": text, "language": language, "voice_id": voice, "model_id": MODEL, "speed": round(min(2.0, max(0.5, speed)), 3)}
    key = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    path = CACHE / f"{key}.wav"
    if path.exists() and path.stat().st_size > 0:
        return path
    status, ctype, raw = _request(
        "POST", "/v1/tts", json.dumps(payload).encode(), {"Content-Type": "application/json", "Idempotency-Key": str(uuid.UUID(key[:32]))}
    )
    if status == 202:
        job = _poll(json.loads(raw)["status_url"])
        _, _, raw = _request("GET", job["audio_url"])
    if not raw:
        raise SystemExit("VoiceLab returned an empty body")
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return path


def transcribe(audio: Path, language: str) -> list[dict]:
    """Word timestamps [{word, start, end}] in seconds. Spelling is not to be trusted."""
    boundary = uuid.uuid4().hex
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n{language}\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="{audio.name}"\r\nContent-Type: audio/wav\r\n\r\n'.encode(),
        audio.read_bytes(),
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    _, _, raw = _request(
        "POST", "/v1/stt", b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={boundary}", "Idempotency-Key": str(uuid.uuid4())}, timeout=300
    )
    data = _poll(f"/v1/stt/transcriptions/{json.loads(raw)['id']}")
    words = []
    for seg in data.get("segments") or []:
        for w in seg.get("words") or []:
            words.append({"word": str(w["text"]).strip(), "start": w["start_ms"] / 1000, "end": w["end_ms"] / 1000})
    return words


def voices(language: str) -> list[dict]:
    q = urllib.parse.urlencode({"language": language, "model_id": MODEL})
    _, _, raw = _request("GET", f"/v1/voices?{q}")
    return json.loads(raw).get("data", [])


if __name__ == "__main__":
    import sys

    lang = sys.argv[1] if len(sys.argv) > 1 else "en"
    for v in voices(lang):
        print(f"{v['id']}  {v.get('name')}  [{v.get('gender') or '-'} {v.get('age') or ''}]  {v.get('description') or ''}")
