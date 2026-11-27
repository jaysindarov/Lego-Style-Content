/** Echo Night (Short) — cover: the two Milos under the porch light. */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";

const K = LOOKS.kid;
const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "ONE IS\nFAKE", bottom: "10 SECONDS" },
};

const frame: Frame = {
  cam: { pos: [25, 3.4, -157.5], look: [25, 1.4, -144.2], fov: 46 },
  palette: "night",
  evil: 1,
  fog: 0.2,
  houses: [{ at: [25, -134], appear: 1, door: 1, glow: 1, number: "12" }],
  spots: [{ pos: [25, 6.0, -139.4], aim: [25, 0, -146], intensity: 1.4, angle: 0.7 }],
  actors: [
    { look: K, anim: "idle", at: [23.8, 0.3, -144.4], yaw: Math.PI, t: 0.3, scale: 0.42, mood: "scared" },
    { look: K, anim: "idle", at: [26.2, 0.3, -144.4], yaw: Math.PI, t: 0.7, scale: 0.42, mood: "scared", noShadow: true },
  ],
  cast: { from: [31.5, 0, -139.2], len: 1.4, opacity: 0.65 },
  dark: 0.55,
  focus: [25, 0, -144],
};

export const COVER = { frame, titles, accent: "#ff4a3a" };
