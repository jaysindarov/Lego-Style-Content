/**
 * Channel art for the "Untold Stories" YouTube channel, rendered with the same
 * town and characters as the reels:
 *   ChannelBanner  2560x1440  (title kept inside the 1235x338 all-device safe area)
 *   ChannelAvatar   800x800   (the hero's face; YouTube crops it to a circle)
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";

import { World } from "./Story";
import type { Frame } from "./kit";
import { LOOKS } from "../world/Avatar";
import { LIGHTHOUSE } from "../world/layout";

export const BANNER_W = 2560;
export const BANNER_H = 1440;
export const AVATAR_S = 800;

const [LX, , LZ] = LIGHTHOUSE;

const bannerFrame: Frame = {
  palette: "red",
  cam: { pos: [40, 58, 72], look: [-8, 26, -70], fov: 46 },
  evil: 0.55,
  fog: 0,
  dusk: 0.5,
  lamp: { on: 0.7, aim: [LX + 120, 40, LZ - 200] },
  giants: [{ at: [-115, -330], yaw: 0.37, t: 1, scale: 3.2, y: -40, head: 0.2 }],
  actors: [
    { look: LOOKS.hero, anim: "lookup", at: [14, 0.06, 30], yaw: Math.PI + 0.5, t: 0.3, mood: "worried" },
    { look: LOOKS.kid, anim: "point", at: [16, 0.06, 31], yaw: Math.PI + 0.6, t: 0.3, scale: 0.5, mood: "scared" },
  ],
  focus: [0, 0, 0],
};

const avatarFrame: Frame = {
  cam: { pos: [10.25, 3.05, 9.3], look: [10, 2.9, 5], fov: 24 },
  evil: 0,
  fog: 0,
  dusk: 0.35,
  actors: [{ look: LOOKS.hero, anim: "idle", at: [10, 0.06, 5], yaw: 0.05, t: 0, mood: "smile" }],
  focus: [10, 0, 5],
};

const outline = (size: number, stroke: number): React.CSSProperties => ({
  fontFamily: "Rounded",
  fontSize: size,
  lineHeight: 1,
  textAlign: "center",
  WebkitTextStroke: `${stroke}px #000`,
  paintOrder: "stroke fill",
  filter: `drop-shadow(0px ${Math.round(stroke * 0.7)}px 0px rgba(0,0,0,0.9))`,
  letterSpacing: 3,
  whiteSpace: "nowrap",
});

const Scene: React.FC<{ f: Frame; w: number; h: number }> = ({ f, w, h }) => (
  <ThreeCanvas
    width={w}
    height={h}
    shadows
    gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
    camera={{ fov: 50, near: 0.1, far: 4000, position: [0, 50, 100] }}
    style={{ position: "absolute", inset: 0 }}
  >
    <World f={f} t={2.4} lt={1.3} />
  </ThreeCanvas>
);

export const ChannelBanner: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Scene f={bannerFrame} w={BANNER_W} h={BANNER_H} />
    {/* darken the middle band so the title reads on any part of the scene */}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0) 70%)" }} />
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
      <div style={{ ...outline(124, 20), color: "#fff35c" }}>UNTOLD STORIES</div>
      <div style={{ ...outline(46, 10), color: "#ffffff", letterSpacing: 4 }}>STORIES NOBODY HAS TOLD YOU</div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const ChannelAvatar: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Scene f={avatarFrame} w={AVATAR_S} h={AVATAR_S} />
  </AbsoluteFill>
);
