// зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): игрок видит только занятия V2, которые реально
// собираются из бандла. Этот тест — и генератор, и сторож согласованности:
//  • обычный прогон: КАЖДОЕ занятие внутри выпущенного префикса (артефакт) обязано собираться — иначе красный (тупик
//    «Сессия недоступна» у игрока). Остальные — справка со счётчиком [V2-AVAILABILITY].
//  • PHRASEMAN_ALLOW_SOURCE_WRITES=1 UPDATE_LEARNING_V2_AVAILABILITY=1 — переписывает
//    app/learning_v2_bundle_availability_v1.generated.ts по факту (тот же проход, что learning_v2_lesson1_bundle_builds).
// Префикс, а не «все собирающиеся»: прогресс курса — непрерывная цепочка (app/learning_v2_session_availability_v1.ts).
jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));

/* eslint-disable import/first -- native/transport seams are mocked first */
import fs from "node:fs";
import path from "node:path";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import { FACTORY_NATIVE_MANIFEST_V1 } from "../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated";
import {
  LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1,
} from "../app/learning_v2_bundle_availability_v1.generated";
import {
  isLearningV2SessionReleasedV1,
  lastLearningV2ReleasedLessonOrdinalV1,
  learningV2SessionCourseIndexV1,
} from "../app/learning_v2_session_availability_v1";

const LOG = "[V2-AVAILABILITY]";
const ARTIFACT = path.join(__dirname, "..", "app", "learning_v2_bundle_availability_v1.generated.ts");

type Verdict = Readonly<{ lessonOrdinal: number; sessionOrdinal: number; index: number; built: boolean; reason: string }>;

const locatorFor = (lessonOrdinal: number, sessionOrdinal: number) => ({
  environment: "production" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  lessonOrdinal,
  sessionOrdinal,
});

function buildVerdict(lessonOrdinal: number, sessionOrdinal: number): Verdict {
  const index = learningV2SessionCourseIndexV1(lessonOrdinal, sessionOrdinal);
  const missing: string[] = [];
  const spy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const line = String(args[0]);
    if (line.includes("[V2-BUNDLED] audio_entry_missing")) missing.push(line.replace("[V2-BUNDLED] audio_entry_missing ", ""));
  });
  try {
    const material = bundledLearningV2CourseSessionMaterialV3(locatorFor(lessonOrdinal, sessionOrdinal) as never);
    if (material === null) return { lessonOrdinal, sessionOrdinal, index, built: false, reason: missing[0] ? `audio_missing ${missing[0]}` : "material_null" };
    if (missing.length > 0) return { lessonOrdinal, sessionOrdinal, index, built: false, reason: `audio_missing ${missing[0]}` };
    return { lessonOrdinal, sessionOrdinal, index, built: true, reason: "ok" };
  } catch (error) {
    return { lessonOrdinal, sessionOrdinal, index, built: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    spy.mockRestore();
  }
}

/** Длина непрерывного префикса собирающихся занятий в порядке курса. */
function contiguousCeiling(verdicts: readonly Verdict[]): number {
  const byIndex = new Map(verdicts.map((verdict) => [verdict.index, verdict]));
  let ceiling = 0;
  while (byIndex.get(ceiling)?.built === true) ceiling += 1;
  return ceiling;
}

describe("Learning V2 — показываем только то, что открывается", () => {
  test("слой доступности: префикс, граница урока, пустое множество", () => {
    expect(learningV2SessionCourseIndexV1(1, 1)).toBe(0);
    expect(learningV2SessionCourseIndexV1(2, 1)).toBe(56);
    expect(learningV2SessionCourseIndexV1(1, 57)).toBe(-1);
    expect(learningV2SessionCourseIndexV1(0, 1)).toBe(-1);
    // пустое множество: ничего не выпущено, урока для показа нет
    expect(isLearningV2SessionReleasedV1(1, 1, 0)).toBe(false);
    expect(lastLearningV2ReleasedLessonOrdinalV1(0)).toBe(0);
    // префикс 58: весь урок 1 и первые 2 занятия урока 2
    expect(isLearningV2SessionReleasedV1(1, 56, 58)).toBe(true);
    expect(isLearningV2SessionReleasedV1(2, 2, 58)).toBe(true);
    expect(isLearningV2SessionReleasedV1(2, 3, 58)).toBe(false);
    expect(lastLearningV2ReleasedLessonOrdinalV1(58)).toBe(2);
    expect(lastLearningV2ReleasedLessonOrdinalV1(56)).toBe(1);
  });

  test("префикс считается по порядку курса и обрывается на первой дыре", () => {
    const v = (index: number, built: boolean): Verdict => ({ lessonOrdinal: 1, sessionOrdinal: index + 1, index, built, reason: built ? "ok" : "x" });
    expect(contiguousCeiling([v(0, true), v(1, true), v(2, false), v(3, true)])).toBe(2);
    expect(contiguousCeiling([v(0, false), v(1, true)])).toBe(0);
    expect(contiguousCeiling([v(1, true), v(0, true)])).toBe(2);
    expect(contiguousCeiling([])).toBe(0);
  });

  test("каждое выпущенное занятие собирается из бандла (артефакт согласован с контентом)", () => {
    const rows = [...FACTORY_NATIVE_MANIFEST_V1].sort((a, b) => a.lessonOrdinal - b.lessonOrdinal || a.sessionOrdinal - b.sessionOrdinal);
    const verdicts = rows.map((row) => buildVerdict(row.lessonOrdinal, row.sessionOrdinal));
    const ceiling = contiguousCeiling(verdicts);
    const buildable = verdicts.filter((verdict) => verdict.built).length;
    const unavailable = verdicts.filter((verdict) => !verdict.built);
    const reasons: Record<string, number> = {};
    for (const verdict of unavailable) {
      const kind = verdict.reason.split(" ")[0] ?? "unknown";
      reasons[kind] = (reasons[kind] ?? 0) + 1;
    }
    console.log(`${LOG} advisory ${JSON.stringify({
      manifest: rows.length,
      buildable,
      contiguousCeiling: ceiling,
      releasedByArtifact: LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1,
      unavailable: unavailable.length,
      reasons,
      firstUnavailable: unavailable.slice(0, 5).map((verdict) => `l${verdict.lessonOrdinal}s${verdict.sessionOrdinal}: ${verdict.reason.slice(0, 120)}`),
    })}`);

    if (process.env.UPDATE_LEARNING_V2_AVAILABILITY === "1") {
      // зачем (координатор 15.10 ночь): сторож считает всё, что собирается подряд (145), а выпускать решает владелец
      // (урок 1 — 56). Предел только УМЕНЬШАЕТ потолок и никогда не открывает несобирающееся.
      const cap = Number(process.env.LEARNING_V2_AVAILABILITY_CAP ?? "");
      const written = Number.isInteger(cap) && cap > 0 ? Math.min(ceiling, cap) : ceiling;
      if (written !== ceiling) console.log(`${LOG} cap ${JSON.stringify({ counted: ceiling, cap, written })}`);
      const body = [
        "/* Generated by tests/learning_v2_bundle_availability.test.ts — do not edit by hand. */",
        "/* Regenerate: PHRASEMAN_ALLOW_SOURCE_WRITES=1 UPDATE_LEARNING_V2_AVAILABILITY=1 npm run test:one -- tests/learning_v2_bundle_availability.test.ts */",
        "/** Сколько занятий с начала курса (урок 1 занятие 1) подряд собираются из бандла. */",
        `export const LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = ${written};`,
        "/** Сколько строк манифеста собираются вообще (справка). */",
        `export const LEARNING_V2_BUNDLE_BUILDABLE_TOTAL_V1 = ${buildable};`,
        "/** Сколько строк в манифесте фабрики (справка). */",
        `export const LEARNING_V2_BUNDLE_MANIFEST_TOTAL_V1 = ${rows.length};`,
        "",
      ].join("\n");
      fs.writeFileSync(ARTIFACT, body, "utf8");
      console.log(`${LOG} artifact written ${JSON.stringify({ ceiling: written, counted: ceiling, buildable, manifest: rows.length })}`);
      return;
    }

    if (ceiling > LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1) {
      console.warn(`${LOG} можно выпустить больше: собираются ${ceiling} подряд, выпущено ${LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1} — перегенерируй артефакт`);
    }
    // Красный только если в ВЫПУЩЕННОЕ множество попало занятие, которое не собирается.
    const brokenReleased = verdicts
      .filter((verdict) => verdict.index < LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 && !verdict.built)
      .map((verdict) => `l${verdict.lessonOrdinal}s${verdict.sessionOrdinal}: ${verdict.reason.slice(0, 160)}`);
    const missingReleased = Array.from({ length: LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 }, (_, index) => index)
      .filter((index) => !verdicts.some((verdict) => verdict.index === index));
    expect({ brokenReleased, missingReleased }).toEqual({ brokenReleased: [], missingReleased: [] });
  });
});
