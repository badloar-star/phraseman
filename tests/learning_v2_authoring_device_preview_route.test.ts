import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

assert.ok(
  existsSync(resolve(root, "app/learning_v2_authoring_preview.tsx")),
  "the guarded DEV route must exist",
);
assert.ok(
  existsSync(resolve(root, "app/_learning_v2_authoring_preview.tsx")),
  "the real DEV-only selector must exist",
);

const routes = read("constants/devRoutes.ts");
const registry = read("components/dev/devToolRegistry.ts");
const hub = read("components/dev/DevHubSheet.tsx");
const guard = read("app/learning_v2_authoring_preview.tsx");
const screen = read("app/_learning_v2_authoring_preview.tsx");

assert.ok(routes.includes("LEARNING_V2_AUTHORING_PREVIEW_ROUTE"));
assert.ok(registry.includes("open-learning-v2-authoring-preview"));
assert.ok(hub.includes("LEARNING_V2_AUTHORING_PREVIEW_ROUTE"));
assert.ok(guard.includes("__DEV__ && !IS_STORE_RELEASE"));
// зачем (координатор §47, 2026-10-01): по D150 эталон урока 1 — встроенный релиз;
// dev-просмотр перечисляет занятия каталога factory_native, а не авторский реестр.
assert.ok(screen.includes("factoryNativeLearningV2AvailabilityV1"));
assert.ok(screen.includes('previewMode: "authoring_v1"'));
assert.ok(screen.includes('runtimeMode: "direct_v1"'));
assert.ok(screen.includes("FlatList"));
assert.ok(screen.includes('accessibilityRole="button"'));

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW ROUTE: PASS\n");
}

if (typeof test === "function") {
  test("learning_v2_authoring_device_preview_route", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
