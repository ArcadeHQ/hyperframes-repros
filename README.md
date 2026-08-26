# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/video-source` | `<video>` with only a child `<source src>` — preview plays, render skips extract/mix |

## `patch/video-source`

Same 2s clip in two panes. Magenta 0–1s, cyan 1–2s, 440 Hz tone at −21.5 dB.

- Left: parent `src` (control, muted)
- Right: `<source src="assets/clip.mp4">` only — no parent `src`, audible (`data-has-audio="true"`)

Legal HTML. Live preview uses `currentSrc` and plays both. Engine extract/mix select `video[src]` / `audio[src]`, so the right pane is never extracted or mixed.

`hyperframes snapshot` looks fine (browser decodes `<source>`). The gap is export.

Pin: `hyperframes@0.8.14` (also fails on `@latest`).

### Expected

- `t=0.3s`: both panes magenta
- `t=1.5s`: both panes cyan
- Output has an audio stream (~440 Hz)

### Actual (0.8.14)

- `t=0.3s`: left magenta; **right black**
- `t=1.5s`: left cyan; **right still black**
- `ffprobe`: video stream only — **no audio**
- Compile telemetry: `videoCount: 1, audioCount: 0` with `authoredTimedClipCount: 3`
- `check` / lint: `media_missing_src` on `#source-only`, fix-hint says the renderer requires parent `src`

See `snapshots/frame-00-at-0.3s.png` and `snapshots/frame-01-at-1.5s.png` (grabbed from the rendered MP4).

### Reproduce

```bash
git checkout patch/video-source
npx hyperframes@latest check
npx hyperframes@latest render --output renders/source-only.mp4
ffmpeg -y -ss 0.3 -i renders/source-only.mp4 -frames:v 1 snapshots/frame-00-at-0.3s.png
ffmpeg -y -ss 1.5 -i renders/source-only.mp4 -frames:v 1 snapshots/frame-01-at-1.5s.png
ffprobe -hide_banner renders/source-only.mp4
npx hyperframes@latest doctor
```
