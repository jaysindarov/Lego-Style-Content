"""Sound for one story in one language: synthesize the effect library with
ffmpeg (no samples, no downloads), place each shot's cues from story.json on
the cut timeline, mix with the narration and a drone bed, normalise to -14 LUFS.

    python3 tools/sfx.py <slug> <lang>

Cue format, on a shot in story.json:
    {"at": 0.25, "sound": "siren", "vol": 0.35}               # at 25% of the shot
    {..., "until": "end"}  or  {..., "until": "mound:1"}      # cut the sound there
    {..., "repeat": 6, "step": 0.1}                            # every 10% of the shot
Top-level "pulses": [{"shot": "carCrack", "at": 0, "dur": 9}] add a heartbeat bed.

Sounds: siren rumble rumble_long boom roar scream chomp whoosh horn bell clank
tick crush clunk ring stomp shriek shatter buzz spark chime knock creak slam paper ding rewind radio (add new ones in build_library()).
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import music  # noqa: E402

LIB = ROOT / "cache" / "sfx"


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def gen(name, filt, d):
    out = LIB / f"{name}.wav"
    if not out.exists():
        ff("-f", "lavfi", "-i", filt, "-t", str(d), "-ar", "48000", "-ac", "2", str(out))
    return out


def gen_complex(name, graph, d):
    out = LIB / f"{name}.wav"
    if not out.exists():
        ff("-filter_complex", graph, "-t", str(d), "-ar", "48000", "-ac", "2", str(out))
    return out


def build_library(DUR):
    LIB.mkdir(parents=True, exist_ok=True)
    (LIB / "drone.wav").unlink(missing_ok=True)  # the bed is cut to each video's length
    # ── the sounds ───────────────────────────────────────────────────────────────
    gen("siren", "aevalsrc='0.45*sin(2*PI*(820*t - 280/(2*PI*0.32)*cos(2*PI*0.32*t)))',lowpass=f=2600,aecho=0.8:0.6:180|340:0.35|0.2,afade=t=in:d=0.4", 9)
    gen("rumble", "anoisesrc=color=brown:amplitude=1,lowpass=f=110,lowpass=f=110,volume=3.2,afade=t=in:d=0.3,afade=t=out:st=2.2:d=0.8", 3)
    gen("rumble_long", "anoisesrc=color=brown:amplitude=1,lowpass=f=90,lowpass=f=90,volume=3.4,afade=t=in:d=1,afade=t=out:st=4.5:d=1.5", 6)
    gen_complex(
        "boom",
        "aevalsrc='0.9*exp(-2.6*t)*sin(2*PI*(38+40*exp(-5*t))*t)':d=3[a];"
        "anoisesrc=color=pink:amplitude=0.8:d=3,lowpass=f=500,volume='exp(-6*t)':eval=frame[b];"
        "[a][b]amix=inputs=2:normalize=0,aecho=0.8:0.5:120:0.3",
        3,
    )
    gen_complex(
        "roar",
        "anoisesrc=color=pink:amplitude=1:d=2.8,bandpass=f=320:w=380,tremolo=f=17:d=0.7,volume=2.6[a];"
        "aevalsrc='0.5*sin(2*PI*62*t+4*sin(2*PI*31*t))*min(1,t*4)':d=2.8[b];"
        "aevalsrc='0.25*sin(2*PI*(180-40*t)*t+2*sin(2*PI*9*t))':d=2.8[c];"
        "[a][b][c]amix=inputs=3:normalize=0,afade=t=in:d=0.15,afade=t=out:st=1.9:d=0.9,aecho=0.8:0.5:90|170:0.4|0.25",
        2.8,
    )
    gen_complex(
        "scream",
        "anoisesrc=color=pink:amplitude=1:d=3.5,bandpass=f=900:w=900,tremolo=f=23:d=0.8,volume=2[a];"
        "aevalsrc='0.35*sin(2*PI*(260+120*sin(2*PI*1.3*t))*t)':d=3.5[b];"
        "aevalsrc='0.45*sin(2*PI*58*t+5*sin(2*PI*29*t))':d=3.5[c];"
        "[a][b][c]amix=inputs=3:normalize=0,afade=t=in:d=0.1,afade=t=out:st=2.4:d=1.1,aecho=0.8:0.6:120|260:0.45|0.3",
        3.5,
    )
    gen_complex(
        "chomp",
        "aevalsrc='0.9*exp(-9*t)*sin(2*PI*(70+90*exp(-20*t))*t)':d=0.8[a];"
        "anoisesrc=color=white:amplitude=0.7:d=0.8,highpass=f=1200,volume='exp(-25*t)':eval=frame[b];"
        "[a][b]amix=inputs=2:normalize=0",
        0.8,
    )
    gen("whoosh", "anoisesrc=color=pink:amplitude=1,bandpass=f=900:w=1400,volume='sin(PI*t/0.9)':eval=frame", 0.9)
    gen("horn", "aevalsrc='0.22*(sgn(sin(2*PI*392*t))+sgn(sin(2*PI*494*t)))',lowpass=f=2200,afade=t=out:st=1.0:d=0.2", 1.2)
    gen(
        "bell",
        "aevalsrc='0.22*exp(-0.55*t)*(sin(2*PI*196*t)+0.6*sin(2*PI*392*t)+0.5*sin(2*PI*468*t)+0.35*sin(2*PI*587*t)+0.22*sin(2*PI*826*t)+0.15*sin(2*PI*1062*t))+0.3*exp(-30*t)*sin(2*PI*1600*t)',aecho=0.8:0.7:240|520:0.35|0.25",
        7,
    )
    gen("clank", "aevalsrc='0.45*exp(-16*t)*(sin(2*PI*820*t)+0.7*sin(2*PI*1270*t)+0.5*sin(2*PI*1930*t)+0.3*sin(2*PI*2710*t))'", 0.45)
    gen("tick", "aevalsrc='0.5*exp(-90*t)*sin(2*PI*2300*t)'", 0.1)
    gen_complex(
        "crush",
        "anoisesrc=color=white:amplitude=0.9:d=1.4,lowpass=f=3500,volume='exp(-3.5*t)':eval=frame[a];"
        "aevalsrc='0.6*exp(-8*t)*(sin(2*PI*310*t)+0.6*sin(2*PI*545*t))':d=1.4[b];"
        "aevalsrc='0.8*exp(-4*t)*sin(2*PI*48*t)':d=1.4[c];"
        "[a][b][c]amix=inputs=3:normalize=0",
        1.4,
    )
    gen("clunk", "aevalsrc='0.7*exp(-12*t)*(sin(2*PI*140*t)+0.5*sin(2*PI*410*t))'", 0.6)
    gen_complex(
        "drone",
        "aevalsrc='0.10*sin(2*PI*55*t)*(0.7+0.3*sin(2*PI*0.09*t))+0.07*sin(2*PI*82.4*t+0.8*sin(2*PI*0.21*t))+0.05*sin(2*PI*110.6*t)*(0.5+0.5*sin(2*PI*0.06*t))+0.03*sin(2*PI*164.8*t)*(0.5+0.5*sin(2*PI*0.13*t))':d={d}[a];"
        "anoisesrc=color=pink:amplitude=0.12:d={d},lowpass=f=380,lowpass=f=380[b];"
        "[a][b]amix=inputs=2:normalize=0,aecho=0.8:0.8:700:0.3".format(d=DUR + 1),
        DUR + 1,
    )
    # red-sky sounds
    gen("ring", "aevalsrc='0.22*(sin(2*PI*1320*t)+0.6*sin(2*PI*1760*t))*(0.5+0.5*sgn(sin(2*PI*20*t)))*lt(mod(t,1.4),0.8)',highpass=f=500", 4)
    gen_complex(
        "stomp",
        "aevalsrc='1.0*exp(-5*t)*sin(2*PI*(30+34*exp(-9*t))*t)':d=1.6[a];"
        "anoisesrc=color=brown:amplitude=1:d=1.6,lowpass=f=160,volume='2.5*exp(-7*t)':eval=frame[b];"
        "[a][b]amix=inputs=2:normalize=0,aecho=0.8:0.4:160:0.25",
        1.6,
    )
    gen_complex(
        "shriek",
        "aevalsrc='0.35*sin(2*PI*(820+380*t+60*sin(2*PI*7*t))*t)*min(1,t*10)':d=2.6[a];"
        "anoisesrc=color=white:amplitude=1:d=2.6,bandpass=f=2400:w=1600,tremolo=f=29:d=0.8,volume=1.4[b];"
        "aevalsrc='0.4*sin(2*PI*70*t+6*sin(2*PI*35*t))':d=2.6[c];"
        "[a][b][c]amix=inputs=3:normalize=0,afade=t=out:st=1.6:d=1.0,aecho=0.8:0.6:110|230:0.4|0.25",
        2.6,
    )
    gen_complex(
        "shatter",
        "aevalsrc='0.45*exp(-1.6*t)*exp(-45*mod(t*1.37,0.071))*sin(2*PI*(1500+700*sin(t*97))*t)':d=2.6[a];"
        "anoisesrc=color=white:amplitude=0.9:d=2.6,bandpass=f=2600:w=3000,volume='exp(-2.2*t)':eval=frame[b];"
        "aevalsrc='0.8*exp(-3*t)*sin(2*PI*42*t)':d=2.6[c];"
        "[a][b][c]amix=inputs=3:normalize=0",
        2.6,
    )
    gen_complex(
        "buzz",
        "aevalsrc='0.18*sgn(sin(2*PI*100*t))*min(1,t*12)*(0.4+0.6*exp(-1.2*t))':d=2.2,lowpass=f=1800[a];"
        "anoisesrc=color=white:amplitude=0.8:d=2.2,highpass=f=3000,volume='exp(-9*t)':eval=frame[b];"
        "[a][b]amix=inputs=2:normalize=0,afade=t=out:st=1.6:d=0.6",
        2.2,
    )
    gen("spark", "anoisesrc=color=white:amplitude=1,highpass=f=2500,tremolo=f=41:d=1,volume='1.2*exp(-2.5*t)*gt(sin(2*PI*13*t+3*sin(2*PI*5*t)),0)':eval=frame", 1.2)
    # hundredth-house sounds
    gen_complex(
        "chime",
        "aevalsrc='0.22*exp(-0.9*t)*(sin(2*PI*1318*t)+0.7*sin(2*PI*1975*t+0.3)+0.5*sin(2*PI*2637*t)+0.35*sin(2*PI*1322*t))':d=4[a];"
        "aevalsrc='0.18*exp(-0.6*t)*sin(2*PI*220*t)*min(1,t*3)':d=4[b];"
        "[a][b]amix=inputs=2:normalize=0,aecho=0.8:0.7:300|600:0.4|0.3",
        4,
    )
    gen("knock", "aevalsrc='0.9*(exp(-40*t)+exp(-40*max(0,t-0.28))*gte(t,0.28)+exp(-40*max(0,t-0.56))*gte(t,0.56))*sin(2*PI*140*t)',lowpass=f=900,aecho=0.6:0.4:60:0.3", 1.2)
    gen("creak", "aevalsrc='0.7*exp(-18*mod(t*(45+35*sin(2*PI*0.6*t)),1))*sin(2*PI*(700+200*sin(2*PI*0.9*t))*t)*min(1,t*5)*(1-t/1.6)',lowpass=f=2500", 1.6)
    gen_complex(
        "slam",
        "aevalsrc='1.0*exp(-9*t)*sin(2*PI*(55+60*exp(-30*t))*t)':d=1.2[a];"
        "anoisesrc=color=white:amplitude=0.8:d=1.2,lowpass=f=2500,volume='exp(-25*t)':eval=frame[b];"
        "[a][b]amix=inputs=2:normalize=0,aecho=0.8:0.5:90:0.3",
        1.2,
    )
    gen("paper", "anoisesrc=color=white:amplitude=0.8,highpass=f=1800,lowpass=f=8000,tremolo=f=17:d=0.9,volume='sin(PI*t/0.7)':eval=frame", 0.7)
    # same-tuesday sounds
    gen("ding", "aevalsrc='0.35*exp(-6*t)*(sin(2*PI*2400*t)+0.6*sin(2*PI*3610*t))+0.35*exp(-6*max(0,t-0.18))*gte(t,0.18)*(sin(2*PI*2400*t)+0.6*sin(2*PI*3610*t))'", 0.9)
    gen_complex(
        "rewind",
        "aevalsrc='0.3*sin(2*PI*(1800-1400*t/1.4)*t*(1+0.2*sin(2*PI*31*t)))':d=1.4[a];"
        "anoisesrc=color=pink:amplitude=0.6:d=1.4,bandpass=f=1600:w=2000,tremolo=f=37:d=0.7[b];"
        "[a][b]amix=inputs=2:normalize=0,afade=t=in:d=0.08,afade=t=out:st=1.0:d=0.4",
        1.4,
    )
    gen_complex(
        "radio",
        "anoisesrc=color=white:amplitude=0.5:d=2.5,highpass=f=800,lowpass=f=4000,volume='0.6*(1-min(1,t/0.6))+0.12':eval=frame[a];"
        "aevalsrc='0.25*sin(2*PI*(220+60*sin(2*PI*3*t))*t)*gt(t,0.6)*(0.6+0.4*sin(2*PI*5*t))':d=2.5,bandpass=f=1000:w=1400[b];"
        "[a][b]amix=inputs=2:normalize=0",
        2.5,
    )
    gen("pulse", "aevalsrc='0.5*exp(-7*mod(t,0.85))*sin(2*PI*48*t)+0.3*exp(-9*mod(t+0.22,0.85))*sin(2*PI*44*t)',lowpass=f=160", 12)



def cuts(story, tl):
    """[(shot, start, end)] exactly as the renderer cuts them."""
    raw = []
    for sc in tl["scenes"]:
        sw = [w for w in tl["words"] if w["scene"] == sc["id"]]
        for shot, wi in tl["schedule"][sc["id"]]:
            raw.append([shot, max(0, sc["start"] - 0.14) if wi == 0 else sw[wi]["start"] - 0.06])
    raw[0][1] = 0
    return {s: (a, raw[i + 1][1] if i + 1 < len(raw) else tl["duration"]) for i, (s, a) in enumerate(raw)}


def main():
    slug, lang = sys.argv[1], sys.argv[2]
    story = json.loads((ROOT / "stories" / slug / "story.json").read_text(encoding="utf-8"))
    build = ROOT / "stories" / slug / "build" / lang
    tl = json.loads((build / "timeline.json").read_text(encoding="utf-8"))
    DUR = tl["duration"]
    build_library(DUR)
    C = cuts(story, tl)

    def at(shot, frac):
        a, b = C[shot]
        return a + (b - a) * frac

    def until(spec, shot):
        if spec == "end":
            return C[shot][1]
        name, frac = spec.split(":")
        return at(name, float(frac))

    cues = []
    for sc in story["scenes"]:
        for sh in sc["shots"]:
            for c in sh.get("sfx", []):
                for r in range(c.get("repeat", 1)):
                    t = at(sh["name"], c["at"] + r * c.get("step", 0))
                    dur = until(c["until"], sh["name"]) - t if c.get("until") else None
                    cues.append((t, c["sound"], c.get("vol", 1.0), dur))
    pulses = [(at(p["shot"], p.get("at", 0)), p["dur"]) for p in story.get("pulses", [])]

    inputs = ["-i", str(build / "narration.wav"), "-i", str(LIB / "drone.wav")]
    graph = ["[0:a]aformat=channel_layouts=stereo,asplit=2[nar][key]", "[1:a]volume=0.55,afade=t=in:d=1.5[drone]"]
    labels = ["[nar]", "[drone]"]
    n = 2
    # original background music, ducked under the voice (see tools/music.py).
    # "music" is one {track, vol} for the whole video, or a list of {track, from: sceneId, vol}
    # segments that cross-fade at scene starts.
    mus = story.get("music")
    if mus:
        segs = mus if isinstance(mus, list) else [{**mus, "from": tl["scenes"][0]["id"]}]
        starts = {sc["id"]: sc["start"] for sc in tl["scenes"]}
        times = [0.0 if i == 0 else max(0.0, starts[sg["from"]] - 0.6) for i, sg in enumerate(segs)]
        mlabels = []
        for i, sg in enumerate(segs):
            a = times[i]
            b = times[i + 1] if i + 1 < len(segs) else DUR
            length = b - a + 1.2
            inputs += ["-i", str(music.render(sg["track"], length))]
            ms = int(a * 1000)
            graph.append(
                f"[{n}:a]atrim=0:{length:.3f},volume={sg.get('vol', 0.3):.3f},afade=t=in:d={0.3 if i == 0 else 1.2},"
                f"afade=t=out:st={max(0, length - 1.2):.3f}:d=1.2,adelay={ms}|{ms}[m{i}]"
            )
            mlabels.append(f"[m{i}]")
            n += 1
        graph.append(f"{''.join(mlabels)}amix=inputs={len(mlabels)}:normalize=0:duration=longest,afade=t=out:st={max(0, DUR - 3):.2f}:d=3[mraw]")
        graph.append("[mraw][key]sidechaincompress=threshold=0.04:ratio=4:attack=30:release=600[music]")
        labels.append("[music]")
    else:
        graph.append("[key]anullsink")
    for t, sound, vol, dur in cues:
        if not (LIB / f"{sound}.wav").exists():
            raise SystemExit(f"unknown sound {sound!r}")
        inputs += ["-i", str(LIB / f"{sound}.wav")]
        trim = f",atrim=0:{dur:.3f},afade=t=out:st={max(0, dur - 0.4):.3f}:d=0.4" if dur else ""
        graph.append(f"[{n}:a]volume={vol * 0.6:.3f}{trim},adelay={int(t * 1000)}|{int(t * 1000)}[c{n}]")
        labels.append(f"[c{n}]")
        n += 1
    for t, d in pulses:
        inputs += ["-i", str(LIB / "pulse.wav")]
        graph.append(f"[{n}:a]atrim=0:{d},afade=t=in:d=0.5,afade=t=out:st={d - 0.8}:d=0.8,volume=0.5,adelay={int(t * 1000)}|{int(t * 1000)}[c{n}]")
        labels.append(f"[c{n}]")
        n += 1
    graph.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,apad=whole_dur={DUR},atrim=0:{DUR},loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    ff(*inputs, "-filter_complex", ";".join(graph), "-map", "[out]", "-ar", "48000", str(build / "mix.wav"))
    print(f"  mix: {len(cues)} cues -> {build / 'mix.wav'}")


if __name__ == "__main__":
    main()
