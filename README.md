# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/host-duration-bound`

A nested composition slot authored with `data-duration` (no `data-end`) does not bound the audio nested inside it in `render`. Visibility does close with the slot; the mixed audio does not.

- `index.html`: root 4s. Slot `scene-a` is `data-start="0" data-duration="2"` over a scene whose content is 4s. Slot `scene-b` follows at 2–4s.
- `compositions/scene-a.html`: `<audio data-start="0" data-duration="4">` (silent until 1.5s, then a 440 Hz tone), plus a `data-start="2.5"` element that must never paint.
- `compositions/scene-b.html`: a plain blue scene that should be silent.

**Expected:** scene B is silent (the slot ended at 2s), the way the runtime already hides scene A's timed elements at 2s.

**Actual (0.8.40):** the compiled media plan lists `scene-a-sound` as `start 0, end 4`, and the tone plays over scene B (about −21 dB mean volume in 2–4s). The frame at 3s is correctly scene B: pixels and audio disagree about where the slot ends.

### Reproduce

```bash
git checkout patch/host-duration-bound
npx hyperframes@0.8.40 check          # clean
npm run render -- --debug -o out/repro.mp4 --quality draft
ffmpeg -ss 2 -t 2 -i out/repro.mp4 -vn -af volumedetect -f null - 2>&1 | grep mean_volume   # ≈ -21 dB, expected silence (-91 dB)
```

With `--debug`, `compiled/summary.json` in the producer `.debug` directory shows the planned window `end: 4` for `scene-a-sound`.
