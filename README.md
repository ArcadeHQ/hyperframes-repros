# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS transition replays on jump seek |
| `patch/chained-scene-slots` | Chained sub-composition slots (`data-start="hook"`) break render scheduling |

## `patch/chained-scene-slots`

Three scene sub-compositions mounted from the root with **chained slot** timing — the wizard-shaped pattern (`data-composition-src` hosts that chain with id-refs):

| Slot | `data-start` | Footage | Global window |
| --- | --- | --- | --- |
| `hook` | `0` | red | 0–2s |
| `performance` | `hook` | blue | 2–4s |
| `community` | `performance` | green | 4–6s |

Each scene is a separate file under `compositions/` with a full-frame muted `<video>` (local `assets/*.mp4`).

Pin: `hyperframes@0.8.4`.

### Expected

Render schedules each scene's video at its resolved global window. Sample frames from the MP4:

- `t=1s` → red
- `t=3s` → blue
- `t=5s` → green

### Actual (0.8.4, id-ref index)

Render treats host `data-start="hook"` as `0` when building the media list (`parseFloat`), so scenes after the first are extracted for global **0–2s** instead of 2–4 / 4–6. After ~2s the export is **black**.

Sample frames from `renders/out.mp4`:

- `t=1s` → red
- `t=3s` → near-black (`#111` background)
- `t=5s` → near-black

### Control (proves id-ref is the variable)

`index-numeric.html` is the same project with absolute slot starts (`0`, `2`, `4`). Render is correct (red → blue → green). Rename it to `index.html` to verify.

### Reproduce

```bash
git checkout patch/chained-scene-slots

# Bug path (default index.html uses id-refs)
npx hyperframes@0.8.4 render --quality draft --workers 1 --output renders/out.mp4
ffmpeg -ss 1 -i renders/out.mp4 -frames:v 1 renders/at-1.png
ffmpeg -ss 3 -i renders/out.mp4 -frames:v 1 renders/at-3.png
ffmpeg -ss 5 -i renders/out.mp4 -frames:v 1 renders/at-5.png

# Control (numeric slot starts)
cp index-numeric.html index.html
npx hyperframes@0.8.4 render --quality draft --workers 1 --output renders/out-numeric.mp4

npx hyperframes doctor
```

Mechanism: after inlining, `collectRenderMedia` walks composition hosts and does `parseFloat(host.data-start)`. Id-refs become `0`, so later scenes' videos never receive frames past the first scene's window.
