/**
 * The tall one: a blocky giant (~38 units at scale 1) with very long arms, a
 * pale box head, a huge white grin and glowing red eyes. Every part's world
 * matrix comes from one forward-kinematics pass (rig), so shots can ask where
 * its hands and head are (giantHand / giantHead) and get exactly what renders.
 * `shatter` 0..1 bursts it into a cloud of black blocks.
 */
import React, { useMemo } from "react";
import * as THREE from "three";

import { canvasTex, rng } from "./textures";

export type GiantState = {
  at: [number, number]; // feet x, z
  yaw: number; // 0 faces +z
  t: number;
  y?: number; // vertical offset (negative sinks it behind hills)
  scale?: number;
  walk?: number; // walk phase in seconds (0 = standing)
  stride?: number; // 0..1 leg swing
  lean?: number; // 0 upright .. 1 bent forward ~70°; negative leans back
  crouch?: number; // 0..1 knee bend
  head?: number; // + looks down, - looks up
  headYaw?: number;
  armR?: number; // forward raise from straight down (world vertical), radians
  armL?: number;
  elbowR?: number;
  elbowL?: number;
  spreadR?: number; // sideways lift
  spreadL?: number;
  grip?: number; // 0 open .. 1 fist
  cover?: number; // 0..1 both hands over the face
  shatter?: number; // 0..1 burst into blocks
  mouth?: number; // 0 grin .. 1 screaming
  eyes?: number; // eye glow, default 1
};

type Part = { m: THREE.Matrix4; size: [number, number, number]; kind: "body" | "head" | "neck" };
type Rig = { parts: Part[]; handR: THREE.Vector3; handL: THREE.Vector3; head: THREE.Vector3; face: THREE.Vector3; chest: THREE.Vector3 };

const mixN = (a: number, b: number, k: number) => a + (b - a) * k;

const rig = (s: GiantState): Rig => {
  const O = () => new THREE.Object3D();
  const parts: { o: THREE.Object3D; size: [number, number, number]; kind: Part["kind"] }[] = [];
  const part = (parent: THREE.Object3D, pos: [number, number, number], size: [number, number, number], kind: Part["kind"] = "body") => {
    const o = O();
    o.position.set(...pos);
    parent.add(o);
    parts.push({ o, size, kind });
    return o;
  };
  const sc = s.scale ?? 1;
  const c = s.crouch ?? 0;
  const st = s.stride ?? (s.walk ? 1 : 0);
  const ph = (s.walk ?? 0) * Math.PI * 2 * 0.45;
  const swing = Math.sin(ph) * 0.4 * st;
  const cover = s.cover ?? 0;

  const root = O();
  root.position.set(s.at[0], s.y ?? 0, s.at[1]);
  root.rotation.y = s.yaw;
  root.scale.setScalar(sc);

  const hips = O();
  hips.position.set(0, 18 * Math.cos(c) + Math.abs(Math.cos(ph)) * 0.5 * st, 0);
  root.add(hips);

  for (const side of [-1, 1]) {
    const thigh = O();
    thigh.position.set(side * 1.7, 0, 0);
    thigh.rotation.x = -(c + swing * side);
    hips.add(thigh);
    part(thigh, [0, -4.5, 0], [2.3, 9.2, 2.3]);
    const knee = O();
    knee.position.set(0, -9, 0);
    knee.rotation.x = 2 * c + st * 0.45 * Math.max(0, side * Math.cos(ph));
    thigh.add(knee);
    part(knee, [0, -4.5, 0], [2.0, 9.2, 2.0]);
    const ankle = O();
    ankle.position.set(0, -9, 0);
    ankle.rotation.x = -c;
    knee.add(ankle);
    part(ankle, [0, -0.5, 0.9], [2.6, 1.0, 4.4]);
  }

  const torso = O();
  torso.rotation.x = (s.lean ?? 0) * 1.2 - cover * 0.35;
  torso.rotation.z = Math.sin(s.t * 0.9) * 0.02;
  hips.add(torso);
  part(torso, [0, 6, 0], [6.6, 12.4, 3.3]);
  part(torso, [0, 12.7, 0.2], [1.8, 1.8, 1.8], "neck");

  const head = O();
  head.position.set(0, 13.3, 0.3);
  head.rotation.x = (s.head ?? 0) - cover * 0.2 + Math.sin(s.t * 1.3) * 0.03;
  head.rotation.y = s.headYaw ?? 0;
  torso.add(head);
  const headPart = part(head, [0, 3.4, 0], [6.8, 6.8, 6.2], "head");

  const hands: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const isR = side === -1;
    const p0 = (isR ? s.armR : s.armL) ?? 0;
    const e0 = (isR ? s.elbowR : s.elbowL) ?? 0.15;
    const sp0 = (isR ? s.spreadR : s.spreadL) ?? 0.08;
    const p = mixN(p0, 2.35, cover);
    const e = mixN(e0, 2.0, cover);
    const sp = mixN(sp0, -0.35, cover);
    const sh = O();
    sh.position.set(side * 4.2, 11.6, 0);
    sh.rotation.x = -p - torso.rotation.x * (1 - cover) + (s.walk ? -swing * side * 0.6 : 0) + Math.sin(s.t * 1.1 + side) * 0.03;
    sh.rotation.z = side * sp;
    torso.add(sh);
    part(sh, [0, -5, 0], [1.9, 10.4, 1.9]);
    const elbow = O();
    elbow.position.set(0, -10, 0);
    elbow.rotation.x = -e;
    sh.add(elbow);
    part(elbow, [0, -5, 0], [1.7, 10.4, 1.7]);
    const wrist = O();
    wrist.position.set(0, -10.2, 0);
    elbow.add(wrist);
    const palm = part(wrist, [0, -1.2, 0], [2.8, 2.5, 1.1]);
    hands.push(palm);
    const g = s.grip ?? 0;
    [-0.95, -0.32, 0.32, 0.95].forEach((fx, i) => {
      const f = O();
      f.position.set(fx, -2.4, 0);
      f.rotation.x = -g * (1.5 + i * 0.05);
      wrist.add(f);
      part(f, [0, -1.8, 0], [0.55, 3.6, 0.55]);
    });
  }

  root.updateMatrixWorld(true);
  const wp = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
  return {
    parts: parts.map((p) => ({ m: p.o.matrixWorld.clone(), size: p.size, kind: p.kind })),
    handR: wp(hands[0]),
    handL: wp(hands[1]),
    head: wp(headPart),
    face: new THREE.Vector3(0, 0, 6).applyMatrix4(headPart.matrixWorld),
    chest: new THREE.Vector3(0, 8, 0).applyMatrix4(torso.matrixWorld),
  };
};

const v3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
/** World position of a palm ("R" is the giant's right hand). */
export const giantHand = (s: GiantState, side: "R" | "L" = "R") => v3(rig(s)[side === "R" ? "handR" : "handL"]);
/** World position of the centre of its head. */
export const giantHead = (s: GiantState) => v3(rig(s).head);

const faceTexture = (open: boolean) =>
  canvasTex(
    `giant-face-${open}`,
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#efe9df";
      g.fillRect(0, 0, w, h);
      // hollow eyes
      g.fillStyle = "#120c10";
      g.fillRect(52, 62, 50, 40);
      g.fillRect(154, 62, 50, 40);
      g.fillStyle = "#ff2a1a";
      g.fillRect(70, 74, 16, 16);
      g.fillRect(172, 74, 16, 16);
      // brows slanting in
      g.strokeStyle = "#120c10";
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(44, 46);
      g.lineTo(108, 58);
      g.moveTo(212, 46);
      g.lineTo(148, 58);
      g.stroke();
      // the grin: a wide curved band of teeth
      g.fillStyle = "#120c10";
      g.beginPath();
      if (open) {
        g.ellipse(128, 176, 92, 58, 0, 0, Math.PI * 2);
      } else {
        g.moveTo(18, 140);
        g.quadraticCurveTo(128, 250, 238, 140);
        g.quadraticCurveTo(128, 196, 18, 140);
      }
      g.fill();
      g.fillStyle = "#ffffff";
      const n = 13;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        if (open) {
          const x = 128 + (u - 0.5) * 160;
          const top = 176 - 58 * Math.sqrt(Math.max(0, 1 - ((x - 128) / 92) ** 2));
          const bot = 176 + 58 * Math.sqrt(Math.max(0, 1 - ((x - 128) / 92) ** 2));
          g.fillRect(x - 5, top + 2, 10, 16);
          g.fillRect(x - 5, bot - 18, 10, 16);
        } else {
          const x = 18 + u * 220;
          const k = (x - 128) / 110;
          const yTop = 140 + (1 - k * k) * 28;
          const yBot = 140 + (1 - k * k) * 55;
          g.fillRect(x - 6, yTop - 2, 12, Math.max(6, (yBot - yTop) * 0.5));
          g.fillRect(x - 6, yTop + (yBot - yTop) * 0.55, 12, Math.max(5, (yBot - yTop) * 0.42));
        }
      }
    },
    { repeat: false },
  );

const glowTexture = () =>
  canvasTex(
    "giant-glow",
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff";
      g.fillRect(70, 74, 16, 16);
      g.fillRect(172, 74, 16, 16);
    },
    { repeat: false },
  );

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const BITS = 160;

export const Giant: React.FC<{ s: GiantState }> = ({ s }) => {
  const m = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({ color: "#1d1722", roughness: 0.75, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: "#e6dfd3", roughness: 0.7 });
    const faceA = new THREE.MeshStandardMaterial({ map: faceTexture(false), emissiveMap: glowTexture(), emissive: new THREE.Color("#ff2010"), emissiveIntensity: 2.5, roughness: 0.7 });
    const faceB = new THREE.MeshStandardMaterial({ map: faceTexture(true), emissiveMap: glowTexture(), emissive: new THREE.Color("#ff2010"), emissiveIntensity: 2.5, roughness: 0.7 });
    return { body, skin, faceA, faceB };
  }, []);
  const bits = useMemo(() => {
    const r = rng(777);
    return Array.from({ length: BITS }, () => ({ u: [r() - 0.5, r() - 0.5, r() - 0.5], d: [r() - 0.5, r() * 0.9 + 0.1, r() - 0.5], spin: [r() * 6, r() * 6, r() * 6], size: 0.9 + r() * 1.6, sp: 0.6 + r() * 0.9, pick: r() }));
  }, []);
  const R = rig(s);
  const eyes = s.eyes ?? 1;
  const face = (s.mouth ?? 0) > 0.5 ? m.faceB : m.faceA;
  face.emissiveIntensity = 2.5 * eyes;
  const headMats = [m.skin, m.skin, m.skin, m.skin, face, m.skin];
  const sh = s.shatter ?? 0;
  const keep = Math.max(0, 1 - sh * 3);
  const scale = s.scale ?? 1;

  const out: React.ReactNode[] = [];
  if (keep > 0) {
    R.parts.forEach((p, i) => {
      const mm = p.m.clone().multiply(new THREE.Matrix4().makeScale(p.size[0] * keep, p.size[1] * keep, p.size[2] * keep));
      out.push(<mesh key={i} geometry={unitBox} material={p.kind === "head" ? headMats : p.kind === "neck" ? m.skin : m.body} matrixAutoUpdate={false} matrix={mm} castShadow />);
    });
  }
  if (sh > 0) {
    const ground = s.y ?? 0;
    bits.forEach((b, i) => {
      const p = R.parts[Math.floor(b.pick * R.parts.length)];
      const local = new THREE.Vector3(b.u[0] * p.size[0], b.u[1] * p.size[1], b.u[2] * p.size[2]).applyMatrix4(p.m);
      const fly = sh * 34 * b.sp * scale;
      const pos = local.add(new THREE.Vector3(b.d[0] * fly * 1.6, b.d[1] * fly - sh * sh * 70 * scale, b.d[2] * fly * 1.6));
      pos.y = Math.max(ground + b.size * scale * 0.5, pos.y);
      const sz = b.size * scale * (1 - Math.max(0, sh - 0.75) * 2);
      out.push(
        <mesh key={`b${i}`} geometry={unitBox} material={p.kind === "head" ? m.skin : m.body} position={pos} rotation={[b.spin[0] * sh, b.spin[1] * sh, b.spin[2] * sh]} scale={[sz, sz, sz]} castShadow />,
      );
    });
  }
  return (
    <group>
      {out}
      {keep > 0 && eyes > 0 ? <pointLight color="#ff3020" intensity={60 * eyes * scale} distance={40 * scale} position={[R.face.x, R.face.y, R.face.z]} /> : null}
    </group>
  );
};

/** A point just in front of its face (where a beam should land). */
export const giantFace = (s: GiantState) => v3(rig(s).face);
