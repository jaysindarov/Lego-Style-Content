import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

import { SHOTS, timeline } from "../generated/current";
import { clamp01, type Frame } from "./kit";
import { Avatar } from "../world/Avatar";
import { City } from "../world/City";
import { Crack, Worm } from "../world/Worm";
import { BusStop, Bike, Benches, Car, ClockTower, Fountain, ShopRoof, ShopSign, SirenPole } from "../world/Props";
import { Dust, GroundFog, Lights, Mound, Sky, Wave } from "../world/Atmosphere";
import { SIRENS, TOWER, TOWER_H } from "../world/layout";

export const FPS = 30;
export const W = 1080;
export const H = 1920;

type Word = { w: string; start: number; end: number; scene: string; kid: boolean };
type Cut = { shot: string; start: number; end: number };

const words = timeline.words as Word[];
const SCHED = timeline.schedule as unknown as Record<string, [string, number][]>;

/** Shot cuts land just before the word they start on. */
export const buildCuts = (): Cut[] => {
  const cuts: { shot: string; start: number }[] = [];
  for (const scene of timeline.scenes) {
    const sw = words.filter((w) => w.scene === scene.id);
    for (const [shot, wi] of SCHED[scene.id]) {
      const start = wi === 0 ? Math.max(0, scene.start - 0.14) : sw[wi].start - 0.06;
      cuts.push({ shot, start });
    }
  }
  cuts[0].start = 0;
  return cuts.map((c, i) => ({ ...c, end: i + 1 < cuts.length ? cuts[i + 1].start : timeline.duration }));
};
const CUTS = buildCuts();

const shotAt = (t: number) => {
  let i = 0;
  while (i + 1 < CUTS.length && CUTS[i + 1].start <= t) i++;
  return CUTS[i];
};

const PARKED: { color: string; at: [number, number, number]; yaw: number }[] = [
  { color: "#f2f2f2", at: [-2.6, 0.03, 58], yaw: 0 },
  { color: "#ffd23f", at: [-2.6, 0.03, 132], yaw: 0 },
  { color: "#2e9e5b", at: [2.6, 0.03, 64], yaw: Math.PI },
  { color: "#8a4fd6", at: [-2.6, 0.03, 228], yaw: 0 },
  { color: "#ff8a3d", at: [-60, 0.03, -152.6], yaw: Math.PI / 2 },
];

const noise = (t: number, s: number) => Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 23.7 + s * 2.1) * 0.35 + Math.sin(t * 61.3 + s * 0.7) * 0.15;

const CamRig: React.FC<{ f: Frame; t: number }> = ({ f, t }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const sh = (f.shake ?? 0) * 0.35;
  cam.position.set(f.cam.pos[0] + noise(t, 1) * sh, f.cam.pos[1] + noise(t, 2) * sh, f.cam.pos[2] + noise(t, 3) * sh);
  cam.fov = f.cam.fov ?? 55;
  cam.near = 0.1;
  cam.far = 4000;
  cam.lookAt(f.cam.look[0] + noise(t, 4) * sh * 2, f.cam.look[1] + noise(t, 5) * sh * 2, f.cam.look[2] + noise(t, 6) * sh * 2);
  if (f.cam.roll) cam.rotateZ(f.cam.roll);
  cam.updateProjectionMatrix();
  return null;
};

const RoofSet: React.FC = () => {
  const m = useMemo(
    () => ({ a: new THREE.MeshStandardMaterial({ color: "#f7a8c4", roughness: 0.8 }), b: new THREE.MeshStandardMaterial({ color: "#a8e6cf", roughness: 0.8 }), top: new THREE.MeshStandardMaterial({ color: "#e6dccb", roughness: 0.9 }) }),
    [],
  );
  return (
    <group>
      <mesh material={m.a} position={[-4, 8, 18]} castShadow receiveShadow>
        <boxGeometry args={[16, 16, 16]} />
      </mesh>
      <mesh material={m.top} position={[-4, 16.2, 18]} receiveShadow>
        <boxGeometry args={[16.6, 0.4, 16.6]} />
      </mesh>
      <mesh material={m.b} position={[-18.5, 9, 2.5]} castShadow receiveShadow>
        <boxGeometry args={[12, 18, 12]} />
      </mesh>
      <mesh material={m.top} position={[-18.5, 18.2, 2.5]} receiveShadow>
        <boxGeometry args={[12.6, 0.4, 12.6]} />
      </mesh>
    </group>
  );
};

const Env: React.FC<{ evil: number }> = ({ evil }) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }, [gl, scene]);
  scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.3, evil);
  return null;
};

export const World: React.FC<{ f: Frame; t: number; lt: number }> = ({ f, t, lt }) => {
  const tower = f.tower ?? { bellSwing: 0, gearIn: 1, lever: 0, glow: 0 };
  const focus = f.focus ?? f.cam.look;
  return (
    <>
      <CamRig f={f} t={t} />
      <Env evil={f.evil} />
      <Lights evil={f.evil} focus={focus} dusk={f.dusk} />
      <Sky evil={f.evil} t={t} dusk={f.dusk} />
      <City />
      <Fountain t={t} />
      <Benches />
      <ClockTower bellSwing={tower.bellSwing} gearIn={tower.gearIn} lever={tower.lever} glow={tower.glow} t={t} />
      <BusStop />
      <ShopSign />
      <ShopRoof />
      {SIRENS.map((p, i) => (
        <SirenPole key={i} position={p} on={f.siren ?? 0} t={t + i} />
      ))}
      {PARKED.map((c, i) => (
        <Car key={`p${i}`} color={c.color} position={c.at} yaw={c.yaw} />
      ))}
      {(f.cars ?? []).map((c, i) => (
        <Car key={`c${i}`} color={c.color} position={c.at} yaw={c.yaw} crush={c.crush} wheelT={c.wheelT} />
      ))}
      {(f.bikes ?? []).map((b, i) => (
        <Bike key={`b${i}`} position={b.at} yaw={b.yaw} tilt={b.tilt} t={b.t} />
      ))}
      {(f.actors ?? []).map((a, i) =>
        a.hidden ? null : (
          <Avatar key={i} look={a.look} anim={a.anim} t={a.t ?? lt} mood={a.mood} position={a.at} yaw={a.yaw} scale={a.scale} roll={a.roll} holding={a.holding} />
        ),
      )}
      {(f.cracks ?? []).map((c, i) => (
        <Crack key={`k${i}`} x={c.x} z={c.z} size={c.size} amount={c.amount} t={lt} />
      ))}
      {(f.mounds ?? []).map((m, i) => (
        <group key={`m${i}`} position={[m.x, 0, m.z]} scale={m.scale ?? 1}>
          <Mound x={0} z={0} yaw={m.yaw} amount={m.amount} t={lt} />
        </group>
      ))}
      {(f.dust ?? []).map((d, i) => (
        <Dust key={`d${i}`} x={d.x} z={d.z} amount={d.amount} t={lt + i} spread={d.spread} color={d.color} />
      ))}
      {f.worm ? <Worm s={f.worm} /> : null}
      {f.roofSet ? <RoofSet /> : null}
      <Wave center={[TOWER[0], TOWER_H - 6, TOWER[2]]} k={f.wave ?? 0} />
      <GroundFog density={f.fog} t={t} />
    </>
  );
};

const Caption: React.FC<{ t: number }> = ({ t }) => {
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].start <= t + 0.03) idx = i;
  if (idx < 0) return null;
  const w = words[idx];
  const next = words[idx + 1];
  const until = next ? Math.min(next.start, w.end + 0.45) : w.end + 0.45;
  if (t > until) return null;
  const age = t - w.start;
  const pop = age < 0.06 ? 0.75 + (age / 0.06) * 0.35 : age < 0.14 ? 1.1 - ((age - 0.06) / 0.08) * 0.1 : 1;
  const text = w.w.replace(/[!?.,…]+$/g, "");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: H * 0.705,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "Rounded",
          fontSize: 104,
          color: "#fff35c",
          WebkitTextStroke: "16px #000000",
          paintOrder: "stroke fill",
          transform: `scale(${pop})`,
          letterSpacing: 1,
          filter: "drop-shadow(0px 6px 0px rgba(0,0,0,0.85))",
          lineHeight: 1.1,
        }}
      >
        {text}
      </span>
    </div>
  );
};

const ClockOverlay: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: "Rounded",
          fontSize: 120,
          color: "#ffffff",
          background: "rgba(10,20,10,0.72)",
          border: "6px solid #9dff4a",
          borderRadius: 28,
          padding: "6px 40px",
          boxShadow: "0 0 40px rgba(157,255,74,0.5)",
        }}
      >
        {text}
      </div>
    </div>
  ) : null;

export const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const cut = shotAt(t);
  const d = Math.max(0.01, cut.end - cut.start);
  const lt = t - cut.start;
  const f = SHOTS[cut.shot]({ t: lt, d, k: clamp01(lt / d) });
  const fadeOut = clamp01((frame - (durationInFrames - 24)) / 24);
  const fadeIn = clamp01(1 - frame / 8);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas
        width={W}
        height={H}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
        camera={{ fov: 55, near: 0.1, far: 4000, position: [0, 50, 100] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <World f={f} t={t} lt={lt} />
      </ThreeCanvas>
      {f.tint ? <AbsoluteFill style={{ background: f.tint, mixBlendMode: "screen" }} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
      {f.flash ? <AbsoluteFill style={{ background: `rgba(255,255,255,${f.flash})` }} /> : null}
      <ClockOverlay text={f.clock} />
      <Caption t={t} />
      <AbsoluteFill style={{ background: `rgba(0,0,0,${Math.max(fadeOut, fadeIn)})` }} />
    </AbsoluteFill>
  );
};

export const DURATION_FRAMES = Math.ceil(timeline.duration * FPS);
