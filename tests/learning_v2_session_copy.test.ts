import { learningV2SessionCopy } from "../app/learning_v2_session_copy";
import { INTERFACE_LANGS } from "../constants/i18n";

describe("Learning V2 session interface copy", () => {
  test("covers every active interface locale without a Russian fallback", () => {
    const rows = INTERFACE_LANGS.map((lang) => ({
      lang,
      copy: learningV2SessionCopy(lang),
    }));

    expect(rows).toHaveLength(8);
    for (const { lang, copy } of rows) {
      expect(copy.close.trim()).not.toBe("");
      expect(copy.reportTask.trim()).not.toBe("");
      expect(copy.savePhrase.trim()).not.toBe("");
      expect(copy.startVoice.trim()).not.toBe("");
      expect(copy.secondError.trim()).not.toBe("");
      expect(Object.keys(copy.modes)).toHaveLength(7);
      if (lang !== "ru") {
        expect(copy.close).not.toBe(learningV2SessionCopy("ru").close);
        expect(copy.next).not.toBe(learningV2SessionCopy("ru").next);
      }
    }
  });

  test("preserves the exact Russian accessibility phrases", () => {
    const copy = learningV2SessionCopy("ru");
    expect(copy.rewardLabel(3)).toBe(
      "Идеально. Плюс 3 звезды. С первой попытки",
    );
    expect(copy.rewardLabel(1)).toBe("Зачтено. Плюс 1 звезда. С поддержкой");
    expect(copy.skipHint).toBe(
      "Задание получит ноль звёзд, сессия продолжится",
    );
  });
});
