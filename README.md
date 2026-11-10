# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/sub-composition-default-var-src`

`compositions/scene.html` declares a variable `clip` on its own `<html data-composition-variables>` with a blue clip as the default, and binds a timed `<video data-var-src="clip">` whose authored `src` is a red clip. `index.html` mounts the scene without `data-variable-values`, so the scene uses its declared default.

`snapshot` and `preview` play the blue clip. `render` exports the red one, and `check` reports nothing.

heygen-com/hyperframes#6501 made the render load the page when a bound clip's variable has a value from the mount's `data-variable-values` or from a default declared on the root `<html>`. Its description lists this case as not covered: inlining drops the sub-composition file's own `<html data-composition-variables>`, so the render never sees that the variable has a value.

Pin: `hyperframes@0.9.30`.

**Expected:** the render shows the blue clip, like `snapshot` and `preview`.

**Actual:** the render shows the red clip. `check` passes with 0 warnings.

**Control:** add `data-variable-values='{"clip":"assets/blue-default.mp4"}'` to the mount in `index.html`. The render log shows `Launching browser for composition probe... "reasons":["variable-bound media source(s)"]`, and the render shows the blue clip.

### Reproduce

```bash
git checkout patch/sub-composition-default-var-src
npm run check                                       # passes, 0 warnings
npx hyperframes@0.9.30 snapshot --at 1.5 --no-end -o out/snap   # blue
npm run render -- --quality draft --output out/render.mp4
ffmpeg -ss 1.5 -i out/render.mp4 -frames:v 1 out/render.png      # red
```

`snapshots/` holds both frames at 1.5 s.
