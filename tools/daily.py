"""One full daily run: write -> voice -> stills -> review -> render -> checks -> Telegram.

    python3 tools/daily.py                 # new story, today's date
    python3 tools/daily.py --resume <slug> [--from <step>]  # continue a story that stopped
    steps: voice stills review video cover checks telegram

Needs in .env: CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`), ELEVENLABS_API_KEY,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Any failure sends a Telegram message with the step
and the last log lines, so the owner knows when a day was skipped. Logs: logs/<date>.log.
"""

from __future__ import annotations

import datetime
import fcntl
import json
import os
import re
import subprocess
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
LOGS = ROOT / "logs"
SKIP = {"_template"}


def load_env() -> None:
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))


def sh(*cmd: str, log, check: bool = True, capture: bool = False):
    log.write(f"\n$ {' '.join(cmd)[:200]}\n")
    log.flush()
    if capture:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        log.write(p.stdout + p.stderr)
        return p.stdout
    p = subprocess.run(cmd, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, text=True)
    if check and p.returncode:
        raise RuntimeError(f"step failed ({p.returncode}): {' '.join(cmd)[:120]}")
    return p


def claude(prompt: str, log, timeout: int = 5400) -> str:
    """Headless Claude Code run on the subscription token. Returns its final text."""
    log.write(f"\n$ claude -p  ({len(prompt)} chars of prompt)\n")
    log.flush()
    p = subprocess.run(
        [
            "claude", "-p", prompt,
            "--permission-mode", "acceptEdits",
            "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash(python3 tools/build.py:*),Bash(python3 tools/stillcheck.py:*),Bash(npx tsc:*),Bash(ls:*),Bash(cat:*),Bash(SHOTS=*)",
        ],
        cwd=ROOT, capture_output=True, text=True, timeout=timeout, stdin=subprocess.DEVNULL,
    )
    log.write(p.stdout + p.stderr)
    log.flush()
    if p.returncode:
        raise RuntimeError(f"claude exited {p.returncode}: {(p.stderr or p.stdout)[-300:]}")
    return p.stdout


def past_stories() -> str:
    rows = []
    for d in sorted((ROOT / "stories").iterdir()):
        if d.name in SKIP or not (d / "story.json").exists():
            continue
        try:
            title = json.loads((d / "story.json").read_text())["title"].get("en", "")
        except Exception:
            title = ""
        first = ""
        try:
            first = json.loads((d / "story.json").read_text())["scenes"][0]["text"]["en"][:140]
        except Exception:
            pass
        rows.append(f"- {d.name}: {title} | opens: {first}")
    return "\n".join(rows)


def notify(msg: str) -> None:
    try:
        subprocess.run([sys.executable, str(TOOLS / "telegram.py"), "text", msg], cwd=ROOT, check=False, timeout=60)
    except Exception:
        pass


def main() -> None:
    load_env()
    LOGS.mkdir(exist_ok=True)
    day = datetime.date.today().isoformat()
    lock = open(LOGS / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        raise SystemExit("another run is active")
    resume = sys.argv[sys.argv.index("--resume") + 1] if "--resume" in sys.argv else None
    start = sys.argv[sys.argv.index("--from") + 1] if "--from" in sys.argv else "voice"
    order = ["voice", "stills", "review", "video", "cover", "checks", "telegram"]
    todo = set(order[order.index(start):])
    step = "start"
    slug = resume or f"daily-{day}"
    if not resume and (ROOT / "stories" / slug).exists():
        raise SystemExit(f"stories/{slug} already exists: today's Short was made (use --resume to continue it)")
    with open(LOGS / f"{day}.log", "a") as log:
        try:
            if not resume:
                step = "writer"
                prompt = (ROOT / "prompts" / "writer.md").read_text().replace("{SLUG}", slug).replace("{PAST}", past_stories())
                claude(prompt, log)
                if not (ROOT / "stories" / slug / "story.json").exists():
                    raise RuntimeError(f"writer did not create stories/{slug}")
                sh("npx", "tsc", "--noEmit", log=log)
            lang = "en"
            py = sys.executable
            for step in order:
                if step not in todo:
                    continue
                if step == "voice":
                    sh(py, str(TOOLS / "eleven.py"), slug, lang, log=log)
                    sh(py, str(TOOLS / "build.py"), "voice", slug, lang, log=log)
                elif step == "review":
                    flagged = sh(py, str(TOOLS / "stillcheck.py"), slug, lang, log=log, check=False, capture=True)
                    prompt = (ROOT / "prompts" / "reviewer.md").read_text().replace("{SLUG}", slug).replace("{LOOPS}", "4")
                    verdict = claude(prompt.replace("{FLAGGED}", flagged.strip() or "none"), log)
                    left = sh(py, str(TOOLS / "stillcheck.py"), slug, lang, log=log, check=False, capture=True)
                    if "stills ok" not in left:
                        verdict += f"\nREVIEW FAIL: stillcheck still flags: {left.strip()}"
                    if verdict.strip().splitlines()[-1].strip() != "REVIEW PASS":
                        notify(f"Review not clean for {slug}: {verdict.strip().splitlines()[-1][:300]}. Rendering anyway; look before posting.")
                elif step == "checks":
                    sh(py, str(TOOLS / "check.py"), slug, lang, log=log)
                elif step == "telegram":
                    sh(py, str(TOOLS / "telegram.py"), "story", slug, lang, log=log)
                else:  # stills, video, cover
                    sh(py, str(TOOLS / "build.py"), step, slug, lang, log=log)
            log.write(f"\nDONE {slug}\n")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc(file=log)
            tail = (LOGS / f"{day}.log").read_text()[-700:]
            notify(f"Daily Short FAILED at step '{step}': {e}\n\nResume: python3 tools/daily.py --resume {slug} --from {step}\n\n{tail}")
            raise SystemExit(1)


if __name__ == "__main__":
    main()
