// Local HTTPS asset server for the download-stall repro. Run it under Node, so the
// server side is independent of the Bun version under test.
//
//   node repro/server.mjs [port=8443]
//
// GET /size/<bytes>/<name> returns <bytes> bytes with a Content-Length, written in
// 64 KiB chunks that respect backpressure, like an ordinary static file / CDN response.
import https from "node:https";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const certs = join(dirname(fileURLToPath(import.meta.url)), "certs");
const port = Number(process.argv[2] ?? 8443);

function handler(req, res) {
  const parts = new URL(req.url, "https://x").pathname.split("/");
  if (parts[1] !== "size" || !Number.isInteger(Number(parts[2]))) {
    res.writeHead(404);
    res.end();
    return;
  }
  const body = Buffer.alloc(Number(parts[2]), 7);
  res.writeHead(200, { "content-type": "application/octet-stream", "content-length": body.length });
  let offset = 0;
  const step = () => {
    if (res.destroyed) return;
    if (offset >= body.length) return res.end();
    const ok = res.write(body.subarray(offset, offset + 65536));
    offset += 65536;
    ok ? setImmediate(step) : res.once("drain", step);
  };
  step();
}

https
  .createServer({ key: readFileSync(join(certs, "key.pem")), cert: readFileSync(join(certs, "cert.pem")) }, handler)
  .listen(port, "127.0.0.1", () => console.error(`[server] https://127.0.0.1:${port}`));
