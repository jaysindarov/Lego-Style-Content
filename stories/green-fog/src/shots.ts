/**
 * Green Fog — shots. Every shot is a pure function of its local time
 * (see src/engine/kit.ts). Names here are the names story.json schedules.
 */
import { LOOKS, townLook, type Anim, type Mood } from "../../../src/world/Avatar";
import { SHOP_ROOF_Y, TOWER, TOWER_H } from "../../../src/world/layout";
import { wormTip, type WormState } from "../../../src/world/Worm";
import { clamp01, clockStr, ease, easeOut, mix, mv, seg, street, yawTo, type ActorSpec, type Shot, type V3 } from "../../../src/engine/kit";

const H = LOOKS.hero;
const K = LOOKS.kid;
const KID_SCALE = 0.5;
const BELFRY_Y = TOWER_H - 14 + 0.7;
const [TX, , TZ] = TOWER;
const GEAR: V3 = [TX + 2.6, BELFRY_Y + 1.6, TZ - 2.4];
const LEVER: V3 = [TX - 2.8, BELFRY_Y, TZ + 2.6];

// plaza crowd
const CROWD = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399 + 0.4;
  const r = 12 + (i % 5) * 4.2;
  return { look: townLook(i + 3), base: [Math.cos(a) * r, 0.06, Math.sin(a) * r] as V3, a };
});
const CRACK_PLAZA: V3 = [16, 0, 14];
const EATEN = [0, 1, 2].map((i) => {
  const a = i * 2.1;
  return [CRACK_PLAZA[0] + Math.cos(a) * 3, 0.06, CRACK_PLAZA[2] + Math.sin(a) * 3] as V3;
});

const crowd = (mode: "walk" | "look" | "panic", t: number, k: number): ActorSpec[] =>
  CROWD.map((p, i) => {
    if (mode === "walk") {
      const ang = p.a + t * 0.05 * (i % 2 ? 1 : -1);
      const r = Math.hypot(p.base[0], p.base[2]);
      const at: V3 = [Math.cos(ang) * r, 0.06, Math.sin(ang) * r];
      const walking = i % 3 !== 0;
      return { look: p.look, anim: walking ? "walk" : "idle", at, yaw: ang + (i % 2 ? 0 : Math.PI), t: t + i, mood: "smile" };
    }
    if (mode === "look") return { look: p.look, anim: "lookup", at: p.base, yaw: yawTo(p.base, [0, 0, 60]) + (i % 3) * 0.3, t: t + i, mood: "worried" };
    // panic: run away from the crack
    const dir = yawTo(CRACK_PLAZA, p.base);
    const run = easeOut(k) * 14;
    const at: V3 = [p.base[0] + Math.sin(dir) * run, 0.06, p.base[2] + Math.cos(dir) * run];
    return { look: p.look, anim: "panic", at, yaw: dir, t: t + i * 0.3, mood: "scared" };
  });

// ── shots ─────────────────────────────────────────────────────────────────────
export const SHOTS: Record<string, Shot> = {
  cityFly: ({ t, k }) => ({
    cam: { pos: mv([90, 150, 210], [30, 70, 120], ease(k)), look: mv([0, 0, 30], [0, 0, 60], k), fov: 55 },
    evil: 0,
    fog: 0,
    actors: crowd("walk", t, k),
    focus: [0, 0, 60],
  }),

  fogStreet: ({ t, k }) => ({
    cam: { pos: mv([0, 2.4, 160], [0, 2.8, 150], k), look: [0, 9, 70], fov: 58 },
    evil: ease(seg(k, 0, 0.35)),
    fog: ease(seg(k, 0.1, 0.6)) * 0.8,
    siren: k > 0.25 ? 1 : 0,
    actors: k < 0.35 ? street(10, 150, 110, 40, "look", t, k) : street(10, 150, 110, 40, "climb", t, seg(k, 0.35, 1)),
    focus: [0, 0, 130],
  }),

  mound: ({ t, k }) => ({
    cam: { pos: [3, 1.6, 128], look: [0, 1.2, 100], fov: 50 },
    evil: 1,
    fog: 0.7,
    mounds: [{ x: 0, z: mix(70, 116, k), yaw: 0, amount: 1 }],
    dust: [{ x: 0, z: mix(70, 116, k), amount: 0.8, spread: 6 }],
    shake: 0.25,
    focus: [0, 0, 105],
  }),

  plazaDay: ({ t, k }) => ({
    cam: { pos: mv([42, 15, 46], [36, 12, 52], k), look: [0, 3, 0], fov: 55 },
    evil: 0,
    fog: 0,
    actors: crowd("walk", t, k),
    focus: [0, 0, 0],
  }),

  plazaFog: ({ t, k }) => ({
    cam: { pos: [12, 2.4, 32], look: mv([0, 12, 0], [-8, 34, -30], ease(k)), fov: 62 },
    evil: ease(seg(k, 0.05, 0.6)),
    fog: ease(seg(k, 0.3, 1)) * 0.75,
    actors: crowd(k < 0.5 ? "walk" : "look", t, k),
    focus: [0, 0, 0],
  }),

  plazaLook: ({ t, k }) => ({
    cam: { pos: mv([2, 3, 28], [1, 3.2, 25], k), look: [-2, 3.6, 12], fov: 44 },
    evil: 1,
    fog: 0.7,
    actors: crowd("look", t, k),
    focus: [0, 0, 15],
  }),

  plazaCrack: ({ t, k }) => ({
    cam: { pos: [40, 11, 46], look: [14, 1, 12], fov: 52 },
    evil: 1,
    fog: 0.6,
    cracks: [{ x: CRACK_PLAZA[0], z: CRACK_PLAZA[2], size: 14, amount: easeOut(seg(k, 0.15, 0.45)) }],
    dust: [{ x: CRACK_PLAZA[0], z: CRACK_PLAZA[2], amount: seg(k, 0.15, 0.3) }],
    actors: [
      ...crowd(k < 0.25 ? "look" : "panic", t, seg(k, 0.25, 1)),
      ...EATEN.map((p, i) => ({ look: townLook(60 + i), anim: (k < 0.25 ? "lookup" : "panic") as Anim, at: p, yaw: i, t: t + i, mood: "scared" as Mood })),
    ],
    shake: k > 0.15 ? 0.9 * (1 - seg(k, 0.4, 1) * 0.6) : 0,
    flash: k > 0.15 && k < 0.2 ? 0.3 : 0,
    focus: CRACK_PLAZA,
  }),

  plazaWorm: ({ t, k }) => {
    const worm: WormState = {
      hole: [CRACK_PLAZA[0], CRACK_PLAZA[2]],
      yaw: 0.6,
      rise: easeOut(seg(k, 0, 0.3)),
      height: 42,
      bend: ease(seg(k, 0.25, 0.6)) * 0.7,
      strike: ease(seg(k, 0.5, 0.72)) - ease(seg(k, 0.8, 1)) * 0.6,
      mouth: k < 0.7 ? ease(seg(k, 0.1, 0.4)) : 1 - ease(seg(k, 0.7, 0.8)),
      t,
    };
    const tip = wormTip(worm);
    const grab = seg(k, 0.6, 0.72);
    return {
      cam: { pos: mv([58, 5, 66], [62, 7, 72], k), look: [14, 18, 10], fov: 62 },
      evil: 1,
      fog: 0.6,
      worm,
      cracks: [{ x: CRACK_PLAZA[0], z: CRACK_PLAZA[2], size: 14, amount: 1 }],
      dust: [{ x: CRACK_PLAZA[0], z: CRACK_PLAZA[2], amount: 1 - seg(k, 0.3, 1) * 0.5 }],
      actors: [
        ...crowd("panic", t, 0.5 + k * 0.5),
        ...EATEN.map((p, i) => ({
          look: townLook(60 + i),
          anim: "grabbed" as Anim,
          at: mv([p[0] + 6, 0.06, p[2] + 6], tip, ease(grab)),
          yaw: i,
          t: t + i,
          mood: "scared" as Mood,
          hidden: k > 0.74,
        })),
      ],
      shake: 0.6 * (1 - seg(k, 0, 0.3)) + (k > 0.6 && k < 0.75 ? 0.6 : 0),
      focus: CRACK_PLAZA,
    };
  },

  emptyStreet: ({ k }) => ({
    cam: { pos: mv([0, 24, 240], [0, 20, 175], k), look: mv([0, 2, 110], [0, 2, 80], k), fov: 55 },
    evil: 1,
    fog: 0.9,
    siren: 1,
    focus: [0, 0, 150],
  }),

  shopVictim: ({ t, k }) => {
    const V: V3 = [7.3, 0.3, 100];
    const worm: WormState = {
      hole: [V[0] - 0.5, V[2]],
      yaw: -Math.PI / 2,
      rise: easeOut(seg(k, 0.4, 0.58)) * 0.55 - ease(seg(k, 0.78, 1)) * 0.55,
      height: 34,
      bend: 0.05,
      strike: 0,
      mouth: 1 - ease(seg(k, 0.6, 0.7)) * 0.8,
      t,
    };
    return {
      cam: { pos: [-16, 5, 92], look: [7, 9, 100], fov: 58 },
      evil: 1,
      fog: 0.6,
      worm: k > 0.38 ? worm : null,
      cracks: [{ x: V[0] - 0.5, z: V[2], size: 9, amount: easeOut(seg(k, 0.3, 0.45)) }],
      dust: [{ x: V[0], z: V[2], amount: seg(k, 0.4, 0.5), spread: 6 }],
      actors: [{ look: LOOKS.victim, anim: k < 0.3 ? "lookup" : "grabbed", at: [V[0], V[1] + Math.max(0, worm.rise) * 14 * (k > 0.45 ? 1 : 0), V[2]], yaw: -Math.PI / 2, t, mood: k < 0.3 ? "worried" : "scared", hidden: k > 0.62 }],
      shake: k > 0.3 && k < 0.7 ? 0.7 : 0,
      focus: V,
    };
  },

  bikeRide: ({ t, k }) => {
    const x = mix(-80, -52, k);
    return {
      cam: { pos: [x + 5, 2.6, -138], look: [x + 1, 2, -148], fov: 50 },
      evil: 0,
      fog: 0,
      actors: [{ look: LOOKS.girl, anim: "bike", at: [x, 0.95, -148], yaw: Math.PI / 2, t, mood: "smile" }],
      bikes: [{ at: [x, 0.03, -148], yaw: Math.PI / 2, t }],
      focus: [x, 0, -148],
    };
  },

  siren: ({ t, k }) => ({
    cam: { pos: [-27, 2, -151], look: [-35, 12.5, -143], fov: 52 },
    evil: ease(seg(k, 0, 0.5)),
    fog: ease(seg(k, 0.2, 1)) * 0.5,
    siren: 1,
    focus: [-35, 0, -143],
  }),

  bikeRush: ({ t, k }) => {
    const x = mix(-40, -6, k);
    return {
      cam: { pos: [x - 13, 4.2, -147], look: [x + 12, 2, -148], fov: 55 },
      evil: 1,
      fog: 0.75,
      siren: 1,
      actors: [{ look: LOOKS.girl, anim: "bike", at: [x, 0.95, -148], yaw: Math.PI / 2, t: t * 1.8, mood: "scared" }],
      bikes: [{ at: [x, 0.03, -148], yaw: Math.PI / 2, t: t * 1.8 }],
      focus: [x, 0, -148],
    };
  },

  bikeGrab: ({ t, k }) => {
    const hole: [number, number] = [14, -148];
    const worm: WormState = {
      hole,
      yaw: -Math.PI / 2,
      rise: easeOut(seg(k, 0.2, 0.42)),
      height: 36,
      bend: ease(seg(k, 0.35, 0.6)) * 0.6,
      strike: ease(seg(k, 0.5, 0.66)),
      mouth: k < 0.6 ? ease(seg(k, 0.25, 0.5)) : 1 - ease(seg(k, 0.66, 0.76)),
      t,
    };
    const tip = wormTip(worm);
    const bx = mix(-4, 4, easeOut(seg(k, 0, 0.5)));
    const grab = seg(k, 0.6, 0.68);
    return {
      cam: { pos: [-22, 9, -126], look: [8, 14, -148], fov: 62 },
      evil: 1,
      fog: 0.7,
      worm,
      cracks: [{ x: hole[0], z: hole[1], size: 12, amount: easeOut(seg(k, 0.12, 0.3)) }],
      dust: [{ x: hole[0], z: hole[1], amount: seg(k, 0.15, 0.3) }],
      actors: [
        {
          look: LOOKS.girl,
          anim: grab > 0 ? "grabbed" : "bike",
          at: grab > 0 ? mv([bx, 1, -148], tip, ease(grab)) : [bx, 0.95, -148],
          yaw: Math.PI / 2,
          t: t * 1.8,
          mood: "scared",
          hidden: k > 0.7,
        },
      ],
      bikes: [{ at: [bx, 0.03, -148], yaw: Math.PI / 2, tilt: ease(seg(k, 0.66, 0.85)) * 1.45, t }],
      shake: k > 0.15 && k < 0.8 ? 0.7 : 0.1,
      focus: [hole[0], 0, hole[1]],
    };
  },

  bikeAlone: ({ t, k }) => ({
    cam: { pos: mv([-2, 1.4, -138], [0, 1.2, -141], k), look: [4, 0.7, -148], fov: 44 },
    evil: 1,
    fog: 0.85,
    cracks: [{ x: 14, z: -148, size: 12, amount: 1 }],
    bikes: [{ at: [4, 0.25, -148], yaw: Math.PI / 2, tilt: 1.45, t: t * 0.4 }],
    focus: [4, 0, -148],
  }),

  carDrive: ({ t, k }) => {
    const z = mix(245, 212, k);
    return {
      cam: { pos: [-6, 3.2, z - 14], look: [2.6, 1.6, z], fov: 50 },
      evil: 0,
      fog: 0,
      cars: [{ color: "#3a7bd5", at: [2.6, 0.03, z], yaw: Math.PI, wheelT: t }],
      actors: [{ look: LOOKS.survivor, anim: "sit", at: [2.0, 0.55, z - 0.2], yaw: Math.PI, t, scale: 0.45 }],
      focus: [2.6, 0, z],
    };
  },

  carFog: ({ t, k }) => {
    const z = mix(206, 188, k);
    return {
      cam: { pos: [2.0, 2.45, z + 0.4], look: [2.2, mix(4, 14, ease(k)), z - 40], fov: 62 },
      evil: ease(seg(k, 0.05, 0.55)),
      fog: ease(seg(k, 0.3, 1)) * 0.7,
      siren: 1,
      focus: [2.6, 0, z - 20],
    };
  },

  carCrack: ({ t, k }) => {
    const z = mix(186, 170, easeOut(seg(k, 0, 0.45)));
    const worm: WormState = {
      hole: [2.6, 158],
      yaw: 0,
      rise: easeOut(seg(k, 0.25, 0.55)),
      height: 38,
      bend: ease(seg(k, 0.45, 0.9)) * 0.55,
      strike: ease(seg(k, 0.7, 1)) * 0.3,
      mouth: ease(seg(k, 0.4, 0.75)),
      t,
    };
    return {
      cam: { pos: [-20, 6, 182], look: [2, 12, 165], fov: 58 },
      evil: 1,
      fog: 0.6,
      worm: k > 0.2 ? worm : null,
      cracks: [{ x: 2.6, z: 158, size: 13, amount: easeOut(seg(k, 0.12, 0.35)) }],
      dust: [{ x: 2.6, z: 158, amount: seg(k, 0.15, 0.4) }],
      cars: [{ color: "#3a7bd5", at: [2.6, 0.03, z], yaw: Math.PI, wheelT: t * (1 - k), lights: 1 }],
      actors: [{ look: LOOKS.survivor, anim: "sit", at: [2.0, 0.55, z - 0.2], yaw: Math.PI, t, scale: 0.45, mood: "scared" }],
      shake: k > 0.12 ? 0.8 : 0,
      focus: [2.6, 0, 165],
    };
  },

  carJump: ({ t, k }) => {
    const worm: WormState = { hole: [2.6, 158], yaw: 0, rise: 1, height: 38, bend: 0.55, strike: 0.3 + ease(seg(k, 0, 1)) * 0.15, mouth: 0.9, t };
    const run = seg(k, 0.08, 0.45);
    const climb = seg(k, 0.45, 0.8);
    const p0: V3 = [4.4, 0.3, 170];
    const p1: V3 = [6.6, 0.3, 174.8];
    const at: V3 = climb > 0 ? [mix(p1[0], 7, climb), 0.3 + climb * 4.0, mix(p1[2], 176, climb)] : mv(p0, p1, run);
    return {
      cam: { pos: [-8, 5, 194], look: [5, 5, 172], fov: 55 },
      evil: 1,
      fog: 0.55,
      worm,
      cracks: [{ x: 2.6, z: 158, size: 13, amount: 1 }],
      cars: [{ color: "#3a7bd5", at: [2.6, 0.03, 170], yaw: Math.PI, lights: 1 }],
      actors: [
        {
          look: LOOKS.survivor,
          anim: k < 0.08 ? "jump" : climb > 0 && climb < 1 ? "climb" : climb >= 1 ? "lookup" : "run",
          at,
          yaw: climb >= 1 ? Math.PI : yawTo(p0, p1),
          t,
          mood: "scared",
        },
      ],
      shake: 0.25,
      focus: [4, 0, 170],
    };
  },

  carEaten: ({ t, k }) => {
    const strike = ease(seg(k, 0, 0.25));
    const worm: WormState = {
      hole: [2.6, 158],
      yaw: 0,
      rise: 1 - ease(seg(k, 0.35, 0.95)) * 0.9,
      height: 38,
      bend: 0.55,
      strike: 0.45 + strike * 0.55,
      mouth: 1 - ease(seg(k, 0.18, 0.3)) * 0.85,
      t,
    };
    const drag = ease(seg(k, 0.3, 0.9));
    return {
      cam: { pos: [3.5, 7, 200], look: [3, 6, 164], fov: 58 },
      evil: 1,
      fog: 0.55,
      worm,
      cracks: [{ x: 2.6, z: 158, size: 13, amount: 1 }],
      dust: [{ x: 2.6, z: 160, amount: seg(k, 0.2, 0.4) }],
      cars: [{ color: "#3a7bd5", at: [2.6, 0.03 - drag * 7, mix(170, 159, drag)], yaw: Math.PI, crush: seg(k, 0.2, 0.3) * 0.4 }],
      actors: [{ look: LOOKS.survivor, anim: "lookup", at: [7, 4.3, 176], yaw: Math.PI, t, mood: "scared" }],
      shake: k > 0.18 ? 0.7 * (1 - seg(k, 0.6, 1) * 0.6) : 0.2,
      focus: [3, 0, 168],
    };
  },

  crowdClimb: ({ t, k }) => ({
    cam: { pos: mv([2, 15, 128], [1, 17, 122], k), look: [0, 6, 88], fov: 60 },
    evil: 0.85,
    fog: 0.5,
    siren: 1,
    actors: street(12, 112, 66, 120, "climb", t, k),
    clock: `00:${String(Math.max(0, Math.ceil(10 - k * 10))).padStart(2, "0")}`,
    focus: [0, 0, 90],
  }),

  timelapse: ({ t, k }) => {
    const pulse = k < 0.55 ? 0.5 - 0.5 * Math.cos(k * Math.PI * 2 * 3.3) : 0;
    const ang = 0.6 + k * 0.6;
    return {
      cam: { pos: [Math.sin(ang) * 230, 160, Math.cos(ang) * 230], look: [0, 0, 0], fov: 55 },
      evil: pulse,
      fog: pulse * 0.7,
      clock: k < 0.55 ? clockStr((k / 0.55) * 30 * 3.3 % 30) : undefined,
      focus: [0, 0, 0],
    };
  },

  brothersWalk: ({ t, k }) => {
    const z = mix(100, 93, k);
    return {
      cam: { pos: [-3.6, 3.3, z - 8], look: [-6.2, 2.8, z], fov: 48 },
      evil: 0,
      fog: 0,
      actors: [
        { look: H, anim: "walk", at: [-7.2, 0.3, z], yaw: Math.PI, t, mood: "smile" },
        { look: K, anim: "walk", at: [-5.6, 0.3, z + 0.3], yaw: Math.PI, t: t * 1.2 + 0.3, scale: KID_SCALE, mood: "happy" },
      ],
      focus: [-7, 0, z],
    };
  },

  sirenB: ({ t, k }) => ({
    cam: { pos: [-6.5, 2.4, 100], look: [7, 13, 120], fov: 52 },
    evil: ease(seg(k, 0, 0.6)),
    fog: ease(seg(k, 0.2, 1)) * 0.4,
    siren: 1,
    actors: [
      { look: H, anim: "lookup", at: [-7.8, 0.3, 103.5], yaw: 0.6, t, mood: "worried" },
      { look: K, anim: "lookup", at: [-6.2, 0.3, 103.8], yaw: 0.5, t, scale: KID_SCALE, mood: "scared" },
    ],
    focus: [0, 0, 110],
  }),

  brothersRun: ({ t, k }) => {
    const run = seg(k, 0, 0.35);
    const climb = seg(k, 0.35, 0.85);
    const onRoof = seg(k, 0.85, 1);
    const pos = (dx: number, delay: number): V3 => {
      const c = seg(k, 0.35 + delay, 0.85 + delay * 0.5);
      if (onRoof > 0 && delay === 0) return [mix(-8.6, -11, onRoof), SHOP_ROOF_Y, 75 + dx];
      if (c > 0) return [-8.6, 0.3 + c * (SHOP_ROOF_Y - 0.3), 75 + dx];
      return mv([-7 + dx, 0.3, 102], [-7.6, 0.3, 75 + dx], ease(run));
    };
    const hy = pos(0, 0);
    return {
      cam: { pos: [5, mix(5, 15, ease(climb)), 92], look: [-8.6, hy[1] + 2, 78], fov: 52 },
      evil: 1,
      fog: 0.7,
      siren: 1,
      actors: [
        { look: H, anim: climb > 0 && onRoof === 0 ? "climb" : onRoof > 0 ? "idle" : "run", at: hy, yaw: climb > 0 ? -Math.PI / 2 : Math.PI, t, mood: "scared" },
        { look: K, anim: seg(k, 0.4, 0.88) > 0 && seg(k, 0.4, 0.88) < 1 ? "climb" : run < 1 ? "run" : "climb", at: pos(1.6, 0.05), yaw: climb > 0 ? -Math.PI / 2 : Math.PI, t: t + 0.2, scale: KID_SCALE, mood: "scared" },
      ],
      focus: [-8, 0, 80],
    };
  },

  roofWait: ({ t, k }) => ({
    cam: { pos: mv([-25, 21.5, 72], [-24, 21, 73], k), look: [6, 8, 78], fov: 55 },
    evil: 1,
    fog: 0.9,
    actors: [
      { look: H, anim: "idle", at: [-12, SHOP_ROOF_Y, 74], yaw: Math.PI / 2, t, mood: "worried" },
      { look: K, anim: "idle", at: [-12, SHOP_ROOF_Y, 76.2], yaw: Math.PI / 2, t, scale: KID_SCALE, mood: "worried" },
    ],
    mounds: [{ x: 1, z: mix(130, 60, k), yaw: Math.PI, amount: 0.8 }],
    clock: k < 0.45 ? clockStr(seg(k, 0, 0.4) * 30) : clockStr(30 + seg(k, 0.45, 0.95) * 270),
    focus: [-5, 0, 78],
  }),

  hornScare: ({ t, k }) => {
    const honk = seg(k, 0.3, 0.4);
    const worm: WormState = {
      hole: [-1, 106],
      yaw: Math.PI,
      rise: 1 - ease(seg(k, 0.45, 0.85)),
      height: 30,
      bend: 0.45 - honk * 0.4,
      strike: 0.25 - honk * 0.25,
      mouth: k < 0.35 ? 0.8 : 1 - ease(seg(k, 0.35, 0.5)),
      t,
    };
    return {
      cam: { pos: [-11, 20, 71], look: [1.5, 8, 102], fov: 58 },
      evil: 1,
      fog: 0.7,
      worm,
      cracks: [{ x: -1, z: 106, size: 12, amount: 1 }],
      dust: [{ x: -1, z: 106, amount: seg(k, 0.45, 0.6), spread: 10 }],
      cars: [{ color: "#e8434f", at: [2.6, 0.03, 96], yaw: Math.PI, lights: k > 0.3 && k < 0.5 ? (Math.sin(t * 30) > 0 ? 3 : 1) : 1 }],
      actors: [
        { look: H, anim: "idle", at: [-12, SHOP_ROOF_Y, 74], yaw: 0.4, t, mood: "scared" },
        { look: K, anim: "idle", at: [-12.5, SHOP_ROOF_Y, 76], yaw: 0.6, t, scale: KID_SCALE, mood: "scared" },
      ],
      horn: honk > 0 && k < 0.5 ? 1 : 0,
      shake: k > 0.45 && k < 0.85 ? 0.4 : 0,
      focus: [0, 0, 96],
    };
  },

  heroIdea: ({ t, k }) => ({
    cam: { pos: mv([-7.6, 17, 76.8], [-8.6, 16.8, 76], ease(k)), look: [-12, 16.4, 75], fov: 50 },
    evil: 1,
    fog: 0.8,
    actors: [
      { look: H, anim: k > 0.55 ? "point" : "idle", at: [-12, SHOP_ROOF_Y, 74.6], yaw: Math.PI / 2 - 0.15, t, mood: k > 0.45 ? "smile" : "worried" },
      { look: K, anim: "idle", at: [-12.6, SHOP_ROOF_Y, 77.2], yaw: Math.PI / 2 + 0.4, t, scale: KID_SCALE, mood: "worried" },
    ],
    focus: [-12, 14, 75],
  }),

  clockTower: ({ t, k }) => ({
    cam: { pos: mv([-6, 18, 30], [-12, 22, 14], ease(k)), look: [TX, 30, TZ], fov: 50 },
    evil: 1,
    fog: 0.6,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    focus: [TX, 0, TZ],
  }),

  bellVision: ({ t, k }) => ({
    cam: { pos: mv([-4, 52, 22], [40, 88, 90], ease(k)), look: [TX, 30, TZ], fov: 55 },
    evil: 0.15,
    fog: 0,
    tower: { bellSwing: t * 0.8, gearIn: 1, lever: 1, glow: 1 },
    wave: seg(k, 0.05, 1) * 1.1,
    focus: [TX, 0, TZ],
  }),

  roofJump: ({ t, k }) => {
    // two stand-in rooftops set up over the plaza for this shot (see RoofSet)
    const A: V3 = [-4, 16, 18];
    const B: V3 = [-18, 18, 4];
    const path = (dx: number, delay: number): V3 => {
      const kk = seg(k, delay, 0.85 + delay);
      const run = seg(kk, 0, 0.45);
      const jump = seg(kk, 0.45, 0.8);
      const land = seg(kk, 0.8, 1);
      const p0: V3 = [4 + dx, A[1], 24 + dx];
      const edgeA: V3 = [-9 + dx, A[1], 12 + dx];
      const edgeB: V3 = [-13 + dx, B[1], 9 + dx];
      const p3: V3 = [-20 + dx, B[1], 2 + dx];
      if (land > 0) return mv(edgeB, p3, land);
      if (jump > 0) {
        const p = mv(edgeA, edgeB, jump);
        p[1] += Math.sin(jump * Math.PI) * 4;
        return p;
      }
      return mv(p0, edgeA, run);
    };
    const kidK = seg(k, 0.1, 0.95);
    const anim = (kk: number): Anim => (kk > 0.45 && kk < 0.8 ? "jump" : "run");
    return {
      cam: { pos: mv([12, 21, 34], [4, 22, 26], k), look: [-16, 20, 0], fov: 58 },
      evil: 1,
      fog: 0.6,
      roofSet: true,
      actors: [
        { look: H, anim: anim(seg(k, 0, 0.85)), at: path(0, 0), yaw: yawTo([4, 0, 24], [-20, 0, 2]), t, mood: "scared" },
        { look: K, anim: anim(kidK), at: path(1.4, 0.1), yaw: yawTo([4, 0, 24], [-20, 0, 2]), t: t + 0.2, scale: KID_SCALE, mood: "scared" },
      ],
      tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
      focus: [-10, 10, 10],
    };
  },

  towerTop: ({ t, k }) => ({
    cam: { pos: mv([TX + 0.5, BELFRY_Y + 3.2, TZ + 11], [TX + 0.8, BELFRY_Y + 3, TZ + 9.5], k), look: [TX + 1, BELFRY_Y + 1.6, TZ - 1], fov: 50 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: [
      { look: H, anim: k > 0.4 ? "point" : "idle", at: [TX + 0.8, BELFRY_Y, TZ + 0.2], yaw: yawTo([TX + 0.8, 0, TZ + 0.2], GEAR), t, mood: "worried" },
      { look: K, anim: "idle", at: [TX - 1.6, BELFRY_Y, TZ + 1.2], yaw: yawTo([TX - 1.6, 0, TZ + 1.2], GEAR), t, scale: KID_SCALE, mood: "worried" },
    ],
    focus: [TX, BELFRY_Y, TZ],
  }),

  repair: ({ t, k }) => ({
    cam: { pos: mv([TX + 3.4, BELFRY_Y + 3, TZ + 10.5], [TX + 3.2, BELFRY_Y + 2.8, TZ + 9.5], k), look: [TX + 2.2, BELFRY_Y + 1.8, TZ - 3], fov: 40 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: 0.15, lever: 0, glow: 0 },
    actors: [{ look: H, anim: "work", at: [TX + 2.2, BELFRY_Y, TZ - 4.0], yaw: 0, t, mood: "worried" }],
    focus: [TX, BELFRY_Y, TZ],
  }),

  groundShake: ({ t, k }) => ({
    cam: { pos: [26, 5, 4], look: [TX, 24, TZ], fov: 60 },
    evil: 1,
    fog: 0.6,
    tower: { bellSwing: 0, gearIn: 0.15, lever: 0, glow: 0 },
    mounds: [{ x: mix(22, -12, k), z: mix(-12, -20, k), yaw: -Math.PI / 2, amount: 1 }],
    cracks: [{ x: -16, z: -21, size: 10, amount: easeOut(seg(k, 0.7, 0.95)) }],
    dust: [{ x: mix(22, -12, k), z: mix(-12, -20, k), amount: 0.9, spread: 8 }],
    shake: 0.5 + k * 0.6,
    focus: [-10, 0, -10],
  }),

  bucketBang: ({ t, k }) => ({
    cam: { pos: [TX - 0.5, BELFRY_Y + 2.8, TZ + 10.5], look: [TX - 2.6, BELFRY_Y + 1.6, TZ + 2.6], fov: 46 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: 0.15, lever: 0, glow: 0 },
    actors: [
      { look: K, anim: k < 0.3 ? "idle" : "bang", at: [TX - 2.8, BELFRY_Y, TZ + 3.2], yaw: 0.3, t, scale: KID_SCALE, mood: "worried", holding: "bucket" },
      { look: H, anim: "work", at: [TX + 2.2, BELFRY_Y, TZ - 4.0], yaw: 0, t, mood: "worried" },
    ],
    shake: 0.25,
    focus: [TX, BELFRY_Y, TZ],
  }),

  kidShout: ({ t }) => ({
    cam: { pos: [TX - 1.6, BELFRY_Y + 1.9, TZ + 8.6], look: [TX - 2.8, BELFRY_Y + 1.8, TZ + 3.2], fov: 30 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: 0.15, lever: 0, glow: 0 },
    actors: [{ look: K, anim: "shout", at: [TX - 2.8, BELFRY_Y, TZ + 3.2], yaw: 0.25, t, scale: KID_SCALE, mood: "shout", holding: "bucket" }],
    shake: 0.15,
    focus: [TX, BELFRY_Y, TZ],
  }),

  wormTurn: ({ t, k }) => {
    const worm: WormState = { hole: [-6, -4], yaw: -2.4, rise: 1, height: 44, bend: 0.25, strike: 0, mouth: ease(seg(k, 0.2, 0.9)), t, turn: mix(0.9, 0, ease(k)) };
    return {
      cam: { pos: [TX - 8, BELFRY_Y + 2, TZ + 9], look: [-8, 38, -6], fov: 60 },
      evil: 1,
      fog: 0.5,
      worm,
      cracks: [{ x: -6, z: -4, size: 12, amount: 1 }],
      tower: { bellSwing: 0, gearIn: 0.15, lever: 0, glow: 0 },
      actors: [{ look: K, anim: "shout", at: [TX - 2.8, BELFRY_Y, TZ + 3.2], yaw: Math.PI / 4, t, scale: KID_SCALE, mood: "scared", holding: "bucket" }],
      shake: 0.3,
      focus: [-15, 0, -15],
    };
  },

  gearInsert: ({ t, k }) => ({
    cam: { pos: [TX + 3, BELFRY_Y + 2.4, TZ + 7.5], look: [GEAR[0] - 0.6, GEAR[1] + 0.2, GEAR[2]], fov: 30 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: ease(seg(k, 0.1, 0.8)), lever: 0, glow: 0 },
    actors: [{ look: H, anim: "work", at: [TX + 2.2, BELFRY_Y, TZ - 4.0], yaw: 0, t, mood: "worried" }],
    shake: 0.2,
    focus: [TX, BELFRY_Y, TZ],
  }),

  lever: ({ t, k }) => ({
    cam: { pos: [TX - 1.2, BELFRY_Y + 2.8, TZ + 10], look: [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.8], fov: 44 },
    evil: 1,
    fog: 0.5,
    tower: { bellSwing: 0, gearIn: 1, lever: ease(seg(k, 0.2, 0.7)), glow: 0 },
    actors: [{ look: H, anim: "lever", at: [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], yaw: 0, t: seg(k, 0.15, 0.7) * 0.6, mood: "shout" }],
    flash: k > 0.7 ? 0.4 * (1 - seg(k, 0.7, 1)) : 0,
    focus: [TX, BELFRY_Y, TZ],
  }),

  bellRing: ({ t, k }) => ({
    cam: { pos: mv([-8, 38, -6], [4, 44, 8], ease(k)), look: [TX, BELFRY_Y + 5, TZ], fov: 52 },
    evil: 1 - seg(k, 0.5, 1) * 0.3,
    fog: 0.5,
    tower: { bellSwing: t * 0.9, gearIn: 1, lever: 1, glow: 1 },
    wave: seg(k, 0, 1) * 0.9,
    flash: k < 0.12 ? 0.6 * (1 - k / 0.12) : 0,
    shake: 0.35,
    focus: [TX, BELFRY_Y, TZ],
  }),

  wormFlee: ({ t, k }) => {
    const worm: WormState = {
      hole: [-6, -4],
      yaw: -2.4,
      rise: 1 - ease(seg(k, 0.35, 0.9)),
      height: 44,
      bend: 0.25 - seg(k, 0, 0.3) * 0.25,
      strike: 0,
      mouth: 1,
      t: t * 3,
    };
    return {
      cam: { pos: [22, 9, 26], look: [-6, mix(30, 8, ease(seg(k, 0.35, 0.9))), -4], fov: 58 },
      evil: 0.7,
      fog: 0.45,
      worm,
      cracks: [{ x: -6, z: -4, size: 12, amount: 1 }],
      dust: [{ x: -6, z: -4, amount: seg(k, 0.4, 0.6) }],
      tower: { bellSwing: t * 0.9, gearIn: 1, lever: 1, glow: 0.6 },
      wave: 0.5 + seg(k, 0, 1) * 0.5,
      shake: 0.8 * (1 - seg(k, 0.6, 1)),
      focus: [-6, 0, -4],
    };
  },

  fogClear: ({ t, k }) => ({
    cam: { pos: mv([-6, 40, 40], [10, 75, 110], ease(k)), look: [TX, 20, TZ], fov: 55 },
    evil: 0.6 * (1 - ease(k)),
    fog: 0.4 * (1 - ease(k)),
    cracks: [{ x: -6, z: -4, size: 12, amount: 1 }],
    tower: { bellSwing: t * 0.6, gearIn: 1, lever: 1, glow: 0.4 * (1 - k) },
    focus: [TX, 0, TZ],
  }),

  celebrate: ({ t, k }) => {
    const stop = k > 0.55;
    return {
      cam: { pos: [TX + 2, BELFRY_Y + 6.2, TZ + 13], look: [TX, BELFRY_Y + 1.4, TZ + 1], fov: 38 },
      evil: 0,
      fog: 0,
      dusk: 0.35 * k,
      tower: { bellSwing: 0, gearIn: 1, lever: 1, glow: 0 },
      actors: [
        { look: H, anim: stop ? "idle" : "cheer", at: [TX + 0.9, BELFRY_Y, TZ + 1.6], yaw: stop ? -2.4 : 0.1, t, mood: stop ? "worried" : "happy" },
        { look: K, anim: "cheer", at: [TX - 1.3, BELFRY_Y, TZ + 2], yaw: 0.2, t: t + 0.3, scale: KID_SCALE, mood: "happy" },
      ],
      focus: [TX, BELFRY_Y, TZ],
    };
  },

  horizon: ({ t, k }) => {
    const r = mix(330, 270, k);
    const mounds = [-0.13, 0, 0.13].map((da, i) => {
      const a = -2.35 + da;
      const rr = r + [40, 0, 70][i];
      return { x: TX + Math.sin(a) * rr, z: TZ + Math.cos(a) * rr, yaw: a + Math.PI, amount: 1, scale: 6 };
    });
    return {
      cam: { pos: mv([TX - 6.5, BELFRY_Y + 5, TZ - 6.5], [TX - 8, BELFRY_Y + 7, TZ - 8], ease(k)), look: mv([TX - 200, 8, TZ - 200], [TX - 230, 12, TZ - 230], k), fov: mix(52, 38, ease(k)) },
      evil: 0.18,
      fog: 0,
      dusk: 0.6,
      mounds,
      dust: mounds.map((m) => ({ x: m.x, z: m.z, amount: 1, spread: 60, color: "#9fbf72" })),
      shake: 0.06,
      focus: [TX - 100, 0, TZ - 100],
    };
  },
};

// ── schedule: [scene id, [shot, first word index]] ────────────────────────────
