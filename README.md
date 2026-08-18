# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |

## `patch/clamp-embedded-media`

Four 3s scenes reuse `assets/long-take.mp4` (90s) at `data-media-start` 5 / 25 / 50 / 70.

**Expected (fixed):** each video window stays ~3s (scene slot). Extract cost is small.

**Actual (unpatched `main`):** `probeStage` replaces each compile-time `end` with a browser projection based on full source duration. Extract windows inflate toward remaining source length. Deep scenes can blow past ffmpeg timeouts and ship black while the render still succeeds.

### Reproduce

```bash
git checkout patch/clamp-embedded-media
npm run render -- --debug
```

Then inspect producer debug artifacts / logs for per-video extract duration or frame counts. Inflated windows look like tens of seconds (or more) per short scene, not ~3s.

`compositions/force-probe.html` is an empty unresolved overlay so the browser probe runs. Without it, known-duration static media can skip the reconcile path that has the bug.
