# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/volume-probe-autoalpha`

Preview hides a later scene's layer that render shows.

- `index.html`: a 9s `<audio>` bed, a count-up tweened through an object with a setter (0–2s), a plain scene 2 (3–6s), and `compositions/scene3.html` mounted at 6–9s.
- `scene3.html`: a yellow box that shows from the scene start and is cut out 1.5s in (7.5s on the root) with `fromTo("#scene3-box", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, immediateRender: false }, 1.5)`. That cut is the box's only tween.

`hyperframes lint` and `hyperframes check` pass. Pin: `hyperframes@0.9.13`.

**Expected:** the yellow box shows from 6s to 7.5s, in preview and in render.

**Actual (0.9.13):** render shows it. Preview never shows it. At 6.5s the box has inline `opacity: 0; visibility: hidden`.

### Reproduce

```bash
git checkout patch/volume-probe-autoalpha
npm run dev        # Studio: scrub to 6.5s, the scene has no yellow box
npm run render -- --quality draft --output renders/render.mp4
ffmpeg -ss 6.5 -i renders/render.mp4 -frames:v 1 renders/6.5.png   # yellow box present
```

Either change makes preview match render:

- Replace the setter count-up with a plain-object tween that writes the text in `onUpdate`.
- Remove the `<audio>`.

### Why

With a media element on the page, the preview runtime probes its volume automation by seeking the live root timeline through the element's window at 60 fps (`probeAndCacheElementVolume` in `packages/core/src/runtime/mediaVolumeEnvelope.ts`). It skips the probe only when it can rule out a volume change, and a tween on any object with a property setter counts as a possible volume change.

The probe runs before the runtime's first visibility pass, while the `[data-start]:not(video, audio, img) { visibility: hidden !important }` until-first-pass sheet hides every clip. The sweep is the first render of the box's deferred tween, so GSAP records the inherited `hidden` as its pre-tween autoAlpha. Every later seek before 7.5s writes that back.

Render skips the probe (`allowLiveTimelineSeek: !__HF_RENDER_CAPTURE_MODE`), so render is right. heygen-com/hyperframes#5690 fixed the same pattern for jump seeks with `showHiddenClips()`. The volume probe does not use it.
