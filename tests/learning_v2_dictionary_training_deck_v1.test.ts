// зачем (словарь V2, владелец 21.10): слова, выбранные в словаре Learning V2, тренируются режимами «Карточек» через колоду
// `lv2:<id>`; колода переживает перезапуск (копия на телефоне); монеты — только по флагу (координатор 22.10).
const store = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
  },
}));

/* eslint-disable import/first -- AsyncStorage mocked first */
import { isValidDeckId } from "../app/flashcards/deck_selection";
import { deckRefKey, loadDeckCards, parseDeckParams } from "../app/flashcards/deck_sources";
import {
  LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED,
  __resetLearningV2DictionaryTrainingDecksForTests,
  loadLearningV2DictionaryTrainingDeckV1,
  practiceCoinsAllowedForDeckKeysV1,
  putLearningV2DictionaryTrainingDeckV1,
} from "../app/learning_v2_dictionary_training_deck_v1";
/* eslint-enable import/first */

const WORDS = [
  { lexicalItemId: "lx_here", target: "here", meaningByLocale: { ru: "здесь, тут", uk: "тут", es: "aquí" } },
  { lexicalItemId: "lx_ready", target: "ready", meaningByLocale: { ru: "готов / готова" } },
  { lexicalItemId: "lx_blank", target: "  ", meaningByLocale: { ru: "пусто" } },
];

beforeEach(() => {
  store.clear();
  __resetLearningV2DictionaryTrainingDecksForTests();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("Learning V2 dictionary training deck", () => {
  test("put returns an lv2 token that the Cards deck parser and loader understand", async () => {
    const token = putLearningV2DictionaryTrainingDeckV1(WORDS, 1_800_000_000_000);
    expect(token).toMatch(/^lv2:[a-z0-9]+$/u);
    expect(isValidDeckId(token)).toBe(true);
    const refs = parseDeckParams(token!);
    expect(refs).toHaveLength(1);
    expect(deckRefKey(refs[0]!)).toBe(token);
    const cards = await loadDeckCards(refs[0]!, "ru");
    expect(cards.map((card) => [card.id, card.en, card.translation])).toEqual([
      ["lv2-word:lx_here", "here", "здесь, тут"],
      ["lv2-word:lx_ready", "ready", "готов / готова"],
    ]);
  });

  test("missing translation in the display language falls back to Russian", async () => {
    const token = putLearningV2DictionaryTrainingDeckV1(WORDS)!;
    const cards = await loadLearningV2DictionaryTrainingDeckV1(token.slice(4), "uk");
    expect(cards.find((card) => card.en === "ready")?.translation).toBe("готов / готова");
    expect(cards.find((card) => card.en === "here")?.translation).toBe("тут");
  });

  test("the deck survives a restart through the phone copy", async () => {
    const token = putLearningV2DictionaryTrainingDeckV1(WORDS)!;
    await new Promise((resolve) => setImmediate(resolve));
    __resetLearningV2DictionaryTrainingDecksForTests();
    const cards = await loadLearningV2DictionaryTrainingDeckV1(token.slice(4), "ru");
    expect(cards).toHaveLength(2);
  });

  test("an unknown deck returns no cards and logs why", async () => {
    expect(await loadLearningV2DictionaryTrainingDeckV1("zzzzzz1", "ru")).toEqual([]);
    const warned = (console.warn as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(warned).toContain("[V2-DICT] deck_load_missing");
  });

  test("an empty selection gives no token", () => {
    expect(putLearningV2DictionaryTrainingDeckV1([WORDS[2]!])).toBeNull();
  });

  test("coins: off for dictionary decks until the owner decides, untouched for other decks", () => {
    expect(LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED).toBe(false);
    expect(practiceCoinsAllowedForDeckKeysV1(["lv2:abc123"])).toBe(false);
    expect(practiceCoinsAllowedForDeckKeysV1(["saved", "pack:family"])).toBe(true);
    expect(practiceCoinsAllowedForDeckKeysV1([])).toBe(true);
  });
});
