# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/distributed-playback-rate`

A `<video data-playback-rate="1.5">` renders at 1.5× in `hyperframes render`, but at 1× through the distributed primitives (`planV2` → `renderChunkV2` → `assembleV2`, the path the Lambda and Cloud Run adapters use). The mixed audio keeps the authored rate, so picture and sound drift apart.

- `assets/ten-colors-10s.mp4`: 10 s, one solid colour per source second: 0 red, 1 orange, 2 yellow, 3 green, 4 cyan, 5 blue, 6 purple, 7 magenta, 8 white, 9 grey.
- `index.html`: 4 s root, one full-frame clip, `data-start="0" data-duration="4" data-playback-rate="1.5"`.
- `distributed-render.mjs`: runs the three public distributed functions in one process.
- `sample.sh`: prints the centre pixel at t = 1.5 s and t = 3.5 s.

**Expected:** at 1.5×, t = 1.5 s shows source 2.25 s (yellow) and t = 3.5 s shows source 5.25 s (blue), the same in both renderers.

**Actual (0.8.92):**

| Renderer | t = 1.5 s | t = 3.5 s |
| --- | --- | --- |
| `hyperframes render` | `#fdfe01` yellow ✅ | `#0100ff` blue ✅ |
| distributed | `#ff8000` orange (source 1.5 s, rate 1) ❌ | `#00ff01` green (source 3.5 s, rate 1) ❌ |

`parsePlanVideosJson` in `packages/producer/src/services/distributed/shared.ts` rebuilds each video from a fixed field list without `playbackRate`, so `meta/videos.json` loses it and the chunk workers' frame lookup falls back to rate 1. Audio is mixed on the planner from the full element list, so it keeps the rate.

### Reproduce

```bash
git checkout patch/distributed-playback-rate
npm install
npx hyperframes@0.8.92 check                                   # clean
npx hyperframes@0.8.92 render -o out/render.mp4 --quality draft
node distributed-render.mjs out/distributed.mp4
./sample.sh out/render.mp4                                     # yellow, blue
./sample.sh out/distributed.mp4                                # orange, green
```
