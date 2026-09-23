// Second finding: when a response body stalls mid-stream and the fetch is aborted,
// pipeline(Readable.fromWeb(body), ...) should reject with AbortError.
//
//   bun repro/abort-resolves.mjs            # body stalls after 10 KB, no Content-Length (chunked)
//   bun repro/abort-resolves.mjs length     # same, with Content-Length: 1 MiB
//   node repro/abort-resolves.mjs           # reference behavior
import http from "node:http";
import { createWriteStream, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const withLength = process.argv[2] === "length";
const runtime = globalThis.Bun ? `bun ${globalThis.Bun.version}` : `node ${process.version}`;

const server = http
  .createServer((_req, res) => {
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      ...(withLength ? { "content-length": String(1 << 20) } : {}),
    });
    res.write(Buffer.alloc(10_000, 7));
    // ...then stall forever.
  })
  .listen(0, "127.0.0.1", async () => {
    const url = `http://127.0.0.1:${server.address().port}/stall.bin`;
    const file = join(mkdtempSync(join(tmpdir(), "abort-resolves-")), "payload");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    const watchdog = setTimeout(() => {
      console.log(`${runtime}: still pending 10s after start (never settled)`);
      process.exit(2);
    }, 10_000);
    let result;
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { "accept-encoding": "identity" } });
      await pipeline(
        Readable.fromWeb(response.body),
        new Transform({ transform: (chunk, _e, cb) => cb(null, chunk) }),
        createWriteStream(file, { flags: "wx" }),
      );
      result = `RESOLVED after abort, ${statSync(file).size} bytes on disk (expected a rejection)`;
    } catch (error) {
      result = `rejected: ${error.name}`;
    }
    clearTimeout(watchdog);
    console.log(`${runtime} ${withLength ? "content-length" : "chunked"}: ${result}`);
    server.closeAllConnections();
    server.close();
    process.exit(result.startsWith("RESOLVED") ? 1 : 0);
  });
