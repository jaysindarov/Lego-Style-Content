/**
 * Reel cover: one frozen 3D frame from the story (COVER.frame) plus a big
 * outlined title, kept inside the 4:5 profile-grid crop (y 285..1635).
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";

import { H, LAND, W, World } from "./Story";
import { COVER } from "../generated/current";

const outline = (size: number): React.CSSProperties => ({
  fontFamily: "Rounded",
  fontSize: size,
  lineHeight: 1.02,
  textAlign: "center",
  WebkitTextStroke: `${Math.round(size * 0.17)}px #000`,
  paintOrder: "stroke fill",
  filter: "drop-shadow(0px 10px 0px rgba(0,0,0,0.9))",
  whiteSpace: "pre-line",
  letterSpacing: 2,
});

export const Cover: React.FC<{ lang: string }> = ({ lang }) => {
  const t = COVER.titles[lang] ?? Object.values(COVER.titles)[0];
  const frame = COVER.frame;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas
        width={W}
        height={H}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08, preserveDrawingBuffer: true }}
        camera={{ fov: 60, near: 0.1, far: 4000, position: [0, 50, 100] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <World f={frame} t={2.4} lt={1.3} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: LAND ? 50 : 300, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ ...outline(LAND ? 128 : 118), color: "#fff35c" }}>{t.top}</div>
      </div>
      <div style={{ position: "absolute", top: LAND ? 860 : 1478, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            ...outline(LAND ? 120 : 104),
            color: (COVER as { accent?: string }).accent ?? "#9dff4a",
            transform: "rotate(-3deg)",
          }}
        >
          {t.bottom}
        </div>
      </div>
    </AbsoluteFill>
  );
};
