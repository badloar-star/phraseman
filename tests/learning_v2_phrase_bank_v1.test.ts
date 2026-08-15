import { buildLearningV2PhraseBankV1 } from "../modules/learning-v2/content/phrase_bank_v1";
import { EN_LESSON_01_PHRASES_V1 } from "../modules/learning-v2/content/banks/en_lesson_01_v1";
import { EN_LESSON_02_PHRASES_V1 } from "../modules/learning-v2/content/banks/en_lesson_02_v1";
import { EN_LESSON_03_PHRASES_V1 } from "../modules/learning-v2/content/banks/en_lesson_03_v1";
import { EN_LESSON_04_PHRASES_V1 } from "../modules/learning-v2/content/banks/en_lesson_04_v1";
import { EN_LESSON_05_PHRASES_V1 } from "../modules/learning-v2/content/banks/en_lesson_05_v1";
import { ES_LESSON_01_PHRASES_V1 } from "../modules/learning-v2/content/banks/es_lesson_01_v1";
import { ES_LESSON_02_PHRASES_V1 } from "../modules/learning-v2/content/banks/es_lesson_02_v1";
import { ES_LESSON_03_PHRASES_V1 } from "../modules/learning-v2/content/banks/es_lesson_03_v1";
import { LEARNING_V2_COURSE_PLAN_V1 } from "../modules/learning-v2/content/course_plan_v1";

/**
 * зачем: фразы приходят от генерирующего агента. Он может ошибиться в
 * частотности, привязать фразу к чужому компоненту или выдать дубликат.
 * Здесь материал судится независимо от того, кто его написал.
 */

const LESSON_1 = LEARNING_V2_COURSE_PLAN_V1[0]!;

function bank(phrases = EN_LESSON_01_PHRASES_V1) {
  return buildLearningV2PhraseBankV1({
    lessonOrdinal: 1,
    targetLanguage: "en-US",
    objectiveComponents: LESSON_1.objectiveComponents,
    phrases,
  });
}

describe("Learning V2 phrase bank — English lesson 1", () => {
  test("the real bank passes both structural and evidence gates", () => {
    const result = bank();
    expect(result.structuralIssues.filter((i) => i.severity === "blocker")).toHaveLength(0);
    expect(result.structuralIssues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(result.evidenceReport.blockerCount).toBe(0);
    expect(result.evidenceReport.errorCount).toBe(0);
    expect(result.verdict).toBe("eligible_for_human_review");
  });

  test("R1 holds: every phrase reaches a production task", () => {
    // Иначе ученик узнаёт фразу среди вариантов, но не может её произнести.
    expect(bank().evidenceReport.productionCoveragePercent).toBe(100);
  });

  test("vocabulary stays inside the high-frequency band", () => {
    const result = bank();
    // Nation 2006: 2000 частотных семейств дают ~90% повседневного текста.
    expect(result.evidenceReport.highFrequencySharePercent).toBeGreaterThanOrEqual(
      80,
    );
  });

  test("the set is built from real chunks, not assembled constructions", () => {
    expect(bank().evidenceReport.formulaicSharePercent).toBeGreaterThanOrEqual(90);
  });

  test("every objective component of lesson 1 is actually served", () => {
    const result = bank();
    for (const component of LESSON_1.objectiveComponents) {
      expect(result.componentCoverage[component]).toBeGreaterThan(0);
    }
  });

  test("every phrase is practised in at least two contexts", () => {
    for (const phrase of EN_LESSON_01_PHRASES_V1) {
      expect(phrase.contexts.length).toBeGreaterThanOrEqual(2);
    }
    expect(
      bank().evidenceReport.findings.filter((f) => f.ruleId === "R5_context_bound"),
    ).toHaveLength(0);
  });

  test("phrases are short enough for a beginner to say out loud", () => {
    const tooLong = bank().structuralIssues.filter(
      (i) => i.code === "phrase_too_long_for_level",
    );
    expect(tooLong).toHaveLength(0);
  });

  test("a phrase pointing at an unknown component is a blocker", () => {
    const broken = [
      { ...EN_LESSON_01_PHRASES_V1[0]!, component: "выдуманный компонент" },
      ...EN_LESSON_01_PHRASES_V1.slice(1),
    ];
    const result = bank(broken);
    expect(
      result.structuralIssues.some(
        (i) => i.code === "unknown_objective_component" && i.severity === "blocker",
      ),
    ).toBe(true);
    expect(result.verdict).toBe("blocked");
  });

  test("a duplicated phrase is caught rather than padding the count", () => {
    const padded = [
      ...EN_LESSON_01_PHRASES_V1,
      { ...EN_LESSON_01_PHRASES_V1[0]!, id: "en-l1-dup" },
    ];
    expect(
      bank(padded).structuralIssues.some((i) => i.code === "duplicate_phrase"),
    ).toBe(true);
  });

  test("an untranslated phrase is caught", () => {
    const untranslated = [
      { ...EN_LESSON_01_PHRASES_V1[0]!, ru: EN_LESSON_01_PHRASES_V1[0]!.text },
      ...EN_LESSON_01_PHRASES_V1.slice(1),
    ];
    expect(
      bank(untranslated).structuralIssues.some(
        (i) => i.code === "translation_missing",
      ),
    ).toBe(true);
  });

  test("the machine still cannot approve the bank", () => {
    expect(bank().approvalAuthority).toBe("owner_only_machine_cannot_approve");
  });
});

/**
 * зачем: каждый новый банк обязан пройти те же гейты, что и первый. Иначе
 * качество держится только на первом уроке, а дальше сползает.
 */
describe("Learning V2 phrase banks — every shipped lesson", () => {
  const SHIPPED = [
    { lessonOrdinal: 1, language: "en-US", phrases: EN_LESSON_01_PHRASES_V1 },
    { lessonOrdinal: 2, language: "en-US", phrases: EN_LESSON_02_PHRASES_V1 },
    { lessonOrdinal: 3, language: "en-US", phrases: EN_LESSON_03_PHRASES_V1 },
    { lessonOrdinal: 4, language: "en-US", phrases: EN_LESSON_04_PHRASES_V1 },
    { lessonOrdinal: 5, language: "en-US", phrases: EN_LESSON_05_PHRASES_V1 },
    { lessonOrdinal: 1, language: "es-ES", phrases: ES_LESSON_01_PHRASES_V1 },
    { lessonOrdinal: 2, language: "es-ES", phrases: ES_LESSON_02_PHRASES_V1 },
    { lessonOrdinal: 3, language: "es-ES", phrases: ES_LESSON_03_PHRASES_V1 },
  ] as const;

  for (const shipped of SHIPPED) {
    const label = `${shipped.language} lesson ${shipped.lessonOrdinal}`;

    test(`${label} passes every gate`, () => {
      const lesson = LEARNING_V2_COURSE_PLAN_V1[shipped.lessonOrdinal - 1]!;
      const result = buildLearningV2PhraseBankV1({
        lessonOrdinal: shipped.lessonOrdinal,
        targetLanguage: shipped.language,
        objectiveComponents: lesson.objectiveComponents,
        phrases: shipped.phrases,
      });

      expect(result.structuralIssues.filter((i) => i.severity === "blocker")).toEqual([]);
      expect(result.structuralIssues.filter((i) => i.severity === "error")).toEqual([]);
      expect(result.evidenceReport.blockerCount).toBe(0);
      expect(result.evidenceReport.errorCount).toBe(0);
      expect(result.verdict).toBe("eligible_for_human_review");

      // Каждый компонент цели урока реально обслуживается.
      for (const component of lesson.objectiveComponents) {
        expect(result.componentCoverage[component]).toBeGreaterThan(0);
      }
    });

    test(`${label} has no duplicate Russian translations`, () => {
      // Одинаковый перевод у двух разных фраз ломает обратную проверку:
      // приложение засчитает верный ответ как ошибку.
      const seen = new Map<string, string>();
      for (const phrase of shipped.phrases) {
        const key = phrase.ru.trim().toLowerCase();
        const clash = seen.get(key);
        expect(clash).toBeUndefined();
        seen.set(key, phrase.id);
      }
    });
  }

  test("Spanish lesson 1 teaches ser vs estar correctly", () => {
    const byId = new Map(ES_LESSON_01_PHRASES_V1.map((p) => [p.id, p]));
    // Происхождение — ser.
    expect(byId.get("es-l1-13")!.text).toContain("Soy de");
    expect(byId.get("es-l1-14")!.text).toContain("Soy de");
    // Временное состояние — estar.
    expect(byId.get("es-l1-11")!.text).toContain("Estoy de");
  });

  test("Spanish lesson 1 gives both tú and usted, and both speaker genders", () => {
    const texts = ES_LESSON_01_PHRASES_V1.map((p) => p.text);
    expect(texts).toContain("¿Cómo te llamas?");
    expect(texts).toContain("¿Cómo se llama usted?");
    // Иначе женщину научили бы говорить о себе в мужском роде.
    expect(texts).toContain("Encantada");
    expect(texts).toContain("Encantado");
  });
});
