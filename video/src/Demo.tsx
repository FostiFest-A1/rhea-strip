import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { planSegments, sentencesOf, type SceneData } from "./plan";
import timeline from "./timeline.json";

const { fontFamily: serif } = loadSerif("italic", { weights: ["400"] });
const FPS = timeline.fps;
const INK = "#05060b";
const PINK = "#FE3D70";
const ICE = "#B3F4FF";
const SANS = "Satoshi, system-ui, sans-serif";

const WIN = { w: 1472, h: 828, x: 224, y: 34 };

function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      ["Satoshi", "Satoshi-Regular.woff2", "400"],
      ["Satoshi", "Satoshi-Medium.woff2", "500"],
      ["Satoshi", "Satoshi-Bold.woff2", "700"],
    ].map(([family, file, weight]) => new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight }));
    Promise.all(faces.map((f) => f.load()))
      .then((loaded) => loaded.forEach((f) => (document.fonts as unknown as { add(face: FontFace): void }).add(f)))
      .finally(() => continueRender(handle));
  }, [handle]);
}

const Backdrop = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -260 + Math.sin(t / 6) * 60,
          top: -520 + Math.cos(t / 7) * 40,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ICE}30 0%, transparent 65%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          right: -380 + Math.cos(t / 5) * 70,
          bottom: -700 + Math.sin(t / 6) * 50,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${PINK}3d 0%, transparent 65%)`,
          filter: "blur(50px)",
        }}
      />
    </AbsoluteFill>
  );
};

const Tinted = ({ text }: { text: string }) => {
  const parts = text.split(/(\bPT\b|\bYT\b)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "PT" ? (
          <span key={i} style={{ color: ICE }}>
            PT
          </span>
        ) : part === "YT" ? (
          <span key={i} style={{ color: PINK }}>
            YT
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};

const Captions = ({ scene }: { scene: SceneData }) => {
  const frame = useCurrentFrame();
  const sentences = sentencesOf(scene.text);
  const total = sentences.reduce((n, s) => n + s.length, 0);
  const start = scene.lead * FPS;
  const span = scene.audioSec * FPS;
  let acc = 0;
  const windows = sentences.map((s) => {
    const from = start + (acc / total) * span;
    acc += s.length;
    return { s, from, to: start + (acc / total) * span };
  });
  const active = windows.find((w) => frame >= w.from - 2 && frame < w.to) ?? (frame < start ? windows[0] : windows[windows.length - 1]);
  if (!active) return null;
  const local = frame - active.from;
  const opacity = frame < start - 2 ? 0 : interpolate(local, [-2, 6, active.to - active.from - 6, active.to - active.from], [0, 1, 1, 0.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(local, [-2, 8], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 936,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <p
        style={{
          margin: 0,
          maxWidth: 1420,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 38,
          lineHeight: "50px",
          letterSpacing: "-0.01em",
          color: "#ffffffee",
        }}
      >
        <Tinted text={active.s} />
      </p>
    </div>
  );
};

const SceneVideo = ({ scene }: { scene: SceneData }) => {
  const sceneSec = scene.frames / FPS;
  const { segments, freezeAt } = planSegments(scene, sceneSec);
  let at = 0;
  const nodes = segments.map((seg, i) => {
    const frames = Math.max(1, Math.ceil(((seg.to - seg.from) / seg.rate) * FPS));
    const from = at;
    at += frames;
    return (
      <Sequence key={i} from={from} durationInFrames={frames} layout="none">
        <OffthreadVideo
          src={staticFile(scene.clip)}
          startFrom={Math.round(seg.from * FPS)}
          endAt={Math.round(seg.to * FPS)}
          playbackRate={seg.rate}
          muted
          style={{ width: WIN.w, height: WIN.h, objectFit: "cover" }}
        />
      </Sequence>
    );
  });
  if (freezeAt !== null && at < scene.frames) {
    const last = Math.max(0, Math.round(freezeAt * FPS) - 1);
    nodes.push(
      <Sequence key="freeze" from={at} durationInFrames={scene.frames - at} layout="none">
        <Freeze frame={0}>
          <OffthreadVideo src={staticFile(scene.clip)} startFrom={last} endAt={last + 1} muted style={{ width: WIN.w, height: WIN.h, objectFit: "cover" }} />
        </Freeze>
      </Sequence>,
    );
  }
  return <>{nodes}</>;
};

const EndCard = ({ scene }: { scene: SceneData }) => {
  const frame = useCurrentFrame();
  const appear = (scene.lead + scene.audioSec - 0.4) * FPS;
  const o = interpolate(frame, [appear, appear + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `${INK}f2`, opacity: o, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: 70, height: 28, borderRadius: 14, background: ICE }} />
          <div style={{ width: 70, height: 28, borderRadius: 14, background: PINK }} />
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 120, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 }}>
          Rhea <span style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 400, color: PINK }}>Strip</span>
        </div>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, color: "#ffffffcc", letterSpacing: "-0.01em" }}>
        Split yield from principal. Trade either side.
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        {["NEAR testnet", "Mock yield", "Not audited", "MIT licensed"].map((t) => (
          <div key={t} style={{ fontFamily: SANS, fontWeight: 500, fontSize: 24, color: "#fff", padding: "10px 24px", borderRadius: 999, background: "#ffffff1a" }}>
            {t}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Scene = ({ scene }: { scene: SceneData }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 9], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [scene.frames - 8, scene.frames], [1, 0], { extrapolateLeft: "clamp" });
  const last = scene.id === "c09";
  const opacity = Math.min(fadeIn, last ? 1 : fadeOut);
  const scale = interpolate(frame, [0, 14], [0.985, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h,
          borderRadius: 22,
          overflow: "hidden",
          opacity,
          transform: `scale(${scale})`,
          boxShadow: "0 40px 120px #000000cc, 0 0 0 1px #ffffff1f",
          background: "#000",
        }}
      >
        <SceneVideo scene={scene} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 892,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: PINK,
          opacity,
        }}
      >
        {String(scene.index).padStart(2, "0")} · {scene.label}
      </div>
      <Captions scene={scene} />
      <Sequence from={Math.round(scene.lead * FPS)} layout="none">
        <Audio src={staticFile(scene.audio)} />
      </Sequence>
      {last ? <EndCard scene={scene} /> : null}
    </AbsoluteFill>
  );
};

const Chrome = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", left: 48, bottom: 34, fontFamily: SANS, fontWeight: 700, fontSize: 22, color: "#ffffffb3", letterSpacing: "-0.02em" }}>
        Rhea <span style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 400, color: PINK }}>Strip</span>
      </div>
      <div style={{ position: "absolute", right: 48, bottom: 34, fontFamily: SANS, fontWeight: 500, fontSize: 18, color: "#ffffff8c" }}>
        NEAR testnet · mock yield · not audited
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${(frame / timeline.totalFrames) * 100}%`, background: PINK }} />
    </>
  );
};

export const Demo = () => {
  useFonts();
  let at = 0;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Backdrop />
      {timeline.scenes.map((scene) => {
        const from = at;
        at += scene.frames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.frames}>
            <Scene scene={scene as SceneData} />
          </Sequence>
        );
      })}
      <Chrome />
    </AbsoluteFill>
  );
};
