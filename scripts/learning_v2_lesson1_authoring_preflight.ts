import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  authoringRegistryForTargetLanguage,
  isV2AuthoringTargetLanguage,
  lesson1AuthoringPreflightV1,
  type V2AuthoringTargetLanguage,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { assertLearningV2CurrentSessionIntegrityV1 } from "./learning_v2_current_session_integrity_gate";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const SOURCE_DIRECTORY = join(
  __dirname,
  "../modules/learning-v2/content/source",
);

function forbiddenEnglishSessionFilesFingerprint(sessionOrdinal: number): string {
  const padded = String(sessionOrdinal).padStart(2, "0");
  const prefix = `episode_01_session_${padded}`;
  const files = readdirSync(SOURCE_DIRECTORY)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".ts"))
    .sort();
  if (files.length === 0) {
    return hashCanonicalBody([]);
  }
  return hashCanonicalBody(
    files.map((name) => [
      name,
      createHash("sha256")
        .update(readFileSync(join(SOURCE_DIRECTORY, name)))
        .digest("hex"),
    ]),
  );
}

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
  visibleSessionOrdinals: ReadonlySet<number>,
): Readonly<Record<number, string | null>> {
  // зачем null, а не пропуск ключа: canonicalJsonV1 внутри preflight
  // fail-closed отклоняет undefined как значение (см. тест
  // learning_v2_authoring_registry_multilang_gate.ts) — каждая из 56 позиций
  // обязана присутствовать явно, даже когда контента ещё нет.
  const base = Object.fromEntries(
    Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
  );
  if (targetLanguage === "en") {
    for (let sessionOrdinal = 1; sessionOrdinal <= 56; sessionOrdinal += 1) {
      if (visibleSessionOrdinals.has(sessionOrdinal)) {
        const source = authoredLearningV2SessionSource(sessionOrdinal);
        if (source) {
          base[source.requiredSessionOrdinal] = learningV2SessionContentFingerprint(source);
        }
      } else {
        base[sessionOrdinal] = forbiddenEnglishSessionFilesFingerprint(sessionOrdinal);
      }
    }
    return Object.freeze(base);
  }
  if (targetLanguage === "es") {
    // зачем lazy require: английский и испанский authoring-контуры обязаны
    // проходить preflight независимо. Испанский source может подключать свои
    // DEV/runtime зависимости; английская проверка не должна загружать их и
    // падать внутри Node CLI до чтения собственного реестра.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { allAuthoredEsEpisode01Sessions } = require(
      "../modules/learning-v2/content/source/es_authored_sessions_v1"
    ) as typeof import("../modules/learning-v2/content/source/es_authored_sessions_v1");
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
  const currentSessionOrdinal = registry.find(
    (entry) => entry.status !== "LOCKED",
  )?.sessionOrdinal;
  const visibleSessionOrdinals = new Set(
    registry
      .filter(
        (entry) =>
          entry.status === "LOCKED" ||
          entry.sessionOrdinal === currentSessionOrdinal,
      )
      .map((entry) => entry.sessionOrdinal),
  );
  const preflight = lesson1AuthoringPreflightV1(
    requestedSessionOrdinal,
    actualFingerprints(targetLanguage, visibleSessionOrdinals),
    registry,
  );
  if (targetLanguage === "en" && requestedSessionOrdinal !== undefined) {
    assertLearningV2CurrentSessionIntegrityV1(requestedSessionOrdinal);
  }
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
