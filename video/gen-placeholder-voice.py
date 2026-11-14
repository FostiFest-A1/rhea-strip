"""Placeholder narration via edge-tts (ElevenLabs was blocked by email verification).
Writes video/audio/sNN.mp3 from docs/demo/video-narration.md. Replace the files with ElevenLabs output and re-render."""
import asyncio, re, pathlib, edge_tts

root = pathlib.Path(__file__).resolve().parent.parent
text = (root / "docs/demo/video-narration.md").read_text()
parts = re.findall(r"^## (s\d\d)[^\n]*\n(.*?)(?=^## |\Z)", text, flags=re.S | re.M)
out = root / "video/audio"
out.mkdir(parents=True, exist_ok=True)

async def main():
    for sid, body in parts:
        line = " ".join(body.strip().split())
        for attempt in range(6):
            try:
                await edge_tts.Communicate(line, "en-US-AndrewNeural", rate="-4%").save(str(out / f"{sid}.mp3"))
                break
            except Exception as error:
                print(sid, "retry", attempt + 1, type(error).__name__)
                await asyncio.sleep(2 * (attempt + 1))
        else:
            raise SystemExit(f"{sid} failed")
        print(sid, len(line), "chars")

asyncio.run(main())
