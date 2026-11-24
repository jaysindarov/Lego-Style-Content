---
name: new-video
description: Make a new blocky 3D story reel (or a new language version of one) in this project's style. Use when asked for a new video, story, episode, part 2, or a translation of an existing story.
---

# New video

Follow CLAUDE.md "Making a new video" step by step. In short:

1. Agree on the premise with the user in one or two lines: the town rule, the
   monster, its weakness, the landmark, the cliffhanger. Then write it fresh. Never
   reuse another creator's plot or lines.
2. `make new STORY=<slug>`. Then write `story.json` in every requested language
   (numbers as words, ~10 scenes, 100–125 s), `src/shots.ts` (~40–45 shots,
   one action each, cut on words) and `src/cover.ts`. Reuse the patterns in
   `stories/green-fog/src/shots.ts`.
3. `make voice`, then `make stills`. Look at every sheet and fix the cameras and
   framing (see the camera gotchas). Repeat until all shots read clearly.
4. `make video`, then `make cover`. Sample frames from the finished MP4 before
   reporting.
5. For a translation only: add the language to every scene's `text` and every
   shot's `at`, add a `voices` entry, then run steps 3–4. The shots do not change.

Report to the user:
- the output paths, the duration, and what was checked;
- anything not checked by ear (the sound mix).

Never publish anything.
