import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from "../app/account_generation";
import { __resetCustomCardsStoreForTests } from "../app/flashcards/custom_cards_store";
import {
  isLearningV2NewWordEncounterSavedV1,
  removeLearningV2NewWordEncounterFromCardsV1,
  saveLearningV2NewWordEncounterToCardsV1,
} from "../app/learning_v2_new_word_encounter_save_v1";

jest.mock("@react-native-async-storage/async-storage");

const localized = (value: string) => ({
  ru: value,
  uk: value,
  es: value,
  en: value,
  "pt-BR": value,
  vi: value,
  id: value,
  tr: value,
  pl: value,
});

const encounter = {
  lexicalItemId: "e01-s01-word-ready",
  transcription: "/ˈredi/",
  playfulMeaningByLocale: localized(
    "Стартовая кнопка уже нервничает: человек подготовился и ждёт сигнала.",
  ),
  motionVariant: "premium_a" as const,
  presentation: "blocking_task_overlay" as const,
  dismissal: "continue_only" as const,
  saveControl: "bookmark_icon" as const,
  orderWithinSession: 4,
  save: {
    available: true as const,
    savablePhraseRef: "save-ready",
    targetLanguage: "en",
    targetText: "ready",
    meaningByLocale: localized("готовый, подготовленный"),
    sourceTextFingerprint: "a".repeat(64),
    contentOrigin: "learner_safe_release_projection" as const,
  },
};

describe("Learning V2 new-word card persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
    __resetCustomCardsStoreForTests();
    __resetAccountGenerationForTests();
    beginAccountGeneration("learning-v2-new-word-account");
  });

  test("saves transcription and playful copy once, then removes by stable lexical identity", async () => {
    await expect(
      saveLearningV2NewWordEncounterToCardsV1({
        encounter,
        interfaceLocale: "ru",
      }),
    ).resolves.toBe("added");
    await expect(isLearningV2NewWordEncounterSavedV1(encounter)).resolves.toBe(
      true,
    );
    await expect(
      saveLearningV2NewWordEncounterToCardsV1({
        encounter,
        interfaceLocale: "ru",
      }),
    ).resolves.toBe("duplicate");

    const firstWrite = jest.mocked(AsyncStorage.setItem).mock.calls[0];
    const cards = JSON.parse(String(firstWrite?.[1]));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      en: "ready",
      ru: "готовый, подготовленный",
      transcription: "/ˈredi/",
      description:
        "Стартовая кнопка уже нервничает: человек подготовился и ждёт сигнала.",
      source: "learning-v2-new-word",
      sourceId: "learning-v2-word:en:e01-s01-word-ready",
    });

    await expect(
      removeLearningV2NewWordEncounterFromCardsV1({ encounter }),
    ).resolves.toBe("removed");
    await expect(isLearningV2NewWordEncounterSavedV1(encounter)).resolves.toBe(
      false,
    );
    expect(
      JSON.parse(String(jest.mocked(AsyncStorage.setItem).mock.calls[1]?.[1])),
    ).toEqual([]);
  });
});
