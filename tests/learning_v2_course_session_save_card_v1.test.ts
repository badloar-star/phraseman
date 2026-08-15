import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from "../app/account_generation";
import { __resetCustomCardsStoreForTests } from "../app/flashcards/custom_cards_store";
import { saveLearningV2CourseSessionPhraseToCardsV1 } from "../app/learning_v2_course_session_save_card_v1";
import { materializeLearningV2CourseSessionSavablePhraseV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage");

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const meaningByLocale = Object.freeze(
  Object.fromEntries(locales.map((locale) => [locale, `meaning-${locale}`])),
) as any;

describe("Learning V2 direct local card save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
    __resetCustomCardsStoreForTests();
    __resetAccountGenerationForTests();
    beginAccountGeneration("learning-v2-card-account");
  });

  test("adds once and returns duplicate on exact replay without server work", async () => {
    const save = materializeLearningV2CourseSessionSavablePhraseV1({
      targetLanguage: "tr-TR",
      targetText: "Merhaba dünya",
      meaningByLocale,
    });
    await expect(
      saveLearningV2CourseSessionPhraseToCardsV1({
        save,
        interfaceLocale: "pl",
      }),
    ).resolves.toBe("added");
    await expect(
      saveLearningV2CourseSessionPhraseToCardsV1({
        save,
        interfaceLocale: "pl",
      }),
    ).resolves.toBe("duplicate");
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls;
    expect(writes).toHaveLength(1);
    const cards = JSON.parse(String(writes[0]![1]));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: `learning_v2_${save.savablePhraseRef}`,
      en: "Merhaba dünya",
      description: "meaning-pl",
      source: "learning-v2-direct",
      sourceId: `learning-v2:tr-TR:${save.savablePhraseRef}`,
    });
  });
});
