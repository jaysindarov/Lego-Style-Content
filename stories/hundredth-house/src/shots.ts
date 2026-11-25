/**
 * The Hundredth House — shots. A night-time mystery on the suburb road
 * (z = -150). The extra house stands in the gap between the brothers' house
 * (x 34) and the neighbours' (x 16); see src/world/MysteryHouse.tsx.
 */
import { LOOKS, townLook, type Look } from "../../../src/world/Avatar";
import { doorStep, mailbox, type MysteryHouseState } from "../../../src/world/MysteryHouse";
import { SUBURB_Z } from "../../../src/world/layout";
import { clockStr, ease, easeOut, mix, mv, seg, type ActorSpec, type Frame, type Shot, type V3 } from "../../../src/engine/kit";

const H = LOOKS.hero;
const K = LOOKS.kid;
const KS = 0.5;
const MAIL: Look = { skin: "#e8b48c", hair: "#24407a", hairStyle: "beanie", top: "#2f5fb0", shirt: "#2f5fb0", topKind: "hoodie", pants: "#24407a", shoes: "#2a2a2a" };
const LADY: Look = { skin: "#f2c9a0", hair: "#8d8d8d", hairStyle: "long", top: "#8a4fd6", shirt: "#ffffff", topKind: "jacket", pants: "#3b3b55", shoes: "#f0f0f0" };
const GRAY: Look = { skin: "#e8b48c", hair: "#d6d6d6", hairStyle: "short", top: "#6b4a2f", shirt: "#e9e4d0", topKind: "jacket", pants: "#555b66", shoes: "#2a2a2a" };

const RZ = SUBURB_Z; // road centre line
const LOT: [number, number] = [25, -134]; // the gap where the house appears
const HOME_X = 34; // the brothers' house
const NEIGH_X = 16; // the neighbours' house
const DOOR = doorStep({ at: LOT }, 1.0); // just in front of the door
const MBOX = mailbox({ at: LOT });
const PORCH_Y = 0.78;
const READ: V3 = [23.6, 0.3, -142.4]; // where the hero stands reading the letter // sitting height on a porch step
const GRAY_AT: V3 = [-16, PORCH_Y, -160.2]; // Mister Gray on his porch across the road, facing +z

const house = (p: Partial<MysteryHouseState> = {}): MysteryHouseState => ({ at: LOT, appear: 1, door: 0, glow: 1, ...p });
const NIGHT = { evil: 1, fog: 0.25 };

// a few neighbours out in the evening, for the day shot
const strollers = (t: number): ActorSpec[] =>
  [0, 1, 2, 3].map((i) => {
    const dir = i % 2 ? 1 : -1;
    const x = mix(-30, 60, ((i * 0.27 + t * 0.03 * dir) % 1 + 1) % 1);
    return { look: townLook(300 + i), anim: "walk", at: [x, 0.3, i % 2 ? -143.5 : -156.5] as V3, yaw: dir > 0 ? Math.PI / 2 : -Math.PI / 2, t: t + i, mood: "smile" };
  });

const RAW: Record<string, Shot> = {
  // s01 ────────────────────────────────────────────────────────────────────────
  townDay: ({ t, k }) => ({
    cam: { pos: mv([70, 80, -215], [52, 52, -195], ease(k)), look: [25, 0, -142], fov: 50 },
    evil: 0,
    fog: 0,
    actors: strollers(t),
    focus: [25, 0, -145],
  }),

  houseRow: ({ t, k }) => ({
    cam: { pos: mv([-6, 3.2, -151], [0, 3.2, -151], k), look: mv([40, 4, -137], [46, 4, -137], k), fov: 50 },
    evil: 0,
    fog: 0,
    dusk: 0.35,
    actors: strollers(t + 2),
    focus: [25, 0, -140],
  }),

  nightFall: ({ k }) => ({
    cam: { pos: [26, 2.4, -152], look: mv([25, 8, -130], [25, 26, -110], ease(k)), fov: 56 },
    evil: ease(seg(k, 0.05, 0.7)),
    fog: ease(seg(k, 0.3, 1)) * 0.25,
    dusk: 0.5 * (1 - k),
    focus: [25, 0, -138],
  }),

  // s02 ────────────────────────────────────────────────────────────────────────
  mailNight: ({ t, k }) => {
    const x = mix(-14, 4, k);
    return {
      cam: { pos: [x + 6, 2.8, RZ - 6], look: [x + 1, 2.2, RZ + 2], fov: 50 },
      ...NIGHT,
      actors: [{ look: MAIL, anim: "bike", at: [x, 0.95, RZ + 2], yaw: Math.PI / 2, t, mood: "smile" }],
      bikes: [{ at: [x, 0.03, RZ + 2], yaw: Math.PI / 2, t }],
      focus: [x, 0, RZ],
    };
  },

  mailCount: ({ t }) => ({
    cam: { pos: [25.5, 2.8, RZ + 8.5], look: [22, 2.6, RZ + 3], fov: 42 },
    ...NIGHT,
    actors: [{ look: MAIL, anim: "point", at: [22, 0.03, RZ + 3], yaw: 0.35, t, mood: "smile" }],
    bikes: [{ at: [21, 0.03, RZ + 3.6], yaw: Math.PI / 2 }],
    focus: [22, 0, RZ],
  }),

  houseAppear: ({ t, k }) => {
    const a = easeOut(seg(k, 0.1, 0.75));
    return {
      cam: { pos: mv([20, 2.0, RZ - 4], [20.5, 2.2, RZ - 3], k), look: [25, 7, LOT[1]], fov: 60 },
      ...NIGHT,
      houses: [house({ appear: a, glow: a })],
      actors: [{ look: MAIL, anim: "idle", at: [22, 0.03, RZ + 3], yaw: 0.2, t, mood: "scared" }],
      bikes: [{ at: [21, 0.03, RZ + 3.6], yaw: Math.PI / 2 }],
      shake: k > 0.1 && k < 0.75 ? 0.12 : 0,
      focus: [25, 0, -140],
    };
  },

  bikeLot: () => ({
    cam: { pos: [25.5, 2.6, RZ - 2], look: [25, 1.8, -136], fov: 52 },
    evil: 0.15,
    fog: 0.1,
    dusk: 0.45,
    bikes: [{ at: [25, 0.32, -142.4], yaw: Math.PI / 2, tilt: 1.45 }],
    focus: [25, 0, -140],
  }),

  bikeClose: ({ k }) => ({
    cam: { pos: mv([27.2, 0.9, -145.6], [26.6, 0.8, -145], k), look: [25, 0.6, -142.4], fov: 40 },
    evil: 0.25,
    fog: 0.12,
    dusk: 0.45,
    bikes: [{ at: [25, 0.32, -142.4], yaw: Math.PI / 2, tilt: 1.45 }],
    focus: [25, 0, -142],
  }),

  // s03 ────────────────────────────────────────────────────────────────────────
  streetNight: ({ k }) => ({
    cam: { pos: mv([-10, 4, RZ - 2], [4, 4, RZ - 2], ease(k)), look: [40, 3, -138], fov: 50 },
    ...NIGHT,
    fog: 0.35,
    focus: [20, 0, -140],
  }),

  houseGlow: ({ k }) => ({
    cam: { pos: mv([25, 3.5, RZ - 9], [25, 3.6, RZ - 6], ease(k)), look: [25, 6.5, LOT[1]], fov: 50 },
    ...NIGHT,
    houses: [house()],
    focus: [25, 0, -140],
  }),

  // s04 ────────────────────────────────────────────────────────────────────────
  neighborLook: ({ t }) => ({
    cam: { pos: [23.5, 3.2, -146.5], look: [17.5, 3.4, -140.6], fov: 46 },
    ...NIGHT,
    houses: [house()],
    actors: [{ look: LADY, anim: "idle", at: [NEIGH_X + 1, 0.3, -140.6], yaw: Math.PI / 2 - 0.3, t, mood: "worried" }],
    focus: [22, 0, -140],
  }),

  neighborKnock: ({ t, k }) => {
    const walk = seg(k, 0, 0.45);
    const at: V3 = mv([NEIGH_X + 3, 0.3, -141.2], [DOOR[0], 0.3, DOOR[2] + 0.3], ease(walk));
    return {
      cam: { pos: [22.5, 3.6, -146], look: [25, 2.6, -138.6], fov: 48 },
      ...NIGHT,
      houses: [house()],
      actors: [{ look: LADY, anim: walk < 1 ? "walk" : "bang", at, yaw: walk < 1 ? 0.9 : 0, t: walk < 1 ? t : t * 0.6, mood: "worried" }],
      focus: [25, 0, -140],
    };
  },

  doorOpen: ({ t, k }) => ({
    cam: { pos: [26.5, 1.8, -146], look: [25, 2.4, -138.6], fov: 46 },
    ...NIGHT,
    houses: [house({ door: ease(seg(k, 0.1, 0.8)) })],
    actors: [{ look: LADY, anim: "idle", at: [DOOR[0], 0.3, DOOR[2] + 0.3], yaw: 0, t, mood: "scared" }],
    focus: [25, 0, -140],
  }),

  neighborIn: ({ t, k }) => {
    const z = mix(DOOR[2] + 0.3, -137.6, ease(seg(k, 0, 0.55)));
    return {
      cam: { pos: [25, 3.3, -147], look: [25, 2.2, -138.6], fov: 44 },
      ...NIGHT,
      houses: [house({ door: 1 - ease(seg(k, 0.6, 0.72)) })],
      actors: [{ look: LADY, anim: "walk", at: [25, 0.3, z], yaw: 0, t, mood: "worried", hidden: z > -138.3 }],
      focus: [25, 0, -140],
    };
  },

  emptyMorning: ({ k }) => ({
    cam: { pos: mv([25, 6, RZ - 10], [25, 5, RZ - 7], ease(k)), look: [25, 2, -136], fov: 54 },
    evil: 0.15,
    fog: 0.15,
    dusk: 0.5,
    focus: [25, 0, -140],
  }),

  // s05 ────────────────────────────────────────────────────────────────────────
  grayPorch: ({ t, k }) => ({
    cam: { pos: mv([-12.5, 3.2, -152], [-13.5, 3.1, -153.5], k), look: [-16, 2.4, -160], fov: 48 },
    evil: 0,
    fog: 0,
    dusk: 0.6,
    actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0.2, t, mood: "worried" }],
    focus: [-16, 0, -160],
  }),

  grayFace: ({ t, k }) => ({
    cam: { pos: mv([-15.4, 3.2, -156.2], [-15.5, 3.15, -156.8], k), look: [-16, 3.0, -160.2], fov: 36 },
    evil: 0,
    fog: 0,
    dusk: 0.6,
    actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0.15, t, mood: "worried" }],
    focus: [-16, 0, -160],
  }),

  grayClock: ({ t, k }) => ({
    cam: { pos: [-15.5, 3.1, -157], look: [-16, 3.0, -160.2], fov: 32 },
    evil: 0,
    fog: 0,
    dusk: 0.6,
    actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0.15, t, mood: "scared" }],
    clock: clockStr(13 - k * 13),
    focus: [-16, 0, -160],
  }),

  grayWindow: ({ t, k }) => ({
    cam: { pos: mv([-14.5, 3.0, -155], [-12, 4, -151], ease(k)), look: [-16, 3, -160.2], fov: 44 },
    evil: 0,
    fog: 0,
    dusk: 0.6,
    actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0.9, t, mood: "worried" }],
    focus: [-16, 0, -160],
  }),

  // s06 ────────────────────────────────────────────────────────────────────────
  porchSit: ({ t, k }) => ({
    cam: { pos: mv([30.5, 3.2, -149], [31, 3.1, -148], k), look: [33, 2.2, -140.4], fov: 46 },
    ...NIGHT,
    actors: [
      { look: H, anim: "sit", at: [HOME_X, PORCH_Y, -140.4], yaw: Math.PI + 0.15, t, mood: "smile" },
      { look: K, anim: "sit", at: [HOME_X - 1.6, PORCH_Y - 0.15, -140.4], yaw: Math.PI - 0.2, t, scale: KS, mood: "worried" },
    ],
    focus: [30, 0, -140],
  }),

  kidCount: ({ t, k }) => ({
    cam: { pos: mv([28, 2.0, -145.2], [28.3, 2.0, -144.8], k), look: [32.6, 1.9, -141.2], fov: 42 },
    ...NIGHT,
    actors: [
      { look: K, anim: "point", at: [32.2, 0.3, -141.4], yaw: -Math.PI / 2 - 0.3, t, scale: KS, mood: "smile" },
      { look: H, anim: "sit", at: [HOME_X, PORCH_Y, -140.4], yaw: Math.PI + 0.6, t, mood: "worried" },
    ],
    focus: [30, 0, -140],
  }),

  countPan: ({ k }) => {
    const x = mix(-30, 14, ease(k));
    return {
      cam: { pos: [x, 4, RZ - 1], look: [x + 9, 4, -139], fov: 50 },
      ...NIGHT,
      focus: [x + 8, 0, -140],
    };
  },

  kidHundred: ({ t, k }) => ({
    cam: { pos: [28.4, 2.0, -145], look: [32.2, 1.9, -141.4], fov: 40 },
    ...NIGHT,
    houses: [house({ appear: k > 0.3 ? 1 : 0 })],
    actors: [{ look: K, anim: "point", at: [32.2, 0.3, -141.4], yaw: -Math.PI / 2 - 0.3, t, scale: KS, mood: k > 0.3 ? "scared" : "worried" }],
    flash: k > 0.3 && k < 0.42 ? 0.5 : 0,
    focus: [30, 0, -140],
  }),

  // s07 ────────────────────────────────────────────────────────────────────────
  revealHouse: ({ k }) => ({
    cam: { pos: mv([25, 1.2, RZ - 3], [25, 1.3, RZ - 1.5], k), look: [25, 8, LOT[1]], fov: 62 },
    ...NIGHT,
    houses: [house()],
    shake: 0.1,
    focus: [25, 0, -140],
  }),

  betweenHouses: ({ k }) => ({
    cam: { pos: mv([25, 7, RZ - 7], [25, 6, RZ - 5], ease(k)), look: [25, 5, -136], fov: 62 },
    ...NIGHT,
    houses: [house()],
    actors: [
      { look: H, anim: "lookup", at: [HOME_X - 2, 0.3, -142.5], yaw: -0.5, t: 0.3, mood: "scared" },
      { look: K, anim: "lookup", at: [HOME_X - 3.4, 0.3, -142.8], yaw: -0.4, t: 0.6, scale: KS, mood: "scared" },
    ],
    focus: [25, 0, -140],
  }),

  mailboxGlow: ({ t, k }) => {
    const at: V3 = mv([HOME_X - 3, 0.3, -143.4], READ, ease(seg(k, 0, 0.6)));
    return {
      cam: { pos: [18.8, 2.3, -146], look: [MBOX[0] + 0.6, 1.6, MBOX[2]], fov: 46 },
      ...NIGHT,
      houses: [house({ letter: 1 })],
      actors: [{ look: H, anim: k < 0.6 ? "walk" : "idle", at, yaw: k < 0.6 ? -1.4 : -Math.PI / 2 - 0.4, t, mood: "worried" }],
      focus: [24, 0, -141],
    };
  },

  letterOpen: ({ t }) => ({
    cam: { pos: [23.9, 2.6, -146.8], look: [23.6, 2.3, -142.4], fov: 40 },
    ...NIGHT,
    houses: [house({ letter: 0 })],
    actors: [{ look: H, anim: "work", at: READ, yaw: Math.PI, t: 0.2 + t * 0.1, mood: "worried", holding: "letter" }],
    focus: [24, 0, -141],
  }),

  letterClose: ({ t, k }) => ({
    cam: { pos: mv([23.7, 3.0, -145.2], [23.68, 2.98, -144.9], k), look: [23.6, 2.85, -142.4], fov: 36 },
    ...NIGHT,
    houses: [house({ letter: 0 })],
    actors: [{ look: H, anim: "work", at: READ, yaw: Math.PI, t: 0.2, mood: "scared", holding: "letter" }],
    focus: [24, 0, -141],
  }),

  // s08 ────────────────────────────────────────────────────────────────────────
  letterWords: ({ t, k }) => ({
    cam: { pos: [23.9, 2.6, -146.8], look: [23.6, 2.3, -142.4], fov: 40 },
    ...NIGHT,
    houses: [house({ letter: 0 })],
    actors: [{ look: H, anim: "work", at: READ, yaw: Math.PI, t: 0.2, mood: "scared", holding: "letter" }],
    note: { text: "Don't let him go inside.", k: ease(seg(k, 0, 0.25)) },
    focus: [24, 0, -141],
  }),

  heroTurn: ({ t, k }) => ({
    cam: { pos: [21.5, 3.0, -148], look: [24.4, 2.6, -140.5], fov: 44 },
    ...NIGHT,
    houses: [house({ letter: 0, door: 1 })],
    actors: [{ look: H, anim: "idle", at: READ, yaw: mix(Math.PI, 0.3, ease(k)), t, mood: "scared", holding: "letter" }],
    focus: [24, 0, -141],
  }),

  doorWide: ({ t, k }) => ({
    cam: { pos: mv([25.6, 3, -151], [25.5, 3, -150], k), look: [25, 2.2, -138.6], fov: 40 },
    ...NIGHT,
    houses: [house({ letter: 0, door: 1 })],
    actors: [{ look: K, anim: "walk", at: [25, 0.3, mix(-142.6, -141.6, k)], yaw: 0, t, scale: KS, mood: "smile" }],
    focus: [25, 0, -140],
  }),

  kidWalkIn: ({ t, k }) => ({
    cam: { pos: [27, 2.2, -147.5], look: [25, 1.5, -139.3], fov: 40 },
    ...NIGHT,
    houses: [house({ letter: 0, door: 1 })],
    actors: [{ look: K, anim: "walk", at: [25, 0.3, mix(-141.6, -139.0, ease(k))], yaw: 0, t, scale: KS, mood: "smile" }],
    focus: [25, 0, -140],
  }),

  kidDoorway: ({ t }) => ({
    cam: { pos: [25.2, 1.9, -145], look: [25, 1.4, -139.0], fov: 36 },
    ...NIGHT,
    houses: [house({ letter: 0, door: 1 })],
    actors: [{ look: K, anim: "shout", at: [25, 0.3, -139.0], yaw: Math.PI, t, scale: KS, mood: "happy" }],
    focus: [25, 0, -140],
  }),

  // s09 ────────────────────────────────────────────────────────────────────────
  heroRun: ({ t, k }) => ({
    cam: { pos: [31, 2.6, -146], look: [24, 2, -140.5], fov: 50 },
    ...NIGHT,
    houses: [house({ door: 1 })],
    actors: [
      { look: H, anim: "run", at: mv(READ, [24.4, 0.3, -140.6], ease(k)), yaw: 0.9, t, mood: "scared" },
      { look: K, anim: "idle", at: [25, 0.3, -139.0], yaw: 0, t, scale: KS, mood: "smile" },
    ],
    focus: [25, 0, -140],
  }),

  runClock: ({ t, k }) => ({
    cam: { pos: [23.8, 3.6, -149], look: [25, 2, -139.8], fov: 46 },
    ...NIGHT,
    houses: [house({ door: 1 })],
    actors: [
      { look: H, anim: "run", at: mv([24.2, 0.3, -142.6], [24.6, 0.3, -140.4], ease(k)), yaw: 0.2, t, mood: "shout" },
      { look: K, anim: "idle", at: [25, 0.3, -139.0], yaw: 0, t, scale: KS, mood: "smile" },
    ],
    clock: clockStr(13 - k * 6),
    focus: [25, 0, -140],
  }),

  grabHand: ({ t, k }) => ({
    cam: { pos: [30, 2.8, -144.5], look: [25, 1.6, -139.8], fov: 44 },
    ...NIGHT,
    houses: [house({ door: 1 })],
    actors: [
      { look: H, anim: "point", at: [24.8, 0.3, -140.5], yaw: 0, t, mood: "shout" },
      { look: K, anim: k > 0.4 ? "grabbed" : "idle", at: mv([25, 0.3, -139.0], [25, 0.3, -139.6], ease(seg(k, 0.4, 1))), yaw: Math.PI, t, scale: KS, mood: "scared" },
    ],
    clock: "00:03",
    focus: [25, 0, -140],
  }),

  doorSlam: ({ t, k }) => {
    const back = ease(seg(k, 0, 0.5));
    return {
      cam: { pos: [28.6, 2.4, -150], look: [25, 2.2, -140], fov: 48 },
      ...NIGHT,
      houses: [house({ door: 1 - ease(seg(k, 0.3, 0.4)) })],
      actors: [
        { look: H, anim: back < 1 ? "run" : "idle", at: mv([24.8, 0.3, -140.5], [24, 0.3, -144.5], back), yaw: Math.PI, t, mood: "scared" },
        { look: K, anim: back < 1 ? "run" : "idle", at: mv([25, 0.3, -139.6], [25.6, 0.3, -144.8], back), yaw: Math.PI, t: t + 0.2, scale: KS, mood: "scared" },
      ],
      shake: k > 0.33 && k < 0.5 ? 0.4 : 0,
      focus: [25, 0, -141],
    };
  },

  houseFold: ({ t, k }) => ({
    cam: { pos: [25, 3, RZ - 3], look: [25, 6, LOT[1]], fov: 60 },
    ...NIGHT,
    houses: [house({ fold: ease(seg(k, 0.1, 0.8)), glow: 1 - seg(k, 0.5, 0.8), appear: k < 0.82 ? 1 : 0 })],
    actors: [
      { look: H, anim: "lookup", at: [24, 0.3, -144.5], yaw: 0, t, mood: "scared" },
      { look: K, anim: "lookup", at: [25.6, 0.3, -144.8], yaw: 0, t: t + 0.4, scale: KS, mood: "scared" },
    ],
    flash: k > 0.78 && k < 0.86 ? 0.35 : 0,
    focus: [25, 0, -140],
  }),

  emptyLot: ({ t }) => ({
    cam: { pos: [25, 12, -161], look: [25, 0, -139], fov: 50 },
    ...NIGHT,
    actors: [
      { look: H, anim: "idle", at: [24, 0.3, -144.5], yaw: 0, t, mood: "worried" },
      { look: K, anim: "idle", at: [25.6, 0.3, -144.8], yaw: 0.2, t, scale: KS, mood: "worried" },
    ],
    focus: [25, 0, -140],
  }),

  // s10 ────────────────────────────────────────────────────────────────────────
  sunrise: ({ t, k }) => ({
    cam: { pos: mv([30, 3, -149], [30.5, 3.4, -148], k), look: [33, 2, -140.4], fov: 46 },
    evil: 0.1,
    fog: 0,
    dusk: 0.8,
    actors: [
      { look: H, anim: "sit", at: [HOME_X, PORCH_Y, -140.4], yaw: Math.PI + 0.1, t, mood: "smile" },
      { look: K, anim: "sit", at: [HOME_X - 1.4, PORCH_Y - 0.15, -140.4], yaw: Math.PI - 0.1, t, scale: KS, mood: "smile" },
    ],
    focus: [30, 0, -140],
  }),

  kidPoint: ({ t, k }) => ({
    cam: { pos: [29.2, 2.2, -146], look: [33, 2.0, -141.3], fov: 42 },
    evil: 0.2,
    fog: 0,
    dusk: 0.8,
    actors: [
      { look: K, anim: "point", at: [32.6, 0.3, -141.4], yaw: -Math.PI / 2 - 0.25, t, scale: KS, mood: "scared" },
      { look: H, anim: k > 0.4 ? "lookup" : "sit", at: k > 0.4 ? [HOME_X, 0.3, -141.2] : [HOME_X, PORCH_Y, -140.4], yaw: Math.PI + 0.9, t, mood: "worried" },
    ],
    focus: [30, 0, -140],
  }),

  twoHouses: ({ k }) => ({
    cam: { pos: mv([-12, 3.2, RZ - 3], [-24, 3, RZ - 6], ease(k)), look: [-25, 6.5, -134], fov: 50 },
    evil: 0.35,
    fog: 0.1,
    dusk: 0.8,
    houses: [{ at: [-25, -134], appear: easeOut(seg(k, 0.15, 0.6)), glow: 1, number: "101" }],
    shake: k > 0.15 && k < 0.6 ? 0.06 : 0,
    focus: [-20, 0, -140],
  }),
};

// every shot uses the night palette
export const SHOTS: Record<string, Shot> = Object.fromEntries(Object.entries(RAW).map(([n, s]) => [n, (c) => ({ palette: "night", ...s(c) }) as Frame]));
export { house };
