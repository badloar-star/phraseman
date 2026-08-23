import assert from "node:assert/strict";
import {
  authoringRegistryForTargetLanguage,
  isV2AuthoringTargetLanguage,
  lesson1AuthoringPreflightV1,
  V2_AUTHORING_TARGET_LANGUAGES,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";

assert.ok(isV2AuthoringTargetLanguage("en"));
assert.ok(isV2AuthoringTargetLanguage("es"));
assert.ok(!isV2AuthoringTargetLanguage("fr"));
assert.deepEqual([...V2_AUTHORING_TARGET_LANGUAGES], ["en", "es"]);

const esRegistry = authoringRegistryForTargetLanguage("es");
assert.equal(esRegistry.length, 56);
assert.ok(esRegistry.every((entry) => entry.status === "DRAFT"));

// зачем null, а не {}: canonicalJsonV1 (тот же hashCanonicalBody, что внутри
// lesson1AuthoringPreflightV1) fail-closed отклоняет undefined как значение.
// Реальный испанский коллектор фингерпринтов (Task 2 плана) обязан отдавать
// null для ещё не написанных сессий, а не пропускать ключ — иначе преflight
// испанского курса будет падать на canonical_json_non_json_value для любого
// диапазона с недостающими ключами, что и произошло здесь при первой попытке.
const esActualFingerprints: Readonly<Record<number, string | null>> =
  Object.freeze(
    Object.fromEntries(Array.from({ length: 56 }, (_, index) => [index + 1, null])),
  );

const esPreflight = lesson1AuthoringPreflightV1(
  undefined,
  esActualFingerprints,
  esRegistry,
);
assert.deepEqual(esPreflight, {
  lockedThrough: 0,
  currentSessionOrdinal: 1,
  forbiddenFrom: 2,
});

process.stdout.write("LEARNING V2 AUTHORING REGISTRY MULTILANG GATE: PASS\n");
