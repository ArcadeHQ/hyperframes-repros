# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/untraced-media-src-write`

One timed `<video>` authored with a red clip. An inline script sets its `src` to a blue clip, synchronously, in a `querySelectorAll(...).forEach` loop.

`snapshot` and `preview` play the blue clip. `render` exports the red one, and `check` reports nothing.

The render reads a clip's `src` from the markup unless something tells it to load the page first. A script that writes `src` is one such trigger, but only when the write's target is a literal `getElementById` or `querySelector` lookup. A write on a loop variable is not followed, so the page is never loaded and the authored `src` is extracted. The `media_runtime_src_mutation` lint warning has the same blind spot, so nothing tells the author.

Pin: `hyperframes@0.9.30`.

**Expected:** the render shows the blue clip, like `snapshot` and `preview`. Failing that, `check` warns about the write.

**Actual:** the render shows the red clip. `check` passes with 0 warnings.

**Control:** replace the loop with `document.querySelector("#clip").src = "assets/blue-swapped.mp4";`. `lint` warns `media_runtime_src_mutation`, the render log shows `Launching browser for composition probe... "reasons":["runtime-created or source-mutated media"]`, and the render shows the blue clip.

### Reproduce

```bash
git checkout patch/untraced-media-src-write
npm run check                                       # passes, 0 warnings
npx hyperframes@0.9.30 snapshot --at 1.5 --no-end -o out/snap   # blue
npm run render -- --quality draft --output out/render.mp4
ffmpeg -ss 1.5 -i out/render.mp4 -frames:v 1 out/render.png      # red
```

`snapshots/` holds both frames at 1.5 s.
