import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const buildOutput = path.join(repositoryRoot, "frontend", ".output", "public");
const laravelAssets = path.join(repositoryRoot, "backend", "public", "spa-assets");

await rm(laravelAssets, { recursive: true, force: true });
await mkdir(path.dirname(laravelAssets), { recursive: true });
await cp(buildOutput, laravelAssets, { recursive: true });
