/**
 * The thing under the town: a colossal segmented worm that bursts out of a
 * crack in the ground, arches, opens a four-petal jaw full of teeth and
 * strikes. Its state is a pure function of the shot's parameters.
 */
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";

import { crackTex, wormSkin } from "./textures";

export type WormState = {
  hole: [number, number]; // x, z where it comes out
  yaw: number; // direction it leans toward
  rise: number; // 0 hidden .. 1 fully up (head ~ height)
  height: number; // head height when fully up
  bend: number; // 0 straight up .. 1 arched over toward yaw
  strike: number; // 0 .. 1 head dips down toward the target
  mouth: number; // 0 closed .. 1 wide open
  t: number; // seconds, for the wriggle
  turn?: number; // extra yaw of the head part
};


export const Worm: React.FC<{ s: WormState }> = ({ s }) => {
  const mats = useMemo(() => {
    const map = wormSkin(false);
    const glow = wormSkin(true);
    return {
      body: new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: new THREE.Color("#7dff3a"), emissiveIntensity: 1.0, roughness: 0.45, metalness: 0.15 }),
      ring: new THREE.MeshStandardMaterial({ color: "#1a1020", roughness: 0.4, metalness: 0.2 }),
      lip: new THREE.MeshStandardMaterial({ color: "#3a1a3e", roughness: 0.5, emissive: new THREE.Color("#5a1f4a"), emissiveIntensity: 0.4 }),
      throat: new THREE.MeshBasicMaterial({ color: "#b6ff5a" }),
      dark: new THREE.MeshBasicMaterial({ color: "#050305" }),
      tooth: new THREE.MeshStandardMaterial({ color: "#f3ead2", roughness: 0.35 }),
      petal: new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: new THREE.Color("#7dff3a"), emissiveIntensity: 1.2, roughness: 0.5, side: THREE.DoubleSide }),
    };
  }, []);
  const toothGeo = useMemo(() => new THREE.ConeGeometry(0.16, 0.9, 6), []);

  const R = 5.4; // body radius
  const H = s.height * s.rise;
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
  const base = new THREE.Vector3(s.hole[0], 0, s.hole[1]);
  const wig = (k: number) => Math.sin(s.t * 2.2 + k * 0.5) * 1.2;

  const pts = [
    base.clone().add(new THREE.Vector3(0, -60, 0)),
    base.clone().add(new THREE.Vector3(0, -20, 0)),
    base.clone().add(new THREE.Vector3(0, H * 0.45, 0)).addScaledVector(dir, s.bend * H * 0.12),
    base.clone().add(new THREE.Vector3(0, H * 0.85 - s.strike * H * 0.1, 0)).addScaledVector(dir, s.bend * H * 0.38),
    base.clone().add(new THREE.Vector3(0, H * (1 - s.strike * 0.55) * (1 - s.bend * 0.12), 0)).addScaledVector(dir, s.bend * H * 0.62 + s.strike * H * 0.25),
  ];
  pts[2].x += wig(1);
  pts[3].z += wig(2);
  const curve = new THREE.CatmullRomCurve3(pts);
  const up = new THREE.Vector3(0, 1, 0);

  // a ridged tube along the curve, rebuilt every frame
  const tube = useMemo(() => {
    const N = 120;
    const M = 22;
    const u0 = 0.16;
    const len = curve.getLength();
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let normal = new THREE.Vector3(1, 0, 0);
    let prevT: THREE.Vector3 | null = null;
    for (let i = 0; i <= N; i++) {
      const u = u0 + (i / N) * (1 - u0);
      const p = curve.getPointAt(u);
      const T = curve.getTangentAt(u).normalize();
      if (prevT) {
        const axis = new THREE.Vector3().crossVectors(prevT, T);
        const ang = Math.asin(Math.min(1, axis.length()));
        if (axis.lengthSq() > 1e-10) normal.applyAxisAngle(axis.normalize(), ang);
      } else {
        normal = new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 0, 1)).normalize();
        if (normal.lengthSq() < 0.01) normal.set(1, 0, 0);
      }
      prevT = T;
      const B = new THREE.Vector3().crossVectors(T, normal).normalize();
      const arc = u * len;
      const ridge = 1 + 0.085 * Math.pow(Math.abs(Math.sin(arc * 0.55)), 0.6);
      const tipK = Math.max(0, (u - 0.9) / 0.1);
      const r = R * ridge * (1 - tipK * 0.12) * (1 + Math.sin(arc * 0.13 + s.t * 3) * 0.03);
      for (let j = 0; j <= M; j++) {
        const a = (j / M) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        pos.push(p.x + (normal.x * c + B.x * sn) * r, p.y + (normal.y * c + B.y * sn) * r, p.z + (normal.z * c + B.z * sn) * r);
        uv.push((j / M) * 3, arc / 14);
      }
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const a = i * (M + 1) + j;
        const b = a + M + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hole[0], s.hole[1], s.yaw, s.rise, s.height, s.bend, s.strike, s.t]);
  useEffect(() => () => tube.dispose(), [tube]);

  // head at the tip, facing along the tangent
  const tip = curve.getPointAt(1);
  const tipTan = curve.getTangentAt(1);
  const headQ = new THREE.Quaternion().setFromUnitVectors(up, tipTan);
  if (s.turn) headQ.premultiply(new THREE.Quaternion().setFromAxisAngle(up, s.turn));
  const open = s.mouth;
  const teeth: React.ReactNode[] = [];
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 14 : 18;
    const rr = (ring ? 2.6 : 3.7) * (0.7 + open * 0.3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.2;
      teeth.push(
        <mesh
          key={`${ring}-${k}`}
          geometry={toothGeo}
          material={mats.tooth}
          position={[Math.cos(a) * rr, 0.4 - ring * 0.8, Math.sin(a) * rr]}
          rotation={[Math.sin(a) * -1.1, 0, Math.cos(a) * 1.1]}
          scale={ring ? 1.1 : 1.5}
        />,
      );
    }
  }
  const petals = [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const flare = 0.15 + open * 1.0;
    return (
      <group key={k} rotation={[0, -a, 0]}>
        <group position={[3.8, 0.2, 0]} rotation={[0, 0, -flare]}>
          <mesh material={mats.petal} position={[0, 2.4, 0]} scale={[1.8, 2.6, 0.5]} castShadow>
            <coneGeometry args={[1, 2, 5, 1]} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh key={j} geometry={toothGeo} material={mats.tooth} position={[-0.7, 1 + j * 1.1, (j - 1) * 0.5]} rotation={[0, 0, Math.PI / 2]} scale={1.4} />
          ))}
        </group>
      </group>
    );
  });

  return (
    <group>
      <mesh geometry={tube} material={mats.body} castShadow />
      <group position={tip} quaternion={headQ}>
        <mesh material={mats.lip} rotation={[Math.PI / 2, 0, 0]} scale={[4.4, 4.4, 4]}>
          <torusGeometry args={[1, 0.22, 10, 28]} />
        </mesh>
        <mesh material={mats.dark} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <circleGeometry args={[4.1, 28]} />
        </mesh>
        <mesh material={mats.throat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4 + 0.5, 0]} scale={0.25 + open * 0.35}>
          <circleGeometry args={[3, 20]} />
        </mesh>
        {teeth}
        {petals}
        <pointLight color="#9dff4a" intensity={60 * (0.3 + open)} distance={40} position={[0, 3, 0]} />
      </group>
    </group>
  );
};

/** Hole in the ground with tilted slabs of asphalt around it. */
export const Crack: React.FC<{ x: number; z: number; size: number; amount: number; t: number; tint?: string }> = ({ x, z, size, amount, t, tint = "#4a4a52" }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), []);
  const slab = useMemo(() => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, flatShading: true }), [tint]);
  if (amount <= 0) return null;
  const s = size * Math.min(1, amount);
  const slabs = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + (k % 3) * 0.2;
    const rad = s * (0.42 + (k % 4) * 0.04);
    const lift = Math.min(1, amount) * (0.8 + (k % 3) * 0.6);
    const jitter = Math.sin(t * 30 + k) * 0.05 * Math.max(0, 1.2 - amount);
    slabs.push(
      <mesh
        key={k}
        material={slab}
        position={[Math.cos(a) * rad, lift * 0.5 + jitter, Math.sin(a) * rad]}
        rotation={[Math.sin(a) * 0.5 * amount, a, -Math.cos(a) * 0.5 * amount]}
        castShadow
      >
        <boxGeometry args={[s * 0.18, 0.6, s * 0.12]} />
      </mesh>,
    );
  }
  return (
    <group position={[x, 0, z]}>
      <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
        <planeGeometry args={[s * 1.25, s * 1.25]} />
      </mesh>
      {slabs}
    </group>
  );
};

/** Where the head ends up (the curve's last control point). */
export const wormTip = (s: WormState): [number, number, number] => {
  const H = s.height * s.rise;
  const dx = Math.sin(s.yaw);
  const dz = Math.cos(s.yaw);
  const out = s.bend * H * 0.62 + s.strike * H * 0.25;
  return [s.hole[0] + dx * out, H * (1 - s.strike * 0.55) * (1 - s.bend * 0.12), s.hole[1] + dz * out];
};
