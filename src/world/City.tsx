/**
 * The static town, built once and merged per material so ~900 buildings cost a
 * few dozen draw calls. Pastel row houses with shop fronts downtown, white
 * glass towers around them, red-roofed houses and trees at the edge, hills
 * beyond.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { EDGE, GRID, PITCH, PLAZA, ROAD, SHOP, SUBURB_Z, WALK } from "./layout";
import {
  facadeTex,
  grassTex,
  plazaTex,
  rng,
  roadTex,
  roofTex,
  shopTex,
  sidewalkTex,
  tileRoofTex,
  asphaltTex,
} from "./textures";

type Bucket = { make: () => THREE.Material; geos: THREE.BufferGeometry[]; shadow: boolean };

const PASTELS = ["#f7a8c4", "#a8e6cf", "#ffe08a", "#c9b6f2", "#ffc49b", "#9fd8f5", "#f6efe2", "#ff9fa0"];
const AWNINGS = ["#e8434f", "#2e9e5b", "#2f6fd6", "#f08a24", "#8a4fd6"];
const FLOOR = 4.2;
const SHOP_H = 5;

/** Pick faces (6 verts each) out of a non-indexed box. */
const pickFaces = (g: THREE.BufferGeometry, faces: number[]) => {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const a = g.getAttribute(name) as THREE.BufferAttribute;
    const n = a.itemSize;
    const arr = new Float32Array(faces.length * 6 * n);
    faces.forEach((f, k) => arr.set((a.array as Float32Array).subarray(f * 6 * n, (f + 1) * 6 * n), k * 6 * n));
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  return out;
};

class Builder {
  buckets = new Map<string, Bucket>();
  add(key: string, make: () => THREE.Material, geo: THREE.BufferGeometry, shadow = true) {
    let b = this.buckets.get(key);
    if (!b) {
      b = { make, geos: [], shadow };
      this.buckets.set(key, b);
    }
    b.geos.push(geo.index ? geo.toNonIndexed() : geo);
  }
  /** A box whose side faces tile `side` (tileW x tileH) and whose top uses `top`. */
  box(
    sideKey: string,
    side: () => THREE.Material,
    topKey: string | null,
    top: (() => THREE.Material) | null,
    cx: number,
    y0: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    tileW: number,
    tileH: number,
  ) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let f = 0; f < 6; f++) {
      const span = f === 0 || f === 1 ? d : w;
      for (let v = 0; v < 6; v++) {
        const i = f * 6 + v;
        if (f === 2 || f === 3) {
          uv.setXY(i, uv.getX(i) * (w / 8), uv.getY(i) * (d / 8));
        } else {
          uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(span / tileW)), uv.getY(i) * (h / tileH));
        }
      }
    }
    g.translate(cx, y0 + h / 2, cz);
    this.add(sideKey, side, pickFaces(g, [0, 1, 4, 5]));
    if (topKey && top) this.add(topKey, top, pickFaces(g, [2]));
  }
  plain(key: string, make: () => THREE.Material, geo: THREE.BufferGeometry, shadow = true) {
    this.add(key, make, geo, shadow);
  }
  build(): THREE.Group {
    const group = new THREE.Group();
    for (const [, b] of this.buckets) {
      const merged = mergeGeometries(b.geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.make());
      mesh.castShadow = b.shadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

const std = (map: THREE.Texture | null, color = "#ffffff", extra: THREE.MeshStandardMaterialParameters = {}) => () =>
  new THREE.MeshStandardMaterial({ map: map ?? undefined, color, roughness: 0.82, metalness: 0.02, ...extra });

const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => () =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...extra });

const ringOf = (i: number, j: number) => Math.max(Math.abs(i + 0.5), Math.abs(j + 0.5)) - 0.5;

const tree = (b: Builder, x: number, z: number, s: number, r: () => number) => {
  const trunk = new THREE.CylinderGeometry(0.35 * s, 0.45 * s, 3 * s, 6);
  trunk.translate(x, 1.5 * s, z);
  b.plain("trunk", flat("#8a5a36"), trunk);
  const n = 2 + Math.floor(r() * 2);
  for (let k = 0; k < n; k++) {
    const puff = new THREE.IcosahedronGeometry((1.9 - k * 0.25) * s, 0);
    puff.translate(x + (r() - 0.5) * 1.4 * s, (3.4 + k * 1.2) * s, z + (r() - 0.5) * 1.4 * s);
    b.plain(r() < 0.5 ? "leafA" : "leafB", flat(r() < 0.5 ? "#5cc43e" : "#4fb236"), puff);
  }
};

const lamp = (b: Builder, x: number, z: number) => {
  const pole = new THREE.CylinderGeometry(0.12, 0.18, 6.5, 6);
  pole.translate(x, 3.25, z);
  b.plain("lampPole", flat("#2f4a3a"), pole);
  const arm = new THREE.BoxGeometry(2.4, 0.12, 0.12);
  arm.translate(x, 6.3, z);
  b.plain("lampPole", flat("#2f4a3a"), arm);
  for (const dx of [-1.15, 1.15]) {
    const globe = new THREE.SphereGeometry(0.42, 10, 8);
    globe.translate(x + dx, 6.75, z);
    b.plain("lampGlobe", () => new THREE.MeshStandardMaterial({ color: "#fffaf0", emissive: "#fff3d6", emissiveIntensity: 0.6 }), globe, false);
  }
};

export const buildCity = (): THREE.Group => {
  const b = new Builder();
  const r = rng(2026);

  // ── ground ────────────────────────────────────────────────────────────────
  const grass = grassTex().clone();
  grass.needsUpdate = true;
  grass.repeat.set(160, 160);
  const ground = new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2);
  b.plain("ground", std(grass), ground, false);

  const span = (GRID + 0.2) * PITCH;
  const roadSeg = (x0: number, z0: number, x1: number, z1: number) => {
    const alongZ = x0 === x1;
    const len = alongZ ? z1 - z0 : x1 - x0;
    if (len <= 0) return;
    const g = new THREE.PlaneGeometry(ROAD, len).rotateX(-Math.PI / 2);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / ROAD));
    if (!alongZ) g.rotateY(Math.PI / 2);
    g.translate((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    b.plain("road", std(roadTex()), g, false);
  };
  for (let k = -GRID; k <= GRID; k++) {
    const c = k * PITCH;
    if (k === 0) {
      roadSeg(c, -span, c, -PLAZA);
      roadSeg(c, PLAZA, c, span);
      roadSeg(-span, c, -PLAZA, c);
      roadSeg(PLAZA, c, span, c);
    } else {
      roadSeg(c, -span, c, span);
      roadSeg(-span, c, span, c);
    }
    for (let m = -GRID; m <= GRID; m++) {
      if (Math.abs(c) < PLAZA && Math.abs(m * PITCH) < PLAZA) continue;
      const sq = new THREE.PlaneGeometry(ROAD, ROAD).rotateX(-Math.PI / 2);
      sq.translate(c, 0.045, m * PITCH);
      b.plain("asphalt", std(asphaltTex()), sq, false);
    }
  }

  // plaza
  const plaza = new THREE.PlaneGeometry(2 * PLAZA, 2 * PLAZA).rotateX(-Math.PI / 2);
  plaza.translate(0, 0.06, 0);
  b.plain("plaza", std(plazaTex()), plaza, false);

  // ── blocks ────────────────────────────────────────────────────────────────
  for (let i = -GRID; i < GRID; i++) {
    for (let j = -GRID; j < GRID; j++) {
      const ring = ringOf(i, j);
      if (ring === 0) continue; // plaza
      const bx0 = i * PITCH + EDGE;
      const bx1 = (i + 1) * PITCH - EDGE;
      const bz0 = j * PITCH + EDGE;
      const bz1 = (j + 1) * PITCH - EDGE;
      const cx = (bx0 + bx1) / 2;
      const cz = (bz0 + bz1) / 2;
      const size = bx1 - bx0;

      // sidewalk slab
      const slab = new THREE.BoxGeometry(size + 2 * WALK, 0.3, size + 2 * WALK);
      const suv = slab.getAttribute("uv") as THREE.BufferAttribute;
      for (let q = 0; q < suv.count; q++) suv.setXY(q, suv.getX(q) * 10, suv.getY(q) * 10);
      slab.translate(cx, 0.15, cz);
      b.plain("sidewalk", std(sidewalkTex()), slab, false);
      const inner = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
      const iuv = inner.getAttribute("uv") as THREE.BufferAttribute;
      for (let q = 0; q < iuv.count; q++) iuv.setXY(q, iuv.getX(q) * 4, iuv.getY(q) * 4);
      inner.translate(cx, 0.32, cz);
      b.plain("lawn", std(grassTex()), inner, false);

      const suburb = ring >= 4 || j === -4 || j === -3;
      if (ring <= 2 && !suburb) {
        // pastel row houses on all four edges
        const row = (x0: number, z0: number, len: number, alongX: boolean, depth: number) => {
          let p = 0;
          while (p < len - 0.01) {
            let w = 7 + Math.floor(r() * 5);
            if (len - p - w < 7) w = len - p;
            const centre = p + w / 2;
            const bxC = alongX ? x0 + centre : x0;
            const bzC = alongX ? z0 : z0 + centre;
            const bw = alongX ? w : depth;
            const bd = alongX ? depth : w;
            let floors = 2 + Math.floor(r() * 4);
            let color = PASTELS[Math.floor(r() * PASTELS.length)];
            const style = [0, 1, 3][Math.floor(r() * 3)];
            const awn = AWNINGS[Math.floor(r() * AWNINGS.length)];
            // the shop the brothers climb is fixed
            if (Math.abs(bxC - (SHOP[0] - depth / 2)) < 0.6 && Math.abs(bzC - SHOP[2]) < 3) {
              floors = 2;
              color = "#ffe08a";
            }
            b.box(`shop-${color}-${awn}`, std(shopTex(color, awn)), null, null, bxC, 0.3, bzC, bw, SHOP_H, bd, 8, SHOP_H);
            b.box(
              `fac-${color}-${style}`,
              std(facadeTex(color, style)),
              "roof-flat",
              std(roofTex("#d9d4cc")),
              bxC,
              0.3 + SHOP_H,
              bzC,
              bw,
              floors * FLOOR,
              bd,
              6,
              FLOOR,
            );
            // cornice
            const top = 0.3 + SHOP_H + floors * FLOOR;
            const cor = new THREE.BoxGeometry(bw + 0.5, 0.7, bd + 0.5);
            cor.translate(bxC, top + 0.35, bzC);
            b.plain(`cornice-${r() < 0.5}`, flat(r() < 0.5 ? "#ffffff" : "#efe6da"), cor);
            if (r() < 0.35) {
              const ac = new THREE.BoxGeometry(2, 1.2, 1.6);
              ac.translate(bxC + (r() - 0.5) * 2, top + 1.3, bzC + (r() - 0.5) * 2);
              b.plain("ac", flat("#b8bcc4"), ac);
            }
            if (r() < 0.12) {
              const tank = new THREE.CylinderGeometry(1.3, 1.3, 2.4, 10);
              tank.translate(bxC, top + 2.4, bzC);
              b.plain("tank", flat("#8a5a3c"), tank);
            }
            p += w;
          }
        };
        const depth = 11;
        row(bx0, bz0 + depth / 2, size, true, depth);
        row(bx0, bz1 - depth / 2, size, true, depth);
        row(bx0 + depth / 2, bz0 + depth, size - 2 * depth, false, depth);
        row(bx1 - depth / 2, bz0 + depth, size - 2 * depth, false, depth);
        if (r() < 0.6) tree(b, cx, cz, 1.2, r);
      } else if (ring === 3 && !suburb) {
        // glass towers
        const n = r() < 0.5 ? 1 : 2;
        for (let k = 0; k < n; k++) {
          const w = n === 1 ? 20 : 13;
          const x = n === 1 ? cx : bx0 + 8 + k * 16;
          const z = n === 1 ? cz : cz + (k ? 6 : -6);
          const floors = 8 + Math.floor(r() * 10);
          const col = r() < 0.6 ? "#f4f7fb" : "#dbe9f7";
          b.box(`fac-${col}-2`, std(facadeTex(col, 2)), "roof-tower", std(roofTex("#c9ccd2")), x, 0.3, z, w, floors * FLOOR, w, 6, FLOOR);
          const cap = new THREE.BoxGeometry(w * 0.5, 2, w * 0.5);
          cap.translate(x, 0.3 + floors * FLOOR + 1, z);
          b.plain("ac", flat("#b8bcc4"), cap);
        }
        tree(b, bx1 - 3, bz1 - 3, 1, r);
        tree(b, bx0 + 3, bz1 - 3, 1, r);
      } else {
        // suburb: four hip-roofed houses and trees
        for (const [ox, oz] of [
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9],
        ]) {
          const col = PASTELS[Math.floor(r() * PASTELS.length)];
          const x = cx + ox;
          const z = cz + oz;
          b.box(`fac-${col}-3`, std(facadeTex(col, 3)), null, null, x, 0.3, z, 10, 6, 10, 6, 6);
          const roof = new THREE.ConeGeometry(8.2, 4, 4, 1).rotateY(Math.PI / 4);
          roof.translate(x, 6.3 + 2, z);
          const ruv = roof.getAttribute("uv") as THREE.BufferAttribute;
          for (let q = 0; q < ruv.count; q++) ruv.setXY(q, ruv.getX(q) * 4, ruv.getY(q) * 2);
          b.plain("tileroof", std(tileRoofTex(), "#ffffff", { flatShading: true }), roof);
        }
        tree(b, cx, cz, 1.1, r);
        tree(b, cx + 14, cz, 0.9, r);
      }
    }
  }

  // ── street furniture on the main street and around the plaza ───────────────
  for (let z = 50; z <= 245; z += 22) {
    lamp(b, 6.6, z);
    lamp(b, -6.6, z + 11);
  }
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    tree(b, Math.cos(ang) * 34, Math.sin(ang) * 34, 1.1, r);
  }
  // suburban street lamps and trees (bike scene)
  for (let x = -240; x <= 240; x += 30) {
    lamp(b, x, SUBURB_Z - 6.6);
    tree(b, x + 15, SUBURB_Z + 7.4, 0.9, r);
  }

  // ── far hills and trees beyond the town ───────────────────────────────────
  for (let k = 0; k < 40; k++) {
    const ang = (k / 40) * Math.PI * 2 + r() * 0.1;
    const rad = 650 + r() * 250;
    const h = 60 + r() * 120;
    const hill = new THREE.ConeGeometry(120 + r() * 80, h, 7, 1);
    hill.translate(Math.cos(ang) * rad, h / 2 - 2, Math.sin(ang) * rad);
    b.plain(k % 2 ? "hillA" : "hillB", flat(k % 2 ? "#7fb0c8" : "#8cbcd0"), hill, false);
  }
  for (let k = 0; k < 220; k++) {
    const ang = r() * Math.PI * 2;
    const rad = 290 + r() * 260;
    tree(b, Math.cos(ang) * rad, Math.sin(ang) * rad, 1 + r() * 1.2, r);
  }
  return b.build();
};

export const City: React.FC = () => {
  const group = useMemo(() => buildCity(), []);
  return <primitive object={group} />;
};
