# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Blank `hyperframes init --example blank` |
| `patch/duplicate-svg-ids` | Nested scenes reuse `#clip` / `#shape` / `#fx` — native `url(#)` and `<use href="#">` bind the first scene |

## `patch/duplicate-svg-ids`

Two 2s nested scenes. Each defines its own `#clip`, `#shape`, and `#fx` (red in scene-a, blue in scene-b) and paints four rows:

1. control — no ID reference
2. `clip-path="url(#clip)"`
3. `<use href="#shape">`
4. CSS `filter: url(#fx)`

Legal per file. `check` is clean. After inline, the assembled document has duplicate IDs, so browser-native references resolve to the first match in document order (scene-a). `#646` scoped `getElementById`; `#3340` stamped media render keys. Neither rewrites `url(#…)` / `href="#…"`.

Pin: `hyperframes@0.8.14` (also fails on `@latest`).

### Expected

- `t=1s` (scene-a): all four rows red
- `t=3s` (scene-b): all four rows blue

### Actual (0.8.14)

- `t=1s`: all four rows red (ok)
- `t=3s`: (1) control blue (ok); (2) clip-path absent; (3) `<use>` red (scene-a's shape); (4) CSS filter red (scene-a's flood)

See `snapshots/frame-00-at-1s.png` and `snapshots/frame-01-at-3s.png`.

### Reproduce

```bash
git checkout patch/duplicate-svg-ids
npx hyperframes@latest check
npx hyperframes@latest snapshot --at 1,3 --no-end --describe false
npx hyperframes@latest doctor
```
