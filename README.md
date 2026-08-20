# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS `transition` — jump seek replays the fade |
| `patch/visibility-scrub` | 31 scenes / 364s / 5 auto-start videos, nested GSAP |

## `patch/visibility-scrub`

**31 scenes, 364s, 5 `<video>`s with no `data-start`**, nested scene timelines stitched onto the root (~400 GSAP tweens with transform + `filter: blur`). Dummy copy and color clips.

Compile injects `data-hf-auto-start`, so `browser_probe` runs `discoverVideoVisibilityFromTimeline`. Unpatched seeks the GSAP timeline at every 0.1s sample **for each** auto-start video. Coarse seeks = `V × D / 0.1` → 5 × 364 / 0.1 = **18,200**. Patched: one seek per step (**3,640**).

Pin: `hyperframes@0.8.3`.

**Expected (patched):** probe span stays near a 1-video control.

**Actual (0.8.3):** probe wall time scales with video count. On CPU/SwiftShader this can blow the ~5 min `protocolTimeout`. Color clips understate per-seek cost vs 1080p footage.

`lint` reports `media_missing_data_start` on each video. That is the trigger. Adding `data-start` skips the scan.

### Reproduce

```bash
git checkout patch/visibility-scrub

# Probe is the bug. --debug timestamps the visibility scan.
# -f 1 keeps capture from dwarfing probe.
npm run render -- --debug -f 1 --quality draft --output renders/unpatched.mp4
```

Watch for:

```
Launching browser for composition probe... { reasons: [ 'auto-start video(s)' ] }
Discovering video visibility windows... { videoCount: 5 }
```

Time from that log to the five `[Probe] Runtime video discovery: clip-N visible …` lines.

Control: keep only `clip-0` (drop the other four videos). `videoCount: 1`. Unpatched probe should drop ~5×. Patched, both counts finish in about the same time.
