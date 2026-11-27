/**
 * The old lighthouse in the plaza corner: a red-and-white banded tower, a
 * balcony (gallery) with a railing, a glass lamp room, a fuse box with a big
 * switch, and the power cable up the glass, which can hang torn and sparking.
 * When the lamp is on, a beam cone reaches toward `aim`.
 */
import React, { useMemo } from "react";
import * as THREE from "three";

import { GALLERY_Y, LH_H, LIGHTHOUSE, type V3 } from "./layout";

export type LampState = {
  on: number; // 0 dark .. 1 blazing
  aim?: V3; // where the beam points (world); default sweeps
  cable?: number; // 0 torn .. 1 joined (default 1)
  lever?: number; // 0 up .. 1 slammed down
  spark?: number; // sparks at the torn ends
};

/** Yaw (around the tower) that faces the plaza centre. */
export const LH_FRONT = Math.atan2(-LIGHTHOUSE[0], -LIGHTHOUSE[2]);
/** A world point on the balcony: `yaw` around the tower axis (as atan2(dx, dz)), `r` from the axis. */
export const gallery = (yaw: number, r: number, dy = 0): V3 => [LIGHTHOUSE[0] + Math.sin(yaw) * r, GALLERY_Y + dy, LIGHTHOUSE[2] + Math.cos(yaw) * r];
export const LAMP: V3 = [LIGHTHOUSE[0], LH_H + 2.8, LIGHTHOUSE[2]];
/** Fuse box with the switch, on the lamp-room wall, a little right of the plaza side. */
export const SWITCH_YAW = LH_FRONT + 0.55;
export const SWITCH: V3 = gallery(SWITCH_YAW, 3.25, 1.6);

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

const rod = (a: THREE.Vector3, b: THREE.Vector3) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return { mid, len, q };
};

export const Lighthouse: React.FC<{ s?: LampState; t: number }> = ({ s, t }) => {
  const m = useMemo(
    () => ({
      white: std("#f6f1e8"),
      red: std("#e0323a"),
      stone: std("#d8d0c2"),
      dark: std("#2b2f36", { metalness: 0.5, roughness: 0.4 }),
      door: std("#5a3a22"),
      glass: std("#bfe6ff", { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }),
      lamp: new THREE.MeshStandardMaterial({ color: "#fff6d8", emissive: "#fff0b0", emissiveIntensity: 0 }),
      box: std("#7a8796", { metalness: 0.4 }),
      knob: std("#ffcf1a"),
      cable: std("#151515"),
      spark: new THREE.MeshBasicMaterial({ color: "#fff6a0" }),
      beam: new THREE.MeshBasicMaterial({ color: "#fff2b8", transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
      core: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
    }),
    [],
  );
  const beamGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(30, 260, 40, 1, true);
    g.translate(0, -130, 0); // apex at the origin, opening along -y
    return g;
  }, []);
  const coreGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(12, 260, 32, 1, true);
    g.translate(0, -130, 0);
    return g;
  }, []);
  const target = useMemo(() => new THREE.Object3D(), []);

  const on = s?.on ?? 0;
  const cable = s?.cable ?? 1;
  const lever = s?.lever ?? 0;
  const spark = s?.spark ?? 0;
  m.lamp.emissiveIntensity = 0.1 + on * 6;
  m.beam.opacity = 0.22 * on;
  m.core.opacity = 0.35 * on;

  const [X, , Z] = LIGHTHOUSE;
  const bands = 8;
  const r0 = 4.6;
  const r1 = 3.3;
  const segH = (LH_H - 1.2) / bands;

  // beam direction
  const aim = s?.aim ?? [X + Math.sin(t * 0.8) * 200, 20, Z + Math.cos(t * 0.8) * 200];
  const dir = new THREE.Vector3(aim[0] - LAMP[0], aim[1] - LAMP[1], aim[2] - LAMP[2]).normalize();
  const beamQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  target.position.set(...aim);
  target.updateMatrixWorld();

  // cable: from the top of the fuse box up the glass to the roof
  const cs = Math.sin(SWITCH_YAW);
  const cc = Math.cos(SWITCH_YAW);
  const P = (r: number, y: number) => new THREE.Vector3(X + cs * r, y, Z + cc * r);
  const a0 = P(3.05, SWITCH[1] + 0.9);
  const a1 = P(3.05, LH_H + 5.0);
  const sway = Math.sin(t * 3.1) * 0.25;
  const cableParts: { a: THREE.Vector3; b: THREE.Vector3 }[] =
    cable >= 1
      ? [{ a: a0, b: a1 }]
      : [
          { a: a0, b: P(3.05 + (1 - cable) * 0.5, mix(SWITCH[1] + 1.6, LH_H + 3.3, cable)) },
          { a: a1, b: P(3.05 + (1 - cable) * 1.4 + sway, mix(LH_H + 3.6, LH_H + 3.3, cable)) },
        ];
  const ends = cable < 1 ? cableParts.map((c) => c.b) : [];

  return (
    <group>
      <group position={[X, 0, Z]}>
        <mesh material={m.stone} position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[6.2, 6.6, 1.2, 24]} />
        </mesh>
        {Array.from({ length: bands }, (_, i) => {
          const ra = r0 + (r1 - r0) * (i / bands);
          const rb = r0 + (r1 - r0) * ((i + 1) / bands);
          return (
            <mesh key={i} material={i % 2 ? m.red : m.white} position={[0, 1.2 + segH * (i + 0.5), 0]} castShadow receiveShadow>
              <cylinderGeometry args={[rb, ra, segH + 0.01, 24]} />
            </mesh>
          );
        })}
        {/* door facing the plaza */}
        <group rotation={[0, LH_FRONT, 0]}>
          <mesh material={m.door} position={[0, 2.9, r0 - 0.05]}>
            <boxGeometry args={[2.2, 3.6, 0.5]} />
          </mesh>
          {[12, 21].map((y) => (
            <mesh key={y} material={m.dark} position={[0, y, r0 + (r1 - r0) * (y / LH_H) - 0.02]}>
              <boxGeometry args={[1.1, 1.6, 0.3]} />
            </mesh>
          ))}
        </group>
        {/* gallery */}
        <mesh material={m.dark} position={[0, LH_H, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[5.7, 5.2, 0.6, 28]} />
        </mesh>
        <mesh material={m.dark} position={[0, LH_H + 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.45, 0.09, 6, 40]} />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh key={i} material={m.dark} position={[Math.sin(a) * 5.45, LH_H + 0.85, Math.cos(a) * 5.45]}>
              <boxGeometry args={[0.12, 1.2, 0.12]} />
            </mesh>
          );
        })}
        {/* lamp room */}
        <mesh material={m.glass} position={[0, LH_H + 2.6, 0]}>
          <cylinderGeometry args={[2.8, 2.8, 4.6, 20, 1, true]} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          return (
            <mesh key={i} material={m.dark} position={[Math.sin(a) * 2.8, LH_H + 2.6, Math.cos(a) * 2.8]} castShadow>
              <boxGeometry args={[0.18, 4.6, 0.18]} />
            </mesh>
          );
        })}
        <mesh material={m.dark} position={[0, LH_H + 0.45, 0]}>
          <cylinderGeometry args={[2.9, 2.9, 0.3, 20]} />
        </mesh>
        <mesh material={m.dark} position={[0, LH_H + 4.95, 0]}>
          <cylinderGeometry args={[3.1, 3.1, 0.3, 20]} />
        </mesh>
        <mesh material={m.red} position={[0, LH_H + 6.6, 0]} castShadow>
          <coneGeometry args={[3.4, 3.2, 20]} />
        </mesh>
        <mesh material={m.dark} position={[0, LH_H + 8.4, 0]}>
          <sphereGeometry args={[0.45, 12, 10]} />
        </mesh>
        <mesh material={m.lamp} position={[0, LAMP[1], 0]}>
          <sphereGeometry args={[1.25, 18, 14]} />
        </mesh>
      </group>
      {/* fuse box and switch */}
      <group position={SWITCH} rotation={[0, SWITCH_YAW, 0]}>
        <mesh material={m.box} castShadow>
          <boxGeometry args={[1.3, 1.8, 0.5]} />
        </mesh>
        <group position={[0.35, 0.2, 0.3]} rotation={[-0.9 + lever * 1.8, 0, 0]}>
          <mesh material={m.dark} position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.0, 8]} />
          </mesh>
          <mesh material={m.knob} position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.2, 10, 8]} />
          </mesh>
        </group>
      </group>
      {cableParts.map((c, i) => {
        const r = rod(c.a, c.b);
        return (
          <mesh key={i} material={m.cable} position={r.mid} quaternion={r.q}>
            <cylinderGeometry args={[0.09, 0.09, r.len, 6]} />
          </mesh>
        );
      })}
      {spark > 0
        ? ends.flatMap((e, i) =>
            Array.from({ length: 6 }, (_, k) => {
              const ph = Math.sin(t * 47 + k * 13.1 + i * 7);
              if (ph < 0.2) return null;
              const a = k * 2.4 + t * 9;
              const rr = 0.2 + ((t * 5 + k * 0.37) % 1) * 0.8;
              return (
                <mesh key={`${i}-${k}`} material={m.spark} position={[e.x + Math.cos(a) * rr, e.y - rr * 0.5, e.z + Math.sin(a) * rr]} scale={0.1 + spark * 0.12}>
                  <boxGeometry args={[1, 1, 1]} />
                </mesh>
              );
            }),
          )
        : null}
      {spark > 0 && ends.length && Math.sin(t * 31) > 0 ? <pointLight color="#bfe4ff" intensity={25 * spark} distance={10} position={[ends[0].x, ends[0].y, ends[0].z]} /> : null}
      {on > 0 ? (
        <group>
          <group position={LAMP} quaternion={beamQ}>
            <mesh geometry={beamGeo} material={m.beam} renderOrder={20} frustumCulled={false} />
            <mesh geometry={coreGeo} material={m.core} renderOrder={21} frustumCulled={false} />
          </group>
          <primitive object={target} />
          <spotLight position={LAMP} target={target} color="#fff2c8" intensity={4000 * on} distance={320} angle={0.16} penumbra={0.5} decay={1} />
          <pointLight position={LAMP} color="#ffe9a8" intensity={120 * on} distance={50} />
        </group>
      ) : null}
    </group>
  );
};

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
