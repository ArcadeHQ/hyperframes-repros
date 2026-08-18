# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |

## `patch/clamp-embedded-media`

Four 3s scenes reuse `assets/long-take.mp4` (90s) at `data-media-start` 5 / 25 / 50 / 70.

Videos intentionally omit `data-duration`. Compile fills natural remaining source length into the DOM; `parseSubCompositions` clamps `composition.videos` to each 3s scene slot. Unpatched `probeStage` then extends each `end` back toward the natural window.

**Expected (fixed):** `maxFramesPerVideo` ≈ 90 (3s × 30fps). Extract cost stays scene-sized.

**Actual (unpatched `main`):** `maxFramesPerVideo` jumps to hundreds (remaining source after each media-start). Deep scenes do far more extract work than the slot needs; under ffmpeg timeouts they can ship black while the render still succeeds.

### Reproduce

```bash
git checkout patch/clamp-embedded-media
npm run render -- --debug
```

Watch the `video_extract` checkpoint for `maxFramesPerVideo` / `avgFramesPerExtractedVideo`. Inflated = bug. ~90 = fixed.

`compositions/force-probe.html` is an empty unresolved overlay so the browser probe runs.
