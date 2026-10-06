import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const buildOutput = path.join(repositoryRoot, "frontend", ".output", "public");
const laravelAssets = path.join(repositoryRoot, "backend", "public", "spa-assets");

await rm(laravelAssets, { recursive: true, force: true });
await mkdir(path.dirname(laravelAssets), { recursive: true });
await cp(buildOutput, laravelAssets, { recursive: true });

// Pre-compress text assets so public/router.php can send the small copy
// (PHP's built-in server cannot compress on the fly).
const COMPRESSIBLE = new Set([".js", ".mjs", ".css", ".html", ".json", ".svg", ".txt"]);
const entries = await readdir(laravelAssets, { recursive: true, withFileTypes: true });
let saved = 0;
for (const entry of entries) {
  if (!entry.isFile() || !COMPRESSIBLE.has(path.extname(entry.name))) continue;
  const file = path.join(entry.parentPath, entry.name);
  const source = await readFile(file);
  if (source.length < 1024) continue;
  const brotli = brotliCompressSync(source, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
    },
  });
  await writeFile(`${file}.br`, brotli);
  await writeFile(`${file}.gz`, gzipSync(source, { level: 9 }));
  saved += source.length - brotli.length;
}
console.log(`Pre-compressed assets, saving ${(saved / 1024).toFixed(0)} KB per full download.`);
