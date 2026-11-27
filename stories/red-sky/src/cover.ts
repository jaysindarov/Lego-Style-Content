/** Red Sky — cover: the grinning giant bent over the frozen brothers in the red plaza. */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";
import { giantAt } from "./shots";

const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "WHEN THE SKY\nTURNS RED", bottom: "DON'T MOVE!" },
};

const frame: Frame = {
  palette: "red",
  cam: { pos: [1.2, 1.6, 27], look: [0, 30, -6], fov: 80 },
  evil: 1,
  fog: 0.3,
  giants: [giantAt([0, -10], 0, 1.3, { lean: 0.45, head: 0.35, armR: 0.5, armL: 0.5, elbowR: 0.4, elbowL: 0.4, spreadR: 0.35, spreadL: 0.35, grip: 0.6 })],
  actors: [
    { look: LOOKS.hero, anim: "walk", at: [-0.9, 0.06, 20.2], yaw: 0.1, t: 0.21, mood: "scared" },
    { look: LOOKS.kid, anim: "walk", at: [2.6, 0.06, 21.6], yaw: -0.25, t: 0.62, scale: 0.5, mood: "scared" },
  ],
  focus: [0, 0, 5],
};

export const COVER = { frame, titles, accent: "#ff4a3a" };
