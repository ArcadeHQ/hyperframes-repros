// Renders index.html through the public distributed primitives
// (planV2 -> renderChunkV2 per chunk -> assembleV2), all in this process,
// the way a Lambda / Cloud Run adapter would across machines.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assembleV2, planV2, renderChunkV2 } from "@hyperframes/producer/distributed";

const projectDir = resolve(".");
const outputPath = resolve(process.argv[2] ?? "out/distributed.mp4");
// Outside the project: the planner copies the project into the plan.
const workDir = mkdtempSync(join(tmpdir(), "hf-distributed-repro-"));

const planDir = join(workDir, "plan");
const result = await planV2(
  projectDir,
  { fps: 30, width: 1920, height: 1080, format: "mp4", quality: "draft", chunkSize: 60 },
  planDir,
);

const chunkPaths = [];
for (let i = 0; i < result.chunkCount; i += 1) {
  const chunkPath = join(workDir, `chunk-${i}.mp4`);
  await renderChunkV2(planDir, i, chunkPath);
  chunkPaths.push(chunkPath);
}

await assembleV2(planDir, chunkPaths, outputPath);
rmSync(workDir, { recursive: true, force: true });
console.log(`${result.chunkCount} chunks -> ${outputPath}`);
