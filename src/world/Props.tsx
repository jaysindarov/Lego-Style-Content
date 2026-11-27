import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { BUSSTOP, SHOP, SHOP_ROOF_Y, SIRENS, TOWER, TOWER_H } from "./layout";
import { brickTex, clockTex, signTex } from "./textures";
import { LANG } from "../generated/current";

const EN = LANG === "en";

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

export const Car: React.FC<{ color: string; position: [number, number, number]; yaw: number; crush?: number; wheelT?: number; lights?: number }> = ({
  color,
  position,
  yaw,
  crush = 0,
  wheelT = 0,
  lights = 0,
}) => {
  const m = useMemo(
    () => ({
      body: std(color, { metalness: 0.3, roughness: 0.35 }),
      glass: std("#9fd3ff", { metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.55 }),
      tire: std("#1b1b1b"),
      rim: std("#d0d0d0", { metalness: 0.7 }),
      light: new THREE.MeshStandardMaterial({ color: "#fffbe0", emissive: "#fff3b0", emissiveIntensity: 1 }),
      beam: new THREE.MeshBasicMaterial({ color: "#fff4c8", transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
      tail: new THREE.MeshStandardMaterial({ color: "#ff3030", emissive: "#ff2020", emissiveIntensity: 0.8 }),
    }),
    [color],
  );
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(2.6, 1.1, 5.4, 3, 0.3), []);
  const cabGeo = useMemo(() => new RoundedBoxGeometry(2.3, 1.0, 2.8, 3, 0.25), []);
  const sq = 1 - crush * 0.7;
  // lights >= 2: full beams (two cones and a spot light) for night-drive shots
  const beams = lights >= 2 ? Math.min(1, lights - 1) : 0;
  m.light.emissiveIntensity = 1 + beams * 4;
  m.beam.opacity = 0.16 * beams;
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 1, 40);
    return o;
  }, []);
  return (
    <group position={position} rotation={[crush * 0.25, yaw, crush * 0.15]} scale={[1 + crush * 0.25, sq, 1]}>
      <mesh geometry={bodyGeo} material={m.body} position={[0, 1.05, 0]} castShadow receiveShadow />
      <mesh geometry={cabGeo} material={m.glass} position={[0, 2.0, -0.3]} castShadow />
      <mesh material={m.body} position={[0, 2.52, -0.3]} castShadow>
        <boxGeometry args={[2.25, 0.08, 2.4]} />
      </mesh>
      {[
        [-1.2, 1.7],
        [1.2, 1.7],
        [-1.2, -1.7],
        [1.2, -1.7],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.55, z]} rotation={[wheelT * 6, 0, Math.PI / 2]}>
          <mesh material={m.tire} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.45, 14]} />
          </mesh>
          <mesh material={m.rim}>
            <cylinderGeometry args={[0.3, 0.3, 0.47, 10]} />
          </mesh>
        </group>
      ))}
      {[-0.8, 0.8].map((x) => (
        <React.Fragment key={x}>
          <mesh material={m.light} position={[x, 1.25, 2.71]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
          </mesh>
          <mesh material={m.tail} position={[x, 1.25, -2.71]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
          </mesh>
          {beams > 0 ? (
            <mesh material={m.beam} position={[x, 1.25, 2.75 + 30]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={20}>
              <coneGeometry args={[7, 60, 20, 1, true]} />
            </mesh>
          ) : null}
        </React.Fragment>
      ))}
      {beams > 0 ? (
        <>
          <primitive object={target} />
          <spotLight position={[0, 1.3, 2.8]} target={target} color="#fff2c8" intensity={2500 * beams} distance={120} angle={0.4} penumbra={0.4} decay={1} />
        </>
      ) : null}
    </group>
  );
};

export const Bike: React.FC<{ position: [number, number, number]; yaw: number; tilt?: number; t?: number }> = ({ position, yaw, tilt = 0, t = 0 }) => {
  const m = useMemo(() => ({ frame: std("#e8434f", { metalness: 0.4 }), tire: std("#1b1b1b"), seat: std("#2a2a2a") }), []);
  return (
    <group position={position} rotation={[0, yaw, tilt]}>
      {[-1.1, 1.1].map((z) => (
        <mesh key={z} material={m.tire} position={[0, 0.85, z]} rotation={[t * 5, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.8, 0.1, 8, 20]} />
        </mesh>
      ))}
      <mesh material={m.frame} position={[0, 1.4, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 2.2, 6]} />
      </mesh>
      <mesh material={m.frame} position={[0, 1.4, -0.5]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 1.2, 6]} />
      </mesh>
      <mesh material={m.seat} position={[0, 2.05, -0.55]}>
        <boxGeometry args={[0.35, 0.15, 0.7]} />
      </mesh>
      <mesh material={m.frame} position={[0, 2.1, 1]}>
        <boxGeometry args={[1.2, 0.1, 0.1]} />
      </mesh>
    </group>
  );
};

export const SirenPole: React.FC<{ position: [number, number, number]; on: number; t: number }> = ({ position, on, t }) => {
  const m = useMemo(
    () => ({
      pole: std("#7a7f87", { metalness: 0.6 }),
      horn: std("#c9ced6", { metalness: 0.7, roughness: 0.3 }),
      red: new THREE.MeshStandardMaterial({ color: "#ff2a2a", emissive: "#ff0000", emissiveIntensity: 0 }),
    }),
    [],
  );
  const flash = on > 0 ? (Math.sin(t * 14) > 0 ? 3 : 0.3) * on : 0;
  m.red.emissiveIntensity = flash;
  return (
    <group position={position}>
      <mesh material={m.pole} position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 14, 8]} />
      </mesh>
      <group position={[0, 13.2, 0]} rotation={[0, on > 0 ? t * 3 : 0, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} material={m.horn} rotation={[0, (k * Math.PI) / 2, Math.PI / 2]} position={[Math.cos((k * Math.PI) / 2) * 0.8, 0, -Math.sin((k * Math.PI) / 2) * 0.8]} castShadow>
            <coneGeometry args={[0.6, 1.4, 12, 1, true]} />
          </mesh>
        ))}
        <mesh material={m.red} position={[0, 1.1, 0]}>
          <sphereGeometry args={[0.45, 12, 10]} />
        </mesh>
      </group>
      {on > 0 ? <pointLight color="#ff2a2a" intensity={flash * 30} distance={30} position={[0, 14, 0]} /> : null}
    </group>
  );
};

export const BusStop: React.FC = () => {
  const m = useMemo(() => ({ post: std("#3b4a5a", { metalness: 0.5 }), roof: std("#2f6fd6"), glass: std("#cfeaff", { transparent: true, opacity: 0.45 }), sign: new THREE.MeshBasicMaterial({ map: signTex(EN ? "BUS STOP" : "BEKAT", "#2f6fd6", "#ffffff") }) }), []);
  const [x, , z] = BUSSTOP;
  return (
    <group position={[x, 0.3, z]} rotation={[0, -Math.PI / 2, 0]}>
      {[
        [-2.6, -0.9],
        [2.6, -0.9],
        [-2.6, 0.9],
        [2.6, 0.9],
      ].map(([px, pz], i) => (
        <mesh key={i} material={m.post} position={[px, 1.8, pz]} castShadow>
          <boxGeometry args={[0.2, 3.6, 0.2]} />
        </mesh>
      ))}
      <mesh material={m.roof} position={[0, 3.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.3, 2.6]} />
      </mesh>
      <mesh material={m.glass} position={[0, 1.8, -0.9]}>
        <boxGeometry args={[5.2, 3.2, 0.06]} />
      </mesh>
      <mesh material={m.sign} position={[0, 4.25, 1.31]}>
        <planeGeometry args={[2.6, 0.65]} />
      </mesh>
    </group>
  );
};

export const ShopSign: React.FC = () => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex(EN ? "SHOP" : "DOʻKON", "#e8434f", "#ffffff") }), []);
  return (
    <mesh material={mat} position={[SHOP[0] + 0.12, 5.6, SHOP[2]]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[7, 1.6]} />
    </mesh>
  );
};

/** Parapet and roof door on the shop roof, so the roof reads as a roof. */
export const ShopRoof: React.FC = () => {
  const m = useMemo(() => std("#e6dccb"), []);
  const x = SHOP[0] - 5.5;
  const z = SHOP[2];
  const y = SHOP_ROOF_Y;
  return (
    <group position={[x, y, z]}>
      <mesh material={m} position={[5.3, 0.5, 0]} castShadow>
        <boxGeometry args={[0.4, 1, 10]} />
      </mesh>
      <mesh material={m} position={[0, 1.2, -3]} castShadow>
        <boxGeometry args={[2.4, 2.6, 2.4]} />
      </mesh>
    </group>
  );
};

export const Fountain: React.FC<{ t: number }> = ({ t }) => {
  const m = useMemo(
    () => ({
      stone: std("#f2ede4"),
      water: new THREE.MeshStandardMaterial({ color: "#7fd0ff", emissive: "#3aa7d8", emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.2 }),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.stone} position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[8, 8.4, 1.2, 28]} />
      </mesh>
      <mesh material={m.water} position={[0, 1.15, 0]}>
        <cylinderGeometry args={[7.3, 7.3, 0.1, 28]} />
      </mesh>
      <mesh material={m.stone} position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 3, 12]} />
      </mesh>
      <mesh material={m.stone} position={[0, 4.2, 0]} castShadow>
        <cylinderGeometry args={[3, 2.4, 0.6, 20]} />
      </mesh>
      <mesh material={m.water} position={[0, 5.2 + Math.sin(t * 6) * 0.1, 0]}>
        <coneGeometry args={[1.4, 2.4, 12]} />
      </mesh>
    </group>
  );
};

export const Benches: React.FC = () => {
  const m = useMemo(() => ({ wood: std("#a0683c"), leg: std("#3b3b3b") }), []);
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        return (
          <group key={k} position={[Math.cos(a) * 22, 0, Math.sin(a) * 22]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh material={m.wood} position={[0, 1.0, 0]} castShadow>
              <boxGeometry args={[4, 0.25, 1.2]} />
            </mesh>
            <mesh material={m.wood} position={[0, 1.8, -0.55]} castShadow>
              <boxGeometry args={[4, 1, 0.2]} />
            </mesh>
            {[-1.7, 1.7].map((x) => (
              <mesh key={x} material={m.leg} position={[x, 0.5, 0]}>
                <boxGeometry args={[0.2, 1, 1]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

export const SIREN_POSITIONS = SIRENS;

/**
 * Brick clock tower with an open belfry: bell, a big gear that can be missing
 * a tooth wheel, and a red lever.
 */
export const ClockTower: React.FC<{ bellSwing: number; gearIn: number; lever: number; glow: number; t: number }> = ({ bellSwing, gearIn, lever, glow, t }) => {
  const m = useMemo(() => {
    const brick = brickTex().clone();
    brick.needsUpdate = true;
    brick.repeat.set(2, 10);
    return {
      brick: new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }),
      stone: std("#efe6d6"),
      roof: std("#3f5f8a", { flatShading: true }),
      clock: new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.5 }),
      hand: std("#1b1b1b"),
      bronze: new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 0.55, roughness: 0.35, emissive: "#ffcc55", emissiveIntensity: 0, side: THREE.DoubleSide }),
      iron: std("#9aa1aa", { metalness: 0.6, roughness: 0.35 }),
      red: std("#e02a2a"),
      wood: std("#7a4f2a"),
    };
  }, []);
  m.bronze.emissiveIntensity = glow * 1.2;
  const bellGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const y = i / 12;
      const r = 0.55 + 0.45 * Math.pow(1 - y, 2.2) + (i === 0 ? 0.12 : 0);
      pts.push(new THREE.Vector2(r * 2.4, (1 - y) * 3.4));
    }
    return new THREE.LatheGeometry(pts.reverse(), 28);
  }, []);
  const [x, , z] = TOWER;
  const baseH = TOWER_H - 14;
  const handA = t * 0.3;
  return (
    <group position={[x, 0, z]}>
      <mesh material={m.brick} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, baseH, 9]} />
      </mesh>
      {/* little wooden door at the foot of the tower, on the plaza side (+z) */}
      <mesh material={m.wood} position={[0, 1.9, 4.52]} castShadow>
        <boxGeometry args={[2.2, 3.8, 0.12]} />
      </mesh>
      <mesh material={m.stone} position={[0, 3.95, 4.55]}>
        <boxGeometry args={[2.8, 0.4, 0.15]} />
      </mesh>
      <mesh material={m.stone} position={[0, baseH + 0.3, 0]} castShadow>
        <boxGeometry args={[10.4, 0.8, 10.4]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
          <mesh material={m.clock} position={[0, baseH - 4.5, 4.52]}>
            <planeGeometry args={[6, 6]} />
          </mesh>
          <mesh material={m.hand} position={[0, baseH - 4.5, 4.6]} rotation={[0, 0, -handA]}>
            <boxGeometry args={[0.3, 2.4, 0.08]} />
          </mesh>
          <mesh material={m.hand} position={[0, baseH - 4.5, 4.62]} rotation={[0, 0, -handA * 12]}>
            <boxGeometry args={[0.22, 3.6, 0.08]} />
          </mesh>
        </group>
      ))}
      {/* belfry floor and pillars */}
      <group position={[0, baseH + 0.7, 0]}>
        {[
          [-4.4, -4.4],
          [4.4, -4.4],
          [-4.4, 4.4],
          [4.4, 4.4],
        ].map(([px, pz], i) => (
          <mesh key={i} material={m.stone} position={[px, 4.5, pz]} castShadow>
            <boxGeometry args={[1.2, 9, 1.2]} />
          </mesh>
        ))}
        <mesh material={m.stone} position={[0, 9.3, 0]} castShadow>
          <boxGeometry args={[10.4, 0.8, 10.4]} />
        </mesh>
        <mesh material={m.roof} position={[0, 13.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[7.6, 7.2, 4]} />
        </mesh>
        {/* beam and bell */}
        <mesh material={m.wood} position={[0, 8.4, 0]} castShadow>
          <boxGeometry args={[9, 0.7, 0.7]} />
        </mesh>
        <group position={[0, 8.1, 0]} rotation={[Math.sin(bellSwing * Math.PI * 2) * 0.5 * Math.min(1, bellSwing * 3 + (bellSwing > 0 ? 0.4 : 0)), 0, 0]}>
          <mesh geometry={bellGeo} material={m.bronze} position={[0, -3.9, 0]} castShadow />
        </group>
        {/* gear mechanism on the floor */}
        <group position={[2.6, 1.6, -2.4]} scale={0.75}>
          <mesh material={m.iron} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[1.3, 1.3, 0.4, 16]} />
          </mesh>
          {Array.from({ length: 10 }, (_, k) => (
            <mesh key={k} material={m.iron} rotation={[0, 0, (k / 10) * Math.PI * 2 + t * 2 * (bellSwing > 0 ? 1 : 0)]}>
              <boxGeometry args={[0.35, 3.2, 0.4]} />
            </mesh>
          ))}
          <group position={[-2.1 + (1 - gearIn) * -1.5, (1 - gearIn) * 1.2, 0.2]}>
            <mesh material={m.bronze} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.8, 0.8, 0.4, 14]} />
            </mesh>
            {Array.from({ length: 8 }, (_, k) => (
              <mesh key={k} material={m.bronze} rotation={[0, 0, (k / 8) * Math.PI * 2]}>
                <boxGeometry args={[0.28, 2.1, 0.4]} />
              </mesh>
            ))}
          </group>
        </group>
        <group position={[-2.8, 0, 2.6]}>
          <mesh material={m.iron} position={[0, 0.6, 0]}>
            <boxGeometry args={[1.4, 1.2, 1]} />
          </mesh>
          <group position={[0, 1.2, 0]} rotation={[-0.7 + lever * 1.4, 0, 0]}>
            <mesh material={m.iron} position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 2.4, 8]} />
            </mesh>
            <mesh material={m.red} position={[0, 2.5, 0]}>
              <sphereGeometry args={[0.35, 12, 10]} />
            </mesh>
          </group>
        </group>
      </group>
      {glow > 0 ? <pointLight color="#ffd27a" intensity={glow * 150} distance={120} position={[0, baseH + 6, 0]} /> : null}
    </group>
  );
};

/** The giant lamp on the clock tower's spire: a glass globe on an iron cage; `on` 0..1. */
export const TowerLamp: React.FC<{ on: number; t: number }> = ({ on, t }) => {
  const m = useMemo(
    () => ({
      iron: new THREE.MeshStandardMaterial({ color: "#2b2b33", metalness: 0.6, roughness: 0.4 }),
      glass: new THREE.MeshStandardMaterial({ color: "#fff6d0", emissive: "#ffd46a", emissiveIntensity: 0, roughness: 0.2 }),
      halo: new THREE.MeshBasicMaterial({ color: "#ffe9a0", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    }),
    [],
  );
  m.glass.emissiveIntensity = 0.1 + on * 4;
  m.glass.color.set(on > 0.05 ? "#fff6d0" : "#77715f");
  m.halo.opacity = on * 0.22;
  const [x, , z] = TOWER;
  const y = TOWER_H + 3.8;
  return (
    <group position={[x, y, z]}>
      <mesh material={m.iron} position={[0, -1.8, 0]}>
        <cylinderGeometry args={[0.4, 0.8, 2.4, 8]} />
      </mesh>
      <mesh material={m.glass}>
        <sphereGeometry args={[2.2, 24, 16]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} material={m.iron} rotation={[0, (k * Math.PI) / 4, 0]}>
          <torusGeometry args={[2.25, 0.12, 6, 24]} />
        </mesh>
      ))}
      <mesh material={m.iron} position={[0, 2.4, 0]}>
        <coneGeometry args={[1.2, 1.2, 8]} />
      </mesh>
      <mesh material={m.halo} scale={2.6 + on * 2.4}>
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      {on > 0 ? <pointLight color="#ffdc8a" intensity={on * 4000} distance={300} decay={1.5} /> : null}
    </group>
  );
};
