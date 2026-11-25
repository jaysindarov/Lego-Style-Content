// Fast review stills: bundle once, then render every requested frame from the
// same bundle and browser. Called by tools/build.py stills.
//   node tools/stills.mjs <outDir> <scale> name:frame [name:frame ...]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const [outDir, scale, ...jobs] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), enableCaching: false });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: "Story", puppeteerInstance: browser });
for (const job of jobs) {
  const i = job.lastIndexOf(":");
  const name = job.slice(0, i);
  const frame = Number(job.slice(i + 1));
  await renderStill({
    composition,
    serveUrl,
    output: path.join(outDir, `${name}.jpg`),
    frame,
    scale: Number(scale),
    imageFormat: "jpeg",
    puppeteerInstance: browser,
    overwrite: true,
    chromiumOptions: { gl: "angle" },
  });
  process.stdout.write(".");
}
await browser.close({ silent: true });
console.log(`\n${jobs.length} stills`);
