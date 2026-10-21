// зачем (словарь V2, владелец 21.10; макет dictionary-v2.html вариант A): сторож проводки нового словаря — тренировка идёт
// через лист режимов «Карточек» и колоду lv2, сохранение — через хук с «Отменить», все четыре режима понимают колоду,
// монеты — за флагом, dev-маршрут вырезан из сборки для стора, старый оверлей не тронут.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { learningV2DictionaryV2Copy } from "../components/learning-v2/learning_v2_dictionary_v2_copy";

const read = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");
const screen = read("components/learning-v2/LearningV2DictionaryV2.tsx");
const hook = read("hooks/use_learning_v2_dictionary_save_v1.ts");

describe("Learning V2 dictionary V2 wiring", () => {
  test("training: Cards mode sheet → lv2 deck → Cards route after the sheet is gone", () => {
    expect(screen).toContain("<FlashcardsTrainingModeSheet");
    expect(screen).toContain("putLearningV2DictionaryTrainingDeckV1(");
    expect(screen).toContain("buildCardsTrainingRoute(mode, [token as `lv2:${string}`])");
    expect(screen).toContain("onDismissed={onModeSheetDismissed}");
  });

  test("saving: optimistic set, undo toast, rollback with reason, limit opens Plus", () => {
    expect(screen).toContain('testID="learning-v2-dict-undo"');
    expect(hook).toContain("setMany(ids, true);");
    expect(hook).toContain("${LOG} save_rollback");
    expect(hook).toContain("onLimitReached();");
    expect(hook).toContain("inFlightRef.current.has(word.lexicalItemId)");
  });

  test("all four Cards modes understand the dictionary deck and gate coins by the flag", () => {
    for (const file of ["app/flashcards_blitz_session.tsx", "app/flashcards_speaking_session.tsx", "app/flashcards_recall_session.tsx", "app/flashcards_swipe.tsx"]) {
      expect(read(file)).toContain("practiceCoinsAllowedForDeckKeysV1(");
    }
    expect(read("app/flashcards/deck_sources.ts")).toContain("loadLearningV2DictionaryTrainingDeckV1(deck.deckId, lang)");
    expect(read("app/flashcards_swipe.tsx")).toContain("kind: 'lv2',");
    expect(read("app/flashcards_swipe_session.ts")).toContain("if (source.kind === 'lv2')");
  });

  test("dev route exists for Sverka and is cut from store builds; old overlay stays", () => {
    expect(read("app/dev_learning_v2_dictionary_v2.tsx")).toContain("!ENABLE_DEV_TOOLS || IS_STORE_RELEASE");
    expect(read("router.ctx.js")).toMatch(/\|dev_learning_v2_dictionary_v2[|)]/u);
    expect(read("app/(tabs)/lessons.tsx")).toContain("<LearningV2LessonDictionaryOverlayV1");
  });

  test("copy: Russian matches the mockup, plurals are right", () => {
    const ru = learningV2DictionaryV2Copy("ru");
    expect(ru.summary(269, 2)).toBe("269 слов · 2 урока");
    expect(ru.lessonSummary(2, 44)).toBe("Урок 2 · 44 слова");
    expect(ru.train(269)).toBe("Тренировать · 269 слов");
    expect(ru.trainShort(6)).toBe("Тренировать · 6");
    expect(ru.saveMany(6)).toBe("В карточки · 6");
    expect(ru.selectAll(225)).toBe("Выбрать все 225");
    expect(ru.showWords(269)).toBe("Показать 269 слов");
    expect(ru.toastOne("busy")).toBe("busy теперь в «Карточках»");
    expect(ru.toastMany(6)).toBe("6 слов теперь в «Карточках»");
    expect(ru.selected(6)).toBe("Выбрано 6");
    expect(learningV2DictionaryV2Copy("en").summary(1, 1)).toBe("1 word · 1 lesson");
  });
});
