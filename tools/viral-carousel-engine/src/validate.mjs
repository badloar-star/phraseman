import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const input = inputIndex >= 0 ? args[inputIndex + 1] : "output/viral_ru_en_50_2026-06-12/posts.json";
const generator = path.resolve("tools/viral-carousel-engine/src/generate.mjs");

if (!fs.existsSync(input)) {
  console.error(`Input not found: ${input}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [generator, "--input", input, "--batch", "validation_only", "--validate-only"], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
