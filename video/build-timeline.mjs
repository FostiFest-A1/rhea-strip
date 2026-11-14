// Converts recorded clips to mp4, copies audio, and writes src/timeline.json.
// Usage: node build-timeline.mjs
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const LEAD = 0.35;
const TAIL = 0.6;
const END_CARD_TAIL = 2.6;

const LABELS = [
  ["c01", "s01", "The problem"],
  ["c02", "s02", "What is mocked"],
  ["c03", "s03", "Connect"],
  ["c04", "s04", "Strip"],
  ["c05", "s05", "Sell future yield"],
  ["c06", "s06", "A buyer"],
  ["c07", "s07", "Portfolio"],
  ["c08", "s08", "Settle"],
  ["c09", "s09", "Rhea Strip"],
];

const narration = readFileSync(join(here, "..", "docs", "demo", "video-narration.md"), "utf8");
const texts = Object.fromEntries(
  [...narration.matchAll(/^## (s\d\d)[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map((m) => [m[1], m[2].trim().replace(/\s+/g, " ")]),
);

const probe = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());

mkdirSync(join(here, "public", "clips"), { recursive: true });
mkdirSync(join(here, "public", "audio"), { recursive: true });

const scenes = [];
for (const [clip, voice, label] of LABELS) {
  const webm = join(here, "clips", `${clip}.webm`);
  const mp3 = join(here, "audio", `${voice}.mp3`);
  if (!existsSync(webm)) {
    if (process.argv.includes("--partial")) continue;
    throw new Error(`missing ${webm}`);
  }
  if (!existsSync(mp3)) throw new Error(`missing ${mp3}`);
  const mp4 = join(here, "public", "clips", `${clip}.mp4`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", webm, "-r", String(FPS), "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", mp4]);
  copyFileSync(mp3, join(here, "public", "audio", `${voice}.mp3`));
  const meta = existsSync(join(here, "clips", `${clip}.json`)) ? JSON.parse(readFileSync(join(here, "clips", `${clip}.json`), "utf8")) : { marks: [] };
  const audioSec = probe(mp3);
  const clipSec = probe(mp4);
  const text = texts[voice];
  if (!text) throw new Error(`no narration for ${voice}`);
  const tail = clip === "c09" ? END_CARD_TAIL : TAIL;
  scenes.push({
    id: clip,
    label,
    index: LABELS.findIndex((l) => l[0] === clip) + 1,
    audio: `audio/${voice}.mp3`,
    audioSec,
    clip: `clips/${clip}.mp4`,
    clipSec,
    marks: meta.marks,
    text,
    lead: LEAD,
    tail,
    frames: Math.round((LEAD + audioSec + tail) * FPS),
  });
}
const out = { fps: FPS, scenes, totalFrames: scenes.reduce((n, s) => n + s.frames, 0) };
writeFileSync(join(here, "src", "timeline.json"), JSON.stringify(out, null, 2));
console.log(`timeline: ${scenes.length} scenes, ${(out.totalFrames / FPS).toFixed(1)}s`);
