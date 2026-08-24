import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { require as tsxRequire } from "tsx/cjs/api";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function currentLesson1AuthoringPreflight() {
  const registryModule = tsxRequire(
    resolve(
      ROOT,
      "modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts",
    ),
    import.meta.url,
  );
  const sourceModule = tsxRequire(
    resolve(ROOT, "modules/learning-v2/content/source/authored_sessions_v1.ts"),
    import.meta.url,
  );
  const qualityModule = tsxRequire(
    resolve(
      ROOT,
      "modules/learning-v2/content/source/learning_content_quality_gate_v1.ts",
    ),
    import.meta.url,
  );
  const actualFingerprints = Object.fromEntries(
    sourceModule.AUTHORED_EPISODE_01_SESSIONS.map((source) => [
      source.requiredSessionOrdinal,
      qualityModule.learningV2SessionContentFingerprint(source),
    ]),
  );
  return registryModule.lesson1AuthoringPreflightV1(
    undefined,
    actualFingerprints,
  );
}

export function assertLesson1ReviewScope(to) {
  const preflight = currentLesson1AuthoringPreflight();
  if (
    preflight.currentSessionOrdinal !== null &&
    to > preflight.currentSessionOrdinal
  ) {
    throw new Error(
      `lesson1_review_out_of_order:requestedThrough=${to}:current=${preflight.currentSessionOrdinal}:lockedThrough=${preflight.lockedThrough}`,
    );
  }
  return preflight;
}
