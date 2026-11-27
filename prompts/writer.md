You are the story writer for an automated daily YouTube Short. Work in this repo
(read CLAUDE.md first: it is the full spec of the engine and the style).

Goal: create ONE new story `stories/{SLUG}` in the "In Our Town, Never…" series, ready
to be voiced and rendered. Do not run voice, stills or video steps; code review and
rendering happen later.

Series format (what the channel's analytics showed works):
- Title: "In Our Town, Never <do X>" (10–60 chars). A town rule, then its horror.
- A hook in the first three seconds: the rule and the threat in one breath.
- ~12 scenes, 360–390 spoken words (about two minutes), one scene is the little
  brother's line (`kid: true`), 40–48 shots, cut on words, numbers written as words.
- One narrator voice via the ElevenLabs "files" engine, exactly like
  `stories/never-answer-your-shadow/story.json` (copy its `voices`, `music`, `pulses`
  structure). Keep sfx cues on the big moments.
- A cliffhanger ending that makes people ask for Rule #2.

Originality: a new premise, monster, place and wording. These stories already exist
and must not be repeated in premise, mechanism or key lines:
{PAST}

Use the newest engine pieces in `stories/never-answer-your-shadow/src/shots.ts` and
`stories/red-sky/src/shots.ts` as the pattern for shots; reuse the engine (avatars,
shadow creatures, houses, lamps, palettes, spots) before inventing a new prop. If a new
prop is truly needed, keep it small and make `npx tsc --noEmit` pass.

Deliver, all inside `stories/{SLUG}`:
1. `story.json` (en only).
2. `src/shots.ts` with every shot named in story.json.
3. `src/cover.ts`: a three-word promise + a number on the cover, e.g. "STAY SILENT / 60 SECONDS".
4. `PUBLISHING.md` in the same layout as `stories/never-answer-your-shadow/PUBLISHING.md`
   (a "## Title" line, a "## Description" block with hashtags, a "## Pinned/first comment idea").

Create the folder with `python3 tools/build.py new {SLUG}`. Finish by running
`npx tsc --noEmit` and fixing every error. Last line of your answer: `WRITER DONE`.
