# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |

## `patch/clamp-embedded-media`

Shaped like Arcade wizard comps: nested scenes with stamped host `data-duration`, one long take sliced via `data-media-start`, bare in-scene `<video>` (no `data-start` / `data-duration`).

Four 3s scenes reuse `assets/long-take.mp4` (90s) at `data-media-start` 5 / 25 / 50 / 70.

Compile injects `data-hf-auto-start` (so the browser probe runs for visibility). ffprobe fills natural remaining source length into the DOM; `parseSubCompositions` clamps `composition.videos` to each 3s scene slot. Unpatched `probeStage` then extends each `end` back toward the natural window.

**Expected (fixed):** `maxFramesPerVideo` ≈ 90 (3s × 30fps). Extract cost stays scene-sized.

**Actual (unpatched `main`):** `maxFramesPerVideo` jumps to hundreds (remaining source after each media-start). Deep scenes do far more extract work than the slot needs; under ffmpeg timeouts they can ship black while the render still succeeds.

### Reproduce

```bash
git checkout patch/clamp-embedded-media
npm run render -- --debug
```

Watch for `Launching browser for composition probe...` with reason `auto-start video(s)`, then the `video_extract` checkpoint for `maxFramesPerVideo`. Inflated = bug. ~90 = fixed.

`npx hyperframes lint` reports `media_missing_data_start` on the four videos. That is intentional: bare media is how compile injects `data-hf-auto-start` and enters the probe path Arcade hits. Default `render` continues despite those lint errors; use `--strict` only if you want lint to block.
