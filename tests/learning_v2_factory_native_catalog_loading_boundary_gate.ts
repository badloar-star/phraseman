import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const catalogClient = read("app/learning_v2_active_course_catalog_client_v1.ts");
assert.match(
  catalogClient,
  /factory_native\/factory_native_catalog_v1/u,
  "the lessons catalog must use the metadata-only Factory Native boundary",
);
assert.doesNotMatch(
  catalogClient,
  /factory_native\/factory_native_course_v1/u,
  "the lessons catalog must not load the full session payload graph",
);

const ownerPreview = read("app/_learning_v2_authoring_preview.tsx");
assert.match(ownerPreview, /factory_native\/factory_native_catalog_v1/u);
assert.doesNotMatch(ownerPreview, /factory_native\/factory_native_course_v1/u);

const generatedCatalog = read(
  "modules/learning-v2/content/factory_native/factory_native_catalog_v1.generated.ts",
);
assert.doesNotMatch(
  generatedCatalog,
  /\brequire\s*\(|generated_release/u,
  "catalog metadata must not contain Metro edges to session JSON",
);
assert.match(generatedCatalog, /FACTORY_NATIVE_CATALOG_ROWS_V1/u);

const catalogBoundary = read(
  "modules/learning-v2/content/factory_native/factory_native_catalog_v1.ts",
);
assert.match(catalogBoundary, /FACTORY_NATIVE_CATALOG_ROWS_V1/u);
assert.doesNotMatch(catalogBoundary, /FACTORY_NATIVE_MANIFEST_V1|generated_release/u);

const generator = read("scripts/build_learning_v2_factory_native_manifest.mjs");
assert.match(generator, /factory_native_catalog_v1\.generated\.ts/u);
assert.match(generator, /renderCatalog/u);
assert.doesNotMatch(
  generator,
  /rmSync\(GENERATED_RELEASE_ROOT,\s*\{\s*recursive:\s*true/u,
  "regeneration must not temporarily delete Metro's complete session tree",
);

const cloudSync = read("app/cloud_sync.ts");
assert.doesNotMatch(
  cloudSync,
  /require\(["']\.\/mistake_practice_rewards["']\)/u,
  "cloud restore must not pull the reward and full V2 session graph into startup bundles",
);
assert.match(
  cloudSync,
  /await import\(["']\.\/mistake_practice_rewards["']\)/u,
  "mistake reward replay must remain available behind an async bundle boundary",
);

console.log("Learning V2 Factory Native catalog loading boundary: PASS");
