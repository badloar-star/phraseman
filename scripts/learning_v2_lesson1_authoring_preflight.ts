import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { allAuthoredEsEpisode01Sessions } from "../modules/learning-v2/content/source/es_authored_sessions_v1";
import {
  authoringRegistryForTargetLanguage,
  isV2AuthoringTargetLanguage,
  lesson1AuthoringPreflightV1,
  type V2AuthoringTargetLanguage,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";

function readRequestedSessionOrdinal(
  argv: readonly string[],
): number | undefined {
  const sessionFlagIndex = argv.indexOf("--session");
  if (sessionFlagIndex === -1) return undefined;
  const raw = sessionFlagIndex === -1 ? undefined : argv[sessionFlagIndex + 1];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 56) {
    throw new Error(
      "lesson1_authoring_session_argument_invalid: use --session <1..56>",
    );
  }
  return parsed;
}

// зачем: параллельный испанский контур (владелец, 2026-08-23) читает тот же
// CLI с флагом --target; по умолчанию 'en' — старые вызовы без флага ведут
// себя как раньше, байт в байт.
function readTargetLanguage(argv: readonly string[]): V2AuthoringTargetLanguage {
  const targetFlagIndex = argv.indexOf("--target");
  if (targetFlagIndex === -1) return "en";
  const raw = argv[targetFlagIndex + 1];
  if (!isV2AuthoringTargetLanguage(raw)) {
    throw new Error(
      `lesson1_authoring_target_argument_invalid: use --target <en|es>, got ${String(raw)}`,
    );
  }
  return raw;
}

// зачем испанская ветка читает allAuthoredEsEpisode01Sessions (владелец,
// 2026-08-24, "добавь язык везде, где сейчас только номер сессии"): раньше
// эта функция была захардкожена вернуть null для ЛЮБОГО targetLanguage кроме
// "en" — испанский контур физически не мог получить LOCKED-статус, потому
// что actualFingerprints[1] всегда был null и assertRegistryShape отвергал
// бы любой lockedFingerprint как расхождение. Испанская сессия 1 теперь даёт
// реальный отпечаток той же функцией, что и английская (learningV2Session-
// ContentFingerprint = hashCanonicalBody(source), языконезависимая).
function actualFingerprints(
  targetLanguage: V2AuthoringTargetLanguage,
): Readonly<Record<number, string | null>> {
  // зачем null, а не пропуск ключа: canonicalJsonV1 внутри preflight
  // fail-closed отклоняет undefined как значение (см. тест
  // learning_v2_authoring_registry_multilang_gate.ts) — каждая из 56 позиций
  // обязана присутствовать явно, даже когда контента ещё нет.
  const base = Object.fromEntries(
    Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
  );
  if (targetLanguage === "en") {
    for (const source of AUTHORED_EPISODE_01_SESSIONS) {
      base[source.requiredSessionOrdinal] = learningV2SessionContentFingerprint(source);
    }
    return Object.freeze(base);
  }
  if (targetLanguage === "es") {
    for (const source of allAuthoredEsEpisode01Sessions()) {
      base[source.requiredSessionOrdinal] = learningV2SessionContentFingerprint(source);
    }
    return Object.freeze(base);
  }
  return Object.freeze(base);
}

function rangeLabel(from: number | null, to: number): string {
  if (from === null || from > to) return "none";
  return from === to ? String(from) : `${from}-${to}`;
}

function main(): void {
  const argv = process.argv.slice(2);
  const requestedSessionOrdinal = readRequestedSessionOrdinal(argv);
  const targetLanguage = readTargetLanguage(argv);
  const registry = authoringRegistryForTargetLanguage(targetLanguage);
  const preflight = lesson1AuthoringPreflightV1(
    requestedSessionOrdinal,
    actualFingerprints(targetLanguage),
    registry,
  );
  const currentEntry = registry.find(
    (entry) => entry.sessionOrdinal === preflight.currentSessionOrdinal,
  );

  process.stdout.write(
    [
      "LESSON 1 AUTHORING PREFLIGHT: PASS",
      `TARGET: ${targetLanguage}`,
      `LOCKED: ${rangeLabel(preflight.lockedThrough > 0 ? 1 : null, preflight.lockedThrough)}`,
      `CURRENT: ${preflight.currentSessionOrdinal ?? "none"}`,
      `CURRENT STATUS: ${currentEntry?.status ?? "COMPLETE"}`,
      `FORBIDDEN: ${rangeLabel(preflight.forbiddenFrom, 56)}`,
      `REQUESTED: ${requestedSessionOrdinal ?? "status-only"}`,
    ].join("\n") + "\n",
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`LESSON 1 AUTHORING PREFLIGHT: HOLD\n${message}\n`);
  process.exitCode = 1;
}
