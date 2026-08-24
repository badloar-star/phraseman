import { introPartRole } from "../app/learning_v2_intro_semantic_bridge";
import { LESSON_3_INTRO_SCREENS } from "../app/lesson_intro_screens_lesson3_v2";

// зачем: аудит 2026-08-23 — поле `semantic` отсутствует во ВСЁМ контенте
// (0 из 17 578 частей), поэтому Learning V2 терял 61,5% разметки. Эти тесты
// работают на НАСТОЯЩИХ уроках, а не на самодельных фикстурах: именно
// синтетические данные позволили багу дожить до продакшена.

describe("цвет текста выводится из устаревшей разметки tone", () => {
  const cyrillic = true;

  test("ошибочный пример всегда помечается как неверный", () => {
    // 613 частей danger во всём контенте, 100% латиница.
    expect(introPartRole({ text: "I am work here", tone: "danger" }, cyrillic))
      .toBe("targetWrong");
  });

  test("английское слово с accent — это изучаемый язык", () => {
    expect(introPartRole({ text: "work", tone: "accent" }, cyrillic)).toBe("target");
  });

  test("русский термин с accent НЕ выдаётся за изучаемый язык", () => {
    // Реальные случаи из контента: «фразовый глагол», «частица», «действие».
    expect(introPartRole({ text: "фразовый глагол", tone: "accent" }, cyrillic))
      .toBe("emphasis");
  });

  test("служебные маркеры сохраняют свою роль", () => {
    expect(introPartRole({ text: "Правильно: ", tone: "success" }, cyrillic))
      .toBe("markerCorrect");
    expect(introPartRole({ text: "Не так: ", tone: "warning" }, cyrillic))
      .toBe("markerWarning");
  });

  test("новая разметка semantic, если появится, главнее моста", () => {
    expect(
      introPartRole(
        { text: "что угодно", tone: "danger", semantic: "targetCorrect" },
        cyrillic,
      ),
    ).toBe("target");
  });

  test("в локалях на латинице алфавитная развилка выключена", () => {
    // Для es/pt-BR/vi/id/tr/pl родной язык сам на латинице — гадать нельзя.
    expect(introPartRole({ text: "trabajo", tone: "accent" }, false)).toBe("target");
  });

  test("настоящий контент урока больше не остаётся сплошным серым текстом", () => {
    const screen = LESSON_3_INTRO_SCREENS[0];
    const roles = (screen.linesRU ?? [])
      .flatMap((line) => line.parts ?? [])
      .map((part) => introPartRole(part, cyrillic));

    // До моста здесь была бы сплошная «plain» — именно это видел владелец.
    expect(roles.filter((role) => role === "target").length).toBeGreaterThan(0);
    expect(roles.filter((role) => role === "targetWrong").length).toBeGreaterThan(0);
    expect(roles.every((role) => role === "plain")).toBe(false);
  });
});
