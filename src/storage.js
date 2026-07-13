import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(rootDir, "data", "seed.json");

export async function loadSeed() {
  const raw = await readFile(seedPath, "utf8");
  return JSON.parse(raw);
}

export function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}
