/** Same Tuesday — YouTube thumbnail (1920x1080 rendered, saved as 1280x720): the clock tower at 3:00, the brothers, a rewind feel. */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";
import { TOWER, TOWER_H } from "../../../src/world/layout";

const [TX, , TZ] = TOWER;
const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "SAME DAY\n412 TIMES", bottom: "WHO IS DOING IT?" },
};

const frame: Frame = {
  cam: { pos: [TX + 20, 2.6, TZ + 30], look: [TX, 8, TZ], fov: 58 },
  evil: 0.35,
  fog: 0,
  dusk: 0.7,
  tower: { bellSwing: 0.3, gearIn: 1, lever: 0, glow: 0.6 },
  actors: [
    { look: LOOKS.hero, anim: "idle", at: [TX + 18.6, 0.06, TZ + 24.6], yaw: 0.3, t: 0.3, mood: "scared" },
    { look: LOOKS.kid, anim: "point", at: [TX + 17.0, 0.06, TZ + 25.4], yaw: 0.6, t: 0.3, scale: 0.5, mood: "worried" },
  ],
  clock: "TUE 03:00",
  focus: [TX, 0, TZ],
};

export const COVER = { frame, titles, accent: "#ff4a3a" };
