import { Composition } from "remotion";
import { Demo } from "./Demo";
import timeline from "./timeline.json";

export const RemotionRoot = () => (
  <Composition
    id="Demo"
    component={Demo}
    width={1920}
    height={1080}
    fps={timeline.fps}
    durationInFrames={timeline.totalFrames}
  />
);
