import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

import { FORMAT, SHOTS, timeline } from "../generated/current";
import { clamp01, type Frame } from "./kit";
import { Avatar } from "../world/Avatar";
import { City } from "../world/City";
import { Crack, Worm } from "../world/Worm";
import { BusStop, Bike, Benches, Car, ClockTower, Fountain, ShopRoof, ShopSign, SirenPole, TowerLamp } from "../world/Props";
import { Dust, GroundFog, Lights, Mound, PALETTES, Sky, Wave } from "../world/Atmosphere";
import { Giant } from "../world/Giant";
import { Lighthouse } from "../world/Lighthouse";
import { MysteryHouse } from "../world/MysteryHouse";
import { SIRENS, TOWER, TOWER_H } from "../world/layout";

export const FPS = 30;
export const LAND = FORMAT === "landscape";
export const W = LAND ? 1920 : 1080;
export const H = LAND ? 1080 : 1920;

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

/** A drawn blocky silhouette lying on the ground from an actor's feet (crisper than a real shadow at night). */
let silTex: THREE.CanvasTexture | null = null;
const silhouette = () => {
  if (silTex) return silTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(22, 0, 20, 22); // head (far end)
  g.fillRect(14, 24, 36, 40); // torso
  g.fillRect(4, 26, 9, 36); // arms
  g.fillRect(51, 26, 9, 36);
  g.fillRect(16, 64, 14, 64); // legs (at the feet)
  g.fillRect(34, 64, 14, 64);
  silTex = new THREE.CanvasTexture(c);
  return silTex;
};
const shadowMat = new Map<number, THREE.MeshBasicMaterial>();
const FakeShadow: React.FC<{ at: [number, number, number]; dir: number; scale: number; len: number; opacity: number }> = ({ at, dir, scale, len, opacity }) => {
  const key = Math.round(opacity * 100);
  let m = shadowMat.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: silhouette(), color: "#000", transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    shadowMat.set(key, m);
  }
  const h = 5.3 * scale * len;
  const w = 2.3 * scale;
  return (
    <group position={[at[0], at[1] + 0.13, at[2]]} rotation={[0, dir, 0]}>
      <mesh material={m} position={[0, 0, h / 2 - 0.1]} rotation={[-Math.PI / 2, 0, Math.PI]} renderOrder={2}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
};

/** A shadow-casting spot light (porch lamp, lighthouse beam). */
const Spot: React.FC<{ pos: [number, number, number]; aim: [number, number, number]; intensity?: number; color?: string; angle?: number }> = ({ pos, aim, intensity = 1, color = "#fff3d0", angle = 0.5 }) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(aim[0], aim[1], aim[2]);
  target.updateMatrixWorld();
  const d = Math.hypot(aim[0] - pos[0], aim[1] - pos[1], aim[2] - pos[2]);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={pos}
        target={target}
        color={color}
        intensity={intensity * 45}
        distance={d * 3}
        decay={1.6}
        angle={angle}
        penumbra={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
        shadow-camera-near={0.5}
        shadow-camera-far={d * 3}
      />
    </>
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
      <Lights evil={f.evil} focus={focus} dusk={f.dusk} palette={f.palette} dark={f.dark} />
      <Sky evil={f.evil} t={t} dusk={f.dusk} palette={f.palette} />
      {(f.balls ?? []).map((b, i) => (
        <mesh key={`ball${i}`} position={b} castShadow>
          <icosahedronGeometry args={[0.42, 1]} />
          <meshStandardMaterial color="#f4f4f4" roughness={0.5} flatShading />
        </mesh>
      ))}
      {(f.spots ?? []).map((s, i) => (
        <Spot key={`sp${i}`} {...s} />
      ))}
      <City />
      <Fountain t={t} />
      <Benches />
      <ClockTower bellSwing={tower.bellSwing} gearIn={tower.gearIn} lever={tower.lever} glow={tower.glow} t={t} />
      <Lighthouse s={f.lamp} t={t} />
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
        <Car key={`c${i}`} color={c.color} position={c.at} yaw={c.yaw} crush={c.crush} wheelT={c.wheelT} lights={c.lights} />
      ))}
      {(f.bikes ?? []).map((b, i) => (
        <Bike key={`b${i}`} position={b.at} yaw={b.yaw} tilt={b.tilt} t={b.t} />
      ))}
      {(f.actors ?? []).map((a, i) =>
        a.hidden ? null : (
          <Avatar key={i} look={a.look} anim={a.anim} t={a.t ?? lt} mood={a.mood} position={a.at} yaw={a.yaw} scale={a.scale} roll={a.roll} holding={a.holding} noShadow={a.noShadow} shadow={a.shadow} tip={a.tip} melt={a.melt} />
        ),
      )}
      {f.cast
        ? (f.actors ?? []).map((a, i) => {
            if (a.hidden || a.noShadow || a.shadow || a.anim === "climb") return null;
            const c = f.cast!;
            const dir = c.from ? Math.atan2(a.at[0] - c.from[0], a.at[2] - c.from[2]) : (c.dir ?? 0);
            return <FakeShadow key={`fs${i}`} at={a.at} dir={dir} scale={a.scale ?? 0.62} len={c.len ?? 1} opacity={c.opacity ?? 0.6} />;
          })
        : null}
      {(f.cracks ?? []).map((c, i) => (
        <Crack key={`k${i}`} x={c.x} z={c.z} size={c.size} amount={c.amount} t={lt} />
      ))}
      {(f.mounds ?? []).map((m, i) => (
        <group key={`m${i}`} position={[m.x, 0, m.z]} scale={m.scale ?? 1}>
          <Mound x={0} z={0} yaw={m.yaw} amount={m.amount} t={lt} />
        </group>
      ))}
      {(f.dust ?? []).map((d, i) => (
        <Dust key={`d${i}`} x={d.x} z={d.z} amount={d.amount} t={lt + i} spread={d.spread} color={d.color} y={d.y} />
      ))}
      {f.worm ? <Worm s={f.worm} /> : null}
      {(f.houses ?? []).map((h, i) => (
        <MysteryHouse key={`h${i}`} s={{ t: lt, ...h }} />
      ))}
      {(f.giants ?? []).map((g, i) => (
        <Giant key={`g${i}`} s={g} />
      ))}
      {f.roofSet ? <RoofSet /> : null}
      {f.towerLamp !== undefined ? <TowerLamp on={f.towerLamp} t={t} /> : null}
      <Wave center={[TOWER[0], TOWER_H - 6, TOWER[2]]} k={f.wave ?? 0} />
      <GroundFog density={f.fog} t={t} palette={f.palette} />
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
        top: H * (LAND ? 0.79 : 0.705),
        display: "flex",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "Rounded",
          fontSize: LAND ? 86 : 104,
          color: "#fff35c",
          WebkitTextStroke: LAND ? "14px #000000" : "16px #000000",
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

/** A handwritten note held up to the camera, in the upper third (never the caption band). */
const NoteOverlay: React.FC<{ note?: { text: string; k: number } }> = ({ note }) => {
  if (!note) return null;
  const k = clamp01(note.k);
  const y = (LAND ? 70 : 260) + (1 - k) * 120;
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: k }}>
      <div
        style={{
          width: LAND ? 820 : 760,
          padding: LAND ? "36px 50px" : "54px 60px",
          background: "linear-gradient(180deg, #fbf6e6 0%, #efe6cc 100%)",
          borderRadius: 10,
          boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
          transform: `rotate(${-3 + (1 - k) * 4}deg)`,
          fontFamily: "Rounded",
          fontSize: LAND ? 60 : 76,
          lineHeight: 1.15,
          color: "#2a2340",
          textAlign: "center",
          backgroundImage: "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 86px, rgba(80,110,200,0.25) 87px, rgba(0,0,0,0) 89px)",
        }}
      >
        {note.text}
      </div>
    </div>
  );
};

/** Tape-rewind look: blue-white wash, rolling scanlines, a jitter band and a ◀◀ mark. */
const RewindOverlay: React.FC<{ k?: number; t: number }> = ({ k, t }) => {
  if (!k) return null;
  const band = ((t * 0.9) % 1) * H;
  const tri = (x: number) => (
    <div style={{ position: "absolute", left: x, top: 0, width: 0, height: 0, borderTop: "34px solid transparent", borderBottom: "34px solid transparent", borderRight: "52px solid #ffffff" }} />
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, k) }}>
      <AbsoluteFill style={{ background: "rgba(120,170,255,0.22)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 2px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: band, height: H * 0.06, background: "rgba(255,255,255,0.22)", filter: "blur(6px)" }} />
      <div style={{ position: "absolute", left: LAND ? 70 : 60, top: LAND ? 60 : 120, width: 120, height: 68, filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.8))" }}>
        {tri(0)}
        {tri(52)}
      </div>
    </AbsoluteFill>
  );
};

/** The scratched belfry wall: tally marks, two stick figures holding hands, and a word. */
const WallOverlay: React.FC<{ wall?: { k: number; tallies: number; drawing?: number; word?: number } }> = ({ wall }) => {
  if (!wall) return null;
  const k = clamp01(wall.k);
  const Wd = LAND ? 1100 : 900;
  const Hd = LAND ? 760 : 900;
  const groups = Math.ceil(wall.tallies / 5);
  const perRow = LAND ? 15 : 12;
  const marks: React.ReactNode[] = [];
  for (let g = 0; g < groups; g++) {
    const cx = 36 + (g % perRow) * 70;
    const cy = 26 + Math.floor(g / perRow) * 62;
    const n = Math.min(5, wall.tallies - g * 5);
    for (let i = 0; i < Math.min(4, n); i++) marks.push(<line key={`${g}-${i}`} x1={cx + i * 12} y1={cy} x2={cx + i * 12 + 2} y2={cy + 44} />);
    if (n === 5) marks.push(<line key={`${g}-x`} x1={cx - 6} y1={cy + 38} x2={cx + 44} y2={cy + 6} />);
  }
  const d = clamp01(wall.drawing ?? 0);
  const w = clamp01(wall.word ?? 0);
  const fig = (x: number, s: number) => (
    <g transform={`translate(${x} ${Hd - 250}) scale(${s})`}>
      <circle cx={0} cy={0} r={18} />
      <line x1={0} y1={18} x2={0} y2={80} />
      <line x1={0} y1={40} x2={-26} y2={62} />
      <line x1={0} y1={40} x2={26} y2={62} />
      <line x1={0} y1={80} x2={-20} y2={120} />
      <line x1={0} y1={80} x2={20} y2={120} />
    </g>
  );
  return (
    <div style={{ position: "absolute", top: LAND ? 60 : 220, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: k }}>
      <svg width={Wd} height={Hd} viewBox={`0 0 ${Wd} ${Hd}`} style={{ borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
        <defs>
          <pattern id="stone" width="120" height="60" patternUnits="userSpaceOnUse">
            <rect width="120" height="60" fill="#8d8478" />
            <rect x="2" y="2" width="116" height="26" fill="#9a9184" />
            <rect x="-58" y="32" width="116" height="26" fill="#958c7f" />
            <rect x="62" y="32" width="116" height="26" fill="#958c7f" />
          </pattern>
        </defs>
        <rect width={Wd} height={Hd} fill="url(#stone)" />
        <g stroke="#f4efe4" strokeWidth={5} strokeLinecap="round" opacity={0.9}>
          {marks}
        </g>
        <g stroke="#f4efe4" strokeWidth={5} strokeLinecap="round" fill="none" opacity={d}>
          {fig(Wd / 2 - 60, 1.1)}
          {fig(Wd / 2 + 50, 0.8)}
          <line x1={Wd / 2 - 31} y1={Hd - 188} x2={Wd / 2 + 29} y2={Hd - 198} />
        </g>
        <text x={Wd / 2} y={Hd - 30} textAnchor="middle" fontFamily="Rounded" fontSize={LAND ? 92 : 110} fill="#fff6dc" stroke="#3a3128" strokeWidth={3} opacity={w} letterSpacing={14}>
          STAY
        </text>
      </svg>
    </div>
  );
};

const ClockOverlay: React.FC<{ text?: string; accent?: string }> = ({ text, accent = "#9dff4a" }) =>
  text ? (
    <div style={{ position: "absolute", top: LAND ? 50 : 210, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: "Rounded",
          fontSize: LAND ? 84 : 120,
          color: "#ffffff",
          background: "rgba(10,20,10,0.72)",
          border: `6px solid ${accent}`,
          borderRadius: 28,
          padding: "6px 40px",
          boxShadow: `0 0 40px ${accent}88`,
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
        style={{ position: "absolute", inset: 0, filter: f.sepia ? `sepia(${f.sepia}) saturate(${1 - f.sepia * 0.3}) contrast(1.05)` : undefined }}
      >
        <World f={f} t={t} lt={lt} />
      </ThreeCanvas>
      {f.tint ? <AbsoluteFill style={{ background: f.tint, mixBlendMode: "screen" }} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
      {f.flash ? <AbsoluteFill style={{ background: `rgba(255,255,255,${f.flash})` }} /> : null}
      <RewindOverlay k={f.rewind} t={t} />
      <WallOverlay wall={f.wall} />
      <NoteOverlay note={f.note} />
      <ClockOverlay text={f.clock} accent={PALETTES[f.palette ?? "green"].accent} />
      <Caption t={t} />
      <AbsoluteFill style={{ background: `rgba(0,0,0,${Math.max(fadeOut, fadeIn)})` }} />
    </AbsoluteFill>
  );
};

export const DURATION_FRAMES = Math.ceil(timeline.duration * FPS);
