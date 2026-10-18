// зачем (D149/D150, координатор 2026-10-01): эталон урока 1 — встроенный релиз
// (factory_native); его видят люди. Набор раньше проверял авторский конвейер по
// старому контракту «12 карточек» и падал на расхождениях авторского урока с
// релизом. Теперь он сверяет фактические карточки новых слов релиза.
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import { materializeFactoryNativeLearningV2SessionV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";

type Encounter = Readonly<{
  lexicalItemId: string;
  transcription: string | null;
  playfulMeaningByLocale: Readonly<Record<string, string>>;
  motionVariant: string;
  presentation: string;
  dismissal: string;
  saveControl: string;
  orderWithinSession: number;
  save: Readonly<{ targetLanguage: string; targetText: string; meaningByLocale: Readonly<Record<string, string>> }>;
}>;

const FORBIDDEN_META_TEMPLATE =
  /^(?:вс[ёе] сделано|можно начинать|так описывают|это слово означает|так говорят, когда)/iu;

function releasedEncounters(sessionOrdinal: number): readonly Encounter[] {
  const material = materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal,
    interfaceLocale: "ru",
  });
  if (!material) throw new Error(`released_session_missing:${sessionOrdinal}`);
  return Object.values(material.wordEncounterQueuesByInteractionId)
    .flatMap((queue) => queue as unknown as readonly Encounter[]);
}

describe("Learning V2 new-word encounters of the bundled lesson 1 release", () => {
  test("session 1 introduces here, ready, fine, happy as blocking word cards in order", () => {
    const encounters = releasedEncounters(1);
    expect(encounters.map((entry) => entry.save.targetText)).toEqual(["here", "ready", "fine", "happy"]);
    expect(encounters.map((entry) => entry.orderWithinSession)).toEqual([1, 2, 3, 4]);
    expect(encounters.map((entry) => entry.motionVariant)).toEqual([
      "lesson_hero_b", "premium_a", "lesson_hero_b", "premium_a",
    ]);
    for (const entry of encounters) {
      expect(entry).toMatchObject({
        presentation: "blocking_task_overlay",
        dismissal: "continue_only",
        saveControl: "bookmark_icon",
        save: { targetLanguage: "en" },
      });
      expect(entry.lexicalItemId).toMatch(/^lexical-en-[0-9a-f]{32}$/u);
    }
  });

  test("every released session numbers its word cards 1..n with unique lexical items", () => {
    let total = 0;
    for (let ordinal = 1; ordinal <= 56; ordinal += 1) {
      const encounters = releasedEncounters(ordinal);
      total += encounters.length;
      expect(encounters.map((entry) => entry.orderWithinSession)).toEqual(
        encounters.map((_entry, index) => index + 1),
      );
      expect(new Set(encounters.map((entry) => entry.lexicalItemId)).size).toBe(encounters.length);
      for (const entry of encounters) expect(entry.save.targetText.trim()).not.toBe("");
    }
    // зачем (18.10, класс А): было 198 (выпуск 01.10). Урок 1 переписан по правилу владельца 16.10 «≥4 новых слова,
    // у каждого своя карточка» (перенос fd447f448 и следующие) — теперь 225 карточек на 56 занятий.
    expect(total).toBe(225);
  });

  test("ships learner-safe meanings for every active locale (transcription from the project dictionary)", () => {
    const covered = new Set<string>();
    const all = new Set<string>();
    for (let ordinal = 1; ordinal <= 56; ordinal += 1) {
      for (const encounter of releasedEncounters(ordinal)) {
        // зачем: транскрипция — из словаря проекта; где словарь не уверен,
        // поле null (карточка без транскрипции), выдумки быть не может.
        all.add(encounter.save.targetText);
        if (encounter.transcription === null) continue;
        expect(encounter.transcription).toMatch(/^\/[^/]+\/$/u);
        covered.add(encounter.save.targetText);
      }
    }
    // Покрытие фиксируем числом, чтобы рост/потеря были замечены осознанно.
    // зачем (18.10, класс А): после переписывания урока 1 (≥4 новых слова) слов 225, транскрипция из словаря у 99;
    // без транскрипции карточка показывается без неё (ничего не выдумываем). Было [91, 130] на выпуске 01.10.
    expect([covered.size, all.size]).toEqual([99, 225]);
  });

  test("ships learner-safe meanings for every active locale", () => {
    for (let ordinal = 1; ordinal <= 56; ordinal += 1) {
      for (const encounter of releasedEncounters(ordinal)) {
        expect(Object.keys(encounter.save.meaningByLocale)).toEqual(LEARNING_V2_INTERFACE_LOCALES);
        expect(Object.keys(encounter.playfulMeaningByLocale)).toEqual(LEARNING_V2_INTERFACE_LOCALES);
        for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
          const copy = encounter.playfulMeaningByLocale[locale]?.trim();
          expect(copy).toBeTruthy();
          expect(copy).not.toMatch(FORBIDDEN_META_TEMPLATE);
        }
        expect(JSON.stringify(encounter)).not.toMatch(/image|illustration|rarity|reward|mastery/iu);
      }
    }
  });
});
