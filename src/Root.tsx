import React from "react";
import { Composition, continueRender, delayRender, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

import { DURATION_FRAMES, FPS, H, Story, W } from "./engine/Story";
import { Cover } from "./engine/Cover";
import { LANG } from "./generated/current";

// Captions and titles must never fall back to another font.
const handle = delayRender("font");
loadFont({ family: "Rounded", url: staticFile("Rounded.ttf") })
  .then(() => continueRender(handle))
  .catch((e: unknown) => {
    throw new Error(`font failed: ${String(e)}`);
  });

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Story" component={Story} width={W} height={H} fps={FPS} durationInFrames={DURATION_FRAMES} />
    <Composition id="Cover" component={Cover} width={W} height={H} fps={FPS} durationInFrames={1} defaultProps={{ lang: LANG }} />
  </>
);
