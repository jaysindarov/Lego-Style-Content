/**
 * Shots for this story. Each shot is a pure function of { t, d, k }:
 * t = seconds since the cut, d = shot length, k = t / d (0..1).
 * Animate with k (so a shot works at any length), wiggle with t.
 * See CLAUDE.md "Writing shots" and stories/green-fog/src/shots.ts for 44 worked examples.
 */
import { LOOKS } from "../../../src/world/Avatar";
import { ease, mv, seg, street, type Shot } from "../../../src/engine/kit";

export const SHOTS: Record<string, Shot> = {
  intro: ({ t, k }) => ({
    cam: { pos: mv([90, 150, 210], [30, 70, 120], ease(k)), look: [0, 0, 40], fov: 55 },
    evil: 0,
    fog: 0,
    actors: street(8, 140, 100, 1, "walk", t, k),
    focus: [0, 0, 60],
  }),

  threat: ({ t, k }) => ({
    cam: { pos: [0, 2.6, 150], look: [0, 9, 70], fov: 58 },
    evil: ease(seg(k, 0, 0.4)),
    fog: ease(seg(k, 0.1, 0.7)) * 0.7,
    siren: 1,
    actors: [{ look: LOOKS.hero, anim: "lookup", at: [-6.5, 0.3, 135], yaw: 0.5, t, mood: "worried" }],
    focus: [0, 0, 130],
  }),
};
