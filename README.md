# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/clamp-embedded-media` | Nested scenes slice one 90s take — probe must not extend media ends |
| `patch/unique-media-render-keys` | Two scenes reuse `id="clip"` — inlined export shows scene chrome, no footage |

## `patch/unique-media-render-keys`

Two 3s nested scenes each declare `<video id="clip">` (legal per composition file). After compile inlines both into one document:

1. Extract/dedupe keys by raw element id → one pipeline entry (`videoCount: 1`).
2. Frame inject uses `document.getElementById("clip")` → first match in document order.
3. Visible scene’s video never receives frames → green then purple chrome only (scene backgrounds + labels); no SMPTE bars from the source.

Pin: `hyperframes@0.8.3`.

**Expected:** both halves show footage (different `data-media-start` slices: 5s vs 50s).

**Actual (0.8.3):** MP4 is green panel → purple panel; source at those offsets is color bars.

### Reproduce

```bash
git checkout patch/unique-media-render-keys
npx hyperframes lint   # should be clean — duplicate ids across files are allowed
npm run render -- -f 10
```

Compile log: `videoCount: 1` (should be 2). Open the MP4: chrome only = bug.
