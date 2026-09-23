# hyperframes-repros

Minimal public reproductions for HyperFrames issues.

## `patch/bun-fromweb-download-stall`

The Google Cloud Run image (`packages/gcp-cloud-run/Dockerfile`) installs **Bun 1.3.9** and serves renders with `bun dist/server.js`. Every remote asset in a render is fetched by `downloadToTemp` in `packages/engine/src/utils/urlDownloader.ts`, which streams the body with:

```ts
await pipeline(Readable.fromWeb(response.body), inspector, createWriteStream(partialPath));
```

On Bun 1.3.9, under a burst of parallel HTTPS downloads, the `Readable.fromWeb` bridge occasionally stops reading in the middle of a body. The download's `AbortController` timeout (300s by default) aborts the fetch, but the `pipeline` promise never settles. Nothing is logged: the render request just waits until the platform request timeout (60 minutes on Cloud Run). A retry of the same render usually succeeds in seconds. This matches [oven-sh/bun#34559](https://github.com/oven-sh/bun/issues/34559), fixed in Bun 1.4.0.

This branch reproduces it with no HyperFrames code: `repro/download-stall.ts` uses the same body-consumption shape as the downloader against a local HTTPS server. The composition files are the blank `hyperframes init` from `main`, kept only so `npx hyperframes doctor` runs here.

- `repro/setup-cert.sh`: generates a throwaway self-signed cert for `127.0.0.1` into `repro/certs/` (git-ignored).
- `repro/server.mjs`: HTTPS server (run under Node). `GET /size/<bytes>/<name>` returns that many bytes with a `Content-Length`, in 64 KiB writes.
- `repro/download-stall.ts`: 11 parallel downloads per round, each fetch aborted at 3s; a download still pending at 8s never settled after its abort. `fromweb` mode is the downloader's shape. `signal` mode adds the proposed fix, `pipeline(..., { signal })`. `reader` mode reads `response.body.getReader()` directly, as a control.
- `repro/abort-resolves.mjs`: a second, separate behavior (see below).

**Expected:** every download either completes or rejects shortly after its fetch is aborted (`hung=0`), as on Node.

**Actual (Bun 1.3.9):** a few downloads per thousand stay pending forever after the abort.

Measured on macOS (arm64, Apple M1 Pro). One run is 200 rounds, which is 2,200 downloads. Hung downloads out of the total:

| Runtime | `fromweb` (downloader's shape) | `signal` (`fromweb` + `pipeline(..., { signal })`) | `reader` (control) |
| --- | --- | --- | --- |
| Bun 1.3.9 | **16 / 6,600** (3 runs: 6, 2, 8) | 0 / 4,400 (10 rejected with `AbortError`) | 0 / 2,200 |
| Bun 1.4.2 | 0 / 4,400 | — | — |
| Node 24.21 | 0 / 2,200 | — | — |

In a Cloud Run deployment of the producer this showed up as about 6% of `plan` requests (each downloads ~25 remote assets in parallel) and about 0.3% of `renderChunk` requests hanging for the full 60-minute request timeout, with no timeout or error log.

### Reproduce

```bash
git checkout patch/bun-fromweb-download-stall
./repro/setup-cert.sh
node repro/server.mjs &            # https://127.0.0.1:8443

export NODE_TLS_REJECT_UNAUTHORIZED=0   # self-signed local cert

# Bun 1.3.9 (the Cloud Run image's version): some downloads never settle, exit 1
bunx bun@1.3.9 repro/download-stall.ts fromweb
#   round 38: 1 download(s) still pending 8000ms after start (fetch aborted at 3000ms): sizes 385068
#   ...
#   bun 1.3.9 mode=fromweb downloads=2200: ok=2194 rejected=0 hung=6

# Proposed fix, on Bun 1.3.9: stalls reject with AbortError instead of hanging, exit 0
bunx bun@1.3.9 repro/download-stall.ts signal

# Same bodies read with getReader(): no hang
bunx bun@1.3.9 repro/download-stall.ts reader

# Bun 1.4.x and Node: no hang, exit 0
bunx bun@1.4.2 repro/download-stall.ts fromweb
node repro/download-stall.ts fromweb    # Node 22.18+ runs .ts directly
```

The rate depends on the machine; raise `ROUNDS` (default 200) if a run comes back clean on 1.3.9.

### Second behavior: on Bun 1.4.2, an aborted stalled body resolves the pipeline

`repro/abort-resolves.mjs` serves 10 KB and then stalls the body. The fetch is aborted after 1s.

```bash
bunx bun@1.3.9 repro/abort-resolves.mjs   # bun 1.3.9 chunked: rejected: AbortError
node repro/abort-resolves.mjs             # node v24.21.0 chunked: rejected: AbortError
bunx bun@1.4.2 repro/abort-resolves.mjs   # bun 1.4.2 chunked: RESOLVED after abort, 10000 bytes on disk
```

On Bun 1.4.2 the aborted body ends as if it were complete, so `pipeline` resolves with a truncated file. The downloader's `Content-Length` check catches that when the server sends a length, but a chunked or content-encoded response would be accepted truncated. Passing the attempt's signal to `pipeline(..., { signal })` makes the abort reject on every runtime.
