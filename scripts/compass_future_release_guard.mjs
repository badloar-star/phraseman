#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const markerPath = path.join(repositoryRoot, ".compass-future-only");
const profile = String(process.env.EAS_BUILD_PROFILE || "").trim().toLowerCase();
const forcedProduction = process.argv.includes("--production");
const storeRelease = String(
  process.env.EXPO_PUBLIC_STORE_RELEASE || "",
).trim();
const productionBuild =
  forcedProduction || profile === "production" || storeRelease === "1";

if (fs.existsSync(markerPath) && productionBuild) {
  console.error(
    "[compass-future-release-guard] BLOCKED: Compass is future-only until Learning V2 is ready and the product owner explicitly resumes it.",
  );
  process.exit(86);
}

console.log(
  `[compass-future-release-guard] allowed: ${profile || "local/non-EAS"} is not a production release`,
);
