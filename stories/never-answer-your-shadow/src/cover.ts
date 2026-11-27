/** Never Answer Your Shadow — cover: a boy frozen in the plaza, his shadow risen at his back, the tower lamp blazing. */
import { LOOKS } from "../../../src/world/Avatar";
import { TOWER, TOWER_H } from "../../../src/world/layout";
import type { Frame } from "../../../src/engine/kit";

const H = LOOKS.hero;
const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "STAY\nSILENT", bottom: "60 SECONDS" },
};

const frame: Frame = {
  cam: { pos: [6.2, 3.2, 20.5], look: [3.2, 3.6, 12], fov: 50 },
  evil: 0.85,
  fog: 0.2,
  dusk: 0.7,
  palette: "violet",
  towerLamp: 1,
  actors: [
    { look: H, anim: "idle", at: [4.6, 0.06, 15], yaw: 0.25, t: 0.2, mood: "scared" },
    { look: H, anim: "idle", at: [3.1, 0.08, 12.6], yaw: 0.25, t: 0.4, shadow: true, roll: 0.15, scale: 0.72 },
  ],
  focus: [4, 0, 14],
};
void TOWER;
void TOWER_H;

export const COVER = { frame, titles, accent: "#c78cff" };
