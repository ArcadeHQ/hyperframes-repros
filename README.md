# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/bg-clip-text-layered-child`

Two lines of gradient text (`background-clip: text` + `-webkit-text-fill-color: transparent`). The first is the element's own text. The second sits in a child `<div>` with `transform: translateY(0)`, which gives it its own paint layer. Any transform, opacity or filter on the child does the same, and that is exactly what a GSAP tween leaves on an element it animated.

`chrome-headless-shell@148.0.7778.167`, the build pinned by `packages/gcp-cloud-run/Dockerfile` and `Dockerfile.test`, leaves layered descendants out of the text clip. The second line keeps its transparent fill and gets no gradient, so it is invisible in the render. The CLI's managed Chrome (`152.0.7977.30`) paints it, and so does `hyperframes preview` in any current browser, so a render from the Cloud Run image disagrees with both.

Pin: `hyperframes@0.8.134`.

**Expected:** both lines render with the gradient, as in preview and in a local `render`.

**Actual (the `@hyperframes/gcp-cloud-run` image, or any render on Chrome 148):** only "Direct text" renders.

`check` flags the second line as `text_not_painted` (transparent fill) even on the Chrome that paints it, so the lint and the Cloud Run image agree with each other and disagree with every current browser.

### Reproduce

```bash
git checkout patch/bg-clip-text-layered-child
npm run dev                                                # both lines

npm run render -- --quality draft --output out/chrome-152.mp4   # both lines (CLI's managed Chrome)

npx --yes @puppeteer/browsers install chrome-headless-shell@148.0.7778.167
HYPERFRAMES_BROWSER_PATH=<path printed above> npm run render -- --quality draft --output out/chrome-148.mp4   # second line missing

ffmpeg -ss 0.5 -i out/chrome-152.mp4 -frames:v 1 out/chrome-152.png
ffmpeg -ss 0.5 -i out/chrome-148.mp4 -frames:v 1 out/chrome-148.png
```

`render --docker` is not affected: `Dockerfile.render` installs `chrome-headless-shell@stable`.
