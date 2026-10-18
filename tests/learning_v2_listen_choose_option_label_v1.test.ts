import { learningV2ListenChooseOptionLabelV1 } from "../modules/learning-v2/modes/listen_choose_option_label_v1";

// зачем (разбор красных 18.10, Ревизор 3.81): набор был написан на node:test и для jest оставался «пустым» («must contain at least one test»), то есть не проверял ничего.
// Проверки те же, форма — jest, чтобы обычный прогон их исполнял.
describe("listen_choose_option_label_v1", () => {
  test("shows the learner's localized meaning when the listening choice provides one", () => {
    expect(learningV2ListenChooseOptionLabelV1({
      fallbackText: "phone",
      interfaceLocale: "ru",
      meaningByLocale: { ru: "телефон", uk: "телефон" },
    })).toBe("телефон");
  });

  test("keeps the target-language form for sound-recognition choices", () => {
    expect(learningV2ListenChooseOptionLabelV1({
      fallbackText: "phone",
      interfaceLocale: "ru",
      meaningByLocale: null,
    })).toBe("phone");
  });
});
