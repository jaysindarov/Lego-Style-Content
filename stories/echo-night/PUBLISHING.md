# Echo Night: publishing kit

Two uploads from one story. The Short works as the trailer: it asks a question and
holds back the answer. The long episode answers it and ends on a hook for Part 2.

| | Long episode | Short |
|---|---|---|
| File | `stories/echo-night/out/echo-night-en.mp4` (1920×1080) | `stories/echo-night-short/out/echo-night-short-en.mp4` (1080×1920) |
| Length | 9:38 | 1:48 |
| Thumbnail | `echo-night-en-cover.jpg`, 1280×720, text "ONE IS FAKE" | `echo-night-short-en-cover.jpg` |
| Title | **Never Open the Door After the 13th Bell** | **Which One Is My Real Brother? 10 Seconds** |

Titles went through the yt-package linter. The long title scored 100/100: 39
characters, a concrete number, and nothing duplicated from the thumbnail. The Short
title scored 94; the only flag is a mobile cut after "Brother? 10…", where the
subject still shows.

The hook was scored with yt-script `hookscore.py` and came out at 67 (WORKABLE),
the best of 14 candidates. It uses "The Comparison" formula with direct address:
"You have ten seconds to spot which one is my real brother. I didn't, and I almost
lost him forever."

## Voice

ElevenLabs, voice "Clancy - Viral Long-Form Storyteller" (eleven_v4). The Short is one
take; the long episode is three takes (split at scene breaks) played at tempo 1.05 to
land under 10 minutes. Word timings come from ElevenLabs Scribe; `tools/split_voice.py`
cuts the takes into scenes. Chapters were drafted with yt-chapters and anchored on
scene starts (all at least 10 s, first at 0:00).
The little brother's lines are the same take pitched up (kidPitch 1.3).

## How the Short pulls viewers into the long video

1. Publish the long episode first, as Public or Scheduled.
2. Upload the Short. In the Short's upload screen, set **Related video** to the long
   episode. A tappable link to it then shows on the Short.
3. The Short's last line tells viewers to "watch the full story and see if you were
   right". The ending card on screen reads "FULL STORY".
4. Pin the comment below under the Short. The question drives comments, and
   comments push the Short in the feed.

**Short: pinned comment**
> Left or right? 👀 Answer below BEFORE you watch the full story. The answer was on screen the whole time.

**Long: pinned comment**
> Did you spot it before he did? Go back to 0:00 and look at their feet. 🔦 Part 2: what did he see when he looked down?

## Descriptions

The first two lines are the only ones most viewers read, so they carry the search words.

**Long**
```
Two of my little brother came home after the thirteenth bell, and only one of them is real. A blocky town horror story with a mystery you can solve before the ending.

Can you spot the fake in the first 10 seconds? Watch closely — the clue is on screen the whole time.

CHAPTERS
0:00 Can you spot the fake? (10 seconds)
0:25 The rule of the 13th bell
1:04 The baker who came home twice
2:12 What happened to Nina's dad
2:42 The only man who chose right
3:01 The night it happened to us
4:15 Two Milos
4:32 Testing them
5:24 Mister Gray's warning
6:17 Running through the echoes
6:59 Up the lighthouse
7:45 The light tells the truth
8:49 Did you spot it?
9:15 The walk to school

Part 2 is coming. Subscribe so you don't miss it.

#horrorstory #scarystory #animation #mystery #blockystory
```

**Short**
```
One of them is not my brother. You have 10 seconds. Left or right? Full story linked above.
#shorts #horrorstory #scarystory #mystery
```

**Tags** (kept short on purpose, for disambiguation only): echo night, 13th bell,
scary story animation, horror story animated, mimic horror, doppelganger story, blocky
horror story, which one is real, spot the fake, town rules horror

**The three searches this should win** (the title and first lines carry their words):
"scary story animation", "which one is real horror", "town rules horror story".

## Retention beats built into the long episode

- **0:00–0:12** Ten-second challenge with a countdown on screen. The clue (only one
  brother has a shadow) is visible right away.
- **0:12–0:25** Promise of the payoff: "by the end, you'll know exactly where to look".
- **About every 60–90 s** a new turn: the rule, the baker's flashback, Nina's dad, the
  bell count, the knocks, the two Milos, the tests, the misdirect (the smile), the run,
  the climbers, the lever, the reveal.
- **Misdirection that pays off fairly.** Early on, Milo "smiles when he's scared", so
  the smiling brother looks like the fake but is the real one.
- **Payoff:** "Go back to the very beginning. Look at their feet." This sends viewers
  back to the start and adds watch time.
- **Cliffhanger:** the narrator has no shadow. A CTA for Part 2 follows.

The echo townsfolk and the echo Milo never cast a shadow in any shot. Sharp viewers
will catch it and say so in the comments, which is the point.

## Published (26 Nov 2026)

- Long: https://youtu.be/yNT7DpKfFtU (Public, not made for kids, AI label on)
- Short: https://youtube.com/shorts/eAH48Hdfzwg (Public, not made for kids, AI label on)
- YouTube does not yet let this channel set a Short's Related video or pin
  comments ("build your channel history"). The full-story link is in the Short's
  description and in its first comment instead. Set Related video and pin the
  comments once Studio allows it.
