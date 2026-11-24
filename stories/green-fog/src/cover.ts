/** Green Fog — cover: the worm bursting out of the plaza behind the brothers. */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";

const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "WHEN THE\nGREEN FOG COMES", bottom: "GET ON A ROOF!" },
  uz: { top: "YASHIL TUMAN\nTUSHSA", bottom: "TOMGA CHIQ!" },
};

const frame: Frame = {
  cam: { pos: [0.4, 0.8, 24], look: [1, 24, -10], fov: 80 },
  evil: 1,
  fog: 0.3,
  worm: { hole: [3, -30], yaw: -0.05, rise: 1, height: 48, bend: 0.5, strike: 0.5, mouth: 1, t: 1.3 },
  cracks: [{ x: 3, z: -30, size: 15, amount: 1 }],
  dust: [{ x: 3, z: -30, amount: 1, spread: 14 }],
  actors: [
    { look: LOOKS.hero, anim: "panic", at: [-1.7, 0.06, 14], yaw: 0.15, t: 0.08, mood: "scared" },
    { look: LOOKS.kid, anim: "panic", at: [1.9, 0.06, 14.6], yaw: -0.2, t: 0.3, scale: 0.5, mood: "scared" },
  ],
  focus: [2, 0, 0],
};

export const COVER = { frame, titles };
