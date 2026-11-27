/**
 * The Same Tuesday — shots for a ~6 minute landscape (16:9) episode.
 * Places: the brothers' porch on the suburb road, Main Street (yellow car,
 * Mrs. Rosa's shop, bus stop), the plaza (fountain, clock tower with its
 * belfry, gear and lever), Mister Gray's porch, the road out of town.
 * Helpers at the top build repeated framings so the loop's repetition reads
 * visually: the same shot comes back, the same way, every Tuesday.
 */
import { LOOKS, townLook, type Anim, type Look, type Mood } from "../../../src/world/Avatar";
import { BUSSTOP, SHOP, SUBURB_Z, TOWER, TOWER_H } from "../../../src/world/layout";
import { clamp01, ease, easeOut, mix, mv, seg, street, yawTo, type ActorSpec, type Frame, type Shot, type V3 } from "../../../src/engine/kit";

// ── cast ──────────────────────────────────────────────────────────────────────
const H = LOOKS.hero;
const K = LOOKS.kid; // Leo
const KS = 0.5;
const ROSA: Look = { skin: "#c98e64", hair: "#2b1d14", hairStyle: "long", top: "#e8434f", shirt: "#ffffff", topKind: "dress", pants: "#3b3b55", shoes: "#2a2a2a" };
const GRAY: Look = { skin: "#e8b48c", hair: "#d6d6d6", hairStyle: "short", top: "#6b4a2f", shirt: "#e9e4d0", topKind: "jacket", pants: "#555b66", shoes: "#2a2a2a" };
const MAIL: Look = { skin: "#e8b48c", hair: "#24407a", hairStyle: "beanie", top: "#2f5fb0", shirt: "#2f5fb0", topKind: "hoodie", pants: "#24407a", shoes: "#2a2a2a" };
const GIRL = LOOKS.girl;

// ── places ────────────────────────────────────────────────────────────────────
const [TX, , TZ] = TOWER;
const BELFRY_Y = TOWER_H - 14 + 0.7;
const GEAR: V3 = [TX + 2.6, BELFRY_Y + 1.6, TZ - 2.4];
const LEVER: V3 = [TX - 2.8, BELFRY_Y, TZ + 2.6];
const TDOOR: V3 = [TX, 0.06, TZ + 4.6]; // the little door at the tower's foot
const HOME_X = 34;
const PORCH_Y = 0.78;
const PORCH_Z = -140.4;
const HERO_PORCH: V3 = [HOME_X, PORCH_Y, PORCH_Z];
const KID_PORCH: V3 = [HOME_X - 1.6, PORCH_Y - 0.15, PORCH_Z];
const GRAY_AT: V3 = [-16, PORCH_Y, -160.2]; // facing +z
const FOUNTAIN_KID: V3 = [-6, 0.06, 13];
const KID_TO_TOWER = yawTo(FOUNTAIN_KID, [TX, 0, TZ]);
const ROSA_AT: V3 = [SHOP[0] + 1.6, 0.3, SHOP[2]];
const BUS_ROOF: V3 = [BUSSTOP[0], 4.15, BUSSTOP[2]];
const PARKED_YELLOW: V3 = [-2.6, 0.03, 132];
const RZ = SUBURB_Z;

// ── helpers ───────────────────────────────────────────────────────────────────
const headY = (at: V3, scale = 0.62, sit = false) => at[1] + (sit ? 3.72 : 4.62) * scale;
/** A camera in front of an actor (who faces `yaw`), `dist` away, nudged `side` to their left. */
const faceCam = (at: V3, yaw: number, o: { scale?: number; sit?: boolean; dist?: number; side?: number; up?: number; fov?: number } = {}) => {
  const hy = headY(at, o.scale, o.sit);
  const d = o.dist ?? 3.2;
  const sx = Math.cos(yaw);
  const sz = -Math.sin(yaw);
  const s = o.side ?? 0.6;
  return {
    pos: [at[0] + Math.sin(yaw) * d + sx * s, hy + (o.up ?? 0.15), at[2] + Math.cos(yaw) * d + sz * s] as V3,
    look: [at[0], hy - 0.1, at[2]] as V3,
    fov: o.fov ?? 38,
  };
};
const actor = (look: Look, anim: Anim, at: V3, yaw: number, t: number, mood: Mood = "smile", extra: Partial<ActorSpec> = {}): ActorSpec => ({ look, anim, at, yaw, t, mood, ...extra });
const kid = (anim: Anim, at: V3, yaw: number, t: number, mood: Mood = "smile", extra: Partial<ActorSpec> = {}) => actor(K, anim, at, yaw, t, mood, { scale: KS, ...extra });
const DAY = { evil: 0, fog: 0 };
const tue = (time: string) => `TUE ${time}`;

// plaza crowd strolling (the loop's background life)
const PLAZA_FOLK = Array.from({ length: 12 }, (_, i) => {
  const a = i * 2.399 + 0.4;
  const r = 13 + (i % 4) * 4.5;
  return { look: townLook(500 + i), a, r };
});
const plazaFolk = (t: number, backwards = false): ActorSpec[] =>
  PLAZA_FOLK.map((p, i) => {
    const dir = (i % 2 ? 1 : -1) * (backwards ? -1 : 1);
    const ang = p.a + t * 0.05 * dir;
    const at: V3 = [Math.cos(ang) * p.r, 0.06, Math.sin(ang) * p.r];
    return { look: p.look, anim: i % 4 === 0 ? "idle" : "walk", at, yaw: ang + (dir > 0 ? Math.PI : 0) * (backwards ? -1 : 1) + (backwards ? Math.PI : 0), t: (backwards ? -t : t) + i, mood: "smile" };
  });

// porch: brothers sitting on the front step of their house
const porch = (t: number, heroMood: Mood, kidMood: Mood, kidHere = true, kidAnim: Anim = "sit"): ActorSpec[] => [
  actor(H, "sit", HERO_PORCH, Math.PI + 0.1, t, heroMood),
  ...(kidHere ? [kid(kidAnim, KID_PORCH, Math.PI - 0.15, t, kidMood)] : []),
];
const porchWide = (t: number, k: number, heroMood: Mood, kidHere: boolean, extra: Partial<Frame> = {}): Frame => ({
  cam: { pos: mv([30.4, 3.3, -149], [30.8, 3.2, -148], k), look: [33, 2.1, PORCH_Z], fov: 40 },
  ...DAY,
  dusk: 0.12,
  actors: porch(t, heroMood, "smile", kidHere),
  focus: [32, 0, -140],
  ...extra,
});

// the yellow car honking at the corner of Main Street, every morning at eight
const carHonk = (t: number, k: number, clock?: string): Frame => {
  const z = mix(104, 73, easeOut(seg(k, 0, 0.45)));
  return {
    cam: { pos: [-6.4, 2.8, 58], look: [2.6, 1.6, 80], fov: 40 },
    ...DAY,
    dusk: 0.12,
    cars: [{ color: "#ffd23f", at: [2.6, 0.03, z], yaw: Math.PI, wheelT: t * (1 - seg(k, 0.4, 0.5)), lights: k > 0.45 && k < 0.75 ? 1 : 0 }],
    actors: street(6, 110, 84, 7, "walk", t, k),
    clock,
    focus: [2, 0, 70],
  };
};

// Mrs. Rosa opening her shop and dropping her keys
const rosaShop = (t: number, k: number, clock?: string): Frame => ({
  cam: { pos: [5.5, 3.0, 69], look: [-7.6, 2.7, 75], fov: 38 },
  ...DAY,
  dusk: 0.08,
  actors: [actor(ROSA, k < 0.55 ? "work" : "lookup", ROSA_AT, -Math.PI / 2 + (k > 0.55 ? 0.7 : 0), t, k < 0.55 ? "smile" : "worried")],
  clock,
  focus: [-7, 0, 75],
});

// the girl on the red bike riding through the plaza at noon
const girlBike = (t: number, k: number, clock?: string, sepia = 0): Frame => {
  const x = mix(-34, 32, k);
  return {
    cam: { pos: [x - 6, 4.2, 19.5], look: [x + 2, 1.8, 10.5], fov: 42 },
    ...DAY,
    actors: [actor(GIRL, "bike", [x, 0.98, 10.5], Math.PI / 2, t, "happy"), ...plazaFolk(t)],
    bikes: [{ at: [x, 0.06, 10.5], yaw: Math.PI / 2, t }],
    clock,
    sepia,
    focus: [x, 0, 10],
  };
};

// the clock tower from the plaza, looking up at the clock face
const towerUp = (k: number, extra: Partial<Frame> = {}): Frame => ({
  cam: { pos: mv([TX + 16, 3, TZ + 30], [TX + 13, 4, TZ + 26], ease(k)), look: [TX, TOWER_H - 18, TZ], fov: 44 },
  ...DAY,
  tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
  focus: [TX, 0, TZ],
  ...extra,
});

// the bell swinging, seen from just outside the belfry on the +z side
const bellRing = (t: number, k: number, extra: Partial<Frame> = {}): Frame => ({
  cam: { pos: mv([TX - 1, BELFRY_Y + 6, TZ + 15], [TX - 0.5, BELFRY_Y + 5.5, TZ + 13], ease(k)), look: [TX, BELFRY_Y + 5, TZ], fov: 44 },
  ...DAY,
  tower: { bellSwing: t * 0.9, gearIn: 1, lever: 1, glow: 0.4 },
  shake: 0.25,
  focus: [TX, BELFRY_Y, TZ],
  ...extra,
});

// in the belfry: framing from just outside its open +z face
const belfry = (k: number, look: V3, actors: ActorSpec[], extra: Partial<Frame> = {}, dist = 9.5, dx = 0.6): Frame => ({
  cam: { pos: mv([TX + dx, BELFRY_Y + 3.0, TZ + dist + 0.6], [TX + dx + 0.2, BELFRY_Y + 2.9, TZ + dist], k), look, fov: 46 },
  ...DAY,
  tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
  actors,
  focus: [TX, BELFRY_Y, TZ],
  ...extra,
});
const B_HERO: V3 = [TX + 1.8, BELFRY_Y, TZ + 0.4];
const B_KID: V3 = [TX - 0.6, BELFRY_Y, TZ + 1.9];

// Mister Gray on his porch, the hero standing in front of him
const grayShot = (t: number, k: number, mood: Mood, close = false, extra: Partial<Frame> = {}): Frame => ({
  cam: close
    ? faceCam(GRAY_AT, 0.15, { sit: true, dist: 3.4, side: -0.6, fov: 36 })
    : { pos: mv([-19.5, 3.2, -151.5], [-19.8, 3.1, -152.2], k), look: [-15.6, 2.4, -158.5], fov: 42 },
  ...DAY,
  dusk: 0.3,
  actors: [actor(GRAY, "sit", GRAY_AT, 0.15, t, mood), actor(H, "idle", [-14.6, 0.3, -155.6], Math.PI + 0.35, t, "worried")],
  focus: [-15, 0, -158],
  ...extra,
});

// a rewind: everything in reverse, with the tape look
const rewound = (f: Frame, k: number): Frame => ({ ...f, rewind: 1, flash: k < 0.1 ? 0.6 * (1 - k / 0.1) : 0 });

// Leo by the fountain at noon, staring up at the tower
const fountainKid = (t: number, mood: Mood = "worried"): ActorSpec => kid("lookup", FOUNTAIN_KID, KID_TO_TOWER, t, mood);

// the family car with the boys inside
const familyCar = (x: number, t: number, moodH: Mood = "smile", moodK: Mood = "smile"): Partial<Frame> => ({
  cars: [{ color: "#3a7bd5", at: [x, 0.03, RZ + 2.6], yaw: -Math.PI / 2, wheelT: t }],
  actors: [
    actor(H, "sit", [x + 0.4, 0.55, RZ + 2.05], -Math.PI / 2, t, moodH, { scale: 0.45 }),
    kid("sit", [x + 0.4, 0.62, RZ + 3.15], -Math.PI / 2, t, moodK, { scale: 0.36 }),
  ],
});

// ── shots ─────────────────────────────────────────────────────────────────────
const RAW: Record<string, Shot> = {
  // s01 — cold open
  hookTown: ({ t, k }) => ({
    cam: { pos: mv([60, 70, 90], [40, 52, 72], ease(k)), look: [TX + 10, 14, TZ + 10], fov: 46 },
    ...DAY,
    dusk: 0.1,
    actors: plazaFolk(t),
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    clock: tue("08:00"),
    focus: [0, 0, 0],
  }),
  hookFace: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), cam: faceCam(HERO_PORCH, Math.PI + 0.1, { sit: true, dist: 3.0, side: 0.5 }) }),
  hookDay: ({ t, k }) => ({
    cam: { pos: mv([2, 3.4, 150], [2, 3.4, 140], k), look: [-1, 2.8, 120], fov: 44 },
    ...DAY,
    actors: [actor(H, "walk", [-6.4, 0.3, mix(128, 121, k)], Math.PI, t, "worried"), ...street(8, 110, 150, 3, "walk", t, k)],
    clock: `DAY ${Math.round(mix(1, 412, ease(seg(k, 0, 0.8))))}`,
    focus: [0, 0, 125],
  }),
  hookTower: ({ k }) => towerUp(k, { evil: 0.15, shake: 0.05 }),
  hookKid: ({ t }) => ({
    cam: { pos: [FOUNTAIN_KID[0] + 4, 1.3, FOUNTAIN_KID[2] + 6.5], look: [TX + 6, 14, TZ], fov: 50 },
    ...DAY,
    actors: [fountainKid(t)],
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    sepia: 0.15,
    focus: [0, 0, 0],
  }),
  hookWarn: ({ t, k }) => ({
    cam: faceCam([-6.4, 0.3, 121], Math.PI, { dist: mix(4.6, 3.0, ease(k)), side: 0.3 }),
    ...DAY,
    actors: [actor(H, "idle", [-6.4, 0.3, 121], Math.PI, t, "worried")],
    focus: [-6, 0, 121],
  }),
  hookNobody: ({ t, k }) => ({
    cam: { pos: mv([30, 46, 70], [36, 58, 84], ease(k)), look: [0, 0, 20], fov: 46 },
    ...DAY,
    actors: plazaFolk(t),
    rewind: k > 0.6 ? 1 : 0,
    focus: [0, 0, 0],
  }),

  // s02 — the loop, step by step
  showPorch: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), clock: tue("07:59") }),
  carHonk: ({ t, k }) => carHonk(t, k, tue("08:00")),
  rosaShop: ({ t, k }) => rosaShop(t, k, tue("08:15")),
  girlBike: ({ t, k }) => girlBike(t, k, tue("12:00")),
  towerThree: ({ k }) => towerUp(k, { clock: tue("03:00") }),
  bellThirteen: ({ t, k }) => bellRing(t, k, { flash: k > 0.8 ? (k - 0.8) * 3 : 0 }),

  // s03 — the rewind
  rewindSky: ({ t, k }) =>
    rewound(
      {
        cam: { pos: [50, 40, 80], look: mv([0, 40, -100], [0, 10, -100], ease(k)), fov: 50 },
        evil: 0,
        fog: 0,
        dusk: mix(0.6, 0.05, ease(k)),
        actors: plazaFolk(-t * 3, true),
        focus: [0, 0, 0],
      },
      k,
    ),
  rewindCars: ({ t, k }) => rewound({ ...carHonk(-t * 2, 1 - k), clock: tue("02:" + String(59 - Math.floor(k * 40)).padStart(2, "0")) }, 0.5),
  rewindPeople: ({ t, k }) =>
    rewound({ cam: { pos: [2, 3.4, 140], look: [-1, 2.8, 112], fov: 44 }, ...DAY, actors: street(10, 110, 150, 11, "walk", -t * 3, k), focus: [0, 0, 125] }, 0.5),
  wakePorch: ({ t, k }) => ({ ...porchWide(t, k, k < 0.3 ? "scared" : "worried", false), flash: k < 0.2 ? 0.8 * (1 - k / 0.2) : 0, clock: tue("07:59") }),
  tuesdayAgain: ({ t, k }) => ({
    cam: { pos: mv([70, 60, -100], [60, 45, -110], ease(k)), look: [30, 0, -140], fov: 44 },
    ...DAY,
    dusk: 0.12,
    actors: porch(t, "worried", "smile", false),
    clock: tue("07:59"),
    focus: [30, 0, -140],
  }),

  // s04 — the first loops
  firstTime: ({ t, k }) => ({
    cam: faceCam([-6.4, 0.3, 100], Math.PI, { dist: 3.4, side: -0.5 }),
    ...DAY,
    actors: [actor(H, k < 0.5 ? "lookup" : "idle", [-6.4, 0.3, 100], Math.PI + Math.sin(t * 2) * 0.3, t, "worried"), ...street(8, 80, 120, 21, "walk", t, k)],
    focus: [-6, 0, 100],
  }),
  toldLeo: ({ t, k }) => ({ ...porchWide(t, k, "worried", true), actors: [actor(H, "point", HERO_PORCH, Math.PI - 0.6, t, "worried"), kid("sit", KID_PORCH, Math.PI + 0.5, t, "smile")] }),
  leoSmile: ({ t }) => ({ ...porchWide(t, 0, "worried", true), cam: faceCam(KID_PORCH, Math.PI - 0.15, { scale: KS, sit: true, dist: 2.2, side: 0.3 }), actors: porch(t, "worried", "happy") }),
  secondTime: ({ t, k }) => ({
    cam: { pos: [HOME_X - 4, 3, -147], look: [HOME_X, 2.6, -139.6], fov: 40 },
    ...DAY,
    dusk: 0.1,
    actors: [actor(H, "point", [HOME_X, 0.3, -140.2], 0, t, "worried")],
    focus: [HOME_X, 0, -140],
  }),
  tenthTime: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), clock: "DAY 10" }),
  funDays: ({ t, k }) => ({
    cam: { pos: [8, 3, 20], look: [0, 2.5, 6], fov: 46 },
    ...DAY,
    actors: [actor(H, "cheer", [2, 0.06, 10], Math.PI + 0.4, t, "happy"), ...plazaFolk(t)],
    focus: [0, 0, 0],
  }),
  noHomework: ({ t, k }) => ({
    cam: { pos: [12, 4, 26], look: [12, 2, 14], fov: 46 },
    ...DAY,
    actors: [actor(H, "run", [mix(-4, 26, k), 0.06, 14], Math.PI / 2, t, "happy"), ...plazaFolk(t)],
    focus: [12, 0, 14],
  }),
  notFun: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), cam: faceCam(HERO_PORCH, Math.PI + 0.1, { sit: true, dist: mix(4.2, 3.0, ease(k)), side: -0.4 }), clock: "DAY 50" }),

  // s05 — testing the loop
  testing: ({ t, k }) => ({
    cam: { pos: [6, 2.4, 116], look: [-4.5, 2.6, 128], fov: 42 },
    ...DAY,
    actors: [actor(H, "walk", [mix(-6.4, -5.2, k), 0.3, mix(120, 128, k)], 0.2, t, "shout")],
    focus: [-3, 0, 128],
  }),
  tires: ({ t, k }) => ({
    cam: { pos: [-9, 2.6, 126.5], look: [-3.6, 1, 132], fov: 40 },
    ...DAY,
    actors: [actor(H, "work", [-4.4, 0.3, 132.4], Math.PI / 2, t, "smile")],
    dust: [{ x: -2.4, z: 130.4, amount: seg(k, 0.4, 0.6) * (1 - seg(k, 0.6, 1)), spread: 1.5, color: "#dddddd" }],
    focus: [-3, 0, 132],
  }),
  honkAgain: ({ t, k }) => carHonk(t, k, tue("08:00")),
  busRoof: ({ t, k }) => ({
    cam: { pos: [-4, 3, 164], look: [6, 6, 176], fov: 46 },
    ...DAY,
    actors: [actor(H, "shout", BUS_ROOF, -Math.PI / 2 - 0.4, t, "shout"), ...street(8, 160, 195, 31, "look", t, k)],
    focus: [5, 0, 176],
  }),
  nobody: ({ t, k }) => ({
    cam: { pos: [-4, 3, 164], look: [6, 4, 176], fov: 46 },
    ...DAY,
    dusk: 0.12,
    actors: street(8, 160, 195, 31, "walk", t, k),
    clock: tue("08:00"),
    focus: [5, 0, 176],
  }),

  // s05b — the notebook
  notebook: ({ t }) => ({ ...porchWide(t, 0, "worried", false), cam: { pos: [HOME_X + 2.8, 3.6, -146.2], look: [HOME_X, 2.0, PORCH_Z], fov: 40 }, actors: [actor(H, "work", HERO_PORCH, Math.PI + 0.1, t * 0.3, "worried", { holding: "letter" })] }),
  emptyBook: ({ t, k }) => ({
    ...porchWide(t, 0, "worried", false),
    cam: { pos: [HOME_X + 2.8, 3.6, -146.2], look: [HOME_X, 2.0, PORCH_Z], fov: 40 },
    actors: [actor(H, "work", HERO_PORCH, Math.PI + 0.1, 0.3, "scared", { holding: "letter" })],
    note: { text: " ", k: ease(seg(k, 0, 0.3)) },
    clock: tue("07:59"),
  }),
  remember: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), cam: faceCam(HERO_PORCH, Math.PI + 0.1, { sit: true, dist: mix(3.6, 2.8, ease(k)), side: 0.4 }) }),
  everyFace: ({ t, k }) => ({
    cam: { pos: mv([-10, 5, 18.5], [10, 5, 18.5], ease(k)), look: mv([-10, 2.2, 6], [10, 2.2, 6], ease(k)), fov: 42 },
    ...DAY,
    actors: plazaFolk(t),
    focus: [0, 0, 14],
  }),

  // s06 — trying to stop the bell
  stopBell: ({ t, k }) => ({
    cam: { pos: [TX + 22, 3, TZ + 30], look: [TX + 4, 4, TZ + 6], fov: 44 },
    ...DAY,
    actors: [actor(H, "run", mv([TX + 16, 0.06, TZ + 22], [TX + 1, 0.06, TZ + 6], ease(k)), yawTo([TX + 16, 0, TZ + 22], [TX, 0, TZ + 5]), t, "shout")],
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    clock: tue("02:58"),
    focus: [TX + 8, 0, TZ + 12],
  }),
  leverHold: ({ t, k }) =>
    belfry(k, [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.6], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, 0.3, "shout")], { clock: tue("02:59"), tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 } }, 9.5, -1.2),
  ringAnyway: ({ t, k }) => ({
    ...belfry(k, [TX - 0.8, BELFRY_Y + 3.5, TZ], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, 0.3, "scared")], { clock: tue("03:00"), tower: { bellSwing: t * 0.9, gearIn: 1, lever: 0, glow: 0.3 }, shake: 0.4 }, 11, -0.5),
  }),
  smallShadow: ({ t, k }) => ({
    cam: { pos: [TX + 7, 2.2, TZ + 15], look: [TX, 2, TZ + 4.6], fov: 40 },
    ...DAY,
    evil: 0.25,
    tower: { bellSwing: t * 0.9, gearIn: 1, lever: 0, glow: 0 },
    actors: [kid("run", mv([TX, 0.06, TZ + 4.8], [TX + 12, 0.06, TZ + 14], ease(seg(k, 0.25, 1))), yawTo([TX, 0, TZ + 4.8], [TX + 12, 0, TZ + 14]), t, "worried", { hidden: k < 0.25 })],
    tint: "rgba(20,30,60,0.25)",
    focus: [TX, 0, TZ + 6],
  }),

  // s06b
  wonderTower: ({ t, k }) => ({ ...towerUp(k), actors: [actor(H, "lookup", [TX + 9, 0.06, TZ + 18], yawTo([TX + 9, 0, TZ + 18], [TX, 0, TZ]), t, "worried")], cam: { pos: [TX + 18, 2.2, TZ + 28], look: [TX + 4, 9, TZ + 8], fov: 46 } }),
  notOnly: ({ t, k }) => ({ ...DAY, cam: faceCam([TX + 9, 0.06, TZ + 18], yawTo([TX + 9, 0, TZ + 18], [TX, 0, TZ]), { dist: mix(4, 2.8, ease(k)), side: 0.5 }), actors: [actor(H, "lookup", [TX + 9, 0.06, TZ + 18], yawTo([TX + 9, 0, TZ + 18], [TX, 0, TZ]), t, "worried")], focus: [TX, 0, TZ] }),

  // s07 — the figure at the fountain
  followFlash: ({ t, k }) =>
    k < 0.45
      ? { ...bellRing(t, k), flash: k > 0.3 ? (k - 0.3) * 6 : 0 }
      : { ...porchWide(t, k, "scared", false), flash: k < 0.55 ? 1 - (k - 0.45) * 10 : 0, clock: tue("07:59") },
  loop200: ({ t, k }) => ({
    cam: { pos: mv([40, 40, 50], [34, 34, 44], ease(k)), look: [0, 2, 0], fov: 44 },
    ...DAY,
    actors: [...plazaFolk(t), fountainKid(t)],
    clock: "DAY 200",
    focus: [0, 0, 0],
  }),
  fountainFigure: ({ t, k }) => ({
    cam: { pos: mv([30, 4, 34], [27, 3.6, 30], ease(k)), look: [5, 3, 9], fov: 40 },
    ...DAY,
    actors: [...plazaFolk(t), fountainKid(t)],
    clock: tue("12:00"),
    focus: [5, 0, 9],
  }),
  staring: ({ t, k }) => ({
    cam: { pos: [FOUNTAIN_KID[0] + 2.2, 1.7, FOUNTAIN_KID[2] + 3.2], look: [TX, 18, TZ], fov: 52 },
    ...DAY,
    actors: [fountainKid(t)],
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    focus: [0, 0, 0],
  }),
  yellowHoodie: ({ t, k }) => ({
    cam: { pos: mv([FOUNTAIN_KID[0] + 2.8, 2.4, FOUNTAIN_KID[2] + 3.8], [FOUNTAIN_KID[0] + 2.2, 2.2, FOUNTAIN_KID[2] + 3.0], ease(k)), look: [FOUNTAIN_KID[0], 1.6, FOUNTAIN_KID[2]], fov: 40 },
    ...DAY,
    actors: [fountainKid(t)],
    focus: [5, 0, 9],
  }),

  // s08 — it was Leo
  itWasLeo: ({ t }) => ({ ...DAY, cam: faceCam(FOUNTAIN_KID, KID_TO_TOWER, { scale: KS, dist: 2.2, side: 0.4, up: -0.1 }), actors: [fountainKid(t)], focus: [5, 0, 9] }),
  firstTuesday: ({ t, k }) => ({ ...porchWide(t, k, "smile", true), actors: porch(t, "smile", "happy"), sepia: 0.85, clock: "DAY 1" }),
  whyFountain: ({ t, k }) => ({
    cam: { pos: [16, 3, 27], look: [-2, 2, 15], fov: 42 },
    ...DAY,
    actors: [actor(H, "idle", [8, 0.06, 21], yawTo([8, 0, 21], FOUNTAIN_KID), t, "worried"), fountainKid(t)],
    focus: [12, 0, 14],
  }),
  everyLoop: ({ t, k }) => {
    const pulse = 0.5 - 0.5 * Math.cos(k * Math.PI * 2 * 3.5);
    return {
      cam: { pos: [Math.sin(0.6 + k * 0.8) * 60, 40, Math.cos(0.6 + k * 0.8) * 60], look: [0, 0, 0], fov: 44 },
      evil: 0,
      fog: 0,
      dusk: pulse * 0.7,
      actors: [fountainKid(0)],
      clock: `DAY ${Math.round(mix(200, 380, k))}`,
      focus: [0, 0, 0],
    };
  },
  tiredLeo: ({ t, k }) => ({ ...DAY, cam: faceCam(FOUNTAIN_KID, KID_TO_TOWER, { scale: KS, dist: mix(3.2, 2.0, ease(k)), side: -0.4, up: -0.1 }), actors: [kid("idle", FOUNTAIN_KID, KID_TO_TOWER, t * 0.5, "worried")], tint: "rgba(40,60,120,0.12)", focus: [5, 0, 9] }),

  // s09 — following Leo
  askLeo: ({ t, k }) => ({
    cam: { pos: [FOUNTAIN_KID[0] + 6, 3, FOUNTAIN_KID[2] + 4.5], look: [FOUNTAIN_KID[0] + 0.6, 1.6, FOUNTAIN_KID[2] - 0.4], fov: 44 },
    ...DAY,
    actors: [actor(H, "point", [FOUNTAIN_KID[0] + 1.8, 0.06, FOUNTAIN_KID[2] - 1.2], -0.9, t, "worried"), kid("idle", FOUNTAIN_KID, 2.2, t, "smile")],
    focus: [5, 0, 9],
  }),
  ranOff: ({ t, k }) => ({
    cam: { pos: [FOUNTAIN_KID[0] + 6, 3, FOUNTAIN_KID[2] + 4.5], look: [FOUNTAIN_KID[0] + 0.6, 1.6, FOUNTAIN_KID[2] - 0.4], fov: 44 },
    ...DAY,
    actors: [actor(H, "idle", [FOUNTAIN_KID[0] + 1.8, 0.06, FOUNTAIN_KID[2] - 1.2], -0.9, t, "worried"), kid("run", mv(FOUNTAIN_KID, [FOUNTAIN_KID[0] - 8, 0.06, FOUNTAIN_KID[2] + 6], k), -0.9, t, "happy")],
    focus: [5, 0, 9],
  }),
  followHim: ({ t, k }) => ({
    cam: { pos: mv([12, 8, 26], [8, 7, 22], ease(k)), look: [-8, 1, -2], fov: 46 },
    ...DAY,
    actors: [
      kid("walk", mv([-2, 0.06, 2], [-14, 0.06, -10], k), yawTo([-2, 0, 2], [-14, 0, -10]), t, "worried"),
      actor(H, "walk", mv([6, 0.06, 10], [-4, 0.06, 0], k), yawTo([6, 0, 10], [-4, 0, 0]), t, "worried"),
    ],
    focus: [-4, 0, 0],
  }),
  towerDoor: ({ t, k }) => ({
    cam: { pos: [TX + 8, 2.4, TZ + 16], look: [TX, 2.2, TZ + 4.6], fov: 40 },
    ...DAY,
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    actors: [kid(k < 0.5 ? "walk" : "idle", mv([TX + 5, 0.06, TZ + 12], [TX + 0.2, 0.06, TZ + 6], ease(seg(k, 0, 0.5))), k < 0.5 ? yawTo([TX + 5, 0, TZ + 12], [TX, 0, TZ + 6]) : Math.sin(t * 3) * 1.4, t, "worried")],
    focus: [TX, 0, TZ + 6],
  }),
  slipped: ({ t, k }) => ({
    cam: { pos: [TX + 4, 1.8, TZ + 13], look: [TX, 1.8, TZ + 4.6], fov: 38 },
    ...DAY,
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    actors: [kid("walk", mv([TX + 0.2, 0.06, TZ + 6.2], [TX, 0.06, TZ + 4.4], ease(seg(k, 0.2, 0.7))), Math.PI, t, "worried", { hidden: k > 0.7 })],
    focus: [TX, 0, TZ + 6],
  }),

  // s10 — waiting outside
  waitOutside: ({ t, k }) => ({
    cam: faceCam([TX + 4, 0.06, TZ + 8], 0.6, { dist: 3.4, side: 0.5 }),
    ...DAY,
    actors: [actor(H, "idle", [TX + 4, 0.06, TZ + 8], 0.6, t, "worried")],
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    clock: tue("02:59"),
    focus: [TX, 0, TZ + 6],
  }),
  bellFlash: ({ t, k }) => ({ ...bellRing(t, k), clock: tue("03:00"), flash: k > 0.55 ? Math.min(1, (k - 0.55) * 3) : 0 }),
  porchAgain: ({ t, k }) => ({ ...porchWide(t, k, "scared", false), flash: k < 0.3 ? 1 - k / 0.3 : 0, clock: tue("07:59") }),
  leoNext: ({ t, k }) => ({
    ...porchWide(t, k, "worried", true),
    cam: { pos: mv([31.2, 2.6, -145], [31.4, 2.6, -144.5], k), look: [33, 2.0, PORCH_Z], fov: 40 },
    actors: [actor(H, "sit", HERO_PORCH, Math.PI - 0.5, t, "worried"), kid("sit", KID_PORCH, Math.PI - 0.15, t, "happy", { roll: Math.sin(t * 5) * 0.04 })],
  }),

  // s10b — no night
  noNight: ({ t, k }) => ({
    cam: { pos: mv([40, 40, -110], [44, 44, -104], ease(k)), look: [30, 4, -140], fov: 44 },
    evil: 0,
    fog: 0,
    dusk: 0.35,
    actors: porch(t, "worried", "smile", false),
    focus: [30, 0, -140],
  }),
  sameClouds: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), dusk: 0.35, cam: { pos: [HOME_X - 2.5, 2.2, -146], look: [HOME_X + 6, 14, -120], fov: 50 } }),
  isItLeo: ({ t, k }) => ({ ...porchWide(t, k, "worried", false), dusk: 0.35, cam: faceCam(HERO_PORCH, Math.PI + 0.1, { sit: true, dist: mix(3.4, 2.7, ease(k)), side: 0.4 }) }),
  eightYears: ({ t, k }) => ({ ...porchWide(t, k, "worried", true), dusk: 0.35, actors: [actor(H, "sit", HERO_PORCH, Math.PI - 0.6, t, "worried"), kid("cheer", [HOME_X - 4, 0.3, -143], Math.PI + 0.5, t, "happy")] }),

  // s11 — Mister Gray and the legend
  toGray: ({ t, k }) => ({
    ...grayShot(t, k, "smile"),
    actors: [actor(GRAY, "sit", GRAY_AT, 0.15, t, "smile"), actor(H, "walk", mv([-8, 0.3, -152], [-14.6, 0.3, -155.6], ease(k)), yawTo([-8, 0, -152], [-14.6, 0, -155.6]), t, "worried")],
  }),
  grayIntro: ({ t }) => grayShot(t, 0, "smile", true),
  olderTown: ({ t, k }) => towerUp(k, { sepia: 0.9, dusk: 0.3 }),
  legend: ({ t }) => grayShot(t, 0, "worried", true),
  wishBell: ({ t, k }) => ({ ...bellRing(t, k), sepia: 0.9, shake: 0.1 }),
  neverEnd: ({ t, k }) => ({
    cam: { pos: mv([60, 50, 60], [70, 60, 75], ease(k)), look: [0, 0, 0], fov: 46 },
    ...DAY,
    dusk: 0.4,
    sepia: 0.9,
    actors: plazaFolk(t),
    focus: [0, 0, 0],
  }),

  // s12 — the girl and her grandfather, a hundred years ago
  before: ({ t }) => grayShot(t, 0, "worried", true),
  girlGrandpa: ({ t, k }) => {
    const a = 0.3;
    const at = (off: number, y: number): V3 => [Math.cos(a) * 22 + Math.cos(-a + Math.PI / 2) * off, y, Math.sin(a) * 22 - Math.sin(-a + Math.PI / 2) * off];
    const yaw = -a + Math.PI / 2;
    return {
      cam: { pos: mv([Math.cos(a) * 29, 2.4, Math.sin(a) * 29 + 1.2], [Math.cos(a) * 28, 2.4, Math.sin(a) * 28 + 1], k), look: [Math.cos(a) * 22, 1.8, Math.sin(a) * 22], fov: 40 },
      ...DAY,
      dusk: 0.35,
      sepia: 0.95,
      actors: [actor(GRAY, "sit", at(0.9, 0.45), yaw, t, "happy"), actor(GIRL, "sit", at(-0.7, 0.45), yaw, t, "happy", { scale: 0.48 })],
      focus: [20, 0, 6],
    };
  },
  overYear: ({ t, k }) => {
    const pulse = 0.5 - 0.5 * Math.cos(k * Math.PI * 2 * 4);
    return { cam: { pos: [Math.sin(1 + k) * 80, 55, Math.cos(1 + k) * 80], look: [0, 0, 0], fov: 46 }, evil: 0, fog: 0, dusk: pulse * 0.7, sepia: 0.95, actors: plazaFolk(t), focus: [0, 0, 0] };
  },

  // s12b — how it stops
  howStop: ({ t }) => ({ ...grayShot(t, 0, "worried"), cam: faceCam([-14.6, 0.3, -155.6], Math.PI + 0.35, { dist: 3.0, side: 0.6 }) }),
  grayLean: ({ t, k }) => ({ ...grayShot(t, k, "worried", true), cam: faceCam(GRAY_AT, 0.15, { sit: true, dist: mix(3.4, 2.4, ease(k)), side: -0.5, fov: 36 }) }),
  sameWay: ({ t, k }) => ({ ...bellRing(t, k), sepia: 0.5 }),
  onlyOne: ({ t, k }) => ({ ...grayShot(t, k, "scared", true), cam: faceCam(GRAY_AT, 0.15, { sit: true, dist: 2.3, side: -0.3, fov: 34 }) }),

  // s13 — climbing the tower again
  climbAgain: ({ t, k }) => ({
    cam: { pos: [TX + 6, 2.2, TZ + 14], look: [TX, 2.2, TZ + 4.6], fov: 40 },
    ...DAY,
    tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 },
    actors: [actor(H, "walk", mv([TX + 4, 0.06, TZ + 10], [TX, 0.06, TZ + 4.6], ease(seg(k, 0, 0.7))), yawTo([TX + 4, 0, TZ + 10], [TX, 0, TZ + 4.6]), t, "worried", { hidden: k > 0.72 })],
    clock: tue("02:50"),
    focus: [TX, 0, TZ + 6],
  }),
  carefully: ({ t, k }) => belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "work", B_HERO, Math.PI + 0.3, t, "worried")]),
  footprints: ({ t, k }) => ({
    ...belfry(k, [TX + 0.2, BELFRY_Y + 0.4, TZ + 1.6], [actor(H, "point", B_HERO, Math.PI + 0.6, t, "worried")], {}, 8, 1.2),
    dust: [{ x: TX - 0.6, z: TZ + 2.2, amount: 0.5, spread: 1.2, color: "#cfc2a8" }],
  }),
  topGear: ({ t, k }) => ({
    cam: { pos: [TX + 3.6, BELFRY_Y + 2.5, TZ + 6.5], look: [GEAR[0] - 0.4, GEAR[1], GEAR[2]], fov: 30 },
    ...DAY,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: [actor(H, "point", [TX + 1.6, BELFRY_Y, TZ - 0.4], Math.PI - 0.4, t, "worried")],
    focus: [TX, BELFRY_Y, TZ],
  }),
  scratches: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: ease(seg(k, 0, 0.3)), tallies: Math.round(mix(20, 160, ease(k))) } }),
  hundreds: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: 1, tallies: Math.round(mix(160, 380, ease(k))) } }),
  counted: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: 1, tallies: Math.round(mix(380, 412, ease(seg(k, 0, 0.6)))) }, clock: k > 0.6 ? "412" : undefined }),

  // s14 — the drawing
  drawing: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: 1, tallies: 412, drawing: ease(seg(k, 0, 0.8)) } }),
  stickFigures: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: 1, tallies: 412, drawing: 1 } }),
  oneWord: ({ t, k }) => ({ ...belfry(k, [TX + 0.8, BELFRY_Y + 1.6, TZ + 0.6], [actor(H, "idle", B_HERO, Math.PI + 0.3, t, "scared")]), wall: { k: 1, tallies: 412, drawing: 1, word: ease(seg(k, 0.3, 1)) } }),
  stayFace: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [actor(H, "idle", B_HERO, 0.1, t, "scared")]), cam: faceCam(B_HERO, 0.1, { dist: mix(3.2, 2.4, ease(k)), side: 0.4 }), shake: 0.05 }),

  // s15 — Leo on the stairs
  footsteps: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [actor(H, "idle", B_HERO, mix(0.1, Math.PI * 0.75, ease(k)), t, "scared")]), cam: faceCam(B_HERO, 0.1, { dist: 3.2, side: 0.8 }) }),
  leoArrives: ({ t, k }) => belfry(k, [TX - 0.4, BELFRY_Y + 1.4, TZ + 1.2], [actor(H, "idle", B_HERO, -1.9, t, "scared"), kid("walk", mv([TX - 3.2, BELFRY_Y, TZ - 1.5], B_KID, ease(k)), 1.0, t, "worried")]),
  notSurprised: ({ t }) => ({ ...belfry(0, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "worried"), actor(H, "idle", B_HERO, -1.9, t, "scared")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: 2.4, side: -0.3 }) }),
  toldEverything: ({ t, k }) => belfry(k, [TX - 0.3, BELFRY_Y + 1.5, TZ + 1.1], [actor(H, "idle", B_HERO, -1.9, t, "worried"), kid("idle", B_KID, 1.2, t, "worried")], { dusk: 0.15 }, 8.5, -0.4),

  // s15k — the confession
  kidConfess: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "worried")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: mix(2.6, 2.0, ease(k)), side: 0.3 }), dusk: 0.15 }),
  kidCity: ({ t, k }) => ({
    cam: { pos: mv([TX - 1.2, BELFRY_Y + 2.6, TZ - 1.4], [TX - 1.0, BELFRY_Y + 2.7, TZ - 1.0], k), look: [TX + 20, BELFRY_Y - 8, TZ + 40], fov: 52 },
    ...DAY,
    dusk: 0.2,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: [kid("idle", [TX - 1.6, BELFRY_Y, TZ + 3.6], 0.3, t, "worried")],
    focus: [TX + 20, 0, TZ + 30],
  }),
  kidWish: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "worried")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: 1.8, side: -0.2 }), dusk: 0.15 }),

  // s16 — he was scared
  stoppedTime: ({ t, k }) => belfry(k, [TX - 0.3, BELFRY_Y + 1.5, TZ + 1.1], [actor(H, "idle", B_HERO, -1.6, t, "worried"), kid("idle", B_KID, 1.2, t, "worried")], { dusk: 0.2 }, 9, 0.2),
  scared: ({ t }) => ({ ...belfry(0, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "scared")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: 2.0, side: 0.2 }), dusk: 0.2 }),
  honestly: ({ t }) => ({ ...belfry(0, [0, 0, 0], [actor(H, "idle", B_HERO, -0.6, t, "worried")]), cam: faceCam(B_HERO, -0.6, { dist: 2.8, side: -0.3 }), dusk: 0.2 }),
  partOfMe: ({ t, k }) => ({
    cam: { pos: mv([TX + 9, BELFRY_Y + 2.5, TZ + 5.5], [TX + 8.5, BELFRY_Y + 2.6, TZ + 6], k), look: [TX, BELFRY_Y + 1.6, TZ + 3.5], fov: 44 },
    ...DAY,
    dusk: 0.25,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: [actor(H, "idle", [TX + 1, BELFRY_Y, TZ + 3.4], 0.4, t, "worried"), kid("idle", [TX - 0.6, BELFRY_Y, TZ + 3.6], 0.4, t, "worried")],
    focus: [TX, BELFRY_Y, TZ],
  }),

  // s16k / s16c — Tuesdays
  kidTuesdays: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "worried")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: mix(2.4, 1.9, ease(k)), side: -0.3 }), dusk: 0.25 }),
  kidForget: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "scared")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: 1.7, side: 0.2 }), dusk: 0.25 }),
  hurt: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [actor(H, "idle", B_HERO, -0.5, t, "worried")]), cam: faceCam(B_HERO, -0.5, { dist: mix(3, 2.4, ease(k)), side: 0.3 }), dusk: 0.25 }),
  tooBusy: ({ t, k }) => ({ ...porchWide(t, k, "smile", true), actors: [actor(H, "point", [HOME_X + 3, 0.3, -143], Math.PI / 2, t, "smile"), kid("cheer", KID_PORCH, Math.PI - 0.6, t, "happy")], sepia: 0.7 }),

  // s17 — the stuck town
  lookDown: ({ t, k }) => ({
    cam: { pos: mv([TX + 1, BELFRY_Y + 4, TZ + 6], [TX + 3, BELFRY_Y + 3, TZ + 9], ease(k)), look: [6, 0, 12], fov: 52 },
    ...DAY,
    dusk: 0.25,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: plazaFolk(t),
    focus: [0, 0, 0],
  }),
  rosaAgain: ({ t, k }) => rosaShop(t, k),
  bikeAgain: ({ t, k }) => girlBike(t, k),
  grayAgain: ({ t, k }) => grayShot(t, k, "worried"),
  mailAgain: ({ t, k }) => {
    const z = mix(90, 106, k);
    return {
      cam: { pos: [5.5, 2.8, z + 9], look: [1.5, 2.2, z], fov: 42 },
      ...DAY,
      actors: [actor(MAIL, "bike", [1.5, 0.98, z], 0, t, "smile")],
      bikes: [{ at: [1.5, 0.06, z], yaw: 0, t }],
      focus: [1, 0, z],
    };
  },
  stuck: ({ t, k }) => ({ cam: { pos: [50, 60, 80], look: [0, 0, 20], fov: 46 }, ...DAY, dusk: 0.25, actors: plazaFolk(0), focus: [0, 0, 0] }),
  becauseUs: ({ t, k }) => ({
    cam: { pos: mv([TX + 18, BELFRY_Y + 2, TZ + 26], [TX + 14, BELFRY_Y + 3, TZ + 20], ease(k)), look: [TX, BELFRY_Y + 2, TZ], fov: 40 },
    ...DAY,
    dusk: 0.25,
    tower: { bellSwing: 0, gearIn: 0, lever: 0, glow: 0 },
    actors: [actor(H, "idle", [TX + 1, BELFRY_Y, TZ + 3.4], 0.4, t, "worried"), kid("idle", [TX - 0.6, BELFRY_Y, TZ + 3.6], 0.4, t, "worried")],
    focus: [TX, BELFRY_Y, TZ],
  }),

  // s18 — the gear
  toldLeo2: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [actor(H, "point", B_HERO, -1.4, t, "smile"), kid("idle", B_KID, 1.4, t, "worried")]), cam: faceCam(B_HERO, -1.4, { dist: 3.0, side: -0.6 }), dusk: 0.25 }),
  beThere: ({ t }) => ({ ...belfry(0, [0, 0, 0], [kid("idle", B_KID, -0.9, t, "worried")]), cam: faceCam(B_KID, -0.9, { scale: KS, dist: 2.0, side: 0.3 }), dusk: 0.25 }),
  quiet: ({ t, k }) => belfry(k, [TX - 0.3, BELFRY_Y + 1.5, TZ + 1.1], [actor(H, "idle", B_HERO, -1.6, t, "smile"), kid("idle", B_KID, 1.2, t, "worried")], { dusk: 0.3 }, 9.5, 0.2),
  pocket: ({ t, k }) => belfry(k, [TX - 0.6, BELFRY_Y + 1.2, TZ + 1.4], [actor(H, "idle", B_HERO, -1.6, t, "worried"), kid(k > 0.4 ? "work" : "idle", B_KID, 1.2, t * 0.4, "worried", { holding: k > 0.4 ? "gear" : null })], { dusk: 0.3 }, 7.5, -0.6),
  brassGear: ({ t }) => ({ ...belfry(0, [0, 0, 0], [kid("work", B_KID, 1.2, 0.3, "worried", { holding: "gear" })]), cam: { pos: [B_KID[0] + 3.2, BELFRY_Y + 2.4, B_KID[2] + 2.6], look: [B_KID[0] + 0.5, BELFRY_Y + 1.3, B_KID[2] + 0.4], fov: 36 }, dusk: 0.3 }),
  neverPass: ({ t, k }) => towerUp(k, { dusk: 0.3, clock: tue("03:00"), cam: { pos: mv([TX + 6, BELFRY_Y - 4, TZ + 16], [TX + 4, BELFRY_Y - 4.5, TZ + 13], ease(k)), look: [TX, TOWER_H - 18.5, TZ + 4.5], fov: 36 } }),

  // s19 — putting it back
  gearBack: ({ t, k }) => ({
    cam: { pos: [TX + 3, BELFRY_Y + 2.4, TZ + 7.5], look: [GEAR[0] - 0.6, GEAR[1] + 0.2, GEAR[2]], fov: 32 },
    ...DAY,
    dusk: 0.3,
    tower: { bellSwing: 0, gearIn: ease(seg(k, 0.1, 0.75)), lever: 0, glow: 0 },
    actors: [actor(H, "work", [TX + 2.2, BELFRY_Y, TZ - 4.0], 0, t, "worried"), kid("work", [TX + 0.6, BELFRY_Y, TZ - 3.4], 0.3, t, "worried")],
    focus: [TX, BELFRY_Y, TZ],
  }),
  handsMove: ({ k }) => towerUp(k, { dusk: 0.3, cam: { pos: [TX + 4, BELFRY_Y - 4.5, TZ + 13], look: [TX, TOWER_H - 18.5, TZ + 4.5], fov: 36 } }),
  twoFiftyEight: ({ t, k }) => ({ ...belfry(k, [LEVER[0] + 1, BELFRY_Y + 1.6, LEVER[2] - 1], [actor(H, "idle", [LEVER[0] + 1.2, BELFRY_Y, LEVER[2] - 1.6], -0.7, t, "worried"), kid("idle", [LEVER[0] + 0.4, BELFRY_Y, LEVER[2] - 0.4], -0.9, t, "worried")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 } }, 9, -1.2), clock: tue("02:58") }),
  twoFiftyNine: ({ t, k }) => ({ ...belfry(k, [LEVER[0] + 1, BELFRY_Y + 1.6, LEVER[2] - 1], [actor(H, "idle", [LEVER[0] + 1.2, BELFRY_Y, LEVER[2] - 1.6], -0.7, t, "worried"), kid("idle", [LEVER[0] + 0.4, BELFRY_Y, LEVER[2] - 0.4], -0.9, t, "worried")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 } }, 8, -1.0), clock: tue("02:59") }),
  grabLever: ({ t, k }) => belfry(k, [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.8], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, 0.15, "shout")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 } }, 9.5, -1.2),
  leverStuck: ({ t, k }) => ({ ...belfry(k, [LEVER[0], BELFRY_Y + 1.8, LEVER[2] - 0.8], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, 0.15, "shout")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: Math.sin(t * 20) * 0.04, glow: 0 } }, 8.5, -1.4), shake: 0.15 }),
  pullBoth: ({ t, k }) => belfry(k, [LEVER[0], BELFRY_Y + 1.5, LEVER[2] - 1], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, 0.15, "shout"), kid("lever", [LEVER[0] - 1.1, BELFRY_Y, LEVER[2] - 1.2], 0.3, 0.15, "shout")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: 0.05, glow: 0 } }, 8.5, -1.6),
  newWish: ({ t, k }) => ({ ...belfry(k, [0, 0, 0], [kid("lever", [LEVER[0] - 1.1, BELFRY_Y, LEVER[2] - 1.2], 0.3, 0.15, "shout")]), cam: faceCam([LEVER[0] - 1.1, BELFRY_Y, LEVER[2] - 1.2], 0.3, { scale: KS, dist: mix(2.6, 1.9, ease(k)), side: 0.4 }), clock: tue("03:00"), dusk: 0.3 }),

  // s19k — I wish for tomorrow
  wishTomorrow: ({ t, k }) => ({
    ...belfry(k, [LEVER[0] - 0.4, BELFRY_Y + 1.6, LEVER[2] - 1], [actor(H, "lever", [LEVER[0], BELFRY_Y, LEVER[2] - 1.8], 0, seg(k, 0.2, 0.6) * 0.6, "happy"), kid("lever", [LEVER[0] - 1.1, BELFRY_Y, LEVER[2] - 1.2], 0.3, seg(k, 0.2, 0.6) * 0.6, "happy")], { dusk: 0.3, tower: { bellSwing: 0, gearIn: 1, lever: ease(seg(k, 0.2, 0.6)), glow: 0 } }, 8.5, -1.4),
    flash: k > 0.6 ? 0.4 * (1 - seg(k, 0.6, 1)) : 0,
  }),

  // s20 — the bell, and the first sunset
  bellGold: ({ t, k }) => ({ ...bellRing(t, k), dusk: 0.4, tower: { bellSwing: t * 0.9, gearIn: 1, lever: 1, glow: 1 }, wave: seg(k, 0, 1) * 0.6, flash: k < 0.1 ? 0.6 * (1 - k / 0.1) : 0 }),
  waveTown: ({ t, k }) => ({
    cam: { pos: mv([-4, 52, 40], [30, 80, 100], ease(k)), look: [TX, 30, TZ], fov: 50 },
    ...DAY,
    dusk: mix(0.4, 0.6, k),
    tower: { bellSwing: t * 0.8, gearIn: 1, lever: 1, glow: 1 },
    wave: 0.4 + seg(k, 0, 1) * 0.7,
    actors: plazaFolk(t),
    focus: [TX, 0, TZ],
  }),
  sunDown: ({ t, k }) => ({
    cam: { pos: mv([TX + 2, BELFRY_Y + 6.2, TZ + 13], [TX + 3, BELFRY_Y + 7, TZ + 15], k), look: [TX, BELFRY_Y + 1.4, TZ + 1], fov: 40 },
    ...DAY,
    dusk: mix(0.6, 0.95, ease(k)),
    tower: { bellSwing: 0, gearIn: 1, lever: 1, glow: 0.3 },
    actors: [actor(H, "cheer", [TX + 0.9, BELFRY_Y, TZ + 1.6], 0.1, t, "happy"), kid("cheer", [TX - 1.3, BELFRY_Y, TZ + 2], 0.2, t + 0.3, "happy")],
    focus: [TX, BELFRY_Y, TZ],
  }),
  rosaCatch: ({ t, k }) => ({ ...rosaShop(t, k), dusk: 0.8, actors: [actor(ROSA, k > 0.4 ? "cheer" : "work", ROSA_AT, -Math.PI / 2 + 0.6, t, "happy")] }),
  bikeHome: ({ t, k }) => {
    const x = mix(-60, -20, k);
    return {
      cam: { pos: [x + 7, 2.8, RZ - 5], look: [x + 1, 2.0, RZ + 2], fov: 42 },
      ...DAY,
      dusk: 0.85,
      actors: [actor(GIRL, "bike", [x, 0.98, RZ + 2], Math.PI / 2, t, "happy")],
      bikes: [{ at: [x, 0.03, RZ + 2], yaw: Math.PI / 2, t }],
      focus: [x, 0, RZ],
    };
  },
  grayLaugh: ({ t, k }) => ({
    ...grayShot(t, k, "happy"),
    dusk: 0.85,
    actors: [actor(GRAY, k > 0.3 ? "cheer" : "lookup", k > 0.3 ? [-16, 0.3, -159.4] : GRAY_AT, 0.15, t, "happy")],
  }),
  sleepNight: ({ t, k }) => ({
    cam: { pos: mv([40, 8, -152], [38, 7, -151], ease(k)), look: [32, 12, -120], fov: 50 },
    tint: "rgba(10,20,70,0.25)",
    evil: 1,
    fog: 0.1,
    palette: "night",
    focus: [32, 0, -140],
  }),

  // s21 — Wednesday
  wednesday: ({ t, k }) => ({
    cam: { pos: mv([70, 60, -100], [60, 45, -110], ease(k)), look: [30, 0, -140], fov: 44 },
    ...DAY,
    dusk: 0.1,
    cars: [{ color: "#3a7bd5", at: [HOME_X - 4, 0.03, RZ + 2.6], yaw: -Math.PI / 2 }],
    clock: "WED 08:00",
    focus: [30, 0, -140],
  }),
  packCar: ({ t, k }) => ({
    cam: { pos: [HOME_X + 4, 2.8, RZ - 5], look: [HOME_X - 3, 1.6, RZ + 2.6], fov: 42 },
    ...DAY,
    dusk: 0.1,
    cars: [{ color: "#3a7bd5", at: [HOME_X - 4, 0.03, RZ + 2.6], yaw: -Math.PI / 2 }],
    actors: [actor(H, "walk", mv([HOME_X, 0.3, -141.5], [HOME_X - 2, 0.3, RZ + 5], k), Math.PI + 0.4, t, "smile"), kid("walk", mv([HOME_X - 1.4, 0.3, -141.8], [HOME_X - 3.2, 0.3, RZ + 5.2], k), Math.PI + 0.3, t, "happy")],
    focus: [HOME_X - 3, 0, RZ],
  }),
  driveOut: ({ t, k }) => {
    const x = mix(HOME_X - 10, HOME_X - 40, k);
    return { cam: { pos: [x + 12, 3.4, RZ - 6], look: [x - 2, 1.6, RZ + 2.6], fov: 44 }, ...DAY, dusk: 0.1, ...familyCar(x, t), focus: [x, 0, RZ] };
  },
  smiling: ({ t, k }) => {
    const x = mix(-100, -110, k);
    return { cam: { pos: [x - 4.4, 2.5, RZ + 2.6], look: [x + 0.4, 2.0, RZ + 2.6], fov: 30 }, ...DAY, dusk: 0.1, ...familyCar(x, t, "happy", "happy"), focus: [x, 0, RZ] };
  },
  lookBack: ({ t, k }) => ({
    cam: { pos: [-150, 18, RZ - 2], look: [TX, 30, TZ], fov: mix(26, 16, ease(k)) },
    ...DAY,
    dusk: 0.1,
    tower: { bellSwing: 0, gearIn: 1, lever: 1, glow: 0 },
    clock: "WED 08:07",
    focus: [TX, 0, TZ],
  }),
  normal: ({ t, k }) => {
    const x = mix(-150, -170, k);
    return { cam: { pos: [x - 10, 4, RZ - 8], look: [x, 1.6, RZ + 2.6], fov: 44 }, ...DAY, dusk: 0.1, ...familyCar(x, t, "happy", "happy"), focus: [x, 0, RZ] };
  },
  radio: ({ t, k }) => {
    const x = mix(-180, -188, k);
    return { cam: { pos: [x - 4.4, 2.5, RZ + 2.6], look: [x + 0.4, 2.0, RZ + 2.6], fov: 28 }, ...DAY, dusk: 0.1, ...familyCar(x, t, "smile", "smile"), focus: [x, 0, RZ] };
  },
  tuesdayRadio: ({ t, k }) => {
    const x = -190;
    return {
      cam: { pos: [x - 4.4, 2.5, RZ + 2.6], look: [x + 0.4, 2.0, RZ + 2.6], fov: mix(28, 20, ease(k)) },
      ...DAY,
      dusk: 0.1,
      ...familyCar(x, 0, "scared", "scared"),
      clock: k > 0.55 ? tue("08:00") : "WED 08:07",
      rewind: k > 0.55 && k < 0.8 ? 1 : 0,
      shake: k > 0.55 ? 0.1 : 0,
      focus: [x, 0, RZ],
    };
  },

  // s22 — not me
  lookLeo: ({ t }) => {
    const x = -190;
    return { cam: { pos: [x - 3.6, 2.4, RZ + 2.3], look: [x + 0.4, 2.1, RZ + 2.6], fov: 22 }, ...DAY, dusk: 0.1, ...familyCar(x, 0, "scared", "worried"), focus: [x, 0, RZ] };
  },
  kidPale: ({ t, k }) => {
    const x = -190;
    return { cam: { pos: [x - 3.2, 2.2, RZ + 3.15], look: [x + 0.4, 1.95, RZ + 3.15], fov: mix(22, 16, ease(k)) }, ...DAY, dusk: 0.1, ...familyCar(x, 0, "scared", "scared"), tint: "rgba(40,60,120,0.15)", focus: [x, 0, RZ] };
  },
  notMe: ({ t }) => {
    const x = -190;
    return { cam: { pos: [x - 2.8, 2.15, RZ + 3.15], look: [x + 0.4, 1.95, RZ + 3.15], fov: 15 }, ...DAY, dusk: 0.1, ...familyCar(x, 0, "scared", "scared"), tint: "rgba(40,60,120,0.2)", focus: [x, 0, RZ] };
  },
  towerFar: ({ t, k }) => ({
    cam: { pos: [-190, 18, RZ - 2], look: [TX, 30, TZ], fov: mix(20, 11, ease(k)) },
    evil: ease(seg(k, 0.1, 0.6)) * 0.4,
    fog: 0,
    dusk: 0.1,
    palette: "night",
    tower: { bellSwing: t * 0.9, gearIn: 1, lever: 1, glow: 0.8 },
    clock: tue("03:00"),
    shake: 0.05,
    focus: [TX, 0, TZ],
  }),
};

export const SHOTS: Record<string, Shot> = RAW;
export { GRAY, ROSA, clamp01 };
