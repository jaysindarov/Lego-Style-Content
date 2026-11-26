/**
 * Echo Night — shots. After the thirteenth bell, echoes come out of the fog and
 * copy people perfectly, except for one thing: an echo casts no shadow.
 *
 * Places: the brothers' house is the slate house at LOT on the suburb road
 * (z = -150); Mister Gray lives across the road; the escape runs west along
 * the suburb road, north up the x = 0 road into the plaza, to the lighthouse.
 *
 * The echo Milo is always `noShadow`. From the porch (the narrator's point of
 * view, camera looking -z) the real Milo stands on the LEFT and the echo on the
 * RIGHT, which is what the script says. `makeShots(true)` re-frames every shot
 * for the vertical Short.
 */
import { LOOKS, townLook, type Look, type Mood, type Anim } from "../../../src/world/Avatar";
import { type MysteryHouseState } from "../../../src/world/MysteryHouse";
import { gallery, LAMP, LH_FRONT, SWITCH_YAW } from "../../../src/world/Lighthouse";
import { GALLERY_Y, LIGHTHOUSE, SUBURB_Z, TOWER, TOWER_H } from "../../../src/world/layout";
import { clamp01, clockStr, ease, easeOut, mix, mv, seg, yawTo, type ActorSpec, type Frame, type Shot, type V3 } from "../../../src/engine/kit";

const H = LOOKS.hero;
const K = LOOKS.kid;
const KS = 0.42;
const GRAY: Look = { skin: "#e8b48c", hair: "#d6d6d6", hairStyle: "short", top: "#6b4a2f", shirt: "#e9e4d0", topKind: "jacket", pants: "#555b66", shoes: "#2a2a2a" };
const MOM: Look = { skin: "#f2c9a0", hair: "#7a4a2a", hairStyle: "long", top: "#4fb3a9", shirt: "#4fb3a9", topKind: "tee", pants: "#3f9a90", shoes: "#ffffff" };
const BAKER: Look = { skin: "#e8b48c", hair: "#3a2a1a", hairStyle: "short", top: "#f4f1e6", shirt: "#f4f1e6", topKind: "jacket", pants: "#5a4a3a", shoes: "#2a2a2a" };
const WIFE: Look = { skin: "#f2c9a0", hair: "#5a3a22", hairStyle: "long", top: "#b0485a", shirt: "#f4f1e6", topKind: "dress", pants: "#b0485a", shoes: "#2a2a2a" };
const GRAYWIFE: Look = { skin: "#f2c9a0", hair: "#c9b6f2", hairStyle: "long", top: "#7b5cd6", shirt: "#ffffff", topKind: "dress", pants: "#7b5cd6", shoes: "#2a2a2a" };
const DAD: Look = { skin: "#c98e64", hair: "#1b1b1b", hairStyle: "short", top: "#3a6fb0", shirt: "#ffffff", topKind: "jacket", pants: "#2a2a33", shoes: "#2a2a2a" };
const NINA = LOOKS.girl;
const NMOM: Look = { skin: "#c98e64", hair: "#2b1d14", hairStyle: "long", top: "#f08a24", shirt: "#ffffff", topKind: "tee", pants: "#3b5fa0", shoes: "#ffffff" };
const MAIL: Look = { skin: "#e8b48c", hair: "#24407a", hairStyle: "beanie", top: "#2f5fb0", shirt: "#2f5fb0", topKind: "hoodie", pants: "#24407a", shoes: "#2a2a2a" };
const ROSA: Look = { skin: "#f2c9a0", hair: "#8d8d8d", hairStyle: "long", top: "#e8434f", shirt: "#ffffff", topKind: "jacket", pants: "#3b3b55", shoes: "#f0f0f0" };

// ── places ─────────────────────────────────────────────────────────────────────
const RZ = SUBURB_Z; // suburb road centre line (z)
const LOT: [number, number] = [25, -134];
const home = (p: Partial<MysteryHouseState> = {}): MysteryHouseState => ({ at: LOT, appear: 1, door: 0, glow: 0.8, number: "12", ...p });
const OLD: [number, number] = [-25, -134]; // the baker's house in the flashback, and Nina's house
const oldHouse = (p: Partial<MysteryHouseState> = {}): MysteryHouseState => ({ at: OLD, appear: 1, door: 0, glow: 0.9, number: "3", ...p });
const DOOR: V3 = [25, 0.3, -140.1];
const PORCH: V3 = [25, 6.5, -140.6]; // porch lamp over the door
const REAL: V3 = [23.8, 0.3, -144.4]; // real Milo: LEFT from the porch
const ECHO: V3 = [26.2, 0.3, -144.4]; // the echo: RIGHT from the porch
const GRAY_AT: V3 = [-16, 0.78, -160.2];
const [LX, , LZ] = LIGHTHOUSE;
const [TX, , TZ] = TOWER;
const LH_DOOR: V3 = [LX + Math.sin(LH_FRONT) * 6.2, 0.3, LZ + Math.cos(LH_FRONT) * 6.2];

// lighthouse balcony
const HERO_G = gallery(SWITCH_YAW + 0.4, 4.3);
const ECHO_G = gallery(SWITCH_YAW + 0.75, 4.4);
const KID_YAW_G = SWITCH_YAW + 1.3; // the railing spot the real Milo runs to, beside the echo
const REAL_G = gallery(KID_YAW_G, 4.9);
const REAL_START = gallery(SWITCH_YAW - 0.35, 4.5);
const out = (yaw: number, r: number, dy: number): V3 => gallery(yaw, r, dy);
const HERO_G_YAW = yawTo(HERO_G, gallery(SWITCH_YAW, 3, 0));

// ── frame helpers ──────────────────────────────────────────────────────────────
const NIGHT = { evil: 1, fog: 0.35, dark: 0.55 };
const porchLight = (i = 1.6) => ({ pos: PORCH, aim: [25, 0, -145] as V3, intensity: i, angle: 0.75 });
type Twin = { anim?: Anim; mood?: Mood; at?: V3; yaw?: number; t?: number; hidden?: boolean };
const realMilo = (t: number, o: Twin = {}): ActorSpec => ({ look: K, anim: o.anim ?? "idle", at: o.at ?? REAL, yaw: o.yaw ?? 0, t: o.t ?? t, scale: KS, mood: o.mood ?? "scared", hidden: o.hidden });
const echoMilo = (t: number, o: Twin = {}): ActorSpec => ({ look: K, anim: o.anim ?? "idle", at: o.at ?? ECHO, yaw: o.yaw ?? 0, t: (o.t ?? t) + 0.37, scale: KS, mood: o.mood ?? "scared", noShadow: true, hidden: o.hidden });
const hero = (t: number, at: V3, yaw: number, anim: Anim = "idle", mood: Mood = "worried", extra: Partial<ActorSpec> = {}): ActorSpec => ({ look: H, anim, at, yaw, t, mood, ...extra });
/** POV from the porch down at the twins. */
const yard = (t: number, real: Twin, echo: Twin, cam: Frame["cam"], extra: Partial<Frame> = {}): Frame => ({
  cam: { ...cam, pos: [cam.pos[0], cam.pos[1] + 0.25, cam.pos[2]], look: [cam.look[0], cam.look[1] + 0.55, cam.look[2]] },
  ...NIGHT,
  fog: 0.25,
  houses: [home({ door: 0.6 })],
  actors: [realMilo(t, real), echoMilo(t, echo)],
  spots: [porchLight()],
  cast: { from: [31.5, 0, -139.2], len: 1.4, opacity: 0.62 },
  focus: [25, 0, -143],
  ...extra,
  ...(cam.pos[2] > -142.5 ? { houses: [home()] } : {}),
});
/** Echo townsfolk standing along both sidewalks of the x = 0 road (z from zA to zB), grinning, no shadows. */
const crowd = (n: number, zA: number, zB: number, t: number, turn: number, follow = 0, seed = 700): ActorSpec[] =>
  Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const z = mix(zA, zB, (i + 0.5) / n) + follow * 6;
    const x = side * (6.3 + (i % 3) * 0.7);
    const look = i === 3 ? MAIL : i === 6 ? ROSA : townLook(seed + i);
    const face = side > 0 ? -Math.PI / 2 : Math.PI / 2; // facing the road
    return { look, anim: follow > 0 ? "walk" : "idle", at: [x, 0.3, z] as V3, yaw: mix(face, Math.PI, turn * (i % 2 ? 1 : 1)), t: t + i * 0.3, mood: "grin", noShadow: true };
  });
/** Echo townsfolk around the plaza edge, walking in toward the lighthouse. */
const plazaEchoes = (n: number, t: number, k: number, r0 = 34, r1 = 14): ActorSpec[] =>
  Array.from({ length: n }, (_, i) => {
    const a = -0.3 + (i / n) * 2.2;
    const r = mix(r0 + (i % 3) * 3, r1 + (i % 4) * 2, k);
    const at: V3 = [LX - Math.cos(a) * r, 0.3, LZ + Math.sin(a) * r];
    return { look: townLook(800 + i), anim: "walk", at, yaw: yawTo(at, [LX, 0, LZ]), t: t + i * 0.4, mood: "grin", noShadow: true };
  });
/** Echoes climbing the outside of the lighthouse like spiders. */
const climbers = (n: number, t: number, k: number, top = 28): ActorSpec[] =>
  Array.from({ length: n }, (_, i) => {
    const a = LH_FRONT - 1.4 + (i / n) * 2.8 + (i % 2) * 0.15;
    const h = clamp01(mix(0.05, 1, k) - (i % 5) * 0.12) * top + 1.5 + (i % 3) * 2;
    const r = 4.6 - (1.3 * (h - 1.2)) / 30.8 + 0.7;
    return { look: townLook(900 + i), anim: "climb", at: [LX + Math.sin(a) * r, h, LZ + Math.cos(a) * r] as V3, yaw: a + Math.PI, t: t + i * 0.3, mood: "grin", noShadow: true };
  });
const beamAim = (t: number, a0 = 0, speed = 0.7): V3 => [LX + Math.sin(a0 + t * speed) * 220, 6, LZ + Math.cos(a0 + t * speed) * 220];
const countdown = (a: number, b: number, k: number) => clockStr(Math.ceil(mix(a, b, k)));
const SEP = { sepia: 1 };

const RAW: Record<string, Shot> = {
  // s01 hook: ten seconds to spot it ───────────────────────────────────────────
  hkWide: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 4.4, -139.2], [25, 4.0, -139.8], k), look: [25, 1.1, -145], fov: 50 }, { clock: countdown(10, 8, k) }),
  hkLeft: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([23.4, 2.2, -141.2], [23.5, 2.1, -141.6], k), look: [23.8, 1.6, -144.4], fov: 36 }, { clock: countdown(8, 6, k) }),
  hkRight: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([26.6, 2.2, -141.2], [26.5, 2.1, -141.6], k), look: [26.2, 1.6, -144.4], fov: 36 }, { clock: countdown(6, 5, k) }),
  hkTwin: ({ t, k }) => yard(t, { mood: "scared", anim: "point", yaw: 0.5 }, { mood: "scared", anim: "point", yaw: -0.5 }, { pos: mv([25, 2.0, -140.4], [25, 2.0, -141.0], k), look: [25, 1.4, -144.4], fov: 46 }, { clock: countdown(5, 4, k) }),
  hkGrin: ({ t, k }) => yard(t, { mood: "worried" }, { mood: k > 0.35 ? "grin" : "worried" }, { pos: mv([25.6, 1.9, -142.3], [25.8, 1.85, -142.6], k), look: [25.4, 1.5, -144.4], fov: 32 }, { clock: countdown(4, 3, k), shake: k > 0.35 && k < 0.45 ? 0.15 : 0 }),
  hkStreet: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 9, -139.8], [25, 10.5, -139.8], k), look: [25, 0, -146], fov: 48 }, { clock: countdown(3, 2, k), fog: 0.45 }),
  hkHouse: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 2.4, -156], [25, 2.6, -153], ease(k)), look: [25, 3.2, -141], fov: 48 }, { clock: countdown(2, 0, k), actors: [realMilo(t, { yaw: Math.PI }), echoMilo(t, { yaw: Math.PI }), hero(t, DOOR, Math.PI, "idle", "scared")] }),

  // s02 time's up ────────────────────────────────────────────────────────────────
  tuStare: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([25, 3.4, -140], [25, 3.1, -140.8], k), look: [25, 1.0, -145], fov: 46 }, { clock: "00:00", flash: k < 0.1 ? 0.5 * (1 - k / 0.1) : 0 }),
  tuPush: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([25, 1.4, -149], [25, 1.3, -147.6], ease(k)), look: [25, 1.0, -143], fov: 44 }, { actors: [realMilo(t, { yaw: Math.PI, mood: "worried" }), echoMilo(t, { yaw: Math.PI, mood: "worried" })] }),
  tuTwins: ({ t, k }) => yard(t, { mood: "smile" }, { mood: "smile" }, { pos: mv([20, 1.2, -146], [21, 1.2, -146.6], k), look: [25, 0.8, -144.4], fov: 42 }),
  tuFog: ({ k }) => ({ cam: { pos: mv([-4, 3, RZ], [6, 3, RZ], ease(k)), look: [40, 3, RZ + 4], fov: 52 }, ...NIGHT, fog: 0.6, houses: [home()], focus: [20, 0, RZ] }),
  tuTower: ({ t, k }) => ({ cam: { pos: mv([TX + 34, 6, TZ + 50], [TX + 26, 10, TZ + 40], ease(k)), look: [TX, TOWER_H - 10, TZ], fov: 50 }, ...NIGHT, fog: 0.3, tower: { bellSwing: k > 0.55 ? (t - 0.55 * 3) * 0.6 : 0, gearIn: 1, lever: 0, glow: 0.5 }, focus: [TX, 0, TZ] }),

  // s03 the rule ─────────────────────────────────────────────────────────────────
  ruTownDay: ({ t, k }) => ({ cam: { pos: mv([70, 70, 90], [55, 60, 70], ease(k)), look: [0, 6, 0], fov: 52 }, evil: 0, fog: 0, actors: plazaStroll(t), focus: [0, 0, 0] }),
  ruBell: ({ t, k }) => ({ cam: { pos: mv([TX + 18, 6, TZ + 30], [TX + 15, 9, TZ + 26], ease(k)), look: [TX, TOWER_H - 12, TZ], fov: 52 }, evil: 0.25, fog: 0, dusk: 0.9, tower: { bellSwing: t * 0.5, gearIn: 1, lever: 0, glow: 0.3 }, focus: [TX, 0, TZ] }),
  ruSkyTurn: ({ k }) => ({ cam: { pos: [6, 3, 30], look: mv([TX, 30, TZ], [TX, 50, TZ - 20], ease(k)), fov: 60 }, evil: ease(seg(k, 0.1, 0.8)), fog: 0.3 * ease(k), dusk: 0.6 * (1 - k), focus: [0, 0, 0] }),
  ruBell13: ({ t, k }) => ({ cam: { pos: mv([TX + 12, TOWER_H - 6, TZ + 12], [TX + 10, TOWER_H - 7, TZ + 10], k), look: [TX, TOWER_H - 9, TZ], fov: 50 }, ...NIGHT, tower: { bellSwing: t * 0.8, gearIn: 1, lever: 0, glow: 0.7 }, wave: seg(k, 0.15, 1), shake: 0.25 * (1 - k), clock: "13", focus: [TX, 0, TZ] }),
  ruStreets: ({ k }) => ({ cam: { pos: mv([0, 30, 140], [0, 22, 110], ease(k)), look: [0, 2, 60], fov: 52 }, ...NIGHT, fog: 0.5, focus: [0, 0, 80] }),
  ruRun: ({ t, k }) => ({ cam: { pos: [0, 2.6, RZ + 1], look: [30, 2, RZ + 4], fov: 54 }, ...NIGHT, fog: 0.3, houses: [home({ door: 0.9 })], actors: runners(t, k), focus: [20, 0, RZ] }),
  ruDoors: ({ t, k }) => ({ cam: { pos: [25, 3.2, -147], look: [25, 3.5, -138.5], fov: 50 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 - ease(seg(k, 0.2, 0.4)) })], spots: [porchLight()], focus: [25, 0, -140], actors: k < 0.3 ? [{ look: townLook(41), anim: "run", at: mv([25, 0.3, -143], DOOR, seg(k, 0, 0.3)), yaw: 0, t, mood: "scared" }] : [] }),
  ruNeighbor: ({ t }) => ({ cam: { pos: [25, 2.4, -141.6], look: [25, 2.0, -147], fov: 40 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [{ look: townLook(52), anim: "idle", at: [25, 0.3, -146.5], yaw: 0, t, mood: "smile", noShadow: true }], spots: [porchLight()], focus: [25, 0, -144] }),
  ruFriend: ({ t }) => ({ cam: { pos: [24, 2.2, -141.6], look: [24.5, 1.6, -146], fov: 40 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [{ look: townLook(77), anim: "bang", at: [24.5, 0.3, -146], yaw: 0, t, mood: "smile", noShadow: true }], spots: [porchLight()], focus: [25, 0, -144] }),
  ruMom: ({ t, k }) => ({ cam: { pos: mv([25.5, 2.6, -141.8], [25.5, 2.5, -142.4], k), look: [25.5, 2.5, -146.4], fov: 34 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [{ look: MOM, anim: "idle", at: [25.5, 0.3, -146.4], yaw: 0, t, mood: k > 0.6 ? "grin" : "smile", noShadow: true }], spots: [porchLight()], focus: [25, 0, -144] }),
  ruKnock: ({ t, k }) => ({ cam: { pos: mv([30, 2.4, -147], [29, 2.4, -146], k), look: [25, 2.6, -139.5], fov: 44 }, ...NIGHT, houses: [home()], actors: [{ look: townLook(91), anim: "bang", at: [25, 0.3, -140.4], yaw: 0, t, mood: "grin", noShadow: true }], spots: [porchLight()], focus: [25, 0, -141] }),

  // s04 echoes ───────────────────────────────────────────────────────────────────
  ecFog: ({ t, k }) => ({ cam: { pos: [0, 2.2, -60], look: [0, 3, -110], fov: 48 }, ...NIGHT, fog: 0.7, actors: [{ look: townLook(12), anim: "walk", at: [0.5, 0.3, mix(-112, -100, k)], yaw: 0, t, mood: "grin", noShadow: true }], focus: [0, 0, -95] }),
  ecEmerge: ({ t, k }) => ({ cam: { pos: [3, 1.6, -82], look: [0, 2.2, -95], fov: 40 }, ...NIGHT, fog: 0.8, actors: [0, 1, 2].map((i) => ({ look: townLook(20 + i), anim: "walk" as Anim, at: [-2.5 + i * 2.5, 0.3, mix(-104, -92, k) - i * 2] as V3, yaw: 0, t: t + i, mood: "grin" as Mood, noShadow: true })), focus: [0, 0, -95] }),
  ecCopy: ({ t, k }) => {
    const L = townLook(33);
    return { cam: { pos: [0, 2.4, -82], look: [0, 2, -90], fov: 40 }, ...NIGHT, fog: 0.5, actors: [{ look: L, anim: "idle", at: [-1.2, 0.3, -90], yaw: Math.PI / 2, t, mood: "scared" }, { look: L, anim: "idle", at: [1.2, 0.3, -90], yaw: -Math.PI / 2, t: t + 0.4, mood: k > 0.5 ? "grin" : "scared", noShadow: true }], dust: [{ x: 1.2, z: -90, amount: 1 - ease(k), spread: 2.5, color: "#202538" }], focus: [0, 0, -90] };
  },
  ecFace: ({ t, k }) => {
    const L = townLook(33);
    return { cam: { pos: mv([0, 2.9, -86.4], [0, 2.9, -86.9], k), look: [0, 2.9, -90], fov: 40 }, ...NIGHT, fog: 0.3, actors: [{ look: L, anim: "idle", at: [-1.2, 0.3, -90], yaw: 0.25, t, mood: "worried" }, { look: L, anim: "idle", at: [1.2, 0.3, -90], yaw: -0.25, t: t + 0.4, mood: "worried", noShadow: true }], focus: [0, 0, -90] };
  },
  ecGrin: ({ t, k }) => ({ cam: { pos: mv([1.2, 2.9, -87.4], [1.2, 2.9, -88.0], ease(k)), look: [1.2, 2.9, -90], fov: 36 }, ...NIGHT, fog: 0.3, actors: [{ look: townLook(33), anim: "idle", at: [1.2, 0.3, -90], yaw: 0, t, mood: "grin", noShadow: true }], focus: [0, 0, -90] }),
  ecSecret: ({ t }) => ({ cam: { pos: [-3, 2.4, -85], look: [0, 2.2, -90], fov: 42 }, ...NIGHT, fog: 0.4, actors: [{ look: townLook(33), anim: "point", at: [1.2, 0.3, -90], yaw: -0.4, t, mood: "grin", noShadow: true }, { look: townLook(33), anim: "idle", at: [-1.2, 0.3, -90], yaw: 0.5, t, mood: "scared" }], focus: [0, 0, -90] }),
  ecPet: ({ t, k }) => ({ cam: { pos: mv([0, 6, -78], [0, 8, -74], ease(k)), look: [0, 1.5, -92], fov: 46 }, ...NIGHT, fog: 0.6, actors: crowd(10, -100, -84, t, 0.6), focus: [0, 0, -90] }),

  // s05–s07 the baker, eighty years ago (sepia) ─────────────────────────────────
  tmTown: ({ k }) => ({ cam: { pos: mv([-25, 40, -190], [-25, 30, -180], ease(k)), look: [-25, 4, -134], fov: 50 }, evil: 0.6, fog: 0.4, houses: [oldHouse()], ...SEP, focus: OLD3() }),
  tmWalk: ({ t, k }) => ({ cam: { pos: [mix(-40, -32, k) + 4, 2.6, RZ - 5], look: [mix(-40, -32, k), 2, RZ + 3], fov: 48 }, evil: 0.7, fog: 0.4, houses: [oldHouse()], actors: [{ look: BAKER, anim: "walk", at: [mix(-40, -32, k), 0.3, RZ + 3], yaw: Math.PI / 2, t, mood: "smile" }], ...SEP, focus: OLD3() }),
  tmBell: ({ t, k }) => ({ cam: { pos: [-30, 2.4, RZ - 4], look: [-30, 5, RZ + 30], fov: 56 }, evil: mix(0.7, 1, k), fog: 0.5, actors: [{ look: BAKER, anim: "lookup", at: [-30, 0.3, RZ + 3], yaw: Math.PI, t, mood: "worried" }], ...SEP, focus: OLD3() }),
  tmKnock: ({ t, k }) => ({ cam: { pos: [-29, 2.6, -144], look: [-25, 3, -138.5], fov: 46 }, ...NIGHT, houses: [oldHouse({ door: ease(seg(k, 0.55, 0.85)) })], actors: [{ look: BAKER, anim: k < 0.5 ? "bang" : "idle", at: [-25, 0.3, -140.8], yaw: 0, t, mood: "smile", noShadow: true }], ...SEP, focus: OLD3() }),
  tmOpen: ({ t }) => ({ cam: { pos: [-21.2, 2.8, -144.6], look: [-25, 2.6, -140.2], fov: 42 }, ...NIGHT, houses: [oldHouse({ door: 1 })], actors: [{ look: WIFE, anim: "idle", at: [-25, 0.3, -139.4], yaw: Math.PI, t, mood: "smile" }, { look: BAKER, anim: "idle", at: [-25, 0.3, -141.4], yaw: 0, t, mood: "smile", noShadow: true }], ...SEP, focus: OLD3() }),
  tmKnock2: ({ t, k }) => ({ cam: { pos: mv([-33, 3, -148], [-32, 3, -147], k), look: [-25, 3, -139], fov: 46 }, ...NIGHT, houses: [oldHouse({ door: 0 })], actors: [{ look: BAKER, anim: "bang", at: [-25, 0.3, -140.8], yaw: 0, t, mood: "worried" }], ...SEP, focus: OLD3() }),
  tmOpen2: ({ t, k }) => ({ cam: { pos: [-21.2, 2.8, -144.6], look: [-25, 2.6, -140.2], fov: 42 }, ...NIGHT, houses: [oldHouse({ door: ease(seg(k, 0, 0.4)) })], actors: [{ look: WIFE, anim: "idle", at: [-25, 0.3, -139.4], yaw: Math.PI, t, mood: "worried" }, { look: BAKER, anim: "idle", at: [-25, 0.3, -141.4], yaw: 0, t, mood: "worried" }], ...SEP, focus: OLD3() }),
  tmTwo: ({ t, k }) => ({ cam: { pos: mv([-25, 3, -149], [-25, 3.2, -151], ease(k)), look: [-25, 2.2, -141], fov: 44 }, ...NIGHT, houses: [oldHouse({ door: 1 })], actors: [{ look: WIFE, anim: "idle", at: [-25, 0.3, -139.4], yaw: Math.PI, t, mood: "scared" }, { look: BAKER, anim: "idle", at: [-26.4, 0.3, -142], yaw: 0, t, mood: "worried" }, { look: BAKER, anim: "idle", at: [-23.6, 0.3, -142], yaw: 0, t: t + 0.4, mood: "worried", noShadow: true }], ...SEP, focus: OLD3() }),
  tmPair: ({ t, k }) => ({ cam: { pos: mv([-25, 2.8, -150], [-25, 2.8, -149], k), look: [-25, 2.4, -142.2], fov: 44 }, ...NIGHT, houses: [oldHouse({ door: 1 })], actors: [{ look: BAKER, anim: "idle", at: [-23.6, 0.3, -142.2], yaw: Math.PI, t, mood: "smile" }, { look: BAKER, anim: "idle", at: [-26.4, 0.3, -142.2], yaw: Math.PI, t: t + 0.4, mood: "smile", noShadow: true }], ...SEP, focus: OLD3() }),
  tmPoint: ({ t }) => ({ cam: { pos: [-25, 2.2, -146.4], look: [-25, 2.4, -142], fov: 44 }, ...NIGHT, houses: [oldHouse({ door: 1 })], actors: [{ look: BAKER, anim: "point", at: [-23.6, 0.3, -142.2], yaw: -Math.PI / 2, t, mood: "shout" }, { look: BAKER, anim: "point", at: [-26.4, 0.3, -142.2], yaw: Math.PI / 2, t: t + 0.4, mood: "shout", noShadow: true }], ...SEP, focus: OLD3() }),
  tmWife: ({ t, k }) => ({ cam: { pos: mv([-25, 2.5, -142.8], [-25, 2.5, -142.2], k), look: [-25, 2.6, -139.4], fov: 38 }, ...NIGHT, houses: [oldHouse({ door: 1 })], actors: [{ look: WIFE, anim: "idle", at: [-25, 0.3, -139.4], yaw: Math.PI, t, mood: "scared" }], ...SEP, focus: OLD3() }),
  tmSun: ({ k }) => ({ cam: { pos: [-25, 3, -160], look: mv([-25, 4, -100], [-25, 14, -100], ease(k)), fov: 56 }, evil: mix(1, 0.1, ease(k)), fog: 0.2, dusk: 0.9, houses: [oldHouse({ glow: 0.3 })], ...SEP, focus: OLD3() }),
  tmFade: ({ t, k }) => ({ cam: { pos: [-25, 2.6, -149], look: [-25, 2.2, -142], fov: 42 }, evil: 0.2, fog: 0.2, dusk: 0.8, houses: [oldHouse({ door: 1, glow: 0.3 })], actors: [{ look: BAKER, anim: "idle", at: [-26.4, 0.3, -142], yaw: 0.3, t, mood: "scared", hidden: k > 0.7 }, { look: BAKER, anim: "idle", at: [-23.6, 0.3, -142], yaw: -0.3, t: t + 0.4, mood: "smile", noShadow: true }], dust: [{ x: -26.4, z: -142, amount: seg(k, 0.4, 0.8) * (1 - seg(k, 0.85, 1)), spread: 2.5, color: "#e8e0d0" }], ...SEP, focus: OLD3() }),
  tmChose: ({ t }) => ({ cam: { pos: [-28, 2.4, -146], look: [-24.5, 2.4, -140.4], fov: 42 }, evil: 0.1, fog: 0, dusk: 0.6, houses: [oldHouse({ door: 1, glow: 0.2 })], actors: [{ look: WIFE, anim: "idle", at: [-25.6, 0.3, -140.6], yaw: Math.PI / 2, t, mood: "worried" }, { look: BAKER, anim: "idle", at: [-23.8, 0.3, -140.6], yaw: -Math.PI / 2, t, mood: "smile", noShadow: true }], ...SEP, focus: OLD3() }),
  tmMorning: ({ k }) => ({ cam: { pos: mv([-40, 3, RZ], [-30, 3, RZ], ease(k)), look: [-20, 3, -140], fov: 50 }, evil: 0, fog: 0, dusk: 0.3, houses: [oldHouse({ glow: 0 })], ...SEP, focus: OLD3() }),
  tmDiff: ({ t }) => ({ cam: { pos: [-22, 2.4, -147], look: [-25, 2.2, -142], fov: 40 }, evil: 0, fog: 0, houses: [oldHouse({ glow: 0 })], actors: [{ look: BAKER, anim: "idle", at: [-25, 0.3, -142.4], yaw: 0.3, t, mood: "smile", noShadow: true }, { look: townLook(5), anim: "walk", at: [-31, 0.3, -146], yaw: Math.PI / 2, t, mood: "worried" }], ...SEP, focus: OLD3() }),
  tmNight: ({ k }) => ({ cam: { pos: mv([-25, 3, -158], [-25, 3.5, -152], ease(k)), look: [-25, 6, -138.5], fov: 48 }, ...NIGHT, fog: 0.3, houses: [oldHouse({ glow: 1 })], ...SEP, focus: OLD3() }),
  tmWindow: ({ t, k }) => ({ cam: { pos: mv([-25, 2.8, -143.6], [-25, 2.8, -142.6], ease(k)), look: [-25, 2.8, -139.6], fov: 36 }, ...NIGHT, fog: 0.2, houses: [oldHouse({ glow: 1, door: 1 })], actors: [{ look: BAKER, anim: "idle", at: [-25, 0.3, -139.6], yaw: Math.PI, t, mood: "grin", noShadow: true }], ...SEP, focus: OLD3() }),
  tmWrong: ({ t, k }) => ({ cam: { pos: mv([-25, 2.9, -141.6], [-25, 2.9, -141.0], ease(k)), look: [-25, 2.9, -139.6], fov: 34 }, ...NIGHT, fog: 0.2, houses: [oldHouse({ glow: 1, door: 1 })], actors: [{ look: BAKER, anim: "idle", at: [-25, 0.3, -139.6], yaw: Math.PI, t, mood: "grin", noShadow: true }], shake: k > 0.55 ? 0.2 : 0, ...SEP, focus: OLD3() }),

  // s08 now ──────────────────────────────────────────────────────────────────────
  nwTown: ({ t, k }) => ({ cam: { pos: mv([60, 50, 60], [40, 40, 40], ease(k)), look: [0, 4, 0], fov: 52 }, evil: 0.15, fog: 0, dusk: 0.9, actors: plazaStroll(t), focus: [0, 0, 0] }),
  nwBell: ({ t, k }) => ({ cam: { pos: [TX + 22, 3, TZ + 30], look: [TX, TOWER_H - 8, TZ], fov: 54 }, evil: 0.8, fog: 0.2, tower: { bellSwing: t * 0.8, gearIn: 1, lever: 0, glow: 0.6 }, wave: seg(k, 0.2, 1), actors: plazaStroll(t, "lookup"), focus: [TX, 0, TZ] }),
  nwDrill: ({ t, k }) => ({ cam: { pos: mv([2.5, 3, 55], [2.5, 3, 62], k), look: [0, 2, 90], fov: 50 }, evil: 0.85, fog: 0.2, actors: streetFolk(t, "run", 1), focus: [0, 0, 80] }),
  nwEmpty: ({ t, k }) => ({ cam: { pos: [0, 12, 50], look: [0, 0, 100], fov: 50 }, evil: 0.9, fog: 0.3, actors: k < 0.6 ? streetFolk(t, "run", 1 - k) : [], focus: [0, 0, 80] }),
  nwSlam: ({ k }) => ({ cam: { pos: mv([-20, 3, RZ], [-10, 3, RZ], k), look: [25, 4, -138], fov: 50 }, ...NIGHT, houses: [home({ door: 1 - ease(seg(k, 0, 0.12)) }), oldHouse({ door: 1 - ease(seg(k, 0.4, 0.55)) })], shake: k < 0.1 || (k > 0.45 && k < 0.55) ? 0.1 : 0, focus: [0, 0, RZ] }),
  nwFog: ({ k }) => ({ cam: { pos: mv([0, 1.4, -60], [0, 1.6, -70], k), look: [0, 1.5, -120], fov: 50 }, ...NIGHT, fog: 0.8, focus: [0, 0, -100] }),
  nwWalk: ({ t, k }) => ({ cam: { pos: [2, 0.9, -84], look: [0, 1, -92], fov: 40 }, ...NIGHT, fog: 0.6, actors: [{ look: townLook(61), anim: "walk", at: [-0.5, 0.3, mix(-96, -90, k)], yaw: 0, t: t * 0.6, mood: "grin", noShadow: true }], focus: [0, 0, -90] }),
  nwKnock: ({ t }) => ({ cam: { pos: [-20, 2.4, -147], look: [-25, 2.8, -139.5], fov: 42 }, ...NIGHT, fog: 0.4, houses: [oldHouse({ number: "9" })], actors: [{ look: townLook(64), anim: "bang", at: [-25, 0.3, -140.6], yaw: 0, t, mood: "grin", noShadow: true }], focus: [-25, 0, -140] }),
  nwCall: ({ t, k }) => ({ cam: { pos: mv([10, 2.4, RZ - 1], [16, 2.4, RZ - 1], k), look: [25, 2.6, -141], fov: 44 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [{ look: townLook(70), anim: "shout", at: [24, 0.3, -146], yaw: 0.2, t, mood: "grin", noShadow: true }], spots: [porchLight(0.6)], focus: [24, 0, -145] }),

  // s09–s10 Nina's dad ───────────────────────────────────────────────────────────
  ninaDay: ({ t }) => ({ cam: { pos: [-28.5, 2.4, -147.5], look: [-25, 2.2, -142], fov: 44 }, evil: 0, fog: 0, houses: [oldHouse({ number: "9", glow: 0 })], actors: [{ look: NINA, anim: "cheer", at: [-25.5, 0.3, -142.6], yaw: 0.4, t, mood: "happy" }, { look: H, anim: "idle", at: [-23.4, 0.3, -143.6], yaw: -0.9, t, mood: "smile" }], focus: [-25, 0, -142] }),
  ninaDad: ({ t, k }) => ({ cam: { pos: [-35, 2.6, RZ - 2], look: [mix(-40, -30, k), 2, RZ + 3], fov: 50 }, evil: 0.9, fog: 0.4, actors: [{ look: DAD, anim: "walk", at: [mix(-42, -30, k), 0.3, RZ + 3], yaw: Math.PI / 2, t, mood: "worried" }], tower: { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 }, focus: [-30, 0, RZ] }),
  ninaTwice: ({ t, k }) => ({ cam: { pos: mv([-25, 3.4, -153], [-25, 3.4, -155], ease(k)), look: [-25, 2.2, -141], fov: 48 }, ...NIGHT, houses: [oldHouse({ number: "9" })], actors: [{ look: DAD, anim: "idle", at: [-26.4, 0.3, -142.4], yaw: Math.PI, t, mood: "scared" }, { look: DAD, anim: "idle", at: [-23.6, 0.3, -142.4], yaw: Math.PI, t: t + 0.4, mood: "scared", noShadow: true }], flash: k < 0.08 ? 0.4 : 0, focus: [-25, 0, -142] }),
  ninaFront: ({ t }) => ({ cam: { pos: [-21.5, 2.6, -146], look: [-25, 2.6, -140.4], fov: 42 }, ...NIGHT, houses: [oldHouse({ number: "9" })], actors: [{ look: DAD, anim: "bang", at: [-25, 0.3, -140.4], yaw: 0, t, mood: "worried" }], focus: [-25, 0, -140] }),
  ninaGate: ({ t }) => ({ cam: { pos: [-17.5, 2.6, -146.5], look: [-21, 2.4, -141.2], fov: 44 }, ...NIGHT, houses: [oldHouse({ number: "9" })], actors: [{ look: DAD, anim: "bang", at: [-21, 0.3, -141.2], yaw: -0.6, t: t + 0.3, mood: "worried", noShadow: true }], focus: [-28, 0, -138] }),
  ninaCry: ({ t, k }) => ({ cam: { pos: mv([-25, 3.0, -151], [-25, 3.0, -150.2], k), look: [-25, 2.6, -142.4], fov: 40 }, ...NIGHT, houses: [oldHouse({ number: "9" })], actors: [{ look: DAD, anim: "panic", at: [-26.4, 0.3, -142.4], yaw: Math.PI - 0.4, t, mood: "scared" }, { look: DAD, anim: "panic", at: [-23.6, 0.3, -142.4], yaw: Math.PI + 0.4, t: t + 0.4, mood: "scared", noShadow: true }], focus: [-25, 0, -142] }),
  ninaMom: ({ t, k }) => ({ cam: { pos: mv([-25, 2.6, -143.2], [-25, 2.6, -142.6], k), look: [-25, 2.4, -139.6], fov: 38 }, ...NIGHT, houses: [oldHouse({ number: "9", door: 0.35 })], actors: [{ look: NMOM, anim: "idle", at: [-25, 0.3, -139.4], yaw: Math.PI, t, mood: "scared" }, { look: NINA, anim: "idle", at: [-24, 0.3, -139.2], yaw: Math.PI, t, mood: "worried", scale: 0.5 }], focus: [-25, 0, -140] }),
  ninaWait: ({ k }) => ({ cam: { pos: [-25, 3, -165], look: mv([-25, 4, -120], [-25, 14, -110], ease(k)), fov: 54 }, evil: mix(1, 0, ease(k)), fog: 0.3 * (1 - k), dusk: 0.9 * ease(k), houses: [oldHouse({ number: "9", glow: 1 - k })], focus: [-25, 0, -140] }),
  ninaOne: ({ t, k }) => ({ cam: { pos: mv([-25, 2.8, -150], [-25, 2.8, -148], ease(k)), look: [-25, 2.2, -142], fov: 44 }, evil: 0, fog: 0, dusk: 0.6, houses: [oldHouse({ number: "9", glow: 0 })], actors: [{ look: DAD, anim: "idle", at: [-25, 0.3, -142.4], yaw: Math.PI, t, mood: "smile", noShadow: true }], focus: [-25, 0, -142] }),
  ninaFine: ({ t }) => ({ cam: { pos: [-22, 2.6, -148], look: [-25, 2.4, -142.4], fov: 42 }, evil: 0, fog: 0, houses: [oldHouse({ number: "9", glow: 0 })], actors: [{ look: DAD, anim: "cheer", at: [-25.6, 0.3, -142.4], yaw: 0.6, t, mood: "happy", noShadow: true }, { look: NINA, anim: "idle", at: [-22.8, 0.3, -141.8], yaw: -1.2, t, mood: "smile", scale: 0.5 }], focus: [-25, 0, -142] }),
  ninaWave: ({ t }) => ({ cam: { pos: [-27, 2.4, -147], look: [-25, 2.4, -142.4], fov: 40 }, evil: 0, fog: 0, houses: [oldHouse({ number: "9", glow: 0 })], actors: [{ look: DAD, anim: "work", at: [-25, 0.3, -142.4], yaw: Math.PI, t, mood: "smile", noShadow: true }], focus: [-25, 0, -142] }),
  ninaTell: ({ t }) => ({ cam: { pos: [-23.3, 2.3, -149], look: [-23.3, 2.1, -144.5], fov: 40 }, evil: 0.1, fog: 0, dusk: 0.6, actors: [{ look: NINA, anim: "idle", at: [-24.2, 0.3, -144.4], yaw: Math.PI / 2, t, mood: "worried", scale: 0.55 }, { look: H, anim: "idle", at: [-22.4, 0.3, -144.6], yaw: -Math.PI / 2, t, mood: "worried" }], focus: [-23, 0, -144] }),
  ninaStare: ({ t, k }) => ({ cam: { pos: mv([-25, 2.9, -145.2], [-25, 2.9, -144.6], ease(k)), look: [-25, 2.9, -142.4], fov: 36 }, evil: 0.15, fog: 0, dusk: 0.4, actors: [{ look: DAD, anim: "idle", at: [-25, 0.3, -142.4], yaw: Math.PI, t: 0, mood: "smile", noShadow: true }], focus: [-25, 0, -142] }),
  ninaGrin: ({ t, k }) => ({ cam: { pos: mv([-25, 2.9, -144.8], [-25, 2.9, -144.2], ease(k)), look: [-25, 2.9, -142.4], fov: 34 }, ...NIGHT, fog: 0.1, actors: [{ look: DAD, anim: "idle", at: [-25, 0.3, -142.4], yaw: Math.PI, t, mood: "grin", noShadow: true }], shake: k > 0.5 && k < 0.6 ? 0.15 : 0, focus: [-25, 0, -142] }),

  // s11 Mister Gray ──────────────────────────────────────────────────────────────
  grayHouse: ({ k }) => ({ cam: { pos: mv([-6, 4, RZ + 2], [-9, 3.4, RZ + 2], k), look: [-16, 3, -162], fov: 46 }, evil: 0.3, fog: 0, dusk: 0.8, focus: [-16, 0, -158] }),
  grayPorch: ({ t, k }) => ({ cam: { pos: mv([-16, 2.8, -154.5], [-16, 2.8, -155.4], k), look: [-16, 2.8, -160.2], fov: 38 }, evil: 0.3, fog: 0, dusk: 0.8, actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0, t, mood: "worried" }], focus: [-16, 0, -158] }),
  grayPast: ({ t, k }) => ({ cam: { pos: mv([-25, 2.8, -149], [-25, 2.8, -147], ease(k)), look: [-25, 2.2, -142], fov: 44 }, ...NIGHT, houses: [oldHouse({ number: "5" })], actors: [{ look: GRAYWIFE, anim: "idle", at: [-26.4, 0.3, -142.4], yaw: Math.PI, t, mood: "worried" }, { look: GRAYWIFE, anim: "idle", at: [-23.6, 0.3, -142.4], yaw: Math.PI, t: t + 0.4, mood: "worried", noShadow: true }], ...SEP, focus: [-25, 0, -142] }),
  grayPick: ({ t, k }) => ({ cam: { pos: [-21, 2.4, -147], look: [-25, 2.2, -142.4], fov: 42 }, ...NIGHT, houses: [oldHouse({ number: "5" })], actors: [{ look: GRAY, anim: k > 0.3 ? "point" : "idle", at: [-28.5, 0.3, -146.5], yaw: 0.6, t, mood: "worried" }, { look: GRAYWIFE, anim: "idle", at: [-26.4, 0.3, -142.4], yaw: Math.PI, t, mood: "worried" }, { look: GRAYWIFE, anim: "idle", at: [-23.6, 0.3, -142.4], yaw: Math.PI, t: t + 0.4, mood: k > 0.6 ? "grin" : "worried", noShadow: true }], ...SEP, focus: [-25, 0, -142] }),
  grayAsk: ({ t }) => ({ cam: { pos: [-19.5, 2.2, -155], look: [-16, 2.4, -160.2], fov: 42 }, evil: 0.3, fog: 0, dusk: 0.8, actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0, t, mood: "smile" }, { look: H, anim: "idle", at: [-14, 0.3, -156], yaw: Math.PI + 0.4, t, mood: "worried" }], focus: [-16, 0, -158] }),
  grayLine: ({ t, k }) => ({ cam: { pos: mv([-16, 3.6, -156.4], [-16, 3.6, -157.2], ease(k)), look: [-16, 3.6, -160.2], fov: 34 }, evil: 0.35, fog: 0, dusk: 0.9, actors: [{ look: GRAY, anim: "sit", at: GRAY_AT, yaw: 0, t, mood: "worried" }], focus: [-16, 0, -158] }),
  grayDoor: ({ t, k }) => ({ cam: { pos: mv([-6, 3, RZ + 2], [-2, 4, RZ + 3], ease(k)), look: [-16, 3, -161], fov: 46 }, evil: 0.45, fog: 0, dusk: 0.9, actors: [{ look: GRAY, anim: "walk", at: [-16, 0.78, mix(-160.2, -162, k)], yaw: Math.PI, t, mood: "worried" }], focus: [-16, 0, -158] }),

  // s12–s13 yesterday ────────────────────────────────────────────────────────────
  ydSunset: ({ k }) => ({ cam: { pos: mv([60, 60, -220], [45, 40, -200], ease(k)), look: [25, 2, -142], fov: 50 }, evil: 0.2, fog: 0, dusk: 1, houses: [home({ glow: 0.4 })], focus: [25, 0, -145] }),
  ydMom: ({ t, k }) => ({ cam: { pos: [18, 2.6, -146.4], look: [28, 1.8, -150], fov: 48 }, evil: 0.25, fog: 0, dusk: 1, houses: [home({ glow: 0.4 })], cars: [{ color: "#4fb3a9", at: [mix(30, 60, ease(seg(k, 0.3, 1))), 0, RZ - 2.5], yaw: Math.PI / 2, wheelT: t * 4, lights: 2 }], actors: [hero(t, [24, 0.3, -143.6], Math.PI - 0.7, "point", "smile"), { look: K, anim: "cheer", at: [25.6, 0.3, -143.6], yaw: Math.PI - 0.6, t, scale: KS, mood: "happy" }], focus: [25, 0, -145] }),
  ydBros: ({ t, k }) => ({ cam: { pos: mv([25, 2.6, -151], [25, 2.6, -150], k), look: [25, 2.2, -143.4], fov: 40 }, evil: 0.3, fog: 0, dusk: 1, houses: [home({ glow: 0.6 })], spots: [porchLight(0.6)], actors: [hero(t, [24, 0.3, -143.4], Math.PI, "idle", "smile"), { look: K, anim: "cheer", at: [25.6, 0.3, -143.6], yaw: Math.PI, t, scale: KS, mood: "happy" }], focus: [25, 0, -145] }),
  ydMilo: ({ t, k }) => ({ cam: { pos: mv([25.6, 2.3, -147.6], [25.6, 2.25, -147.1], k), look: [25.6, 2.0, -143.6], fov: 36 }, evil: 0.3, fog: 0, dusk: 1, houses: [home({ glow: 0.6 })], actors: [{ look: K, anim: "jump", at: [25.6, 0.3, -143.6], yaw: Math.PI, t, scale: KS, mood: "happy" }], focus: [25, 0, -145] }),
  ydHoodie: ({ t, k }) => ({ cam: { pos: mv([28.0, 2.0, -146.4], [27.6, 2.0, -146.7], k), look: [25.6, 1.8, -143.6], fov: 34 }, evil: 0.3, fog: 0, dusk: 1, houses: [home({ glow: 0.6 })], actors: [{ look: K, anim: "idle", at: [25.6, 0.3, -143.6], yaw: Math.PI - 0.6, t, scale: KS, mood: "smile" }], focus: [25, 0, -145] }),
  ydSmile: ({ t, k }) => ({ cam: { pos: mv([25.6, 2.3, -146.6], [25.6, 2.3, -146.1], k), look: [25.6, 2.2, -143.6], fov: 34 }, evil: 0.35, fog: 0, dusk: 1, houses: [home({ glow: 0.6 })], actors: [{ look: K, anim: "idle", at: [25.6, 0.3, -143.6], yaw: Math.PI, t, scale: KS, mood: k > 0.4 ? "happy" : "scared" }], focus: [25, 0, -145] }),
  ydGoofy: ({ t, k }) => ({ cam: { pos: mv([25.6, 2.3, -146.1], [25.6, 2.3, -145.7], k), look: [25.6, 2.2, -143.6], fov: 30 }, evil: 0.35, fog: 0, dusk: 1, houses: [home({ glow: 0.6 })], actors: [{ look: K, anim: "cheer", at: [25.6, 0.3, -143.6], yaw: Math.PI, t, scale: KS, mood: "happy" }], focus: [25, 0, -145] }),
  ydPlay: ({ t, k }) => ({ cam: { pos: mv([16, 5, RZ - 3], [18, 4, RZ - 3], k), look: [25, 1, -146], fov: 48 }, evil: 0.55, fog: 0, dusk: 0.6, houses: [home({ glow: 0.8 })], spots: [porchLight(0.8)], actors: [hero(t, [23, 0.3, -146.5], Math.PI / 2, "jump", "happy"), { look: K, anim: "run", at: [27 + Math.sin(t * 1.5), 0.3, -146], yaw: -Math.PI / 2, t, scale: KS, mood: "happy" }], focus: [25, 0, -146] }),
  ydKick: ({ t, k }) => ({ cam: { pos: [29.6, 1.8, -150.5], look: [26.6, 1.6, -146.4], fov: 44 }, evil: 0.6, fog: 0, dusk: 0.5, houses: [home({ glow: 0.8 })], actors: [{ look: K, anim: k < 0.35 ? "run" : "jump", at: [26.6, 0.3, -146.4], yaw: -Math.PI / 2 - 0.4, t, scale: KS, mood: "happy" }], focus: [25, 0, -146] }),
  ydRoll: ({ t, k }) => ({ cam: { pos: [mix(18, 4, k), 0.8, RZ + 1.5], look: [mix(14, -2, k), 0.4, RZ], fov: 46 }, evil: 0.65, fog: 0.05, dusk: 0.4, balls: [[mix(18, 0, k), 0.45, RZ + 1]], focus: [10, 0, RZ] }),
  ydChase: ({ t, k }) => ({ cam: { pos: [28, 2.4, RZ - 1], look: [mix(20, 6, k), 1, RZ], fov: 50 }, evil: 0.7, fog: 0.05, dusk: 0.4, actors: [{ look: K, anim: "run", at: [mix(23, 8, k), 0.3, RZ], yaw: -Math.PI / 2, t, scale: KS, mood: "happy" }], focus: [14, 0, RZ] }),
  ydYell: ({ t, k }) => ({ cam: { pos: mv([22.4, 2.8, -152], [22.6, 2.8, -151.4], k), look: [24.4, 2.8, -146.6], fov: 38 }, evil: 0.75, fog: 0.05, dusk: 0.3, houses: [home({ glow: 0.8 })], actors: [hero(t, [24.4, 0.3, -146.6], -Math.PI / 2 - 0.6, "shout", "shout")], focus: [24, 0, -146] }),
  ydTower: ({ t, k }) => ({ cam: { pos: mv([0, 2, -60], [0, 2.4, -70], k), look: [TX, TOWER_H - 6, TZ], fov: 50 }, ...NIGHT, fog: 0.1, tower: { bellSwing: k > 0.6 ? (k - 0.6) * 6 : 0, gearIn: 1, lever: 0, glow: 0.5 }, focus: [TX, 0, TZ] }),

  // s14 the count ────────────────────────────────────────────────────────────────
  cnt1: ({ t, k }) => ({ cam: { pos: [TX + 16, TOWER_H - 4, TZ + 16], look: [TX, TOWER_H - 9, TZ], fov: 46 }, ...NIGHT, fog: 0.1, tower: { bellSwing: t * 0.8, gearIn: 1, lever: 0, glow: 0.5 }, clock: `BELL ${Math.min(3, 1 + Math.floor(k * 3))}`, focus: [TX, 0, TZ] }),
  cnt2: ({ t, k }) => ({ cam: { pos: mv([24.4, 2.95, -149.6], [24.4, 2.95, -149.0], k), look: [24.4, 2.9, -146.6], fov: 34 }, ...NIGHT, fog: 0.1, actors: [hero(t, [24.4, 0.3, -146.6], Math.PI, "idle", "scared")], focus: [24, 0, -146] }),
  cnt3: ({ t, k }) => ({ cam: { pos: [TX + 30, 4, TZ + 30], look: [TX, TOWER_H - 10, TZ], fov: 48 }, ...NIGHT, fog: 0.15, tower: { bellSwing: t * 0.8, gearIn: 1, lever: 0, glow: 0.5 }, clock: `BELL ${Math.min(12, 10 + Math.floor(k * 3))}`, focus: [TX, 0, TZ] }),
  cnt4: ({ t, k }) => ({ cam: { pos: mv([24.4, 2.9, -150.4], [24.4, 2.9, -149.4], ease(k)), look: [24.4, 2.8, -146.6], fov: 36 }, ...NIGHT, fog: 0.15, actors: [hero(t, [24.4, 0.3, -146.6], Math.PI, "idle", k > 0.5 ? "smile" : "worried")], clock: "BELL 12", focus: [24, 0, -146] }),
  cnt5: ({ t, k }) => ({ cam: { pos: mv([TX + 40, 3, TZ + 50], [TX + 30, 5, TZ + 38], ease(seg(k, 0.5, 1))), look: [TX, TOWER_H - 10, TZ], fov: mix(50, 64, seg(k, 0.5, 1)) }, evil: 1, fog: 0.15 + 0.4 * seg(k, 0.5, 1), tower: { bellSwing: k > 0.5 ? (k - 0.5) * 5 : 0, gearIn: 1, lever: 0, glow: k > 0.5 ? 1 : 0.4 }, wave: seg(k, 0.52, 1), clock: k > 0.5 ? "BELL 13" : "BELL 12", flash: k > 0.5 && k < 0.56 ? 0.6 : 0, shake: k > 0.5 ? 0.35 : 0, focus: [TX, 0, TZ] }),

  // s15–s17 the fog, the knock ───────────────────────────────────────────────────
  fgWave: ({ k }) => ({ cam: { pos: [30, 3, RZ], look: [0, 3, RZ], fov: 56 }, ...NIGHT, fog: mix(0.1, 0.9, ease(k)), houses: [home()], focus: [15, 0, RZ] }),
  fgScream: ({ t, k }) => ({ cam: { pos: mv([22, 2.9, -152], [22.4, 2.9, -151.2], k), look: [24.4, 2.8, -146.6], fov: 36 }, ...NIGHT, fog: 0.7, actors: [hero(t, [24.4, 0.3, -146.6], -Math.PI / 2 - 0.4, "shout", "shout")], focus: [24, 0, -146] }),
  fgLost: ({ t, k }) => ({ cam: { pos: [26, 3, RZ + 1], look: [mix(0, -10, k), 2, RZ], fov: 50 }, ...NIGHT, fog: 0.95, focus: [10, 0, RZ] }),
  fgSlam: ({ k }) => ({ cam: { pos: mv([-20, 5, RZ], [-5, 5, RZ], k), look: [10, 4, -138], fov: 54 }, ...NIGHT, fog: 0.7, houses: [home({ door: k < 0.1 ? 1 : 0 }), oldHouse({ door: k < 0.45 ? 1 : 0 })], shake: (k > 0.1 && k < 0.15) || (k > 0.45 && k < 0.5) || (k > 0.75 && k < 0.8) ? 0.1 : 0, focus: [0, 0, RZ] }),
  fgRun: ({ t, k }) => ({ cam: { pos: [25, 3.2, -150], look: [25, 3, -139], fov: 48 }, ...NIGHT, fog: 0.6, houses: [home({ door: k < 0.75 ? 1 : 1 - ease(seg(k, 0.75, 0.82)) })], spots: [porchLight()], actors: [hero(t, mv([25, 0.3, -147], [25, 0.3, -137.5], seg(k, 0, 0.75)), 0, "run", "scared", { hidden: k > 0.72 })], focus: [25, 0, -142] }),
  fgWait: ({ t, k }) => ({ cam: { pos: mv([25, 4, -158], [25, 4, -154], ease(k)), look: [25, 4, -138.5], fov: 46 }, ...NIGHT, fog: 0.7, houses: [home()], spots: [porchLight()], focus: [25, 0, -142] }),
  knock1: ({ t, k }) => ({ cam: { pos: mv([22, 2.2, -145], [22.4, 2.2, -144.4], k), look: [25, 2.4, -139], fov: 40 }, ...NIGHT, fog: 0.6, houses: [home()], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -140.4], anim: k > 0.3 ? "bang" : "idle", yaw: 0, mood: "worried" })], focus: [25, 0, -141] }),
  kidDoor: ({ t }) => ({ cam: { pos: [25, 2.2, -144.2], look: [25, 1.4, -140.4], fov: 40 }, ...NIGHT, fog: 0.5, houses: [home()], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -140.6], anim: "shout", yaw: Math.PI, mood: "shout" })], focus: [25, 0, -141] }),
  kidDoorClose: ({ t, k }) => ({ cam: { pos: mv([25, 2.3, -143.8], [25, 2.3, -143.4], k), look: [25, 2.1, -140.6], fov: 34 }, ...NIGHT, fog: 0.5, houses: [home()], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -140.6], anim: "bang", yaw: Math.PI, mood: "scared" })], focus: [25, 0, -141] }),
  winVoice: ({ t, k }) => ({ cam: { pos: mv([27.4, 4.4, -139.2], [27.4, 4.3, -139.6], k), look: [25, 0.8, -140.8], fov: 42 }, ...NIGHT, fog: 0.5, houses: [home()], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -140.8], anim: "idle", yaw: Math.PI, mood: "worried" })], focus: [25, 0, -141] }),
  winLook: ({ t }) => ({ cam: { pos: [27.4, 4.3, -151], look: [26.9, 4.5, -138.5], fov: 40 }, ...NIGHT, fog: 0.5, houses: [home()], spots: [porchLight()], focus: [25, 0, -141] }),
  winSee: ({ t, k }) => ({ cam: { pos: mv([26.4, 3.8, -139.4], [26.2, 3.6, -139.8], k), look: [25, 0.9, -141.2], fov: 32 }, ...NIGHT, fog: 0.5, houses: [home()], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -141.2], anim: "idle", yaw: 0.4, mood: "worried" })], focus: [25, 0, -141] }),
  winLock: ({ t, k }) => ({ cam: { pos: [25, 3.2, -146], look: [25, 3, -138.5], fov: 44 }, ...NIGHT, fog: 0.5, houses: [home({ door: 0.05 * ease(seg(k, 0.4, 0.6)) })], spots: [porchLight()], actors: [echoMilo(t, { at: [25, 0.3, -141], anim: "idle", yaw: 0, mood: "smile" })], focus: [25, 0, -141] }),
  knockBack: ({ t, k }) => ({ cam: { pos: mv([34, 4, -122], [33, 3.6, -124], k), look: [25, 2, -129.5], fov: 48 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [realMilo(t, { at: [25, 0.3, -128.6], anim: k > 0.45 ? "bang" : "idle", yaw: Math.PI, mood: "scared" })], focus: [25, 0, -130] }),
  backKid: ({ t, k }) => ({ cam: { pos: mv([27.6, 2.4, -125.4], [27.3, 2.4, -125.8], k), look: [25, 2.1, -128.6], fov: 40 }, ...NIGHT, fog: 0.5, houses: [home()], actors: [realMilo(t, { at: [25, 0.3, -128.6], anim: "shout", yaw: 0, mood: "shout" })], focus: [25, 0, -130] }),

  // s18 two Milos ────────────────────────────────────────────────────────────────
  brkPorch: ({ t, k }) => ({ cam: { pos: [21, 2.6, -146.5], look: [25, 2.8, -139.4], fov: 44 }, ...NIGHT, fog: 0.4, houses: [home({ door: ease(seg(k, 0, 0.4)) })], spots: [porchLight()], actors: [hero(t, mv([25, 0.3, -138], DOOR, seg(k, 0.2, 0.6)), Math.PI, k < 0.6 ? "walk" : "idle", "worried")], focus: [25, 0, -141] }),
  brkCall: ({ t, k }) => ({ cam: { pos: [25.5, 2.6, -149], look: [25, 2.6, -140.2], fov: 42 }, ...NIGHT, fog: 0.4, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, DOOR, Math.PI, "shout", "shout")], focus: [25, 0, -141] }),
  brkReveal: ({ t, k }) => yard(t, { anim: k < 0.4 ? "walk" : "idle", at: mv([18, 0.3, -146], REAL, seg(k, 0, 0.4)), yaw: k < 0.4 ? Math.PI / 4 : 0 }, { anim: k < 0.4 ? "walk" : "idle", at: mv([32, 0.3, -146], ECHO, seg(k, 0, 0.4)), yaw: k < 0.4 ? -Math.PI / 4 : 0 }, { pos: mv([25, 4.4, -139.4], [25, 3.8, -140.4], ease(k)), look: [25, 1.0, -144.8], fov: 52 }, { houses: [home({ door: 1 })] }),
  brkSide: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 1.3, -151], [25, 1.3, -149.6], ease(k)), look: [25, 1.6, -143], fov: 40 }, { houses: [home({ door: 1 })], actors: [realMilo(t), echoMilo(t), hero(t, DOOR, Math.PI, "idle", "scared")] }),
  brkClose: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([22.2, 1.6, -141.4], [27.8, 1.6, -141.4], ease(k)), look: [25, 1.4, -144.4], fov: 36 }, { houses: [home({ door: 1 })] }),
  brkPoint: ({ t, k }) => yard(t, { anim: "point", yaw: 0.9, mood: "shout" }, { anim: "point", yaw: -0.9, mood: "shout" }, { pos: [25, 2.6, -140.6], look: [25, 1.2, -144.4], fov: 46 }, { houses: [home({ door: 1 })] }),
  fakeYell: ({ t, k }) => yard(t, { anim: "point", yaw: 0.9, mood: "shout" }, { anim: "point", yaw: -0.9, mood: "shout" }, { pos: mv([25, 1.6, -142.4], [25, 1.6, -142.8], k), look: [25, 1.5, -144.4], fov: 40 }, { houses: [home({ door: 1 })], shake: 0.08 }),

  // s19–s22 the tests ────────────────────────────────────────────────────────────
  tsClock: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: mv([25, 6, -139.8], [25, 7, -139.8], k), look: [25, 0.6, -144.4], fov: 46 }, { houses: [home({ door: 1 })], clock: "06:00:00".slice(0, 5), actors: [realMilo(t), echoMilo(t), hero(t, [25, 0.3, -141.4], Math.PI, "idle", "worried")] }),
  tsTest: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "worried" }, { pos: [30, 2.6, -149], look: [25, 1.6, -143], fov: 44 }, { houses: [home({ door: 1 })], actors: [realMilo(t), echoMilo(t), hero(t, [25, 0.3, -141.6], Math.PI, "point", "worried")] }),
  tsShake: ({ t, k }) => yard(t, { mood: "smile", yaw: -0.3 }, { mood: "smile", yaw: 0.3 }, { pos: [28.8, 2.6, -141.0], look: [25, 1.3, -143.6], fov: 46 }, { houses: [home({ door: 1 })], actors: [realMilo(t, { yaw: 0.2 }), echoMilo(t, { yaw: -0.2 }), hero(t, [25, 0.3, -142.4], Math.PI, "work", "smile")] }),
  tsMoves: ({ t, k }) => yard(t, { anim: "cheer", t: t * 1.4, mood: "happy" }, { anim: "cheer", t: t * 1.4 - 0.37, mood: "happy" }, { pos: mv([25, 1.3, -149.6], [25, 1.3, -148.8], k), look: [25, 1.3, -144.4], fov: 40 }, { actors: [realMilo(t, { anim: "cheer", t: t * 1.4, mood: "happy", yaw: Math.PI }), echoMilo(t, { anim: "cheer", t: t * 1.4 - 0.37, mood: "happy", yaw: Math.PI })] }),
  tsOnly: ({ t, k }) => ({ cam: { pos: mv([25, 2.9, -146.6], [25, 2.9, -146.0], k), look: [25, 2.9, -141.6], fov: 34 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -141.6], Math.PI, "idle", "worried")], focus: [25, 0, -143] }),
  tsBoth: ({ t, k }) => yard(t, { anim: "jump", mood: "happy", t: t * 1.2 }, { anim: "jump", mood: "happy", t: t * 1.2 - 0.37 }, { pos: [25, 3.6, -140], look: [25, 1.0, -144.4], fov: 46 }, { houses: [home({ door: 1 })] }),
  tsSame: ({ t, k }) => yard(t, { mood: "smile", anim: "idle", t: 0 }, { mood: "smile", anim: "idle", t: -0.37 }, { pos: mv([25, 1.4, -150], [25, 1.4, -151], k), look: [25, 1.4, -144.4], fov: 38 }, { actors: [realMilo(0, { yaw: Math.PI, mood: "smile" }), echoMilo(-0.37, { yaw: Math.PI, mood: "smile" })] }),
  qAsk: ({ t, k }) => ({ cam: { pos: mv([25.4, 2.9, -147], [25.4, 2.9, -146.4], k), look: [25, 2.9, -141.6], fov: 34 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -141.6], Math.PI, "point", "worried")], focus: [25, 0, -143] }),
  qTogether: ({ t }) => yard(t, { anim: "shout", mood: "shout" }, { anim: "shout", mood: "shout" }, { pos: [25, 2.0, -140.8], look: [25, 1.4, -144.4], fov: 42 }, { houses: [home({ door: 1 })] }),
  qKite: ({ t, k }) => yard(t, { anim: "cheer", mood: "happy" }, { anim: "cheer", mood: "happy" }, { pos: mv([22.6, 1.4, -141.6], [27.4, 1.4, -141.6], ease(k)), look: [25, 1.4, -144.4], fov: 38 }, { houses: [home({ door: 1 })] }),
  trRight: ({ t, k }) => yard(t, { mood: "smile" }, { mood: "smile" }, { pos: [25, 3.4, -140.2], look: [25, 1.0, -144.4], fov: 46 }, { houses: [home({ door: 1 })] }),
  trEvery: ({ t, k }) => ({ cam: { pos: mv([20, 6, -150], [22, 5, -149], k), look: [25, 1, -143], fov: 46 }, ...NIGHT, fog: 0.3, houses: [home({ door: 1 })], spots: [porchLight()], actors: [realMilo(t), echoMilo(t), hero(t, [25, 0.3, -141.8], Math.PI, "point", "worried")], focus: [25, 0, -143] }),
  trFood: ({ t }) => yard(t, { anim: "cheer", mood: "happy" }, { anim: "cheer", mood: "happy" }, { pos: [22.4, 1.3, -147.6], look: [25, 1.3, -144.4], fov: 40 }, { actors: [realMilo(t, { anim: "cheer", mood: "happy", yaw: Math.PI }), echoMilo(t, { anim: "cheer", mood: "happy", yaw: Math.PI })] }),
  trFish: ({ t }) => yard(t, { anim: "point", mood: "smile", yaw: 0.2 }, { anim: "point", mood: "smile", yaw: -0.2 }, { pos: [25, 2.2, -140.8], look: [25, 1.3, -144.4], fov: 42 }, { houses: [home({ door: 1 })] }),
  trSong: ({ t }) => yard(t, { anim: "sit", mood: "smile", at: [23.8, 0.3, -144.4] }, { anim: "sit", mood: "smile", at: [26.2, 0.3, -144.4] }, { pos: [27.6, 1.0, -148.4], look: [25, 0.9, -144.4], fov: 40 }, { actors: [realMilo(t, { anim: "sit", mood: "smile", yaw: Math.PI }), echoMilo(t, { anim: "sit", mood: "smile", yaw: Math.PI })] }),
  trPerfect: ({ t, k }) => yard(t, { mood: "smile" }, { mood: "smile" }, { pos: mv([25, 5, -138.6], [25, 6.5, -138.2], k), look: [25, 0.8, -144.4], fov: 44 }, { houses: [home({ door: 1 })] }),
  trEcho: ({ t, k }) => yard(t, { mood: "smile", t: 0 }, { mood: "smile", t: -0.37 }, { pos: mv([25, 1.8, -140.6], [25, 1.8, -141.2], ease(k)), look: [25, 1.5, -144.4], fov: 44 }, { houses: [home({ door: 1 })] }),
  ntNotice: ({ t, k }) => ({ cam: { pos: mv([25.6, 2.9, -146.4], [25.6, 2.9, -145.9], k), look: [25.2, 2.9, -141.6], fov: 34 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -141.6], Math.PI + 0.2, "idle", "worried")], focus: [25, 0, -143] }),
  ntGrab: ({ t, k }) => ({ cam: { pos: [28.6, 1.8, -144.6], look: [26, 1.6, -142.6], fov: 40 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25.4, 0.3, -141.8], Math.PI, "idle", "worried"), echoMilo(t, { at: mv(ECHO, [26.1, 0.3, -142.8], ease(seg(k, 0.1, 0.4))), anim: k > 0.4 ? "grabbed" : "run", yaw: -0.6, mood: "scared" })], focus: [25, 0, -143] }),
  ntLeft: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "scared" }, { pos: mv([23.5, 2.0, -140.6], [23.5, 2.0, -141.0], k), look: [23.8, 1.6, -144.4], fov: 38 }, { houses: [home({ door: 1 })] }),
  ntSmile: ({ t, k }) => yard(t, { mood: k > 0.2 ? "happy" : "worried" }, { mood: "scared" }, { pos: mv([23.8, 1.95, -141.4], [23.8, 1.95, -141.9], ease(k)), look: [23.8, 1.7, -144.4], fov: 32 }, { houses: [home({ door: 1 })] }),
  ntGotcha: ({ t, k }) => ({ cam: { pos: mv([25.2, 2.95, -144.9], [25.2, 2.95, -144.5], k), look: [25, 2.9, -141.6], fov: 32 }, ...NIGHT, fog: 0.25, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -141.6], Math.PI, "idle", "worried")], focus: [25, 0, -143] }),
  ntNina: ({ t, k }) => ({ cam: { pos: mv([-25, 2.9, -144.6], [-25, 2.9, -144.0], ease(k)), look: [-25, 2.9, -142.4], fov: 34 }, ...NIGHT, fog: 0.1, actors: [{ look: DAD, anim: "idle", at: [-25, 0.3, -142.4], yaw: Math.PI, t, mood: "grin", noShadow: true }], ...SEP, focus: [-25, 0, -142] }),

  // s23–s25 Mister Gray at night ─────────────────────────────────────────────────
  alChose: ({ t, k }) => ({ cam: { pos: [25, 2.6, -139.7], look: [25, 1.4, -144.4], fov: 46 }, ...NIGHT, fog: 0.3, houses: [home({ door: 1 })], spots: [porchLight()], actors: [realMilo(t, { mood: "happy" }), echoMilo(t, { mood: "scared" }), hero(t, [25, 0.3, -142.2], Math.PI - 0.3, "point", "worried")], focus: [25, 0, -143] }),
  alStop: ({ t, k }) => ({ cam: { pos: mv([25.4, 2.9, -146], [25.4, 2.9, -145.6], k), look: [25, 2.9, -142.2], fov: 34 }, ...NIGHT, fog: 0.3, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -142.2], Math.PI - 2.4 * ease(seg(k, 0.2, 0.6)), "idle", "worried")], focus: [25, 0, -143] }),
  alGray: ({ k }) => ({ cam: { pos: [22, 3, -147], look: [-16, 3, -160], fov: 40 }, ...NIGHT, fog: 0.3, actors: [{ look: GRAY, anim: "idle", at: [-16, 0.78, -161], yaw: 0, t: 0, mood: "worried" }], focus: [0, 0, -155] }),
  alHands: ({ t, k }) => ({ cam: { pos: mv([25, 1.8, -150.6], [25, 1.8, -150], k), look: [25, 1.6, -145.4], fov: 42 }, ...NIGHT, fog: 0.35, houses: [home({ door: 1 })], spots: [porchLight()], actors: [hero(t, [25, 0.3, -145.4], Math.PI, "idle", "worried"), realMilo(t, { at: [23.5, 0.3, -145.6], yaw: Math.PI }), echoMilo(t, { at: [26.5, 0.3, -145.6], yaw: Math.PI })], focus: [25, 0, -146] }),
  alRun: ({ t, k }) => {
    const p = mv([22, 0.3, -146], [-12, 0.3, -156], k);
    return { cam: { pos: [p[0] + 8, 3, RZ + 1], look: [p[0] - 2, 1.6, p[2]], fov: 52 }, ...NIGHT, fog: 0.55, actors: [hero(t, p, -Math.PI / 2 - 0.3, "run", "scared"), realMilo(t * 1.3, { at: [p[0] + 0.6, 0.3, p[2] + 1.6], anim: "run", yaw: -Math.PI / 2 - 0.3 }), echoMilo(t * 1.3, { at: [p[0] + 0.6, 0.3, p[2] - 1.6], anim: "run", yaw: -Math.PI / 2 - 0.3 })], focus: [p[0], 0, p[2]] };
  },
  gdCrack: ({ t, k }) => ({ cam: { pos: [-11, 2.6, -152.5], look: [-16, 2.6, -159.6], fov: 40 }, ...NIGHT, fog: 0.4, actors: [{ look: GRAY, anim: "idle", at: [-16, 0.78, -160.4], yaw: 0, t, mood: "worried" }, hero(t, [-15, 0.3, -156.4], Math.PI, "idle", "worried"), realMilo(t, { at: [-16.6, 0.3, -155.8], yaw: Math.PI }), echoMilo(t, { at: [-13.4, 0.3, -155.8], yaw: Math.PI })], spots: [{ pos: [-16, 6, -159.6], aim: [-15, 0, -155], intensity: 0.8, angle: 0.7 }], focus: [-16, 0, -157] }),
  gdLook: ({ t, k }) => ({ cam: { pos: mv([-16.6, 2.6, -159.2], [-16.4, 2.6, -159.0], k), look: [-15, 0.9, -155.8], fov: 44 }, ...NIGHT, fog: 0.4, actors: [realMilo(t, { at: [-16.6, 0.3, -155.8], yaw: Math.PI }), echoMilo(t, { at: [-13.4, 0.3, -155.8], yaw: Math.PI }), hero(t, [-15, 0.3, -155.6], Math.PI, "idle", "worried")], spots: [{ pos: [-16, 6, -159.6], aim: [-15, 0, -155], intensity: 0.8, angle: 0.7 }], focus: [-16, 0, -157] }),
  gdMe: ({ t, k }) => ({ cam: { pos: mv([-16, 3.6, -156.6], [-16, 3.6, -157.2], ease(k)), look: [-16, 3.6, -160.4], fov: 34 }, ...NIGHT, fog: 0.2, actors: [{ look: GRAY, anim: "idle", at: [-16, 0.78, -160.4], yaw: 0, t, mood: "worried" }], spots: [{ pos: [-16, 6, -159.6], aim: [-15, 0, -155], intensity: 0.8, angle: 0.7 }], focus: [-16, 0, -157] }),
  gdFog: ({ k }) => ({ cam: { pos: mv([-34, 1.6, -150], [-30, 1.6, -150], k), look: [10, 2, -150], fov: 50 }, ...NIGHT, fog: 0.9, focus: [-20, 0, RZ] }),
  gdCopy: ({ t, k }) => ({ cam: { pos: [-15.4, 1.6, -158.6], look: [-15, 1.2, -155.8], fov: 46 }, ...NIGHT, fog: 0.3, actors: [realMilo(t, { at: [-16.6, 0.3, -155.8], yaw: Math.PI, mood: "worried" }), echoMilo(t, { at: [-13.4, 0.3, -155.8], yaw: Math.PI, mood: "worried" })], spots: [{ pos: [-16, 6, -159.6], aim: [-15, 0, -155], intensity: 0.8, angle: 0.7 }], focus: [-16, 0, -157] }),
  gdOne: ({ t, k }) => ({ cam: { pos: mv([-16, 3.6, -157.4], [-16, 3.6, -158.0], ease(k)), look: [-16, 3.6, -160.4], fov: 30 }, ...NIGHT, fog: 0.2, actors: [{ look: GRAY, anim: "point", at: [-16, 0.78, -160.4], yaw: 0, t, mood: "worried" }], spots: [{ pos: [-16, 6, -159.6], aim: [-15, 0, -155], intensity: 0.8, angle: 0.7 }], focus: [-16, 0, -157] }),
  gdWhat: ({ t, k }) => ({ cam: { pos: mv([-14.6, 2.9, -159.4], [-14.7, 2.9, -159.0], k), look: [-15, 2.9, -155.6], fov: 34 }, ...NIGHT, fog: 0.3, actors: [hero(t, [-15, 0.3, -155.6], Math.PI, "idle", "worried")], focus: [-16, 0, -157] }),
  gdSteps: ({ t, k }) => ({ cam: { pos: [-15, 1.2, -153], look: [10, 1.5, RZ], fov: 52 }, ...NIGHT, fog: 0.8, actors: [0, 1, 2, 3, 4].map((i) => ({ look: townLook(400 + i), anim: "walk" as Anim, at: [mix(24, 12, k) + i * 2.5, 0.3, RZ + (i % 2 ? 2 : -2)] as V3, yaw: -Math.PI / 2, t: t + i, mood: "grin" as Mood, noShadow: true })), focus: [0, 0, RZ] }),
  gdLots: ({ t, k }) => ({ cam: { pos: mv([-8, 6, -147], [-8, 8, -145], k), look: [14, 1.5, RZ], fov: 52 }, ...NIGHT, fog: 0.7, actors: Array.from({ length: 12 }, (_, i) => ({ look: townLook(410 + i), anim: "walk" as Anim, at: [mix(26, 14, k) + (i % 6) * 2.4, 0.3, RZ + ((i / 6) | 0) * 3 - 1.5] as V3, yaw: -Math.PI / 2, t: t + i, mood: "grin" as Mood, noShadow: true })), focus: [10, 0, RZ] }),
  gdPale: ({ t, k }) => ({ cam: { pos: mv([-16, 3.6, -156.8], [-16, 3.6, -157.4], ease(k)), look: [-16, 3.6, -160.4], fov: 32 }, ...NIGHT, fog: 0.2, actors: [{ look: GRAY, anim: "idle", at: [-16, 0.78, -160.4], yaw: 0, t, mood: "scared" }], focus: [-16, 0, -157] }),
  gdSlam: ({ t, k }) => ({ cam: { pos: [-12, 2.6, -153], look: [-16, 2.6, -160], fov: 42 }, ...NIGHT, fog: 0.4, actors: [{ look: GRAY, anim: "walk", at: [-16, 0.78, mix(-160.4, -162.4, seg(k, 0, 0.2))], yaw: Math.PI, t, mood: "scared", hidden: k > 0.2 }], shake: k > 0.15 && k < 0.3 ? 0.2 : 0, focus: [-16, 0, -157] }),
  gdShout: ({ t, k }) => ({ cam: { pos: mv([-10, 2.4, -150.4], [-10.6, 2.4, -151], k), look: [-15, 1.8, -155.6], fov: 40 }, ...NIGHT, fog: 0.5, actors: [hero(t, [-15, 0.3, -155.6], 0.6, "idle", "scared"), realMilo(t, { at: [-16.4, 0.3, -155], yaw: 0.6, mood: "scared" }), echoMilo(t, { at: [-13.8, 0.3, -155.2], yaw: 0.6, mood: "scared" })], focus: [-16, 0, -157] }),

  // s26 the lighthouse ───────────────────────────────────────────────────────────
  lhFar: ({ k }) => ({ cam: { pos: mv([LX - 50, 20, LZ + 60], [LX - 40, 26, LZ + 50], ease(k)), look: [LX, 20, LZ], fov: 50 }, ...NIGHT, fog: 0.4, lamp: { on: 0, lever: 0 }, focus: [LX, 0, LZ] }),
  lhLamp: ({ t, k }) => ({ cam: { pos: [LX - 18, LAMP[1] + 2, LZ + 18], look: LAMP, fov: 48 }, evil: 0.4, fog: 0, dusk: 0.8, lamp: { on: 1, aim: beamAim(t, 1.2, 0.5) }, ...SEP, focus: [LX, 0, LZ] }),
  lhTruth: ({ t, k }) => ({ cam: { pos: mv([LX - 26, 8, LZ + 30], [LX - 22, 14, LZ + 26], ease(k)), look: [LX, LAMP[1], LZ], fov: 50 }, ...NIGHT, fog: 0.4, lamp: { on: 0 }, focus: [LX, 0, LZ] }),

  // s27–s29 the run through the echoes ───────────────────────────────────────────
  rnRun: ({ t, k }) => {
    const p = mv([-6, 0.3, -152], [-1, 0.3, -140], k);
    return { cam: { pos: [p[0] - 6, 2.6, p[2] - 9], look: [p[0], 1.6, p[2] + 4], fov: 52 }, ...NIGHT, fog: 0.55, actors: trio(t, p, 0), focus: [p[0], 0, p[2]] };
  },
  rnStreet: ({ t, k }) => {
    const p = mv([0, 0.3, -135], [0, 0.3, -115], k);
    return { cam: { pos: [0, 2.8, p[2] + 9], look: [0, 1.4, p[2]], fov: 50 }, ...NIGHT, fog: 0.6, actors: trio(t, p, Math.PI), focus: [0, 0, p[2]] };
  },
  rnSaw: ({ t, k }) => {
    const p: V3 = [0, 0.3, -112];
    return { cam: { pos: mv([0, 3.1, -116.2], [0, 3.1, -115.6], k), look: [0, 3.0, -112], fov: 36 }, ...NIGHT, fog: 0.5, actors: [hero(t, p, Math.PI, "idle", "scared")], focus: [0, 0, -110] };
  },
  rnPeople: ({ t, k }) => ({ cam: { pos: mv([0, 2.6, -114], [0, 2.6, -110], ease(k)), look: [0, 2, -90], fov: 50 }, ...NIGHT, fog: 0.55, actors: crowd(12, -104, -72, t, 0), focus: [0, 0, -90] }),
  rnNeighbors: ({ t, k }) => ({ cam: { pos: [2.5, 2.4, -96], look: [-6.3, 2.4, -92], fov: 44 }, ...NIGHT, fog: 0.4, actors: crowd(12, -104, -72, t, 0), focus: [0, 0, -90] }),
  rnMail: ({ t, k }) => ({ cam: { pos: mv([1.8, 2.8, -91.4], [1.6, 2.8, -91.0], k), look: [5.7, 2.7, -91.3], fov: 34 }, ...NIGHT, fog: 0.3, actors: crowd(12, -104, -72, t, 0), focus: [0, 0, -90] }),
  rnRosa: ({ t, k }) => ({ cam: { pos: mv([1.4, 2.8, -85.6], [1.2, 2.8, -85.2], k), look: [-6.3, 2.8, -85.7], fov: 34 }, ...NIGHT, fog: 0.3, actors: crowd(12, -104, -72, t, 0), focus: [0, 0, -88] }),
  rnStand: ({ t, k }) => ({ cam: { pos: mv([0, 9, -108], [0, 11, -106], k), look: [0, 0, -85], fov: 50 }, ...NIGHT, fog: 0.4, actors: [...crowd(12, -104, -72, t, 0), ...trio(t, [0, 0.3, -100], Math.PI)], focus: [0, 0, -90] }),
  rnSmile: ({ t, k }) => ({ cam: { pos: mv([0.6, 2.8, -80.6], [0.9, 2.8, -80.6], k), look: [6.3, 2.8, -81], fov: 30 }, ...NIGHT, fog: 0.25, actors: crowd(12, -104, -72, t, 0), focus: [0, 0, -82] }),
  rnNot: ({ t, k }) => ({ cam: { pos: mv([0, 3, -70], [0, 3, -66], k), look: [0, 2, -95], fov: 50 }, ...NIGHT, fog: 0.5, actors: [...crowd(12, -104, -72, t, 0), ...trio(t, [0, 0.3, -88], Math.PI)], focus: [0, 0, -88] }),
  rnInside: ({ t, k }) => ({ cam: { pos: [-1, 4, -88], look: [-12, 6, -84], fov: 50 }, ...NIGHT, fog: 0.4, focus: [-10, 0, -85] }),
  rnEchoes: ({ t, k }) => ({ cam: { pos: mv([0, 18, -60], [0, 24, -56], ease(k)), look: [0, 0, -90], fov: 52 }, ...NIGHT, fog: 0.5, actors: [...crowd(16, -110, -62, t, 0), ...trio(t, mv([0, 0.3, -90], [0, 0.3, -76], k), Math.PI)], focus: [0, 0, -86] }),
  rnTurn: ({ t, k }) => ({ cam: { pos: [0, 2.6, -64], look: [0, 2.0, -88], fov: 50 }, ...NIGHT, fog: 0.45, actors: [...crowd(12, -100, -70, t, ease(k)), ...trio(t, mv([0, 0.3, -76], [0, 0.3, -68], k), 0)], focus: [0, 0, -80] }),
  rnFollow: ({ t, k }) => ({ cam: { pos: mv([0, 4, -55], [0, 4, -50], k), look: [0, 1.5, -80], fov: 52 }, ...NIGHT, fog: 0.55, actors: [...crowd(12, -100, -70, t, 1, k), ...trio(t, mv([0, 0.3, -62], [0, 0.3, -54], k), 0)], focus: [0, 0, -70] }),
  sqLeft: ({ t, k }) => {
    const p = mv([0, 0.3, -52], [4, 0.3, -42], k);
    return { cam: { pos: [p[0] - 2.4, 1.8, p[2] + 3.2], look: [p[0] - 1.3, 1.4, p[2]], fov: 40 }, ...NIGHT, fog: 0.4, actors: trio(t, p, 0.3, "scared"), focus: [p[0], 0, p[2]] };
  },
  sqRight: ({ t, k }) => {
    const p = mv([4, 0.3, -42], [8, 0.3, -36], k);
    return { cam: { pos: [p[0] + 3.2, 1.9, p[2] + 2.4], look: [p[0] + 0.8, 1.4, p[2]], fov: 40 }, ...NIGHT, fog: 0.4, actors: trio(t, p, 0.6), focus: [p[0], 0, p[2]] };
  },
  sqReach: ({ t, k }) => {
    const p = mv([6, 0.3, -36], [16, 0.3, -28], k);
    return { cam: { pos: mv([-12, 10, -10], [-6, 8, -12], k), look: [LX - 6, 6, LZ], fov: 50 }, ...NIGHT, fog: 0.4, lamp: { on: 0 }, actors: trio(t, p, yawTo(p, LIGHTHOUSE)), focus: [15, 0, -25] };
  },
  sqBehind: ({ t, k }) => ({ cam: { pos: [14, 2.8, -24], look: [-6, 1.6, -40], fov: 50 }, ...NIGHT, fog: 0.5, actors: plazaEchoes(10, t, 0.2 + k * 0.2, 44, 30), focus: [0, 0, -30] }),
  sqDoor: ({ t, k }) => ({ cam: { pos: mv([LH_DOOR[0] - 8, 2.4, LH_DOOR[2] + 8], [LH_DOOR[0] - 6, 2.4, LH_DOOR[2] + 6], k), look: [LH_DOOR[0], 2.6, LH_DOOR[2]], fov: 44 }, ...NIGHT, fog: 0.4, lamp: { on: 0 }, actors: trio(t, mv([LH_DOOR[0] - 6, 0.3, LH_DOOR[2] + 5], [LH_DOOR[0] - 1.6, 0.3, LH_DOOR[2] + 1.4], k), yawTo([0, 0, 0], LIGHTHOUSE)), focus: [LX, 0, LZ] }),

  // s30–s31 up the lighthouse; echoes climbing outside ───────────────────────────
  stRun: ({ t, k }) => ({ cam: { pos: [LX - 16, 4, LZ + 14], look: [LX, 6, LZ], fov: 50 }, ...NIGHT, fog: 0.4, lamp: { on: 0 }, actors: [...trio(t, mv([LH_DOOR[0] - 1.6, 0.3, LH_DOOR[2] + 1.4], LH_DOOR, k), yawTo(LH_DOOR, LIGHTHOUSE)).map((a) => ({ ...a, hidden: k > 0.7 })), ...plazaEchoes(10, t, 0.4 + k * 0.2)], focus: [LX, 0, LZ] }),
  stAround: ({ t, k }) => ({ cam: { pos: [LX + Math.sin(LH_FRONT + t * 0.6) * 30, mix(6, 22, k), LZ + Math.cos(LH_FRONT + t * 0.6) * 30], look: [LX, mix(8, 26, k), LZ], fov: 50 }, ...NIGHT, fog: 0.4, lamp: { on: 0 }, focus: [LX, 0, LZ] }),
  stLegs: ({ t, k }) => ({ cam: { pos: [LX - 22, 4, LZ + 22], look: [LX, 14, LZ], fov: 52 }, ...NIGHT, fog: 0.45, lamp: { on: 0 }, actors: plazaEchoes(14, t, 0.6 + 0.4 * k, 34, 9), focus: [LX, 0, LZ] }),
  stTop: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW + 0.3, 13, 3), look: gallery(SWITCH_YAW + 0.5, 3.6, 1.2), fov: 46 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: galleryTrio(t, k < 0.5 ? "run" : "idle", "scared"), focus: [LX, 0, LZ] }),
  stDown: ({ t, k }) => ({ cam: { pos: mv(gallery(LH_FRONT - 0.2, 5.6, 2.4), gallery(LH_FRONT - 0.2, 6.0, 2.2), k), look: [LX + Math.sin(LH_FRONT) * 14, 0, LZ + Math.cos(LH_FRONT) * 14], fov: 56 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: [...plazaEchoes(16, t, 0.95, 30, 9), ...climbers(10, t, 0.15)], focus: [LX, 0, LZ] }),
  spClimb: ({ t, k }) => ({ cam: { pos: mv([LX - 22, 6, LZ + 24], [LX - 20, 10, LZ + 22], ease(k)), look: [LX, 12, LZ], fov: 54 }, ...NIGHT, fog: 0.35, lamp: { on: 0 }, actors: climbers(14, t, 0.15 + 0.25 * k), focus: [LX, 0, LZ] }),
  spSpider: ({ t, k }) => {
    const a = LH_FRONT - 0.1;
    const h = mix(12, 15, k);
    const r = 4.6 - (1.3 * (h - 1.2)) / 30.8 + 0.7;
    return { cam: { pos: [LX + Math.sin(a + 0.35) * (r + 6), h + 2.5, LZ + Math.cos(a + 0.35) * (r + 6)], look: [LX + Math.sin(a) * r, h + 1.2, LZ + Math.cos(a) * r], fov: 46 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: [{ look: townLook(905), anim: "climb", at: [LX + Math.sin(a) * r, h, LZ + Math.cos(a) * r], yaw: a + Math.PI - 0.3, t: t * 1.3, mood: "grin", noShadow: true }, ...climbers(14, t, 0.35)], focus: [LX, 0, LZ] };
  },
  spFaces: ({ t, k }) => ({ cam: { pos: mv(gallery(LH_FRONT, 6.4, 3.0), gallery(LH_FRONT + 0.1, 6.6, 3.4), k), look: [LX + Math.sin(LH_FRONT) * 5, 18, LZ + Math.cos(LH_FRONT) * 5], fov: 60 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: climbers(14, t, 0.45 + 0.15 * k), focus: [LX, 0, LZ] }),

  // s32–s33 the lever ────────────────────────────────────────────────────────────
  lvLever: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW - 0.35, 10, 3.6), look: gallery(SWITCH_YAW + 0.2, 3.4, 2.0), fov: 46 }, ...NIGHT, fog: 0.3, lamp: { on: 0, lever: 0 }, actors: galleryTrio(t, "idle", "worried"), focus: [LX, 0, LZ] }),
  lvPull: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW - 0.5, 8.6, 2.4), look: gallery(SWITCH_YAW + 0.2, 3.6, 1.8), fov: 40 }, ...NIGHT, fog: 0.3, lamp: { on: 0, lever: 0.08 * Math.abs(Math.sin(t * 9)) }, actors: [hero(t, HERO_G, HERO_G_YAW, "lever", "shout"), echoMilo(t, { at: ECHO_G, yaw: HERO_G_YAW, mood: "scared" }), realMilo(t, { at: REAL_START, yaw: HERO_G_YAW, mood: "scared" })], shake: 0.05, focus: [LX, 0, LZ] }),
  lvStuck: ({ t, k }) => ({ cam: { pos: mv(out(SWITCH_YAW + 0.1, 8.2, 3.4), out(SWITCH_YAW + 0.12, 7.8, 3.3), k), look: gallery(SWITCH_YAW, 3.2, 1.6), fov: 34 }, ...NIGHT, fog: 0.2, lamp: { on: 0, lever: 0.06 * Math.abs(Math.sin(t * 11)) }, actors: [hero(t, HERO_G, HERO_G_YAW, "lever", "shout")], focus: [LX, 0, LZ] }),
  lvRun: ({ t, k }) => {
    const y = mix(SWITCH_YAW - 0.35, KID_YAW_G, ease(k));
    return { cam: { pos: out(SWITCH_YAW + 0.5, 13, 4.2), look: gallery(SWITCH_YAW + 0.5, 3, 1.0), fov: 50 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: [hero(t, HERO_G, HERO_G_YAW, "lever", "shout"), echoMilo(t, { at: ECHO_G, yaw: HERO_G_YAW, mood: "scared" }), realMilo(t, { at: gallery(y, 5.2), yaw: y - Math.PI / 2, anim: "run", mood: "scared" })], focus: [LX, 0, LZ] };
  },
  lvRail: ({ t, k }) => ({ cam: { pos: out(KID_YAW_G + 0.5, 11, 2.4), look: gallery(KID_YAW_G, 4.6, 2.0), fov: 42 }, ...NIGHT, fog: 0.3, lamp: { on: 0 }, actors: [realMilo(t, { at: REAL_G, yaw: KID_YAW_G, anim: "shout", mood: "shout" }), ...climbers(10, t, 0.6)], focus: [LX, 0, LZ] }),
  kidShout: ({ t, k }) => ({ cam: { pos: mv(out(KID_YAW_G, 9.4, 2.1), out(KID_YAW_G, 8.8, 2.1), k), look: gallery(KID_YAW_G, 4.8, 2.0), fov: 34 }, ...NIGHT, fog: 0.2, lamp: { on: 0 }, actors: [realMilo(t, { at: REAL_G, yaw: KID_YAW_G, anim: "shout", mood: "shout" })], shake: 0.1, focus: [LX, 0, LZ] }),
  lvStill: ({ t, k }) => ({ cam: { pos: mv(out(SWITCH_YAW + 0.75, 8.8, 2.1), out(SWITCH_YAW + 0.75, 8.299999999999999, 2.1), k), look: gallery(SWITCH_YAW + 0.7, 4.3, 2.0), fov: 36 }, ...NIGHT, fog: 0.2, lamp: { on: 0 }, actors: [hero(t, HERO_G, HERO_G_YAW, "lever", "shout"), echoMilo(0, { at: ECHO_G, yaw: yawTo(ECHO_G, out(SWITCH_YAW + 0.75, 7.6, 0)), mood: "worried", anim: "idle" })], focus: [LX, 0, LZ] }),
  lvWeight: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW - 0.45, 8.4, 2.6), look: gallery(SWITCH_YAW + 0.2, 3.5, 1.8), fov: 40 }, ...NIGHT, fog: 0.3, lamp: { on: 0, lever: 0.15 * ease(k) }, actors: [hero(t * 1.5, HERO_G, HERO_G_YAW, "lever", "shout"), echoMilo(0, { at: ECHO_G, yaw: HERO_G_YAW, mood: "worried" })], shake: 0.12, focus: [LX, 0, LZ] }),
  lvCrack: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW + 0.05, 6.2, 2.4), look: gallery(SWITCH_YAW, 3.2, 1.6), fov: 34 }, ...NIGHT, fog: 0.2, lamp: { on: 0, lever: k < 0.55 ? 0.15 + 0.05 * Math.sin(t * 20) : mix(0.2, 1, ease(seg(k, 0.55, 0.75))), spark: k > 0.55 ? 1 : 0 }, actors: [hero(t * 1.5, HERO_G, HERO_G_YAW, "lever", "shout")], shake: k > 0.55 ? 0.35 : 0.15, focus: [LX, 0, LZ] }),
  lvOn: ({ t, k }) => {
    const on = ease(seg(k, 0.45, 0.6));
    return { cam: { pos: mv([LX - 18, 18, LZ + 22], [LX - 20, 16, LZ + 25], k), look: [LX, LAMP[1], LZ], fov: 56 }, ...NIGHT, fog: 0.35, lamp: { on, lever: 1, aim: beamAim(t, -2.2, 0.4) }, flash: k > 0.45 && k < 0.6 ? 0.7 * (1 - seg(k, 0.45, 0.6)) : 0, shake: k > 0.45 ? 0.25 : 0, focus: [LX, GALLERY_Y, LZ] };
  },

  // s34 the beam ─────────────────────────────────────────────────────────────────
  bmShoot: ({ t, k }) => ({ cam: { pos: mv([LX - 40, 40, LZ + 60], [LX - 70, 60, LZ + 100], ease(k)), look: [LX - 10, 20, LZ], fov: 54 }, ...NIGHT, fog: 0.35, lamp: { on: 1, lever: 1, aim: beamAim(t, -2.0, 0.6) }, tint: "rgba(255,240,200,0.08)", focus: [LX, 0, LZ] }),
  bmSweep: ({ t, k }) => ({ cam: { pos: mv([-20, 50, 40], [-40, 60, 20], ease(k)), look: [10, 0, -20], fov: 56 }, ...NIGHT, fog: 0.3, lamp: { on: 1, lever: 1, aim: beamAim(t, -1.4, 0.9) }, actors: plazaEchoes(14, t, 0.9, 30, 10).map((a) => ({ ...a, anim: "idle" as Anim })), focus: [10, 0, -20] }),
  bmFreeze: ({ t, k }) => {
    const aim: V3 = [12, 0, -18];
    return { cam: { pos: [-2, 3, -6], look: [14, 2, -20], fov: 48 }, ...NIGHT, fog: 0.25, lamp: { on: 1, lever: 1, aim }, spots: [{ pos: LAMP, aim, intensity: 0.5, angle: 0.25, color: "#fff6dc" }], actors: plazaEchoes(14, 0, 0.75, 30, 10).map((a) => ({ ...a, anim: "idle" as Anim, mood: "scared" as Mood })), cast: { from: LIGHTHOUSE, len: 1.4, opacity: 0.6 }, focus: [12, 0, -18] };
  },
  bmShadow: ({ t, k }) => {
    // a real townsperson in the beam, peeking out of a doorway: a long shadow
    const aim: V3 = [6, 0, -14];
    return { cam: { pos: [-4, 2.4, -2], look: [6, 1.2, -14], fov: 44 }, ...NIGHT, fog: 0.2, lamp: { on: 1, lever: 1, aim }, spots: [{ pos: LAMP, aim, intensity: 0.5, angle: 0.22, color: "#fff6dc" }], actors: [{ look: townLook(11), anim: "lookup", at: [6, 0.3, -14], yaw: yawTo([6, 0, -14], LIGHTHOUSE), t, mood: "worried" }, { look: townLook(803), anim: "idle", at: [3.4, 0.3, -15.6], yaw: 0.4, t, mood: "grin", noShadow: true }], cast: { from: LIGHTHOUSE, len: 1.4, opacity: 0.6 }, focus: [6, 0, -14] };
  },
  bmNone: ({ t, k }) => {
    const aim: V3 = [12, 0, -18];
    return { cam: { pos: mv([1, 2.4, -26], [1.6, 2.3, -25], k), look: [12, 0.8, -18], fov: 46 }, ...NIGHT, fog: 0.15, lamp: { on: 1, lever: 1, aim: beamAim(t, 2.6, 0.2) }, spots: [{ pos: LAMP, aim, intensity: 0.5, angle: 0.25, color: "#fff6dc" }], actors: plazaEchoes(14, 0, 0.75, 30, 10).map((a) => ({ ...a, anim: "idle" as Anim })), cast: { from: LIGHTHOUSE, len: 1.4, opacity: 0.6 }, focus: [12, 0, -18] };
  },

  // s35–s36 the reveal on the balcony ────────────────────────────────────────────
  rvDown: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.35, 7.0, 4.2), out(SWITCH_YAW + 0.4, 6.8, 4.0), k), look: gallery(SWITCH_YAW + 0.85, 3.8, 0.3), fov: 52 }),
  rvRail: ({ t, k }) => revealFrame(t, { pos: mv(out(KID_YAW_G + 0.25, 7.0, 2.4), out(KID_YAW_G + 0.22, 6.8, 2.4), k), look: gallery(KID_YAW_G - 0.05, 4.0, 0.6), fov: 46 }),
  rvShadow: ({ t, k }) => revealFrame(t, { pos: mv(out(KID_YAW_G + 0.05, 6.6, 4.0), out(KID_YAW_G + 0.05, 6.4, 3.6), k), look: gallery(KID_YAW_G, 3.7, 0), fov: 44 }),
  rvHand: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.55, 7.2, 2.2), out(SWITCH_YAW + 0.55, 7.0, 2.3), k), look: gallery(SWITCH_YAW + 0.6, 4.2, 0.9), fov: 44 }),
  rvNone: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.75, 7.6, 2.2), out(SWITCH_YAW + 0.75, 7.3, 2.0), ease(k)), look: gallery(SWITCH_YAW + 0.85, 4.0, 0.3), fov: 46 }, { shake: k < 0.1 ? 0.15 : 0 }),
  rvLook: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.75, 8.0, 2.1), out(SWITCH_YAW + 0.75, 7.5, 2.1), k), look: gallery(SWITCH_YAW + 0.75, 4.4, 2.0), fov: 34 }, { echoYaw: yawTo(ECHO_G, out(SWITCH_YAW + 0.75, 6.8, 0)) }),
  rvGrin: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.75, 7.2, 2.1), out(SWITCH_YAW + 0.75, 6.8, 2.1), ease(k)), look: gallery(SWITCH_YAW + 0.75, 4.4, 2.0), fov: 30 }, { echoYaw: yawTo(ECHO_G, out(SWITCH_YAW + 0.75, 6.8, 0)), echoMood: k > 0.25 ? "grin" : "worried" }),
  rvWide: ({ t, k }) => revealFrame(t, { pos: mv(out(SWITCH_YAW + 0.75, 6.7, 2.1), out(SWITCH_YAW + 0.75, 6.4, 2.1), ease(k)), look: gallery(SWITCH_YAW + 0.75, 4.4, 2.0), fov: 26 }, { echoYaw: yawTo(ECHO_G, out(SWITCH_YAW + 0.75, 6.8, 0)), echoMood: "grin", shake: 0.05 }),
  rvLight: ({ t, k }) => revealFrame(t, { pos: out(SWITCH_YAW + 0.4, 9, 2.2), look: gallery(SWITCH_YAW + 0.65, 4.4, 1.2), fov: 44 }, { echoMood: "grin", tint: `rgba(255,245,210,${0.15 + 0.25 * k})`, shake: 0.1 * k }),
  rvBurst: ({ t, k }) => revealFrame(t, { pos: out(SWITCH_YAW + 0.45, 9.5, 2.2), look: gallery(SWITCH_YAW + 0.7, 4.4, 1.0), fov: 44 }, { echoMood: "grin", echoHidden: k > 0.2, flash: k > 0.15 && k < 0.25 ? 0.7 : 0, shake: k > 0.15 ? 0.3 * (1 - k) : 0, dust: [{ x: ECHO_G[0], z: ECHO_G[2], y: GALLERY_Y - 1, amount: seg(k, 0.15, 0.3) * (1 - seg(k, 0.8, 1)), spread: 2.2, color: "#0a0a12" }] }),

  // s37 the echoes burst all over town ───────────────────────────────────────────
  boTown: ({ t, k }) => {
    const n = 14;
    const echoes = plazaEchoes(n, 0, 0.75, 30, 10);
    return { cam: { pos: [-14, 14, 12], look: [14, 0, -22], fov: 54 }, ...NIGHT, fog: 0.3, lamp: { on: 1, lever: 1, aim: beamAim(t, -1.2, 0.9) }, actors: echoes.map((a, i) => ({ ...a, anim: "idle" as Anim, hidden: k > (i + 1) / (n + 2) })), dust: echoes.map((a, i) => ({ x: a.at[0], z: a.at[2], amount: clamp01((k - (i + 1) / (n + 2)) * 6) * (1 - clamp01((k - (i + 1) / (n + 2) - 0.25) * 4)), spread: 2.5, color: "#0a0a12" })), flash: Math.sin(k * 60) > 0.92 ? 0.25 : 0, focus: [14, 0, -22] };
  },
  boFire: ({ t, k }) => ({ cam: { pos: mv([0, 30, -40], [0, 36, -30], ease(k)), look: [0, 0, -110], fov: 56 }, ...NIGHT, fog: 0.35, lamp: { on: 1, lever: 1, aim: beamAim(t, 3.0, 0.8) }, actors: crowd(12, -104, -72, 0, 0).map((a, i) => ({ ...a, hidden: k > (i + 1) / 14 })), dust: crowd(12, -104, -72, 0, 0).map((a, i) => ({ x: a.at[0], z: a.at[2], amount: clamp01((k - (i + 1) / 14) * 6) * (1 - clamp01((k - (i + 1) / 14 - 0.25) * 4)), spread: 3, color: "#0a0a12" })), focus: [0, 0, -88] }),
  boFog: ({ t, k }) => ({ cam: { pos: mv([LX - 30, 34, LZ + 40], [LX - 60, 60, LZ + 90], ease(k)), look: [0, 0, -60], fov: 54 }, evil: mix(1, 0.6, k), fog: mix(0.4, 0, ease(k)), lamp: { on: 1, lever: 1, aim: beamAim(t, 2.4, 0.6) }, focus: [0, 0, -40] }),

  // s38 the hug ──────────────────────────────────────────────────────────────────
  hugRun: ({ t, k }) => ({ cam: { pos: out(KID_YAW_G + 0.9, 10, 2.4), look: gallery(KID_YAW_G + 0.9, 4.4, 1.0), fov: 44 }, evil: 0.7, fog: 0.1, lamp: { on: 0.8, lever: 1, aim: beamAim(t, 1, 0.3) }, actors: [hero(t, k < 0.6 ? HERO_G : gallery(KID_YAW_G + 0.9, 4.4), k < 0.6 ? HERO_G_YAW : KID_YAW_G + 0.9 + Math.PI / 2, k < 0.6 ? "idle" : "sit", "happy"), realMilo(t, { at: mv(REAL_G, gallery(KID_YAW_G + 0.75, 4.4), ease(seg(k, 0, 0.6))), yaw: KID_YAW_G + Math.PI / 2, anim: k < 0.6 ? "run" : "sit", mood: "happy" })], focus: [LX, 0, LZ] }),
  hugShake: ({ t, k }) => ({ cam: { pos: out(KID_YAW_G + 0.82, 7.4, 2.8), look: gallery(KID_YAW_G + 0.82, 4.4, 0.9), fov: 36 }, evil: 0.7, fog: 0.1, lamp: { on: 0.8, lever: 1, aim: beamAim(t, 1, 0.3) }, actors: [hero(t, gallery(KID_YAW_G + 0.9, 4.4), KID_YAW_G + 0.9 - Math.PI / 2, "sit", "worried"), realMilo(t, { at: gallery(KID_YAW_G + 0.75, 4.4), yaw: KID_YAW_G + 0.75 + Math.PI / 2, anim: "sit", mood: "scared" })], shake: 0.03, focus: [LX, 0, LZ] }),
  hugSmile: ({ t, k }) => ({ cam: { pos: mv(out(KID_YAW_G + 0.75, 6.4, 2.8), out(KID_YAW_G + 0.75, 6.0, 2.8), k), look: gallery(KID_YAW_G + 0.75, 4.4, 0.9), fov: 32 }, evil: 0.7, fog: 0.1, lamp: { on: 0.8, lever: 1, aim: beamAim(t, 1, 0.3) }, actors: [realMilo(t, { at: gallery(KID_YAW_G + 0.75, 4.4), yaw: KID_YAW_G + 0.75, anim: "sit", mood: "happy" })], focus: [LX, 0, LZ] }),
  hugWrong: ({ t, k }) => ({ cam: { pos: mv(out(KID_YAW_G + 0.95, 6.6, 2.8), out(KID_YAW_G + 0.95, 6.2, 2.8), k), look: gallery(KID_YAW_G + 0.9, 4.4, 0.9), fov: 34 }, evil: 0.7, fog: 0.1, lamp: { on: 0.8, lever: 1, aim: beamAim(t, 1, 0.3) }, actors: [hero(t, gallery(KID_YAW_G + 0.9, 4.4), KID_YAW_G + 0.9, "sit", "worried")], focus: [LX, 0, LZ] }),
  hugHand: ({ t, k }) => ({ cam: { pos: out(SWITCH_YAW + 0.6, 8.6, 2.0), look: gallery(SWITCH_YAW + 0.65, 4.4, 1.2), fov: 40 }, ...NIGHT, fog: 0.25, lamp: { on: 0, lever: 0.1 }, actors: [hero(t, HERO_G, HERO_G_YAW, "lever", "shout"), echoMilo(t, { at: ECHO_G, yaw: HERO_G_YAW, mood: "scared" })], ...SEP, focus: [LX, 0, LZ] }),

  // s39 payoff: back to the hook ─────────────────────────────────────────────────
  pyTruth: ({ t, k }) => ({ cam: { pos: mv([LX - 30, 12, LZ + 36], [LX - 26, 18, LZ + 30], ease(k)), look: LAMP, fov: 48 }, evil: 0.6, fog: 0.05, dusk: 0.5, lamp: { on: 1, lever: 1, aim: beamAim(t, 0.4, 0.4) }, focus: [LX, 0, LZ] }),
  pyCopy: ({ t, k }) => ({ cam: { pos: mv([0, 2.9, -86.4], [0, 2.9, -86.9], k), look: [0, 2.9, -90], fov: 40 }, ...NIGHT, fog: 0.3, actors: [{ look: townLook(33), anim: "idle", at: [-1.2, 0.3, -90], yaw: 0.25, t, mood: "worried" }, { look: townLook(33), anim: "idle", at: [1.2, 0.3, -90], yaw: -0.25, t: t + 0.4, mood: "grin", noShadow: true }], ...SEP, focus: [0, 0, -90] }),
  pyShadow: ({ t, k }) => ({ cam: { pos: [0, 3.4, -83.5], look: [0, 0.8, -88.5], fov: 50 }, ...NIGHT, fog: 0.15, spots: [{ pos: [0, 7, -95], aim: [0, 0, -87], intensity: 1.2, angle: 0.6 }], actors: [{ look: townLook(33), anim: "idle", at: [-1.2, 0.3, -90], yaw: 0, t, mood: "worried" }, { look: townLook(33), anim: "idle", at: [1.2, 0.3, -90], yaw: 0, t: t + 0.4, mood: "grin", noShadow: true }], cast: { from: [0, 0, -95], len: 1.4, opacity: 0.6 }, focus: [0, 0, -90] }),
  pyBack: ({ t, k }) => ({ ...yard(t, { mood: "scared" }, { mood: "scared" }, { pos: [25, 4.0, -139.8], look: [25, 1.1, -145], fov: 50 }), rewind: 1, clock: "00:10" }),
  pyFeet: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([25, 3.4, -140.6], [25, 2.6, -141.6], ease(k)), look: [25, 0.3, -145.6], fov: 46 }, { spots: [porchLight(1.3)] }),
  pyRight: ({ t, k }) => yard(t, { mood: "scared" }, { mood: "scared" }, { pos: mv([26.4, 2.4, -141.8], [26.3, 1.9, -142.6], ease(k)), look: [26.2, 0.3, -145.2], fov: 40 }, { spots: [porchLight(1.3)] }),
  pyNotOnce: ({ t, k }) => yard(t, { mood: "scared" }, { mood: k > 0.5 ? "grin" : "scared" }, { pos: mv([26.2, 1.0, -147.6], [26.2, 1.0, -147.0], k), look: [26.2, 0.5, -144.4], fov: 38 }, { actors: [realMilo(t, { yaw: Math.PI }), echoMilo(t, { yaw: Math.PI, mood: k > 0.5 ? "grin" : "scared" })], spots: [porchLight(1.3)] }),
  pySpot: ({ t, k }) => yard(t, { mood: "worried" }, { mood: "grin" }, { pos: mv([25, 2.8, -140.4], [25, 3.4, -139.8], ease(k)), look: [25, 1.0, -145], fov: 48 }, { spots: [porchLight(1.3)] }),

  // s40 dawn ─────────────────────────────────────────────────────────────────────
  dwMom: ({ t, k }) => ({ cam: { pos: [18, 2.6, -146.4], look: [28, 1.8, -147], fov: 48 }, evil: 0.1, fog: 0, dusk: 0.8, houses: [home({ glow: 0.2 })], cars: [{ color: "#4fb3a9", at: [mix(50, 30, ease(seg(k, 0, 0.6))), 0, RZ - 2.5], yaw: -Math.PI / 2, wheelT: (1 - k) * 8 }], actors: k > 0.6 ? [{ look: MOM, anim: "run", at: mv([30, 0.3, -146], [27, 0.3, -145], seg(k, 0.6, 1)), yaw: -0.8, t, mood: "worried" }] : [], focus: [25, 0, -145] }),
  dwTold: ({ t, k }) => ({ cam: { pos: [25, 2.6, -150.5], look: [25, 2.0, -143.8], fov: 42 }, evil: 0.05, fog: 0, dusk: 0.8, houses: [home({ glow: 0.2, door: 1 })], actors: [{ look: MOM, anim: "idle", at: [25, 0.3, -143.2], yaw: Math.PI, t, mood: "worried" }, hero(t, [23.4, 0.3, -144.6], 0.6, "point", "worried"), realMilo(t, { at: [26.4, 0.3, -144.6], yaw: -0.6, mood: "smile" })], focus: [25, 0, -145] }),
  dwGray: ({ t, k }) => ({ cam: { pos: [mix(8, 20, k) + 2, 2.8, -152], look: [mix(8, 20, k), 2.4, -146.6], fov: 46 }, evil: 0, fog: 0, dusk: 0.7, houses: [home({ glow: 0.2, door: 1 })], actors: [{ look: GRAY, anim: "walk", at: [mix(8, 20, k), 0.3, -146.6], yaw: Math.PI / 2, t, mood: "smile", holding: "bucket" }], focus: [20, 0, -146] }),
  dwStory: ({ t, k }) => ({ cam: { pos: mv([24, 1.4, -151], [24, 1.6, -150], k), look: [24, 1.2, -145], fov: 44 }, evil: 0, fog: 0, dusk: 0.6, houses: [home({ glow: 0, door: 1 })], actors: [{ look: GRAY, anim: "sit", at: [22.6, 0.3, -144.2], yaw: Math.PI / 2 + 0.5, t, mood: "worried" }, hero(t, [25, 0.3, -144.4], -Math.PI / 2 - 0.3, "sit", "worried"), realMilo(t, { at: [26.4, 0.3, -144.4], yaw: -Math.PI / 2 - 0.3, anim: "sit", mood: "worried" }), { look: MOM, anim: "idle", at: [25, 0.3, -142.6], yaw: Math.PI, t, mood: "worried" }], focus: [25, 0, -145] }),
  dwSame: ({ t, k }) => ({ cam: { pos: mv([20.2, 2.6, -147.6], [20.4, 2.6, -147.2], k), look: [22.6, 2.2, -144.2], fov: 34 }, evil: 0, fog: 0, dusk: 0.6, actors: [{ look: GRAY, anim: "sit", at: [22.6, 0.3, -144.2], yaw: Math.PI / 2 + 0.5, t, mood: "worried" }], ...SEP, focus: [25, 0, -145] }),

  // s41–s43 the cliffhanger: no shadow ───────────────────────────────────────────
  enWalk: ({ t, k }) => {
    const x = mix(-10, 6, k);
    return { cam: { pos: [x + 9, 2.8, -147], look: [x, 1.6, -143], fov: 48 }, evil: 0, fog: 0, actors: [hero(t, [x, 0.3, -143], Math.PI / 2, "walk", "smile", { noShadow: true }), realMilo(t, { at: [x + 0.4, 0.3, -144.6], yaw: Math.PI / 2, anim: "walk", mood: "happy" })], focus: [x, 0, -143] };
  },
  enStop: ({ t, k }) => ({ cam: { pos: [10, 1.6, -148.4], look: [6.4, 1.3, -144], fov: 40 }, evil: 0, fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI / 2, k < 0.3 ? "walk" : "idle", "smile", { noShadow: true }), realMilo(t, { at: [6.4, 0.3, -144.6], yaw: Math.PI / 2 - 0.6 * seg(k, 0.3, 0.6), anim: k < 0.3 ? "walk" : "idle", mood: "worried" })], focus: [6, 0, -143] }),
  enStare: ({ t, k }) => ({ cam: { pos: mv([8.6, 2.4, -141.6], [8.4, 2.4, -141.9], k), look: [6.4, 2.1, -144.6], fov: 32 }, evil: 0.05, fog: 0, actors: [realMilo(t, { at: [6.4, 0.3, -144.6], yaw: -0.4, mood: "scared" })], focus: [6, 0, -143] }),
  enFeet: ({ t, k }) => ({ cam: { pos: mv([9.4, 1.2, -146.8], [8.8, 0.9, -146.2], ease(k)), look: [6, 0.3, -143.2], fov: 40 }, evil: 0.05, fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI / 2, "idle", "smile", { noShadow: true }), realMilo(t, { at: [6.4, 0.3, -144.6], yaw: -0.4, mood: "scared" })], focus: [6, 0, -143] }),
  enLetgo: ({ t, k }) => ({ cam: { pos: [6.2, 1.5, -150], look: [6.2, 1.2, -144], fov: 40 }, evil: 0.1, fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI, "idle", "worried", { noShadow: true }), realMilo(t, { at: mv([6.4, 0.3, -144.6], [7.4, 0.3, -145.4], ease(seg(k, 0.3, 1))), yaw: -0.4, mood: "scared" })], focus: [6, 0, -143] }),
  enStep: ({ t, k }) => ({ cam: { pos: mv([7.6, 1.5, -148.2], [7.8, 1.5, -148.8], k), look: [7.6, 1.4, -145.6], fov: 34 }, evil: 0.15, fog: 0, actors: [realMilo(t, { at: mv([7.4, 0.3, -145.4], [7.8, 0.3, -146.4], ease(k)), yaw: -0.3, anim: k < 0.6 ? "walk" : "idle", mood: "scared" })], focus: [6, 0, -143] }),
  enLook: ({ t, k }) => ({ cam: { pos: mv([6, 2.95, -146.0], [6, 2.95, -145.6], k), look: [6, 2.9, -143], fov: 32 }, evil: 0.2, fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI, "idle", "scared", { noShadow: true })], focus: [6, 0, -143] }),
  enDid: ({ t, k }) => ({ cam: { pos: mv([6, 4.4, -144.2], [6, 3.6, -144.0], ease(k)), look: [6, 0.3, -143.4], fov: 48 }, evil: 0.2 + 0.3 * seg(k, 0.6, 1), fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI, "idle", "scared", { noShadow: true }), realMilo(t, { at: [7.8, 0.3, -146.4], yaw: -0.3, mood: "scared" })], spots: [{ pos: [2, 7, -150], aim: [7, 0, -144], intensity: 0.8, angle: 0.5 }], shake: k > 0.7 ? 0.15 : 0, focus: [6, 0, -143] }),
  enEnd: ({ t, k }) => ({ cam: { pos: mv([6, 6, -160], [6, 30, -190], ease(k)), look: [6, 1.6, -143], fov: 50 }, evil: 0.2, fog: 0, actors: [hero(t, [6, 0.3, -143], Math.PI, "idle", "scared", { noShadow: true }), realMilo(t, { at: [7.8, 0.3, -146.4], yaw: -0.3, mood: "scared" })], focus: [6, 0, -143] }),
};

// ── helpers that need the shot list's places ───────────────────────────────────
function OLD3(): V3 {
  return [OLD[0], 0, OLD[1] - 6];
}
function plazaStroll(t: number, anim: Anim = "walk"): ActorSpec[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + t * 0.04 * (i % 2 ? 1 : -1);
    const r = 15 + (i % 3) * 4;
    return { look: townLook(500 + i), anim, at: [Math.cos(a) * r, 0.3, Math.sin(a) * r] as V3, yaw: a + (i % 2 ? 0 : Math.PI), t: t + i, mood: anim === "lookup" ? "worried" : "smile" };
  });
}
function streetFolk(t: number, anim: Anim, k: number): ActorSpec[] {
  return Array.from({ length: 8 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const z = 70 + i * 5 + t * 3 * k;
    return { look: townLook(600 + i), anim, at: [side * (6.4 + (i % 3) * 0.6), 0.3, z] as V3, yaw: 0, t: t + i, mood: "scared" };
  });
}
function runners(t: number, k: number): ActorSpec[] {
  return [0, 1, 2].map((i) => ({ look: townLook(620 + i), anim: "run" as Anim, at: [mix(6 + i * 4, 22, k), 0.3, RZ + 2 + i] as V3, yaw: Math.PI / 2, t: t + i, mood: "scared" as Mood }));
}
/** the narrator with a Milo in each hand: real on his left (-x when facing +z), echo on his right */
function trio(t: number, p: V3, yaw: number, realMood: Mood = "scared"): ActorSpec[] {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const side = (d: number): V3 => [p[0] + c * d, p[1], p[2] - s * d];
  return [hero(t, p, yaw, "run", "scared"), realMilo(t * 1.3, { at: side(1.5), yaw, anim: "run", mood: realMood }), echoMilo(t * 1.3, { at: side(-1.5), yaw, anim: "run", mood: "scared" })];
}
function galleryTrio(t: number, anim: Anim, mood: Mood): ActorSpec[] {
  return [hero(t, HERO_G, HERO_G_YAW, anim, mood), echoMilo(t, { at: ECHO_G, yaw: HERO_G_YAW, anim, mood }), realMilo(t, { at: REAL_START, yaw: HERO_G_YAW, anim, mood })];
}
/** The lit balcony: the lamp throws a shadow-casting light onto the floor around the brothers. */
function revealFrame(t: number, cam: Frame["cam"], o: { echoYaw?: number; echoMood?: Mood; echoHidden?: boolean; tint?: string; flash?: number; shake?: number; dust?: Frame["dust"] } = {}): Frame {
  return {
    cam,
    evil: 0.9,
    fog: 0.15,
    lamp: { on: 1, lever: 1, aim: beamAim(t, -1.0, 0.25) },
    spots: [{ pos: out(SWITCH_YAW + 0.95, 9, 7.5), aim: gallery(SWITCH_YAW + 0.95, 3.4, 0), intensity: 0.7, angle: 0.55, color: "#fff4d8" }],
    actors: [
      hero(t, HERO_G, HERO_G_YAW + 0.8, "idle", "scared"),
      echoMilo(t, { at: ECHO_G, yaw: o.echoYaw ?? HERO_G_YAW + 0.6, mood: o.echoMood ?? "worried", hidden: o.echoHidden }),
      realMilo(t, { at: REAL_G, yaw: KID_YAW_G + Math.PI, mood: "happy" }),
    ],
    cast: { from: out(SWITCH_YAW + 0.95, 9, 0), len: 1.15, opacity: 0.7 },
    tint: o.tint,
    flash: o.flash,
    shake: o.shake,
    dust: o.dust,
    focus: [LX, GALLERY_Y, LZ],
  };
}

/** Re-frame a shot for the vertical Short: pull the camera back and widen it so side-by-side subjects fit. */
const portraitCam = (f: Frame): Frame => {
  const { pos, look, fov = 50 } = f.cam;
  const d: V3 = [pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]];
  const pull = 1.25;
  return { ...f, cam: { ...f.cam, pos: outsideHouses([look[0] + d[0] * pull, look[1] + d[1] * pull, look[2] + d[2] * pull]), fov: Math.min(80, fov * 1.3) } };
};

/** Close cameras sat too tight on faces in review: ease them back a little. */
const easeBack = (f: Frame): Frame => {
  const { pos, look } = f.cam;
  const d: V3 = [pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]];
  const n = Math.hypot(d[0], d[1], d[2]);
  if (n >= 9) return f;
  const p = 1 + 0.35 * (1 - n / 9) * 1.6;
  return { ...f, cam: { ...f.cam, pos: outsideHouses([look[0] + d[0] * p, look[1] + d[1] * p, look[2] + d[2] * p]) } };
};
/** Keep a camera in front of (or behind) the house walls at LOT and OLD. */
const outsideHouses = (p: V3): V3 => {
  for (const [hx, hz] of [LOT, OLD]) {
    if (Math.abs(p[0] - hx) < 4.2 && p[2] > hz - 5.0 && p[2] < hz + 5.0 && p[1] < 12) return [p[0], p[1], p[2] < hz ? hz - 5.0 : hz + 5.0];
  }
  return p;
};

export const makeShots = (portrait: boolean, overrides: Record<string, Shot> = {}): Record<string, Shot> =>
  Object.fromEntries(
    Object.entries({ ...RAW, ...overrides }).map(([n, s]) => [
      n,
      (c) => {
        const raw = s(c);
        const f = easeBack({ palette: "night", cast: { dir: Math.atan2(-80, -60), len: 0.6, opacity: raw.evil > 0.5 ? 0.42 : 0.3 }, ...raw } as Frame);
        return portrait && !(n in overrides) ? portraitCam(f) : f;
      },
    ]),
  );

export const SHOTS = makeShots(false);
export { RAW, yard, realMilo, echoMilo, hero, home, porchLight, REAL, ECHO, DOOR, NIGHT };
