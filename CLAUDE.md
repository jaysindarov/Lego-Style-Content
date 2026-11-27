# Lego-Style-Content: blocky 3D story reels

Vertical (1080×1920, 30 fps) ~2-minute horror-mystery shorts in a blocky toy-city
style: a first-person narrator, single-word yellow captions, a colourful low-poly
town that turns sinister. Everything is generated locally: Remotion + Three.js for
the picture, VoiceLab for the voice, ffmpeg for every sound effect. There are no
stock clips and no AI video. One story can be built in any language VoiceLab has
(en, uz, ru).

The first story, `stories/green-fog`, is the reference for every new one. `stories/red-sky`
(a giant that hunts movement, a lighthouse, a red sky) is the second.

## Quick start

```bash
make new STORY=red-moon          # scaffold stories/red-moon from stories/_template
make voice  STORY=red-moon LANG=en
make stills STORY=red-moon LANG=en   # review sheets in stories/red-moon/build/en/stills/
make video  STORY=red-moon LANG=en   # -> stories/red-moon/out/red-moon-en.mp4 (+ -720p preview)
make cover  STORY=red-moon LANG=en   # -> stories/red-moon/out/red-moon-en-cover.jpg
make voices LANG=en              # list VoiceLab voices for a language
```

The same steps can be run as `python3 tools/build.py <step> <slug> <lang>`. Use
`SHOTS=a,b` with `make stills` to re-render only some shots.

Requirements: Node 22, ffmpeg/ffprobe, and the system python3 (standard library
only). `VOICELAB_API_KEY` goes in `.env`, which is gitignored.

## Making a new video: the workflow

Do these steps in order. Do not skip the stills review.

1. **Story** (`stories/<slug>/story.json`). Write it in every language you need. Format:
   - `scenes[]`. Each scene is one TTS clip:
     - `text`: one entry per language.
     - `kid: true` makes it the little brother's line (kid voice, pitched up).
     - `shots[]`: `{name, at: {lang: "start phrase"}, sfx?: [...]}`. `at` is the
       first one or two words the shot cuts in on, exactly as they appear in that
       scene's text. Use `""` for the first shot of a scene.
   - `voices`: VoiceLab voice ids per language (`make voices`).
   - `pulses`: heartbeat beds under the tensest stretches.
   - Shots appear in the order they play. Their names must exist in `src/shots.ts`.
2. **Shots** (`stories/<slug>/src/shots.ts`): one function per shot name (see
   *Writing shots* below).
3. **Voice**: run `make voice`. It fails if a start phrase is not found, or if the
   text has digits. Write numbers as words.
4. **Review**: run `make stills` and look at **every** contact sheet. The usual
   problems: camera inside a building, a pillar or tree in front, a black
   or washed-out frame, a subject out of frame. Fix them, then re-render only
   those shots with `SHOTS=`.
5. **Video**: run `make video`. It mixes sound, renders the full picture (a few
   minutes), muxes, writes a 720p preview and warns on black frames. Sample frames
   from the result before calling it done.
6. **Cover** (`stories/<slug>/src/cover.ts`): a frozen frame plus a title per
   language. Then run `make cover` and check it.
7. Nothing is published from here. Instagram goes through the owner's own tools,
   and only after they approve.

## The style (keep it)

Taken from the reference reel and the Green Fog build:

- **Story shape**, ~10 scenes, 100–125 s spoken:
  1. A town rule ("whenever X, everyone must Y").
  2. The origin, "N years ago", with the first victims.
  3. It happens almost daily now.
  4. A victim vignette.
  5. One survivor, which gives the rule its number ("ten seconds").
  6. "Yesterday was different": the narrator and their little brother get trapped.
  7. A discovery of the monster's weakness.
  8. A dash to a landmark. Something is broken. The brother distracts the monster
     with a one-line shout.
  9. The fix. The monster flees.
  10. A brief relief, then a cliffhanger (three more of them coming).
- **Shot rhythm**: hard cuts every 1.5–4 s, on words. There are about 40–45 shots in
  2 minutes. Each shot has one clear action. Mix aerials, street level,
  over-the-shoulder and close-ups on faces.
- **Captions**: one word at a time, lowercase, Rounded bold, yellow `#fff35c`
  with a thick black stroke, at ~70 % of the height. Never put other text there.
- **Look**:
  - Bright pastel town in the day: pink, mint, yellow and lavender row houses,
    white towers, red roofs, a blue sky.
  - When the threat comes, the sky turns to a churning coloured storm (`evil` 0→1)
    with low fog (`fog`).
  - Blocky avatars with drawn faces. The mood shows on the face (`smile`,
    `worried`, `scared`, `shout`, `happy`).
- **Sound**: the narration on top, with a drone bed under everything. Add sirens,
  rumbles, roars, impacts and clock ticks under countdowns.
- **Originality**: new premise, monster, places and wording every time. Never copy
  another creator's story or lines, and never use a real brand or game name on screen.

## Writing shots

A shot returns a `Frame` (`src/engine/kit.ts`). The fields:

| field | meaning |
|---|---|
| `cam: {pos, look, fov}` | Camera. Animate it with `mv(a, b, ease(k))`. `fov` 40–62 normally, up to 80 for drama. |
| `evil` 0..1 | Day sky versus storm sky, plus lighting and distance fog. |
| `fog` 0..1 | Low fog sheets hugging the ground. |
| `dusk` 0..1 | Sunset tint, used for endings. |
| `actors[]` | `{look, anim, at, yaw, mood, t?, scale?, holding?, hidden?}`. Feet are at `at`. `yaw` 0 faces +z. Use `yawTo(from, to)`. |
| `worm` | The monster: `{hole, yaw, rise, height, bend, strike, mouth, t, turn?}`. Use `wormTip(state)` to find where its head is. |
| `giants[]` | The tall grinning giant (`src/world/Giant.tsx`, ~38 tall at `scale` 1): `{at, yaw, t, walk?, lean?, crouch?, head?, armR?, elbowR?, grip?, cover?, mouth?, shatter?, y?, scale?}`. `giantHand`, `giantHead`, `giantFace` give exact world points (see `placeFor`/`grabAt` in `stories/red-sky/src/shots.ts`). |
| `lamp` | The plaza lighthouse (`src/world/Lighthouse.tsx`): `{on, aim?, cable?, lever?, spark?}`. `gallery(yaw, r, dy)` gives balcony points. |
| `palette` | Storm colours: `"green"` (default) or `"red"`. Also sets the clock box colour. |
| `cracks[]`, `mounds[]`, `dust[]` | Ground breaking open, something moving under the asphalt, dust clouds. |
| `cars[]`, `bikes[]` | `Car {color, at, yaw, crush, wheelT}`, `Bike {at, yaw, tilt}`. |
| `siren` | Sirens spin and flash. |
| `tower` | Clock tower bell: `{bellSwing, gearIn, lever, glow}`. |
| `wave` | The bell's sound ring spreading over the town. |
| `shake`, `flash`, `tint`, `clock` | Camera shake, a white flash, a colour overlay, a countdown box. |
| `focus` | Where the shadow-casting sun is centred (put it near the action). |

Use `k` (0..1 across the shot) for story beats, so a shot plays the same at any
length. Use `t` for cyclic motion. The helpers are `ease`, `easeOut`, `seg(k, a, b)`,
`mix`, `mv`, `yawTo`, `clockStr`, and `street(n, zFrom, zTo, seed, "walk"|"look"|"climb", t, k)`
for townsfolk.

**Avatars** (`src/world/Avatar.tsx`):
- `LOOKS`: `hero` (blond spiky hair, blue open jacket), `kid` (yellow hoodie, use
  `scale: 0.5`), `girl`, `survivor`, `victim`. For random townsfolk use `townLook(seed)`.
- `anim`: `idle walk run panic lookup climb jump bike bang cheer shout lever work grabbed point sit`.

**The town** (`src/world/layout.ts`; units: an avatar is ~3 tall, a floor 4.2):
- Plaza: `|x|,|z| < 41`. The fountain is at the origin (r 8), trees stand on r 34
  and benches on r 22.
- Main street runs along x = 0 for z 41..250. Its sidewalks are at x ±5..9 and
  its facades at x ±9.
- `SHOP`: facade at x −9, z 75, with its roof at `SHOP_ROOF_Y`.
- `BUSSTOP`: at (7, 0, 176), with its roof at y≈4.2.
- `LIGHTHOUSE`: at (30, 0, −30), balcony floor at `GALLERY_Y` (≈32).
- `TOWER`: at (−30, 0, −30), 46 tall. The belfry floor is at `TOWER_H − 13.3`, and
  the pillars stand at its corners ±4.4.
- Suburb road: along x at z = −150, with houses on both sides.
- Siren poles: `SIRENS`.
- Glass towers stand in the ring of blocks around downtown. Hills lie beyond.

**Camera gotchas** (each one has cost a re-render):
- A camera inside a building or a house renders a flat colour. Keep cameras over
  roads, the plaza, or high in the air.
- Inside the belfry the pillars and the bell block everything. Shoot from just
  outside, through an open face, along the x or z axis.
- Gears and discs face ±z, so shoot them from the z side.
- Rows of trees (the plaza ring, the main street) block low cameras.
- At aerial distance, a subject of 3 units is tiny. Use close shots for faces.

## Extending the world

- **A new monster or prop**: add a component in `src/world/`, add its state to
  `Frame` in `src/engine/kit.ts`, and render it in `World` in `src/engine/Story.tsx`.
  Keep everything a pure function of the frame's fields, with no randomness at
  render time (use the seeded `rng` in `textures.ts`).
- **A new place**: extend `buildCity()` in `src/world/City.tsx`. It is merged per
  material, so add geometry through the `Builder`, and put the landmark's
  coordinates in `layout.ts`.
- **A new sound**: add a `gen(...)` line to `build_library()` in `tools/sfx.py`. These
  are ffmpeg `aevalsrc`/`anoisesrc` recipes, with no downloaded samples.
- **Street signs** follow `LANG` (see `ShopSign`/`BusStop`). Localise any new
  on-screen word the same way.

## Layout

| path | what |
|---|---|
| `stories/<slug>/story.json` | Script in every language, shot schedule, sound cues. |
| `stories/<slug>/src/shots.ts` | The story's shots. |
| `stories/<slug>/src/cover.ts` | Its cover. |
| `stories/<slug>/build/<lang>/` | Generated: scene clips, `narration.wav`, `timeline.json`, `mix.wav`, `stills/`. |
| `stories/<slug>/out/` | Finished videos and covers. |
| `stories/_template/` | Starting point for `make new`. |
| `src/engine/` | Renderer (`Story.tsx`: cuts, captions, overlays), `Cover.tsx`, `kit.ts`. |
| `src/world/` | The town, avatars, monster, props, sky/fog/lights, textures. |
| `src/generated/current.ts` | Written by `tools/build.py`: which story and language Remotion renders. Never edit it by hand. |
| `tools/` | `build.py` (steps), `voice.py` (TTS + word timing), `sfx.py` (effects + mix), `voicelab.py` (API client). |
| `cache/` | TTS audio (cached by content hash, so re-runs are free) and the effects library. |

## Rules

- Always render with a fresh bundle. `build.py` passes `--bundle-cache=false` and
  clears `node_modules/.cache`. A stale webpack cache silently renders old code.
- Re-render a shot after every change to it, and look at the result before
  moving on.
- Never commit `.env`, `cache/`, `build/` or `out/`.
