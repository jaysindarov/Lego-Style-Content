"""Original background music, composed and synthesized here in plain Python
(standard library only), so every note is ours and nothing can trigger a
copyright claim.

    python3 tools/music.py mystery 90        # -> cache/music/mystery-90.wav

Tracks:
    mystery   A-minor music-box arpeggio over a soft pad, then a low pulse and
              light ticks; 80 BPM, builds in three sections and fades out.
"""

from __future__ import annotations

import array
import math
import random
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "cache" / "music"
SR = 24000  # rendered at 24 kHz, resampled to 48 kHz by ffmpeg


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def mystery(dur: float) -> tuple[array.array, array.array]:
    n = int(dur * SR)
    L = array.array("f", bytes(4 * n))
    R = array.array("f", bytes(4 * n))
    beat = 60 / 80
    bar = beat * 4
    # Am, F, C, E (A harmonic minor), one bar each
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]
    rnd = random.Random(7)

    def add(start: float, length: float, fn, pan: float = 0.0, gain: float = 1.0) -> None:
        i0 = max(0, int(start * SR))
        i1 = min(n, int((start + length) * SR))
        gl = gain * math.cos((pan + 1) * math.pi / 4)
        gr = gain * math.sin((pan + 1) * math.pi / 4)
        for i in range(i0, i1):
            v = fn((i - i0) / SR)
            L[i] += v * gl
            R[i] += v * gr

    def music_box(f: float):
        w = 2 * math.pi * f
        return lambda t: (math.sin(w * t) + 0.28 * math.sin(2 * w * t) + 0.1 * math.sin(3.01 * w * t)) * math.exp(-3.2 * t) * min(1.0, t * 400)

    def pad(fs: list[float], length: float):
        ws = [2 * math.pi * f for f in fs]

        def fn(t: float) -> float:
            env = min(1.0, t / 0.8) * min(1.0, (length - t) / 0.8)
            s = 0.0
            for w in ws:
                s += math.sin(w * t) + 0.18 * math.sin(2 * w * t + 0.5) + 0.5 * math.sin(w * 1.003 * t)
            return s * env / len(ws)

        return fn

    def bass(f: float):
        w = 2 * math.pi * f
        return lambda t: math.sin(w * t) * math.exp(-2.4 * t) * min(1.0, t * 200)

    def tick(t: float) -> float:
        return (rnd.random() * 2 - 1) * math.exp(-70 * t)

    pattern = [0, 1, 2, 3, 2, 4, 3, 1]  # indexes into the chord tones (3, 4 = an octave up)
    t0 = 0.0
    k = 0
    while t0 < dur:
        chord = chords[k % 4]
        tones = [m + 12 for m in chord] + [chord[0] + 24, chord[1] + 24]
        section = 0 if t0 < bar * 4 else 1 if t0 < bar * 8 else 2
        # music box: eighth notes, a little swing and a wandering pan
        for j, p in enumerate(pattern):
            st = t0 + j * beat / 2 + (0.02 if j % 2 else 0)
            if st < dur:
                add(st, 1.6, music_box(hz(tones[p])), pan=math.sin(st * 0.7) * 0.5, gain=0.16)
        if section >= 1:
            add(t0, bar + 0.8, pad([hz(m) for m in chord], bar + 0.8), gain=0.09)
        if section >= 2:
            for b in (0, 2):
                add(t0 + b * beat, 1.6, bass(hz(chord[0] - 12)), gain=0.32)
            for j in range(8):
                if j % 2:
                    add(t0 + j * beat / 2, 0.08, tick, pan=0.4 if j % 4 == 1 else -0.4, gain=0.05)
        t0 += bar
        k += 1
    # gentle fade in and out
    fi, fo = int(1.5 * SR), int(3.0 * SR)
    for i in range(min(fi, n)):
        L[i] *= i / fi
        R[i] *= i / fi
    for i in range(max(0, n - fo), n):
        g = (n - i) / fo
        L[i] *= g
        R[i] *= g
    return L, R


def _render(dur: float, bpm: float, chords: list[list[int]], *, pattern: list[int], box: float, pad_from: int, bass_from: int,
            ticks_from: int, decay: float = 3.2, pad_gain: float = 0.09, bass_gain: float = 0.32, pulse8: bool = False,
            sparkle: bool = False, swing: float = 0.02) -> tuple[array.array, array.array]:
    """Generic arpeggio track: chord tones as music-box/piano notes, optional pad, bass and ticks.
    Sections count in bars: pad, bass and ticks join at bar `pad_from`, `bass_from`, `ticks_from`."""
    n = int(dur * SR)
    L = array.array("f", bytes(4 * n))
    R = array.array("f", bytes(4 * n))
    beat = 60 / bpm
    bar = beat * 4
    rnd = random.Random(int(bpm * 7))

    def add(start, length, fn, pan=0.0, gain=1.0):
        i0 = max(0, int(start * SR))
        i1 = min(n, int((start + length) * SR))
        gl = gain * math.cos((pan + 1) * math.pi / 4)
        gr = gain * math.sin((pan + 1) * math.pi / 4)
        for i in range(i0, i1):
            v = fn((i - i0) / SR)
            L[i] += v * gl
            R[i] += v * gr

    def note(f):
        w = 2 * math.pi * f
        return lambda t: (math.sin(w * t) + 0.3 * math.sin(2 * w * t) + 0.08 * math.sin(3.01 * w * t)) * math.exp(-decay * t) * min(1.0, t * 300)

    def pad(fs, length):
        ws = [2 * math.pi * f for f in fs]

        def fn(t):
            env = min(1.0, t / 0.9) * min(1.0, (length - t) / 0.9)
            return sum(math.sin(w * t) + 0.5 * math.sin(w * 1.004 * t) + 0.15 * math.sin(2 * w * t) for w in ws) * env / len(ws)

        return fn

    def bass(f, d=2.4):
        w = 2 * math.pi * f
        return lambda t: math.sin(w * t) * math.exp(-d * t) * min(1.0, t * 200)

    def tick(t):
        return (rnd.random() * 2 - 1) * math.exp(-70 * t)

    t0, k = 0.0, 0
    while t0 < dur:
        chord = chords[k % len(chords)]
        tones = [m + 12 for m in chord] + [chord[0] + 24, chord[1] + 24, chord[2] + 24]
        step = beat / 2
        for j, p in enumerate(pattern):
            if p < 0:
                continue
            st = t0 + j * step + (swing if j % 2 else 0)
            if st < dur:
                add(st, 2.2, note(hz(tones[p])), pan=math.sin(st * 0.7) * 0.5, gain=box)
        if k >= pad_from:
            add(t0, bar + 0.9, pad([hz(m) for m in chord], bar + 0.9), gain=pad_gain)
        if k >= bass_from:
            hits = range(8) if pulse8 else (0, 4)
            for b in hits:
                add(t0 + b * step, 1.2 if pulse8 else 1.8, bass(hz(chord[0] - 12), 6 if pulse8 else 2.4), gain=bass_gain * (0.8 if pulse8 and b % 2 else 1))
        if k >= ticks_from:
            for j in range(8):
                if j % 2 or pulse8:
                    add(t0 + j * step, 0.08, tick, pan=0.4 if j % 4 == 1 else -0.4, gain=0.05)
        if sparkle and k % 2 == 1:
            add(t0 + beat * 3, 3.0, note(hz(chord[0] + 36)), pan=0.3, gain=box * 0.5)
        t0 += bar
        k += 1
    fi, fo = int(1.2 * SR), int(2.5 * SR)
    for i in range(min(fi, n)):
        L[i] *= i / fi
        R[i] *= i / fi
    for i in range(max(0, n - fo), n):
        g = (n - i) / fo
        L[i] *= g
        R[i] *= g
    return L, R


def tension(dur: float):
    """D minor, 100 BPM: a driving low eighth-note pulse, ticking, sparse high notes. For climbs and chases."""
    return _render(dur, 100, [[50, 53, 57], [50, 53, 57], [46, 50, 53], [45, 49, 52]], pattern=[0, -1, -1, 3, -1, -1, 2, -1], box=0.12,
                   pad_from=0, bass_from=0, ticks_from=1, pulse8=True, pad_gain=0.07, bass_gain=0.26)


def tender(dur: float):
    """C major, 68 BPM: slow, warm piano-like arpeggios over a soft pad. For the confession."""
    return _render(dur, 68, [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], pattern=[0, 1, 2, 4, 3, 2, 1, 2], box=0.13,
                   pad_from=0, bass_from=2, ticks_from=999, decay=1.8, pad_gain=0.1, bass_gain=0.22, swing=0.0)


def wonder(dur: float):
    """F major, 84 BPM: bright music box, pad, bass and sparkles, building up. For the bell and the sunset."""
    return _render(dur, 84, [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]], pattern=[0, 2, 4, 2, 5, 4, 3, 1], box=0.15,
                   pad_from=0, bass_from=1, ticks_from=2, sparkle=True, pad_gain=0.1, bass_gain=0.3)


TRACKS = {"mystery": mystery, "tension": tension, "tender": tender, "wonder": wonder}


def render(track: str, dur: float) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{track}-{int(math.ceil(dur))}.wav"
    if out.exists():
        return out
    L, R = TRACKS[track](math.ceil(dur))
    peak = max(1e-6, max(max(abs(x) for x in L), max(abs(x) for x in R)))
    g = 0.89 / peak
    pcm = array.array("h", bytes(2 * 2 * len(L)))
    for i in range(len(L)):
        pcm[2 * i] = int(L[i] * g * 32767)
        pcm[2 * i + 1] = int(R[i] * g * 32767)
    raw = out.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "aecho=0.8:0.6:260|520:0.25|0.15", "-ar", "48000", str(out)], check=True)
    raw.unlink()
    return out


if __name__ == "__main__":
    print(render(sys.argv[1], float(sys.argv[2])))
