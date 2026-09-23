// Bun-only repro (no HyperFrames code): the same body-consumption shape as
// @hyperframes/engine's downloader (packages/engine/src/utils/urlDownloader.ts):
//
//   await pipeline(Readable.fromWeb(response.body), transform, fs.createWriteStream(path))
//
// Each round starts 11 downloads in parallel. Every fetch has an AbortController that fires
// at ABORT_MS. A download that is still pending at WATCHDOG_MS did not settle even though
// its fetch was aborted: that is the bug.
//
//   NODE_TLS_REJECT_UNAUTHORIZED=0 bun repro/download-stall.ts [fromweb|signal|reader]
//   env: ROUNDS=200  TARGET=https://127.0.0.1:8443
//
// Mode `signal` is `fromweb` plus pipeline(..., { signal }), the proposed fix: a stalled
// download then rejects with AbortError instead of hanging. Mode `reader` consumes the same
// bodies with response.body.getReader() instead of Readable.fromWeb, as a control.
import { closeSync, createWriteStream, mkdtempSync, openSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const mode = process.argv[2] ?? "fromweb";
const target = process.env.TARGET ?? "https://127.0.0.1:8443";
const rounds = Number(process.env.ROUNDS ?? 200);
const ABORT_MS = 3000;
const WATCHDOG_MS = 8000;
// Byte sizes of one burst: a handful of small audio/image-sized files and one ~10 MB file.
const SIZES = [27117, 385068, 421932, 716844, 532524, 606252, 704556, 647212, 524332, 10483244, 536620];

async function download(url: string, file: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ABORT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "accept-encoding": "identity" },
    });
    let bytes = 0;
    if (mode === "fromweb" || mode === "signal") {
      const count = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          callback(null, chunk);
        },
      });
      const source = Readable.fromWeb(response.body as any);
      const sink = createWriteStream(file, { flags: "wx" });
      if (mode === "signal") await pipeline(source, count, sink, { signal: controller.signal });
      else await pipeline(source, count, sink);
    } else {
      const fd = openSync(file, "wx");
      const reader = response.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        writeSync(fd, value);
      }
      closeSync(fd);
    }
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

const runtime = (globalThis as any).Bun ? `bun ${(globalThis as any).Bun.version}` : `node ${process.version}`;
let ok = 0;
let rejected = 0;
let hung = 0;
for (let round = 0; round < rounds; round++) {
  const dir = mkdtempSync(join(tmpdir(), "fromweb-stall-"));
  const state: string[] = SIZES.map(() => "pending");
  await Promise.race([
    Promise.all(
      SIZES.map((size, i) =>
        download(`${target}/size/${size}/r${round}-a${i}.bin`, join(dir, `f${i}`)).then(
          (bytes) => {
            state[i] = bytes === size ? "ok" : `short(${bytes})`;
            ok++;
          },
          (error) => {
            state[i] = `rejected(${error?.name})`;
            rejected++;
          },
        ),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, WATCHDOG_MS)),
  ]);
  const pending = state.flatMap((s, i) => (s === "pending" ? [i] : []));
  if (pending.length) {
    hung += pending.length;
    console.log(
      `  round ${round}: ${pending.length} download(s) still pending ${WATCHDOG_MS}ms after start ` +
        `(fetch aborted at ${ABORT_MS}ms): sizes ${pending.map((i) => SIZES[i]).join(",")}`,
    );
  } else {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(`${runtime} mode=${mode} downloads=${rounds * SIZES.length}: ok=${ok} rejected=${rejected} hung=${hung}`);
process.exit(hung ? 1 : 0);
