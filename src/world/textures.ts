/**
 * Every texture is drawn once to a canvas, procedurally, with a seeded RNG,
 * so the city looks the same on every frame and every render.
 */
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const cache = new Map<string, THREE.Texture>();

export const canvasTex = (
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: boolean; srgb?: boolean; nearest?: boolean } = {},
): THREE.Texture => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.nearest) t.magFilter = THREE.NearestFilter;
  cache.set(key, t);
  return t;
};

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return `#${c.getHexString()}`;
};

const glass = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tint = "#9fd3ff") => {
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, shade(tint, 0.12));
  gr.addColorStop(0.5, tint);
  gr.addColorStop(1, shade(tint, -0.18));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  // diagonal sheen
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.beginPath();
  g.moveTo(x + w * 0.15, y + h);
  g.lineTo(x + w * 0.45, y);
  g.lineTo(x + w * 0.62, y);
  g.lineTo(x + w * 0.32, y + h);
  g.fill();
  g.restore();
};

/** One window bay of one floor: tiles across a facade with world-space UVs. */
export const facadeTex = (base: string, style: number) =>
  canvasTex(`facade-${base}-${style}`, 256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rng(base.length * 31 + style * 7);
    // subtle plaster noise
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.035})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 3);
    }
    // floor band
    g.fillStyle = shade(base, 0.1);
    g.fillRect(0, h - 18, w, 18);
    g.fillStyle = shade(base, -0.12);
    g.fillRect(0, h - 20, w, 3);
    if (style === 0) {
      // tall arched-top window with white frame and sill
      g.fillStyle = "#ffffff";
      g.fillRect(70, 40, 116, 160);
      glass(g, 82, 52, 92, 136);
      g.fillStyle = "#ffffff";
      g.fillRect(124, 52, 8, 136);
      g.fillRect(82, 110, 92, 7);
      g.fillStyle = shade(base, -0.2);
      g.fillRect(62, 198, 132, 12);
    } else if (style === 1) {
      // balcony window with flower box
      g.fillStyle = "#ffffff";
      g.fillRect(66, 36, 124, 150);
      glass(g, 78, 48, 100, 126, "#a8dcff");
      g.fillStyle = "#ffffff";
      g.fillRect(124, 48, 7, 126);
      g.fillStyle = "#6b4a2f";
      g.fillRect(60, 186, 136, 20);
      const flowers = ["#ff5d8f", "#ffd23f", "#ff8a3d", "#ffffff"];
      for (let i = 0; i < 9; i++) {
        g.fillStyle = "#3f9b3a";
        g.fillRect(64 + i * 14, 176, 12, 12);
        g.fillStyle = flowers[i % 4];
        g.fillRect(66 + i * 14, 172, 8, 8);
      }
    } else if (style === 2) {
      // modern tower: wide glass strip
      g.fillStyle = shade(base, -0.05);
      g.fillRect(0, 30, w, 170);
      glass(g, 10, 40, 236, 150, "#7fc4f5");
      g.fillStyle = shade(base, 0.08);
      for (let x = 0; x < w; x += 64) g.fillRect(x, 40, 6, 150);
    } else {
      // two small square windows with shutters
      for (const x0 of [34, 142]) {
        g.fillStyle = "#ffffff";
        g.fillRect(x0, 60, 80, 110);
        glass(g, x0 + 8, 68, 64, 94);
        g.fillStyle = shade(base, -0.28);
        g.fillRect(x0 - 16, 60, 14, 110);
        g.fillRect(x0 + 82, 60, 14, 110);
      }
    }
  });

/** Ground-floor shop front bay: big glass, door, awning band. */
export const shopTex = (base: string, awning: string) =>
  canvasTex(`shop-${base}-${awning}`, 256, 256, (g, w, h) => {
    g.fillStyle = shade(base, -0.05);
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3b3b45";
    g.fillRect(14, 70, 228, 186);
    glass(g, 22, 78, 212, 178, "#b9e2ff");
    // shelves inside
    g.fillStyle = "rgba(255,190,120,0.35)";
    for (let y = 120; y < 250; y += 40) g.fillRect(30, y, 196, 6);
    // awning stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#ffffff" : awning;
      g.fillRect(i * 32, 20, 32, 46);
    }
    g.fillStyle = "rgba(0,0,0,0.15)";
    g.fillRect(0, 60, w, 8);
  });

export const roofTex = (base: string) =>
  canvasTex(`roof-${base}`, 128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rng(99);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      g.fillRect(r() * w, r() * h, 3, 3);
    }
  });

export const tileRoofTex = () =>
  canvasTex("tileroof", 128, 128, (g, w, h) => {
    g.fillStyle = "#c4433a";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = "#a8352e";
      g.fillRect(0, y + 12, w, 4);
      for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) {
        g.fillStyle = "rgba(0,0,0,0.12)";
        g.fillRect(x, y, 2, 14);
      }
    }
  });

export const brickTex = () =>
  canvasTex("brick", 256, 256, (g, w, h) => {
    g.fillStyle = "#c98a6a";
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let y = 0; y < h; y += 16) {
      for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
        const k = r() * 0.12 - 0.06;
        g.fillStyle = shade("#c47a58", k);
        g.fillRect(x + 1, y + 1, 30, 14);
      }
    }
  });

export const grassTex = () =>
  canvasTex("grass", 256, 256, (g, w, h) => {
    g.fillStyle = "#6fcf4a";
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(60,150,40,0.25)" : "rgba(160,230,110,0.25)";
      g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4);
    }
  });

export const asphaltTex = () =>
  canvasTex("asphalt", 256, 256, (g, w, h) => {
    g.fillStyle = "#4a4a52";
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},255,${r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });

/** Road strip, 1 tile = 10 units wide x 10 long: edge lines and a double yellow centre. */
export const roadTex = () =>
  canvasTex("road", 256, 256, (g, w, h) => {
    g.drawImage(asphaltTex().image as HTMLCanvasElement, 0, 0);
    g.fillStyle = "#f3f3f3";
    g.fillRect(14, 0, 6, h);
    g.fillRect(w - 20, 0, 6, h);
    g.fillStyle = "#f2c230";
    g.fillRect(w / 2 - 9, 0, 6, h);
    g.fillRect(w / 2 + 3, 0, 6, h);
  });

export const sidewalkTex = () =>
  canvasTex("sidewalk", 128, 128, (g, w, h) => {
    g.fillStyle = "#e9e3dc";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#cfc7bd";
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32, h);
      g.moveTo(0, i * 32);
      g.lineTo(w, i * 32);
      g.stroke();
    }
  });

export const plazaTex = () =>
  canvasTex("plaza", 1024, 1024, (g, w, h) => {
    g.fillStyle = "#f1e6d8";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e0d2c1";
    g.lineWidth = 2;
    for (let i = 0; i < w; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, h);
      g.moveTo(0, i);
      g.lineTo(w, i);
      g.stroke();
    }
    g.strokeStyle = "#d77a5b";
    g.lineWidth = 34;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#e9a184";
    g.lineWidth = 10;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
    g.stroke();
  });

/** Classic blocky avatar face on skin. */
export const faceTex = (skin: string, mood: "smile" | "scared" | "shout" | "worried" | "happy" | "grin") =>
  canvasTex(`face-${skin}-${mood}`, 128, 128, (g, w, h) => {
    g.fillStyle = skin;
    g.fillRect(0, 0, w, h);
    if (mood === "grin") {
      // an echo's face: hollow black eyes and a smile far too wide
      g.fillStyle = "#050505";
      g.beginPath();
      g.ellipse(40, 52, 9, 11, 0, 0, Math.PI * 2);
      g.ellipse(88, 52, 9, 11, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e9e9e9";
      g.fillRect(39, 51, 2, 2);
      g.fillRect(87, 51, 2, 2);
      g.fillStyle = "#120606";
      g.beginPath();
      g.moveTo(8, 70);
      g.quadraticCurveTo(64, 82, 120, 70);
      g.quadraticCurveTo(64, 128, 8, 70);
      g.fill();
      g.fillStyle = "#f4f1e6";
      for (let i = 0; i < 11; i++) {
        const x = 16 + i * 9;
        const y = 72 + Math.sin((i / 10) * Math.PI) * 6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 8, y);
        g.lineTo(x + 4, y + 8);
        g.fill();
      }
      return;
    }
    g.fillStyle = "#1b1b1b";
    const eyeH = mood === "scared" || mood === "shout" ? 22 : 16;
    g.beginPath();
    g.ellipse(42, 56, 6, eyeH / 2, 0, 0, Math.PI * 2);
    g.ellipse(86, 56, 6, eyeH / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.fillRect(41, 50, 3, 4);
    g.fillRect(85, 50, 3, 4);
    // brows
    g.strokeStyle = "#3a2a1a";
    g.lineWidth = 4;
    g.beginPath();
    if (mood === "worried" || mood === "scared") {
      g.moveTo(32, 40);
      g.lineTo(50, 34);
      g.moveTo(96, 40);
      g.lineTo(78, 34);
    } else {
      g.moveTo(34, 38);
      g.lineTo(50, 37);
      g.moveTo(78, 37);
      g.lineTo(94, 38);
    }
    g.stroke();
    g.strokeStyle = "#1b1b1b";
    g.fillStyle = "#3b1414";
    g.lineWidth = 4;
    g.beginPath();
    if (mood === "smile") {
      g.arc(64, 74, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    } else if (mood === "happy") {
      g.arc(64, 76, 18, 0, Math.PI);
      g.fill();
    } else if (mood === "shout" || mood === "scared") {
      g.ellipse(64, 92, 11, mood === "shout" ? 14 : 9, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.moveTo(52, 92);
      g.lineTo(76, 90);
      g.stroke();
    }
  });

/** A living shadow's face: black, two glowing eyes and a thin wide grin. */
export const shadowFaceTex = () =>
  canvasTex("face-shadow", 128, 128, (g, w, h) => {
    g.fillStyle = "#07060b";
    g.fillRect(0, 0, w, h);
    g.shadowColor = "#fff6c8";
    g.shadowBlur = 14;
    g.fillStyle = "#fffbe6";
    g.beginPath();
    g.ellipse(40, 54, 10, 15, -0.25, 0, Math.PI * 2);
    g.ellipse(88, 54, 10, 15, 0.25, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#fffbe6";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(26, 84);
    g.quadraticCurveTo(64, 112, 102, 84);
    g.stroke();
  });

/** Torso front: open jacket over a shirt, or a hoodie with a pocket. */
export const torsoTex = (jacket: string, shirt: string, kind: "jacket" | "hoodie" | "tee" | "dress") =>
  canvasTex(`torso-${jacket}-${shirt}-${kind}`, 128, 128, (g, w, h) => {
    g.fillStyle = jacket;
    g.fillRect(0, 0, w, h);
    if (kind === "jacket") {
      g.fillStyle = shirt;
      g.fillRect(40, 0, 48, h);
      g.fillStyle = shade(jacket, -0.12);
      g.fillRect(36, 0, 6, h);
      g.fillRect(86, 0, 6, h);
      g.fillStyle = shade(jacket, -0.15);
      g.fillRect(0, h - 14, w, 14);
    } else if (kind === "hoodie") {
      g.fillStyle = shade(jacket, -0.12);
      g.fillRect(30, 76, 68, 36);
      g.fillStyle = shade(jacket, 0.08);
      g.fillRect(34, 80, 60, 3);
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(54, 0);
      g.lineTo(54, 30);
      g.moveTo(74, 0);
      g.lineTo(74, 30);
      g.stroke();
    } else if (kind === "dress") {
      g.fillStyle = shade(jacket, 0.15);
      for (let i = 0; i < 30; i++) g.fillRect((i * 37) % w, (i * 53) % h, 8, 8);
    } else {
      g.fillStyle = shade(jacket, -0.1);
      g.fillRect(44, 0, 40, 10);
    }
  });

/** Clock face for the tower. */
export const clockTex = () =>
  canvasTex("clock", 256, 256, (g, w, h) => {
    g.fillStyle = "#3b2a20";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f7efdc";
    g.beginPath();
    g.arc(128, 128, 112, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#c9a24a";
    g.lineWidth = 10;
    g.stroke();
    g.fillStyle = "#2a2a2a";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
      g.rotate(a);
      g.fillRect(-4, -10, 8, 20);
      g.restore();
    }
  }, { repeat: false });

/** Worm skin: dark violet hide with glowing green veins (separate emissive map). */
export const wormSkin = (glow: boolean) =>
  canvasTex(`worm-${glow}`, 512, 512, (g, w, h) => {
    g.fillStyle = glow ? "#000000" : "#3a2346";
    g.fillRect(0, 0, w, h);
    const r = rng(77);
    if (!glow) {
      for (let i = 0; i < 900; i++) {
        const s = 6 + r() * 26;
        g.fillStyle = `rgba(${60 + r() * 40},${30 + r() * 25},${70 + r() * 40},0.5)`;
        g.beginPath();
        g.ellipse(r() * w, r() * h, s, s * 0.6, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = glow ? "#9dff4a" : "#4a7a2a";
    if (!glow) {
      for (let y = 0; y < h; y += 64) {
        g.fillStyle = "rgba(15,6,20,0.75)";
        g.fillRect(0, y, w, 12);
        g.fillStyle = "rgba(120,80,140,0.25)";
        g.fillRect(0, y + 12, w, 6);
      }
    }
    for (let k = 0; k < 20; k++) {
      g.lineWidth = glow ? 3 + r() * 4 : 2;
      let x = r() * w;
      let y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 8; s++) {
        x += (r() - 0.5) * 70;
        y += (r() - 0.5) * 70;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });

/** A jagged crack decal with transparent surroundings. */
export const crackTex = () =>
  canvasTex("crack", 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = rng(41);
    g.translate(w / 2, h / 2);
    // dark pit
    g.fillStyle = "#0b0805";
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rad = 150 + r() * 50;
      g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.fill();
    // radiating fissures
    g.strokeStyle = "#1a120c";
    for (let k = 0; k < 18; k++) {
      const a = r() * Math.PI * 2;
      let x = Math.cos(a) * 150;
      let y = Math.sin(a) * 150;
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += Math.cos(a + (r() - 0.5)) * 22;
        y += Math.sin(a + (r() - 0.5)) * 22;
        g.lineWidth = 10 - s * 2;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // green glow ring at the lip
    const gr = g.createRadialGradient(0, 0, 60, 0, 0, 175);
    gr.addColorStop(0, "rgba(120,255,60,0.35)");
    gr.addColorStop(1, "rgba(120,255,60,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 175, 0, Math.PI * 2);
    g.fill();
  }, { repeat: false });

export const signTex = (text: string, bg: string, fg: string) =>
  canvasTex(`sign-${text}-${bg}`, 512, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = "bold 84px Rounded, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 4);
  }, { repeat: false });

export const puffTex = () =>
  canvasTex("puff", 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.5)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, { repeat: false });
