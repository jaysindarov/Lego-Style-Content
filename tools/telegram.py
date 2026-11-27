"""Send text or files to the owner's Telegram bot.

    python3 tools/telegram.py text "message"
    python3 tools/telegram.py story <slug> <lang>   # cover + video + title/description

Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env. Bot uploads are capped at
50 MB, so the video is re-encoded to fit (YouTube re-encodes it again anyway).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 48 * 1024 * 1024


def cfg(name: str) -> str:
    val = os.environ.get(name)
    envfile = ROOT / ".env"
    if not val and envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith(name + "="):
                val = line.split("=", 1)[1].strip().strip('"')
    if not val:
        raise SystemExit(f"{name} missing (.env)")
    return val


def call(method: str, fields: dict, files: dict[str, Path] | None = None) -> dict:
    url = f"https://api.telegram.org/bot{cfg('TELEGRAM_BOT_TOKEN')}/{method}"
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, p in (files or {}).items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{p.name}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()
        body += p.read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read())


def text(msg: str) -> None:
    for i in range(0, len(msg), 4000):
        call("sendMessage", {"chat_id": cfg("TELEGRAM_CHAT_ID"), "text": msg[i : i + 4000]})


def fit(src: Path) -> Path:
    """The full-quality file when it fits, else a re-encode under the bot limit."""
    if src.stat().st_size <= LIMIT:
        return src
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True).stdout)
    kbps = int(LIMIT * 8 / dur / 1000) - 160
    dst = src.with_name(src.stem + "-tg.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-c:v", "libx264", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.2)}k", "-bufsize", f"{kbps * 2}k", "-preset", "slow", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(dst)], check=True)
    return dst


def story(slug: str, lang: str) -> None:
    out = ROOT / "stories" / slug / "out"
    video, cover = out / f"{slug}-{lang}.mp4", out / f"{slug}-{lang}-cover.jpg"
    pub = (ROOT / "stories" / slug / "PUBLISHING.md").read_text()
    title = re.search(r"## Title[^\n]*\n\n\s+([^\n]+)", pub).group(1).strip()
    desc = re.search(r"## Description\n\n(.*?)\n\n## ", pub, re.S).group(1)
    desc = "\n".join(l[4:] if l.startswith("    ") else l for l in desc.splitlines()).strip()
    chat = cfg("TELEGRAM_CHAT_ID")
    call("sendPhoto", {"chat_id": chat, "caption": "Thumbnail"}, {"photo": cover})
    call("sendDocument", {"chat_id": chat, "caption": title}, {"document": fit(video)})
    text(f"TITLE\n{title}\n\nDESCRIPTION\n{desc}")
    comment = re.search(r"## (?:Pinned/first comment idea|First comment)\n\n\s+(.+)", pub)
    if comment:
        text(f"FIRST COMMENT\n{comment.group(1).strip()}")


if __name__ == "__main__":
    if sys.argv[1] == "text":
        text(sys.argv[2])
    elif sys.argv[1] == "story":
        story(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "en")
    else:
        raise SystemExit(__doc__)
