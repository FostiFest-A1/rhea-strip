export type Mark = { label: string; t: number };
export type SceneData = {
  id: string;
  label: string;
  index: number;
  audio: string;
  audioSec: number;
  clip: string;
  clipSec: number;
  marks: Mark[];
  text: string;
  lead: number;
  tail: number;
  frames: number;
};

export type Segment = { from: number; to: number; rate: number; kind: "play" | "wait" };

const MAX_WAIT_RATE = 14;
const MAX_PLAY_RATE = 1.7;

/** Fit a recorded clip to its scene length: keep actions near real time, fast-forward the waiting for transactions. */
export function planSegments(scene: SceneData, sceneSec: number): { segments: Segment[]; freezeAt: number | null } {
  const end = scene.clipSec - 0.05;
  const raw: { from: number; to: number; kind: "play" | "wait" }[] = [];
  let cursor = 0;
  const marks = scene.marks.filter((m) => m.t < end);
  for (let i = 0; i < marks.length; i += 1) {
    const mark = marks[i];
    if (!mark || mark.label !== "ws") continue;
    const next = marks[i + 1];
    const stop = next && next.label === "we" ? next.t : null;
    if (stop === null) continue;
    if (mark.t > cursor) raw.push({ from: cursor, to: mark.t, kind: "play" });
    raw.push({ from: mark.t, to: stop, kind: "wait" });
    cursor = stop;
  }
  if (cursor < end) raw.push({ from: cursor, to: end, kind: "play" });

  const play = raw.filter((s) => s.kind === "play").reduce((n, s) => n + (s.to - s.from), 0);
  const wait = raw.filter((s) => s.kind === "wait").reduce((n, s) => n + (s.to - s.from), 0);

  let playRate = 1;
  let waitRate = 1;
  if (play + wait <= sceneSec) {
    playRate = Math.max(0.85, (play + wait) / sceneSec);
    waitRate = playRate;
  } else if (wait > 0 && play + wait / MAX_WAIT_RATE <= sceneSec) {
    waitRate = wait / (sceneSec - play);
  } else if (wait > 0) {
    waitRate = MAX_WAIT_RATE;
    playRate = Math.min(MAX_PLAY_RATE, play / Math.max(0.5, sceneSec - wait / MAX_WAIT_RATE));
  } else {
    playRate = Math.min(MAX_PLAY_RATE, play / sceneSec);
  }

  const segments: Segment[] = [];
  let used = 0;
  for (const s of raw) {
    const rate = s.kind === "wait" ? waitRate : playRate;
    const remaining = sceneSec - used;
    if (remaining <= 0.05) break;
    const length = (s.to - s.from) / rate;
    if (length > remaining) {
      segments.push({ from: s.from, to: s.from + remaining * rate, rate, kind: s.kind });
      used = sceneSec;
      break;
    }
    segments.push({ ...s, rate });
    used += length;
  }
  const freezeAt = used < sceneSec - 0.05 ? end : null;
  return { segments, freezeAt };
}

export function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?:])\s+/).filter(Boolean);
}
