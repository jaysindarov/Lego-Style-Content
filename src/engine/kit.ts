/**
 * Shot kit: the types a story's shots return and the small helpers they use.
 * A shot is a pure function of its local time; the renderer cuts on words.
 */
import type { Anim, Look, Mood } from "../world/Avatar";
import { townLook } from "../world/Avatar";
import type { V3 } from "../world/layout";
import type { WormState } from "../world/Worm";

export type { V3 };

export type ActorSpec = {
  look: Look;
  anim: Anim;
  at: V3;
  yaw: number;
  mood?: Mood;
  t?: number;
  scale?: number;
  roll?: number;
  holding?: "bucket" | null;
  hidden?: boolean;
};

export type Frame = {
  cam: { pos: V3; look: V3; fov?: number; roll?: number };
  evil: number;
  fog: number;
  dusk?: number;
  worm?: WormState | null;
  cracks?: { x: number; z: number; size: number; amount: number }[];
  mounds?: { x: number; z: number; yaw: number; amount: number; scale?: number }[];
  dust?: { x: number; z: number; amount: number; spread?: number; color?: string }[];
  actors?: ActorSpec[];
  cars?: { color: string; at: V3; yaw: number; crush?: number; wheelT?: number; lights?: number }[];
  bikes?: { at: V3; yaw: number; tilt?: number; t?: number }[];
  siren?: number;
  shake?: number;
  flash?: number;
  tower?: { bellSwing: number; gearIn: number; lever: number; glow: number };
  wave?: number;
  roofSet?: boolean;
  clock?: string;
  tint?: string;
  focus?: V3;
  horn?: number;
};

/** t: seconds since the cut, d: shot length, k: t/d in 0..1 */
export type Ctx = { t: number; d: number; k: number };
export type Shot = (c: Ctx) => Frame;

// ── helpers ───────────────────────────────────────────────────────────────────
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const mv = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
export const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));
export const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);


/** Townsfolk on both sidewalks of a street along z (x = 0): walk, look up, or run and climb the facades. */
export const street = (n: number, zFrom: number, zTo: number, seed: number, mode: "walk" | "look" | "climb", t: number, k: number): ActorSpec[] =>
  Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const z = mix(zFrom, zTo, (i + 0.5) / n);
    const x = side * (6.2 + (i % 3) * 0.8);
    const look = townLook(seed + i);
    if (mode === "walk") return { look, anim: "walk", at: [x, 0.3, z - t * 1.6 * side] as V3, yaw: side > 0 ? Math.PI : 0, t: t + i };
    if (mode === "look") return { look, anim: "lookup", at: [x, 0.3, z] as V3, yaw: side > 0 ? -Math.PI / 2 - 0.6 : Math.PI / 2 + 0.6, t: t + i, mood: "worried" };
    // climb the facade beside them
    const start = 0.15 + (i % 4) * 0.07;
    const kk = seg(k, start, 1);
    const fx = side * 8.65;
    const runK = seg(kk, 0, 0.2);
    const climbK = seg(kk, 0.2, 1);
    const y = 0.3 + climbK * (5 + 4.2 * (2 + (i % 3)));
    const at: V3 = [mix(x, fx, runK), y, z];
    return { look, anim: runK < 1 ? "panic" : "climb", at, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2, t: t + i, mood: "scared" };
  });

export const clockStr = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

