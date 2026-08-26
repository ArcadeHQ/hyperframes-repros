# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/runtime-src-duplicate-ids`

Follow-up to the fixed "duplicate media element ids collapse the render media pipeline"
(heygen-com/hyperframes#3340). The statically-parsed case is fixed; media elements whose
`src` is assigned **at runtime** still collapse by raw element id.

Two 4s nested scenes each declare `<video id="clip" src="" data-media-start="…">` (legal
per composition file) and assign the real URL from the scene script — the settings-driven
media pattern. Because `src` is empty at compile time, the static parse skips these
elements; their clips come from the browser runtime snapshot instead. That snapshot pairs
clips by raw element id, last write wins, so after both scenes are inlined into one
document, both clips land on one scene's timeline window:

1. Scene A (0–4s, wants source offset 10s) renders **scene B's** window — footage from ~40s.
2. Scene B (4–8s, wants source offset 40s) gets nothing injected — blank white panel.

Scene chrome (headings, backgrounds) still paints; only the footage is wrong/missing.
Preview shows both scenes correctly, so the export silently disagrees with what the
author approved.

The source is a synthetic `ffmpeg testsrc` clip with a burnt-in seconds counter, so the
mis-anchoring is readable straight off the frame: scene A should show ~12, scene B ~46.

Pin: `hyperframes@0.8.15`.

**Expected:** scene A shows the counter around 10–14, scene B around 44–48 (like the preview).

**Actual (0.8.15):** scene A shows ~42–44 (scene B's window), scene B is a blank white panel.

**Control:** rename scene B's video id to `clip-b` (and its script selector) — both scenes
render their correct windows.

### Reproduce

```bash
git checkout patch/runtime-src-duplicate-ids
npm run check          # passes — duplicate ids across files are allowed
npm run render -- . -f 10
```

Open the MP4: at t≈2s the counter reads ~42 (should be ~12); at t≈6s the panel is blank
(should read ~46). `snapshots/` holds actual vs expected frames.

## Other branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage (fixed via #3340) |
| `patch/duplicate-svg-ids` | Two scenes reuse SVG ids — url(#…) / `<use>` bind to the first scene after inline |
| `patch/video-source` | Source-only `<video>` (no `src` attribute) skipped by extract/mix |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS transition — jump seek replays the fade |
