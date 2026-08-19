# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS `transition` — jump seek replays the fade |

## `patch/jump-seek-css-settle`

Full-frame swatch: `#111` → `#fff` via `transition: background-color 0.5s linear`. GSAP `set`s `class="on"` at 0.2s. After ~0.7s the frame should stay white.

Preview and `--workers 1` are fine: the swap happens once on a sequential clock.

A jump seek (parallel workers, or `snapshot --at` past 0.7s) restores the class on a fresh page. The browser starts the transition again, so chunk starts (and mid-timeline snapshots) flash dark.

Pin: `hyperframes@0.8.3`.

**Expected:** white from ~0.7s to 4s, including the first frame of every chunk after 0.7s.

**Actual (0.8.3, `--workers 4`):** each later chunk opens with a 0.5s black→white fade.

### Reproduce

```bash
git checkout patch/jump-seek-css-settle

# Quick: one session jumping to a settled time. Unpatched PNG is dark or mid-fade.
npx hyperframes snapshot --at 2

# Export path (the real bug). Compare sequential vs parallel.
npm run render -- --quality draft --workers 1 --output renders/sequential.mp4
npm run render -- --quality draft --workers 4 --output renders/workers.mp4
```

Sequential: one fade near the start, then white. Workers: fade again around 1s / 2s / 3s.

After the engine `finish()`s jump-spawned CSS transitions, `--workers 4` matches sequential. Same check with a local CLI:

```bash
node ../hyperframes-next/packages/cli/bin/hyperframes.mjs snapshot --at 2
node ../hyperframes-next/packages/cli/bin/hyperframes.mjs render --quality draft --workers 4 --output renders/patched.mp4
```
