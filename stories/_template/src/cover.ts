/** Cover: one frozen frame + a title per language (kept inside y 285..1635). */
import { LOOKS } from "../../../src/world/Avatar";
import type { Frame } from "../../../src/engine/kit";

const titles: Record<string, { top: string; bottom: string }> = {
  en: { top: "TOP LINE\nOF TITLE", bottom: "SHORT HOOK!" },
  uz: { top: "SARLAVHA\nBIRINCHI QATOR", bottom: "QISQA ILMOQ!" },
};

const frame: Frame = {
  cam: { pos: [0.4, 0.8, 24], look: [1, 24, -10], fov: 80 },
  evil: 1,
  fog: 0.3,
  actors: [{ look: LOOKS.hero, anim: "panic", at: [-1.7, 0.06, 14], yaw: 0.15, t: 0.08, mood: "scared" }],
  focus: [2, 0, 0],
};

export const COVER = { frame, titles };
