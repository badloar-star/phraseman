import assert from "node:assert/strict";
import test from "node:test";

import { learningV2ListenChooseOptionLabelV1 } from "../modules/learning-v2/modes/listen_choose_option_label_v1";

test("shows the learner's localized meaning when the listening choice provides one", () => {
    assert.equal(learningV2ListenChooseOptionLabelV1({
      fallbackText: "phone",
      interfaceLocale: "ru",
      meaningByLocale: { ru: "телефон", uk: "телефон" },
    }), "телефон");
});

test("keeps the target-language form for sound-recognition choices", () => {
    assert.equal(learningV2ListenChooseOptionLabelV1({
      fallbackText: "phone",
      interfaceLocale: "ru",
      meaningByLocale: null,
    }), "phone");
});
