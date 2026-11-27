/**
 * Echo Night (Short) — the vertical cut. Reuses the long episode's shots
 * (re-framed for 9:16 by makeShots(true)) and adds the Short's own ending,
 * which stops before the answer and sends viewers to the full story.
 */
import { LOOKS } from "../../../src/world/Avatar";
import { gallery, LAMP, LH_FRONT, SWITCH_YAW } from "../../../src/world/Lighthouse";
import { GALLERY_Y, LIGHTHOUSE } from "../../../src/world/layout";
import { ease, mv, seg, yawTo, type Frame, type Shot, type V3 } from "../../../src/engine/kit";
import { makeShots, yard, porchLight } from "../../echo-night/src/shots";

const [LX, , LZ] = LIGHTHOUSE;
const HERO_G = gallery(SWITCH_YAW + 0.4, 4.3);
const beam = (t: number): V3 => [LX + Math.sin(-1 + t * 0.25) * 220, 6, LZ + Math.cos(-1 + t * 0.25) * 220];

const OWN: Record<string, Shot> = {
  // looking down from the balcony, the lamp blazing: no answer shown yet
  shDown: ({ t, k }) => ({
    cam: { pos: mv(gallery(SWITCH_YAW + 0.4, 9.0, 3.0), gallery(SWITCH_YAW + 0.4, 8.6, 2.9), k), look: [HERO_G[0], GALLERY_Y + 2.2, HERO_G[2]], fov: 56 },
    evil: 0.9,
    fog: 0.15,
    lamp: { on: 1, lever: 1, aim: beam(t) },
    actors: [{ look: LOOKS.hero, anim: "idle", at: HERO_G, yaw: yawTo(HERO_G, gallery(SWITCH_YAW + 0.4, 6.4, 0)) + 0.3, t, mood: "worried" }],
    focus: [LX, GALLERY_Y, LZ],
  }),
  shGasp: ({ t, k }) => ({
    cam: { pos: mv(gallery(SWITCH_YAW + 0.4, 8.2, 3.0), gallery(SWITCH_YAW + 0.4, 7.6, 3.0), ease(k)), look: [HERO_G[0], GALLERY_Y + 2.7, HERO_G[2]], fov: 46 },
    evil: 0.9,
    fog: 0.15,
    lamp: { on: 1, lever: 1, aim: beam(t) },
    actors: [{ look: LOOKS.hero, anim: "idle", at: HERO_G, yaw: yawTo(HERO_G, gallery(SWITCH_YAW + 0.4, 6.4, 0)), t, mood: "scared" }],
    tint: "rgba(255,245,210,0.12)",
    shake: k > 0.3 ? 0.1 : 0,
    focus: [LX, GALLERY_Y, LZ],
  }),
  // the two of them again, as in the hook: which one?
  shAsk: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 5.4, -138.6], [25, 4.6, -139.2], k), look: [25, 1.0, -145], fov: 60 }, { note: { text: "LEFT or RIGHT?", k: seg(k, 0, 0.15) } }),
  shBack: ({ t, k }) => ({ ...yard(t, { mood: "scared" }, { mood: "scared" }, { pos: [25, 4.4, -138.8], look: [25, 0.4, -145.4], fov: 62 }, { spots: [porchLight(1.3)] }), rewind: 1 - seg(k, 0.6, 1), clock: "00:10" }),
  shFull: ({ t, k }) => ({
    cam: { pos: mv([LX - 40, 30, LZ + 60], [LX - 60, 50, LZ + 95], ease(k)), look: [LX - 6, 22, LZ], fov: 62 },
    evil: 1,
    fog: 0.35,
    lamp: { on: 1, lever: 1, aim: beam(t * 2) },
    clock: "FULL STORY",
    focus: [LX, 0, LZ],
  }),
};

export const SHOTS: Record<string, Shot> = makeShots(true, OWN as Record<string, (c: Parameters<Shot>[0]) => Frame>);
void LAMP;
void LH_FRONT;
