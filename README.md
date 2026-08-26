# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage |
| `patch/jump-seek-css-settle` | GSAP class swap + CSS `transition` — jump seek replays the fade |
| `patch/render-succeeds-on-page-error` | Script throws before any tween — render logs `PAGEERROR`, still exits 0 with a 100% black "validated" MP4 |

## `patch/render-succeeds-on-page-error`

The composition script registers its paused timeline, then does a bare `JSON.parse`
of a malformed JSON attribute (one dropped quote — the kind of typo any authored
data attribute can carry). The parse throws, the script dies before `tl.fromTo`
runs, the timeline stays empty, and the only visible element stays at its CSS
`opacity: 0`.

`check` catches this: the Runtime stage reports the page error and exits 1.

`render` also *sees* it — it logs `[Browser:PAGEERROR] Unterminated string in
JSON …` from every capture page — but still completes, exits 0, prints
"artifact validated", and writes a full-duration, 100% black MP4. `--strict`
covers lint errors only (this file lints clean), so there is no flag that makes
a runtime page error fail the render.

Pin: `hyperframes@0.8.15`.

**Expected:** a render whose page threw an uncaught exception fails, or at
minimum can be made to fail (`--strict`, or a dedicated flag). Exit 0 +
"validated" should not describe an artifact produced by a crashed script.

**Actual (0.8.15):** exit 0, `PAGEERROR` visible only as an unleveled log line,
output MP4 is solid black for the full 10s (luma min = max = 16 on every frame).

### Reproduce

```bash
git checkout patch/render-succeeds-on-page-error

# The gate that does catch it (exit 1, Runtime: page_error):
npx hyperframes@latest check

# The gap: both succeed, both produce a fully black MP4.
npx hyperframes@latest render
npx hyperframes@latest render --strict

# Confirm the output is black:
ffprobe -v error -f lavfi -i "movie=renders/<file>.mp4,signalstats" \
  -show_entries frame_tags=lavfi.signalstats.YMAX -of csv | sort -u
```
