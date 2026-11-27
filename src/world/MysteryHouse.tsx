/**
 * The extra house: a tall, narrow, slate-coloured house that is only there at
 * night. Glowing windows, a door that opens on its own onto bright light, a
 * "100" plate, and a mailbox that can hold a letter. `appear` grows it out of
 * the ground with a flicker; `fold` folds it flat into the dark like paper.
 * Its front faces -z (the suburb road).
 */
import React, { useMemo } from "react";
import * as THREE from "three";

import { signTex } from "./textures";

export type MysteryHouseState = {
  at: [number, number]; // x, z of the house centre
  appear?: number; // 0 absent .. 1 fully there (default 1)
  door?: number; // 0 shut .. 1 wide open
  glow?: number; // window light 0..1 (default 1)
  fold?: number; // 0 standing .. 1 folded away
  letter?: number; // 0 none .. 1 letter sticking out of the mailbox
  number?: string; // plate text, default "100"
  t?: number;
};

export const HOUSE_W = 7;
export const HOUSE_D = 9;
export const HOUSE_H = 11.5;

/** World point just in front of the door (feet level). */
export const doorStep = (s: MysteryHouseState, out = 1.2): [number, number, number] => [s.at[0], 0.3, s.at[1] - HOUSE_D / 2 - out];
/** World point of the mailbox top. */
export const mailbox = (s: MysteryHouseState): [number, number, number] => [s.at[0] - 2.6, 1.6, s.at[1] - HOUSE_D / 2 - 2.6];

export const MysteryHouse: React.FC<{ s: MysteryHouseState }> = ({ s }) => {
  const m = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: "#56607a", roughness: 0.85 }),
      trim: new THREE.MeshStandardMaterial({ color: "#e9e4f2", roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ color: "#2c2440", roughness: 0.8, flatShading: true }),
      win: new THREE.MeshStandardMaterial({ color: "#ffe7a3", emissive: "#ffcf66", emissiveIntensity: 2 }),
      inside: new THREE.MeshBasicMaterial({ color: "#fff3d6" }),
      door: new THREE.MeshStandardMaterial({ color: "#3b2a50", roughness: 0.6 }),
      knob: new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 0.7, roughness: 0.3 }),
      post: new THREE.MeshStandardMaterial({ color: "#3a3a3a" }),
      box: new THREE.MeshStandardMaterial({ color: "#2f2f38", metalness: 0.4, roughness: 0.5 }),
      flag: new THREE.MeshStandardMaterial({ color: "#e8434f" }),
      paper: new THREE.MeshStandardMaterial({ color: "#f6f1e4", emissive: "#fff6d8", emissiveIntensity: 0.25 }),
    }),
    [],
  );
  const plate = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex(s.number ?? "100", "#1d1a28", "#ffd27a") }), [s.number]);
  const appear = s.appear ?? 1;
  const t = s.t ?? 0;
  const fold = s.fold ?? 0;
  const flicker = appear < 1 ? (Math.sin(t * 53) > 0.2 ? 1 : 0.35) : 1;
  const glow = (s.glow ?? 1) * flicker;
  m.win.emissiveIntensity = 0.2 + glow * 2.4;
  const door = s.door ?? 0;
  const W = HOUSE_W;
  const D = HOUSE_D;
  const H = HOUSE_H;
  const fz = -D / 2; // front face (local)

  // roof: a triangular prism along z
  const roofGeo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-W / 2 - 0.6, 0);
    sh.lineTo(W / 2 + 0.6, 0);
    sh.lineTo(0, 4.2);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: D + 1, bevelEnabled: false });
    g.translate(0, 0, -(D + 1) / 2);
    return g;
  }, [W, D]);

  if (appear <= 0.001) return null;
  const windows: React.ReactNode[] = [];
  for (let f = 0; f < 3; f++) {
    for (const x of f === 0 ? [-2.2, 2.2] : [-1.6, 1.6]) {
      windows.push(
        <mesh key={`w${f}${x}`} material={m.win} position={[x, 1.4 + f * 3.4 + (f === 0 ? 0.6 : 0), fz - 0.03]}>
          <boxGeometry args={[1.5, 1.9, 0.08]} />
        </mesh>,
      );
    }
  }
  // round attic window
  windows.push(
    <mesh key="attic" material={m.win} position={[0, H + 1.4, fz - 0.55]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.75, 0.75, 0.1, 18]} />
    </mesh>,
  );

  return (
    <group position={[s.at[0], 0.3, s.at[1]]} rotation={[0, fold * 1.3, 0]} scale={[1 - fold * 0.97, Math.max(0.001, appear) * (1 - fold * 0.35), 1 - fold * 0.9]}>
      <mesh material={m.wall} position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh material={m.trim} position={[0, H + 0.15, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.3, D + 0.5]} />
      </mesh>
      <mesh geometry={roofGeo} material={m.roof} position={[0, H + 0.3, 0]} castShadow />
      {windows}
      {/* door frame, bright inside, and the door on its hinge */}
      <mesh material={m.trim} position={[0, 1.75, fz - 0.06]}>
        <boxGeometry args={[2.3, 3.7, 0.1]} />
      </mesh>
      <mesh material={m.inside} position={[0, 1.6, fz - 0.12]}>
        <planeGeometry args={[1.8, 3.2]} />
      </mesh>
      <group position={[-0.9, 0, fz - 0.16]} rotation={[0, door * 1.7, 0]}>
        <mesh material={m.door} position={[0.9, 1.6, 0]} castShadow>
          <boxGeometry args={[1.8, 3.2, 0.12]} />
        </mesh>
        <mesh material={m.knob} position={[1.5, 1.6, -0.12]}>
          <sphereGeometry args={[0.1, 8, 6]} />
        </mesh>
      </group>
      {door > 0.05 ? <pointLight color="#ffe6b0" intensity={16 * door} distance={10} position={[0, 2.2, fz - 0.4]} /> : null}
      <mesh material={plate} position={[0, 4.0, fz - 0.12]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.1, 0.42]} />
      </mesh>
      {/* porch step */}
      <mesh material={m.trim} position={[0, 0.12, fz - 0.7]} receiveShadow>
        <boxGeometry args={[2.8, 0.24, 1.2]} />
      </mesh>
      {/* mailbox */}
      <group position={[-2.6, 0, fz - 2.6]}>
        <mesh material={m.post} position={[0, 0.6, 0]}>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
        </mesh>
        <mesh material={m.box} position={[0, 1.35, 0]} castShadow>
          <boxGeometry args={[0.55, 0.5, 0.9]} />
        </mesh>
        <mesh material={m.flag} position={[0.32, 1.45 + (s.letter ?? 0) * 0.2, 0.1]} rotation={[(s.letter ?? 0) * -1.4, 0, 0]}>
          <boxGeometry args={[0.04, 0.4, 0.1]} />
        </mesh>
        {(s.letter ?? 0) > 0 ? (
          <mesh material={m.paper} position={[0, 1.38, -0.45 - (s.letter ?? 0) * 0.15]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.42, 0.04, 0.5]} />
          </mesh>
        ) : null}
      </group>
      {glow > 0.3 ? <pointLight color="#ffd27a" intensity={22 * glow} distance={18} position={[0, 4, fz - 3]} /> : null}
    </group>
  );
};
