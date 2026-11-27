/**
 * Sky, the green fog, lights, dust and the bell's shock wave. `evil` (0..1)
 * turns a clear blue day into a churning toxic-green sky.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { puffTex } from "./textures";

/** Storm colours per story: green fog (default) or the red sky. */
export type Palette = "green" | "red" | "night" | "violet";
export const PALETTES = {
  green: { lo: [0.02, 0.06, 0.02], hi: [0.14, 0.42, 0.1], glow: [0.55, 1.0, 0.25], hor: [0.45, 0.85, 0.25], fog: "#7dff4a", far: "#3d7a2e", hemiSky: "#5aa04a", hemiGround: "#35552a", sun: "#b8ff9a", amb: "#b5ffa0", accent: "#9dff4a" },
  night: { lo: [0.01, 0.015, 0.05], hi: [0.07, 0.1, 0.27], glow: [0.6, 0.5, 1.0], hor: [0.1, 0.13, 0.32], fog: "#8f9cff", far: "#151a36", hemiSky: "#4a5ab0", hemiGround: "#1e2448", sun: "#9aa6ff", amb: "#a8b4ff", accent: "#9d8cff" },
  red: { lo: [0.08, 0.01, 0.02], hi: [0.52, 0.06, 0.07], glow: [1.0, 0.45, 0.25], hor: [0.9, 0.25, 0.16], fog: "#ff5a48", far: "#7a2420", hemiSky: "#c05050", hemiGround: "#552525", sun: "#ffb09a", amb: "#ffb3a8", accent: "#ff4a3a" },
  violet: { lo: [0.04, 0.02, 0.07], hi: [0.34, 0.12, 0.46], glow: [1.0, 0.45, 0.95], hor: [0.95, 0.38, 0.42], fog: "#b45cff", far: "#3a1f52", hemiSky: "#7a4aa8", hemiGround: "#3a2a55", sun: "#ffb08a", amb: "#d9b5ff", accent: "#c78cff" },
} as const;

const NOISE = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 6; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return v;
}`;

const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // always at the far plane
}`;

const skyFrag = /* glsl */ `
uniform float uTime; uniform float uEvil; uniform float uDusk;
uniform vec3 uLo; uniform vec3 uHi; uniform vec3 uGlow; uniform vec3 uHor;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  // day
  vec3 zen = vec3(0.22,0.58,0.96);
  vec3 hor = vec3(0.80,0.92,1.0);
  vec3 day = mix(hor, zen, pow(max(h,0.0), 0.55));
  vec2 cuv = d.xz / (h + 0.25) * 1.4 + vec2(uTime*0.01, 0.0);
  float c = smoothstep(0.55, 0.85, fbm(cuv));
  day = mix(day, vec3(1.0), c * 0.85 * smoothstep(0.0, 0.25, h));
  // dusk band for the ending
  vec3 duskCol = mix(vec3(1.0,0.45,0.25), vec3(0.95,0.35,0.55), smoothstep(0.0,0.25,h));
  day = mix(day, mix(duskCol, zen, smoothstep(0.05, 0.6, h)), uDusk);
  // evil: churning green-black storm
  vec2 e = d.xz / (h + 0.18) * 1.1;
  float sw = fbm(e + vec2(uTime*0.05, -uTime*0.03));
  float storm = fbm(e*1.7 + sw*2.2 + vec2(-uTime*0.04, uTime*0.02));
  vec3 ev = mix(uLo, uHi, storm);
  ev += uGlow * pow(storm, 5.0) * 1.6;
  ev = mix(ev, uHor, (1.0 - smoothstep(-0.05, 0.25, h)) * 0.7);
  gl_FragColor = vec4(mix(day, ev, uEvil), 1.0);
}`;

export const Sky: React.FC<{ evil: number; t: number; dusk?: number; palette?: Palette }> = ({ evil, t, dusk = 0, palette = "green" }) => {
  const { camera } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: { uTime: { value: 0 }, uEvil: { value: 0 }, uDusk: { value: 0 }, uLo: { value: new THREE.Vector3() }, uHi: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  mat.uniforms.uTime.value = t;
  mat.uniforms.uEvil.value = evil;
  mat.uniforms.uDusk.value = dusk;
  const P = PALETTES[palette];
  (mat.uniforms.uLo.value as THREE.Vector3).fromArray(P.lo);
  (mat.uniforms.uHi.value as THREE.Vector3).fromArray(P.hi);
  (mat.uniforms.uGlow.value as THREE.Vector3).fromArray(P.glow);
  (mat.uniforms.uHor.value as THREE.Vector3).fromArray(P.hor);
  return (
    <mesh material={mat} position={camera.position} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[3000, 48, 24]} />
    </mesh>
  );
};

const fogFrag = /* glsl */ `
uniform float uTime; uniform float uDensity; uniform float uLayer; uniform vec3 uCam; uniform vec3 uColor;
varying vec3 vWorld;
${NOISE}
void main(){
  vec2 p = vWorld.xz * 0.018 + vec2(uTime*0.06 + uLayer*3.1, uTime*0.03);
  float n = fbm(p + fbm(p*0.7 + uTime*0.02));
  float a = smoothstep(0.32, 0.75, n) * uDensity;
  float dist = length(vWorld.xz - uCam.xz);
  a *= 1.0 - smoothstep(250.0, 900.0, dist);
  a *= smoothstep(1.0, 8.0, dist);
  gl_FragColor = vec4(uColor * (0.75 + n*0.6), clamp(a * (0.2 - uLayer*0.015), 0.0, 1.0));
}`;
const fogVert = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position,1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** Stacked noise sheets hugging the ground: the green fog. */
export const GroundFog: React.FC<{ density: number; t: number; palette?: Palette }> = ({ density, t, palette = "green" }) => {
  const { camera } = useThree();
  const layers = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map(
        (k) =>
          new THREE.ShaderMaterial({
            vertexShader: fogVert,
            fragmentShader: fogFrag,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
              uTime: { value: 0 },
              uDensity: { value: 0 },
              uLayer: { value: k },
              uCam: { value: new THREE.Vector3() },
              uColor: { value: new THREE.Color("#7dff4a") },
            },
          }),
      ),
    [],
  );
  if (density <= 0.001) return null;
  return (
    <group>
      {layers.map((m, k) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uDensity.value = density;
        (m.uniforms.uColor.value as THREE.Color).set(PALETTES[palette].fog);
        (m.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
        return (
          <mesh key={k} material={m} position={[camera.position.x, 0.6 + k * 1.7, camera.position.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5 + k} frustumCulled={false}>
            <planeGeometry args={[2000, 2000]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Sun, sky light and fog colour, all following `evil`. */
export const Lights: React.FC<{ evil: number; focus: [number, number, number]; dusk?: number; palette?: Palette; dark?: number }> = ({ evil, focus, dusk = 0, palette = "green", dark = 0 }) => {
  const dim = 1 - 0.6 * dark; // a darker night, so lamps pool light and shadows read
  const { scene } = useThree();
  const P = PALETTES[palette];
  const day = new THREE.Color("#cfe8ff").lerp(new THREE.Color("#f2b48a"), dusk);
  const fogCol = day.clone().lerp(new THREE.Color(P.far), evil);
  if (!scene.fog) scene.fog = new THREE.Fog(fogCol, 300, 1400);
  const fog = scene.fog as THREE.Fog;
  fog.color.copy(fogCol);
  fog.near = THREE.MathUtils.lerp(300, 70, evil);
  fog.far = THREE.MathUtils.lerp(1500, 750, evil);
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(...focus);
  target.updateMatrixWorld();
  const sun = new THREE.Color("#fff4e0").lerp(new THREE.Color("#ffb070"), dusk).lerp(new THREE.Color(P.sun), evil);
  return (
    <>
      <hemisphereLight args={[new THREE.Color("#bfe3ff").lerp(new THREE.Color(P.hemiSky), evil), new THREE.Color("#8fbf6a").lerp(new THREE.Color(P.hemiGround), evil), THREE.MathUtils.lerp(1.6, 1.25, evil) * dim]} />
      <ambientLight intensity={THREE.MathUtils.lerp(0.35, 0.6, evil) * dim} color={evil > 0.5 ? P.amb : "#ffffff"} />
      <primitive object={target} />
      <directionalLight
        color={sun}
        intensity={THREE.MathUtils.lerp(3.0, 1.8, evil) * (1 - 0.45 * dark)}
        position={[focus[0] + 80, focus[1] + 140, focus[2] + 60]}
        target={target}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
};

/** Billowing dust: a ring of soft sprites that rise and spread. */
export const Dust: React.FC<{ x: number; z: number; amount: number; t: number; color?: string; spread?: number; y?: number }> = ({ x, z, amount, t, color = "#b9a27f", spread = 12, y = 0 }) => {
  const mats = useMemo(() => Array.from({ length: 26 }, () => new THREE.SpriteMaterial({ map: puffTex(), color, transparent: true, depthWrite: false, opacity: 0.6 })), [color]);
  if (amount <= 0) return null;
  const sprites = [];
  for (let k = 0; k < 26; k++) {
    const a = k * 2.399;
    const life = (t * 0.6 + k * 0.137) % 1;
    const r = spread * (0.3 + life * 0.9) * (0.6 + (k % 5) * 0.12);
    const s = (4 + life * 10) * (0.7 + (k % 3) * 0.2) * Math.min(1, amount) * (spread / 12);
    const m = mats[k];
    m.opacity = 0.55 * (1 - life) * Math.min(1, amount);
    sprites.push(<sprite key={k} material={m} position={[x + Math.cos(a) * r, y + 1 + life * 9 * (spread / 12), z + Math.sin(a) * r]} scale={[s, s, s]} />);
  }
  return <group>{sprites}</group>;
};

/** The bell's sound: a faint shell and a bright ring racing over the town. */
export const Wave: React.FC<{ center: [number, number, number]; k: number }> = ({ center, k }) => {
  const mats = useMemo(
    () =>
      [0, 1, 2].map(() => ({
        shell: new THREE.MeshBasicMaterial({ color: "#ffe39a", transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        ring: new THREE.MeshBasicMaterial({ color: "#fff0b0", transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      })),
    [],
  );
  if (k <= 0) return null;
  return (
    <group>
      {mats.map((m, i) => {
        const kk = k - i * 0.2;
        if (kk <= 0) return null;
        const r = kk * 420;
        const fade = Math.max(0, 1 - kk);
        m.shell.opacity = 0.09 * fade;
        m.ring.opacity = 0.7 * fade;
        return (
          <group key={i}>
            <mesh material={m.shell} position={center} scale={[r, r * 0.35, r]}>
              <sphereGeometry args={[1, 40, 20]} />
            </mesh>
            <mesh material={m.ring} position={[center[0], 1.5, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[Math.max(0.1, r - 6 - r * 0.04), r, 96]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Something big moving under the asphalt: a travelling bulge with tilted slabs. */
export const Mound: React.FC<{ x: number; z: number; yaw: number; amount: number; t: number; tint?: string }> = ({ x, z, yaw, amount, t, tint = "#4a4a52" }) => {
  const m = useMemo(
    () => ({
      dirt: new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 1, flatShading: true }),
      slab: new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, flatShading: true }),
      glow: new THREE.MeshBasicMaterial({ color: "#9dff4a" }),
    }),
    [tint],
  );
  if (amount <= 0) return null;
  const slabs = [];
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1;
    const along = (k >> 1) * 1.6 - 6;
    const lift = Math.max(0, 1 - Math.abs(along) / 8) * amount;
    slabs.push(
      <mesh key={k} material={m.slab} position={[side * (3.2 + (k % 3) * 0.4), lift * 1.6, along]} rotation={[Math.sin(t * 9 + k) * 0.08, 0, side * -0.6 * lift]} castShadow>
        <boxGeometry args={[2.6, 0.5, 1.5]} />
      </mesh>,
    );
  }
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh material={m.dirt} scale={[4.2, 2.4 * amount, 9]} position={[0, -0.4, 0]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      <mesh material={m.glow} position={[0, 2.0 * amount - 0.4, 0]} scale={[0.25, 0.1, 5]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {slabs}
    </group>
  );
};
