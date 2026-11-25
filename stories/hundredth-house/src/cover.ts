/** The Hundredth House — cover: the glowing extra house between two dark homes, the brothers in front. */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";

const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "NEVER COUNT\nTHE HOUSES", bottom: "AFTER DARK!" },
};

const frame: Frame = {
  palette: "night",
  cam: { pos: [25, 2.0, -157], look: [25, 7, -134], fov: 58 },
  evil: 1,
  fog: 0.2,
  houses: [{ at: [25, -134], appear: 1, door: 0.6, glow: 1 }],
  actors: [
    { look: LOOKS.hero, anim: "lookup", at: [22.4, 0.3, -148.5], yaw: Math.PI - 0.35, t: 0.3, mood: "scared" },
    { look: LOOKS.kid, anim: "lookup", at: [27.6, 0.3, -148.8], yaw: Math.PI + 0.4, t: 0.3, scale: 0.5, mood: "scared" },
  ],
  focus: [25, 0, -140],
};

export const COVER = { frame, titles, accent: "#9d8cff" };
