/**
 * Red Sky — shots. Every shot is a pure function of its local time
 * (see src/engine/kit.ts). Names here are the names story.json schedules.
 * The monster is the Giant (src/world/Giant.tsx); the landmark is the
 * lighthouse in the plaza corner (src/world/Lighthouse.tsx).
 */
import { LOOKS, townLook, type Look, type Mood } from "../../../src/world/Avatar";
import { giantFace, giantHand, giantHead, type GiantState } from "../../../src/world/Giant";
import { gallery, LAMP, LH_FRONT, SWITCH, SWITCH_YAW } from "../../../src/world/Lighthouse";
import { GALLERY_Y, LIGHTHOUSE, SUBURB_Z } from "../../../src/world/layout";
import { clockStr, ease, easeOut, mix, mv, seg, yawTo, type ActorSpec, type Frame, type Shot, type V3 } from "../../../src/engine/kit";

const H = LOOKS.hero;
const K = LOOKS.kid;
const KID_SCALE = 0.5;
const MAIL: Look = { skin: "#e8b48c", hair: "#24407a", hairStyle: "beanie", top: "#2f5fb0", shirt: "#2f5fb0", topKind: "hoodie", pants: "#24407a", shoes: "#2a2a2a" };
const [LX, , LZ] = LIGHTHOUSE;
// the mailman's sidewalk on the suburb road (clear of the siren pole at x -35)
const MX = -50.75;
const MZ = SUBURB_Z + 6.6;
// the survivor on the main street, and the giant's deep bend over him
const SURV: V3 = [1.5, 0.03, 173.2];

// ── giant helpers ─────────────────────────────────────────────────────────────
type Pose = Partial<Omit<GiantState, "at" | "yaw" | "t">>;
const STAND: Pose = { lean: 0, crouch: 0, armR: 0, elbowR: 0.15, armL: 0, elbowL: 0.15, head: 0.1, grip: 0, mouth: 0 };
const NUM: (keyof Pose)[] = ["lean", "crouch", "armR", "elbowR", "armL", "elbowL", "head", "headYaw", "grip", "mouth", "cover", "spreadR", "spreadL"];
const blend = (a: Pose, b: Pose, k: number): Pose => {
  const o: Pose = { ...a, ...b };
  for (const n of NUM) {
    const va = (a[n] as number | undefined) ?? (STAND[n] as number | undefined) ?? 0;
    const vb = (b[n] as number | undefined) ?? (STAND[n] as number | undefined) ?? 0;
    (o as Record<string, number>)[n] = mix(va, vb, k);
  }
  return o;
};
const G = (at: [number, number], yaw: number, t: number, p: Pose = {}): GiantState => ({ ...STAND, ...p, at, yaw, t });
/** Where to stand so that `side` hand lands on `target` (x, z) in `pose`. */
const placeFor = (target: [number, number], yaw: number, pose: Pose, side: "R" | "L" = "R"): [number, number] => {
  const h = giantHand(G([0, 0], yaw, 0, pose), side);
  return [target[0] - h[0], target[1] - h[2]];
};
const GRAB: Pose = { lean: 0.85, crouch: 0.3, armR: 0.3, elbowR: 0.25, head: -0.15, grip: 0.1, mouth: 1 };
const BEND: Pose = { lean: 1.3, crouch: 1.25, head: -1.25, armR: 0.7, armL: 0.7, elbowR: 0.3, elbowL: 0.3, mouth: 0 };
const LIFT: Pose = { lean: 0.25, crouch: 0, armR: 1.5, elbowR: 1.3, head: 0.1, grip: 1, mouth: 0 };
/** A grab: reach from STAND to GRAB over [a, c], close and lift over [c, e]. */
const grabAt = (k: number, a: number, c: number, e: number): Pose => {
  if (k < c) return blend(STAND, GRAB, ease(seg(k, a, c)));
  const g = blend(GRAB, LIFT, ease(seg(k, c, e)));
  g.grip = Math.min(1, seg(k, c, c + 0.06) + 0.1);
  return g;
};
const held = (g: GiantState): V3 => {
  const h = giantHand(g, "R");
  return [h[0], h[1] - 3.4, h[2]];
};

/** Walkers frozen mid-stride: anim "walk" with its clock stopped. */
const frozen = (look: Look, at: V3, yaw: number, phase: number, mood: Mood = "worried", scale?: number): ActorSpec => ({ look, anim: "walk", at, yaw, t: phase, mood, scale });

// townsfolk on the main street (x = 0): walking, then frozen where they stood
const STREET = Array.from({ length: 12 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  return { look: townLook(200 + i), side, x: side * (6.2 + (i % 3) * 0.8), z: mix(160, 100, (i + 0.5) / 12), ph: i * 0.37 };
});
const streetFolk = (t: number, freezeAt: number | null, mood: Mood = "worried"): ActorSpec[] =>
  STREET.map((p) => {
    const tt = freezeAt === null ? t : Math.min(t, freezeAt);
    const at: V3 = [p.x, 0.3, p.z - tt * 1.6 * p.side];
    const yaw = p.side > 0 ? Math.PI : 0;
    if (freezeAt !== null && t > freezeAt) return frozen(p.look, at, yaw, tt + p.ph, mood);
    return { look: p.look, anim: "walk", at, yaw, t: t + p.ph, mood: "smile" };
  });

// plaza crowd
const CROWD = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399 + 0.4;
  const r = 12 + (i % 5) * 4.2;
  return { look: townLook(i + 40), base: [Math.cos(a) * r, 0.06, Math.sin(a) * r] as V3, a };
});
const crowd = (mode: "walk" | "freeze" | "look" | "panic", t: number, k: number, from: V3 = [20, 0, -75]): ActorSpec[] =>
  CROWD.map((p, i) => {
    const r = Math.hypot(p.base[0], p.base[2]);
    if (mode === "walk" || mode === "freeze") {
      const tt = mode === "freeze" ? 1.2 : t;
      const ang = p.a + tt * 0.05 * (i % 2 ? 1 : -1);
      const at: V3 = [Math.cos(ang) * r, 0.06, Math.sin(ang) * r];
      const walking = i % 3 !== 0;
      const yaw = ang + (i % 2 ? 0 : Math.PI);
      if (mode === "freeze") return walking ? frozen(p.look, at, yaw, 0.3 + i * 0.29) : { look: p.look, anim: "idle", at, yaw, t: 0, mood: "worried" };
      return { look: p.look, anim: walking ? "walk" : "idle", at, yaw, t: t + i, mood: "smile" };
    }
    if (mode === "look") return { look: p.look, anim: "lookup", at: p.base, yaw: yawTo(p.base, from) + ((i % 3) - 1) * 0.3, t: t + i, mood: "scared" };
    const dir = yawTo(from, p.base);
    const run = easeOut(k) * 16;
    return { look: p.look, anim: "panic", at: [p.base[0] + Math.sin(dir) * run, 0.06, p.base[2] + Math.cos(dir) * run], yaw: dir, t: t + i * 0.3, mood: "scared" };
  });

// the brothers in the plaza, by the fountain
const BRO_H: V3 = [10.4, 0.06, 5.2];
const BRO_K: V3 = [12.2, 0.06, 6.4];
const BRO_YAW = yawTo(BRO_H, [-2, 0, -16]) + 0.4;
const brothersFrozen = (mood: Mood = "worried"): ActorSpec[] => [
  frozen(H, BRO_H, BRO_YAW, 0.21, mood),
  frozen(K, BRO_K, BRO_YAW, 0.62, mood, KID_SCALE),
];

// where the giant stands in the plaza while it watches the brothers
const GW: [number, number] = [-4, -18];
const GW_YAW = yawTo([GW[0], 0, GW[1]], BRO_H);
// after the headlights it stumbles back a little; then it turns to the lighthouse
const GR: [number, number] = [-6, -22];
const TO_LH = yawTo([GR[0], 0, GR[1]], LIGHTHOUSE);

// lighthouse balcony spots
const HERO_G = gallery(SWITCH_YAW + 0.38, 4.3);
const HERO_G_YAW = yawTo(HERO_G, SWITCH);
const KID_YAW_G = LH_FRONT - 0.75;
const KID_G = gallery(KID_YAW_G, 4.7);
const out = (yaw: number, r: number, dy: number): V3 => gallery(yaw, r, dy);

// reaching for the kid: stand so the right hand ends right in front of him
const REACH: Pose = { lean: 0.2, armR: 1.62, elbowR: 0.05, head: 0.05, grip: 0, mouth: 1 };
const REACH_YAW = yawTo([-2, 0, -8], LIGHTHOUSE) + 0.08;
const KID_REACH: [number, number] = [KID_G[0] - Math.sin(REACH_YAW) * 3.5, KID_G[2] - Math.cos(REACH_YAW) * 3.5];
const GREACH = placeFor(KID_REACH, REACH_YAW, REACH);

// ── shots ─────────────────────────────────────────────────────────────────────
const RAW: Record<string, Shot> = {
  // s01 ──────────────────────────────────────────────────────────────────────
  cityFly: ({ t, k }) => ({
    cam: { pos: mv([0, 120, 300], [0, 55, 215], ease(k)), look: mv([0, 0, 150], [0, 0, 135], k), fov: 55 },
    evil: 0,
    fog: 0,
    actors: streetFolk(t, null),
    focus: [0, 0, 130],
  }),

  redSky: ({ t, k }) => ({
    cam: { pos: [1.5, 2.4, 168], look: mv([0, 8, 120], [0, 40, 110], ease(k)), fov: 62 },
    evil: ease(seg(k, 0.05, 0.6)),
    fog: ease(seg(k, 0.3, 1)) * 0.35,
    siren: 1,
    actors: streetFolk(t + 1, null),
    focus: [0, 0, 140],
  }),

  freezeStreet: ({ t, k }) => ({
    cam: { pos: mv([2.5, 3.2, 166], [2, 3.4, 160], k), look: [-1, 3, 128], fov: 48 },
    evil: 1,
    fog: 0.35,
    siren: 1,
    actors: streetFolk(t + 2.2, 2.2 + 0.35, "worried"),
    focus: [0, 0, 135],
  }),

  giantPeek: ({ t, k }) => {
    const g = G([-24, 124], Math.PI / 2 + 0.25, t, { y: mix(-26, 5, easeOut(seg(k, 0, 0.6))), lean: 0.45, head: 0.45, armR: 0.6, armL: 0.6, elbowR: 0.5, elbowL: 0.5, headYaw: mix(-0.3, 0.25, ease(seg(k, 0.4, 1))) });
    return {
      cam: { pos: [3, 2.6, 164], look: [-9, 25, 126], fov: 56 },
      evil: 1,
      fog: 0.4,
      giants: [g],
      actors: streetFolk(4.55, 2.55, "scared"),
      shake: k > 0.1 && k < 0.7 ? 0.25 : 0,
      focus: [-10, 0, 130],
    };
  },

  // s02 ──────────────────────────────────────────────────────────────────────
  plazaDay: ({ t, k }) => ({
    cam: { pos: mv([42, 15, 46], [36, 12, 52], k), look: [0, 3, 0], fov: 55 },
    evil: 0,
    fog: 0,
    actors: crowd("walk", t, k),
    focus: [0, 0, 0],
  }),

  plazaRed: ({ t, k }) => ({
    cam: { pos: [14, 2.4, 34], look: mv([0, 10, 0], [6, 32, -50], ease(k)), fov: 62 },
    evil: ease(seg(k, 0.05, 0.55)),
    fog: ease(seg(k, 0.3, 1)) * 0.3,
    siren: k > 0.2 ? 1 : 0,
    actors: crowd(k < 0.5 ? "walk" : "freeze", t + 1.2, k),
    focus: [0, 0, 0],
  }),

  plazaStare: ({ t, k }) => ({
    cam: { pos: mv([16, 3.2, -18], [15, 3.3, -16], k), look: [8, 3.4, 6], fov: 46 },
    evil: 1,
    fog: 0.3,
    actors: crowd("look", t, k),
    focus: [0, 0, 15],
  }),

  giantRise: ({ t, k }) => {
    const g = G([20, -76], 0, t, { y: mix(-38, 0, easeOut(seg(k, 0, 0.75))), head: 0.3, mouth: 0 });
    return {
      cam: { pos: mv([-8, 2.6, 34], [-6, 3, 30], k), look: [16, 24, -60], fov: 50 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: crowd("look", t, k, [20, 0, -76]),
      shake: k < 0.75 ? 0.3 : 0.05,
      focus: [10, 0, -40],
    };
  },

  crowdRun: ({ t, k }) => {
    const g = G([14, mix(-36, -28, k)], 0, t, { walk: t, stride: 0.8, head: 0.3 });
    return {
      cam: { pos: [-4, 3.5, 34], look: [8, 14, -16], fov: 60 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: crowd("panic", t, k, [14, 0, -30]),
      shake: 0.3,
      focus: [8, 0, -5],
    };
  },

  giantGrin: ({ t, k }) => {
    const g = G([14, -26], 0, t, { lean: 0.3, head: 0.25, mouth: k > 0.35 ? 1 : 0 });
    const f = giantFace(g);
    return {
      cam: { pos: mv([f[0] + 2, f[1] - 4, f[2] + 18], [f[0] + 1, f[1] - 2, f[2] + 12], ease(k)), look: [f[0], f[1] - 1, f[2] - 5], fov: 46 },
      evil: 1,
      fog: 0.2,
      giants: [g],
      shake: k > 0.35 ? 0.25 : 0,
      focus: [f[0], 0, f[2]],
    };
  },

  giantGrab: ({ t, k }) => {
    const V: [number, number] = [6, 0];
    const yaw = 0.4;
    const at = placeFor(V, yaw, GRAB);
    const g = G(at, yaw, t, grabAt(k, 0, 0.42, 0.9));
    const grabbed = k > 0.42;
    return {
      cam: { pos: [26, 5, 22], look: [8, 12, -4], fov: 60 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: [
        ...crowd("panic", t, 0.5 + k * 0.5, [at[0], 0, at[1]]).slice(0, 10),
        { look: townLook(91), anim: grabbed ? "grabbed" : "panic", at: grabbed ? held(g) : [V[0] + mix(-3, 0, k / 0.42), 0.06, V[1] + 2], yaw: 0.6, t: t * 1.3, mood: "scared" },
      ],
      shake: k > 0.35 && k < 0.55 ? 0.5 : 0.1,
      focus: [V[0], 0, V[1]],
    };
  },

  // s03 ──────────────────────────────────────────────────────────────────────
  frozenTown: ({ t, k }) => {
    const g = G([0, mix(212, 200, k)], Math.PI, t, { walk: t, stride: 0.7, head: 0.35 });
    return {
      cam: { pos: mv([22, 34, 70], [16, 30, 82], k), look: [0, 14, 160], fov: 55 },
      evil: 1,
      fog: 0.45,
      siren: 1,
      giants: [g],
      actors: streetFolk(4.5, 2.5),
      focus: [0, 0, 150],
    };
  },

  handSnatch: ({ t, k }) => {
    const V: [number, number] = [-6.4, 112];
    const yaw = Math.PI + 0.35;
    const at = placeFor(V, yaw, GRAB);
    const g = G(at, yaw, t, grabAt(k, 0.15, 0.52, 0.95));
    const grabbed = k > 0.52;
    return {
      cam: { pos: [5.5, 2.8, 96], look: [-4, 9, 114], fov: 60 },
      evil: 1,
      fog: 0.4,
      giants: [g],
      actors: [{ look: LOOKS.victim, anim: grabbed ? "grabbed" : k > 0.25 ? "panic" : "walk", at: grabbed ? held(g) : [V[0], 0.3, V[1]], yaw: k > 0.25 ? Math.PI : 0, t: k > 0.25 ? t : 0.4, mood: "scared" }],
      shake: k > 0.45 && k < 0.62 ? 0.5 : 0.08,
      focus: [V[0], 0, V[1]],
    };
  },

  // s04 ──────────────────────────────────────────────────────────────────────
  mailWalk: ({ t, k }) => {
    const x = mix(MX - 11, MX - 3, k);
    return {
      cam: { pos: [x + 8, 3, MZ - 4.5], look: [x + 1, 2.6, MZ], fov: 46 },
      evil: 0,
      fog: 0,
      actors: [{ look: MAIL, anim: "walk", at: [x, 0.3, MZ], yaw: Math.PI / 2, t, mood: "smile" }],
      focus: [x, 0, SUBURB_Z],
    };
  },

  mailFreeze: ({ t, k }) => ({
    cam: { pos: mv([MX + 8.5, 3.2, MZ - 5], [MX + 7, 3.1, MZ - 4], k), look: [MX, 3.2, MZ], fov: 44 },
    evil: ease(seg(k, 0, 0.45)),
    fog: ease(seg(k, 0.2, 1)) * 0.35,
    siren: 1,
    actors: [k < 0.25 ? { look: MAIL, anim: "walk", at: [MX - 0.75 + k * 3, 0.3, MZ], yaw: Math.PI / 2, t, mood: "smile" } : frozen(MAIL, [MX, 0.3, MZ], Math.PI / 2, 0.4, "worried")],
    focus: [MX, 0, SUBURB_Z],
  }),

  phoneRing: ({ t, k }) => {
    const buzz = k > 0.35 ? Math.sin(t * 70) * 0.02 : 0;
    return {
      cam: { pos: [MX + 4.9, 4.0, MZ - 2], look: [MX + 0.15, 3.9, MZ], fov: 32 },
      evil: 1,
      fog: 0.35,
      actors: [{ ...frozen(MAIL, [MX, 0.3, MZ], Math.PI / 2, 0.4, k > 0.45 ? "scared" : "worried"), roll: buzz }],
      focus: [MX, 0, SUBURB_Z],
    };
  },

  mailFlinch: ({ t, k }) => {
    const twitch = k > 0.2 && k < 0.42;
    const g = G([MX - 6, SUBURB_Z + 36], Math.PI, t, { lean: 0.2, head: 0.4, headYaw: mix(-0.6, 0.15, ease(seg(k, 0.35, 0.75))) });
    return {
      cam: { pos: [MX + 12, 3.5, SUBURB_Z - 4], look: [MX - 2, 14, SUBURB_Z + 16], fov: 56 },
      evil: 1,
      fog: 0.4,
      giants: [g],
      actors: [twitch ? { look: MAIL, anim: "panic", at: [MX, 0.3, MZ], yaw: Math.PI / 2, t: t * 0.6, mood: "scared" } : frozen(MAIL, [MX, 0.3, MZ], Math.PI / 2, 0.4, "scared")],
      shake: twitch ? 0.06 : 0,
      focus: [MX, 0, SUBURB_Z],
    };
  },

  mailGrab: ({ t, k }) => {
    const V: [number, number] = [MX, MZ];
    const yaw = Math.PI + 0.25;
    const at = placeFor(V, yaw, GRAB);
    const g = G(at, yaw, t, grabAt(k, 0, 0.5, 0.95));
    const grabbed = k > 0.5;
    return {
      cam: { pos: [MX + 7, 1.2, SUBURB_Z - 1], look: [MX - 1, 18, SUBURB_Z + 12], fov: 66 },
      evil: 1,
      fog: 0.4,
      giants: [g],
      actors: [grabbed ? { look: MAIL, anim: "grabbed", at: held(g), yaw: Math.PI / 2, t, mood: "scared" } : frozen(MAIL, [V[0], 0.3, V[1]], Math.PI / 2, 0.4, "scared")],
      shake: k > 0.4 && k < 0.6 ? 0.6 : 0.1,
      focus: [V[0], 0, V[1]],
    };
  },

  // s05 ──────────────────────────────────────────────────────────────────────
  survivorStand: ({ t, k }) => {
    const g = G([0, mix(222, 212, k)], Math.PI, t, { walk: t, stride: 0.7, head: 0.3 });
    return {
      cam: { pos: [-3.5, 3.2, 160], look: [0.5, 8, 200], fov: 54 },
      evil: 1,
      fog: 0.4,
      giants: [g],
      actors: [frozen(LOOKS.survivor, SURV, Math.PI, 0.3, "worried")],
      focus: [0, 0, 185],
    };
  },

  giantBend: ({ t, k }) => {
    const g = G([1.5, 196], Math.PI, t, blend(STAND, BEND, ease(seg(k, 0, 0.75))));
    return {
      cam: { pos: mv([-7.5, 3, 158], [-7.2, 3.2, 161], k), look: mv([1.5, 18, 185], [1.5, 6, 177], ease(seg(k, 0, 0.75))), fov: 58 },
      evil: 1,
      fog: 0.35,
      giants: [g],
      actors: [frozen(LOOKS.survivor, SURV, Math.PI, 0.3, "scared")],
      shake: k < 0.7 ? 0.15 : 0,
      focus: [1.5, 0, 180],
    };
  },

  survivorCount: ({ t, k }) => {
    const g = G([1.5, 196], Math.PI, t, BEND);
    return {
      cam: { pos: mv([1.2, 4.2, 164.5], [1.3, 4.4, 166], k), look: [1.5, 5.4, 175], fov: 50 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: [frozen(LOOKS.survivor, SURV, Math.PI, 0.3, "scared")],
      clock: clockStr(60 - k * 60),
      focus: [1.5, 0, 176],
    };
  },

  giantLeave: ({ t, k }) => {
    const up = ease(seg(k, 0, 0.35));
    const g = G([1.5, 196 + easeOut(seg(k, 0.3, 1)) * 10], mix(Math.PI, Math.PI * 2, ease(seg(k, 0.2, 0.5))), t, {
      ...blend(BEND, STAND, up),
      walk: k > 0.3 ? t : 0,
      stride: k > 0.3 ? 0.8 : 0,
    });
    return {
      cam: { pos: [-1.5, 2.4, 162], look: [1, 14, 190], fov: 58 },
      evil: 1,
      fog: 0.35,
      giants: [g],
      actors: [frozen(LOOKS.survivor, SURV, Math.PI, 0.3, "worried")],
      shake: k > 0.3 ? 0.12 : 0,
      focus: [1, 0, 185],
    };
  },

  crowdFreeze: ({ t, k }) => ({
    cam: { pos: mv([2, 15, 166], [1, 17, 160], k), look: [0, 2, 125], fov: 58 },
    evil: 0.9,
    fog: 0.35,
    siren: 1,
    actors: streetFolk(4.5, 2.5, "worried"),
    clock: clockStr(Math.min(60, k * 66)),
    focus: [0, 0, 130],
  }),

  // s06 ──────────────────────────────────────────────────────────────────────
  timelapse: ({ k }) => {
    const pulse = k < 0.55 ? 0.5 - 0.5 * Math.cos(k * Math.PI * 2 * 3.3) : 0;
    const ang = 0.6 + k * 0.6;
    return {
      cam: { pos: [Math.sin(ang) * 230, 160, Math.cos(ang) * 230], look: [0, 0, 0], fov: 55 },
      evil: pulse,
      fog: pulse * 0.3,
      clock: k < 0.55 ? clockStr(((k / 0.55) * 60 * 3.3) % 60) : undefined,
      focus: [0, 0, 0],
    };
  },

  brothersWalk: ({ t, k }) => {
    const z = mix(16, 9, k);
    return {
      cam: { pos: [12.6, 3.3, z - 8.5], look: [10.6, 2.6, z], fov: 48 },
      evil: 0,
      fog: 0,
      actors: [
        { look: H, anim: "walk", at: [10.4, 0.06, z - 1], yaw: Math.PI, t, mood: "smile" },
        { look: K, anim: "walk", at: [12.2, 0.06, z - 0.6], yaw: Math.PI, t: t * 1.2 + 0.3, scale: KID_SCALE, mood: "happy" },
      ],
      focus: [10, 0, z],
    };
  },

  redB: ({ t, k }) => ({
    cam: { pos: [12.4, 1.6, 0], look: [8, 14, 24], fov: 58 },
    evil: ease(seg(k, 0, 0.6)),
    fog: ease(seg(k, 0.2, 1)) * 0.3,
    siren: 1,
    actors: [
      { look: H, anim: "lookup", at: [10.4, 0.06, 7.6], yaw: Math.PI + 0.2, t, mood: "worried" },
      { look: K, anim: "lookup", at: [12.2, 0.06, 8.0], yaw: Math.PI - 0.1, t, scale: KID_SCALE, mood: "scared" },
    ],
    focus: [10, 0, 8],
  }),

  brothersFreeze: ({ t, k }) => {
    const g = G([mix(-6, GW[0], ease(k)), mix(-30, GW[1], ease(k))], GW_YAW, t, { walk: k < 0.9 ? t : 0, stride: 0.8 * (1 - seg(k, 0.7, 1)), head: 0.3 });
    return {
      cam: { pos: [19, 4.5, 15], look: [0, 16, -14], fov: 60 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: brothersFrozen("scared"),
      shake: 0.15 * (1 - seg(k, 0.7, 1)),
      focus: [4, 0, -4],
    };
  },

  giantWatch: ({ t, k }) => {
    const g = G(GW, GW_YAW, t, { head: 0.5, lean: 0.2 });
    return {
      cam: { pos: mv([17, 2.6, 13], [16.5, 2.8, 12], k), look: [-2, 18, -16], fov: 58 },
      evil: 1,
      fog: 0.35,
      giants: [g],
      actors: brothersFrozen("worried"),
      clock: k < 0.3 ? clockStr(seg(k, 0, 0.28) * 60) : clockStr(60 + seg(k, 0.32, 0.95) * 540),
      focus: [3, 0, -5],
    };
  },

  // s07 ──────────────────────────────────────────────────────────────────────
  carLights: ({ t, k }) => {
    const z = mix(70, 48, easeOut(k));
    const g = G(GW, mix(GW_YAW, 0.15, ease(seg(k, 0.4, 0.9))), t, { head: 0.5 - ease(seg(k, 0.4, 0.9)) * 0.3, lean: 0.2 });
    return {
      cam: { pos: [7, 10, z + 20], look: [-2, 12, -12], fov: 58 },
      evil: 1,
      fog: 0.35,
      giants: [g],
      cars: [{ color: "#ffd23f", at: [2.6, 0.03, z], yaw: Math.PI, wheelT: t * (1 - k * 0.6), lights: 3 }],
      actors: brothersFrozen("worried"),
      focus: [0, 0, 10],
    };
  },

  giantRecoil: ({ t, k }) => {
    const c = ease(seg(k, 0, 0.3));
    const back = easeOut(seg(k, 0.1, 0.8));
    const g = G([mix(GW[0], GR[0], back), mix(GW[1], GR[1], back)], 0.15, t * 2, { cover: c, lean: -0.15 * c, head: -0.2, mouth: 1, walk: back > 0 && back < 1 ? t : 0, stride: 0.5 });
    return {
      cam: { pos: [16, 7, 18], look: [-4, 26, -18], fov: 56 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      cars: [{ color: "#ffd23f", at: [2.6, 0.03, 48], yaw: Math.PI, lights: 3 }],
      actors: brothersFrozen("scared"),
      shake: 0.45,
      focus: [-2, 0, -10],
    };
  },

  heroIdea: ({ t, k }) => ({
    cam: { pos: mv([10.8, 3.6, 0.2], [10.6, 3.5, 1.2], ease(k)), look: [10.4, 3.4, 5.2], fov: 40 },
    evil: 1,
    fog: 0.25,
    giants: [G(GR, 0.15, t, { cover: 1, mouth: 1 })],
    actors: [
      { look: H, anim: k > 0.55 ? "point" : "idle", at: BRO_H, yaw: Math.PI + 0.1, t, mood: k > 0.45 ? "smile" : "worried" },
      { look: K, anim: "idle", at: BRO_K, yaw: Math.PI - 0.4, t, scale: KID_SCALE, mood: "worried" },
    ],
    focus: [10, 0, 5],
  }),

  lighthouse: ({ k }) => ({
    cam: { pos: mv([12, 4, 4], [6, 10, 12], ease(k)), look: mv([LX, 20, LZ], [LX, 34, LZ], ease(k)), fov: 52 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: 0 },
    focus: [LX, 0, LZ],
  }),

  lampVision: ({ t, k }) => ({
    cam: { pos: mv([LX - 30, 60, LZ + 40], [LX - 80, 95, LZ + 120], ease(k)), look: [LX, 28, LZ], fov: 55 },
    evil: 0.12,
    fog: 0,
    dusk: 0.5,
    lamp: { on: 1, aim: [LX + Math.sin(1 + t * 0.9) * 200, 10, LZ + Math.cos(1 + t * 0.9) * 200] },
    tint: "rgba(255,220,140,0.12)",
    focus: [LX, 0, LZ],
  }),

  // s08 ──────────────────────────────────────────────────────────────────────
  sneak: ({ t, k }) => {
    const turnBack = ease(seg(k, 0.5, 0.7));
    const g = G(GR, 0.15, t, { head: 0.4, headYaw: mix(-1.0, 0.7, turnBack), lean: 0.15 });
    const go = Math.min(k, 0.5) / 0.5;
    const path = (p: V3): V3 => mv(p, [p[0] + 8, 0.06, p[2] - 15], go);
    const yaw = yawTo(BRO_H, [BRO_H[0] + 8, 0, BRO_H[2] - 15]);
    const moving = k < 0.5;
    return {
      cam: { pos: [34, 14, 22], look: [10, 8, -10], fov: 58 },
      evil: 1,
      fog: 0.3,
      giants: [g],
      actors: [
        moving ? { look: H, anim: "walk", at: path(BRO_H), yaw, t, mood: "worried" } : frozen(H, path(BRO_H), yaw, 0.3, "scared"),
        moving ? { look: K, anim: "walk", at: path(BRO_K), yaw, t: t + 0.3, scale: KID_SCALE, mood: "worried" } : frozen(K, path(BRO_K), yaw, 0.7, "scared", KID_SCALE),
      ],
      focus: [12, 0, -4],
    };
  },

  lhClimb: ({ t, k }) => {
    const a0 = LH_FRONT - 0.9;
    const hy = mix(a0, SWITCH_YAW - 0.2, ease(k));
    const ky = mix(a0 - 0.35, KID_YAW_G + 0.2, ease(k));
    return {
      cam: { pos: out(LH_FRONT - 0.2, 15, 4), look: gallery(LH_FRONT - 0.4, 2, 1.5), fov: 50 },
      evil: 1,
      fog: 0.3,
      lamp: { on: 0, cable: 0, spark: 0.4 },
      actors: [
        { look: H, anim: "run", at: gallery(hy, 4.4), yaw: hy + Math.PI / 2, t, mood: "worried" },
        { look: K, anim: "run", at: gallery(ky, 4.6), yaw: ky + Math.PI / 2, t: t + 0.2, scale: KID_SCALE, mood: "worried" },
      ],
      focus: [LX, GALLERY_Y, LZ],
    };
  },

  lampDead: ({ t, k }) => ({
    cam: { pos: mv(out(SWITCH_YAW - 0.3, 11.5, 4.2), out(SWITCH_YAW - 0.25, 10.5, 4), k), look: gallery(SWITCH_YAW + 0.2, 3.4, 2.6), fov: 46 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: 0, spark: k > 0.5 ? 1 : 0.3 },
    actors: [{ look: H, anim: k > 0.35 ? "point" : "idle", at: gallery(SWITCH_YAW + 0.5, 4.4), yaw: yawTo(gallery(SWITCH_YAW + 0.5, 4.4), gallery(SWITCH_YAW, 3, 3)), t, mood: "worried" }],
    focus: [LX, GALLERY_Y, LZ],
  }),

  repair: ({ t, k }) => ({
    cam: { pos: mv(out(SWITCH_YAW - 0.55, 9.5, 2.6), out(SWITCH_YAW - 0.5, 9, 2.5), k), look: gallery(SWITCH_YAW + 0.15, 3.4, 1.8), fov: 42 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: 0.25, spark: 0.8 },
    actors: [{ look: H, anim: "work", at: HERO_G, yaw: HERO_G_YAW, t, mood: "worried" }],
    focus: [LX, GALLERY_Y, LZ],
  }),

  giantTurn: ({ t, k }) => {
    const g = G(GR, mix(0.15, TO_LH, ease(k)), t, { head: 0.15, mouth: 0, walk: t * 0.6, stride: 0.4 });
    const hd = giantHead(g);
    return {
      cam: { pos: out(LH_FRONT + 0.15, 7.5, 3.2), look: [hd[0], hd[1] - 6, hd[2]], fov: 58 },
      evil: 1,
      fog: 0.3,
      lamp: { on: 0, cable: 0.25, spark: 0.6 },
      giants: [g],
      actors: [{ look: H, anim: "work", at: HERO_G, yaw: HERO_G_YAW, t, mood: "scared" }],
      shake: 0.35,
      focus: [10, 0, -15],
    };
  },

  kidWave: ({ t, k }) => {
    const g = G(GR, TO_LH, t, { head: 0.05, mouth: 0 });
    return {
      cam: { pos: out(KID_YAW_G + 0.55, 12, 2.5), look: gallery(KID_YAW_G, 4, 2), fov: 46 },
      evil: 1,
      fog: 0.3,
      lamp: { on: 0, cable: 0.25, spark: 0.6 },
      giants: [g],
      actors: [
        { look: K, anim: k < 0.3 ? "run" : "cheer", at: gallery(mix(KID_YAW_G + 0.9, KID_YAW_G, ease(seg(k, 0, 0.3))), 4.7), yaw: k < 0.3 ? KID_YAW_G - Math.PI / 2 : KID_YAW_G, t, scale: KID_SCALE, mood: "shout" },
        { look: H, anim: "work", at: HERO_G, yaw: HERO_G_YAW, t, mood: "scared" },
      ],
      focus: [LX, GALLERY_Y, LZ],
    };
  },

  kidShout: ({ t }) => ({
    cam: { pos: out(KID_YAW_G + 0.1, 10, 2.6), look: out(KID_YAW_G, 4.7, 2.2), fov: 30 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: 0.25, spark: 0.6 },
    actors: [{ look: K, anim: "shout", at: KID_G, yaw: KID_YAW_G + 0.1, t, scale: KID_SCALE, mood: "shout" }],
    shake: 0.12,
    focus: [LX, GALLERY_Y, LZ],
  }),

  giantReach: ({ t, k }) => {
    const p = blend({ lean: 0.1, armR: 0.6, elbowR: 0.6, head: 0.05 }, REACH, ease(seg(k, 0, 0.85)));
    p.grip = 0;
    const g = G(GREACH, REACH_YAW, t, p);
    return {
      cam: { pos: out(KID_YAW_G + 1.25, 24, 7), look: mv(KID_G, giantHand(G(GREACH, REACH_YAW, t, REACH), "R"), 0.4), fov: 60 },
      evil: 1,
      fog: 0.3,
      lamp: { on: 0, cable: 0.25, spark: 0.6 },
      giants: [g],
      actors: [{ look: K, anim: "panic", at: KID_G, yaw: KID_YAW_G, t, scale: KID_SCALE, mood: "scared" }],
      shake: 0.35,
      focus: [LX, GALLERY_Y, LZ],
    };
  },

  // s09 ──────────────────────────────────────────────────────────────────────
  wires: ({ t, k }) => ({
    cam: { pos: out(SWITCH_YAW - 0.5, 8.5, 3.4), look: gallery(SWITCH_YAW, 3.1, 3.2), fov: 36 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: k < 0.6 ? mix(0.25, 0.85, ease(seg(k, 0, 0.6))) : 1, spark: k < 0.65 ? 1 : 0 },
    actors: [{ look: H, anim: "work", at: HERO_G, yaw: HERO_G_YAW, t, mood: "shout" }],
    flash: k > 0.6 && k < 0.7 ? 0.5 : 0,
    focus: [LX, GALLERY_Y, LZ],
  }),

  switchSlam: ({ t, k }) => ({
    cam: { pos: out(SWITCH_YAW - 0.55, 8.5, 2.2), look: gallery(SWITCH_YAW + 0.2, 3.5, 1.8), fov: 40 },
    evil: 1,
    fog: 0.3,
    lamp: { on: 0, cable: 1, lever: ease(seg(k, 0.25, 0.55)) },
    actors: [{ look: H, anim: "lever", at: HERO_G, yaw: HERO_G_YAW, t: seg(k, 0.2, 0.6) * 0.6, mood: "shout" }],
    focus: [LX, GALLERY_Y, LZ],
  }),

  lampOn: ({ t, k }) => {
    const g = G(GREACH, REACH_YAW, t, { ...REACH, mouth: 1 });
    const f = giantFace(g);
    const on = ease(seg(k, 0, 0.25));
    return {
      cam: { pos: mv([LX - 18, 18, LZ + 22], [LX - 20, 16, LZ + 25], k), look: [LX, LAMP[1], LZ], fov: 56 },
      evil: 1,
      fog: 0.3,
      lamp: { on, cable: 1, lever: 1, aim: f },
      giants: [g],
      flash: k < 0.15 ? 0.6 * (1 - k / 0.15) : 0,
      shake: 0.2,
      focus: [LX, GALLERY_Y, LZ],
    };
  },

  beamHit: ({ t, k }) => {
    const g = G(GREACH, REACH_YAW, t * 2, { ...blend(REACH, { cover: 1, lean: -0.15, mouth: 1 }, ease(seg(k, 0.1, 0.5))), eyes: 1 + Math.sin(t * 40) * 0.6 });
    const f = giantFace(G(GREACH, REACH_YAW, 0, REACH));
    const hd = giantHead(G(GREACH, REACH_YAW, 0, { cover: 1, lean: -0.15 }));
    const dx = hd[0] - LAMP[0];
    const dz = hd[2] - LAMP[2];
    const n = Math.hypot(dx, dz);
    const sideA: V3 = [hd[0] - (dz / n) * 34 + (dx / n) * 8, hd[1] - 8, hd[2] + (dx / n) * 34 + (dz / n) * 8];
    const sideB: V3 = [hd[0] + (dz / n) * 34 + (dx / n) * 8, hd[1] - 8, hd[2] - (dx / n) * 34 + (dz / n) * 8];
    const side = Math.hypot(sideA[0], sideA[2]) < Math.hypot(sideB[0], sideB[2]) ? sideA : sideB;
    return {
      cam: { pos: mv(side, [side[0], side[1] + 1.5, side[2]], k), look: [hd[0] - (dx / n) * 4, hd[1] - 6, hd[2] - (dz / n) * 4], fov: 56 },
      evil: 1,
      fog: 0.25,
      lamp: { on: 1, cable: 1, lever: 1, aim: f },
      giants: [g],
      tint: "rgba(255,230,160,0.18)",
      shake: 0.45,
      focus: [f[0], 0, f[2]],
    };
  },

  giantShatter: ({ t, k }) => {
    const sh = ease(seg(k, 0.3, 1));
    const g = G(GREACH, REACH_YAW, t * 2, { cover: 1, lean: -0.15, mouth: 1, shatter: sh, eyes: k < 0.3 ? 1 : 0 });
    const f = giantFace(G(GREACH, REACH_YAW, 0, REACH));
    return {
      cam: { pos: [GREACH[0] + 34, 16, GREACH[1] + 44], look: [GREACH[0] + 4, 16, GREACH[1]], fov: 60 },
      evil: 1 - seg(k, 0.6, 1) * 0.3,
      fog: 0.3,
      lamp: { on: 1, cable: 1, lever: 1, aim: f },
      giants: [g],
      dust: [{ x: GREACH[0], z: GREACH[1], amount: seg(k, 0.5, 0.8), spread: 16, color: "#3a2a30" }],
      flash: k > 0.3 && k < 0.36 ? 0.5 : 0,
      shake: k > 0.3 ? 0.7 * (1 - seg(k, 0.6, 1)) : 0.3,
      focus: [GREACH[0], 0, GREACH[1]],
    };
  },

  skyClear: ({ t, k }) => ({
    cam: { pos: mv([LX - 26, 30, LZ + 40], [LX - 60, 70, LZ + 110], ease(k)), look: [LX - 8, 20, LZ], fov: 55 },
    evil: 0.7 * (1 - ease(k)),
    fog: 0.3 * (1 - ease(k)),
    lamp: { on: 1 - k * 0.6, cable: 1, lever: 1, aim: [LX + Math.sin(-2.4 + t * 0.4) * 200, 12, LZ + Math.cos(-2.4 + t * 0.4) * 200] },
    focus: [LX, 0, LZ],
  }),

  // s10 ──────────────────────────────────────────────────────────────────────
  celebrate: ({ t, k }) => {
    const stop = k > 0.72;
    const hy = LH_FRONT + 0.15;
    const ky = LH_FRONT - 0.2;
    return {
      cam: { pos: out(LH_FRONT - 0.02, 12, 4.6), look: gallery(LH_FRONT, 3, 1.6), fov: 40 },
      evil: 0,
      fog: 0,
      dusk: 0.35 * k,
      lamp: { on: 0.3, cable: 1, lever: 1 },
      actors: [
        { look: H, anim: stop ? "idle" : "cheer", at: gallery(hy, 4.4), yaw: stop ? hy + 2.2 : hy, t, mood: stop ? "worried" : "happy" },
        { look: K, anim: stop ? "point" : "cheer", at: gallery(ky, 4.6), yaw: stop ? ky - 1.9 : ky, t: t + 0.3, scale: KID_SCALE, mood: stop ? "scared" : "happy" },
      ],
      focus: [LX, GALLERY_Y, LZ],
    };
  },

  horizon: ({ t, k }) => {
    const dirYaw = LH_FRONT + Math.PI + 0.6; // away from the plaza, over the hills
    const giants = [-0.16, 0, 0.17].map((da, i) => {
      const a = dirYaw + da;
      const r = 470 + [40, 0, 60][i];
      const at: [number, number] = [LX + Math.sin(a) * r, LZ + Math.cos(a) * r];
      return G(at, yawTo([at[0], 0, at[1]], LIGHTHOUSE), t + i, { scale: 5, y: mix(-175, -120, easeOut(seg(k, 0.1 + i * 0.08, 0.8 + i * 0.06))), head: 0.12 });
    });
    const camP = out(dirYaw, 5.2, 4.2);
    return {
      cam: { pos: camP, look: mv([LX + Math.sin(dirYaw) * 300, 30, LZ + Math.cos(dirYaw) * 300], [LX + Math.sin(dirYaw) * 300, 40, LZ + Math.cos(dirYaw) * 300], k), fov: mix(50, 36, ease(k)) },
      evil: 0.22,
      fog: 0,
      dusk: 0.6,
      lamp: { on: 0.3, cable: 1, lever: 1 },
      giants,
      shake: 0.05,
      focus: [LX + Math.sin(dirYaw) * 100, 0, LZ + Math.cos(dirYaw) * 100],
    };
  },

  grinsClose: ({ t, k }) => {
    const dirYaw = LH_FRONT + Math.PI + 0.6;
    const giants = [-0.16, 0, 0.17].map((da, i) => {
      const a = dirYaw + da;
      const r = 470 + [40, 0, 60][i];
      const at: [number, number] = [LX + Math.sin(a) * r, LZ + Math.cos(a) * r];
      return G(at, yawTo([at[0], 0, at[1]], LIGHTHOUSE), t + i, { scale: 5, y: -120, head: 0.12, mouth: k > 0.3 ? 1 : 0 });
    });
    const mid = giantFace(giants[1]);
    return {
      cam: { pos: out(dirYaw, 5.2, 4.2), look: [mid[0], mid[1] - 6, mid[2]], fov: mix(22, 15, ease(k)) },
      evil: 0.3,
      fog: 0,
      dusk: 0.6,
      lamp: { on: 0.3, cable: 1, lever: 1 },
      giants,
      flash: k > 0.3 && k < 0.36 ? 0.3 : 0,
      shake: k > 0.3 ? 0.1 : 0.03,
      focus: [mid[0], 0, mid[2]],
    };
  },
};

// every shot uses the red storm palette
export const SHOTS: Record<string, Shot> = Object.fromEntries(Object.entries(RAW).map(([n, s]) => [n, (c) => ({ palette: "red", ...s(c) }) as Frame]));

export { G as giantAt };
