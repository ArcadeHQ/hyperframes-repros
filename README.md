# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/invalid-css-drops-composition`

One invalid CSS declaration in a sub-composition `<style>` block makes the
runtime fetch the file and then discard the whole composition. The slot stays
empty. The scene timeline never registers. The browser console stays quiet.

A browser CSS parser drops the bad declaration and keeps the rest of the rule.
HyperFrames drops the composition that contains it.

`compositions/scene-ok.html` is valid (`transform: translateX(-10%);`).
`compositions/scene-bad.html` is the same except one line:

```css
transform: xPercent: -10;
```

That nested colon is not valid CSS. PostCSS throws `Missed semicolon`. The
composition loader catches the throw and resets the host.

Confirmed on `@hyperframes/core@0.8.21` (latest) and earlier on 0.6.121–0.8.17.

`npx hyperframes@latest check` lint is clean. The runtime check reports
`Missed semicolon` with no composition id. `snapshot` / `render` abort with the
same message. Serving the project with the runtime IIFE leaves `scene-ok`
mounted and `scene-bad` empty, with nothing logged.

**Control:** change that one line in `scene-bad.html` to
`transform: translateX(-10%);`. Both scenes mount.

### Reproduce

```bash
git checkout patch/invalid-css-drops-composition
npx hyperframes@latest check
npx hyperframes@latest snapshot --at 1 --no-end --describe false
npx hyperframes@latest doctor
```

Then serve `index.html` with `@hyperframes/core@0.8.21` (or `@latest`) and:

```js
document.querySelector('[data-composition-id="scene-ok"]').children.length
// 1
document.querySelector('[data-composition-id="scene-bad"]').children.length
// 0
Object.keys(window.__timelines)
// ["main", "scene-ok"]   expected also "scene-bad"
```

## Other branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage (fixed via #3340) |
| `patch/duplicate-svg-ids` | Two scenes reuse SVG ids — url(#…) / `<use>` bind to the first scene after inline |
| `patch/video-source` | Source-only `<video>` (no `src` attribute) skipped by extract/mix |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS transition — jump seek replays the fade |
| `patch/runtime-src-duplicate-ids` | Runtime-assigned `video.src` + duplicate ids — export window is wrong |
