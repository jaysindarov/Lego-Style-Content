/**
 * Never Answer Your Shadow — shots.
 *
 * A giant lamp on the clock tower spire makes the evening shadows wake up:
 * they lie flat behind people (`shadow` avatars tipped back with `tip`), rise,
 * whisper, and drag anyone who answers into the ground. No light, no shadows:
 * switching the lamp OFF makes them melt (`melt`) and vanish.
 *
 * Places: plaza (fountain at the origin), main street (x = 0, z > 41), the
 * clock tower belfry (lever on its +z side), and the brothers' house on the
 * suburb road (porch lamp over the door at LOT).
 */
import { LOOKS, townLook, type Anim, type Look, type Mood } from "../../../src/world/Avatar";
import { type MysteryHouseState } from "../../../src/world/MysteryHouse";
import { SUBURB_Z, TOWER, TOWER_H } from "../../../src/world/layout";
import { clockStr, ease, easeOut, mix, mv, seg, yawTo, type ActorSpec, type Frame, type Shot, type V3 } from "../../../src/engine/kit";

const H = LOOKS.hero;
const K = LOOKS.kid;
const KS = 0.42;
const GIRL = LOOKS.girl;
const MAN = LOOKS.survivor;
const DAD: Look = { skin: "#c98e64", hair: "#1b1b1b", hairStyle: "short", top: "#3a6fb0", shirt: "#ffffff", topKind: "jacket", pants: "#2a2a33", shoes: "#2a2a2a" };

const [TX, , TZ] = TOWER;
const BELFRY_Y = TOWER_H - 14 + 0.7;
const LEVER: V3 = [TX - 2.8, BELFRY_Y, TZ + 2.6];
const LAMP: V3 = [TX, TOWER_H + 3.8, TZ];
const LAMP_GROUND: V3 = [TX, 0, TZ];
const RZ = SUBURB_Z;
const LOT: [number, number] = [25, -134];
const PORCH: V3 = [25, 6.5, -140.6];
const home = (p: Partial<MysteryHouseState> = {}): MysteryHouseState => ({ at: LOT, appear: 1, door: 0, glow: 0.7, number: "7", ...p });
const porch = (i = 1.6) => ({ pos: PORCH, aim: [25, 0, -145] as V3, intensity: i, angle: 0.75 });
const DARKEN = "#1a0f2a";

// ── moods of the light ─────────────────────────────────────────────────────────
const SUNSET = { evil: 0.12, fog: 0, dusk: 1, palette: "violet" as const, towerLamp: 0 };
const LIT = { evil: 0.8, fog: 0.18, dusk: 0.7, palette: "violet" as const, towerLamp: 1, cast: { from: LAMP_GROUND, len: 2.4, opacity: 0.55 } };
const NIGHT = { evil: 1, fog: 0.08, dark: 0.7, palette: "night" as const, towerLamp: 0 };

/** A person's living shadow: anchored at their feet, lying flat behind them (rise 0) or standing at their back (rise 1). */
const shade = (owner: { at: V3; yaw: number; scale?: number }, rise: number, o: Partial<ActorSpec> = {}): ActorSpec => {
  const r = ease(rise);
  const back = r * 1.7 * ((owner.scale ?? 0.62) / 0.62);
  const at: V3 = [owner.at[0] - Math.sin(owner.yaw) * back, owner.at[1] + 0.02, owner.at[2] - Math.cos(owner.yaw) * back];
  return { look: H, anim: "idle", at, yaw: owner.yaw, t: 0, shadow: true, tip: -(1 - r) * Math.PI / 2, scale: owner.scale, ...o };
};

// plaza crowd
const CROWD = Array.from({ length: 14 }, (_, i) => {
  const a = i * 2.399 + 0.4;
  const r = 13 + (i % 5) * 4;
  return { look: townLook(i + 11), at: [Math.cos(a) * r, 0.06, Math.sin(a) * r] as V3, yaw: a + Math.PI * 0.5 };
});
const crowd = (t: number, mood: Mood = "smile", anim: Anim = "idle") => CROWD.map((c, i) => ({ look: c.look, anim, at: c.at, yaw: c.yaw, t: t + i, mood }));
const crowdShades = (rise: number, melt = 0) => CROWD.map((c, i) => shade(c, Math.min(1, rise * (1 + (i % 4) * 0.12)), { melt, t: i }));

// main street townsfolk staring at their shoes
const STREET = Array.from({ length: 10 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  return { look: townLook(i + 40), at: [side * (6.2 + (i % 3) * 0.8), 0.3, 120 - i * 4.5] as V3, yaw: side > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5 };
});
const streetFolk = (t: number, mood: Mood = "worried") => STREET.map((p, i) => ({ look: p.look, anim: "work" as Anim, at: p.at, yaw: p.yaw, t: t * 0.15 + i, mood }));
const streetShades = (rise: number, melt = 0, hidden = false) => STREET.map((p, i) => shade(p, rise, { melt, hidden, t: i }));

// girl in the plaza
const GIRL_FROM: V3 = [-14, 0.06, 20];
const GIRL_AT: V3 = [-4, 0.06, 22];
// survivor on main street
const MAN_AT: V3 = [-6.4, 0.3, 112];
const MAN_YAW = Math.PI;
// the brothers on main street
const BZ = 89;
const BRO_H: V3 = [-1.2, 0.03, BZ + 3];
const BRO_K: V3 = [1.0, 0.03, BZ + 3.4];
// the opening: a boy on main street at sunset
const ME: V3 = [0.8, 0.03, 96];

// tower wall climbers (+z face of the tower shaft)
const CLIMB = [-3, -1, 1, 3].map((dx, i) => ({ x: TX + dx, start: i * 0.08, top: 18 + (i % 2) * 5 }));

export const SHOTS: Record<string, Shot> = {
  // ── s01 the rule ──
  sunsetTown: ({ t, k }) => ({
    cam: { pos: mv([110, 120, 170], [50, 55, 95], ease(k)), look: mv([0, 0, 30], [-10, 6, 0], k), fov: 55 },
    ...SUNSET,
    actors: crowd(t, "smile", "walk").map((a, i) => ({ ...a, anim: (i % 3 ? "walk" : "idle") as Anim })),
    focus: [0, 0, 20],
  }),

  longShadows: ({ t, k }) => ({
    cam: { pos: mv([2.4, 3.2, 83], [2.2, 3, 85], k), look: [0.6, 1.2, 97], fov: 46 },
    ...SUNSET,
    evil: 0.25,
    actors: [
      { look: H, anim: "walk", at: mv([ME[0], ME[1], ME[2] + 3], ME, k), yaw: Math.PI, t, mood: "smile" },
      { look: K, anim: "walk", at: mv([ME[0] + 2, ME[1], ME[2] + 3.6], [ME[0] + 2, ME[1], ME[2] + 0.6], k), yaw: Math.PI, t: t + 0.3, scale: KS, mood: "happy" },
    ],
    cast: { dir: 0, len: mix(1.6, 4.4, ease(k)), opacity: 0.75 },
    focus: [0, 0, 96],
  }),

  shadowWhisper: ({ t, k }) => {
    const owner = { at: ME, yaw: Math.PI };
    return {
      cam: { pos: mv([5.2, 4.6, 91.5], [4.8, 4.2, 92.4], k), look: [0.8, 0.4, 98.4], fov: 44 },
      ...LIT,
      evil: mix(0.4, 0.8, k),
      cast: undefined,
      actors: [
        { look: H, anim: "idle", at: owner.at, yaw: owner.yaw, t, mood: "worried" },
        shade(owner, 0, { tip: -Math.PI / 2 + 0.1 + ease(seg(k, 0.3, 1)) * 0.4, t }),
      ],
      focus: ME,
    };
  },

  shadowFace: ({ t, k }) => {
    const owner = { at: ME, yaw: Math.PI };
    return {
      cam: { pos: mv([3.4, 3.1, 91.6], [3.1, 3.1, 92.2], k), look: [0.9, 3, 97.6], fov: 36 },
      ...LIT,
      cast: undefined,
      actors: [{ look: H, anim: "idle", at: owner.at, yaw: owner.yaw, t, mood: "scared" }, shade(owner, 1, { anim: "idle", t, scale: 0.72 })],
      shake: 0.05,
      focus: ME,
    };
  },

  dragDown: ({ t, k }) => {
    const base: V3 = [-6.4, 0.3, 104];
    const at: V3 = [base[0], base[1] - ease(seg(k, 0.3, 1)) * 5, base[2]];
    return {
      cam: { pos: [-0.8, 3.8, 95.5], look: [-6.2, 1.2, 104], fov: 44 },
      ...LIT,
      cast: undefined,
      actors: [
        { look: townLook(7), anim: k < 0.25 ? "shout" : "grabbed", at, yaw: Math.PI - 0.5, t, mood: k < 0.25 ? "shout" : "scared" },
        shade({ at: base, yaw: Math.PI - 0.5 }, 0.35 - ease(seg(k, 0.25, 0.6)) * 0.35, { anim: "grabbed", t, melt: ease(seg(k, 0.6, 1)) }),
      ],
      dust: k > 0.3 ? [{ x: base[0], z: base[2], amount: 1 - seg(k, 0.6, 1) * 0.5, spread: 4, color: DARKEN }] : [],
      shake: k > 0.3 ? 0.5 : 0,
      focus: base,
    };
  },

  // ── s02 the origin ──
  lampOn: ({ t, k }) => {
    const on = k < 0.35 ? 0 : k < 0.45 ? (Math.sin(t * 60) > 0 ? 1 : 0.1) : 1;
    return {
      cam: { pos: mv([TX + 34, 26, TZ + 44], [TX + 28, 30, TZ + 38], ease(k)), look: [TX, TOWER_H + 1, TZ], fov: 44 },
      ...SUNSET,
      evil: mix(0.15, 0.6, seg(k, 0.4, 1)),
      towerLamp: on,
      flash: k > 0.45 && k < 0.5 ? 0.25 : 0,
      focus: [TX, 20, TZ],
    };
  },

  plazaRise: ({ t, k }) => ({
    cam: { pos: mv([40, 15, 46], [34, 11, 40], k), look: [0, 2, 0], fov: 54 },
    ...LIT,
    actors: [...crowd(t, k < 0.3 ? "smile" : "worried"), ...crowdShades(seg(k, 0.15, 0.9))],
    focus: [0, 0, 0],
  }),

  threeAnswer: ({ t, k }) => {
    const three = [0, 1, 2].map((i) => ({ at: [6 + i * 3.4, 0.06, 12 - i * 1.5] as V3, yaw: -0.3 + i * 0.15 }));
    const sink = ease(seg(k, 0.45, 1)) * 5;
    return {
      cam: { pos: [16, 3.4, 26], look: [9, 1.6, 11], fov: 40 },
      ...LIT,
      actors: three.flatMap((p, i) => [
        { look: townLook(80 + i), anim: (k < 0.4 ? "shout" : "grabbed") as Anim, at: [p.at[0], 0.06 - sink, p.at[2]] as V3, yaw: p.yaw + Math.PI, t: t + i, mood: (k < 0.4 ? "shout" : "scared") as Mood },
        shade({ at: p.at, yaw: p.yaw + Math.PI }, k < 0.45 ? 1 : 1 - ease(seg(k, 0.45, 0.8)), { anim: "grabbed", t: t + i, melt: ease(seg(k, 0.7, 1)) }),
      ]),
      dust: k > 0.45 ? [{ x: 9.4, z: 10.5, amount: 1 - seg(k, 0.7, 1) * 0.6, spread: 8, color: DARKEN }] : [],
      shake: k > 0.45 ? 0.4 : 0,
      focus: [9, 0, 10],
    };
  },

  gone: ({ t, k }) => ({
    cam: { pos: mv([16, 6, 30], [14, 5, 27], k), look: [9, 0.4, 10], fov: 46 },
    evil: 0,
    fog: 0,
    palette: "violet",
    towerLamp: 0,
    actors: [
      ...[0, 1, 2].map((i) => shade({ at: [6 + i * 3.4, 0.06, 12 - i * 1.5] as V3, yaw: i }, 0, { melt: 1 })),
      ...CROWD.slice(0, 7).map((c, i) => ({ look: c.look, anim: "idle" as Anim, at: [c.at[0] * 0.6 + 14, 0.06, c.at[2] * 0.4 + 18] as V3, yaw: yawTo([c.at[0] * 0.6 + 14, 0, c.at[2] * 0.4 + 18], [9, 0, 10]), t: t + i, mood: "worried" as Mood })),
    ],
    focus: [9, 0, 10],
  }),

  // ── s03 every evening ──
  lampSunset: ({ t, k }) => ({
    cam: { pos: [0.5, 2.6, 160], look: [-8, 22, 30], fov: 50 },
    ...SUNSET,
    towerLamp: k > 0.35 ? 1 : 0,
    evil: k > 0.35 ? mix(0.3, 0.7, seg(k, 0.35, 1)) : 0.12,
    actors: streetFolk(t, k > 0.4 ? "worried" : "smile").map((a, i) => ({ ...a, at: [a.at[0], a.at[1], a.at[2] + 30] as V3, anim: (k > 0.45 ? "work" : "walk") as Anim })),
    focus: [0, 0, 140],
  }),

  townSilent: ({ t, k }) => ({
    cam: { pos: mv([0, 3.4, 130], [0, 3, 126], k), look: [0, 0.8, 100], fov: 50 },
    ...LIT,
    cast: undefined,
    actors: [...streetFolk(t), ...streetShades(0.06)],
    focus: [0, 0, 105],
  }),

  countdown: ({ t, k }) => {
    const p = STREET[2];
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    return {
      cam: { pos: [p.at[0] + fx * 6, 3, p.at[2] + fz * 6], look: [p.at[0] - fx * 0.8, 2.4, p.at[2] - fz * 0.8], fov: 38 },
      ...LIT,
      cast: undefined,
      actors: [{ look: p.look, anim: "work", at: p.at, yaw: p.yaw, t: 0.2, mood: "worried" }, shade(p, 1, { anim: "idle", t, roll: 0.12 })],
      clock: clockStr(60 - k * 3),
      focus: p.at,
    };
  },

  lampClick: ({ t, k }) => {
    const off = k > 0.3;
    return {
      cam: { pos: mv([0, 9, 140], [0, 11, 146], k), look: [0, 0, 100], fov: 52 },
      ...(off ? { ...NIGHT, dark: 0.45 * seg(k, 0.3, 0.6) } : LIT),
      cast: undefined,
      actors: [...streetFolk(t, off ? "smile" : "worried"), ...streetShades(0.1, ease(seg(k, 0.32, 0.75)), k > 0.8)],
      dust: off ? STREET.slice(0, 5).map((p) => ({ x: p.at[0], z: p.at[2] - 1.5, amount: 1 - seg(k, 0.4, 1), spread: 2, color: DARKEN })) : [],
      focus: [0, 0, 105],
    };
  },

  // ── s04 the girl ──
  girlWalk: ({ t, k }) => {
    const at = mv(GIRL_FROM, GIRL_AT, k);
    const yaw = yawTo(GIRL_FROM, GIRL_AT);
    return {
      cam: { pos: mv([-14, 4, 33], [-6, 3.6, 34], k), look: mv([-12, 1.4, 20], [-4, 1.4, 22], k), fov: 44 },
      ...LIT,
      cast: undefined,
      actors: [{ look: GIRL, anim: "walk", at, yaw, t, mood: "smile" }, shade({ at, yaw }, 0)],
      focus: GIRL_AT,
    };
  },

  girlHears: ({ t, k }) => {
    const yaw = yawTo(GIRL_FROM, GIRL_AT);
    return {
      cam: { pos: mv([GIRL_AT[0] + 6, 3.2, GIRL_AT[2] + 2.8], [GIRL_AT[0] + 5.4, 3, GIRL_AT[2] + 2.4], k), look: [GIRL_AT[0] - 0.8, 2, GIRL_AT[2]], fov: 40 },
      ...LIT,
      cast: undefined,
      actors: [{ look: GIRL, anim: "idle", at: GIRL_AT, yaw, t, mood: "worried" }, shade({ at: GIRL_AT, yaw }, 0.25 + ease(k) * 0.4, { look: GIRL, t })],
      focus: GIRL_AT,
    };
  },

  girlTurns: ({ t, k }) => {
    const yaw0 = yawTo(GIRL_FROM, GIRL_AT);
    const yaw = yaw0 + Math.PI * ease(seg(k, 0, 0.4));
    return {
      cam: { pos: [GIRL_AT[0] + 1.5, 3.2, GIRL_AT[2] + 9], look: [GIRL_AT[0] - 0.8, 2, GIRL_AT[2]], fov: 40 },
      ...LIT,
      cast: undefined,
      actors: [{ look: GIRL, anim: k > 0.45 ? "shout" : "idle", at: GIRL_AT, yaw, t, mood: k > 0.45 ? "shout" : "worried" }, shade({ at: GIRL_AT, yaw: yaw0 }, 0.75, { look: GIRL, t })],
      focus: GIRL_AT,
    };
  },

  girlGrabbed: ({ t, k }) => {
    const yaw0 = yawTo(GIRL_FROM, GIRL_AT);
    const sink = ease(seg(k, 0.35, 1)) * 2.2;
    return {
      cam: { pos: [GIRL_AT[0] + 7, 4.6, GIRL_AT[2] + 7.5], look: [GIRL_AT[0] - 0.5, 1.2, GIRL_AT[2]], fov: 42 },
      ...LIT,
      cast: undefined,
      actors: [
        { look: GIRL, anim: "grabbed", at: [GIRL_AT[0], 0.06 - sink, GIRL_AT[2]], yaw: yaw0 + Math.PI, t, mood: "scared" },
        shade({ at: GIRL_AT, yaw: yaw0 }, 0.75 - ease(seg(k, 0, 0.3)) * 0.5, { anim: "grabbed", t }),
      ],
      dust: [{ x: GIRL_AT[0], z: GIRL_AT[2], amount: seg(k, 0.3, 0.5), spread: 4, color: DARKEN }],
      shake: 0.6,
      flash: k < 0.08 ? 0.3 : 0,
      focus: GIRL_AT,
    };
  },

  girlGone: ({ t, k }) => ({
    cam: { pos: mv([GIRL_AT[0] + 9, 7, GIRL_AT[2] + 10], [GIRL_AT[0] + 7, 8, GIRL_AT[2] + 8], k), look: [GIRL_AT[0], 0, GIRL_AT[2]], fov: 44 },
    ...LIT,
    cast: undefined,
    actors: [
      { look: GIRL, anim: "grabbed", at: [GIRL_AT[0], -2.2 - ease(seg(k, 0, 0.5)) * 4, GIRL_AT[2]], yaw: 0, t, mood: "scared" },
      shade({ at: GIRL_AT, yaw: 0 }, 0, { melt: ease(seg(k, 0.2, 0.8)) }),
    ],
    dust: [{ x: GIRL_AT[0], z: GIRL_AT[2], amount: 1 - seg(k, 0.4, 1), spread: 5, color: DARKEN }],
    shake: 0.3 * (1 - k),
    focus: GIRL_AT,
  }),

  // ── s05 the survivor ──
  manStreet: ({ t, k }) => ({
    cam: { pos: mv([1.5, 3, MAN_AT[2] - 13], [1, 2.8, MAN_AT[2] - 10], k), look: [MAN_AT[0], 1.6, MAN_AT[2]], fov: 42 },
    ...LIT,
    cast: undefined,
    actors: [{ look: MAN, anim: "work", at: MAN_AT, yaw: MAN_YAW, t: 0.2, mood: "worried" }, shade({ at: MAN_AT, yaw: MAN_YAW }, 0.3 + ease(k) * 0.6, { look: MAN, t })],
    focus: MAN_AT,
  }),

  manWhisper: ({ t, k }) => {
    const sh = shade({ at: MAN_AT, yaw: MAN_YAW }, 1, { look: MAN, anim: "idle", t, roll: 0.2 });
    sh.at = [sh.at[0] + 0.7, sh.at[1], sh.at[2] - 0.6];
    return {
      cam: { pos: mv([MAN_AT[0] + 2.8, 3.2, MAN_AT[2] - 5.6], [MAN_AT[0] + 2.4, 3.1, MAN_AT[2] - 5], k), look: [MAN_AT[0] + 0.2, 2.8, MAN_AT[2] + 0.6], fov: 36 },
      ...LIT,
      cast: undefined,
      actors: [{ look: MAN, anim: "work", at: MAN_AT, yaw: MAN_YAW, t: 0.2, mood: "scared" }, sh],
      focus: MAN_AT,
    };
  },

  manShut: ({ t, k }) => ({
    cam: { pos: [MAN_AT[0] + 0.9, 3.2, MAN_AT[2] - 4.6], look: [MAN_AT[0], 2.8, MAN_AT[2]], fov: 30 },
    ...LIT,
    cast: undefined,
    actors: [{ look: MAN, anim: "work", at: MAN_AT, yaw: MAN_YAW, t: 0.2, mood: "worried" }, shade({ at: MAN_AT, yaw: MAN_YAW }, 1, { look: MAN, t, roll: 0.18 })],
    clock: clockStr(mix(20, 1, k)),
    shake: 0.04,
    focus: MAN_AT,
  }),

  manSafe: ({ t, k }) => {
    const off = k > 0.2;
    return {
      cam: { pos: mv([MAN_AT[0] + 6, 3.4, MAN_AT[2] - 7], [MAN_AT[0] + 7, 3.8, MAN_AT[2] - 8], k), look: [MAN_AT[0], 1.2, MAN_AT[2] + 1], fov: 40 },
      ...(off ? { ...NIGHT, dark: 0.45 } : LIT),
      cast: undefined,
      actors: [
        { look: MAN, anim: k > 0.6 ? "idle" : "work", at: MAN_AT, yaw: MAN_YAW, t, mood: k > 0.6 ? "happy" : "worried" },
        shade({ at: MAN_AT, yaw: MAN_YAW }, off ? 1 - ease(seg(k, 0.2, 0.5)) : 1, { look: MAN, t, melt: ease(seg(k, 0.35, 0.8)), hidden: k > 0.9 }),
      ],
      dust: off ? [{ x: MAN_AT[0], z: MAN_AT[2] + 1.4, amount: 1 - seg(k, 0.5, 1), spread: 2, color: DARKEN }] : [],
      focus: MAN_AT,
    };
  },

  // ── s06 yesterday ──
  brothersWalk: ({ t, k }) => ({
    cam: { pos: mv([2, 3.4, BZ - 11], [1.4, 3.2, BZ - 9], k), look: [0, 1.6, BZ + 2], fov: 44 },
    ...SUNSET,
    actors: [
      { look: H, anim: "walk", at: mv(BRO_H, [BRO_H[0], BRO_H[1], BRO_H[2] - 3], k), yaw: Math.PI, t, mood: "happy" },
      { look: K, anim: "walk", at: mv(BRO_K, [BRO_K[0], BRO_K[1], BRO_K[2] - 3], k), yaw: Math.PI, t: t + 0.3, scale: KS, mood: "happy" },
    ],
    focus: [0, 0, BZ],
  }),

  lampOnB: ({ t, k }) => ({
    cam: { pos: [0.6, 2.6, BZ + 9], look: [-14, 18, -10], fov: 52 },
    ...SUNSET,
    towerLamp: k > 0.25 ? 1 : 0,
    evil: k > 0.25 ? mix(0.3, 0.8, seg(k, 0.25, 1)) : 0.12,
    flash: k > 0.25 && k < 0.3 ? 0.2 : 0,
    actors: [
      { look: H, anim: "lookup", at: [BRO_H[0], BRO_H[1], BZ], yaw: Math.PI + 0.3, t, mood: k > 0.3 ? "scared" : "smile" },
      { look: K, anim: "lookup", at: [BRO_K[0], BRO_K[1], BZ + 0.4], yaw: Math.PI + 0.2, t, scale: KS, mood: k > 0.3 ? "scared" : "smile" },
    ],
    focus: [0, 0, 60],
  }),

  stareShoes: ({ t, k }) => {
    const h = { at: [BRO_H[0], BRO_H[1], BZ] as V3, yaw: Math.PI };
    const kd = { at: [BRO_K[0], BRO_K[1], BZ + 0.4] as V3, yaw: Math.PI, scale: KS };
    return {
      cam: { pos: mv([-0.4, 3.2, BZ - 8.4], [-0.4, 3.1, BZ - 7.6], k), look: [-0.3, 1.2, BZ + 1.2], fov: 46 },
      ...LIT,
      cast: undefined,
      actors: [
        { look: H, anim: "work", at: h.at, yaw: h.yaw, t: 0.2, mood: "worried" },
        { look: K, anim: "work", at: kd.at, yaw: kd.yaw, t: 0.2, scale: KS, mood: "scared" },
        shade(h, 0.1 * ease(k), { t }),
        shade(kd, 0.1 * ease(k), { look: K, t }),
      ],
      focus: [0, 0, BZ],
    };
  },

  clockWait: ({ t, k }) => {
    const h = { at: [BRO_H[0], BRO_H[1], BZ] as V3, yaw: Math.PI };
    const kd = { at: [BRO_K[0], BRO_K[1], BZ + 0.4] as V3, yaw: Math.PI, scale: KS };
    return {
      cam: { pos: mv([5.5, 3.2, BZ - 6.5], [4.6, 3, BZ - 5.6], k), look: [0, 1.6, BZ + 1], fov: 44 },
      ...LIT,
      cast: undefined,
      actors: [
        { look: H, anim: "work", at: h.at, yaw: h.yaw, t: 0.2, mood: "scared" },
        { look: K, anim: "work", at: kd.at, yaw: kd.yaw, t: 0.2, scale: KS, mood: "scared" },
        shade(h, 0.2 + ease(k) * 0.8, { t, roll: 0.15 * ease(k) }),
        shade(kd, 0.2 + ease(k) * 0.8, { look: K, t, roll: -0.15 * ease(k) }),
      ],
      clock: clockStr(60 + ease(k) * 240),
      focus: [0, 0, BZ],
    };
  },

  lampStuck: ({ t, k }) => ({
    cam: { pos: mv([TX + 22, 34, TZ + 30], [TX + 18, 38, TZ + 26], k), look: LAMP, fov: 40 },
    ...LIT,
    evil: 1,
    fog: 0.35,
    shake: 0.08,
    focus: [TX, 20, TZ],
  }),

  // ── s07 the discovery ──
  flicker: ({ t, k }) => {
    const on = k > 0.25 && k < 0.75 ? (Math.sin(t * 38) > -0.2 ? 1 : 0) : 1;
    return {
      cam: { pos: [TX + 9, TOWER_H + 2, TZ + 12], look: LAMP, fov: 36 },
      ...LIT,
      towerLamp: on,
      focus: [TX, 30, TZ],
    };
  },

  shadowsBlink: ({ t, k }) => {
    const blink = k > 0.3 && k < 0.5;
    const h = { at: [BRO_H[0], BRO_H[1], BZ] as V3, yaw: Math.PI };
    return {
      cam: { pos: [0, 4.5, BZ - 14], look: [0, 1.4, BZ + 20], fov: 52 },
      ...LIT,
      towerLamp: blink ? 0 : 1,
      evil: blink ? 0.5 : 0.8,
      cast: undefined,
      actors: [
        ...streetFolk(t).map((a) => ({ ...a, at: [a.at[0], a.at[1], a.at[2] - 10] as V3 })),
        ...STREET.map((p, i) => shade({ at: [p.at[0], p.at[1], p.at[2] - 10] as V3, yaw: p.yaw }, 1, { t: t + i, hidden: blink })),
        { look: H, anim: "idle", at: h.at, yaw: 0, t, mood: blink ? "shout" : "worried" },
      ],
      flash: blink ? 0.06 : 0,
      focus: [0, 0, BZ + 10],
    };
  },

  realize: ({ t, k }) => ({
    cam: { pos: mv([BRO_H[0] + 0.6, 3.1, BZ + 6], [BRO_H[0] + 0.5, 3.1, BZ + 5.2], k), look: [BRO_H[0], 2.7, BZ], fov: 32 },
    ...LIT,
    cast: undefined,
    actors: [{ look: H, anim: "idle", at: [BRO_H[0], BRO_H[1], BZ], yaw: 0, t, mood: k > 0.25 ? "happy" : "shout" }],
    focus: [0, 0, BZ],
  }),

  towerLook: ({ t, k }) => ({
    cam: { pos: mv([1.5, 4, BZ + 9], [1.2, 5, BZ + 7], k), look: [-16, 20, -10], fov: 50 },
    ...LIT,
    cast: undefined,
    actors: [
      { look: H, anim: "point", at: [BRO_H[0], BRO_H[1], BZ], yaw: yawTo([BRO_H[0], 0, BZ], LAMP_GROUND), t, mood: "shout" },
      { look: K, anim: "lookup", at: [BRO_K[0], BRO_K[1], BZ + 0.4], yaw: yawTo([BRO_K[0], 0, BZ + 0.4], LAMP_GROUND), t, scale: KS, mood: "worried" },
    ],
    focus: [0, 0, 50],
  }),

  // ── s08 the tower ──
  runTower: ({ t, k }) => {
    const hAt = mv([6, 0.06, 30], [TX + 6, 0.06, TZ + 8], k);
    const kAt = mv([8, 0.06, 32], [TX + 8, 0.06, TZ + 9], k);
    const yaw = yawTo([6, 0, 30], [TX + 6, 0, TZ + 8]);
    return {
      cam: { pos: mv([30, 16, 46], [10, 14, 20], ease(k)), look: mv([6, 1, 28], [TX + 6, 2, TZ + 8], ease(k)), fov: 52 },
      ...LIT,
      actors: [
        { look: H, anim: "run", at: hAt, yaw, t, mood: "scared" },
        { look: K, anim: "run", at: kAt, yaw, t: t + 0.2, scale: KS, mood: "scared" },
        ...[0, 1, 2, 3].map((i) => ({ look: H, anim: "run" as Anim, at: [hAt[0] + 6 + i * 2, 0.06, hAt[2] + 8 + (i % 2) * 3] as V3, yaw, t: t + i * 0.3, shadow: true })),
      ],
      focus: hAt,
    };
  },

  climbTop: ({ t, k }) => ({
    cam: { pos: mv([TX + 0.5, BELFRY_Y + 3.2, TZ + 11], [TX + 0.8, BELFRY_Y + 3, TZ + 9.5], k), look: [TX - 1, BELFRY_Y + 1.6, TZ + 1], fov: 50 },
    ...LIT,
    cast: undefined,
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0.4 },
    actors: [
      { look: H, anim: k < 0.4 ? "climb" : "run", at: mv([TX + 1, BELFRY_Y - 2, TZ + 4.2], [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], ease(k)), yaw: 0, t, mood: "worried" },
      { look: K, anim: k < 0.5 ? "climb" : "idle", at: mv([TX + 2, BELFRY_Y - 2.6, TZ + 4.2], [TX + 1.6, BELFRY_Y, TZ + 2.4], ease(seg(k, 0.1, 1))), yaw: 0, t, scale: KS, mood: "scared" },
    ],
    focus: [TX, BELFRY_Y, TZ],
  }),

  jammed: ({ t, k }) => ({
    cam: { pos: [TX - 1.2, BELFRY_Y + 2.8, TZ + 10], look: [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.8], fov: 40 },
    ...LIT,
    cast: undefined,
    tower: { bellSwing: 0, gearIn: 1, lever: 0.04 + Math.abs(Math.sin(t * 9)) * 0.05, glow: 0.4 },
    actors: [{ look: H, anim: "lever", at: [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], yaw: 0, t: 0.15 + Math.abs(Math.sin(t * 9)) * 0.15, mood: "shout" }],
    shake: 0.06,
    focus: [TX, BELFRY_Y, TZ],
  }),

  shadowsClimb: ({ t, k }) => ({
    cam: { pos: mv([TX + 4, 6, TZ + 34], [TX + 3, 9, TZ + 30], k), look: [TX, 20, TZ + 4], fov: 50 },
    ...LIT,
    evil: 1,
    cast: undefined,
    actors: CLIMB.map((c, i) => ({
      look: H,
      anim: "climb" as Anim,
      at: [c.x, mix(1, c.top, ease(seg(k, c.start, 1))), TZ + 5.1] as V3,
      yaw: Math.PI,
      t: t + i * 0.4,
      shadow: true,
    })),
    focus: [TX, 15, TZ],
  }),

  brotherWindow: ({ t, k }) => ({
    cam: { pos: mv([TX - 6, BELFRY_Y - 6, TZ + 16], [TX - 5, BELFRY_Y - 5, TZ + 14], k), look: [TX - 2.4, BELFRY_Y + 1.5, TZ + 4], fov: 46 },
    ...LIT,
    cast: undefined,
    actors: [
      { look: K, anim: k > 0.5 ? "shout" : "run", at: mv([TX + 1.6, BELFRY_Y, TZ + 2.4], [TX - 2.4, BELFRY_Y, TZ + 4.4], seg(k, 0, 0.5)), yaw: k > 0.5 ? 0 : -1.2, t, scale: KS, mood: "shout" },
      ...CLIMB.map((c, i) => ({ look: H, anim: "climb" as Anim, at: [c.x, c.top - 6, TZ + 5.1] as V3, yaw: Math.PI, t: t + i * 0.4, shadow: true })),
    ],
    focus: [TX, BELFRY_Y, TZ],
  }),

  // ── s09 / s10 the shout ──
  kidShout: ({ t }) => ({
    cam: { pos: [TX - 1.4, BELFRY_Y + 2.6, TZ + 11.5], look: [TX - 2.4, BELFRY_Y + 1.6, TZ + 4.4], fov: 34 },
    ...LIT,
    cast: undefined,
    actors: [{ look: K, anim: "shout", at: [TX - 2.4, BELFRY_Y, TZ + 4.4], yaw: 0.15, t, scale: KS, mood: "shout" }],
    focus: [TX, BELFRY_Y, TZ],
  }),

  shadowsTurn: ({ t, k }) => ({
    cam: { pos: mv([TX + 2, 7, TZ + 24], [TX + 2, 8, TZ + 22], k), look: [TX - 1, 24, TZ + 4], fov: 52 },
    ...LIT,
    evil: 1,
    cast: undefined,
    actors: [
      ...CLIMB.map((c, i) => ({ look: H, anim: (k > 0.2 ? "idle" : "climb") as Anim, at: [c.x, c.top - 6, TZ + 5.3] as V3, yaw: k > 0.2 ? 0 : Math.PI, t: t + i, shadow: true, tip: k > 0.2 ? -0.35 : 0 })),
      { look: K, anim: "shout", at: [TX - 2.4, BELFRY_Y, TZ + 4.4], yaw: 0.15, t, scale: KS, mood: "scared" },
    ],
    shake: 0.15,
    focus: [TX, 15, TZ],
  }),

  // ── s11 the switch ──
  kickSwitch: ({ t, k }) => {
    const hit = seg(k, 0.55, 0.62);
    return {
      cam: { pos: [TX - 1.2, BELFRY_Y + 2.8, TZ + 10], look: [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.8], fov: 42 },
      ...LIT,
      cast: undefined,
      tower: { bellSwing: 0, gearIn: 1, lever: ease(hit), glow: 0.4 },
      actors: [{ look: H, anim: k < 0.5 ? "lever" : "jump", at: [LEVER[0], BELFRY_Y + (k > 0.5 && k < 0.62 ? 0.6 : 0), LEVER[2] - 1.8], yaw: 0, t: 0.3, mood: "shout" }],
      shake: k > 0.55 ? 0.5 * (1 - seg(k, 0.6, 1)) : 0.05,
      flash: k > 0.56 && k < 0.62 ? 0.35 : 0,
      focus: [TX, BELFRY_Y, TZ],
    };
  },

  lampDark: ({ t, k }) => {
    const on = k < 0.2 ? 1 : k < 0.4 ? (Math.sin(t * 50) > 0 ? 0.7 : 0) : 0;
    return {
      cam: { pos: mv([TX + 9, TOWER_H + 2, TZ + 12], [TX + 10, TOWER_H + 1, TZ + 13], k), look: LAMP, fov: 36 },
      ...(k < 0.4 ? LIT : NIGHT),
      towerLamp: on,
      focus: [TX, 30, TZ],
    };
  },

  vanish: ({ t, k }) => ({
    cam: { pos: mv([TX + 4, 6, TZ + 34], [TX + 5, 5, TZ + 38], k), look: [TX, 14, TZ + 4], fov: 54 },
    ...NIGHT,
    dark: 0.5,
    actors: CLIMB.map((c, i) => ({
      look: H,
      anim: "lookup" as Anim,
      at: [c.x, c.top - 6 - ease(seg(k, 0.1, 0.6)) * 2, TZ + 5.1] as V3,
      yaw: 0,
      t: t + i,
      shadow: true,
      melt: ease(seg(k, 0.25 + i * 0.05, 0.8 + i * 0.04)),
      hidden: k > 0.86 + i * 0.03,
    })),
    dust: CLIMB.map((c, i) => ({ x: c.x, z: TZ + 5.5, y: c.top - 7, amount: seg(k, 0.3, 0.6) * (1 - seg(k, 0.7, 1)), spread: 2, color: DARKEN })),
    focus: [TX, 15, TZ],
  }),

  darkTown: ({ t, k }) => ({
    cam: { pos: mv([60, 70, 120], [90, 110, 170], ease(k)), look: [0, 0, 20], fov: 55 },
    ...NIGHT,
    focus: [0, 0, 20],
  }),

  // ── s12 the porch ──
  walkHome: ({ t, k }) => ({
    cam: { pos: mv([4, 5, RZ - 1], [8, 5, RZ - 1], k), look: [20, 1.4, RZ + 6.5], fov: 44 },
    ...NIGHT,
    dark: 0.55,
    houses: [home({ glow: 0.2 })],
    actors: [
      { look: H, anim: "walk", at: mv([14, 0.3, RZ + 5], [20, 0.3, RZ + 6], k), yaw: Math.PI / 2, t, mood: "happy" },
      { look: K, anim: "walk", at: mv([15.4, 0.3, RZ + 6.6], [21.4, 0.3, RZ + 7.6], k), yaw: Math.PI / 2, t: t + 0.3, scale: KS, mood: "happy" },
    ],
    focus: [20, 0, RZ + 6],
  }),

  porchLight: ({ t, k }) => {
    const on = k > 0.35;
    return {
      cam: { pos: [25, 3.4, -153], look: [25, 3.2, -139], fov: 46 },
      ...NIGHT,
      dark: 0.6,
      houses: [home({ door: 0.8, glow: 0.8 })],
      spots: on ? [porch()] : [],
      flash: k > 0.35 && k < 0.4 ? 0.1 : 0,
      actors: [
        { look: DAD, anim: k > 0.3 ? "point" : "idle", at: [25, 0.3, -140.4], yaw: Math.PI, t, mood: "smile" },
        { look: H, anim: "idle", at: [23.6, 0.3, -146.5], yaw: 0, t, mood: "smile" },
        { look: K, anim: "run", at: mv([25.8, 0.3, -147], [26, 0.3, -142.6], ease(k)), yaw: 0, t, scale: KS, mood: "happy" },
      ],
      cast: on ? { from: [25, 0, -140.6], len: 1.4, opacity: 0.6 } : undefined,
      focus: [25, 0, -143],
    };
  },

  brotherWave: ({ t }) => ({
    cam: { pos: [24, 3, -151], look: [26, 1.6, -142.6], fov: 40 },
    ...NIGHT,
    dark: 0.6,
    houses: [home({ door: 0.8, glow: 0.8 })],
    spots: [porch()],
    actors: [{ look: K, anim: "cheer", at: [26, 0.3, -142.6], yaw: Math.PI + 0.3, t, scale: KS, mood: "happy" }],
    cast: { from: [25, 0, -140.6], len: 1.4, opacity: 0.6 },
    focus: [25, 0, -143],
  }),

  myShadow: ({ t, k }) => {
    const me = { at: [23.6, 0.3, -146.5] as V3, yaw: 0 };
    const turn = ease(seg(k, 0.4, 0.75));
    return {
      cam: { pos: mv([16.5, 7.5, -151.5], [17.6, 6.4, -150.8], ease(k)), look: [23.4, 1.2, -148.2], fov: 52 },
      ...NIGHT,
      dark: 0.6,
      houses: [home({ door: 0.8, glow: 0.8 })],
      spots: [porch()],
      actors: [
        { look: H, anim: "shout", at: me.at, yaw: 0, t, mood: "happy", noShadow: true },
        { ...shade(me, 0, { anim: "idle", t: 0, scale: 0.7 }), tip: -Math.PI / 2 + 0.04 + turn * 0.55, yaw: turn * 0.6 },
      ],
      shake: k > 0.45 ? 0.08 : 0,
      focus: [24, 0, -146],
    };
  },
};
