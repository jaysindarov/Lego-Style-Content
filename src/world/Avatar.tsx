/**
 * Blocky avatar: box head with a drawn face, 2x2x1 torso, 1x2x1 limbs that
 * swing from shoulder and hip. Feet at the origin, facing +z.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { faceTex, rng, torsoTex } from "./textures";
import { shadowFaceTex } from "./textures";

export type Mood = "smile" | "scared" | "shout" | "worried" | "happy" | "grin";
export type Anim =
  | "idle"
  | "walk"
  | "run"
  | "panic"
  | "lookup"
  | "climb"
  | "jump"
  | "bike"
  | "bang"
  | "cheer"
  | "shout"
  | "lever"
  | "work"
  | "grabbed"
  | "point"
  | "sit";

export type Look = {
  skin: string;
  hair: string;
  hairStyle: "spiky" | "short" | "long" | "beanie" | "bald";
  top: string;
  shirt: string;
  topKind: "jacket" | "hoodie" | "tee" | "dress";
  pants: string;
  shoes: string;
};

export const LOOKS: Record<string, Look> = {
  hero: { skin: "#f2c9a0", hair: "#f3cf5a", hairStyle: "spiky", top: "#2f6fd6", shirt: "#ffffff", topKind: "jacket", pants: "#2a2a33", shoes: "#f4f4f4" },
  kid: { skin: "#f2c9a0", hair: "#d9963a", hairStyle: "short", top: "#ffc928", shirt: "#ffc928", topKind: "hoodie", pants: "#3b6fb6", shoes: "#ffffff" },
  girl: { skin: "#e8b48c", hair: "#5a3a22", hairStyle: "long", top: "#ff7eb6", shirt: "#ff7eb6", topKind: "tee", pants: "#7b5cd6", shoes: "#ffffff" },
  survivor: { skin: "#d9a57c", hair: "#2b1d14", hairStyle: "short", top: "#e07a2f", shirt: "#333333", topKind: "jacket", pants: "#555b66", shoes: "#2a2a2a" },
  victim: { skin: "#c98e64", hair: "#3f9b3a", hairStyle: "beanie", top: "#b6d94a", shirt: "#b6d94a", topKind: "hoodie", pants: "#3b5fa0", shoes: "#f0f0f0" },
};

const SKINS = ["#f2c9a0", "#e8b48c", "#c98e64", "#a8714d", "#f6d7b8"];
const HAIRS = ["#2b1d14", "#5a3a22", "#f3cf5a", "#1b1b1b", "#a0522d", "#d9963a"];
const TOPS = ["#e8434f", "#2e9e5b", "#8a4fd6", "#f08a24", "#3aa7d8", "#ffffff", "#ff7eb6", "#4a4a4a", "#c9b6f2"];
const PANTS = ["#2a2a33", "#3b5fa0", "#555b66", "#6b4a2f", "#1f3a5f"];
const STYLES: Look["hairStyle"][] = ["short", "long", "spiky", "beanie", "short", "bald"];
const KINDS: Look["topKind"][] = ["tee", "hoodie", "jacket", "dress"];

const lookCache = new Map<number, Look>();
export const townLook = (seed: number): Look => {
  const hit = lookCache.get(seed);
  if (hit) return hit;
  const r = rng(seed * 97 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const look: Look = {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: pick(STYLES),
    top: pick(TOPS),
    shirt: "#ffffff",
    topKind: pick(KINDS),
    pants: pick(PANTS),
    shoes: pick(["#ffffff", "#2a2a2a", "#e8434f"]),
  };
  lookCache.set(seed, look);
  return look;
};

type Pose = {
  la: number; // left arm pitch (+ forward/up)
  ra: number;
  laz: number; // left arm sideways lift
  raz: number;
  ll: number;
  rl: number;
  head: number; // + looks up
  headYaw: number;
  lean: number; // + leans forward
  bob: number;
  hipY: number; // sitting / crouch drop
};

const pose = (anim: Anim, t: number): Pose => {
  const p: Pose = { la: 0, ra: 0, laz: 0, raz: 0, ll: 0, rl: 0, head: 0, headYaw: 0, lean: 0, bob: 0, hipY: 0 };
  const s = Math.sin;
  switch (anim) {
    case "idle":
      p.bob = s(t * 2) * 0.03;
      p.la = s(t * 2) * 0.04;
      p.ra = -p.la;
      break;
    case "walk": {
      const w = t * Math.PI * 2 * 1.7;
      p.ll = s(w) * 0.6;
      p.rl = -p.ll;
      p.la = -s(w) * 0.5;
      p.ra = -p.la;
      p.bob = Math.abs(s(w)) * 0.12;
      break;
    }
    case "run": {
      const w = t * Math.PI * 2 * 2.6;
      p.ll = s(w) * 1.0;
      p.rl = -p.ll;
      p.la = -s(w) * 1.1;
      p.ra = -p.la;
      p.bob = Math.abs(s(w)) * 0.25;
      p.lean = 0.18;
      break;
    }
    case "panic": {
      const w = t * Math.PI * 2 * 2.8;
      p.ll = s(w) * 1.0;
      p.rl = -p.ll;
      p.la = 2.7 + s(w * 1.3) * 0.3;
      p.ra = 2.7 - s(w * 1.3) * 0.3;
      p.laz = 0.3;
      p.raz = 0.3;
      p.bob = Math.abs(s(w)) * 0.25;
      p.head = 0.2;
      break;
    }
    case "lookup":
      p.head = 0.55;
      p.la = 0.1;
      p.ra = 0.1;
      p.bob = s(t * 2) * 0.02;
      break;
    case "climb": {
      const w = t * Math.PI * 2 * 1.8;
      p.la = 2.8 + s(w) * 0.4;
      p.ra = 2.8 - s(w) * 0.4;
      p.ll = 0.6 + s(w) * 0.5;
      p.rl = 0.6 - s(w) * 0.5;
      p.head = 0.4;
      break;
    }
    case "jump":
      p.la = 2.6;
      p.ra = 2.6;
      p.laz = 0.4;
      p.raz = 0.4;
      p.ll = 0.7;
      p.rl = -0.3;
      p.lean = 0.25;
      break;
    case "bike": {
      const w = t * Math.PI * 2 * 1.4;
      p.ll = 1.2 + s(w) * 0.45;
      p.rl = 1.2 - s(w) * 0.45;
      p.la = 1.1;
      p.ra = 1.1;
      p.lean = 0.25;
      p.hipY = -0.2;
      break;
    }
    case "bang": {
      const w = t * Math.PI * 2 * 4;
      p.ra = 1.6 + s(w) * 0.9;
      p.la = 1.2;
      p.head = 0.2;
      break;
    }
    case "cheer": {
      const w = t * Math.PI * 2 * 2;
      p.la = 2.9 + s(w) * 0.25;
      p.ra = 2.9 - s(w) * 0.25;
      p.laz = 0.35;
      p.raz = 0.35;
      p.bob = Math.abs(s(w)) * 0.5;
      break;
    }
    case "shout": {
      const w = t * Math.PI * 2 * 3;
      p.ra = 2.8;
      p.raz = 0.5 + s(w) * 0.35;
      p.la = 0.3;
      p.head = 0.25;
      break;
    }
    case "lever":
      p.la = 1.4 - Math.min(1, t * 2) * 0.9;
      p.ra = p.la;
      p.lean = 0.2;
      p.ll = 0.3;
      p.rl = -0.2;
      break;
    case "work": {
      const w = t * Math.PI * 2 * 2.2;
      p.la = 1.3 + s(w) * 0.25;
      p.ra = 1.3 - s(w) * 0.25;
      p.lean = 0.25;
      p.head = -0.25;
      break;
    }
    case "grabbed": {
      const w = t * Math.PI * 2 * 4;
      p.la = 2.6 + s(w) * 0.5;
      p.ra = 2.6 - s(w) * 0.5;
      p.laz = 0.5;
      p.raz = 0.5;
      p.ll = s(w) * 0.6;
      p.rl = -p.ll;
      p.head = 0.4;
      break;
    }
    case "point":
      p.ra = 1.7;
      p.head = 0.15;
      break;
    case "sit":
      p.ll = 1.5;
      p.rl = 1.5;
      p.hipY = -0.9;
      break;
  }
  return p;
};

const mat = (color: string, map?: THREE.Texture) =>
  new THREE.MeshStandardMaterial({ color: map ? "#ffffff" : color, map, roughness: 0.6 });

const limbGeo = new RoundedBoxGeometry(1, 2, 1, 2, 0.12);
const handGeo = new RoundedBoxGeometry(1.02, 0.55, 1.02, 2, 0.12);
const shoeGeo = new RoundedBoxGeometry(1.04, 0.45, 1.1, 2, 0.1);
const cube = new THREE.BoxGeometry(1, 1, 1);

export const Avatar: React.FC<{
  look: Look;
  anim: Anim;
  t: number;
  mood?: Mood;
  position?: [number, number, number];
  yaw?: number;
  scale?: number;
  roll?: number;
  holding?: "bucket" | "phone" | "letter" | "gear" | null;
  /** an echo: casts no shadow */
  noShadow?: boolean;
  shadow?: boolean;
  tip?: number;
  melt?: number;
}> = ({ look, anim, t, mood = "smile", position = [0, 0, 0], yaw = 0, scale = 0.62, roll = 0, holding = null, noShadow = false, shadow = false, tip = 0, melt = 0 }) => {
  const cs = !noShadow && !shadow;
  const m = useMemo(() => {
    if (shadow) {
      const ink = new THREE.MeshStandardMaterial({ color: "#0b0912", roughness: 1, emissive: "#2a1446", emissiveIntensity: 0.4 });
      return { skin: ink, face: new THREE.MeshBasicMaterial({ map: shadowFaceTex() }), top: ink, torsoFront: ink, pants: ink, shoes: ink, hair: ink, metal: ink, brass: ink, paper: ink } as Record<string, THREE.Material>;
    }
    const skin = mat(look.skin);
    const sideTop = mat(look.top);
    return {
      skin,
      face: mat(look.skin, faceTex(look.skin, mood)),
      top: sideTop,
      torsoFront: mat(look.top, torsoTex(look.top, look.shirt, look.topKind)),
      pants: mat(look.pants),
      shoes: mat(look.shoes),
      hair: mat(look.hair),
      metal: new THREE.MeshStandardMaterial({ color: "#a9b0b8", metalness: 0.8, roughness: 0.35 }),
      brass: new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 0.6, roughness: 0.3, emissive: "#ffcc55", emissiveIntensity: 0.25 }),
      paper: new THREE.MeshStandardMaterial({ color: "#f6f1e4", emissive: "#fff6d8", emissiveIntensity: 0.2 }),
    } as Record<string, THREE.Material>;
  }, [look, mood, shadow]);
  const head = useMemo(() => [m.skin, m.skin, m.skin, m.skin, m.face, m.skin], [m]);
  const torso = useMemo(() => [m.top, m.top, m.top, m.top, m.torsoFront, m.top], [m]);
  const p = pose(anim, t);

  const arm = (side: 1 | -1, pitch: number, lift: number) => (
    <group position={[side * 1.5, 4, 0]} rotation={[-pitch, 0, side * lift]}>
      <mesh geometry={limbGeo} material={m.top} position={[0, -1, 0]} castShadow={cs} />
      <mesh geometry={handGeo} material={m.skin} position={[0, -1.75, 0]} castShadow={cs} />
      {holding === "bucket" && side === 1 ? (
        <group position={[0, -2.4, 0.2]}>
          <mesh material={m.metal} castShadow={cs}>
            <cylinderGeometry args={[0.75, 0.55, 1.1, 14, 1, true]} />
          </mesh>
          <mesh material={m.metal} position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 14]} />
          </mesh>
        </group>
      ) : null}
      {holding === "gear" && side === 1 ? (
        <group position={[0, -2.3, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={m.brass} castShadow={cs}>
            <cylinderGeometry args={[0.5, 0.5, 0.2, 14]} />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => (
            <mesh key={k} material={m.brass} rotation={[0, (k / 8) * Math.PI * 2, 0]} position={[0, 0, 0]}>
              <boxGeometry args={[1.3, 0.2, 0.18]} />
            </mesh>
          ))}
        </group>
      ) : null}
      {holding === "letter" && side === 1 ? (
        <mesh material={m.paper} position={[-0.2, -2.15, 0.75]} rotation={[0.35, 0, 0.1]} castShadow={cs}>
          <boxGeometry args={[1.3, 0.9, 0.05]} />
        </mesh>
      ) : null}
    </group>
  );
  const leg = (side: 1 | -1, pitch: number) => (
    <group position={[side * 0.5, 2, 0]} rotation={[-pitch, 0, 0]}>
      <mesh geometry={limbGeo} material={m.pants} position={[0, -1, 0]} castShadow={cs} />
      <mesh geometry={shoeGeo} material={m.shoes} position={[0, -1.8, 0.05]} castShadow={cs} />
    </group>
  );

  const hair = () => {
    switch (look.hairStyle) {
      case "spiky":
        return (
          <group>
            <mesh geometry={cube} material={m.hair} position={[0, 0.72, -0.05]} scale={[1.36, 0.36, 1.36]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0, 0.1, -0.62]} scale={[1.36, 1.1, 0.2]} castShadow={cs} />
            {[-0.42, 0, 0.42].map((x, i) => (
              <mesh key={i} geometry={cube} material={m.hair} position={[x, 0.55, 0.6]} rotation={[0.5, 0, (i - 1) * 0.25]} scale={[0.42, 0.42, 0.3]} castShadow={cs} />
            ))}
            {[-0.45, 0.1, 0.5].map((x, i) => (
              <mesh key={`s${i}`} geometry={cube} material={m.hair} position={[x, 0.98, -0.1 + i * 0.12]} rotation={[0.3, i, 0.4]} scale={[0.38, 0.38, 0.38]} castShadow={cs} />
            ))}
          </group>
        );
      case "short":
        return (
          <group>
            <mesh geometry={cube} material={m.hair} position={[0, 0.7, -0.03]} scale={[1.34, 0.3, 1.34]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0, 0.2, -0.6]} scale={[1.34, 0.9, 0.18]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0, 0.5, 0.6]} scale={[1.3, 0.22, 0.16]} castShadow={cs} />
          </group>
        );
      case "long":
        return (
          <group>
            <mesh geometry={cube} material={m.hair} position={[0, 0.7, -0.03]} scale={[1.38, 0.32, 1.38]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0, -0.35, -0.62]} scale={[1.4, 2.2, 0.22]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0.66, -0.1, 0]} scale={[0.16, 1.6, 1.2]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[-0.66, -0.1, 0]} scale={[0.16, 1.6, 1.2]} castShadow={cs} />
          </group>
        );
      case "beanie":
        return (
          <group>
            <mesh geometry={cube} material={m.hair} position={[0, 0.55, 0]} scale={[1.38, 0.55, 1.38]} castShadow={cs} />
            <mesh geometry={cube} material={m.hair} position={[0, 0.95, 0]} scale={[0.4, 0.3, 0.4]} castShadow={cs} />
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group position={position} rotation={[0, yaw, 0]}>
    <group rotation={[tip, 0, roll]} scale={[scale * (1 + melt * 0.7), scale * Math.max(0.03, 1 - melt), scale * (1 + melt * 0.7)]}>
      <group position={[0, p.bob + p.hipY, 0]} rotation={[p.lean, 0, 0]}>
        {leg(-1, p.ll)}
        {leg(1, p.rl)}
        <mesh material={torso} position={[0, 3, 0]} castShadow={cs}>
          <boxGeometry args={[2, 2, 1]} />
        </mesh>
        {arm(-1, p.la, p.laz)}
        {arm(1, p.ra, p.raz)}
        <group position={[0, 4.62, 0]} rotation={[-p.head, p.headYaw, 0]}>
          <mesh material={head} castShadow={cs}>
            <boxGeometry args={[1.25, 1.25, 1.25]} />
          </mesh>
          {hair()}
        </group>
      </group>
    </group>
    </group>
  );
};
