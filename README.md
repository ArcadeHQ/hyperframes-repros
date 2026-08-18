# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |

## `patch/clamp-embedded-media`

Four 3s nested scenes reuse `assets/long-take.mp4` (90s) at `data-media-start` 5 / 25 / 50 / 70.

- Scene hosts stamp `data-duration="3"`.
- Videos set `data-start="0"` and omit `data-duration`, so ffprobe fills natural remaining source length into the DOM.
- Root omits `data-duration`; length comes from the GSAP master timeline (12s). That launches the browser probe.

`parseSubCompositions` clamps `composition.videos` to each 3s scene slot. Unpatched `probeStage` then extends each `end` back toward the natural window.

**Expected (fixed):** `maxFramesPerVideo` ≈ 90 (3s × 30fps). Extract cost stays scene-sized.

**Actual (unpatched `main`):** `maxFramesPerVideo` jumps to hundreds (remaining source after each media-start). Deep scenes do far more extract work than the slot needs; under ffmpeg timeouts they can ship black while the render still succeeds.

### Reproduce

```bash
git checkout patch/clamp-embedded-media
npx hyperframes lint   # should be clean
npm run render -- --debug
```

Watch for `Launching browser for composition probe...` (root duration unknown), then the `video_extract` checkpoint for `maxFramesPerVideo`. Inflated = bug. ~90 = fixed.
